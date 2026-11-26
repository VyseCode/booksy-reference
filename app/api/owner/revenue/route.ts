import { z } from "zod";
import { getSession } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { getOwnerRevenue } from "@/lib/queries";

const querySchema = z.object({ businessId: z.string().min(1).optional() });

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);
    const query = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    await connectDB();
    const revenue = await getOwnerRevenue(session.userId, query.businessId);
    return ok(revenue);
  } catch (error) {
    return handleError(error);
  }
}
