// What the dashboard reads out of a workspace: the WIB calendar (the app schedules in WIB), the
// where-fragments behind each list and count, and the shape of one post in a list.
// Pure, so the rules are tested without a database; routes/dashboard.ts runs the queries.
import type { Prisma } from "@prisma/client";
import { CATEGORIES, normalizeCategory, type Category } from "./contentTypes.js";
import { isPublishedInFile } from "./import/planningImport.js";
import { STATUS_GROUPS } from "./jobFilters.js";

// ── WIB calendar ────────────────────────────────────────────────────────────
// Jakarta has no daylight saving, so a fixed +07:00 is always right (see apps/web/src/lib/datetime.ts).

const WIB_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The WIB calendar day of an instant, "YYYY-MM-DD". */
export function wibKey(d: Date): string {
  return new Date(d.getTime() + WIB_MS).toISOString().slice(0, 10);
}

/** The instant a WIB day starts. */
export function wibStart(key: string): Date {
  return new Date(`${key}T00:00:00+07:00`);
}

/** The years a calendar can be asked about. Year 0000 is a real day to JavaScript, but its WIB start is a negative year Postgres refuses. */
const FIRST_YEAR = 2000;
const LAST_YEAR = 2100;

/** A "YYYY-MM-DD" that is a real day (not 2026-02-31) in a year the calendar covers. */
export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  if (year < FIRST_YEAR || year > LAST_YEAR) return false;
  const t = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === value;
}

