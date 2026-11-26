import { Types } from "mongoose";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { fail, handleError, isDuplicateKeyError, ok, readJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { Business } from "@/models/Business";
import { Service } from "@/models/Service";
import { Appointment } from "@/models/Appointment";
import { bookAppointmentSchema } from "@/lib/validation";
import { candidateSlots, dateKey, isAligned } from "@/lib/slots";
import { meetsLeadTime } from "@/lib/policies";
import {
  getAppointmentById,
  getBookedSlotKeys,
  getCustomerAppointments,
} from "@/lib/queries";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);

    const body = bookAppointmentSchema.parse(await readJson(request));
    if (
      !Types.ObjectId.isValid(body.businessId) ||
      !Types.ObjectId.isValid(body.serviceId)
    ) {
      return fail("Invalid business or service id", 400);
    }

    const start = new Date(body.start);
    if (Number.isNaN(start.getTime())) return fail("Invalid appointment time", 400);
    if (!isAligned(start)) {
      return fail("Appointments must start on a 15-minute boundary", 400);
    }
    if (start.getTime() <= Date.now()) {
      return fail("You cannot book a time in the past", 400);
    }

    await connectDB();
    const business = await Business.findById(body.businessId)
      .select("openingHours minLeadTimeHours")
      .lean();
    if (!business) return fail("Business not found", 404);
    const minLeadTimeHours = business.minLeadTimeHours ?? 2;
    if (!meetsLeadTime(start, minLeadTimeHours)) {
      return fail(
        `Appointments must be booked at least ${minLeadTimeHours} hour${minLeadTimeHours === 1 ? "" : "s"} in advance`,
        400,
      );
    }

    const service = await Service.findById(body.serviceId)
      .select("business durationMin price active bufferBeforeMin bufferAfterMin")
      .lean();
    if (!service || service.business.toString() !== body.businessId) {
      return fail("Service not found for this business", 404);
    }
    if (!service.active) return fail("This service is not bookable", 400);

    const day = dateKey(start);
    const candidates = candidateSlots(
      business.openingHours,
      day,
      service.durationMin,
      new Date(),
      { beforeMin: service.bufferBeforeMin, afterMin: service.bufferAfterMin },
    );
    const chosen = candidates.find(
      (slot) => slot.start.getTime() === start.getTime(),
    );
    if (!chosen) {
      return fail("That time is outside opening hours or is not available", 400);
    }

    const booked = await getBookedSlotKeys(body.businessId, day);
    if (chosen.keys.some((key) => booked.has(key))) {
      return fail("That slot is already booked", 409);
    }

    const appointment = await Appointment.create({
      business: body.businessId,
      service: body.serviceId,
      customer: session.userId,
      start: chosen.start,
      end: chosen.end,
      durationMin: service.durationMin,
      price: service.price,
      status: "pending",
      slotKeys: chosen.keys,
    });

    return ok({ appointment: await getAppointmentById(appointment._id.toString()) }, 201);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return fail("That slot is already booked", 409);
    }
    return handleError(error);
  }
}

const listSchema = z.object({
  status: z
    .enum(["pending", "confirmed", "completed", "cancelled"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(10),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);
    const query = listSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    await connectDB();
    const result = await getCustomerAppointments(session.userId, query);
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}
