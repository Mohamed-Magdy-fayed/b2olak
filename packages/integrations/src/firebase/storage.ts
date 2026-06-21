import "server-only";

import { randomUUID } from "node:crypto";

import { getStorageBucket } from "./admin";

/** Image upload via firebase-admin — ported from the reference app. */

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

/** Thrown for invalid input — the API layer maps it to a 400. */
export class ImageValidationError extends Error {}

export async function uploadImage(
  base64: string,
  mimeType: string,
  folder = "uploads",
): Promise<string> {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new ImageValidationError("errors.unsupportedImageType");
  }

  const buffer = Buffer.from(base64, "base64");

  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    throw new ImageValidationError("errors.imageTooLarge");
  }

  const extension = EXTENSION_BY_MIME[mimeType] ?? ".jpg";
  const filename = `${folder}/${Date.now()}-${randomUUID()}${extension}`;

  const bucket = getStorageBucket();
  const file = bucket.file(filename);

  await file.save(buffer, {
    metadata: { contentType: mimeType },
    public: true,
  });

  return file.publicUrl();
}

export async function deleteImage(publicUrl: string): Promise<void> {
  try {
    const bucket = getStorageBucket();
    const prefix = `https://storage.googleapis.com/${bucket.name}/`;

    if (!publicUrl.startsWith(prefix)) return;

    const filePath = decodeURIComponent(publicUrl.slice(prefix.length));
    await bucket.file(filePath).delete();
  } catch {
    // ignore — file already deleted or URL not from this bucket
  }
}
