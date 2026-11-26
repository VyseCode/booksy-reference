import { Types } from "mongoose";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { fail, handleError, isDuplicateKeyError, ok, readJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { Business } from "@/models/Business";
import { Favorite } from "@/models/Favorite";
import { getBusinesses } from "@/lib/queries";

const schema = z.object({
  businessId: z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid business id"),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);
    const body = schema.parse(await readJson(request));
    await connectDB();

    if (!(await Business.exists({ _id: body.businessId }))) {
      return fail("Business not found", 404);
    }
    const existing = await Favorite.findOne({
      user: session.userId,
      business: body.businessId,
    }).lean();
    if (existing) return ok({ favorite: existing });

    const favorite = await Favorite.create({
      user: session.userId,
      business: body.businessId,
    });
    return ok({ favorite: { id: favorite._id.toString() } }, 201);
  } catch (error) {
    if (isDuplicateKeyError(error)) return ok({ favorite: {} });
    return handleError(error);
  }
}

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(12),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);
    const query = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    await connectDB();
    return ok(
      await getBusinesses({
        viewerId: session.userId,
        favoritesOnly: true,
        page: query.page,
        limit: query.limit,
      }),
    );
  } catch (error) {
    return handleError(error);
  }
}
