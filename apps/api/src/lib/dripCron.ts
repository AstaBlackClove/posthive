/**
 * Drip cron — fires every 5 minutes.
 *
 * For each active ContentLibrary:
 *   1. Find slots that fall within the next 5-minute window (in library's timezone).
 *   2. For each slot, pick the next queued LibraryItem in order.
 *   3. Create a PostJob + LibraryItem update atomically in a transaction.
 *   4. Enqueue in BullMQ.
 *   5. If no queued items remain, mark library exhausted.
 *
 * Safety:
 *   - isRunning flag prevents overlapping runs if DB is slow.
 *   - Libraries processed in parallel batches (CONCURRENCY = 5).
 *   - Paginated in batches of BATCH_SIZE to avoid huge queries.
 *   - PostJob create + LibraryItem update in one Prisma transaction — atomic.
 *   - Items with status != "queued" excluded — safe to re-run anytime.
 */

import * as Sentry from "@sentry/node";
import { prisma } from "./prisma.js";
import { schedulePostJob } from "./queue.js";

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const BATCH_SIZE = 100;             // libraries fetched per page
const CONCURRENCY = 5;              // libraries processed in parallel

let isRunning = false;

function zonedToUtc(naiveDatetimeStr: string, timezone: string): Date {
  const probe = new Date(naiveDatetimeStr + "Z");
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(probe);
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? "0");
  const tzLocal = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  const naiveUtc = probe.getTime();
  return new Date(naiveUtc + (naiveUtc - tzLocal));
}

