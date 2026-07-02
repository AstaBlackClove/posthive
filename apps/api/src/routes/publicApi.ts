import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { withApiKey } from "../lib/auth/withApiKey.js";
import { schedulePostJob, postJobQueue } from "../lib/queue.js";
import { compressForPlatform } from "../lib/compress.js";
import { ALLOWED_IMAGE_TYPES, type StorageAdapter } from "../lib/storage.js";

const preHandler = [withApiKey];

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/mov"];
const MAX_VIDEO_SIZE_BYTES = 100_000_000;

export async function publicApiRoutes(
  app: FastifyInstance,
  { storage }: { storage: StorageAdapter }
): Promise<void> {
  // GET /api/v1/accounts — list connected social accounts
  app.get("/api/v1/accounts", { preHandler }, async (req, reply) => {
    const userId = req.apiKeyUser!.id;
    const accounts = await prisma.account.findMany({
      where: { userId },
      select: { id: true, platform: true, displayName: true, avatarUrl: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return reply.send({ accounts });
  });

  // POST /api/v1/posts — schedule a post
  app.post("/api/v1/posts", { preHandler }, async (req, reply) => {
    const userId = req.apiKeyUser!.id;
    const body = req.body as {
      content: string;
      accountIds: string[];
      scheduledFor: string;
      commentText?: string;
      images?: string[];
      altTexts?: string[];
      mediaType?: "post" | "reel" | "story";
      youtubeType?: "short" | "video";
      dryRun?: boolean;
      perAccount?: Record<string, { text?: string; commentText?: string }>;
    };

    if (!body.content?.trim()) return reply.status(400).send({ error: "content is required" });
    if (!Array.isArray(body.accountIds) || body.accountIds.length === 0)
      return reply.status(400).send({ error: "accountIds must be a non-empty array" });

    const scheduledFor = new Date(body.scheduledFor);
    if (isNaN(scheduledFor.getTime()) || scheduledFor <= new Date())
      return reply.status(400).send({ error: "scheduledFor must be a future ISO date string" });

    if (body.mediaType && !["post", "reel", "story"].includes(body.mediaType))
      return reply.status(400).send({ error: "mediaType must be 'post', 'reel', or 'story'" });

    if (body.youtubeType && !["short", "video"].includes(body.youtubeType))
      return reply.status(400).send({ error: "youtubeType must be 'short' or 'video'" });

    const accounts = await prisma.account.findMany({
      where: { id: { in: body.accountIds }, userId },
      select: { id: true },
    });
    if (accounts.length !== body.accountIds.length)
      return reply.status(400).send({ error: "One or more accountIds are invalid" });

    const contentPayload = JSON.stringify({
      text: body.content,
      mediaUrls: body.images ?? [],
      ...(body.altTexts?.length ? { altTexts: body.altTexts } : {}),
      ...(body.mediaType ? { mediaType: body.mediaType } : {}),
      ...(body.youtubeType ? { youtubeType: body.youtubeType } : {}),
      ...(body.perAccount ? { perAccount: body.perAccount } : {}),
    });

    const job = await prisma.postJob.create({
      data: {
        userId,
        scheduledFor,
        content: contentPayload,
        commentText: body.commentText ?? null,
        dryRun: body.dryRun ?? false,
        targets: {
          create: body.accountIds.map((accountId) => ({ accountId })),
        },
      },
      include: {
        targets: { select: { id: true, accountId: true, status: true } },
      },
    });

    await schedulePostJob(job.id, scheduledFor);

    return reply.status(201).send({
      id: job.id,
      scheduledFor: job.scheduledFor,
      status: job.status,
      dryRun: job.dryRun,
      targets: job.targets,
    });
  });

  // GET /api/v1/posts — list scheduled/completed posts
  app.get("/api/v1/posts", { preHandler }, async (req, reply) => {
    const userId = req.apiKeyUser!.id;
    const { status, limit: limitStr, cursor } = req.query as {
      status?: string;
      limit?: string;
      cursor?: string;
    };

    const take = Math.min(Number(limitStr ?? 20), 100);
    const jobs = await prisma.postJob.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { scheduledFor: "desc" },
      take,
      include: {
        targets: { select: { id: true, accountId: true, status: true, error: true } },
      },
    });

    return reply.send({
      posts: jobs.map((j) => ({
        id: j.id,
        scheduledFor: j.scheduledFor,
        status: j.status,
        content: JSON.parse(j.content).text,
        targets: j.targets,
      })),
      nextCursor: jobs.length === take ? jobs[jobs.length - 1].id : null,
    });
  });

  // GET /api/v1/posts/:id — get a single post
  app.get("/api/v1/posts/:id", { preHandler }, async (req, reply) => {
    const userId = req.apiKeyUser!.id;
    const { id } = req.params as { id: string };

    const job = await prisma.postJob.findUnique({
      where: { id },
      include: { targets: { select: { id: true, accountId: true, status: true, error: true, platformPostId: true } } },
    });
    if (!job || job.userId !== userId) return reply.status(404).send({ error: "Post not found" });

    return reply.send({
      id: job.id,
      scheduledFor: job.scheduledFor,
      status: job.status,
      content: JSON.parse(job.content).text,
      commentText: job.commentText,
      targets: job.targets,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  });

  // PATCH /api/v1/posts/:id — reschedule or update a pending post
  app.patch("/api/v1/posts/:id", { preHandler }, async (req, reply) => {
    const userId = req.apiKeyUser!.id;
    const { id } = req.params as { id: string };
    const body = req.body as {
      scheduledFor?: string;
      content?: string;
      commentText?: string;
      accountIds?: string[];
      images?: string[];
      altTexts?: string[];
      mediaType?: "post" | "reel" | "story";
      youtubeType?: "short" | "video";
      perAccount?: Record<string, { text?: string; commentText?: string }>;
    };

    const job = await prisma.postJob.findUnique({ where: { id } });
    if (!job || job.userId !== userId) return reply.status(404).send({ error: "Post not found" });
    if (job.status !== "pending")
      return reply.status(409).send({ error: `Cannot update a post with status "${job.status}"` });

    if (body.mediaType && !["post", "reel", "story"].includes(body.mediaType))
      return reply.status(400).send({ error: "mediaType must be 'post', 'reel', or 'story'" });

    if (body.youtubeType && !["short", "video"].includes(body.youtubeType))
      return reply.status(400).send({ error: "youtubeType must be 'short' or 'video'" });

    const updateData: Record<string, unknown> = {};

    if (body.scheduledFor !== undefined) {
      const scheduledFor = new Date(body.scheduledFor);
      if (isNaN(scheduledFor.getTime()) || scheduledFor <= new Date())
        return reply.status(400).send({ error: "scheduledFor must be a future ISO date string" });
      updateData.scheduledFor = scheduledFor;
    }

    const needsContentUpdate = body.content !== undefined || body.images !== undefined ||
      body.altTexts !== undefined || body.mediaType !== undefined ||
      body.youtubeType !== undefined || body.perAccount !== undefined;

    if (needsContentUpdate) {
      if (body.content !== undefined && !body.content.trim())
        return reply.status(400).send({ error: "content cannot be empty" });
      const existing = JSON.parse(job.content) as {
        text: string; mediaUrls?: string[]; altTexts?: string[];
        mediaType?: string; youtubeType?: string;
        perAccount?: Record<string, { text?: string; commentText?: string }>;
      };
      updateData.content = JSON.stringify({
        ...existing,
        ...(body.content !== undefined ? { text: body.content } : {}),
        ...(body.images !== undefined ? { mediaUrls: body.images } : {}),
        ...(body.altTexts !== undefined ? { altTexts: body.altTexts } : {}),
        ...(body.mediaType !== undefined ? { mediaType: body.mediaType } : {}),
        ...(body.youtubeType !== undefined ? { youtubeType: body.youtubeType } : {}),
        ...(body.perAccount !== undefined ? { perAccount: body.perAccount } : {}),
      });
    }

    if (body.commentText !== undefined)
      updateData.commentText = body.commentText || null;

    const updated = await prisma.postJob.update({ where: { id }, data: updateData });

    if (body.accountIds !== undefined) {
      if (!Array.isArray(body.accountIds) || body.accountIds.length === 0)
        return reply.status(400).send({ error: "accountIds must be a non-empty array" });
      const valid = await prisma.account.findMany({
        where: { id: { in: body.accountIds }, userId },
        select: { id: true },
      });
      if (valid.length !== body.accountIds.length)
        return reply.status(400).send({ error: "One or more accountIds are invalid" });
      await prisma.postJobTarget.deleteMany({ where: { postJobId: id } });
      await prisma.postJobTarget.createMany({
        data: body.accountIds.map((accountId) => ({ postJobId: id, accountId })),
      });
    }

    if (body.scheduledFor) {
      await postJobQueue.remove(id);
      await schedulePostJob(id, new Date(body.scheduledFor));
    }

    const parsed = JSON.parse(updated.content);
    return reply.send({
      id: updated.id,
      scheduledFor: updated.scheduledFor,
      status: updated.status,
      content: parsed.text,
      commentText: updated.commentText,
      mediaType: parsed.mediaType ?? null,
      youtubeType: parsed.youtubeType ?? null,
      perAccount: parsed.perAccount ?? null,
    });
  });

  // DELETE /api/v1/posts/:id — cancel a pending post
  app.delete("/api/v1/posts/:id", { preHandler }, async (req, reply) => {
    const userId = req.apiKeyUser!.id;
    const { id } = req.params as { id: string };

    const job = await prisma.postJob.findUnique({ where: { id } });
    if (!job || job.userId !== userId) return reply.status(404).send({ error: "Post not found" });
    if (job.status !== "pending") {
      return reply.status(400).send({ error: "Only pending posts can be cancelled" });
    }

    await prisma.postJob.delete({ where: { id } });
    return reply.send({ ok: true });
  });

  // POST /api/v1/upload — upload an image or video, returns a URL for use in posts
  app.post("/api/v1/upload", { preHandler }, async (req, reply) => {
    const userId = req.apiKeyUser!.id;
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "No file uploaded — send as multipart field 'file'" });

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
        return reply.status(400).send({ error: `Video too large: ${(raw.length / 1_000_000).toFixed(0)} MB. Maximum is 100 MB.` });
      }
      const url = await storage.upload(raw, data.mimetype);
      await prisma.upload.create({ data: { url, userId } });
      return reply.status(201).send({ url, type: "video" });
    }

    if (raw.length > 10_000_000) {
      return reply.status(400).send({ error: `Image too large: ${(raw.length / 1_000_000).toFixed(2)} MB. Maximum is 10 MB.` });
    }
    const { buffer, mimeType } = await compressForPlatform(raw, data.mimetype, "bluesky");
    const url = await storage.upload(buffer, mimeType);
    await prisma.upload.create({ data: { url, userId } });
    return reply.status(201).send({ url, type: "image" });
  });
}
