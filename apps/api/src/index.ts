import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import staticFiles from "@fastify/static";
import { prisma } from "./lib/prisma.js";
import { LocalDiskStorage, MAX_IMAGE_SIZE_BYTES } from "./lib/storage.js";
import { setBlueskyStorage } from "./adapters/bluesky.js";
import { accountRoutes } from "./routes/accounts.js";
import { authRoutes } from "./routes/auth.js";
import { jobRoutes } from "./routes/jobs.js";
import { uploadRoutes } from "./routes/upload.js";
import { userRoutes } from "./routes/user.js";
import { billingRoutes } from "./routes/billing.js";
import { startWorker } from "./lib/worker.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3001);
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

async function main() {
  const storage = new LocalDiskStorage(UPLOADS_DIR);
  setBlueskyStorage(storage);

  const app = Fastify({ logger: true });

  const allowedOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    process.env.WEB_URL,
  ].filter(Boolean) as string[];

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
  });
  await app.register(cookie);
  await app.register(multipart, { limits: { fileSize: MAX_IMAGE_SIZE_BYTES } });
  await app.register(staticFiles, { root: UPLOADS_DIR, prefix: "/uploads/" });

  // Auth routes (no auth required)
  await app.register(userRoutes);
  await app.register(authRoutes); // Threads OAuth

  // App routes (auth required — withAuth applied per-route)
  await app.register(accountRoutes);
  await app.register(jobRoutes);
  await app.register(uploadRoutes, { storage });
  await app.register(billingRoutes);

  app.get("/health", async () => ({ ok: true }));

  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`API listening on http://localhost:${PORT}`);

  startWorker(storage);
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
