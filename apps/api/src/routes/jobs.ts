import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { schedulePostJob, postJobQueue } from "../lib/queue.js";
import { withAuth, getUser, getWorkspaceId, getWorkspaceRole, ACCESS_COOKIE_NAME } from "../lib/auth/withAuth.js";
import { authProvider } from "../lib/auth/index.js";
import { enforcePlan } from "../lib/enforcePlan.js";
import { getPlan } from "../lib/plans.js";
import type { StorageAdapter } from "../lib/storage.js";
import { adapters } from "../adapters/index.js";

const TARGET_SELECT = {
  id: true, accountId: true, status: true,
  platformPostId: true, error: true, attempts: true,
  account: { select: { platform: true, displayName: true, avatarUrl: true } },
};

const perAccountOverrideSchema = z.object({
  text: z.string().optional(),
  commentText: z.string().optional(),
});

const createJobBody = z.object({
  scheduledFor: z.string().datetime().optional(),
  draft: z.boolean().default(false),
  content: z.object({
    text: z.string().default(""),
    mediaUrls: z.array(z.string()).default([]),
    altTexts: z.array(z.string()).optional(),
    mediaType: z.enum(["post", "reel", "story"]).optional(),
    youtubeType: z.enum(["short", "video"]).optional(),
    youtubeVideoMode: z.enum(["upload", "url"]).optional(),
    youtubeVideoUrl: z.string().optional(),
    youtubeThumbnailUrl: z.string().optional(),
    locationId: z.string().optional(),
    userTags: z.array(z.string()).optional(),
    collaborators: z.array(z.string()).optional(),
    pixelfedSensitive: z.boolean().optional(),
    pixelfedVisibility: z.enum(["public", "unlisted", "private"]).optional(),
    perAccount: z.record(z.string().cuid(), perAccountOverrideSchema).optional(),
  }),
  commentText: z.string().optional(),
  accountIds: z.array(z.string().cuid()).min(1),
  dryRun: z.boolean().default(false),
});

