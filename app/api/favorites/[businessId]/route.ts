import { Types } from "mongoose";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { Favorite } from "@/models/Favorite";

const paramsSchema = z.object({
  businessId: z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid business id"),
});

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/favorites/[businessId]">,
) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);
    const { businessId } = paramsSchema.parse(await context.params);
    await connectDB();
    await Favorite.deleteOne({ user: session.userId, business: businessId });
    return ok({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
