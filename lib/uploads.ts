export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_BUSINESS_IMAGES = 10;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function detectImageMime(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return "image/png";
  }
  if (
    bytes.length >= 6 &&
    bytes.toString("ascii", 0, 4) === "GIF8" &&
    ["87a", "89a"].includes(bytes.toString("ascii", 3, 6))
  ) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export type ImageUpload =
  | { ok: true; bytes: Buffer; contentType: string }
  | { ok: false; error: string };

export async function readImage(file: File): Promise<ImageUpload> {
  if (file.size === 0) return { ok: false, error: "The uploaded file is empty" };
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Images must be 5 MB or smaller" };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Images must be 5 MB or smaller" };
  }
  const contentType = detectImageMime(bytes);
  if (!contentType) {
    return { ok: false, error: "Only JPEG, PNG, WebP and GIF images are supported" };
  }
  return { ok: true, bytes, contentType };
}