function nextSlotDate(slot: string, timezone: string): Date {
  const [hh, mm] = slot.split(":").map(Number);
  const now = new Date();
  const localDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const candidateStr = `${localDateStr}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
  const utcCandidate = zonedToUtc(candidateStr, timezone);
  if (utcCandidate.getTime() <= now.getTime()) {
    utcCandidate.setUTCDate(utcCandidate.getUTCDate() + 1);
  }
  return utcCandidate;
}

function slotsInNextWindow(timeSlots: string[], timezone: string, postsPerDay: number): Date[] {
  const now = Date.now();
  const windowEnd = now + INTERVAL_MS;
  const slots = [...timeSlots].sort().slice(0, postsPerDay);
  const result: Date[] = [];
  for (const slot of slots) {
    const t = nextSlotDate(slot, timezone).getTime();
    if (t >= now && t < windowEnd) result.push(new Date(t));
  }
  return result;
}

type LibraryRow = {
  id: string;
  workspaceId: string;
  postsPerDay: number;
  timeSlots: unknown;
  timezone: string;
  accountIds: unknown;
  lastDripAt: Date | null;
  workspace: { members: { userId: string }[] };
};

async function processLibrary(lib: LibraryRow) {
  const timeSlots = lib.timeSlots as string[];
  const accountIds = lib.accountIds as string[];
  const timezone = lib.timezone || "UTC";
  const ownerUserId = lib.workspace.members[0]?.userId;
  if (!ownerUserId) {
    console.warn(`[drip] library ${lib.id} — no workspace owner, skipping`);
    return;
  }

  const slots = slotsInNextWindow(timeSlots, timezone, lib.postsPerDay);
  if (!slots.length) return;

  // Filter to only accounts that still exist
  const validAccounts = await prisma.account.findMany({
    where: { id: { in: accountIds } },
    select: { id: true },
  });
  const validAccountIds = validAccounts.map(a => a.id);
  if (!validAccountIds.length) {
    console.warn(`[drip] library ${lib.id} — all accounts deleted, skipping`);
    return;
  }

  const items = await prisma.libraryItem.findMany({
    where: { libraryId: lib.id, status: "queued" },
    orderBy: { order: "asc" },
    take: slots.length,
    select: { id: true, text: true, commentText: true, mediaUrls: true, order: true },
  });

  if (!items.length) {
    await prisma.contentLibrary.update({ where: { id: lib.id }, data: { status: "exhausted" } });
    console.log(`[drip] library ${lib.id} exhausted`);
    return;
  }

  let scheduled = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const slot = slots[i];
    if (!slot) break;

    try {
      // Atomic: claim item first (status guard), then create PostJob.
      // If another instance already claimed it, updateMany returns count=0 → skip.
      const job = await prisma.$transaction(async (tx) => {
        // Optimistic lock: only proceed if item is still queued
        const claimed = await tx.libraryItem.updateMany({
          where: { id: item.id, status: "queued" },
          data: { status: "scheduled" },
        });
        if (claimed.count === 0) return null; // already claimed by another instance

        const j = await tx.postJob.create({
          data: {
            scheduledFor: slot,
            status: "pending",
            content: JSON.stringify({ text: item.text, mediaUrls: item.mediaUrls as string[] }),
            commentText: item.commentText ?? null,
            dryRun: process.env.NODE_ENV !== "production",
            userId: ownerUserId,
            workspaceId: lib.workspaceId,
            targets: { create: validAccountIds.map((accountId) => ({ accountId })) },
          },
          select: { id: true },
        });
        await tx.libraryItem.update({
          where: { id: item.id },
          data: { scheduledJobId: j.id },
        });
        return j;
      });

      if (!job) { console.log(`[drip] item ${item.id} already claimed — skipping`); continue; }

      // Enqueue outside transaction — BullMQ is not part of the DB tx
      await schedulePostJob(job.id, slot);

      console.log(`[drip] library ${lib.id} → item ${item.id} → job ${job.id} at ${slot.toISOString()}`);
      scheduled++;
    } catch (err) {
      console.error(`[drip] failed item ${item.id}:`, err);
      Sentry.captureException(err, { tags: { component: "drip-cron", libraryId: lib.id, itemId: item.id } });
    }
  }

  if (scheduled > 0) {
    await prisma.contentLibrary.update({ where: { id: lib.id }, data: { lastDripAt: new Date() } });
    console.log(`[drip] library ${lib.id} — scheduled ${scheduled}/${slots.length}`);
  }
}

async function run() {
  if (isRunning) {
    console.log("[drip] previous run still in progress — skipping");
    return;
  }
  isRunning = true;

  try {
    let cursor: string | undefined;
    let totalLibraries = 0;

    // Paginate through active libraries to avoid loading all at once
    while (true) {
      const batch: LibraryRow[] = await prisma.contentLibrary.findMany({
        where: { status: "active" },
        select: {
          id: true,
          workspaceId: true,
          postsPerDay: true,
          timeSlots: true,
          timezone: true,
          accountIds: true,
          lastDripAt: true,
          workspace: { select: { members: { where: { role: "owner" }, select: { userId: true }, take: 1 } } },
        },
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
      });

      if (!batch.length) break;
      totalLibraries += batch.length;

      // Process in parallel with concurrency limit
      for (let i = 0; i < batch.length; i += CONCURRENCY) {
        await Promise.allSettled(
          batch.slice(i, i + CONCURRENCY).map(lib =>
            processLibrary(lib).catch(err => {
              console.error(`[drip] error processing library ${lib.id}:`, err);
              Sentry.captureException(err, { tags: { component: "drip-cron", libraryId: lib.id } });
            })
          )
        );
      }

      if (batch.length < BATCH_SIZE) break;
      cursor = batch[batch.length - 1].id;
    }

    if (totalLibraries > 0) {
      console.log(`[drip] checked ${totalLibraries} librar${totalLibraries === 1 ? "y" : "ies"}`);
    }
  } finally {
    isRunning = false;
  }
}

export { run as runDripNow };

export function startDripCron() {
  run().catch((e) => console.error("[drip] startup run error:", e));
  setInterval(() => run().catch((e) => console.error("[drip] error:", e)), INTERVAL_MS);
}
