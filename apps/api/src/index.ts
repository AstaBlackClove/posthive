import "./instrument.js";
import * as Sentry from "@sentry/node";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import staticFiles from "@fastify/static";
import rateLimit from "@fastify/rate-limit";
import compress from "@fastify/compress";
import underPressure from "@fastify/under-pressure";
import helmet from "@fastify/helmet";
import rawBody from "fastify-raw-body";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { FastifyAdapter as BullBoardFastifyAdapter } from "@bull-board/fastify";
import { Queue } from "bullmq";
import { prisma } from "./lib/prisma.js";
import { LocalDiskStorage, SupabaseStorage } from "./lib/storage.js";
import { setBlueskyStorage } from "./adapters/bluesky.js";
import { setStorageAdapter as setMastodonStorage } from "./adapters/mastodon.js";
import { setStorageAdapter as setPixelfedStorage } from "./adapters/pixelfed.js";
import { setTelegramStorage } from "./adapters/telegram.js";
import { setLinkedInStorage } from "./adapters/linkedin.js";
import { setDiscordStorage } from "./adapters/discord.js";
import { setStorageAdapter as setLemmyStorage } from "./adapters/lemmy.js";
import { setAvatarStorage } from "./lib/avatarStore.js";
import { accountRoutes } from "./routes/accounts.js";
import { authRoutes } from "./routes/auth.js";
import { jobRoutes } from "./routes/jobs.js";
import { uploadRoutes } from "./routes/upload.js";
import { userRoutes } from "./routes/user.js";
import { billingRoutes } from "./routes/billing.js";
import { apiKeyRoutes } from "./routes/apiKeys.js";
import { templateRoutes } from "./routes/templates.js";
import { workspaceRoutes } from "./routes/workspaces.js";
import { publicApiRoutes } from "./routes/publicApi.js";
import { mcpRoutes } from "./routes/mcp.js";
import { oauthRoutes } from "./routes/oauth.js";
import { startWorker } from "./lib/worker.js";
import { startTokenRefreshCron } from "./lib/tokenRefreshCron.js";
import { startStatsCron } from "./lib/statsCron.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { trackRoutes } from "./routes/track.js";
import { feedbackRoutes } from "./routes/feedback.js";
import { withAuth } from "./lib/auth/withAuth.js";
import type { StorageAdapter } from "./lib/storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3001);
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

const MAX_UPLOAD_SIZE = 100 * 1024 * 1024; // 100 MB — covers video

