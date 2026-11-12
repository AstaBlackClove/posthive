import type { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { getUser, getWorkspaceId, getWorkspaceRole, jobVisibilityWhere, withAuth } from "../lib/auth/withAuth.js";
import { STATUS_GROUPS } from "../lib/jobFilters.js";
import {
  LIST_LIMIT,
  dayWhere,
  isListKind,
  listWhere,
  monthOf,
  plainDraft,
  QUARTER_LIMIT,
  quarterCount,
  quarterOf,
  readyToSchedule,
  tasksWhere,
  toPost,
  wibKey,
  wibStart,
  type ListKind,
} from "../lib/dashboardData.js";

const POST_SELECT = {
  id: true,
  status: true,
  approvalStatus: true,
  scheduledFor: true,
  content: true,
  user: { select: { name: true } },
  targets: { select: { account: { select: { platform: true } } } },
} satisfies Prisma.PostJobSelect;

/** Statuses that count as "published or scheduled" in a channel's month. */
const LIVE = [...STATUS_GROUPS.pending, ...STATUS_GROUPS.done];
/** Most posts a day can list on the dashboard: a busy day, not a whole quarter. */
const TODAY_LIMIT = 50;

/** Soonest first, a draft with no date last; activity is the other way round: latest change first. */
const listOrder = (kind: ListKind): Prisma.PostJobOrderByWithRelationInput[] =>
  kind === "activity" ? [{ updatedAt: "desc" }, { id: "asc" }] : [{ scheduledFor: { sort: "asc", nulls: "last" } }, { id: "asc" }];

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  // One page of one tab of the content table: the rows /dashboard sends for page 1 (same filter, order and visibility),
  // so a page turn asks only for the page, not for the whole dashboard again. A page past the end answers the last one.
  app.get(
    "/dashboard/content",
    { preHandler: [withAuth], config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const { id: userId } = getUser(req);
      const workspaceId = getWorkspaceId(req);
      const query = req.query as { tab?: string; page?: string };
      const kind = query.tab;
      if (!isListKind(kind)) return reply.status(400).send({ error: "Unknown tab.", code: "INVALID_TAB" });

      const role = await getWorkspaceRole(userId, workspaceId);
      const base: Prisma.PostJobWhereInput = { workspaceId, AND: [jobVisibilityWhere(role, userId)] };
      const where = listWhere(base, kind, new Date());

      const count = await prisma.postJob.count({ where });
      const pageCount = Math.max(1, Math.ceil(count / LIST_LIMIT));
      const page = Math.min(Math.max(Math.trunc(Number(query.page)) || 1, 1), pageCount);
      const rows = await prisma.postJob.findMany({ where, orderBy: listOrder(kind), skip: (page - 1) * LIST_LIMIT, take: LIST_LIMIT, select: POST_SELECT });
      return reply.send({ count, page, pageCount, posts: rows.map(toPost) });
    },
  );

  // Everything the dashboard shows about this workspace, in one round trip. The role decides which
  // drafts are visible (the same rule as the Posts page), so a number here is a number there.
  app.get(
    "/dashboard",
    { preHandler: [withAuth], config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const { id: userId } = getUser(req);
      const workspaceId = getWorkspaceId(req);
      const role = await getWorkspaceRole(userId, workspaceId);

      const now = new Date();
      const today = wibKey(now);
      const quarter = quarterOf(today);
      const month = monthOf(today);
      const base: Prisma.PostJobWhereInput = { workspaceId, AND: [jobVisibilityWhere(role, userId)] };
      const inQuarter: Prisma.PostJobWhereInput = {
        AND: [base, { scheduledFor: { gte: wibStart(quarter.start), lt: wibStart(quarter.end) } }],
      };

      const list = (kind: ListKind) => ({
        findMany: () =>
          prisma.postJob.findMany({
            where: listWhere(base, kind, now),
            orderBy: listOrder(kind),
            take: LIST_LIMIT,
            select: POST_SELECT,
          }),
        count: () => prisma.postJob.count({ where: listWhere(base, kind, now) }),
      });
      const upcoming = list("upcoming");
      const attention = list("attention");
      const risk = list("risk");
      const activity = list("activity");

      const [
        inProduction,
        quarterByStatus,
        quarterRows,
        ready,
        upcomingRows, upcomingCount,
        attentionRows, attentionBy,
        riskRows, riskCount,
        activityRows, activityCount,
        todayRows, todayCount,
        taskRows, taskCount,
        accounts,
        monthTargets,
        imported,
        created,
        members,
        invites,
      ] = await Promise.all([
        prisma.postJob.groupBy({
          by: ["status", "approvalStatus"],
          where: { AND: [base, { status: { in: ["draft", ...STATUS_GROUPS.pending] } }] },
          _count: true,
        }),
        // The totals count every post of the quarter in the database: exact, and nothing is read. The milestones read
        // only the posts that name a category, or a plan row marked Published (the stored JSON is compact, so these
        // strings match): a plan, not the automatic drip posts, which can be thousands a quarter.
        prisma.postJob.groupBy({ by: ["status"], where: inQuarter, _count: true }),
        prisma.postJob.findMany({
          where: {
            AND: [
              inQuarter,
              { OR: [{ content: { contains: '"category":"' } }, { status: "draft", content: { contains: '"sourceStatus":"Published"', mode: "insensitive" } }] },
            ],
          },
          select: { status: true, content: true },
          take: QUARTER_LIMIT,
        }),
        prisma.postJob.count({ where: { AND: [base, readyToSchedule(now)] } }),
        upcoming.findMany(), upcoming.count(),
        attention.findMany(),
        // The total and what the posts are in one query: the browser says "2 publishes failed · 1 changes requested" from the pairs
        prisma.postJob.groupBy({ by: ["status", "approvalStatus"], where: listWhere(base, "attention", now), _count: true }),
        risk.findMany(), risk.count(),
        activity.findMany(), activity.count(),
        prisma.postJob.findMany({
          where: dayWhere(base, today),
          orderBy: [{ scheduledFor: "asc" }, { id: "asc" }],
          take: TODAY_LIMIT,
          select: POST_SELECT,
        }),
        prisma.postJob.count({ where: dayWhere(base, today) }),
        prisma.postJob.findMany({
          where: tasksWhere(base, userId, today),
          orderBy: [{ scheduledFor: "asc" }, { id: "asc" }],
          take: TODAY_LIMIT,
          select: POST_SELECT,
        }),
        prisma.postJob.count({ where: tasksWhere(base, userId, today) }),
        prisma.account.findMany({
          where: { workspaceId },
          select: { id: true, platform: true, displayName: true },
          orderBy: { createdAt: "asc" },
          take: 200,
        }),
        prisma.postJobTarget.groupBy({
          by: ["accountId"],
          where: {
            account: { workspaceId },
            postJob: { status: { in: LIVE }, scheduledFor: { gte: wibStart(month.start), lt: wibStart(month.end) } },
          },
          _count: { accountId: true },
        }),
        prisma.postJob.findFirst({ where: { workspaceId, importKey: { not: null } }, select: { id: true } }),
        prisma.postJob.findFirst({ where: { workspaceId, importKey: null }, select: { id: true } }),
        prisma.workspaceMember.count({ where: { workspaceId } }),
        prisma.workspaceInvite.count({ where: { workspaceId, acceptedAt: null, expiresAt: { gt: now } } }),
      ]);

      // Channels: one entry per platform with an account, its first account's name, and the month's posts
      const platformOf = new Map(accounts.map((a) => [a.id, a.platform]));
      const monthPosts = new Map<string, number>();
      for (const t of monthTargets) {
        const platform = platformOf.get(t.accountId);
        if (platform) monthPosts.set(platform, (monthPosts.get(platform) ?? 0) + t._count.accountId);
      }
      const channels: { platform: string; accounts: number; handle: string; posts: number }[] = [];
      for (const a of accounts) {
        const seen = channels.find((c) => c.platform === a.platform);
        if (seen) seen.accounts += 1;
        else channels.push({ platform: a.platform, accounts: 1, handle: a.displayName, posts: monthPosts.get(a.platform) ?? 0 });
      }

      const pairs = (groups: { status: string; approvalStatus: string | null; _count: number }[]) =>
        groups.map((r) => ({ status: r.status, approvalStatus: r.approvalStatus, count: r._count }));
      const attentionCount = attentionBy.reduce((sum, g) => sum + g._count, 0);

      return reply.send({
        quarter: { label: quarter.label, ...quarterCount(quarterByStatus, quarterRows) },
        inProduction: pairs(inProduction),
        readyToSchedule: ready,
        needAttention: attentionCount,
        needAttentionBy: pairs(attentionBy),
        todayPosts: { count: todayCount, posts: todayRows.map(toPost) },
        myTasks: { count: taskCount, posts: taskRows.map(toPost) },
        lists: {
          upcoming: { count: upcomingCount, posts: upcomingRows.map(toPost) },
          attention: { count: attentionCount, posts: attentionRows.map(toPost) },
          risk: { count: riskCount, posts: riskRows.map(toPost) },
          activity: { count: activityCount, posts: activityRows.map(toPost) },
        },
        channels,
        setup: {
          imported: imported !== null,
          created: created !== null,
          accounts: accounts.length,
          members,
          invites,
        },
      });
    },
  );
}
