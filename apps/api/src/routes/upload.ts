/**
 * POST /upload — accepts a single image file (multipart/form-data, field "file")
 * Returns { url } — the URL to include in PostJob content.mediaUrls[]
 *
 * Limits enforced here (mirror Bluesky's hard limits):
 *   - Max file size: 1 MB
 *   - Allowed types: jpeg, png, gif, webp
 */

import type { FastifyInstance } from "fastify";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  type StorageAdapter,
} from "../lib/storage.js";
import { withAuth } from "../lib/auth/withAuth.js";
import { compressForPlatform } from "../lib/compress.js";

export async function uploadRoutes(
  app: FastifyInstance,
  { storage }: { storage: StorageAdapter }
): Promise<void> {
  app.post("/upload", { preHandler: [withAuth] }, async (req, reply) => {
    const data = await req.file();

    if (!data) {
      return reply.status(400).send({ error: "No file uploaded — send as multipart field 'file'" });
    }

    if (!ALLOWED_IMAGE_TYPES.includes(data.mimetype)) {
      return reply.status(400).send({
        error: `Unsupported file type: ${data.mimetype}. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
      });
    }

    const raw = await data.toBuffer();

    if (raw.length > MAX_IMAGE_SIZE_BYTES) {
      return reply.status(400).send({
        error: `File too large: ${(raw.length / 1_000_000).toFixed(2)} MB. Maximum is ${MAX_IMAGE_SIZE_BYTES / 1_000_000} MB.`,
      });
    }

    // Compress to the strictest platform limit (Bluesky ~1 MB) so stored files
    // work across all platforms. Bluesky adapter also re-compresses at post time.
    const { buffer, mimeType } = await compressForPlatform(raw, data.mimetype, "bluesky");

    const url = await storage.upload(buffer, mimeType);
    return reply.status(201).send({ url });
  });
}