async function main() {
  const storage = process.env.STORAGE_PROVIDER === "supabase"
    ? new SupabaseStorage()
    : new LocalDiskStorage(UPLOADS_DIR);
  setBlueskyStorage(storage);
  setMastodonStorage(storage);
  setPixelfedStorage(storage);
  setTelegramStorage(storage);
  setLinkedInStorage(storage);
  setDiscordStorage(storage);
  setLemmyStorage(storage);
  setAvatarStorage(storage);

  const isDev = process.env.NODE_ENV !== "production";
  const app = Fastify({
    logger: isDev
      ? { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" } }, redact: ["req.query.token", "req.params.apiKey"] }
      : { redact: ["req.query.token", "req.params.apiKey"] },
    bodyLimit: 1_048_576, // 1 MB
  });

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
  await app.register(helmet, {
    contentSecurityPolicy: false, // API — no HTML served here
    crossOriginResourcePolicy: { policy: "cross-origin" }, // allow media URLs from other origins
  });
  await app.register(compress, { global: true });
  await app.register(underPressure, {
    maxEventLoopDelay: 1000,
    maxHeapUsedBytes: 512 * 1024 * 1024, // 512 MB
    message: "Server under pressure — try again shortly",
    retryAfter: 10,
  });
  await app.register(cookie);
  await app.register(multipart, { limits: { fileSize: MAX_UPLOAD_SIZE, files: 4 } });
  await app.register(staticFiles, { root: UPLOADS_DIR, prefix: "/uploads/" });

  // Raw body — needed for webhook signature verification
  await app.register(rawBody, { global: false, encoding: "utf8" });

  // Rate limiting — opt-in per route
  await app.register(rateLimit, {
    global: false,
    max: 100,
    timeWindow: "1 minute",
  });

  // Bull Board — queue dashboard (admin-only, dev always open)
  const bullBoardAdapter = new BullBoardFastifyAdapter();
  const postJobsQueue = new Queue("post-jobs", { connection: { url: process.env.REDIS_URL! } });
  createBullBoard({ queues: [new BullMQAdapter(postJobsQueue)], serverAdapter: bullBoardAdapter });
  bullBoardAdapter.setBasePath("/admin/queues");
  await app.register(bullBoardAdapter.registerPlugin(), { prefix: "/admin/queues" });
  // Guard: restrict to local in prod unless BULL_BOARD_TOKEN is set
  app.addHook("onRequest", async (req, reply) => {
    if (!req.url.startsWith("/admin/queues")) return;
    const token = process.env.BULL_BOARD_TOKEN;
    if (!token) {
      if (!isDev) { reply.status(404).send(); return; }
      return; // dev — always open
    }
    const auth = req.headers.authorization ?? "";
    if (auth !== `Bearer ${token}`) { reply.status(401).send({ error: "Unauthorized" }); }
  });

  // Auth routes (no auth required)
  await app.register(userRoutes);
  await app.register(authRoutes); // Threads OAuth

  // App routes (auth required — withAuth applied per-route)
  await app.register(accountRoutes, { storage });
  await app.register(jobRoutes, { storage });
  await app.register(uploadRoutes, { storage });
  if (process.env.ENABLE_BILLING === "true") await app.register(billingRoutes);
  await app.register(apiKeyRoutes);
  await app.register(templateRoutes);
  await app.register(workspaceRoutes);
  await app.register(publicApiRoutes, { storage });
  await app.register(mcpRoutes);
  await app.register(oauthRoutes);
  await app.register(analyticsRoutes);
  await app.register(trackRoutes);
  await app.register(feedbackRoutes);

  app.get("/health", async () => ({ ok: true }));

  // Global error handler — captures all unhandled Fastify errors to Sentry
  app.setErrorHandler((err, _req, reply) => {
    Sentry.captureException(err);
    const status = err.statusCode ?? 500;
    // Don't leak internal error details for server errors
    const message = status >= 500 ? "Internal Server Error" : err.message;
    reply.status(status).send({
      statusCode: status,
      error: err.name ?? "Internal Server Error",
      message,
    });
  });


  // OG preview fetch — used by compose preview
  // Requires auth; blocks SSRF to private/internal IP ranges
  app.get("/og", { preHandler: [withAuth] }, async (req, reply) => {
    const { url } = req.query as { url?: string };
    if (!url) return reply.status(400).send({ error: "url required" });

    let parsed: URL;
    try { parsed = new URL(url); } catch { return reply.status(400).send({ error: "Invalid URL" }); }

    if (parsed.protocol !== "https:") return reply.status(400).send({ error: "Only HTTPS URLs allowed" });

    // Block private/internal IP ranges (SSRF protection)
    const hostname = parsed.hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.16.") ||
      hostname === "169.254.169.254" || // cloud metadata
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return reply.status(400).send({ error: "URL not allowed" });
    }

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Posthive/1.0" },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return reply.status(200).send({});
      const html = await res.text();
      const getTag = (prop: string) => {
        const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"))
          ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i"));
        return m?.[1] ?? null;
      };
      const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      return reply.status(200).send({
        title: getTag("og:title") ?? getTag("twitter:title") ?? titleTag?.[1] ?? "",
        description: getTag("og:description") ?? getTag("twitter:description") ?? getTag("description") ?? "",
        image: getTag("og:image") ?? getTag("twitter:image") ?? null,
        url,
      });
    } catch { return reply.status(200).send({}); }
  });

  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`API listening on http://localhost:${PORT}`);

  startWorker(storage);
  startOrphanCleanup(storage);
  startTokenRefreshCron();
  startStatsCron();
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});

// Deletes unclaimed uploads older than 24 hours — runs every 6 hours
function startOrphanCleanup(storage: StorageAdapter) {
  const INTERVAL_MS = 6 * 60 * 60 * 1000;
  const TTL_MS = 24 * 60 * 60 * 1000;

  async function run() {
    const cutoff = new Date(Date.now() - TTL_MS);
    const orphans = await prisma.upload.findMany({
      where: { claimedAt: null, createdAt: { lt: cutoff } },
      select: { id: true, url: true },
    });
    if (!orphans.length) return;
    console.log(`[orphan-cleanup] deleting ${orphans.length} unclaimed upload(s)`);
    await Promise.allSettled(orphans.map(async (u) => {
      try { await storage.delete(u.url); } catch { /* already gone */ }
      await prisma.upload.delete({ where: { id: u.id } });
    }));
  }

  // Run once at startup (catches anything from a previous session), then on interval
  run().catch((e) => console.error("[orphan-cleanup] error:", e));
  setInterval(() => run().catch((e) => console.error("[orphan-cleanup] error:", e)), INTERVAL_MS);
}

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
