import type { FastifyInstance } from "fastify";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  type StorageAdapter,
} from "../lib/storage.js";
import { withAuth } from "../lib/auth/withAuth.js";
import { compressForPlatform } from "../lib/compress.js";

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/mov"];
const MAX_VIDEO_SIZE_BYTES = 100_000_000; // 100 MB (Instagram Reels limit)

export async function uploadRoutes(
  app: FastifyInstance,
  { storage }: { storage: StorageAdapter }
): Promise<void> {
  app.delete("/upload", { preHandler: [withAuth] }, async (req, reply) => {
    const { url } = req.body as { url?: string };
    if (!url || typeof url !== "string") {
      return reply.status(400).send({ error: "url is required" });
    }
    try {
      await storage.delete(url);
    } catch {
      // Best-effort — don't fail if file is already gone
    }
    return reply.status(204).send();
  });

  app.post("/upload", { preHandler: [withAuth] }, async (req, reply) => {
    const data = await req.file();

    if (!data) {
      return reply.status(400).send({ error: "No file uploaded — send as multipart field 'file'" });
    }

    const isVideo = ALLOWED_VIDEO_TYPES.includes(data.mimetype);
    const isImage = ALLOWED_IMAGE_TYPES.includes(data.mimetype);

    if (!isImage && !isVideo) {
      return reply.status(400).send({
        error: `Unsupported file type: ${data.mimetype}. Allowed images: ${ALLOWED_IMAGE_TYPES.join(", ")}. Allowed videos: ${ALLOWED_VIDEO_TYPES.join(", ")}`,
      });
    }

    const raw = await data.toBuffer();

    if (isVideo) {
      if (raw.length > MAX_VIDEO_SIZE_BYTES) {
        return reply.status(400).send({
          error: `Video too large: ${(raw.length / 1_000_000).toFixed(0)} MB. Maximum is 100 MB.`,
        });
      }
      const url = await storage.upload(raw, data.mimetype);
      return reply.status(201).send({ url, type: "video" });
    }

    // Image path
    if (raw.length > MAX_IMAGE_SIZE_BYTES) {
      return reply.status(400).send({
        error: `File too large: ${(raw.length / 1_000_000).toFixed(2)} MB. Maximum is ${MAX_IMAGE_SIZE_BYTES / 1_000_000} MB.`,
      });
    }

    const { buffer, mimeType } = await compressForPlatform(raw, data.mimetype, "bluesky");
    const url = await storage.upload(buffer, mimeType);
    return reply.status(201).send({ url, type: "image" });
  });
}
