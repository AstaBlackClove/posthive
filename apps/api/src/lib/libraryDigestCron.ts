import cron from "node-cron";
import { prisma } from "./prisma.js";
import { sendLibraryDigestEmail } from "./mailer.js";

const FAILURE_WARN_THRESHOLD = 0.2; // warn if >20% failed in last 24h

async function runLibraryDigest(): Promise<void> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Find all workspaces with at least one active library that dripped in last 24h
  const libraries = await prisma.contentLibrary.findMany({
    where: {
      status: { in: ["active", "exhausted"] },
      lastDripAt: { gte: since },
    },
    select: {
      id: true,
      name: true,
      status: true,
      workspaceId: true,
      _count: { select: { items: { where: { status: "queued" } } } },
    },
  });

  if (!libraries.length) {
    console.log("[library-digest] no libraries dripped in last 24h, skipping");
    return;
  }

  // Get per-library post counts from last 24h
  // LibraryItem.scheduledJobId is a bare FK string — join via LibraryItem
  const libraryIds = libraries.map((l) => l.id);

  // Get PostJob IDs scheduled in the last 24h (for matching failed items)
  const recentPostJobIds = (await prisma.postJob.findMany({
    where: { scheduledFor: { gte: since } },
    select: { id: true },
  })).map((j) => j.id);

  const recentItems = await prisma.libraryItem.findMany({
    where: {
      libraryId: { in: libraryIds },
      scheduledJobId: { not: null },
      OR: [
        { publishedAt: { gte: since.toISOString() } },
        { status: "failed", scheduledJobId: { in: recentPostJobIds } },
      ],
    },
    select: { libraryId: true, scheduledJobId: true },
  });

  const jobIdToLibrary = new Map<string, string>();
  for (const item of recentItems) {
    if (item.scheduledJobId) jobIdToLibrary.set(item.scheduledJobId, item.libraryId);
  }

  const recentJobIds = Array.from(jobIdToLibrary.keys());
  const targets = recentJobIds.length
    ? await prisma.postJobTarget.findMany({
        where: {
          postJobId: { in: recentJobIds },
          status: { in: ["comment_done", "post_done", "post_failed"] },
        },
        select: { status: true, postJobId: true },
      })
    : [];

  // Aggregate per library
  const statsMap = new Map<string, { succeeded: number; failed: number }>();
  for (const t of targets) {
    const libId = jobIdToLibrary.get(t.postJobId);
    if (!libId) continue;
    const s = statsMap.get(libId) ?? { succeeded: 0, failed: 0 };
    if (t.status === "post_failed") s.failed++;
    else s.succeeded++;
    statsMap.set(libId, s);
  }

  // Group libraries by workspaceId
  const byWorkspace = new Map<string, typeof libraries>();
  for (const lib of libraries) {
    const arr = byWorkspace.get(lib.workspaceId) ?? [];
    arr.push(lib);
    byWorkspace.set(lib.workspaceId, arr);
  }

  // For each workspace, find owner email and send digest
  const workspaceIds = Array.from(byWorkspace.keys());
  const workspaces = await prisma.workspace.findMany({
    where: { id: { in: workspaceIds } },
    select: {
      id: true,
      members: {
        where: { role: "owner" },
        select: { user: { select: { email: true, name: true } } },
        take: 1,
      },
    },
  });

  let sent = 0;
  await Promise.allSettled(
    workspaces.map(async (ws) => {
      const owner = ws.members[0]?.user;
      if (!owner) return;

      const libs = byWorkspace.get(ws.id) ?? [];
      const rows = libs.map((lib) => {
        const s = statsMap.get(lib.id) ?? { succeeded: 0, failed: 0 };
        const total = s.succeeded + s.failed;
        const failRate = total > 0 ? s.failed / total : 0;
        return {
          name: lib.name,
          status: lib.status,
          queued: lib._count.items,
          succeeded: s.succeeded,
          failed: s.failed,
          hasWarning: failRate > FAILURE_WARN_THRESHOLD && s.failed > 0,
        };
      });

      const hasAnyWarning = rows.some((r) => r.hasWarning);
      await sendLibraryDigestEmail(owner.email, owner.name ?? "there", rows, hasAnyWarning);
      sent++;
    }),
  );

  console.log(`[library-digest] sent ${sent} digest email(s) to workspace owners`);
}

export function startLibraryDigestCron(): void {
  // 8:00 UTC daily
  cron.schedule("0 8 * * *", () => {
    runLibraryDigest().catch((e) => console.error("[library-digest] error:", e));
  });
  console.log("[library-digest] started — daily at 08:00 UTC");
}
