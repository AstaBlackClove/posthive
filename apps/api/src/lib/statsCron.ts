/**
 * Stats sync cron — runs every 6 hours.
 *
 * Fetches engagement stats (likes, reposts, replies) for all published
 * PostJobTargets on supported platforms within the last 90 days, then
 * upserts results into the PostStats table.
 *
 * Platforms supported in Phase 1: bluesky, mastodon, pixelfed.
 * Each adapter must implement getAnalytics().
 */

import { prisma } from "./prisma.js";
import { adapters } from "../adapters/index.js";

const SUPPORTED = new Set(["bluesky", "mastodon", "pixelfed"]);
const INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const RECENCY_MS  = 5 * 60 * 60 * 1000; // skip targets synced within 5h
const BATCH = 5;                          // concurrent platform API calls
const BATCH_DELAY_MS = 300;              // pause between batches (rate-limit headroom)

let isRunning = false; // prevents overlapping runs when a run takes longer than INTERVAL_MS

export function startStatsCron(): void {
  async function run() {
    if (isRunning) {
      console.log("[stats-cron] previous run still in progress, skipping tick");
      return;
    }
    isRunning = true;

    try {
      const postCutoff   = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const recentCutoff = new Date(Date.now() - RECENCY_MS);

      // Only fetch targets whose stats are stale (never synced, or synced >5h ago).
      // This means a server restart won't re-hammer everything that was just synced.
      const targets = await prisma.postJobTarget.findMany({
        where: {
          status: { in: ["done", "post_done", "comment_done"] },
          platformPostId: { not: null },
          account: { platform: { in: Array.from(SUPPORTED) } },
          postJob: { scheduledFor: { gte: postCutoff } },
          OR: [
            { stats: null },                                    // never synced
            { stats: { fetchedAt: { lt: recentCutoff } } },    // synced >5h ago
          ],
        },
        select: {
          id: true,
          platformPostId: true,
          account: {
            select: {
              id: true, platform: true, displayName: true,
              credentials: true, refreshToken: true, expiresAt: true,
            },
          },
        },
      });

      if (!targets.length) {
        console.log("[stats-cron] nothing stale to sync");
        return;
      }

      console.log(`[stats-cron] syncing ${targets.length} stale target(s)`);
      let ok = 0, fail = 0;

      for (let i = 0; i < targets.length; i += BATCH) {
        await Promise.allSettled(
          targets.slice(i, i + BATCH).map(async (t) => {
            const adapter = adapters.find((a) => a.name === t.account!.platform);
            if (!adapter?.getAnalytics) return;

            try {
              const stats = await adapter.getAnalytics(t.account as Parameters<typeof adapter.getAnalytics>[0], t.platformPostId!);
              await prisma.postStats.upsert({
                where: { targetId: t.id },
                create: {
                  targetId: t.id,
                  likes: stats.likes ?? 0,
                  reposts: stats.reposts ?? 0,
                  replies: stats.replies ?? 0,
                  views: stats.views ?? null,
                  fetchedAt: new Date(stats.fetchedAt),
                },
                update: {
                  likes: stats.likes ?? 0,
                  reposts: stats.reposts ?? 0,
                  replies: stats.replies ?? 0,
                  views: stats.views ?? null,
                  fetchedAt: new Date(stats.fetchedAt),
                },
              });
              ok++;
            } catch (e) {
              fail++;
              console.warn(`[stats-cron] target ${t.id} failed:`, (e as Error).message);
            }
          })
        );

        // Brief pause between batches to stay well under platform rate limits
        if (i + BATCH < targets.length) {
          await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
        }
      }

      console.log(`[stats-cron] done — ${ok} synced, ${fail} failed`);
    } finally {
      isRunning = false;
    }
  }

  // Run once at startup (catches stale targets from before restart), then every 6h.
  // Recency filter ensures recently-synced targets are skipped even on immediate restart.
  run().catch((e) => console.error("[stats-cron] startup run failed:", e));
  setInterval(() => run().catch((e) => console.error("[stats-cron] error:", e)), INTERVAL_MS);

  console.log("[stats-cron] started — syncing every 6h");
}
