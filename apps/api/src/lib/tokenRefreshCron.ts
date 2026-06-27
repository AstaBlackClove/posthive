/**
 * Background cron — proactively refreshes expiring platform tokens.
 * Runs every 12 hours. Refreshes any token expiring within 7 days.
 * Currently handles: Threads (60-day tokens)
 */

import { prisma } from "./prisma.js";
import { threadsAdapter } from "../adapters/threads.js";

const INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours
const REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function refreshExpiringTokens() {
  const threshold = new Date(Date.now() + REFRESH_THRESHOLD_MS);

  const accounts = await prisma.account.findMany({
    where: {
      platform: "threads",
      expiresAt: { lte: threshold },
    },
  });

  if (accounts.length === 0) return;

  console.log(`[token-refresh] Refreshing ${accounts.length} expiring Threads token(s)`);

  for (const account of accounts) {
    try {
      await threadsAdapter.refreshTokenIfNeeded(account);
      console.log(`[token-refresh] Refreshed token for account ${account.id} (${account.displayName})`);
    } catch (err) {
      console.error(`[token-refresh] Failed to refresh token for account ${account.id}:`, err);
    }
  }
}

export function startTokenRefreshCron() {
  // Run once shortly after startup, then every 12 hours
  setTimeout(() => {
    refreshExpiringTokens().catch(console.error);
    setInterval(() => {
      refreshExpiringTokens().catch(console.error);
    }, INTERVAL_MS);
  }, 30_000); // 30s after startup to avoid race with DB connection

  console.log("[token-refresh] Cron started — checks every 12 hours");
}
