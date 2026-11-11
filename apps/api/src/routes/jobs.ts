import type { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

// Track active SSE connections per userId — evicted on close
const sseConnections = new Map<string, number>();
const SSE_MAX_PER_USER = 3;
import { schedulePostJob, postJobQueue } from "../lib/queue.js";
import { withAuth, getUser, getWorkspaceId, getWorkspaceRole, isManageRole, requireManageRole, isContentEditorRole, requireContentEditorRole, isDraftVisibleTo, jobVisibilityWhere, CONTENT_EDITOR_FORBIDDEN, ACCESS_COOKIE_NAME } from "../lib/auth/withAuth.js";
import { authProvider } from "../lib/auth/index.js";
import { enforcePlan } from "../lib/enforcePlan.js";
import { getPlan } from "../lib/plans.js";
import type { StorageAdapter } from "../lib/storage.js";
import { adapters } from "../adapters/index.js";
import { withoutTemplateMedia } from "../lib/templates.js";
import { bucketJobCounts, jobFilterWhere } from "../lib/jobFilters.js";
import { canEditJob, sameContent, shouldResetReview } from "../lib/jobEditRules.js";
import { missingForReview, type MissingField } from "../lib/submitReadiness.js";
import { CATEGORIES, PILLARS, pillarFor, type Category, type Pillar } from "../lib/contentTypes.js";

/**
 * Marks uploads as used by a post, so the orphan cleaner (index.ts) leaves them alone: it deletes an unclaimed upload
 * after a day. Only the person's own uploads are claimed.
 */
async function claimUploads(urls: string[] | undefined, userId: string): Promise<void> {
  if (!urls?.length) return;
  await prisma.upload.updateMany({ where: { url: { in: urls }, userId }, data: { claimedAt: new Date() } });
}

const TARGET_SELECT = {
  id: true, accountId: true, status: true,
  platformPostId: true, error: true, attempts: true,
  account: { select: { platform: true, displayName: true, avatarUrl: true } },
};

const perAccountOverrideSchema = z.object({
  text: z.string().optional(),
  commentText: z.string().optional(),
});

// Content type (docs/content-types.md). The pillar always follows the category; a
// pillar alone is allowed while the category is still undecided.
type ContentType = { pillar: Pillar | null; category: Category | null };

type ReadinessJob = { scheduledFor: Date | null; content: string; targets: { account: { platform: string } | null }[] };

/** Input for missingForReview from a job row, plus a display title for reports. */
function readinessInput(job: ReadinessJob) {
  let title = "Untitled";
  try {
    const c = JSON.parse(job.content) as { title?: string; text?: string };
    title = c.title?.trim() || c.text?.trim() || "Untitled";
  } catch { /* keep fallback */ }
  return {
    title,
    scheduledFor: job.scheduledFor,
    content: job.content,
    targetPlatforms: job.targets.map((t) => t.account?.platform).filter((p): p is string => !!p),
  };
}

function contentType(pillar: Pillar | null | undefined, category: Category | null | undefined): ContentType | { error: string } {
  if (!category) return { pillar: pillar ?? null, category: null };
  const derived = pillarFor(category);
  if (pillar !== undefined && pillar !== derived) return { error: `${category} belongs to ${derived ?? "no pillar"}` };
  return { pillar: derived, category };
}

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
    youtubeVisibility: z.enum(["public", "unlisted", "private"]).optional(),
    youtubeTags: z.array(z.string()).optional(),
    youtubeMadeForKids: z.boolean().optional(),
    linkedinVisibility: z.enum(["PUBLIC", "CONNECTIONS"]).optional(),
    blueskyLanguage: z.string().optional(),
    blueskyContentWarning: z.string().optional(),
    perAccount: z.record(z.string().cuid(), perAccountOverrideSchema).optional(),
    title: z.string().max(200).optional(),
    pillar: z.enum(PILLARS).nullable().optional(),
    category: z.enum(CATEGORIES).nullable().optional(),
  }),
  commentText: z.string().optional(),
  accountIds: z.array(z.string().cuid()).min(1),
  dryRun: z.boolean().default(false),
  repeatInterval: z.enum(["daily", "weekly", "monthly"]).optional(),
  repeatEndsAt: z.string().datetime().optional(),
});

