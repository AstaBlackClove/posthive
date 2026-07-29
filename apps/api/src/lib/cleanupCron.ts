/**
 * Cleanup cron — runs daily at 03:00 UTC.
 *
 * Prunes stale analytics data to keep the DB lean:
 * - Sessions older than 90 days
 * - Bounce sessions (≤3s, single page, anonymous, no referrer) older than 14 days
 * - Events older than 90 days
 */

import cron from "node-cron";
import { prisma } from "./prisma.js";

async function runCleanup(): Promise<void> {
  const now = Date.now();
  const cut90d = new Date(now - 90 * 24 * 60 * 60 * 1000);
  const cut14d = new Date(now - 14 * 24 * 60 * 60 * 1000);

  const [oldSessions, bounceSessions, oldEvents] = await Promise.all([
    // Sessions older than 90 days
    prisma.session.deleteMany({ where: { createdAt: { lt: cut90d } } }),

    // Bounce sessions older than 14 days — bots/scanners clog the table fast
    prisma.session.deleteMany({
      where: {
        createdAt: { lt: cut14d },
        duration: { lte: 3 },
        userId: null,
        referrer: null,
      },
    }),

    // Events older than 90 days
    prisma.event.deleteMany({ where: { createdAt: { lt: cut90d } } }),
  ]);

  console.log(
    `[cleanup-cron] sessions: ${oldSessions.count + bounceSessions.count} deleted` +
    ` (${oldSessions.count} old, ${bounceSessions.count} bounces), events: ${oldEvents.count} deleted`
  );
}

export function startCleanupCron(): void {
  // Run daily at 03:00 UTC
  cron.schedule("0 3 * * *", () => {
    runCleanup().catch((e) => console.error("[cleanup-cron] error:", e));
  });
  console.log("[cleanup-cron] started — daily at 03:00 UTC");
}
