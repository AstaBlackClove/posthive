import type { FastifyInstance } from "fastify";
import { z } from "zod";
import Parser from "rss-parser";
import * as Sentry from "@sentry/node";
import { prisma } from "../lib/prisma.js";
import { withAuth, getUser, getWorkspaceId } from "../lib/auth/withAuth.js";
import { getPlan } from "../lib/plans.js";
import { enforcePlan } from "../lib/enforcePlan.js";
import { checkTextLimits, formatTextLimitError } from "../lib/platformLimits.js";
import { isSsrfBlocked } from "../lib/ssrf.js";
import { runRssCronNow } from "../lib/rssCron.js";

const rssParser = new Parser();

const MAX_CSV_ROWS = 500;
const MAX_TEXT_LENGTH = 5000;

// Validate time slot format "HH:MM"
const timeSlotSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time slot must be HH:MM format");

const libraryCreateSchema = z.object({
  name: z.string().min(1).max(100),
  postsPerDay: z.number().int().min(1).max(50),
  timeSlots: z.array(timeSlotSchema).min(1).max(50),
  timezone: z.string().min(1).max(100).default("UTC"),
  accountIds: z.array(z.string().cuid()).min(1).max(100),
  sourceType: z.enum(["csv", "rss"]).default("csv"),
  rssUrl: z.string().url().max(2000).optional(),
  aiSummarize: z.boolean().default(false),
}).refine((d) => d.sourceType !== "rss" || !!d.rssUrl, {
  message: "rssUrl is required when sourceType is rss",
  path: ["rssUrl"],
});

const libraryUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(["active", "paused"]).optional(),
  postsPerDay: z.number().int().min(1).max(50).optional(),
  timeSlots: z.array(timeSlotSchema).min(1).max(50).optional(),
  timezone: z.string().min(1).max(100).optional(),
  accountIds: z.array(z.string().cuid()).min(1).max(100).optional(),
  rssUrl: z.string().url().max(2000).optional(),
  aiSummarize: z.boolean().optional(),
});

// CSV item schema — one row from the uploaded CSV
const csvItemSchema = z.object({
  text: z.string().min(1).max(MAX_TEXT_LENGTH),
  commentText: z.string().max(MAX_TEXT_LENGTH).optional(),
  mediaUrls: z.array(z.string().url()).max(10).default([]),
});

async function getWorkspacePlan(workspaceId: string) {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { plan: true, planStatus: true, trialEndsAt: true, customMaxLibraries: true, customMaxDripPerDay: true, customMaxLibraryItems: true },
  });
  if (!ws) return null;
  const basePlan = getPlan(ws.plan);
  // Apply per-workspace overrides if set
  const plan = {
    ...basePlan,
    maxLibraries: ws.customMaxLibraries ?? basePlan.maxLibraries,
    maxDripPerDay: ws.customMaxDripPerDay ?? basePlan.maxDripPerDay,
    maxLibraryItems: ws.customMaxLibraryItems ?? basePlan.maxLibraryItems,
  };
  return { ws, plan };
}

