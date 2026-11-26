import { Types } from "mongoose";
import { getSession } from "@/lib/auth";
import { fail, handleError, isDuplicateKeyError, ok, readJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { Appointment } from "@/models/Appointment";
import { Business } from "@/models/Business";
import { Review } from "@/models/Review";
import { User } from "@/models/User";
import { createReviewSchema } from "@/lib/validation";
import { applyReviewDelta } from "@/lib/queries";
import type { ReviewDTO } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);
    const body = createReviewSchema.parse(await readJson(request));
    if (!Types.ObjectId.isValid(body.appointmentId)) {
      return fail("Invalid appointment id", 400);
    }

    await connectDB();
    const appointment = await Appointment.findById(body.appointmentId)
      .select("business customer status")
      .lean();
    if (!appointment) return fail("Appointment not found", 404);
    if (appointment.customer.toString() !== session.userId) {
      return fail("You can only review your own appointments", 403);
    }
    if (appointment.status !== "completed") {
      return fail("You can only review completed appointments", 400);
    }
    if (!(await Business.exists({ _id: appointment.business }))) {
      return fail("Business not found", 404);
    }

    const review = await Review.create({
      appointment: appointment._id,
      business: appointment.business,
      author: session.userId,
      rating: body.rating,
      comment: body.comment,
    });
    await applyReviewDelta(appointment.business.toString(), body.rating, 1);

    const author = await User.findById(session.userId).select("name").lean();
    const dto: ReviewDTO = {
      id: review._id.toString(),
      appointmentId: appointment._id.toString(),
      businessId: appointment.business.toString(),
      authorId: session.userId,
      authorName: author?.name ?? "You",
      rating: body.rating,
      comment: body.comment,
      createdAt: review.createdAt.toISOString(),
    };
    return ok({ review: dto }, 201);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return fail("This appointment has already been reviewed", 409);
    }
    return handleError(error);
  }
}
