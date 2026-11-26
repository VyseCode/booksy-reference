import { Types } from "mongoose";
import { z } from "zod";
import { fail, handleError, ok } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { Business } from "@/models/Business";
import { getReviews } from "@/lib/queries";

const paramsSchema = z.object({
  id: z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid business id"),
});

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(10),
});

export async function GET(
  request: Request,
  context: RouteContext<"/api/businesses/[id]/reviews">,
) {
  try {
    const { id } = paramsSchema.parse(await context.params);
    const query = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    await connectDB();
    if (!(await Business.exists({ _id: id }))) return fail("Business not found", 404);
    return ok(await getReviews(id, query));
  } catch (error) {
    return handleError(error);
  }
}
