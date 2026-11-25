/**
 * Background cron — proactively refreshes tokens expiring within 7 days.
 * Runs every 12 hours.
 *
 * Covered platforms and their token TTLs:
 *   threads         60 days  (long-lived token refresh)
 *   instagram       60 days
 *   facebook        60 days
 *   tiktok          ~24h     (refresh token ~1 year)
 *   pinterest       ~30 days
 *
 * Excluded: youtube, googlebusiness — 1-hour Google tokens; adapter refreshes
 * inline at job time so proactive cron refresh is wasted API calls.
 *
 * Excluded: linkedin — LinkedIn only issues a refresh token to apps with
 * Marketing Developer Platform / Community Management API partner approval,
 * which this app doesn't have (confirmed: 0 of our connected LinkedIn
 * accounts have ever received one, and Postiz's own LinkedIn integration
 * requests the same scopes with no special "offline access" scope, so this
 * isn't a missing scope — it's an access tier we're not approved for).
 * Calling refreshTokenIfNeeded would deterministically throw every single
 * run for every account, forever — not a transient failure worth retrying.
 * Instead, sendLinkedInExpiryWarnings() below emails once, directly, with no
 * doomed API call. The adapter's refreshTokenIfNeeded still runs inline at
 * actual post time (runner/jobRunner.ts) for the rare case a token expires
 * between warning and the user reconnecting.
 *
 * Platforms with non-expiring tokens (Bluesky app passwords, bot tokens,
 * OAuth 1.0a, keypairs) return early from refreshTokenIfNeeded — safe to skip.
 */

import cron from "node-cron";
import * as Sentry from "@sentry/node";
import { prisma } from "./prisma.js";
import { getAdapter } from "../adapters/index.js";
import { sendAccountExpiryEmail } from "./mailer.js";
import { isDeadTokenError } from "./tokenRevocation.js";

// youtube and googlebusiness use 1-hour Google tokens — inline refresh in the adapter
// handles them at job time. Proactive cron refresh is wasted API calls for these.
// linkedin is handled separately by sendLinkedInExpiryWarnings() — see file header.
const REFRESH_PLATFORMS = new Set([
  "threads", "instagram", "facebook",
  "tiktok", "pinterest",
]);
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const BATCH_SIZE = 50;
const BATCH_CONCURRENCY = 5;
// Caps the expiry-email burst per run, not the refresh attempts themselves — a backlog of
// many accounts crossing the warning threshold at once (e.g. a provider that never issues a
// refresh token, so every account relying on it queues up) shouldn't spend a meaningful slice
// of a daily email cap in one run. Unemailed accounts stay unwarned (warnedExpiryAt untouched)
// and get picked up by the next run 12h later, so a backlog drains over a few runs instead of
// bursting. Soft limit — a race between concurrent accounts can push it slightly over.
const MAX_EXPIRY_EMAILS_PER_RUN = 20;

// Shared by the main loop's dead-token catch and sendLinkedInExpiryWarnings — both end in
// the same "tell the user once, then stay quiet" steps.
async function warnAccountExpiring(
  accountId: string,
  email: string,
  platform: string,
  displayName: string,
  expiresAt: Date
): Promise<void> {
  const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  await sendAccountExpiryEmail(email, platform, displayName, daysLeft)
    .catch((e) => console.error(`[token-refresh] expiry email failed for ${accountId}:`, e));
  await prisma.account.update({ where: { id: accountId }, data: { warnedExpiryAt: new Date() } });
}

async function run(skipRecentlyRefreshed = false) {
  const cutoff = new Date(Date.now() + WINDOW_MS);
  const recentCutoff = new Date(Date.now() - 60 * 60 * 1000); // 1h ago
  let cursor: string | undefined;
  let expiryEmailsSent = 0;

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
      include: { user: { select: { email: true } } },
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
            const isRevoked = isDeadTokenError(msg);
            if (!isRevoked) {
              Sentry.captureException(err, {
                tags: { component: "token-refresh", platform: account.platform },
                extra: { accountId: account.id },
              });
            } else if (!account.warnedExpiryAt && account.user?.email && expiryEmailsSent < MAX_EXPIRY_EMAILS_PER_RUN) {
              expiryEmailsSent++;
              await warnAccountExpiring(account.id, account.user.email, account.platform, account.displayName, account.expiresAt!);
            }
          }
        })
      );
    }

    if (batch.length < BATCH_SIZE) break;
  }

  await sendLinkedInExpiryWarnings(MAX_EXPIRY_EMAILS_PER_RUN - expiryEmailsSent);
}

// LinkedIn can never be refreshed by this app (see file header) — warn once, directly,
// instead of routing through refreshTokenIfNeeded just to catch its guaranteed failure.
async function sendLinkedInExpiryWarnings(budget: number): Promise<void> {
  if (budget <= 0) return;
  const cutoff = new Date(Date.now() + WINDOW_MS);
  const accounts = await prisma.account.findMany({
    where: { platform: "linkedin", expiresAt: { lte: cutoff }, warnedExpiryAt: null },
    orderBy: { expiresAt: "asc" }, // soonest-to-expire gets the budget first if there's a backlog
    take: budget,
    include: { user: { select: { email: true } } },
  });

  for (const account of accounts) {
    if (!account.user?.email) continue;
    await warnAccountExpiring(account.id, account.user.email, "linkedin", account.displayName, account.expiresAt!);
  }
}

export function startTokenRefreshCron() {
  // Fixed wall-clock schedule: 00:30 and 12:30 UTC — offset from statsCron, survives Railway restarts
  cron.schedule("30 0,12 * * *", () => {
    run().catch((e) => console.error("[token-refresh] error:", e));
  });
  console.log("[token-refresh] started — daily at 00:30 and 12:30 UTC");
}
