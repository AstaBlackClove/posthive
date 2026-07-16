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
const BATCH = 5; // concurrent platform API calls

export function startStatsCron(): void {
  async function run() {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const targets = await prisma.postJobTarget.findMany({
      where: {
        status: { in: ["done", "post_done", "comment_done"] },
        platformPostId: { not: null },
        account: { platform: { in: Array.from(SUPPORTED) } },
        postJob: { scheduledFor: { gte: cutoff } },
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

    if (!targets.length) return;

    console.log(`[stats-cron] syncing ${targets.length} target(s)`);
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
    }

    console.log(`[stats-cron] done — ${ok} synced, ${fail} failed`);
  }

  // Run once at startup, then every 6h
  run().catch((e) => console.error("[stats-cron] startup run failed:", e));
  setInterval(() => run().catch((e) => console.error("[stats-cron] error:", e)), INTERVAL_MS);

  console.log("[stats-cron] started — syncing every 6h");
}
