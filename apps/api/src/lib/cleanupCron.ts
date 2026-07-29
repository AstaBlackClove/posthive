/**
 * Cleanup cron — runs daily at 03:00 UTC.
 *
 * Prunes stale analytics data to keep the DB lean:
 * - Sessions older than 90 days
 * - Bounce sessions (≤3s, single page, anonymous, no referrer) older than 14 days
 * - Events older than 90 days
 *
 * Also cleans up orphaned profile-pics from storage:
 * - Any file in the profile-pics/ folder not referenced by Account.avatarUrl or User.avatarUrl
 */

import cron from "node-cron";
import { prisma } from "./prisma.js";
import type { StorageAdapter } from "./storage.js";

let storageAdapter: StorageAdapter | null = null;
export function setCleanupStorage(s: StorageAdapter): void { storageAdapter = s; }

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

  // Clean up orphaned profile-pics from storage
  const adapter = storageAdapter;
  if (adapter) {
    try {
      const [storedFiles, accounts, users] = await Promise.all([
        adapter.listFolder("profile-pics"),
        prisma.account.findMany({ select: { avatarUrl: true } }),
        prisma.user.findMany({ select: { avatarUrl: true } }),
      ]);

      // Normalize to just the filename so local paths (/uploads/profile-pics/x.jpg)
      // and full URLs (http://localhost:3001/uploads/profile-pics/x.jpg) match correctly.
      const toFilename = (url: string) => url.split("/profile-pics/")[1] ?? url;

      const referencedFilenames = new Set<string>([
        ...accounts.flatMap((a) => (a.avatarUrl ? [toFilename(a.avatarUrl)] : [])),
        ...users.flatMap((u) => (u.avatarUrl ? [toFilename(u.avatarUrl)] : [])),
      ]);

      const orphans = storedFiles.filter((url) => !referencedFilenames.has(toFilename(url)));

      if (orphans.length) {
        const BATCH = 50;
        for (let i = 0; i < orphans.length; i += BATCH) {
          await Promise.allSettled(orphans.slice(i, i + BATCH).map((url) => adapter.delete(url)));
        }
        console.log(`[cleanup-cron] profile-pics: ${orphans.length} orphan(s) deleted`);
      } else {
        console.log(`[cleanup-cron] profile-pics: no orphans found`);
      }
    } catch (e) {
      console.error("[cleanup-cron] profile-pics cleanup error:", e);
    }
  }
}

export function runCleanupNow(): Promise<void> {
  return runCleanup();
}

export function startCleanupCron(): void {
  // Run daily at 03:00 UTC
  cron.schedule("0 3 * * *", () => {
    runCleanup().catch((e) => console.error("[cleanup-cron] error:", e));
  });
  console.log("[cleanup-cron] started — daily at 03:00 UTC");
}
