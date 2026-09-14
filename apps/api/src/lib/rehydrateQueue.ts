/**
 * Queue rehydration — runs once at startup.
 *
 * If Redis loses its data (restart, wipe, failure), BullMQ's queue is empty
 * but Postgres still has the ground truth. This scans all pending PostJobs and
 * re-enqueues any that are missing from Redis. Safe on every boot: BullMQ
 * deduplicates by jobId, so re-adding an existing job is a no-op.
 *
 * Jobs past their scheduledFor that are still pending fire immediately (delay=0),
 * handling the case where the server was down when a job was due.
 */

import { prisma } from "./prisma.js";
import { schedulePostJob } from "./queue.js";

const PAGE_SIZE = 200;   // rows fetched per DB round-trip
const CONCURRENCY = 25;  // parallel BullMQ enqueue calls per batch
const BATCH_DELAY_MS = 100; // pause between batches — avoids Redis burst

let isRunning = false;

export interface RehydrateResult {
  enqueued: number;
  skipped: number;
  failed: number;
}

export async function rehydrateQueue(): Promise<RehydrateResult> {
  if (isRunning) {
    console.warn("[rehydrate] previous run still in progress — skipping");
    return { enqueued: 0, skipped: 0, failed: 0 };
  }
  isRunning = true;

  let enqueued = 0;
  let skipped = 0;
  let failed = 0;
  let cursor: string | undefined;
  let pages = 0;

  try {
    console.log("[rehydrate] scanning pending jobs...");

    while (true) {
      const page = await prisma.postJob.findMany({
        where: { status: "pending", scheduledFor: { not: null } },
        select: { id: true, scheduledFor: true, content: true },
        orderBy: { id: "asc" },
        take: PAGE_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });

      if (!page.length) break;
      cursor = page[page.length - 1].id;
      pages++;

      const candidates = page.filter((job) => {
        try { return !(JSON.parse(job.content) as { draft?: boolean }).draft; }
        catch { return true; }
      });

      for (let i = 0; i < candidates.length; i += CONCURRENCY) {
        const results = await Promise.allSettled(
          candidates.slice(i, i + CONCURRENCY).map((job) =>
            schedulePostJob(job.id, job.scheduledFor!),
          ),
        );

        for (let j = 0; j < results.length; j++) {
          const r = results[j];
          if (r.status === "fulfilled") {
            enqueued++;
          } else {
            const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
            if (msg.includes("Job already exists")) {
              skipped++;
            } else {
              failed++;
              console.error(`[rehydrate] job ${candidates[i + j].id} failed:`, r.reason);
            }
          }
        }

        if (i + CONCURRENCY < candidates.length) {
          await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
        }
      }

      if (page.length < PAGE_SIZE) break;
    }

    console.log(
      `[rehydrate] done — ${enqueued} enqueued, ${skipped} already queued, ${failed} failed` +
      (pages > 1 ? ` (${pages} pages)` : ""),
    );
  } finally {
    isRunning = false;
  }

  return { enqueued, skipped, failed };
}
