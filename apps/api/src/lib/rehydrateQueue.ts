/**
 * Queue rehydration — runs once at startup.
 *
 * If Redis loses its data (restart, wipe, failure), BullMQ's queue is empty
 * but Postgres still has the ground truth. This function finds every pending
 * PostJob scheduled in the future and re-enqueues it so nothing is silently
 * dropped.
 *
 * Safe to run every boot:
 *   - BullMQ uses jobId = postJobId, so adding a job that already exists
 *     in Redis is a no-op (BullMQ rejects duplicates by jobId).
 *   - Jobs in the past that are still pending are scheduled with delay=0
 *     so they fire immediately (handles the case where the server was down
 *     when a job was due).
 */

import { prisma } from "./prisma.js";
import { schedulePostJob } from "./queue.js";

export async function rehydrateQueue(): Promise<void> {
  const pending = await prisma.postJob.findMany({
    where: {
      status: "pending",
      scheduledFor: { not: null },
    },
    select: { id: true, scheduledFor: true, content: true },
  });

  // Filter out drafts — draft flag is stored inside the content JSON
  const nonDrafts = pending.filter((job) => {
    try {
      const parsed = JSON.parse(job.content) as { draft?: boolean };
      return !parsed.draft;
    } catch {
      return true;
    }
  });

  if (!nonDrafts.length) {
    console.log("[rehydrate] no pending jobs to rehydrate");
    return;
  }

  let enqueued = 0;
  let skipped = 0;

  await Promise.allSettled(
    nonDrafts.map(async (job) => {
      try {
        await schedulePostJob(job.id, job.scheduledFor!);
        enqueued++;
      } catch (err) {
        // BullMQ throws if job already exists with same jobId — that's expected
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Job already exists")) {
          skipped++;
        } else {
          console.error(`[rehydrate] failed to enqueue job ${job.id}:`, err);
        }
      }
    })
  );

  console.log(`[rehydrate] done — ${enqueued} enqueued, ${skipped} already in queue`);
}