export async function jobRoutes(app: FastifyInstance, { storage }: { storage: StorageAdapter }): Promise<void> {

  // Create a new scheduled job
  app.post("/jobs", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const workspaceId = getWorkspaceId(req);

    const parsed = createJobBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { scheduledFor, draft, content, commentText, accountIds, dryRun } = parsed.data;

    if (!draft && !scheduledFor) {
      return reply.status(400).send({ error: "scheduledFor is required when not saving as draft" });
    }

    // Plan gate only applies to live scheduling, not draft creation
    if (!draft) {
      const blocked = await enforcePlan(userId, workspaceId, "scheduling");
      if (blocked) return reply.status(402).send(blocked);
    }

    // Gate: Reels & Stories (Pro+)
    if (content.mediaType === "reel" || content.mediaType === "story") {
      const reelBlocked = await enforcePlan(userId, workspaceId, "reels");
      if (reelBlocked) return reply.status(402).send(reelBlocked);
    }

    // Gate: per-platform overrides (Pro+)
    if (content.perAccount && Object.keys(content.perAccount).length > 0) {
      const overrideBlocked = await enforcePlan(userId, workspaceId, "overrides");
      if (overrideBlocked) return reply.status(402).send(overrideBlocked);
    }

    // Gate: max images per post
    if (content.mediaUrls.length > 0) {
      const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { plan: true } });
      const planCfg = getPlan(ws?.plan ?? "cancelled");
      if (content.mediaUrls.length > planCfg.maxImagesPerPost) {
        return reply.status(402).send({
          error: `Your ${planCfg.name} plan allows up to ${planCfg.maxImagesPerPost} images per post. Upgrade to Pro for up to 10.`,
          code: "PLAN_LIMIT",
          upgradeRequired: true,
        });
      }
    }

    // Verify accounts belong to this workspace
    const accounts = await prisma.account.findMany({
      where: { id: { in: accountIds }, workspaceId },
      select: { id: true },
    });
    if (accounts.length !== accountIds.length) {
      return reply.status(400).send({ error: "One or more accountIds not found" });
    }

    const job = await prisma.postJob.create({
      data: {
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        status: draft ? "draft" : "pending",
        content: JSON.stringify(content),
        commentText: commentText ?? null,
        dryRun,
        userId,
        workspaceId,
        targets: { create: accountIds.map((accountId) => ({ accountId })) },
      },
      include: { targets: { select: TARGET_SELECT } },
    });

    if (!draft) {
      await schedulePostJob(job.id, new Date(scheduledFor!));
    }

    // Mark uploaded files as claimed so the orphan cron leaves them alone
    if (content.mediaUrls?.length) {
      await prisma.upload.updateMany({
        where: { url: { in: content.mediaUrls }, userId },
        data: { claimedAt: new Date() },
      });
    }

    return reply.status(201).send(job);
  });

  // SSE stream — scoped to current user.
  // EventSource can't send cookies cross-origin so auth token comes via ?token= query param.
  app.get("/jobs/stream", async (req, reply) => {
    const origin = req.headers.origin ?? process.env.WEB_URL ?? "http://localhost:3000";
    const sseHeaders: Record<string, string> = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
    };

    const token = (req.query as Record<string, string>)?.token ?? req.cookies?.[ACCESS_COOKIE_NAME];
    const user = token ? await authProvider.validateAccessToken(token) : null;

    if (!user) {
      reply.raw.writeHead(401, sseHeaders);
      reply.raw.write(`data: ${JSON.stringify({ error: "unauthorized" })}\n\n`);
      reply.raw.end();
      return;
    }

    const { id: userId } = user;

    // Resolve workspaceId for stream scoping — same logic as withAuth
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        activeWorkspaceId: true,
        workspaceMembers: { orderBy: { joinedAt: "asc" }, take: 1, select: { workspaceId: true } },
      },
    });
    const streamWorkspaceId = dbUser?.activeWorkspaceId ?? dbUser?.workspaceMembers[0]?.workspaceId ?? null;

    reply.raw.writeHead(200, sseHeaders);

    const fetchJobs = async () => {
      const jobs = await prisma.postJob.findMany({
        where: streamWorkspaceId ? { workspaceId: streamWorkspaceId } : { userId },
        orderBy: { scheduledFor: "desc" },
        include: { targets: { select: TARGET_SELECT } },
      });
      return JSON.stringify(jobs);
    };

    let lastPayload = "";
    try {
      lastPayload = await fetchJobs();
      reply.raw.write(`data: ${lastPayload}\n\n`);
    } catch { /* ignore */ }

    const poll = setInterval(async () => {
      try {
        const payload = await fetchJobs();
        if (payload !== lastPayload) { lastPayload = payload; reply.raw.write(`data: ${payload}\n\n`); }
      } catch { /* ignore */ }
    }, 3000);

    const keepAlive = setInterval(() => { reply.raw.write(": ping\n\n"); }, 25000);

    req.raw.on("close", () => { clearInterval(poll); clearInterval(keepAlive); });
    await new Promise<void>((resolve) => req.raw.on("close", resolve));
  });

  // List jobs for current workspace
  app.get("/jobs", { preHandler: [withAuth] }, async (req, reply) => {
    const workspaceId = getWorkspaceId(req);
    const jobs = await prisma.postJob.findMany({
      where: { workspaceId },
      orderBy: { scheduledFor: "desc" },
      include: { targets: { select: TARGET_SELECT } },
    });
    return reply.send(jobs);
  });

  // Single job detail — scoped to workspace
  app.get("/jobs/:id", { preHandler: [withAuth] }, async (req, reply) => {
    const workspaceId = getWorkspaceId(req);
    const { id } = req.params as { id: string };
    const job = await prisma.postJob.findFirst({
      where: { id, workspaceId },
      include: { targets: { select: TARGET_SELECT } },
    });
    if (!job) return reply.status(404).send({ error: "Job not found" });
    return reply.send(job);
  });

  // Update a pending job (content, commentText, scheduledFor — all optional)
  app.patch("/jobs/:id", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const workspaceId = getWorkspaceId(req);
    const { id } = req.params as { id: string };
    const body = z.object({
      scheduledFor: z.string().datetime().optional(),
      text: z.string().optional(),
      commentText: z.string().optional(),
      mediaUrls: z.array(z.string()).optional(),
      mediaType: z.enum(["post", "reel", "story"]).optional(),
      youtubeType: z.enum(["short", "video"]).optional(),
      youtubeVideoMode: z.enum(["upload", "url"]).optional(),
      youtubeVideoUrl: z.string().optional(),
      youtubeThumbnailUrl: z.string().optional(),
      pixelfedSensitive: z.boolean().optional(),
      pixelfedVisibility: z.enum(["public", "unlisted", "private"]).optional(),
      accountIds: z.array(z.string().cuid()).min(1).optional(),
      perAccount: z.record(z.string().cuid(), perAccountOverrideSchema).optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const job = await prisma.postJob.findFirst({ where: { id, workspaceId }, select: { status: true, content: true, userId: true } });
    if (!job) return reply.status(404).send({ error: "Job not found" });
    if (job.status !== "pending" && job.status !== "draft") {
      return reply.status(409).send({ error: `Cannot edit a job with status "${job.status}"` });
    }
    const role = await getWorkspaceRole(userId, workspaceId);
    if (!["owner", "admin"].includes(role ?? "") && job.userId !== userId) {
      return reply.status(403).send({ error: "You can only edit your own posts.", code: "FORBIDDEN" });
    }

    const updateData: Record<string, unknown> = {};

    if (body.data.scheduledFor) {
      updateData.scheduledFor = new Date(body.data.scheduledFor);
    }
    if (body.data.text !== undefined || body.data.mediaUrls !== undefined || body.data.mediaType !== undefined || body.data.youtubeType !== undefined || body.data.youtubeVideoMode !== undefined || body.data.youtubeVideoUrl !== undefined || body.data.youtubeThumbnailUrl !== undefined || body.data.pixelfedSensitive !== undefined || body.data.pixelfedVisibility !== undefined || body.data.perAccount !== undefined) {
      const existing = JSON.parse(job.content) as { text: string; mediaUrls?: string[]; mediaType?: string; youtubeType?: string; youtubeVideoMode?: string; youtubeVideoUrl?: string; youtubeThumbnailUrl?: string; pixelfedSensitive?: boolean; pixelfedVisibility?: string; perAccount?: Record<string, unknown> };
      updateData.content = JSON.stringify({
        ...existing,
        ...(body.data.text !== undefined ? { text: body.data.text } : {}),
        ...(body.data.mediaUrls !== undefined ? { mediaUrls: body.data.mediaUrls } : {}),
        ...(body.data.mediaType !== undefined ? { mediaType: body.data.mediaType } : {}),
        ...(body.data.youtubeType !== undefined ? { youtubeType: body.data.youtubeType } : {}),
        ...(body.data.youtubeVideoMode !== undefined ? { youtubeVideoMode: body.data.youtubeVideoMode } : {}),
        ...(body.data.youtubeVideoUrl !== undefined ? { youtubeVideoUrl: body.data.youtubeVideoUrl } : {}),
        ...(body.data.youtubeThumbnailUrl !== undefined ? { youtubeThumbnailUrl: body.data.youtubeThumbnailUrl } : {}),
        ...(body.data.pixelfedSensitive !== undefined ? { pixelfedSensitive: body.data.pixelfedSensitive } : {}),
        ...(body.data.pixelfedVisibility !== undefined ? { pixelfedVisibility: body.data.pixelfedVisibility } : {}),
        ...(body.data.perAccount !== undefined ? { perAccount: body.data.perAccount } : {}),
      });
    }
    if (body.data.commentText !== undefined) {
      updateData.commentText = body.data.commentText || null;
    }

    const updated = await prisma.postJob.update({ where: { id }, data: updateData });

    if (body.data.accountIds) {
      const newIds = body.data.accountIds;
      const currentTargets = await prisma.postJobTarget.findMany({
        where: { postJobId: id },
        select: { id: true, accountId: true },
      });

      const toRemove = currentTargets.filter(t => !newIds.includes(t.accountId));
      const toAdd = newIds.filter(nid => !currentTargets.some(t => t.accountId === nid));

      if (toAdd.length > 0) {
        const valid = await prisma.account.findMany({ where: { id: { in: toAdd }, workspaceId }, select: { id: true } });
        if (valid.length !== toAdd.length) return reply.status(400).send({ error: "One or more accountIds not found" });
      }

      if (toRemove.length > 0) {
        await prisma.postJobTarget.deleteMany({ where: { id: { in: toRemove.map(t => t.id) } } });
      }
      if (toAdd.length > 0) {
        await prisma.postJobTarget.createMany({ data: toAdd.map(accountId => ({ postJobId: id, accountId })) });
      }
    }

    if (body.data.scheduledFor) {
      const blocked = await enforcePlan(userId, workspaceId, "scheduling");
      if (blocked) return reply.status(402).send(blocked);
      await postJobQueue.remove(id);
      await schedulePostJob(id, new Date(body.data.scheduledFor));
    }

    return reply.send(updated);
  });

  // Promote a draft to a scheduled job
  app.post("/jobs/:id/schedule", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const workspaceId = getWorkspaceId(req);
    const { id } = req.params as { id: string };
    const body = z.object({ scheduledFor: z.string().datetime() }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: "scheduledFor is required" });

    const job = await prisma.postJob.findFirst({ where: { id, workspaceId }, select: { status: true } });
    if (!job) return reply.status(404).send({ error: "Job not found" });
    if (job.status !== "draft") return reply.status(409).send({ error: "Only draft jobs can be scheduled" });

    const blocked = await enforcePlan(userId, workspaceId, "scheduling");
    if (blocked) return reply.status(402).send(blocked);

    const scheduledFor = new Date(body.data.scheduledFor);
    const updated = await prisma.postJob.update({
      where: { id },
      data: { status: "pending", scheduledFor },
      include: { targets: { select: TARGET_SELECT } },
    });

    await schedulePostJob(id, scheduledFor);
    return reply.send(updated);
  });

  // Retry only the failed targets on a partially-failed job
  app.post("/jobs/:id/retry-failed", { preHandler: [withAuth] }, async (req, reply) => {
    const workspaceId = getWorkspaceId(req);
    const { id } = req.params as { id: string };

    const job = await prisma.postJob.findFirst({
      where: { id, workspaceId },
      include: { targets: { select: { id: true, status: true } } },
    });
    if (!job) return reply.status(404).send({ error: "Job not found" });
    if (job.status === "running") return reply.status(409).send({ error: "Job is currently running" });

    const failedTargetIds = job.targets
      .filter((t) => t.status === "post_failed")
      .map((t) => t.id);

    if (failedTargetIds.length === 0) {
      return reply.status(400).send({ error: "No failed targets to retry" });
    }

    // Reset failed targets and job status, then re-queue for immediate execution
    await prisma.postJobTarget.updateMany({
      where: { id: { in: failedTargetIds } },
      data: { status: "pending", error: null, attempts: 0 },
    });

    const scheduledFor = new Date(Date.now() + 5000); // 5s from now
    await prisma.postJob.update({
      where: { id },
      data: { status: "pending", scheduledFor },
    });

    await postJobQueue.remove(id).catch(() => {});
    await schedulePostJob(id, scheduledFor);

    return reply.status(200).send({ retrying: failedTargetIds.length });
  });

  // Delete a job and clean up associated media
  app.delete("/jobs/:id", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const workspaceId = getWorkspaceId(req);
    const { id } = req.params as { id: string };

    const job = await prisma.postJob.findFirst({ where: { id, workspaceId }, select: { status: true, content: true, userId: true } });
    if (!job) return reply.status(404).send({ error: "Job not found" });
    if (job.status === "running") return reply.status(409).send({ error: "Cannot delete a job that is currently running" });
    const role = await getWorkspaceRole(userId, workspaceId);
    if (!["owner", "admin"].includes(role ?? "") && job.userId !== userId) {
      return reply.status(403).send({ error: "You can only delete your own posts.", code: "FORBIDDEN" });
    }

    // Delete media files from storage
    try {
      const content = JSON.parse(job.content) as { mediaUrls?: string[]; youtubeThumbnailUrl?: string };
      const urlsToDelete = [
        ...(content.mediaUrls ?? []),
        ...(content.youtubeThumbnailUrl ? [content.youtubeThumbnailUrl] : []),
      ];
      if (urlsToDelete.length) {
        await Promise.allSettled(urlsToDelete.map((url) => storage.delete(url)));
        await prisma.upload.deleteMany({ where: { url: { in: urlsToDelete } } });
      }
    } catch { /* non-fatal */ }

    // Remove from queue if pending
    if (job.status === "pending") await postJobQueue.remove(id).catch(() => {});

    // Targets are deleted automatically via onDelete: Cascade
    await prisma.postJob.delete({ where: { id } });

    return reply.status(204).send();
  });

  // GET /jobs/targets/:targetId/analytics
  app.get("/jobs/targets/:targetId/analytics", { preHandler: [withAuth] }, async (req, reply) => {
    const workspaceId = getWorkspaceId(req);
    const { targetId } = req.params as { targetId: string };

    const target = await prisma.postJobTarget.findFirst({
      where: { id: targetId, postJob: { workspaceId } },
      select: {
        platformPostId: true,
        status: true,
        accountId: true,
        account: { select: { platform: true, credentials: true, expiresAt: true, createdAt: true, updatedAt: true, id: true, userId: true, workspaceId: true, displayName: true, avatarUrl: true, refreshToken: true } },
      },
    });

    if (!target) return reply.status(404).send({ error: "Target not found" });
    if (!target.platformPostId) return reply.status(400).send({ error: "Post not yet published" });

    const adapter = adapters.find(a => a.name === target.account.platform);
    if (!adapter?.getAnalytics) {
      return reply.status(400).send({ error: "Analytics not supported for this platform" });
    }

    try {
      const analytics = await adapter.getAnalytics(target.account, target.platformPostId);
      return reply.send(analytics);
    } catch (err) {
      return reply.status(502).send({ error: err instanceof Error ? err.message : "Failed to fetch analytics" });
    }
  });
}
