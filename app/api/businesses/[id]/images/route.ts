import { Types } from "mongoose";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { Business } from "@/models/Business";
import { Upload } from "@/models/Upload";
import { getBusinessById } from "@/lib/queries";
import { MAX_BUSINESS_IMAGES, readImage } from "@/lib/uploads";

const paramsSchema = z.object({
  id: z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid business id"),
});

export async function POST(
  request: Request,
  context: RouteContext<"/api/businesses/[id]/images">,
) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);
    const { id } = paramsSchema.parse(await context.params);

    await connectDB();
    const business = await Business.findById(id).select("owner images");
    if (!business) return fail("Business not found", 404);
    if (business.owner.toString() !== session.userId) {
      return fail("Only the business owner can upload photos", 403);
    }
    if ((business.images ?? []).length >= MAX_BUSINESS_IMAGES) {
      return fail(`A business can have at most ${MAX_BUSINESS_IMAGES} photos`, 409);
    }

    const formData = await request.formData();
    const file = formData.get("image");
    if (!(file instanceof File)) {
      return fail("Attach an image using the 'image' field", 400);
    }
    const image = await readImage(file);
    if (!image.ok) return fail(image.error, 400);

    const upload = await Upload.create({
      contentType: image.contentType,
      size: image.bytes.length,
      data: image.bytes,
    });
    const url = `/api/uploads/${upload._id.toString()}`;
    await Business.updateOne({ _id: id }, { $push: { images: url } });

    return ok(
      {
        business: await getBusinessById(id, session.userId),
        upload: { id: upload._id.toString(), url },
      },
      201,
    );
  } catch (error) {
    return handleError(error);
  }
}
