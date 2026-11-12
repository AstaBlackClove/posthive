// What the Content List page says and how it groups: the API's answer, the six statuses a post can be in, the tabs
// a role sees, and the short texts (the subtitle, the banner, a link shortened for a table cell).
// Pure, so it is tested without a screen; the page and components/content-list read it.
import { productionOf, publicationOf } from "./dashboard-data";
import { visibleDays, type CalendarView } from "./calendar-range";
import type { ContentStatusKey } from "./content-status";
import { formatPlanDate } from "./import-rows";
import { monthTitle, shortName } from "./dashboard-format";
import { formatTime, wibDateKey } from "./datetime";
import type { MissingField } from "./submitReadiness";

// ── The API's answer ────────────────────────────────────────────────────────

export type ListFilter = "all" | "draft" | "review" | "rejected" | "pending" | "done" | "failed";

export type ListCounts = Record<ListFilter, number>;

export interface ListItem {
  id: string;
  status: string;
  approvalStatus: string | null;
  scheduledFor: string | null;
  title: string;
  caption: string;
  channels: string[];
  sourceRow: number | null;
  link: string | null;
  designCopy: string;
  category: string | null;
}

export interface ImportSource {
  fileName: string;
  importedAt: string;
  importedBy: string | null;
  count: number;
}

export interface ListAnswer {
  items: ListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  counts: ListCounts;
  /** Only when asked for: null = the workspace has no imported plan. */
  source?: ImportSource | null;
}

export interface ActivityEntry {
  kind: "imported" | "created" | "approved" | "revision" | "failed";
  by: string | null;
  at: string | null;
  note: string | null;
  channel: string | null;
}

export interface PostDetail extends ListItem {
  pillar: string | null;
  owner: string | null;
  accounts: { platform: string; displayName: string }[];
  caption: string;
  captionLength: number;
  commentText: string | null;
  media: string[];
  reviewNote: string | null;
  source: { fileName: string; importedAt: string } | null;
  activity: ActivityEntry[];
  /** The viewer made this post. */
  mine: boolean;
  /** What the post still lacks before it can be sent for review (the server's own rule); empty = complete. */
  missing: MissingField[];
}

// ── The six statuses ────────────────────────────────────────────────────────

/** The names of the content list's statuses. The dashboard's "In review" is "In Review" here, as in the design. */
export const LIST_STATUS: Record<ListFilter, string> = {
  all: "All content",
  draft: "Draft",
  review: "In Review",
  rejected: "Revision Required",
  pending: "Ready to Publish",
  done: "Published",
  failed: "Failed",
};

/** The tab a post is under, which is also its status in this list. */
export function filterOf(post: { status: string; approvalStatus: string | null }): Exclude<ListFilter, "all"> {
  const outcome = publicationOf(post);
  if (outcome === "scheduled") return "pending";
  if (outcome === "published") return "done";
  if (outcome === "failed") return "failed";
  const stage = productionOf(post);
  return stage === "review" ? "review" : stage === "changes" ? "rejected" : "draft";
}

/** The dashboard's status key for each status of the list: its pill's colour and dot. The calendar's legend reads the same map. */
export const PILL_OF: Record<Exclude<ListFilter, "all">, ContentStatusKey> = {
  draft: "brief",
  review: "review",
  rejected: "changes",
  pending: "approved",
  done: "published",
  failed: "failed",
};

/**
 * A post's card on the calendar: the colour of its status's dot as a full 1px stroke, and a soft tint of it behind. The
 * card carries the same colour as its dot, so the status reads across a whole month. Written out so Tailwind sees every
 * class; the card adds `border` for the width.
 */
export const CARD_TONE: Record<Exclude<ListFilter, "all">, string> = {
  draft: "border-neutral-200 bg-neutral-200/15",
  review: "border-brand-600 bg-brand-600/8",
  rejected: "border-status-changes bg-status-changes/8",
  pending: "border-green-600 bg-green-600/8",
  done: "border-blue-600 bg-blue-600/8",
  failed: "border-red-600 bg-red-600/8",
};

/** The dashboard's status key for the same post, for its pill (colour and dot). */
export const pillOf = (post: { status: string; approvalStatus: string | null }): ContentStatusKey => PILL_OF[filterOf(post)];

/** The status as the list names it. */
export const statusOfPost = (post: { status: string; approvalStatus: string | null }): string => LIST_STATUS[filterOf(post)];

// ── What a role sees ────────────────────────────────────────────────────────

export interface RoleView {
  canEditContent: boolean;
  canReview: boolean;
  canSubmitOwn: boolean;
}

/**
 * The statuses a role has cards and tabs for, in the order of the design. Review-only roles (the design team) make
 * no drafts, so they have no Draft; Revision Required is the maker's, so only the people who submit see it.
 */
