/**
 * Stuck job recovery cron — re-enqueues pending PostJobs dropped from Redis.
 *
 * BullMQ jobs can be lost on Redis eviction or restart, leaving PostJob rows
 * with status="pending" and scheduledFor in the past with no active queue entry.
 * This cron finds them and re-enqueues via schedulePostJob().
 *
 * Runs every 5 minutes.
 */

import { prisma } from "./prisma.js";
import { schedulePostJob } from "./queue.js";

const GRACE_MINUTES = 5;

async function recoverStuckJobs(): Promise<void> {
  const cutoff = new Date(Date.now() - GRACE_MINUTES * 60 * 1000);

  const stuck = await prisma.postJob.findMany({
    where: {
      status: "pending",
      scheduledFor: { lte: cutoff },
    },
    select: { id: true, scheduledFor: true },
  });

  if (stuck.length === 0) return;

  console.log(`[stuckJobCron] found ${stuck.length} stuck job(s) — re-enqueuing`);

  for (const job of stuck) {
    try {
      await schedulePostJob(job.id, job.scheduledFor!);
      console.log(`[stuckJobCron] re-enqueued job ${job.id}`);
    } catch (err) {
      console.error(`[stuckJobCron] failed to re-enqueue job ${job.id}:`, err);
    }
  }
}

export function startStuckJobCron(): void {
  // Run immediately on startup, then every 5 minutes
  recoverStuckJobs().catch((err) => console.error("[stuckJobCron] initial run failed:", err));
  setInterval(() => {
    recoverStuckJobs().catch((err) => console.error("[stuckJobCron] run failed:", err));
  }, 5 * 60 * 1000);

  console.log("[stuckJobCron] started — checking every 5 minutes");
}
