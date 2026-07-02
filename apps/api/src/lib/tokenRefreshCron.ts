/**
 * Background cron — proactively refreshes tokens expiring within 7 days.
 * Runs every 12 hours. Covers Threads, Instagram, Facebook, YouTube.
 * LinkedIn has no silent refresh — users must reconnect manually.
 */

import * as Sentry from "@sentry/node";
import { prisma } from "./prisma.js";
import { getAdapter } from "../adapters/index.js";

const REFRESH_PLATFORMS = new Set(["threads", "instagram", "facebook", "youtube"]);
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const INTERVAL_MS = 12 * 60 * 60 * 1000;    // 12 hours
const BATCH_SIZE = 50;
const BATCH_CONCURRENCY = 5; // refresh 5 accounts at a time within each batch

async function run() {
  const cutoff = new Date(Date.now() + WINDOW_MS);
  let cursor: string | undefined;
  let total = 0;

  while (true) {
    const batch = await prisma.account.findMany({
      where: {
        platform: { in: Array.from(REFRESH_PLATFORMS) },
        expiresAt: { lte: cutoff },
      },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    if (!batch.length) break;
    cursor = batch[batch.length - 1].id;
    total += batch.length;

    // Process up to BATCH_CONCURRENCY accounts at a time
    for (let i = 0; i < batch.length; i += BATCH_CONCURRENCY) {
      const chunk = batch.slice(i, i + BATCH_CONCURRENCY);
      await Promise.allSettled(
        chunk.map(async (account) => {
          try {
            const adapter = getAdapter(account.platform);
            const refreshed = await adapter.refreshTokenIfNeeded(account);
            if (refreshed.updatedAt !== account.updatedAt) {
              console.log(`[token-refresh] refreshed ${account.platform} account ${account.displayName}`);
            }
          } catch (err) {
            console.error(`[token-refresh] failed for ${account.platform} account ${account.id}:`, err);
            Sentry.captureException(err, {
              tags: { component: "token-refresh", platform: account.platform },
              extra: { accountId: account.id },
            });
          }
        })
      );
    }

    if (batch.length < BATCH_SIZE) break; // last page
  }

  if (total > 0) console.log(`[token-refresh] processed ${total} account(s)`);
}

export function startTokenRefreshCron() {
  // Run once at startup to catch anything already near expiry
  run().catch((e) => console.error("[token-refresh] error:", e));
  setInterval(() => run().catch((e) => console.error("[token-refresh] error:", e)), INTERVAL_MS);
}