export function addDays(key: string, days: number): string {
  return new Date(new Date(`${key}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

const firstOfMonth = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}-01`;

/** The calendar quarter a day is in: "Q4 2026", the first day, and the first day AFTER it. */
export function quarterOf(key: string): { label: string; start: string; end: string } {
  const [y, m] = key.split("-").map(Number);
  const q = Math.floor((m - 1) / 3);
  const next = q === 3 ? firstOfMonth(y + 1, 1) : firstOfMonth(y, (q + 1) * 3 + 1);
  return { label: `Q${q + 1} ${y}`, start: firstOfMonth(y, q * 3 + 1), end: next };
}

/** The calendar month a day is in: its first day and the first day after it. */
export function monthOf(key: string): { start: string; end: string } {
  const [y, m] = key.split("-").map(Number);
  return { start: firstOfMonth(y, m), end: m === 12 ? firstOfMonth(y + 1, 1) : firstOfMonth(y, m + 1) };
}

// ── What each list holds ────────────────────────────────────────────────────

/** Rows a page of a dashboard list shows (the table under the calendar). The count next to it is the true total. */
export const LIST_LIMIT = 10;
/** A calendar range answers with at most this many posts. */
export const CALENDAR_LIMIT = 400;
/** Longest range the calendar asks for: a six-week month grid is 42 days. */
export const MAX_CALENDAR_DAYS = 42;
/** A draft due within this many days and still not scheduled is "at risk". */
export const RISK_DAYS = 3;
/**
 * A scheduled post still `pending` this long after its time did not go out: the worker runs it within
 * seconds, and stuckJobCron re-queues one that is 5 minutes late, so 15 minutes means that did not work.
 */
export const OVERDUE_MINUTES = 15;
/** "Recent activity" is what changed in this many days. */
export const ACTIVITY_DAYS = 7;

export const LIST_KINDS = ["upcoming", "attention", "risk", "activity"] as const;
export type ListKind = (typeof LIST_KINDS)[number];
export const isListKind = (value: unknown): value is ListKind => LIST_KINDS.includes(value as ListKind);

type Where = Prisma.PostJobWhereInput;

const draft: Where = { status: "draft" };
const notRejected: Where = { OR: [{ approvalStatus: null }, { approvalStatus: { not: "rejected" } }] };

/** Plain drafts: no approval flow in play (the Posts page's Draft filter). */
export const plainDraft: Where = {
  status: "draft",
  OR: [{ approvalStatus: null }, { approvalStatus: { notIn: ["pending", "rejected"] } }],
};

/**
 * A plain draft with a date still ahead and at least one account. It is NOT checked for a caption, a
 * category or media, which the server needs before it accepts the post for review (submitReadiness):
 * the count says what can be known from the columns, and the card is named for that, not for "ready".
 * A draft whose date has passed is left out (an archive draft, or one that slipped).
 */
export function readyToSchedule(now: Date): Where {
  return { AND: [plainDraft, { scheduledFor: { gte: now } }, { targets: { some: {} } }] };
}

/**
 * The posts behind each tab, `base` being the workspace and what the role may see.
 * upcoming: scheduled or draft from today on, and drafts with no date yet.
 * attention: failed, scheduled but long overdue, sent back for changes, or a draft whose date has passed. A draft that came in
 * with a plan file is left out of the last one: an import saves past dates as archive drafts on purpose.
 * risk: a draft due in the next few days that nobody has scheduled yet.
 * activity: whatever changed in the last week.
 */
export function listWhere(base: Where, kind: ListKind, now: Date): Where {
  const todayStart = wibStart(wibKey(now));
  let extra: Where;
  if (kind === "upcoming") {
    extra = {
      OR: [
        { status: { in: ["draft", ...STATUS_GROUPS.pending] }, scheduledFor: { gte: todayStart } },
        { status: "draft", scheduledFor: null },
      ],
    };
  } else if (kind === "attention") {
    extra = {
      OR: [
        { status: { in: [...STATUS_GROUPS.failed] } },
        { status: "pending", scheduledFor: { lt: new Date(now.getTime() - OVERDUE_MINUTES * 60 * 1000) } },
        { status: "draft", approvalStatus: "rejected" },
        { status: "draft", importKey: null, scheduledFor: { lt: now } },
      ],
    };
  } else if (kind === "risk") {
    extra = { AND: [draft, { scheduledFor: { gte: now, lt: new Date(now.getTime() + RISK_DAYS * DAY_MS) } }, notRejected] };
  } else {
    extra = { updatedAt: { gte: new Date(now.getTime() - ACTIVITY_DAYS * DAY_MS) } };
  }
  return { AND: [base, extra] };
}

/** Posts of one person still being worked on or waiting to go out, scheduled for one WIB day: "my tasks today". */
export function tasksWhere(base: Where, userId: string, key: string): Where {
  return { AND: [dayWhere(base, key), { userId, status: { in: ["draft", ...STATUS_GROUPS.pending] } }] };
}

/** Posts scheduled for one WIB day, whatever state they are in. */
export function dayWhere(base: Where, key: string): Where {
  return { AND: [base, { scheduledFor: { gte: wibStart(key), lt: wibStart(addDays(key, 1)) } }] };
}

/** Posts scheduled in a range of WIB days, both ends included. */
export function rangeWhere(base: Where, from: string, to: string): Where {
  return { AND: [base, { scheduledFor: { gte: wibStart(from), lt: wibStart(addDays(to, 1)) } }] };
}

// ── The quarter, per content category ───────────────────────────────────────

/**
 * Most posts the milestone count reads. It reads only posts that carry a category or a "Published" plan row (see
 * quarterRows in routes/dashboard.ts): a plan, not the thousands of automatic drip posts. Past this the bars undercount.
 * shortcut: a quarter with this many categorized posts needs a category column and a GROUP BY instead.
 */
export const QUARTER_LIMIT = 5000;

export interface Milestone {
  category: Category;
  /** Posts of this category with a date in the quarter: its target. */
  planned: number;
  /** Out: published by the app, or a plan row the file already marked Published. */
  posted: number;
  /** Waiting for their time. */
  scheduled: number;
}

export interface QuarterCount {
  planned: number;
  published: number;
  milestones: Milestone[];
  /** Posts of the quarter that are in no milestone: no category, an unknown one, or not read. */
  uncategorized: number;
}

/**
 * What the quarter holds. The totals come from the status counts of ALL its posts, so they are exact however many
 * posts there are. The milestones come from `rows`, the posts that have a category or a "Published" plan row.
 * The target of a category is what the plan has in it, so the bar moves when the plan does. An import saves every
 * row as a draft, so a draft whose plan row says Published counts as out; a failed post does not.
 * Largest target first, ties in the order of the content types list.
 */
export function quarterCount(byStatus: { status: string; _count: number }[], rows: { status: string; content: string }[]): QuarterCount {
  const isDone = (status: string) => (STATUS_GROUPS.done as readonly string[]).includes(status);
  const planned = byStatus.reduce((sum, r) => sum + r._count, 0);
  let published = byStatus.filter((r) => isDone(r.status)).reduce((sum, r) => sum + r._count, 0);

  const byCategory = new Map<Category, Milestone>();
  for (const { status, content } of rows) {
    const json = contentOf(content);
    const fromFile = status === "draft" && isPublishedInFile(json.sourceStatus);
    // a post that went out by the app is already in the status counts; only the plan rows are added
    if (fromFile) published += 1;

    const category = normalizeCategory(json.category);
    if (!category) continue;
    const milestone = byCategory.get(category) ?? { category, planned: 0, posted: 0, scheduled: 0 };
    milestone.planned += 1;
    if (isDone(status) || fromFile) milestone.posted += 1;
    else if ((STATUS_GROUPS.pending as readonly string[]).includes(status)) milestone.scheduled += 1;
    byCategory.set(category, milestone);
  }

  const milestones = [...byCategory.values()].sort((a, b) => b.planned - a.planned || CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category));
  const inBars = milestones.reduce((sum, m) => sum + m.planned, 0);
  return { planned, published, milestones, uncategorized: planned - inBars };
}

// ── One post ────────────────────────────────────────────────────────────────

export interface DashboardPost {
  id: string;
  title: string;
  status: string;
  approvalStatus: string | null;
  /** ISO instant, or null for a draft with no date. */
  scheduledFor: string | null;
  /** Platform ids: the accounts it goes to, else the channels a plan file named. */
  channels: string[];
  owner: string | null;
  /** The content category a plan file named ("Industry insight"), for the line under a title. */
  category: string | null;
  /** The first image of the post, an upload path or an http(s) URL; null when it has none (a video is not a picture). */
  thumbnail: string | null;
}

export interface PostRecord {
  id: string;
  status: string;
  approvalStatus: string | null;
  scheduledFor: Date | null;
  content: string;
  user: { name: string } | null;
  targets: { account: { platform: string } | null }[];
}

export const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** The content JSON of a post as an object. A broken column, "null", a number or an array is an empty post, not an error. */
export function contentOf(json: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(json);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  } catch { /* fall through */ }
  return {};
}

/** A title is a line in a list; a plan cell can hold a paragraph. */
const TITLE_MAX = 200;
const VIDEO = /\.(mp4|mov|webm|quicktime)(\?|$)/i;
// The shape storage.ts gives a file: /uploads/<name>.<ext> or /uploads/<folder>/<name>.<ext>. Anything else (a "..", an
// encoded "%2e%2e") would make the viewer's browser ask the API for a path the author chose, with the viewer's cookie.
const UPLOAD_PATH = /^\/uploads\/(?:[\w-]+\/)?[\w-]+\.\w+$/;

/** The media URLs that are pictures the browser can show: one of our uploads or an http(s) address, not a video. */
export function images(mediaUrls: unknown): string[] {
  if (!Array.isArray(mediaUrls)) return [];
  return mediaUrls.filter(
    (url): url is string => typeof url === "string" && url.length <= 500 && !VIDEO.test(url) && (UPLOAD_PATH.test(url) || /^https?:\/\//i.test(url)),
  );
}

const firstImage = (mediaUrls: unknown): string | null => images(mediaUrls)[0] ?? null;

/** What a list needs from a post. The content JSON stays on the server: it can hold a long design copy. */
export function toPost(job: PostRecord): DashboardPost {
  const content = contentOf(job.content);

  const fromTargets = job.targets.flatMap((t) => (t.account ? [t.account.platform] : []));
  const fromFile = Array.isArray(content.platforms) ? content.platforms.filter((p): p is string => typeof p === "string") : [];
  const channels = [...new Set(fromTargets.length > 0 ? fromTargets : fromFile)];

  return {
    id: job.id,
    title: text(content.title).slice(0, TITLE_MAX) || text(content.text).slice(0, 80) || "Untitled",
    status: job.status,
    approvalStatus: job.approvalStatus,
    scheduledFor: job.scheduledFor ? job.scheduledFor.toISOString() : null,
    channels,
    owner: text(content.picContent) || job.user?.name || null,
    category: text(content.category).slice(0, 60) || null,
    thumbnail: firstImage(content.mediaUrls),
  };
}
