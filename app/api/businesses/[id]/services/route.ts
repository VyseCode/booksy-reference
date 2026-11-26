import { Types } from "mongoose";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { fail, handleError, ok, readJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { Business } from "@/models/Business";
import { Service } from "@/models/Service";
import { createServiceSchema } from "@/lib/validation";
import { getServices } from "@/lib/queries";

const paramsSchema = z.object({
  id: z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid business id"),
});

export async function GET(
  _request: Request,
  context: RouteContext<"/api/businesses/[id]/services">,
) {
  try {
    const { id } = paramsSchema.parse(await context.params);
    await connectDB();
    if (!(await Business.exists({ _id: id }))) return fail("Business not found", 404);
    return ok({ services: await getServices(id) });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/businesses/[id]/services">,
) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);
    const { id } = paramsSchema.parse(await context.params);
    const body = createServiceSchema.parse(await readJson(request));

    await connectDB();
    const business = await Business.findById(id).select("owner");
    if (!business) return fail("Business not found", 404);
    if (business.owner.toString() !== session.userId) {
      return fail("Only the business owner can add services", 403);
    }

    const service = await Service.create({ ...body, business: id });
    return ok(
      {
        service: {
          id: service._id.toString(),
          businessId: id,
          name: service.name,
          description: service.description,
          durationMin: service.durationMin,
          price: service.price,
          active: service.active,
        },
      },
      201,
    );
  } catch (error) {
    return handleError(error);
  }
}
