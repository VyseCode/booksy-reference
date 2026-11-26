import { Types } from "mongoose";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { fail, handleError, ok, readJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { Business } from "@/models/Business";
import { Service } from "@/models/Service";
import { Appointment } from "@/models/Appointment";
import { updateServiceSchema } from "@/lib/validation";

const paramsSchema = z.object({
  id: z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid service id"),
});

async function ownedServiceError(
  serviceId: string,
  userId: string,
): Promise<{ message: string; status: number } | null> {
  const service = await Service.findById(serviceId).select("business");
  if (!service) return { message: "Service not found", status: 404 };
  const business = await Business.findById(service.business).select("owner");
  if (!business || business.owner.toString() !== userId) {
    return { message: "Only the business owner can make this change", status: 403 };
  }
  return null;
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/services/[id]">,
) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);
    const { id } = paramsSchema.parse(await context.params);
    const body = updateServiceSchema.parse(await readJson(request));

    await connectDB();
    const error = await ownedServiceError(id, session.userId);
    if (error) return fail(error.message, error.status);

    await Service.updateOne({ _id: id }, { $set: body }, { runValidators: true });
    const updated = await Service.findById(id).lean();
    return ok({
      service: {
        id: id,
        businessId: updated?.business.toString() ?? "",
        name: updated?.name ?? "",
        description: updated?.description ?? "",
        durationMin: updated?.durationMin ?? 0,
        price: updated?.price ?? 0,
        active: updated?.active ?? false,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/services/[id]">,
) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);
    const { id } = paramsSchema.parse(await context.params);

    await connectDB();
    const error = await ownedServiceError(id, session.userId);
    if (error) return fail(error.message, error.status);

    const upcoming = await Appointment.countDocuments({
      service: id,
      status: { $in: ["pending", "confirmed"] },
      start: { $gte: new Date() },
    });
    if (upcoming > 0) {
      return fail("Cancel or complete upcoming appointments before deleting this service", 409);
    }
    await Service.deleteOne({ _id: id });
    return ok({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
