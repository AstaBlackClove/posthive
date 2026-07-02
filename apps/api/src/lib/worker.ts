/**
 * BullMQ worker — processes post-jobs queue.
 *
 * When BullMQ fires a job, the worker:
 *   1. Loads the full PostJob + targets from Prisma
 *   2. Hands it to the existing runJob() state machine
 *
 * BullMQ handles retries automatically (3 attempts, exponential backoff)
 * if runJob() throws. Per-target errors are handled inside runJob() and
 * persisted to PostJobTarget.error — they don't throw up to the worker.
 */

import * as Sentry from "@sentry/node";
import { Worker } from "bullmq";
import { prisma } from "./prisma.js";
import { type PostJobPayload } from "./queue.js";
import { runJob } from "../runner/jobRunner.js";
import type { StorageAdapter } from "./storage.js";

const connection = { url: process.env.REDIS_URL! };

export function startWorker(storage: StorageAdapter): void {
  const worker = new Worker<PostJobPayload>(
    "post-jobs",
    async (job) => {
      const { postJobId } = job.data;

      const postJob = await prisma.postJob.findUnique({
        where: { id: postJobId },
        include: { targets: { include: { account: true } } },
      });

      if (!postJob) {
        // Job was deleted before it fired — nothing to do
        console.warn(`[worker] PostJob ${postJobId} not found in DB — skipping`);
        return;
      }

      if (postJob.status !== "pending") {
        // Already ran (e.g. manually triggered or duplicate) — skip
        console.warn(`[worker] PostJob ${postJobId} status is "${postJob.status}" — skipping`);
        return;
      }

      console.log(`[worker] processing PostJob ${postJobId}`);
      await runJob(postJob, storage);
    },
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[worker] job ${job.data.postJobId} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[worker] job ${job?.data.postJobId} failed:`, err.message);
    Sentry.captureException(err, {
      tags: { component: "worker" },
      extra: { postJobId: job?.data.postJobId },
    });
  });

  console.log("[worker] started — waiting for jobs");
}
