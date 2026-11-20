import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { withAuth, getUser, getWorkspaceId } from "../lib/auth/withAuth.js";

const PUBLISHED_STATUSES = Prisma.join(["done", "post_done", "comment_done"]);

const analyticsCache = new Map<string, { data: unknown; expiresAt: number }>();

const VALID_DAYS = new Set([7, 30, 90]);

// 6 buckets for the "when your videos do best" heatmap — matches the common
// posting-time groupings a creator actually thinks in, not even 4h slices.
// [startHour, endHourExclusive) in the viewer's... we don't have per-user
// timezone here, so this runs in UTC. Documented on the frontend.
const HEATMAP_BUCKETS: Array<{ label: string; start: number; end: number }> = [
  { label: "6-9a", start: 6, end: 9 },
  { label: "9-12", start: 9, end: 12 },
  { label: "12-3p", start: 12, end: 15 },
  { label: "3-6p", start: 15, end: 18 },
  { label: "6-9p", start: 18, end: 21 },
  { label: "9p-6a", start: 21, end: 6 }, // wraps past midnight
];

function bucketForHour(hour: number): number {
  for (let i = 0; i < HEATMAP_BUCKETS.length - 1; i++) {
    const b = HEATMAP_BUCKETS[i];
    if (hour >= b.start && hour < b.end) return i;
  }
  return HEATMAP_BUCKETS.length - 1; // overnight wrap bucket
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

type TotalsRow = {
  targetId: string;
  jobId: string;
  scheduledFor: Date | null;
  platform: string;
  displayName: string;
  text: string;
  likes: number; reposts: number; replies: number; saves: number; views: number | null;
  fetchedAt: Date;
};

const STATS_ROW_CAP = 1000;

async function fetchStatsRows(workspaceId: string, from: Date, to: Date): Promise<{ rows: TotalsRow[]; truncated: boolean }> {
  const jobs = await prisma.postJob.findMany({
    where: {
      workspaceId,
      scheduledFor: { gte: from, lt: to },
      targets: {
        some: {
          status: { in: ["done", "post_done", "comment_done"] },
          platformPostId: { not: null },
          stats: { isNot: null },
        },
      },
    },
    orderBy: { scheduledFor: "desc" },
    take: STATS_ROW_CAP,
    select: {
      id: true,
      scheduledFor: true,
      content: true,
      targets: {
        where: {
          status: { in: ["done", "post_done", "comment_done"] },
          platformPostId: { not: null },
          stats: { isNot: null },
        },
        select: {
          id: true,
          account: { select: { platform: true, displayName: true } },
          stats: { select: { likes: true, reposts: true, replies: true, saves: true, views: true, fetchedAt: true } },
        },
      },
    },
  });

  const rows: TotalsRow[] = [];
  for (const j of jobs) {
    let text = "";
    try { text = (JSON.parse(j.content) as { text?: string }).text ?? ""; } catch { /* */ }
    for (const t of j.targets) {
      if (!t.stats) continue;
      rows.push({
        targetId: t.id,
        jobId: j.id,
        scheduledFor: j.scheduledFor,
        platform: t.account?.platform ?? "",
        displayName: t.account?.displayName ?? "",
        text,
        likes: t.stats.likes, reposts: t.stats.reposts, replies: t.stats.replies,
        saves: t.stats.saves, views: t.stats.views,
        fetchedAt: t.stats.fetchedAt,
      });
    }
  }
  return { rows, truncated: jobs.length === STATS_ROW_CAP };
}

function sumTotals(rows: TotalsRow[]) {
  let likes = 0, reposts = 0, replies = 0, saves = 0, views = 0;
  for (const r of rows) {
    likes += r.likes; reposts += r.reposts; replies += r.replies; saves += r.saves;
    if (r.views != null) views += r.views;
  }
  const engagement = likes + reposts + replies + saves;
  const engagementRate = views > 0 ? (engagement / views) * 100 : 0;
  return { likes, reposts, replies, saves, views, engagementRate };
}

export async function analyticsRoutes(app: FastifyInstance): Promise<void> {

  // GET /analytics?days=7|30|90 — aggregated stats from DB cache (no live platform calls)
  app.get("/analytics", { preHandler: [withAuth] }, async (req, reply) => {
    void getUser(req); // auth verified via preHandler
    const workspaceId = getWorkspaceId(req);
    const query = req.query as { days?: string };
    const days = VALID_DAYS.has(Number(query.days)) ? Number(query.days) : 30;

    const cacheKey = `${workspaceId}:${days}`;
    const cached = analyticsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return reply.send(cached.data);

    const now = new Date();
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const prevFrom = new Date(from.getTime() - days * 24 * 60 * 60 * 1000);

    const [current, previous, publishedCount, accountsPosted] = await Promise.all([
      fetchStatsRows(workspaceId, from, now),
      fetchStatsRows(workspaceId, prevFrom, from),
      // "Posts published" and "Accounts" must not depend on stats having synced yet
      // (stats sync runs every 6h) — count real publish activity directly.
      prisma.postJobTarget.count({
        where: {
          status: { in: ["done", "post_done", "comment_done"] },
          postJob: { workspaceId, scheduledFor: { gte: from, lt: now } },
        },
      }),
      prisma.postJobTarget.findMany({
        where: {
          status: { in: ["done", "post_done", "comment_done"] },
          postJob: { workspaceId, scheduledFor: { gte: from, lt: now } },
        },
        select: { accountId: true },
        distinct: ["accountId"],
      }),
    ]);

    const rows = current.rows;
    const totals = sumTotals(current.rows);
    const prevTotals = sumTotals(previous.rows);

    // Group rows into per-post groups (one row per target, grouped by jobId) for the "every video" tab
    const postMap = new Map<string, { jobId: string; scheduledFor: string | null; text: string; targets: TotalsRow[] }>();
    for (const r of rows) {
      if (!postMap.has(r.jobId)) postMap.set(r.jobId, { jobId: r.jobId, scheduledFor: r.scheduledFor?.toISOString() ?? null, text: r.text, targets: [] });
      postMap.get(r.jobId)!.targets.push(r);
    }
    const posts = Array.from(postMap.values()).map((p) => ({
      jobId: p.jobId,
      scheduledFor: p.scheduledFor,
      text: p.text,
      targets: p.targets.map((t) => ({
        targetId: t.targetId, platform: t.platform, displayName: t.displayName,
        likes: t.likes, reposts: t.reposts, replies: t.replies, saves: t.saves, views: t.views,
        fetchedAt: t.fetchedAt.toISOString(),
      })),
    }));

    // Median view count across targets that have a view number — "1.0x = median video"
    const viewNums = rows.map((r) => r.views).filter((v): v is number => v != null);
    const medianViews = median(viewNums);

    // Daily timeseries for the Metrics tab chart
    const dayMap = new Map<string, { date: string; views: number; likes: number; replies: number; reposts: number; postsPublished: number }>();
    for (const r of rows) {
      if (!r.scheduledFor) continue;
      const key = r.scheduledFor.toISOString().slice(0, 10);
      if (!dayMap.has(key)) dayMap.set(key, { date: key, views: 0, likes: 0, replies: 0, reposts: 0, postsPublished: 0 });
      const d = dayMap.get(key)!;
      d.views += r.views ?? 0; d.likes += r.likes; d.replies += r.replies; d.reposts += r.reposts;
    }
    // Count posts-published per day separately (independent of stats sync), for the bar overlay.
    // Grouped in the database, not pulled row-by-row into Node — a heavy account can publish
    // 1,000+ targets a day, so fetching every row here would mean 100k+ rows for a 90-day range
    // just to produce ~90 day-buckets.
    const dailyPublishCounts = await prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT date_trunc('day', pj."scheduledFor") as day, COUNT(*)::bigint as count
      FROM "PostJobTarget" pjt
      JOIN "PostJob" pj ON pj.id = pjt."postJobId"
      WHERE pj."workspaceId" = ${workspaceId}
        AND pj."scheduledFor" >= ${from}
        AND pj."scheduledFor" < ${now}
        AND pjt.status IN (${PUBLISHED_STATUSES})
      GROUP BY day
    `;
    for (const r of dailyPublishCounts) {
      const key = r.day.toISOString().slice(0, 10);
      if (!dayMap.has(key)) dayMap.set(key, { date: key, views: 0, likes: 0, replies: 0, reposts: 0, postsPublished: 0 });
      dayMap.get(key)!.postsPublished += Number(r.count);
    }
    const timeseries = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // By-platform breakdown — share of total views + how many posts' best platform was this one
    const platformViews = new Map<string, number>();
    for (const r of rows) platformViews.set(r.platform, (platformViews.get(r.platform) ?? 0) + (r.views ?? 0));
    const bestPlatformCount = new Map<string, number>();
    for (const p of posts) {
      let bestPlatform: string | null = null, bestViews = -1;
      for (const t of p.targets) {
        if ((t.views ?? 0) > bestViews) { bestViews = t.views ?? 0; bestPlatform = t.platform; }
      }
      if (bestPlatform) bestPlatformCount.set(bestPlatform, (bestPlatformCount.get(bestPlatform) ?? 0) + 1);
    }
    const totalPlatformViews = Array.from(platformViews.values()).reduce((s, v) => s + v, 0);
    const byPlatform = Array.from(platformViews.entries())
      .map(([platform, views]) => ({
        platform, views,
        pct: totalPlatformViews > 0 ? (views / totalPlatformViews) * 100 : 0,
        bestCount: bestPlatformCount.get(platform) ?? 0,
      }))
      .sort((a, b) => b.views - a.views);

    // Heatmap — day of week (0=Mon..6=Sun) x time bucket, relative to the account's own average
    const heatmapSum = new Map<string, { total: number; count: number }>();
    for (const r of rows) {
      if (!r.scheduledFor || r.views == null) continue;
      const jsDay = r.scheduledFor.getUTCDay(); // 0=Sun..6=Sat
      const day = (jsDay + 6) % 7; // convert to 0=Mon..6=Sun
      const bucket = bucketForHour(r.scheduledFor.getUTCHours());
      const key = `${day}:${bucket}`;
      const cur = heatmapSum.get(key) ?? { total: 0, count: 0 };
      cur.total += r.views; cur.count += 1;
      heatmapSum.set(key, cur);
    }
    const overallAvgViews = viewNums.length ? viewNums.reduce((s, v) => s + v, 0) / viewNums.length : 0;
    const heatmap = Array.from(heatmapSum.entries()).map(([key, v]) => {
      const [day, bucket] = key.split(":").map(Number);
      return {
        dayOfWeek: day, bucket, bucketLabel: HEATMAP_BUCKETS[bucket].label,
        avgViews: v.total / v.count,
        multiplier: overallAvgViews > 0 ? (v.total / v.count) / overallAvgViews : 0,
        count: v.count,
      };
    });

    const result = {
      range: { days, from: from.toISOString(), to: now.toISOString() },
      // When true, the engagement-based numbers (likes/views/replies/reposts/saves,
      // the Metrics chart, Every-video table, and Insights tab) only reflect the most
      // recent STATS_ROW_CAP targets in this range, not the full window — postsPublished
      // and accountsPosted are unaffected, those come from a direct count/distinct query.
      truncated: current.truncated,
      totals: {
        ...totals,
        postsPublished: publishedCount,
        accountsPosted: accountsPosted.length,
      },
      previousTotals: {
        ...prevTotals,
      },
      medianViews,
      timeseries,
      byPlatform,
      heatmap,
      heatmapBuckets: HEATMAP_BUCKETS.map((b) => b.label),
      posts,
      lastSyncedAt: rows[0]?.fetchedAt.toISOString() ?? null,
    };

    analyticsCache.set(cacheKey, { data: result, expiresAt: Date.now() + 5 * 60_000 });
    return reply.send(result);
  });
}
