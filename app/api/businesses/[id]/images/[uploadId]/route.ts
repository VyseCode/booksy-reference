import { Types } from "mongoose";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { Business } from "@/models/Business";
import { Upload } from "@/models/Upload";
import { getBusinessById } from "@/lib/queries";

const paramsSchema = z.object({
  id: z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid business id"),
  uploadId: z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid image id"),
});

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/businesses/[id]/images/[uploadId]">,
) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);
    const { id, uploadId } = paramsSchema.parse(await context.params);

    await connectDB();
    const business = await Business.findById(id).select("owner images");
    if (!business) return fail("Business not found", 404);
    if (business.owner.toString() !== session.userId) {
      return fail("Only the business owner can remove photos", 403);
    }

    const url = `/api/uploads/${uploadId}`;
    if (!(business.images ?? []).includes(url)) {
      return fail("Photo not found on this business", 404);
    }

    await Business.updateOne({ _id: id }, { $pull: { images: url } });
    const stillUsed = await Business.exists({ images: url, _id: { $ne: id } });
    if (!stillUsed) await Upload.deleteOne({ _id: uploadId });

    return ok({ business: await getBusinessById(id, session.userId) });
  } catch (error) {
    return handleError(error);
  }
}
