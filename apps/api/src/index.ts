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
import { authRoutes } from "./routes/auth.js";
import { jobRoutes } from "./routes/jobs.js";
import { uploadRoutes } from "./routes/upload.js";
import { startWorker } from "./lib/worker.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3001);
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

async function main() {
  const storage = new LocalDiskStorage(UPLOADS_DIR);
  setBlueskyStorage(storage);

  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: MAX_IMAGE_SIZE_BYTES } });
  await app.register(staticFiles, { root: UPLOADS_DIR, prefix: "/uploads/" });

  await app.register(accountRoutes);
  await app.register(authRoutes);
  await app.register(jobRoutes);
  await app.register(uploadRoutes, { storage });

  app.get("/health", async () => ({ ok: true }));

  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`API listening on http://localhost:${PORT}`);

  // BullMQ worker — processes jobs at their exact scheduled time
  startWorker();
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
