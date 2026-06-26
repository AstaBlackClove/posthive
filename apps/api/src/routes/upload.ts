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

export async function uploadRoutes(
  app: FastifyInstance,
  { storage }: { storage: StorageAdapter }
): Promise<void> {
  app.post("/upload", async (req, reply) => {
    const data = await req.file();

    if (!data) {
      return reply.status(400).send({ error: "No file uploaded — send as multipart field 'file'" });
    }

    if (!ALLOWED_IMAGE_TYPES.includes(data.mimetype)) {
      return reply.status(400).send({
        error: `Unsupported file type: ${data.mimetype}. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
      });
    }

    // Read the stream into a buffer so we can check size before persisting
    const buffer = await data.toBuffer();

    if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
      return reply.status(400).send({
        error: `File too large: ${(buffer.length / 1_000_000).toFixed(2)} MB. Maximum is 1 MB.`,
      });
    }

    const url = await storage.upload(buffer, data.mimetype);
    return reply.status(201).send({ url });
  });
}