export async function libraryRoutes(app: FastifyInstance): Promise<void> {

  // POST /library/validate-rss — check a feed URL is reachable and parseable before saving it
  app.post("/library/validate-rss", {
    preHandler: [withAuth],
    config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
  }, async (req, reply) => {
    const { url } = (req.body as { url?: string }) ?? {};
    if (!url) return reply.status(400).send({ error: "url is required" });
    if (isSsrfBlocked(url)) return reply.status(400).send({ error: "Feed URL is not reachable or not allowed." });

    try {
      const feed = await rssParser.parseURL(url);
      return reply.send({ valid: true, title: feed.title ?? null, itemCount: feed.items?.length ?? 0 });
    } catch {
      return reply.status(400).send({ valid: false, error: "Could not read this feed. Check the URL and try again." });
    }
  });

  // GET /library — list all libraries for workspace
  app.get("/library", { preHandler: [withAuth] }, async (req, reply) => {
    const workspaceId = getWorkspaceId(req);
    const libraries = await prisma.contentLibrary.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { items: true } },
      },
    });
    // Single grouped query for all libraries — avoids N+1
    const libraryIds = libraries.map((l) => l.id);
    const [allCounts, planData] = await Promise.all([
      libraryIds.length > 0
        ? prisma.libraryItem.groupBy({
            by: ["libraryId", "status"],
            where: { libraryId: { in: libraryIds } },
            _count: true,
          })
        : Promise.resolve([]),
      process.env.ENABLE_BILLING === "true" ? getWorkspacePlan(workspaceId) : Promise.resolve(null),
    ]);

    const plan = planData?.plan ?? null;

    // Build per-library status count map in JS
    const countsByLibrary = new Map<string, Record<string, number>>();
    for (const row of allCounts) {
      const map = countsByLibrary.get(row.libraryId) ?? {};
      map[row.status] = row._count;
      countsByLibrary.set(row.libraryId, map);
    }

    const result = libraries.map((lib) => ({
      ...lib,
      statusCounts: countsByLibrary.get(lib.id) ?? {},
    }));
    return reply.send({
      libraries: result,
      planLimits: {
        maxDripPerDay: plan ? plan.maxDripPerDay : 50,
        maxLibraries: plan ? plan.maxLibraries : 999,
        maxLibraryItems: plan ? plan.maxLibraryItems : 999999,
      },
    });
  });

  // POST /library — create a new library
  app.post("/library", { preHandler: [withAuth] }, async (req, reply) => {
    const workspaceId = getWorkspaceId(req);
    const { id: userId } = getUser(req);

    const parsed = libraryCreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const { name, postsPerDay, timeSlots, timezone, accountIds, sourceType, rssUrl, aiSummarize } = parsed.data;

    if (sourceType === "rss" && rssUrl && isSsrfBlocked(rssUrl)) {
      return reply.status(400).send({ error: "Feed URL is not reachable or not allowed." });
    }

    // Plan gate (skipped when billing is disabled — self-hosted mode)
    let maxDripPerDay = postsPerDay; // uncapped in self-hosted
    if (process.env.ENABLE_BILLING === "true") {
      const planErr = await enforcePlan(userId, workspaceId, "libraries");
      if (planErr) return reply.status(402).send(planErr);

      const planData = await getWorkspacePlan(workspaceId);
      if (!planData) return reply.status(400).send({ error: "Workspace not found" });
      maxDripPerDay = planData.plan.maxDripPerDay;
    }

    // Validate accountIds belong to workspace
    const validAccounts = await prisma.account.findMany({
      where: { id: { in: accountIds }, workspaceId },
      select: { id: true },
    });
    if (validAccounts.length !== accountIds.length) {
      return reply.status(400).send({ error: "One or more account IDs are invalid or not in this workspace." });
    }

    const safePosts = Math.min(postsPerDay, maxDripPerDay);

    try {
      const library = await prisma.contentLibrary.create({
        data: {
          workspaceId,
          name,
          postsPerDay: safePosts,
          timeSlots: timeSlots as unknown as string[],
          timezone,
          accountIds: accountIds as unknown as string[],
          status: "active",
          sourceType,
          rssUrl: sourceType === "rss" ? rssUrl : null,
          aiSummarize,
        },
      });
      void userId;
      if (sourceType === "rss") {
        // Kick off a first poll so the library doesn't sit empty for up to 20 min.
        runRssCronNow().catch((err) => console.error("[library] initial rss poll failed:", err));
      }
      return reply.status(201).send(library);
    } catch (err) {
      Sentry.captureException(err, { tags: { route: "POST /library", workspaceId } });
      throw err;
    }
  });

  // GET /library/:id
  app.get("/library/:id", { preHandler: [withAuth] }, async (req, reply) => {
    const workspaceId = getWorkspaceId(req);
    const { id } = req.params as { id: string };
    const library = await prisma.contentLibrary.findFirst({
      where: { id, workspaceId },
      include: { _count: { select: { items: true } } },
    });
    if (!library) return reply.status(404).send({ error: "Library not found" });
    return reply.send(library);
  });

  // PATCH /library/:id — update settings
  app.patch("/library/:id", { preHandler: [withAuth] }, async (req, reply) => {
    const workspaceId = getWorkspaceId(req);
    const { id } = req.params as { id: string };

    const parsed = libraryUpdateSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const library = await prisma.contentLibrary.findFirst({ where: { id, workspaceId } });
    if (!library) return reply.status(404).send({ error: "Library not found" });

    // Cap postsPerDay to plan limit if being updated (no cap in self-hosted mode)
    let safeData = { ...parsed.data };
    if (safeData.postsPerDay !== undefined && process.env.ENABLE_BILLING === "true") {
      const planData = await getWorkspacePlan(workspaceId);
      if (planData) safeData.postsPerDay = Math.min(safeData.postsPerDay, planData.plan.maxDripPerDay);
    }

    // Validate new accountIds if provided
    if (safeData.accountIds) {
      const validAccounts = await prisma.account.findMany({
        where: { id: { in: safeData.accountIds }, workspaceId },
        select: { id: true },
      });
      if (validAccounts.length !== safeData.accountIds.length) {
        return reply.status(400).send({ error: "One or more account IDs are invalid." });
      }
    }

    if (safeData.rssUrl !== undefined) {
      if (library.sourceType !== "rss") return reply.status(400).send({ error: "rssUrl only applies to RSS libraries." });
      if (isSsrfBlocked(safeData.rssUrl)) return reply.status(400).send({ error: "Feed URL is not reachable or not allowed." });
    }

    try {
      const updated = await prisma.contentLibrary.update({
        where: { id },
        data: {
          ...(safeData.name !== undefined ? { name: safeData.name } : {}),
          ...(safeData.status !== undefined ? { status: safeData.status } : {}),
          ...(safeData.postsPerDay !== undefined ? { postsPerDay: safeData.postsPerDay } : {}),
          ...(safeData.timeSlots !== undefined ? { timeSlots: safeData.timeSlots as unknown as string[] } : {}),
          ...(safeData.timezone !== undefined ? { timezone: safeData.timezone } : {}),
          ...(safeData.accountIds !== undefined ? { accountIds: safeData.accountIds as unknown as string[] } : {}),
          ...(safeData.rssUrl !== undefined ? { rssUrl: safeData.rssUrl } : {}),
          ...(safeData.aiSummarize !== undefined ? { aiSummarize: safeData.aiSummarize } : {}),
        },
      });
      return reply.send(updated);
    } catch (err) {
      Sentry.captureException(err, { tags: { route: "PATCH /library/:id", workspaceId, libraryId: id } });
      throw err;
    }
  });

  // DELETE /library/:id
  app.delete("/library/:id", { preHandler: [withAuth] }, async (req, reply) => {
    const workspaceId = getWorkspaceId(req);
    const { id } = req.params as { id: string };
    const library = await prisma.contentLibrary.findFirst({ where: { id, workspaceId } });
    if (!library) return reply.status(404).send({ error: "Library not found" });
    try {
      await prisma.contentLibrary.delete({ where: { id } }); // cascades to LibraryItem
      return reply.status(204).send();
    } catch (err) {
      Sentry.captureException(err, { tags: { route: "DELETE /library/:id", workspaceId, libraryId: id } });
      throw err;
    }
  });

  // GET /library/:id/items — paginated
  app.get("/library/:id/items", { preHandler: [withAuth] }, async (req, reply) => {
    const workspaceId = getWorkspaceId(req);
    const { id } = req.params as { id: string };
    const query = req.query as { cursor?: string; limit?: string; status?: string };

    const library = await prisma.contentLibrary.findFirst({ where: { id, workspaceId }, select: { id: true } });
    if (!library) return reply.status(404).send({ error: "Library not found" });

    const limit = Math.min(Number(query.limit ?? 50), 100);
    const cursor = query.cursor ?? undefined;
    const statusFilter = query.status;

    const items = await prisma.libraryItem.findMany({
      where: {
        libraryId: id,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      orderBy: { order: "asc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    return reply.send({ items: page, nextCursor: hasMore ? page[page.length - 1].id : null, hasMore });
  });

  // POST /library/:id/items — add items from CSV payload
  // Expects { items: [{ text, commentText?, mediaUrls? }] }
  app.post("/library/:id/items", { preHandler: [withAuth] }, async (req, reply) => {
    const workspaceId = getWorkspaceId(req);
    const { id: userId } = getUser(req);
    const { id } = req.params as { id: string };

    const library = await prisma.contentLibrary.findFirst({ where: { id, workspaceId }, select: { id: true, accountIds: true } });
    if (!library) return reply.status(404).send({ error: "Library not found" });

    const parsed = z.object({
      items: z.array(csvItemSchema).min(1).max(MAX_CSV_ROWS),
    }).safeParse(req.body);

    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const { items } = parsed.data;

    // Every item in a library posts to the same linked accounts — check text/comment
    // length against each linked platform's limit before accepting the CSV.
    const libraryAccountIds = library.accountIds as unknown as string[];
    const linkedAccounts = await prisma.account.findMany({
      where: { id: { in: libraryAccountIds } },
      select: { platform: true },
    });
    const linkedPlatforms = [...new Set(linkedAccounts.map((a) => a.platform))];
    const textLimitErrors: string[] = [];
    items.forEach((item, i) => {
      const violations = checkTextLimits(linkedPlatforms.map((platform) => ({
        platform, text: item.text, commentText: item.commentText,
      })));
      if (violations.length) textLimitErrors.push(`Row ${i + 1}: ${formatTextLimitError(violations)}`);
    });
    if (textLimitErrors.length) {
      return reply.status(400).send({ error: textLimitErrors.slice(0, 10).join(" | ") + (textLimitErrors.length > 10 ? ` (+${textLimitErrors.length - 10} more)` : ""), code: "TEXT_LIMIT" });
    }

    // Plan: check subscription status + total items limit (skipped in self-hosted mode)
    if (process.env.ENABLE_BILLING === "true") {
      const planErr = await enforcePlan(userId, workspaceId, "libraryItems");
      if (planErr) return reply.status(429).send(planErr);

      const planData = await getWorkspacePlan(workspaceId);
      if (!planData) return reply.status(400).send({ error: "Workspace not found" });
      const { plan } = planData;

      const currentCount = await prisma.libraryItem.count({ where: { workspaceId } });
      if (currentCount + items.length > plan.maxLibraryItems) {
        const remaining = plan.maxLibraryItems - currentCount;
        return reply.status(429).send({
          error: `This upload would exceed your library item limit. You can add ${remaining.toLocaleString()} more item${remaining === 1 ? "" : "s"} (plan limit: ${plan.maxLibraryItems.toLocaleString()}).`,
          code: "ITEM_LIMIT",
          upgradeRequired: true,
        });
      }
    }

    // Get current max order to append after existing items
    const maxOrderResult = await prisma.libraryItem.aggregate({
      where: { libraryId: id },
      _max: { order: true },
    });
    const startOrder = (maxOrderResult._max.order ?? -1) + 1;

    // Batch insert
    const BATCH = 100;
    let created = 0;
    try {
      for (let i = 0; i < items.length; i += BATCH) {
        const chunk = items.slice(i, i + BATCH);
        await prisma.libraryItem.createMany({
          data: chunk.map((item, idx) => ({
            libraryId: id,
            workspaceId,
            text: item.text,
            commentText: item.commentText ?? null,
            mediaUrls: (item.mediaUrls ?? []) as unknown as string[],
            order: startOrder + i + idx,
            status: "queued",
          })),
        });
        created += chunk.length;
      }
    } catch (err) {
      Sentry.captureException(err, { tags: { route: "POST /library/:id/items", workspaceId, libraryId: id }, extra: { itemCount: items.length, createdSoFar: created } });
      throw err;
    }

    // Mark uploaded files as claimed so the orphan cron leaves them alone — same as job
    // creation elsewhere. Needed here specifically: a library item can sit queued for days
    // or weeks before dripCron ever turns it into a PostJob (that's the point of a content
    // library), but the orphan cron deletes any unclaimed upload after just 24h — so any
    // self-hosted image referenced here would die long before drip ever got to use it.
    try {
      const allMediaUrls = items.flatMap((item) => item.mediaUrls ?? []);
      for (let i = 0; i < allMediaUrls.length; i += BATCH) {
        const urlChunk = allMediaUrls.slice(i, i + BATCH);
        await prisma.upload.updateMany({
          where: { url: { in: urlChunk } },
          data: { claimedAt: new Date() },
        });
      }
    } catch (err) {
      console.warn(`[library] failed to mark media claimed for library ${id}:`, err);
    }

    // If library was marked exhausted before items were uploaded, reactivate it
    await prisma.contentLibrary.updateMany({
      where: { id, status: "exhausted" },
      data: { status: "active" },
    });

    return reply.status(201).send({ created });
  });

  // DELETE /library/:id/items — delete specific items by IDs
  app.delete("/library/:id/items", { preHandler: [withAuth] }, async (req, reply) => {
    const workspaceId = getWorkspaceId(req);
    const { id } = req.params as { id: string };

    const parsed = z.object({
      itemIds: z.array(z.string().cuid()).min(1).max(500),
    }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const library = await prisma.contentLibrary.findFirst({ where: { id, workspaceId }, select: { id: true } });
    if (!library) return reply.status(404).send({ error: "Library not found" });

    try {
      const { count } = await prisma.libraryItem.deleteMany({
        where: { id: { in: parsed.data.itemIds }, libraryId: id, status: { in: ["queued", "failed", "skipped"] } },
      });
      return reply.send({ deleted: count });
    } catch (err) {
      Sentry.captureException(err, { tags: { route: "DELETE /library/:id/items", workspaceId, libraryId: id } });
      throw err;
    }
  });
}
