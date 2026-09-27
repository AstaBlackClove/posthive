/**
 * Drip cron — fires every hour.
 *
 * For each active ContentLibrary:
 *   1. Determine which time slots fall within the next hour (in library's timezone).
 *   2. For each slot, pick the next queued LibraryItem in order.
 *   3. Create a PostJob scheduled for that slot time.
 *   4. Mark the LibraryItem as "scheduled" with the new PostJob ID.
 *   5. If no queued items remain, mark library as "exhausted".
 *
 * Idempotent: uses `lastDripAt` to skip libraries already dripped within
 * the current hour window, preventing double-fires on restarts or crashes.
 */

import * as Sentry from "@sentry/node";
import { prisma } from "./prisma.js";
import { schedulePostJob } from "./queue.js";

const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Given a "HH:MM" time slot and a timezone, return the next Date when that
 * slot fires. If the slot is still in the future today, return today's date
 * at that time. Otherwise return tomorrow.
 */
function nextSlotDate(slot: string, timezone: string): Date {
  const [hh, mm] = slot.split(":").map(Number);
  const now = new Date();

  // Build a date string in the library's timezone
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const localDateStr = formatter.format(now); // "YYYY-MM-DD"

  // Construct slot datetime in that timezone via UTC offset
  const candidateStr = `${localDateStr}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
  const candidate = new Date(
    new Date(candidateStr).toLocaleString("en-US", { timeZone: timezone })
  );
  // Use Intl to get the UTC equivalent
  const utcCandidate = zonedToUtc(candidateStr, timezone);

  // If already passed, schedule for tomorrow
  if (utcCandidate.getTime() <= now.getTime()) {
    utcCandidate.setUTCDate(utcCandidate.getUTCDate() + 1);
  }
  void candidate; // unused — utcCandidate is what we return
  return utcCandidate;
}

/**
 * Convert a naive datetime string "YYYY-MM-DDTHH:MM:SS" expressed in `timezone`
 * to a UTC Date object.
 */
function zonedToUtc(naiveDatetimeStr: string, timezone: string): Date {
  // We abuse the fact that `new Date(str)` parses as local time by constructing
  // a temporary Date and measuring the offset from Intl.
  const probe = new Date(naiveDatetimeStr + "Z"); // treat as UTC first

  // Get what Intl reports as the local time in the target timezone for that UTC instant
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(probe);

  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? "0");
  const tzLocal = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  const naiveUtc = new Date(naiveDatetimeStr + "Z").getTime();
  const offset = naiveUtc - tzLocal; // offset = UTC - localTime → UTC = local + offset
  return new Date(naiveUtc + offset);
}

/**
 * Which slots from this library's timeSlots array fall within [now, now + 1h)?
 * Returns their scheduled UTC Date objects.
 */
function slotsInNextHour(timeSlots: string[], timezone: string, postsPerDay: number): Date[] {
  const now = Date.now();
  const windowEnd = now + INTERVAL_MS;

  // Only use up to postsPerDay slots (sorted ascending)
  const slots = [...timeSlots].sort().slice(0, postsPerDay);

  const result: Date[] = [];
  for (const slot of slots) {
    const slotDate = nextSlotDate(slot, timezone);
    const t = slotDate.getTime();
    if (t >= now && t < windowEnd) {
      result.push(slotDate);
    }
  }
  return result;
}

async function run() {
  const libraries = await prisma.contentLibrary.findMany({
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
  });

  if (!libraries.length) return;
  console.log(`[drip] checking ${libraries.length} active librar${libraries.length === 1 ? "y" : "ies"}`);

  for (const lib of libraries) {
    try {
      await processLibrary(lib);
    } catch (err) {
      console.error(`[drip] error processing library ${lib.id}:`, err);
      Sentry.captureException(err, { tags: { component: "drip-cron", libraryId: lib.id } });
    }
  }
}

async function processLibrary(lib: {
  id: string;
  workspaceId: string;
  postsPerDay: number;
  timeSlots: unknown;
  timezone: string;
  accountIds: unknown;
  lastDripAt: Date | null;
  workspace: { members: { userId: string }[] };
}) {
  const timeSlots = lib.timeSlots as string[];
  const accountIds = lib.accountIds as string[];
  const timezone = lib.timezone || "UTC";
  const ownerUserId = lib.workspace.members[0]?.userId;
  if (!ownerUserId) {
    console.warn(`[drip] library ${lib.id} — workspace has no owner, skipping`);
    return;
  }

  const slots = slotsInNextHour(timeSlots, timezone, lib.postsPerDay);
  if (!slots.length) return; // no slots fire in next hour for this library

  // Dedup: skip if we already dripped within this hour window
  // (protects against crash restarts re-firing)
  if (lib.lastDripAt) {
    const lastDrip = lib.lastDripAt.getTime();
    const windowStart = Date.now();
    const windowEnd = windowStart + INTERVAL_MS;
    const alreadyRanThisWindow = lastDrip >= windowStart - INTERVAL_MS && lastDrip < windowEnd;
    // More precise: if lastDripAt is within the current clock-hour, skip
    const nowHour = new Date();
    nowHour.setMinutes(0, 0, 0);
    if (lastDrip >= nowHour.getTime()) {
      console.log(`[drip] library ${lib.id} already dripped this hour — skipping`);
      return;
    }
  }

  // Pick queued items — one per slot, in order
  const items = await prisma.libraryItem.findMany({
    where: { libraryId: lib.id, status: "queued" },
    orderBy: { order: "asc" },
    take: slots.length,
    select: { id: true, text: true, commentText: true, mediaUrls: true, order: true },
  });

  if (!items.length) {
    // No queued items left — mark library exhausted
    await prisma.contentLibrary.update({
      where: { id: lib.id },
      data: { status: "exhausted" },
    });
    console.log(`[drip] library ${lib.id} exhausted — no queued items remain`);
    return;
  }

  let scheduled = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const slot = slots[i];
    if (!slot) break;

    try {
      // Create PostJob
      const job = await prisma.postJob.create({
        data: {
          scheduledFor: slot,
          status: "pending",
          content: JSON.stringify({
            text: item.text,
            mediaUrls: item.mediaUrls as string[],
          }),
          commentText: item.commentText ?? null,
          dryRun: process.env.NODE_ENV !== "production",
          userId: ownerUserId,
          workspaceId: lib.workspaceId,
          targets: { create: accountIds.map((accountId) => ({ accountId })) },
        },
        select: { id: true },
      });

      // Enqueue in BullMQ
      await schedulePostJob(job.id, slot);

      // Mark item as scheduled
      await prisma.libraryItem.update({
        where: { id: item.id },
        data: { status: "scheduled", scheduledJobId: job.id },
      });

      console.log(`[drip] library ${lib.id} → item ${item.id} scheduled at ${slot.toISOString()} (job ${job.id})`);
      scheduled++;
    } catch (err) {
      console.error(`[drip] failed to schedule item ${item.id}:`, err);
      Sentry.captureException(err, { tags: { component: "drip-cron", libraryId: lib.id, itemId: item.id } });
    }
  }

  if (scheduled > 0) {
    await prisma.contentLibrary.update({
      where: { id: lib.id },
      data: { lastDripAt: new Date() },
    });
  }

  console.log(`[drip] library ${lib.id} — scheduled ${scheduled}/${slots.length} slot(s)`);
}

export { run as runDripNow };

export function startDripCron() {
  // Run immediately at startup to catch any missed slots from downtime
  run().catch((e) => console.error("[drip] startup run error:", e));
  setInterval(() => run().catch((e) => console.error("[drip] error:", e)), INTERVAL_MS);
}
