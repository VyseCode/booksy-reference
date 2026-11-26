import { Types } from "mongoose";
import { fail, handleError } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { Upload } from "@/models/Upload";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/uploads/[id]">,
) {
  try {
    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) return fail("Invalid image id", 400);

    await connectDB();
    const upload = await Upload.findById(id).select("contentType size data");
    if (!upload) return fail("Image not found", 404);

    return new Response(new Uint8Array(upload.data), {
      headers: {
        "Content-Type": upload.contentType,
        "Content-Length": String(upload.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