export function visibleFilters(role: RoleView): Exclude<ListFilter, "all">[] {
  return [
    ...(role.canEditContent ? (["draft"] as const) : []),
    ...(role.canReview || role.canSubmitOwn ? (["review"] as const) : []),
    ...(role.canSubmitOwn ? (["rejected"] as const) : []),
    "pending",
    "done",
    "failed",
  ];
}

// ── Short texts ─────────────────────────────────────────────────────────────

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "docs.google.com/.../env-enforcement": an address short enough for one line of a cell. */
export function shortLink(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    const last = parts.at(-1);
    return `${u.hostname}${last ? `/…/${last}` : ""}`;
  } catch {
    return url;
  }
}

/** "07 Mar 2026 · 08:00" in WIB. */
export function listDate(iso: string): string {
  const d = new Date(iso);
  return `${formatPlanDate(wibDateKey(d))} · ${formatTime(d)}`;
}

/** The line under the title. */
export function listSubtitle(counts: ListCounts, source: ImportSource | null | undefined): string {
  if (counts.all === 0) return "Every post of the workspace, from a quarter plan or made one by one, in one list.";
  if (source && counts.draft === counts.all) {
    return `${plural(counts.all, "post", "posts")} imported from your quarterly plan. Every post starts as Draft.`;
  }
  return `${plural(counts.all, "post", "posts")} in this workspace, soonest first.`;
}

/** The imported file's line: when, by whom, and how many posts came in. */
export function sourceLine(source: ImportSource): string {
  const at = new Date(source.importedAt);
  const when = `Imported ${formatPlanDate(wibDateKey(at))} · ${formatTime(at)}`;
  return [when + (source.importedBy ? ` by ${shortName(source.importedBy)}` : ""), `${plural(source.count, "post", "posts")} imported`, "source row numbers kept as Row #"].join(" · ");
}

/** The yellow banner shows while everything the workspace holds is still a draft and a plan was imported. */
export const showDraftBanner = (counts: ListCounts, source: ImportSource | null | undefined): boolean => Boolean(source) && counts.all > 0 && counts.draft === counts.all;

/** "60 Draft", "2 In Review": how the posts split over the statuses, the ones that have any. */
const statusSplit = (counts: ListCounts): string[] =>
  (["draft", "review", "rejected", "pending", "done", "failed"] as const).filter((f) => counts[f] > 0).map((f) => `${counts[f]} ${LIST_STATUS[f]}`);

/** The footer of the table: "Showing 10 of 60 posts · 60 Draft · Row # = source row in imported file". */
export function footerLine(shown: number, total: number, filter: ListFilter, counts: ListCounts, hasSourceRows: boolean): string {
  const parts = [`Showing ${shown} of ${plural(total, "post", "posts")}`];
  if (filter === "all") parts.push(...statusSplit(counts));
  if (hasSourceRows) parts.push("Row # = source row in imported file");
  return parts.join(" · ");
}

// ── The other two views: calendar and Kanban ────────────────────────────────

/** The three ways to see the list. */
export type ListView = "table" | "calendar" | "kanban";

/** The statuses a Kanban column has: the same six as the tabs, so a post is in the column its pill names. */
export type BoardFilter = Exclude<ListFilter, "all">;

/** Cards a Kanban column lists before "+ N more": a few, so six columns fit one screen height. */
export const BOARD_CARDS = 4;
/** Cards of the one column that is left when a status tab is picked. */
export const BOARD_CARDS_ALONE = 12;

