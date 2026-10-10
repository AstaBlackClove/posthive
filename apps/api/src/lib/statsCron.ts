/**
 * Stats sync cron — runs every 6 hours.
 *
 * Fetches engagement stats (likes, reposts, replies) for all published
 * PostJobTargets on supported platforms within the last 90 days, then
 * upserts results into the PostStats table.
 *
 * Each adapter must implement getAnalytics().
 */

import cron from "node-cron";
import { prisma } from "./prisma.js";
import { adapters } from "../adapters/index.js";

const SUPPORTED = new Set(["bluesky", "mastodon", "pixelfed", "threads", "instagram", "facebook"]);
const RECENCY_MS  = 11 * 60 * 60 * 1000; // skip targets synced within 11h
const BATCH = 5;                          // concurrent platform API calls
const BATCH_DELAY_MS = 300;               // pause between batches (rate-limit headroom)

let isRunning = false;

export async function runStatsCronNow(): Promise<void> {
  if (isRunning) {
    console.log("[stats-cron] previous run still in progress, skipping tick");
    return;
  }
  isRunning = true;

  try {
    const postCutoff   = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentCutoff = new Date(Date.now() - RECENCY_MS);
    const PAGE_SIZE = 500;

    const baseWhere = {
      status: { in: ["done", "post_done", "comment_done"] },
      platformPostId: { not: null },
      account: { platform: { in: Array.from(SUPPORTED) } },
      postJob: { scheduledFor: { gte: postCutoff } },
      OR: [
        { stats: null },
        { stats: { fetchedAt: { lt: recentCutoff } } },
      ],
    };

    const targetSelect = {
      id: true,
      platformPostId: true,
      account: {
        select: {
          id: true, platform: true, displayName: true,
          credentials: true, refreshToken: true, expiresAt: true,
        },
      },
    };

    let ok = 0, fail = 0, total = 0;
    let cursor: string | undefined;

    // Cursor-paginated loop — never loads more than PAGE_SIZE rows at once
    for (;;) {
      const page = await prisma.postJobTarget.findMany({
        where: baseWhere,
        orderBy: { id: "asc" },
        take: PAGE_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: targetSelect,
      });

      if (!page.length) break;
      cursor = page[page.length - 1].id;
      total += page.length;

      for (let i = 0; i < page.length; i += BATCH) {
        await Promise.allSettled(
          page.slice(i, i + BATCH).map(async (t) => {
            const adapter = adapters.find((a) => a.name === t.account!.platform);
            if (!adapter?.getAnalytics) return;

            try {
              const stats = await adapter.getAnalytics(
                t.account as Parameters<typeof adapter.getAnalytics>[0],
                t.platformPostId!,
              );
              await prisma.postStats.upsert({
                where: { targetId: t.id },
                create: {
                  targetId: t.id,
                  likes:     stats.likes    ?? 0,
                  reposts:   stats.reposts  ?? 0,
                  replies:   stats.replies  ?? 0,
                  views:     stats.views    ?? null,
                  fetchedAt: new Date(stats.fetchedAt),
                },
                update: {
                  likes:     stats.likes    ?? 0,
                  reposts:   stats.reposts  ?? 0,
                  replies:   stats.replies  ?? 0,
                  views:     stats.views    ?? null,
                  fetchedAt: new Date(stats.fetchedAt),
                },
              });
              ok++;
            } catch (e) {
              fail++;
              console.warn(`[stats-cron] target ${t.id} failed:`, (e as Error).message);
            }
          }),
        );

        if (i + BATCH < page.length) {
          await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
        }
      }
    }

    if (!total) {
      console.log("[stats-cron] nothing stale to sync");
      return;
    }
    console.log(`[stats-cron] done — ${ok} synced, ${fail} failed (${total} total)`);
  } finally {
    isRunning = false;
  }
}

export function startStatsCron(): void {
  // Fixed wall-clock schedule: 00:00 and 12:00 UTC — survives Railway restarts
  cron.schedule("0 0,12 * * *", () => {
    runStatsCronNow().catch((e) => console.error("[stats-cron] error:", e));
  });
  console.log("[stats-cron] started — daily at 00:00 and 12:00 UTC");
}
