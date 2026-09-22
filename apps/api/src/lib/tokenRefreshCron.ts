/**
 * Background cron — proactively refreshes tokens expiring within 7 days.
 * Runs every 12 hours.
 *
 * Covered platforms and their token TTLs:
 *   threads         60 days  (long-lived token refresh)
 *   instagram       60 days
 *   facebook        60 days
 *   youtube         ~1 hour  (Google OAuth refresh)
 *   tiktok          ~24h     (refresh token ~1 year)
 *   linkedin        60 days  (refresh token ~1 year)
 *   pinterest       ~30 days
 *   googlebusiness  ~1 hour  (Google OAuth refresh)
 *
 * Platforms with non-expiring tokens (Bluesky app passwords, bot tokens,
 * OAuth 1.0a, keypairs) return early from refreshTokenIfNeeded — safe to skip.
 */

import * as Sentry from "@sentry/node";
import { prisma } from "./prisma.js";
import { getAdapter } from "../adapters/index.js";

const REFRESH_PLATFORMS = new Set([
  "threads", "instagram", "facebook", "youtube",
  "tiktok", "linkedin", "pinterest", "googlebusiness",
]);
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const INTERVAL_MS = 12 * 60 * 60 * 1000;    // 12 hours
const BATCH_SIZE = 50;
const BATCH_CONCURRENCY = 5;

async function run(skipRecentlyRefreshed = false) {
  const cutoff = new Date(Date.now() + WINDOW_MS);
  const recentCutoff = new Date(Date.now() - 60 * 60 * 1000); // 1h ago
  let cursor: string | undefined;

  while (true) {
    const batch = await prisma.account.findMany({
      where: {
        platform: { in: Array.from(REFRESH_PLATFORMS) },
        expiresAt: { lte: cutoff },
        ...(skipRecentlyRefreshed ? { updatedAt: { lt: recentCutoff } } : {}),
      },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    if (!batch.length) break;
    cursor = batch[batch.length - 1].id;

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
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[token-refresh] failed for ${account.platform} account ${account.id}:`, err);
            const isRevoked = msg.includes("invalid_grant") || msg.includes("reconnect");
            if (!isRevoked) {
              Sentry.captureException(err, {
                tags: { component: "token-refresh", platform: account.platform },
                extra: { accountId: account.id },
              });
            }
          }
        })
      );
    }

    if (batch.length < BATCH_SIZE) break;
  }
}

export function startTokenRefreshCron() {
  // Run once at startup — skip accounts refreshed within last hour to avoid hammering OAuth on deploys
  run(true).catch((e) => console.error("[token-refresh] error:", e));
  setInterval(() => run().catch((e) => console.error("[token-refresh] error:", e)), INTERVAL_MS);
}
