import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import staticFiles from "@fastify/static";
import { prisma } from "./lib/prisma.js";
import { LocalDiskStorage, MAX_IMAGE_SIZE_BYTES } from "./lib/storage.js";
import { setBlueskyStorage } from "./adapters/bluesky.js";
import { accountRoutes } from "./routes/accounts.js";
import { jobRoutes } from "./routes/jobs.js";
import { uploadRoutes } from "./routes/upload.js";
import { startScheduler } from "./scheduler/cron.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3001);
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

async function main() {
  // Shared storage adapter — swap this to S3Storage / R2Storage for production
  const storage = new LocalDiskStorage(UPLOADS_DIR);
  setBlueskyStorage(storage);

  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });

  // Multipart support for file uploads (1 MB limit matches Bluesky's hard limit)
  await app.register(multipart, { limits: { fileSize: MAX_IMAGE_SIZE_BYTES } });

  // Serve uploaded files as static assets at GET /uploads/:filename
  await app.register(staticFiles, { root: UPLOADS_DIR, prefix: "/uploads/" });

  await app.register(accountRoutes);
  await app.register(jobRoutes);
  await app.register(uploadRoutes, { storage });

  app.get("/health", async () => ({ ok: true }));

  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`API listening on http://localhost:${PORT}`);

  startScheduler();
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
