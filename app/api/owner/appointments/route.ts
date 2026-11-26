import { z } from "zod";
import { getSession } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { getOwnerAppointments } from "@/lib/queries";

const querySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD for the date")
    .optional(),
  businessId: z.string().min(1).optional(),
  status: z
    .enum(["pending", "confirmed", "completed", "cancelled"])
    .optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);
    const query = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    await connectDB();
    const appointments = await getOwnerAppointments(session.userId, query);
    return ok({ appointments });
  } catch (error) {
    return handleError(error);
  }
}
