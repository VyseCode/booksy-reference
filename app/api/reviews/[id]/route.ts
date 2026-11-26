import { Types } from "mongoose";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { Review } from "@/models/Review";
import { applyReviewDelta } from "@/lib/queries";

const paramsSchema = z.object({
  id: z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid review id"),
});

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/reviews/[id]">,
) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);
    const { id } = paramsSchema.parse(await context.params);

    await connectDB();
    const review = await Review.findById(id).select("author business rating");
    if (!review) return fail("Review not found", 404);
    if (review.author.toString() !== session.userId) {
      return fail("Only the author can delete this review", 403);
    }

    await Review.deleteOne({ _id: id });
    await applyReviewDelta(review.business.toString(), -review.rating, -1);
    return ok({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
