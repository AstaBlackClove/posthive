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

  // POST /api/v1/posts — schedule or draft a post
  app.post("/api/v1/posts", { preHandler }, async (req, reply) => {
    const userId = req.apiKeyUser!.id;
    const body = req.body as {
      content: string;
      accountIds: string[];
      scheduledFor?: string;
      draft?: boolean;
      commentText?: string;
      images?: string[];
      altTexts?: string[];
      mediaType?: "post" | "reel" | "story";
      youtubeType?: "short" | "video";
      dryRun?: boolean;
      perAccount?: Record<string, { text?: string; commentText?: string }>;
    };

    if (!body.content?.trim()) return reply.status(400).send({ error: "content is required" });
    if (typeof body.content !== "string" || body.content.length > 50_000)
      return reply.status(400).send({ error: "content must be a string under 50,000 characters" });
    if (!Array.isArray(body.accountIds) || body.accountIds.length === 0)
      return reply.status(400).send({ error: "accountIds must be a non-empty array" });
    if (body.accountIds.length > 50)
      return reply.status(400).send({ error: "accountIds must contain at most 50 accounts" });
    if (body.images && (!Array.isArray(body.images) || body.images.length > 10))
      return reply.status(400).send({ error: "images must be an array of at most 10 URLs" });

    const isDraft = body.draft === true;

    // scheduledFor required unless saving as draft
    let scheduledFor: Date | null = null;
    if (!isDraft) {
      if (!body.scheduledFor) return reply.status(400).send({ error: "scheduledFor is required when draft is false" });
      scheduledFor = new Date(body.scheduledFor);
      if (isNaN(scheduledFor.getTime()) || scheduledFor <= new Date())
        return reply.status(400).send({ error: "scheduledFor must be a future ISO date string" });
    }

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
        scheduledFor: scheduledFor ?? new Date(0),
        status: isDraft ? "draft" : "pending",
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

    if (!isDraft) await schedulePostJob(job.id, scheduledFor!);

    return reply.status(201).send({
      id: job.id,
      scheduledFor: isDraft ? null : job.scheduledFor,
      status: job.status,
      draft: isDraft,
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

    const VALID_STATUSES = ["pending", "draft", "running", "done", "failed"] as const;
    const statusFilter = status && (VALID_STATUSES as readonly string[]).includes(status) ? status : undefined;

    const take = Math.min(Number(limitStr ?? 20), 100);
    const jobs = await prisma.postJob.findMany({
      where: {
        userId,
        ...(statusFilter ? { status: statusFilter } : {}),
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

  // DELETE /api/v1/posts/:id — cancel a pending or draft post
  app.delete("/api/v1/posts/:id", { preHandler }, async (req, reply) => {
    const userId = req.apiKeyUser!.id;
    const { id } = req.params as { id: string };

    const job = await prisma.postJob.findUnique({ where: { id } });
    if (!job || job.userId !== userId) return reply.status(404).send({ error: "Post not found" });
    if (job.status !== "pending" && job.status !== "draft") {
      return reply.status(400).send({ error: `Cannot delete a post with status "${job.status}". Only pending or draft posts can be deleted.` });
    }

    await prisma.postJob.delete({ where: { id } });
    return reply.send({ ok: true });
  });

  // POST /api/v1/posts/:id/approve — promote a draft to scheduled
  app.post("/api/v1/posts/:id/approve", { preHandler }, async (req, reply) => {
    const userId = req.apiKeyUser!.id;
    const { id } = req.params as { id: string };
    const body = req.body as { scheduledFor: string };

    if (!body.scheduledFor) return reply.status(400).send({ error: "scheduledFor is required" });

    const scheduledFor = new Date(body.scheduledFor);
    if (isNaN(scheduledFor.getTime()) || scheduledFor <= new Date())
      return reply.status(400).send({ error: "scheduledFor must be a future ISO date string" });

    const job = await prisma.postJob.findUnique({ where: { id } });
    if (!job || job.userId !== userId) return reply.status(404).send({ error: "Post not found" });
    if (job.status !== "draft") return reply.status(409).send({ error: `Post status is '${job.status}' — only drafts can be approved` });

    const updated = await prisma.postJob.update({
      where: { id },
      data: { status: "pending", scheduledFor },
    });
    await schedulePostJob(updated.id, scheduledFor);

    return reply.send({
      id: updated.id,
      status: updated.status,
      scheduledFor: updated.scheduledFor,
    });
  });

  // POST /api/v1/posts/:id/duplicate — clone a post as a new draft
  app.post("/api/v1/posts/:id/duplicate", { preHandler }, async (req, reply) => {
    const userId = req.apiKeyUser!.id;
    const { id } = req.params as { id: string };

    const job = await prisma.postJob.findUnique({
      where: { id },
      include: { targets: { select: { accountId: true } } },
    });
    if (!job || job.userId !== userId) return reply.status(404).send({ error: "Post not found" });

    const duplicate = await prisma.postJob.create({
      data: {
        userId,
        scheduledFor: new Date(0),
        status: "draft",
        content: job.content,
        commentText: job.commentText,
        dryRun: false,
        targets: { create: job.targets.map((t) => ({ accountId: t.accountId })) },
      },
      include: { targets: { select: { id: true, accountId: true, status: true } } },
    });

    return reply.status(201).send({
      id: duplicate.id,
      status: duplicate.status,
      draft: true,
      scheduledFor: null,
      targets: duplicate.targets,
    });
  });

  // GET /api/v1/templates — list saved templates
  app.get("/api/v1/templates", { preHandler }, async (req, reply) => {
    const userId = req.apiKeyUser!.id;
    const templates = await prisma.template.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, content: true, createdAt: true, updatedAt: true },
    });
    return reply.send({
      templates: templates.map((t) => {
        const c = (() => { try { return JSON.parse(t.content) as Record<string, unknown>; } catch { return {}; } })();
        return { id: t.id, name: t.name, text: (c.text as string) ?? "", firstComment: (c.commentText as string) ?? null, createdAt: t.createdAt, updatedAt: t.updatedAt };
      }),
    });
  });

  // POST /api/v1/templates/:id/use — create a post from a template
  app.post("/api/v1/templates/:id/use", { preHandler }, async (req, reply) => {
    const userId = req.apiKeyUser!.id;
    const { id } = req.params as { id: string };
    const body = req.body as {
      accountIds: string[];
      contentOverride?: string;
      firstCommentOverride?: string;
      scheduledFor?: string;
      draft?: boolean;
    };

    if (!Array.isArray(body.accountIds) || body.accountIds.length === 0)
      return reply.status(400).send({ error: "accountIds must be a non-empty array" });

    const template = await prisma.template.findUnique({ where: { id } });
    if (!template || template.userId !== userId) return reply.status(404).send({ error: "Template not found" });

    const tc = (() => { try { return JSON.parse(template.content) as Record<string, unknown>; } catch { return {}; } })();

    const isDraft = body.draft !== false && !body.scheduledFor;
    let scheduledFor = new Date(0);
    if (!isDraft) {
      if (!body.scheduledFor) return reply.status(400).send({ error: "scheduledFor is required when draft is false" });
      scheduledFor = new Date(body.scheduledFor);
      if (isNaN(scheduledFor.getTime()) || scheduledFor <= new Date())
        return reply.status(400).send({ error: "scheduledFor must be a future ISO date string" });
    }

    const accounts = await prisma.account.findMany({ where: { id: { in: body.accountIds }, userId }, select: { id: true } });
    if (accounts.length !== body.accountIds.length)
      return reply.status(400).send({ error: "One or more accountIds are invalid" });

    const text = body.contentOverride ?? (tc.text as string) ?? "";
    const commentText = body.firstCommentOverride ?? (tc.commentText as string | undefined) ?? null;

    const job = await prisma.postJob.create({
      data: {
        userId,
        scheduledFor,
        status: isDraft ? "draft" : "pending",
        content: JSON.stringify({ ...tc, text, commentText }),
        commentText,
        dryRun: false,
        targets: { create: body.accountIds.map((accountId) => ({ accountId })) },
      },
      include: { targets: { select: { id: true, accountId: true, status: true } } },
    });

    if (!isDraft) await schedulePostJob(job.id, scheduledFor);

    return reply.status(201).send({
      id: job.id,
      status: job.status,
      draft: isDraft,
      scheduledFor: isDraft ? null : job.scheduledFor,
      templateUsed: template.name,
      targets: job.targets,
    });
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
