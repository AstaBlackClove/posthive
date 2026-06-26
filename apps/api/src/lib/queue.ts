/**
 * BullMQ queue setup.
 *
 * Passes the Redis URL string directly to BullMQ — it creates its own
 * ioredis connection internally, avoiding version conflicts when BullMQ
 * bundles a different ioredis version than what we install.
 */

import { Queue } from "bullmq";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL env var is required");
}

const connection = { url: process.env.REDIS_URL };

export const postJobQueue = new Queue("post-jobs", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export interface PostJobPayload {
  postJobId: string;
}

export async function schedulePostJob(
  postJobId: string,
  scheduledFor: Date
): Promise<void> {
  const delay = Math.max(0, scheduledFor.getTime() - Date.now());

  await postJobQueue.add(
    postJobId,
    { postJobId } satisfies PostJobPayload,
    { delay, jobId: postJobId }
  );
}
