import { z } from "zod";
import { getSession } from "@/lib/auth";
import { fail, handleError, ok, readJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { Business } from "@/models/Business";
import { createBusinessSchema } from "@/lib/validation";
import { getBusinessById, getBusinesses } from "@/lib/queries";
import { BUSINESS_CATEGORIES } from "@/models/Business";

const listSchema = z.object({
  q: z.string().optional(),
  category: z.enum(BUSINESS_CATEGORIES).optional(),
  location: z.string().optional(),
  sort: z.enum(["rating", "newest"]).default("rating"),
  favoritesOnly: z.enum(["true", "false"]).default("false"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(12),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const query = listSchema.parse(params);
    await connectDB();
    const result = await getBusinesses({
      viewerId: session?.userId ?? "",
      q: query.q,
      category: query.category,
      location: query.location,
      sort: query.sort,
      favoritesOnly: query.favoritesOnly === "true",
      page: query.page,
      limit: query.limit,
    });
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);

    const body = createBusinessSchema.parse(await readJson(request));
    await connectDB();
    const business = await Business.create({ ...body, owner: session.userId });
    const detail = await getBusinessById(business._id.toString(), session.userId);
    return ok({ business: detail }, 201);
  } catch (error) {
    return handleError(error);
  }
}
