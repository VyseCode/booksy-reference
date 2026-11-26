import { Types } from "mongoose";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { fail, handleError, ok, readJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { Business } from "@/models/Business";
import { Appointment } from "@/models/Appointment";
import { appointmentActionSchema } from "@/lib/validation";
import { getAppointmentById } from "@/lib/queries";

const paramsSchema = z.object({
  id: z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid appointment id"),
});

export async function GET(
  _request: Request,
  context: RouteContext<"/api/appointments/[id]">,
) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);
    const { id } = paramsSchema.parse(await context.params);
    await connectDB();

    const raw = await Appointment.findById(id).select("business customer").lean();
    if (!raw) return fail("Appointment not found", 404);
    const business = await Business.findById(raw.business).select("owner").lean();
    const isOwner = business?.owner.toString() === session.userId;
    const isCustomer = raw.customer.toString() === session.userId;
    if (!isOwner && !isCustomer) {
      return fail("You are not allowed to view this appointment", 403);
    }

    return ok({ appointment: await getAppointmentById(id) });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/appointments/[id]">,
) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);
    const { id } = paramsSchema.parse(await context.params);
    const body = appointmentActionSchema.parse(await readJson(request));

    await connectDB();
    const appointment = await Appointment.findById(id).select(
      "business customer status",
    );
    if (!appointment) return fail("Appointment not found", 404);

    const business = await Business.findById(appointment.business)
      .select("owner")
      .lean();
    const isOwner = business?.owner.toString() === session.userId;
    const isCustomer = appointment.customer.toString() === session.userId;
    if (!isOwner && !isCustomer) {
      return fail("Only the customer or the business owner can change this appointment", 403);
    }

    if (body.action === "confirm" || body.action === "complete") {
      if (!isOwner) {
        return fail("Only the business owner can confirm or complete appointments", 403);
      }
      if (body.action === "confirm" && appointment.status !== "pending") {
        return fail("Only pending appointments can be confirmed", 409);
      }
      if (body.action === "complete" && appointment.status !== "confirmed") {
        return fail("Only confirmed appointments can be completed", 409);
      }
      appointment.status = body.action === "confirm" ? "confirmed" : "completed";
      await appointment.save();
    } else {
      if (!["pending", "confirmed"].includes(appointment.status)) {
        return fail("This appointment can no longer be cancelled", 409);
      }
      appointment.status = "cancelled";
      appointment.cancelReason = body.reason ?? "";
      appointment.slotKeys = [];
      await appointment.save();
    }

    return ok({ appointment: await getAppointmentById(id) });
  } catch (error) {
    return handleError(error);
  }
}
