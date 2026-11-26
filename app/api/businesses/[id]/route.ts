import { Types } from "mongoose";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { fail, handleError, ok, readJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { Business } from "@/models/Business";
import { Service } from "@/models/Service";
import { Appointment } from "@/models/Appointment";
import { Review } from "@/models/Review";
import { Favorite } from "@/models/Favorite";
import { Upload } from "@/models/Upload";
import { updateBusinessSchema } from "@/lib/validation";
import { getBusinessById } from "@/lib/queries";

const paramsSchema = z.object({
  id: z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid business id"),
});

export async function GET(
  _request: Request,
  context: RouteContext<"/api/businesses/[id]">,
) {
  try {
    const session = await getSession();
    const { id } = paramsSchema.parse(await context.params);
    await connectDB();
    const business = await getBusinessById(id, session?.userId ?? "");
    if (!business) return fail("Business not found", 404);
    return ok({ business });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/businesses/[id]">,
) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);
    const { id } = paramsSchema.parse(await context.params);
    const body = updateBusinessSchema.parse(await readJson(request));

    await connectDB();
    const business = await Business.findById(id).select("owner");
    if (!business) return fail("Business not found", 404);
    if (business.owner.toString() !== session.userId) {
      return fail("Only the business owner can make this change", 403);
    }

    await Business.updateOne({ _id: id }, { $set: body }, { runValidators: true });
    const detail = await getBusinessById(id, session.userId);
    return ok({ business: detail });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/businesses/[id]">,
) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);
    const { id } = paramsSchema.parse(await context.params);

    await connectDB();
    const business = await Business.findById(id).select("owner images");
    if (!business) return fail("Business not found", 404);
    if (business.owner.toString() !== session.userId) {
      return fail("Only the business owner can delete it", 403);
    }

    const uploadIds = (business.images ?? [])
      .filter((url) => url.startsWith("/api/uploads/"))
      .map((url) => url.slice("/api/uploads/".length))
      .filter((value) => Types.ObjectId.isValid(value));
    const services = await Service.find({ business: id }).select("_id").lean();
    const serviceIds = services.map((service) => service._id);
    await Promise.all([
      Appointment.deleteMany({ business: id }),
      Review.deleteMany({ business: id }),
      Favorite.deleteMany({ business: id }),
      Service.deleteMany({ business: id }),
    ]);
    await Business.deleteOne({ _id: id });
    if (uploadIds.length) await Upload.deleteMany({ _id: { $in: uploadIds } });
    return ok({ ok: true, deletedServiceIds: serviceIds.map(String) });
  } catch (error) {
    return handleError(error);
  }
}
