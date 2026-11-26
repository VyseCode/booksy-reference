import { Types } from "mongoose";
import { z } from "zod";
import { fail, handleError, ok } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { Business } from "@/models/Business";
import { Service } from "@/models/Service";
import { availableSlots, candidateSlots } from "@/lib/slots";
import { getBookedSlotKeys } from "@/lib/queries";

const paramsSchema = z.object({
  id: z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid business id"),
});

const querySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD for the date")
    .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()), "Invalid date"),
  serviceId: z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid service id"),
});

export async function GET(
  request: Request,
  context: RouteContext<"/api/businesses/[id]/slots">,
) {
  try {
    const { id } = paramsSchema.parse(await context.params);
    const query = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    await connectDB();

    const business = await Business.findById(id)
      .select("openingHours")
      .lean();
    if (!business) return fail("Business not found", 404);

    const service = await Service.findById(query.serviceId)
      .select("business durationMin active")
      .lean();
    if (!service || service.business.toString() !== id) {
      return fail("Service not found for this business", 404);
    }
    if (!service.active) return fail("This service is not bookable", 400);

    const candidates = candidateSlots(business.openingHours, query.date, service.durationMin);
    const booked = await getBookedSlotKeys(id, query.date);
    const slots = availableSlots(candidates, booked).map((slot) => ({
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
    }));

    return ok({ date: query.date, serviceId: query.serviceId, slots });
  } catch (error) {
    return handleError(error);
  }
}