/** The parts of a "YYYY-MM-DD" key, named as the calendar names them: "Sat", "Saturday", "Mar", 7. */
function keyParts(key: string) {
  const d = new Date(`${key}T00:00:00Z`);
  const name = (o: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-US", { ...o, timeZone: "UTC" });
  return { day: d.getUTCDate(), month: name({ month: "short" }), year: d.getUTCFullYear(), weekday: name({ weekday: "short" }), weekdayLong: name({ weekday: "long" }) };
}

/** "Sat" */
export const weekdayName = (key: string): string => keyParts(key).weekday;

/** A "YYYY-MM-DD" key that falls on a Saturday or a Sunday (the calendar draws its posts at 55%). */
export const isWeekend = (key: string): boolean => new Date(`${key}T00:00:00Z`).getUTCDay() % 6 === 0;

/** "Sat, 7 Mar 2026" */
export function dayLabel(key: string): string {
  const p = keyParts(key);
  return `${p.weekday}, ${p.day} ${p.month} ${p.year}`;
}

/** "Thu 12 Mar" */
export function shortDayLabel(key: string): string {
  const p = keyParts(key);
  return `${p.weekday} ${p.day} ${p.month}`;
}

/** The title over the grid: "March 2026", "23 – 29 Mar 2026", "Saturday, 7 Mar 2026". A week may cross a month or a year. */
export function rangeLabel(view: CalendarView, anchor: string): string {
  if (view === "month") return monthTitle(anchor);
  if (view === "day") {
    const p = keyParts(anchor);
    return `${p.weekdayLong}, ${p.day} ${p.month} ${p.year}`;
  }
  const days = visibleDays("week", anchor);
  const a = keyParts(days[0]);
  const b = keyParts(days[days.length - 1]);
  if (a.year !== b.year) return `${a.day} ${a.month} ${a.year} – ${b.day} ${b.month} ${b.year}`;
  return a.month === b.month ? `${a.day} – ${b.day} ${b.month} ${b.year}` : `${a.day} ${a.month} – ${b.day} ${b.month} ${b.year}`;
}

/** The hour of an instant in WIB, 0–23: the row of the week and day grids it sits in. */
export const hourOf = (iso: string): number => Number(formatTime(new Date(iso)).slice(0, 2));

/** The hours the week and day grids list: 08:00 to 17:00 as the design draws them, wider when a post falls outside. */
export function timeRows(postHours: number[]): number[] {
  const first = Math.max(0, Math.min(8, ...postHours.map((h) => h - 1)));
  const last = Math.min(23, Math.max(17, ...postHours.map((h) => h + 1)));
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

/** "08:00" */
export const hourLabel = (hour: number): string => `${String(hour).padStart(2, "0")}:00`;

/** The channels the calendar's filter always lists, as the design draws it. */
const BASE_CHANNELS = ["instagram", "linkedin"];

/**
 * What the calendar's channel filter offers: All and the two channels of the design, any other channel a post in view
 * goes to, and the one picked (so moving to a month without it leaves the filter with something selected).
 */
export function channelOptions(items: { channels: string[] }[], picked: string): string[] {
  const options = new Set(["all", ...BASE_CHANNELS]);
  for (const item of items) for (const channel of item.channels) options.add(channel);
  options.add(picked);
  return [...options];
}

/** The posts by their WIB day, in the order they came (the API sends them by time). Posts with no date are left out. */
export function groupByDay(items: ListItem[]): Map<string, ListItem[]> {
  const map = new Map<string, ListItem[]>();
  for (const item of items) {
    if (!item.scheduledFor) continue;
    const day = wibDateKey(new Date(item.scheduledFor));
    const list = map.get(day);
    if (list) list.push(item);
    else map.set(day, [item]);
  }
  return map;
}

/** The key of one cell of the week and day grids: a WIB day and an hour. */
export const cellKey = (day: string, hour: number): string => `${day} ${hour}`;

/**
 * The posts of the week and day grids by cell, and the hours the grid lists. Each post's day and hour are worked out
 * once here, not once per cell.
 */
export function placeByHour(items: ListItem[]): { cells: Map<string, ListItem[]>; hours: number[] } {
  const cells = new Map<string, ListItem[]>();
  const postHours: number[] = [];
  for (const item of items) {
    if (!item.scheduledFor) continue;
    const hour = hourOf(item.scheduledFor);
    const key = cellKey(wibDateKey(new Date(item.scheduledFor)), hour);
    const list = cells.get(key);
    if (list) list.push(item);
    else cells.set(key, [item]);
    postHours.push(hour);
  }
  return { cells, hours: timeRows(postHours) };
}

/** "1 post", "3 posts", or "No posts": what a day's header says. */
export const postsLabel = (n: number): string => (n === 0 ? "No posts" : plural(n, "post", "posts"));

/** "LinkedIn + Instagram": the channels of a post in one line. */
export const channelsLine = (channels: string[], name: (platform: string) => string): string => channels.map(name).join(" + ");

/** The line in the Day view's header: "1 post · LinkedIn + Instagram · Draft · source Row 1". A day of several posts leaves out what differs between them. */
export function dayLine(items: ListItem[], channelName: (platform: string) => string): string {
  const parts = [postsLabel(items.length)];
  const channels = [...new Set(items.flatMap((i) => i.channels))];
  if (channels.length > 0) parts.push(channelsLine(channels, channelName));
  if (items.length === 1) {
    parts.push(statusOfPost(items[0]));
    if (items[0].sourceRow !== null) parts.push(`source Row ${items[0].sourceRow}`);
  }
  return parts.join(" · ");
}

/** The footer under the calendar: how many posts the grid shows, and the status split of the whole list. */
export function calendarFooter(view: CalendarView, anchor: string, shown: number, filter: ListFilter, counts?: ListCounts): string {
  const where = view === "month" ? `in ${monthTitle(anchor)}` : view === "week" ? `in the week of ${rangeLabel("week", anchor)}` : `on ${dayLabel(anchor)}`;
  const parts = [`Showing ${plural(shown, "post", "posts")} ${where}`];
  if (filter === "all" && counts) parts.push(...statusSplit(counts));
  // the grid places posts by their date: a draft made without one is only in the table
  parts.push("click a post to preview", "posts with no date are in the table");
  return parts.join(" · ");
}

/** The footer under the board: the posts on its cards out of the posts of the list. */
export function boardFooter(shown: number, total: number): string {
  return `Showing ${shown} of ${plural(total, "post", "posts")} · grouped by status · scroll sideways for the rest`;
}

/** What a Kanban column says while it is empty: why nothing is there, not a mood. */
export const BOARD_EMPTY: Record<BoardFilter, string> = {
  draft: "Imported and new posts start here.",
  review: "Submit a draft for review to move it here.",
  rejected: "Posts sent back with reviewer notes.",
  pending: "Approved posts wait here for their time.",
  done: "Posts that went out show up here.",
  failed: "Posts that could not be published show up here.",
};

/** The Day view's "Next step" card: what the person does with the post that is on screen, by its status and their role. */
export function nextStep(post: Pick<ListItem, "status" | "approvalStatus" | "scheduledFor">, role: RoleView): string {
  switch (filterOf(post)) {
    case "draft":
      return role.canSubmitOwn
        ? "Open the post and fill in what it lacks, then submit it for review to move it to In Review."
        : "Open the post to read or edit its content.";
    case "review":
      return role.canReview ? "Open the post to approve it or send it back with a note." : "Waiting for the review. Open the post to see where it stands.";
    case "rejected":
      return role.canSubmitOwn ? "Revision requested. Edit the content to send it for review again." : "Sent back with a note. Open the post to read it.";
    case "pending":
      return post.scheduledFor ? `Approved. It goes out on ${listDate(post.scheduledFor)} WIB.` : "Approved and waiting for its time.";
    case "done":
      return "Published. Open the post to see where it went.";
    case "failed":
      return "Publishing failed. Open the post to see why and try again.";
  }
}

// ── What the drawer says about a post ───────────────────────────────────────

/** "Imported as Draft by Putri A. · 13 Nov 2026, 10:42": what is recorded, in words. */
export function activityText(entry: ActivityEntry, channelName: (platform: string) => string): string {
  const who = entry.by ? shortName(entry.by) : null;
  const at = entry.at ? new Date(entry.at) : null;
  const when = at ? `${formatPlanDate(wibDateKey(at))}, ${formatTime(at)}` : null;
  const lead =
    entry.kind === "imported"
      ? `Imported as Draft${who ? ` by ${who}` : ""}`
      : entry.kind === "created"
        ? `Created${who ? ` by ${who}` : ""}`
        : entry.kind === "approved"
          ? `Approved${who ? ` by ${who}` : ""}`
          : entry.kind === "revision"
            ? `Revision requested${who ? ` by ${who}` : ""}`
            : `Failed on ${entry.channel ? channelName(entry.channel) : "a channel"}`;
  return [lead + (entry.note ? `: ${entry.note}` : ""), when].filter(Boolean).join(" · ");
}

// ── The tiles of the drawer ─────────────────────────────────────────────────

/** The approval line: a draft nobody sent is "Not submitted"; a post made without the review flow needs none. */
export function approvalLabel(post: { status: string; approvalStatus: string | null }): string {
  if (post.approvalStatus === "pending") return "In review";
  if (post.approvalStatus === "rejected") return "Revision requested";
  if (post.approvalStatus === "approved") return "Approved";
  return post.status === "draft" ? "Not submitted" : "Not required";
}

/** The publishing line: where the post is in getting out. */
export function publishingLabel(post: { status: string; approvalStatus: string | null }): string {
  const f = filterOf(post);
  return f === "pending" ? "Scheduled" : f === "done" ? "Published" : f === "failed" ? "Failed" : "Not scheduled";
}

/** "Sat, 07 Mar 2026": the day of a post in WIB. */
export function longDate(iso: string): string {
  const d = new Date(iso);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", weekday: "short" }).format(d);
  return `${weekday}, ${formatPlanDate(wibDateKey(d))}`;
}

/** "08:00 WIB" */
export const timeWib = (iso: string): string => `${formatTime(new Date(iso))} WIB`;

/**
 * The most characters the post's caption may have on its channels: the smallest limit among them, which is the one
 * that decides whether it can go out everywhere. Null when none of its channels has a known limit.
 */
export function captionLimit(channels: string[], limits: Record<string, number>): number | null {
  const known = channels.flatMap((c) => (limits[c] ? [limits[c]] : []));
  return known.length > 0 ? Math.min(...known) : null;
}
