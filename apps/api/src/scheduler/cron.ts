/**
 * Scheduler — polls every minute for pending PostJobs whose scheduledFor
 * time has passed, then hands them off to the job runner.
 *
 * Also recovers jobs stuck in "running" — this happens when the process is
 * killed mid-run (e.g. tsx watch reloading during development). Any job that
 * has been "running" for more than 5 minutes is reset to "pending" so the
 * next tick picks it up again.
 */

import cron from "node-cron";
import { prisma } from "../lib/prisma.js";
import { runJob } from "../runner/jobRunner.js";

const STUCK_JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export function startScheduler(): void {
  cron.schedule("* * * * *", async () => {
    await recoverStuckJobs();
    await runDueJobs();
  });

  console.log("[scheduler] started — polling every minute");
}

async function runDueJobs(): Promise<void> {
  const dueJobs = await prisma.postJob.findMany({
    where: {
      status: "pending",
      scheduledFor: { lte: new Date() },
    },
    include: { targets: { include: { account: true } } },
  });

  if (dueJobs.length === 0) return;

  console.log(`[scheduler] ${dueJobs.length} job(s) due — handing to runner`);

  for (const job of dueJobs) {
    runJob(job).catch((err) => {
      console.error(`[scheduler] unhandled error in job ${job.id}:`, err);
    });
  }
}

async function recoverStuckJobs(): Promise<void> {
  const stuckCutoff = new Date(Date.now() - STUCK_JOB_TIMEOUT_MS);

  // A job stuck in "running" means the process was killed mid-run.
  // Reset it to "pending" so the runner retries it — the per-target state
  // machine handles deduplication (post_done targets skip createPost).
  const stuck = await prisma.postJob.updateMany({
    where: {
      status: "running",
      updatedAt: { lte: stuckCutoff },
    },
    data: { status: "pending" },
  });

  if (stuck.count > 0) {
    console.warn(`[scheduler] recovered ${stuck.count} stuck job(s) — resetting to pending`);
  }
}