export async function jobRoutes(app: FastifyInstance, { storage }: { storage: StorageAdapter }): Promise<void> {

  // Design-approval gate — when workspace.approvalRequired is on, non-manage
  // roles (marketing members) cannot schedule directly; their posts become
  // drafts awaiting review instead of entering the queue.
  const needsReviewGate = async (userId: string, workspaceId: string): Promise<boolean> => {
    if (isManageRole(await getWorkspaceRole(userId, workspaceId))) return false;
    const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { approvalRequired: true } });
    return ws?.approvalRequired ?? false;
  };

  // Create a new scheduled job
  app.post("/jobs", { preHandler: [withAuth], config: { rateLimit: { max: 60, timeWindow: "1 minute" } } }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const workspaceId = getWorkspaceId(req);

    // Tim Desain is read-only on content (docs/role-access-matrix.md)
    const roleBlocked = await requireContentEditorRole(userId, workspaceId);
    if (roleBlocked) return reply.status(403).send(roleBlocked);

    const parsed = createJobBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { scheduledFor, draft, content, commentText, accountIds, dryRun, repeatInterval, repeatEndsAt } = parsed.data;

    if (!draft && !scheduledFor) {
      return reply.status(400).send({ error: "scheduledFor is required when not saving as draft" });
    }
    const { pillar, category, ...postContent } = content;
    const type = pillar !== undefined || category !== undefined ? contentType(pillar, category) : null;
    if (type && "error" in type) return reply.status(400).send({ error: type.error });

    // Approval gate — member posts in approval-enabled workspaces stay drafts
    // awaiting design review; scheduledFor is kept as the requested time.
    const needsReview = !draft && (await needsReviewGate(userId, workspaceId));

    // Non-scheduling gates (reels, overrides, images) — no race risk, check outside tx
    if (content.mediaType === "reel" || content.mediaType === "story") {
      const reelBlocked = await enforcePlan(userId, workspaceId, "reels");
      if (reelBlocked) return reply.status(402).send(reelBlocked);
    }
    if (content.perAccount && Object.keys(content.perAccount).length > 0) {
      const overrideBlocked = await enforcePlan(userId, workspaceId, "overrides");
      if (overrideBlocked) return reply.status(402).send(overrideBlocked);
    }
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

    // Wrap plan-limit check + job creation in a transaction with an advisory lock
    // so concurrent bulk-CSV requests can't all pass the count check simultaneously.
    let planError: Awaited<ReturnType<typeof enforcePlan>> = null;
    const job = await prisma.$transaction(async (tx) => {
      if (!draft && !needsReview) {
        // Lock per workspace — serializes concurrent scheduling requests (Postgres only)
        if (!process.env.DATABASE_URL?.startsWith("file:")) {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${workspaceId}))`;
        }
        planError = await enforcePlan(userId, workspaceId, "scheduling", tx);
        if (planError) return null;
      }
      return tx.postJob.create({
        data: {
          scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
          status: draft || needsReview ? "draft" : "pending",
          approvalStatus: needsReview ? "pending" : null,
          // Pillar is derived from the category, never trusted from the client
          content: JSON.stringify(type ? { ...postContent, ...type } : postContent),
          commentText: commentText ?? null,
          dryRun,
          userId,
          workspaceId,
          repeatInterval: repeatInterval ?? null,
          repeatEndsAt: repeatEndsAt ? new Date(repeatEndsAt) : null,
          targets: { create: accountIds.map((accountId) => ({ accountId })) },
        },
        include: { targets: { select: TARGET_SELECT } },
      });
    }, { timeout: 30_000 });

    if (planError) return reply.status(402).send(planError);
    if (!job) return reply.status(500).send({ error: "Failed to create job" });

    if (!draft && !needsReview) {
      await schedulePostJob(job.id, new Date(scheduledFor!));
    }

    await claimUploads(content.mediaUrls, userId);

    return reply.status(201).send(job);
  });

  // SSE stream — scoped to current user.
  // EventSource can't send cookies cross-origin so auth token comes via ?token= query param.
  app.get("/jobs/stream", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (req, reply) => {
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

    // Enforce per-user SSE connection limit
    const activeConns = sseConnections.get(userId) ?? 0;
    if (activeConns >= SSE_MAX_PER_USER) {
      reply.raw.writeHead(429, { ...sseHeaders, "Retry-After": "10" });
      reply.raw.write(`data: ${JSON.stringify({ error: "too_many_connections" })}\n\n`);
      reply.raw.end();
      return;
    }
    sseConnections.set(userId, activeConns + 1);

    // Resolve workspaceId for stream scoping — same logic as withAuth
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        activeWorkspaceId: true,
        workspaceMembers: { orderBy: { joinedAt: "asc" }, take: 1, select: { workspaceId: true } },
      },
    });
    const streamWorkspaceId = dbUser?.activeWorkspaceId ?? dbUser?.workspaceMembers[0]?.workspaceId ?? null;

    // Draft visibility — see jobVisibilityWhere; secure default for non-members
    const streamRole = streamWorkspaceId ? await getWorkspaceRole(userId, streamWorkspaceId) : null;

    reply.raw.writeHead(200, sseHeaders);

    const fetchJobs = async () => {
      const jobs = await prisma.postJob.findMany({
        where: streamWorkspaceId
          ? { workspaceId: streamWorkspaceId, ...jobVisibilityWhere(streamRole, userId) }
          : { userId },
        orderBy: { scheduledFor: "desc" },
        take: 20,
        select: {
          id: true, status: true, scheduledFor: true, content: true, commentText: true,
          createdAt: true, updatedAt: true, workspaceId: true, userId: true,
          approvalStatus: true, reviewNote: true,
          repeatInterval: true, repeatEndsAt: true, repeatParentId: true,
          targets: { select: TARGET_SELECT },
        },
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
    }, 30_000);

    const keepAlive = setInterval(() => { reply.raw.write(": ping\n\n"); }, 25000);

    req.raw.on("close", () => {
      clearInterval(poll);
      clearInterval(keepAlive);
      const cur = sseConnections.get(userId) ?? 1;
      if (cur <= 1) sseConnections.delete(userId);
      else sseConnections.set(userId, cur - 1);
    });
    await new Promise<void>((resolve) => req.raw.on("close", resolve));
  });

  // List jobs for current workspace — cursor-paginated.
  // Plain drafts are hidden from owner/admin (they only see their own); in-review
  // items stay visible to approvers; Marketing sees everything.
  app.get("/jobs", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const workspaceId = getWorkspaceId(req);
    const query = req.query as { cursor?: string; limit?: string; status?: string; review?: string; platform?: string };
    const limit = Math.min(Number(query.limit ?? 50), 100);
    const cursor = query.cursor ?? undefined;
    // `review=pending` is the legacy spelling of `status=review`
    const statusFilter = query.review === "pending" ? "review" : query.status;

    const role = await getWorkspaceRole(userId, workspaceId);
    // Visibility and filter both may use OR — combine with AND so neither overrides the other
    const and: Prisma.PostJobWhereInput[] = [jobVisibilityWhere(role, userId)];
    if (statusFilter) and.push(jobFilterWhere(statusFilter) ?? { status: statusFilter });
    if (query.platform) and.push({ targets: { some: { account: { platform: query.platform } } } });
    const where: Prisma.PostJobWhereInput = { workspaceId, AND: and };

    const jobs = await prisma.postJob.findMany({
      where,
      orderBy: { scheduledFor: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true, status: true, scheduledFor: true, content: true, commentText: true,
        createdAt: true, updatedAt: true, workspaceId: true, userId: true,
        approvalStatus: true, reviewNote: true, reviewedByUserId: true, reviewedAt: true,
        reviewedBy: { select: { name: true } },
        repeatInterval: true, repeatEndsAt: true, repeatParentId: true,
        targets: { select: TARGET_SELECT },
      },
    });

    const hasMore = jobs.length > limit;
    const items = hasMore ? jobs.slice(0, limit) : jobs;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return reply.send({ items, nextCursor, hasMore });
  });

  // Per-filter counts for the Posts chips. Computed over every visible job, so
  // they never depend on the active status filter or sort — only on the platform.
  app.get("/jobs/counts", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const workspaceId = getWorkspaceId(req);
    const { platform } = req.query as { platform?: string };
    const role = await getWorkspaceRole(userId, workspaceId);
    const and: Prisma.PostJobWhereInput[] = [jobVisibilityWhere(role, userId)];
    if (platform) and.push({ targets: { some: { account: { platform } } } });
    const rows = await prisma.postJob.groupBy({
      by: ["status", "approvalStatus"],
      where: { workspaceId, AND: and },
      _count: true,
    });
    return reply.send(bucketJobCounts(rows));
  });

  // Single job detail — scoped to workspace. Hidden drafts 404 so they can't
  // be probed by URL (no existence leak).
  app.get("/jobs/:id", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const workspaceId = getWorkspaceId(req);
    const { id } = req.params as { id: string };
    const role = await getWorkspaceRole(userId, workspaceId);
    const job = await prisma.postJob.findFirst({
      where: { id, workspaceId },
      include: { targets: { select: TARGET_SELECT } },
    });
    if (!job) return reply.status(404).send({ error: "Job not found" });
    if (!isDraftVisibleTo(role, userId, job)) return reply.status(404).send({ error: "Job not found" });
    return reply.send(job);
  });

  // Update a pending job (content, commentText, scheduledFor — all optional)
  app.patch("/jobs/:id", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const workspaceId = getWorkspaceId(req);
    const { id } = req.params as { id: string };
    const body = z.object({
      scheduledFor: z.string().datetime().optional(),
      title: z.string().max(200).optional(),
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
      youtubeVisibility: z.enum(["public", "unlisted", "private"]).optional(),
      youtubeTags: z.array(z.string()).optional(),
      youtubeMadeForKids: z.boolean().optional(),
      linkedinVisibility: z.enum(["PUBLIC", "CONNECTIONS"]).optional(),
      blueskyLanguage: z.string().optional(),
      blueskyContentWarning: z.string().optional(),
      accountIds: z.array(z.string().cuid()).min(1).optional(),
      perAccount: z.record(z.string().cuid(), perAccountOverrideSchema).optional(),
      // Sent together; category null clears both
      pillar: z.enum(PILLARS).nullable().optional(),
      category: z.enum(CATEGORIES).nullable().optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const typeChanged = body.data.pillar !== undefined || body.data.category !== undefined;
    const type = typeChanged ? contentType(body.data.pillar, body.data.category) : null;
    if (type && "error" in type) return reply.status(400).send({ error: type.error });

    const job = await prisma.postJob.findFirst({
      where: { id, workspaceId },
      select: { status: true, content: true, commentText: true, approvalStatus: true, targets: { select: { accountId: true } } },
    });
    if (!job) return reply.status(404).send({ error: "Job not found" });
    const role = await getWorkspaceRole(userId, workspaceId);
    // Tim Desain (and unknown roles) cannot edit content — read-only + approve/reject
    if (!isContentEditorRole(role)) {
      return reply.status(403).send(CONTENT_EDITOR_FORBIDDEN);
    }
    // Marketing: any draft, before approval only. Admin/owner: any draft or scheduled post.
    const editCheck = canEditJob(role, job);
    if (!editCheck.ok) {
      return reply.status(editCheck.status).send({ error: editCheck.error, ...(editCheck.code ? { code: editCheck.code } : {}) });
    }

    const updateData: Record<string, unknown> = {};

    if (body.data.scheduledFor) {
      updateData.scheduledFor = new Date(body.data.scheduledFor);
    }
    if (body.data.title !== undefined || body.data.text !== undefined || body.data.mediaUrls !== undefined || body.data.mediaType !== undefined || body.data.youtubeType !== undefined || body.data.youtubeVideoMode !== undefined || body.data.youtubeVideoUrl !== undefined || body.data.youtubeThumbnailUrl !== undefined || body.data.pixelfedSensitive !== undefined || body.data.pixelfedVisibility !== undefined || body.data.youtubeVisibility !== undefined || body.data.youtubeTags !== undefined || body.data.youtubeMadeForKids !== undefined || body.data.linkedinVisibility !== undefined || body.data.blueskyLanguage !== undefined || body.data.blueskyContentWarning !== undefined || body.data.perAccount !== undefined || typeChanged) {
      const existing = JSON.parse(job.content) as { text: string; mediaUrls?: string[]; mediaType?: string; youtubeType?: string; youtubeVideoMode?: string; youtubeVideoUrl?: string; youtubeThumbnailUrl?: string; pixelfedSensitive?: boolean; pixelfedVisibility?: string; youtubeVisibility?: string; youtubeTags?: string[]; youtubeMadeForKids?: boolean; linkedinVisibility?: string; blueskyLanguage?: string; blueskyContentWarning?: string; perAccount?: Record<string, unknown> };
      updateData.content = JSON.stringify({
        ...existing,
        ...(body.data.title !== undefined ? { title: body.data.title.trim() } : {}),
        ...(body.data.text !== undefined ? { text: body.data.text } : {}),
        ...(body.data.mediaUrls !== undefined ? { mediaUrls: body.data.mediaUrls } : {}),
        ...(body.data.mediaType !== undefined ? { mediaType: body.data.mediaType } : {}),
        ...(body.data.youtubeType !== undefined ? { youtubeType: body.data.youtubeType } : {}),
        ...(body.data.youtubeVideoMode !== undefined ? { youtubeVideoMode: body.data.youtubeVideoMode } : {}),
        ...(body.data.youtubeVideoUrl !== undefined ? { youtubeVideoUrl: body.data.youtubeVideoUrl } : {}),
        ...(body.data.youtubeThumbnailUrl !== undefined ? { youtubeThumbnailUrl: body.data.youtubeThumbnailUrl } : {}),
        ...(body.data.pixelfedSensitive !== undefined ? { pixelfedSensitive: body.data.pixelfedSensitive } : {}),
        ...(body.data.pixelfedVisibility !== undefined ? { pixelfedVisibility: body.data.pixelfedVisibility } : {}),
        ...(body.data.youtubeVisibility !== undefined ? { youtubeVisibility: body.data.youtubeVisibility } : {}),
        ...(body.data.youtubeTags !== undefined ? { youtubeTags: body.data.youtubeTags } : {}),
        ...(body.data.youtubeMadeForKids !== undefined ? { youtubeMadeForKids: body.data.youtubeMadeForKids } : {}),
        ...(body.data.linkedinVisibility !== undefined ? { linkedinVisibility: body.data.linkedinVisibility } : {}),
        ...(body.data.blueskyLanguage !== undefined ? { blueskyLanguage: body.data.blueskyLanguage } : {}),
        ...(body.data.blueskyContentWarning !== undefined ? { blueskyContentWarning: body.data.blueskyContentWarning } : {}),
        ...(body.data.perAccount !== undefined ? { perAccount: body.data.perAccount } : {}),
        ...(type ?? {}),
      });
    }
    if (body.data.commentText !== undefined) {
      updateData.commentText = body.data.commentText || null;
    }

    // Only a real content change (not the date, not a re-save of the same values)
    // sends a submitted/rejected draft back out of review.
    const accountsChanged = body.data.accountIds !== undefined &&
      (body.data.accountIds.length !== job.targets.length ||
        body.data.accountIds.some((a) => !job.targets.some((t) => t.accountId === a)));
    const contentChanged =
      (updateData.content !== undefined && !sameContent(updateData.content as string, job.content)) ||
      (updateData.commentText !== undefined && updateData.commentText !== job.commentText) ||
      accountsChanged;
    if (shouldResetReview(role, job, contentChanged)) {
      updateData.approvalStatus = null;
      updateData.reviewNote = null;
      updateData.reviewedByUserId = null;
      updateData.reviewedAt = null;
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

    // A picture added in this edit belongs to the post now, or the orphan cleaner deletes it after a day
    await claimUploads(body.data.mediaUrls, userId);

    // Delete removed media files from storage (best-effort, non-fatal)
    if (body.data.mediaUrls !== undefined || body.data.youtubeThumbnailUrl !== undefined) {
      try {
        const existing = JSON.parse(job.content) as { mediaUrls?: string[]; youtubeThumbnailUrl?: string };
        const oldUrls = new Set<string>([
          ...(existing.mediaUrls ?? []),
          ...(existing.youtubeThumbnailUrl ? [existing.youtubeThumbnailUrl] : []),
        ]);
        const newUrls = new Set<string>([
          ...(body.data.mediaUrls ?? existing.mediaUrls ?? []),
          ...(body.data.youtubeThumbnailUrl !== undefined
            ? (body.data.youtubeThumbnailUrl ? [body.data.youtubeThumbnailUrl] : [])
            : (existing.youtubeThumbnailUrl ? [existing.youtubeThumbnailUrl] : [])),
        ]);
        const removed = await withoutTemplateMedia([...oldUrls].filter(u => !newUrls.has(u)));
        if (removed.length) {
          await Promise.allSettled(removed.map(u => storage.delete(u)));
          // Not scoped to the editor: a draft is kept by the team, so the file may be a colleague's upload. Deleting a
          // post already drops these rows the same way; a row left behind would point at a file that is gone.
          await prisma.upload.deleteMany({ where: { url: { in: removed } } });
        }
      } catch { /* non-fatal */ }
    }

    if (body.data.scheduledFor) {
      const blocked = await enforcePlan(userId, workspaceId, "scheduling");
      if (blocked) return reply.status(402).send(blocked);
      // Drafts (including those awaiting design approval) are never queued —
      // they enter the queue only via the approve endpoint.
      if (updated.status !== "draft") {
        await postJobQueue.remove(id);
        await schedulePostJob(id, new Date(body.data.scheduledFor));
      }
    }

    return reply.send(updated);
  });

  // Promote a draft to a scheduled job — this is the approve action.
  // Only owner/admin/ (design team) may promote; a draft awaiting
  // review gets approvalStatus=approved before entering the queue.
  app.post("/jobs/:id/schedule", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const workspaceId = getWorkspaceId(req);
    const { id } = req.params as { id: string };
    const body = z.object({ scheduledFor: z.string().datetime() }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: "scheduledFor is required" });

    const role = await getWorkspaceRole(userId, workspaceId);
    if (!isManageRole(role)) {
      return reply.status(403).send({ error: "Only workspace admins or designers can perform this action.", code: "FORBIDDEN" });
    }

    const job = await prisma.postJob.findFirst({ where: { id, workspaceId }, select: { status: true, approvalStatus: true, userId: true } });
    // Other people's plain drafts are hidden from approvers — only in-review ones can be promoted
    if (!job || !isDraftVisibleTo(role, userId, job)) return reply.status(404).send({ error: "Job not found" });
    if (job.status !== "draft") return reply.status(409).send({ error: "Only draft jobs can be scheduled" });

    const blocked = await enforcePlan(userId, workspaceId, "scheduling");
    if (blocked) return reply.status(402).send(blocked);

    const scheduledFor = new Date(body.data.scheduledFor);
    const updated = await prisma.postJob.update({
      where: { id },
      data: {
        status: "pending",
        scheduledFor,
        reviewNote: null,
        ...(job.approvalStatus === "pending"
          ? { approvalStatus: "approved", reviewedByUserId: userId, reviewedAt: new Date() }
          : {}),
      },
      include: { targets: { select: TARGET_SELECT } },
    });

    await schedulePostJob(id, scheduledFor);
    return reply.send(updated);
  });

  // Reject a post awaiting design approval — sent back to the creator with a note.
  app.post("/jobs/:id/reject", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const workspaceId = getWorkspaceId(req);
    const { id } = req.params as { id: string };
    const body = z.object({ note: z.string().min(1).max(2000).trim() }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: "A review note is required" });

    const forbidden = await requireManageRole(userId, workspaceId);
    if (forbidden) return reply.status(403).send(forbidden);

    const job = await prisma.postJob.findFirst({ where: { id, workspaceId }, select: { status: true, approvalStatus: true } });
    if (!job) return reply.status(404).send({ error: "Job not found" });
    if (job.status !== "draft" || job.approvalStatus !== "pending") {
      return reply.status(409).send({ error: "Only posts awaiting review can be rejected" });
    }

    const updated = await prisma.postJob.update({
      where: { id },
      data: {
        approvalStatus: "rejected",
        reviewNote: body.data.note,
        reviewedByUserId: userId,
        reviewedAt: new Date(),
      },
      include: { targets: { select: TARGET_SELECT } },
    });
    return reply.send(updated);
  });

  // Submit a draft for design approval (approval-enabled workspaces only).
  app.post("/jobs/:id/submit", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const workspaceId = getWorkspaceId(req);
    const { id } = req.params as { id: string };

    const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { approvalRequired: true } });
    if (!ws?.approvalRequired) return reply.status(400).send({ error: "Approval is not enabled for this workspace" });

    const job = await prisma.postJob.findFirst({
      where: { id, workspaceId },
      select: { status: true, approvalStatus: true, scheduledFor: true, content: true, targets: { select: { account: { select: { platform: true } } } } },
    });
    if (!job) return reply.status(404).send({ error: "Job not found" });
    if (job.status !== "draft") return reply.status(409).send({ error: "Only drafts can be submitted for review" });
    if (job.approvalStatus === "pending") return reply.status(409).send({ error: "Already awaiting review" });
    // Sent back by the reviewer: the same content is not sent again. An edit that changes it clears the rejection (PATCH).
    if (job.approvalStatus === "rejected") return reply.status(409).send({ error: "Sent back for changes. Change the post before sending it again.", code: "NEEDS_CHANGES" });
    const role = await getWorkspaceRole(userId, workspaceId);
    // Submitting is a content-editor action (designer reviews, never submits)
    // Any draft of the workspace: a plan is imported by one person and kept by the team
    if (!isContentEditorRole(role)) return reply.status(403).send(CONTENT_EDITOR_FORBIDDEN);
    const missing = missingForReview(readinessInput(job));
    if (missing.length > 0) {
      return reply.status(422).send({ error: `Complete the required fields first: ${missing.join(", ")}.`, code: "INCOMPLETE", missing });
    }

    const updated = await prisma.postJob.update({
      where: { id },
      data: { approvalStatus: "pending", reviewNote: null, reviewedByUserId: null, reviewedAt: null },
      include: { targets: { select: TARGET_SELECT } },
    });
    return reply.send(updated);
  });

  // Bulk "Send for Design Approval": complete drafts are submitted, the rest are skipped with a reason.
  app.post("/jobs/submit-bulk", { preHandler: [withAuth], config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const workspaceId = getWorkspaceId(req);
    const body = z.object({ ids: z.array(z.string().cuid()).min(1).max(100) }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: "ids must be 1-100 job ids" });

    const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { approvalRequired: true } });
    if (!ws?.approvalRequired) return reply.status(400).send({ error: "Approval is not enabled for this workspace" });
    const role = await getWorkspaceRole(userId, workspaceId);
    if (!isContentEditorRole(role)) return reply.status(403).send(CONTENT_EDITOR_FORBIDDEN);

    const jobs = await prisma.postJob.findMany({
      where: { id: { in: body.data.ids }, workspaceId },
      select: { id: true, status: true, approvalStatus: true, scheduledFor: true, content: true, targets: { select: { account: { select: { platform: true } } } } },
    });
    const byId = new Map(jobs.map((j) => [j.id, j]));
    const submit: string[] = [];
    const skipped: { id: string; title: string; reason: string; missing?: MissingField[] }[] = [];

    for (const id of body.data.ids) {
      const job = byId.get(id);
      if (!job) { skipped.push({ id, title: "Unknown post", reason: "Post not found" }); continue; }
      const title = readinessInput(job).title;
      if (job.status !== "draft") {
        skipped.push({ id, title, reason: "Not a draft" });
      } else if (job.approvalStatus === "pending") {
        skipped.push({ id, title, reason: "Already in review" });
      } else if (job.approvalStatus === "rejected") {
        skipped.push({ id, title, reason: "Sent back for changes: change it first" });
      } else {
        const missing = missingForReview(readinessInput(job));
        if (missing.length > 0) skipped.push({ id, title, reason: "Missing required fields", missing });
        else submit.push(id);
      }
    }

    if (submit.length > 0) {
      await prisma.postJob.updateMany({
        where: { id: { in: submit }, workspaceId, status: "draft" },
        data: { approvalStatus: "pending", reviewNote: null, reviewedByUserId: null, reviewedAt: null },
      });
    }
    return reply.send({ submitted: submit, skipped });
  });

  // Retry only the failed targets on a partially-failed job.
  // Tim Desain cannot retry (matrix US-16: Admin/Marketing); Marketing only retries own posts.
  app.post("/jobs/:id/retry-failed", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const workspaceId = getWorkspaceId(req);
    const { id } = req.params as { id: string };

    const role = await getWorkspaceRole(userId, workspaceId);
    if (!isContentEditorRole(role)) {
      return reply.status(403).send(CONTENT_EDITOR_FORBIDDEN);
    }
    const job = await prisma.postJob.findFirst({
      where: { id, workspaceId },
      include: { targets: { select: { id: true, status: true } } },
    });
    if (!job) return reply.status(404).send({ error: "Job not found" });
    if (role === "member" && job.userId !== userId) {
      return reply.status(403).send({ error: "You can only retry your own posts.", code: "FORBIDDEN" });
    }
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
    // Tim Desain is read-only on content (docs/role-access-matrix.md)
    if (!isContentEditorRole(role)) {
      return reply.status(403).send(CONTENT_EDITOR_FORBIDDEN);
    }
    if ((role !== "owner" && role !== "admin") && job.userId !== userId) {
      return reply.status(403).send({ error: "You can only delete your own posts.", code: "FORBIDDEN" });
    }

    // Delete media files from storage
    try {
      const content = JSON.parse(job.content) as { mediaUrls?: string[]; youtubeThumbnailUrl?: string };
      const urlsToDelete = await withoutTemplateMedia([
        ...(content.mediaUrls ?? []),
        ...(content.youtubeThumbnailUrl ? [content.youtubeThumbnailUrl] : []),
      ]);
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

  // DELETE /jobs/bulk — delete up to 500 jobs in one request
  app.delete("/jobs/bulk", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const workspaceId = getWorkspaceId(req);

    const parsed = z.object({
      ids: z.array(z.string().cuid()).min(1).max(500),
    }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const { ids } = parsed.data;

    // Fetch all jobs — verify ownership + skip running
    const jobs = await prisma.postJob.findMany({
      where: { id: { in: ids }, workspaceId },
      select: { id: true, status: true, content: true, userId: true },
    });

    const role = await getWorkspaceRole(userId, workspaceId);
    // Tim Desain is read-only on content (docs/role-access-matrix.md)
    if (!isContentEditorRole(role)) {
      return reply.status(403).send(CONTENT_EDITOR_FORBIDDEN);
    }
    const isAdmin = role === "owner" || role === "admin";

    const deletableIds: string[] = [];
    const mediaUrlsToDelete: string[] = [];

    for (const job of jobs) {
      if (job.status === "running") continue;
      if (!isAdmin && job.userId !== userId) continue;
      deletableIds.push(job.id);
      try {
        const content = JSON.parse(job.content) as { mediaUrls?: string[]; youtubeThumbnailUrl?: string };
        if (content.mediaUrls?.length) mediaUrlsToDelete.push(...content.mediaUrls);
        if (content.youtubeThumbnailUrl) mediaUrlsToDelete.push(content.youtubeThumbnailUrl);
      } catch { /* non-fatal */ }
    }

    if (!deletableIds.length) return reply.status(200).send({ deleted: 0 });

    // Remove pending jobs from queue in parallel
    const pendingIds = jobs.filter(j => j.status === "pending" && deletableIds.includes(j.id)).map(j => j.id);
    await Promise.allSettled(pendingIds.map(id => postJobQueue.remove(id)));

    // Delete media files (template designs stay)
    const ownMedia = await withoutTemplateMedia(mediaUrlsToDelete);
    if (ownMedia.length) {
      await Promise.allSettled(ownMedia.map(url => storage.delete(url)));
      await prisma.upload.deleteMany({ where: { url: { in: ownMedia } } });
    }

    // Bulk delete — targets cascade
    const { count } = await prisma.postJob.deleteMany({ where: { id: { in: deletableIds } } });

    return reply.status(200).send({ deleted: count });
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
        account: { select: { platform: true, credentials: true, expiresAt: true, warnedExpiryAt: true, createdAt: true, updatedAt: true, id: true, userId: true, workspaceId: true, displayName: true, avatarUrl: true, refreshToken: true } },
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
