// What the Content List page says and how it groups: the API's answer, the six statuses a post can be in, the tabs
// a role sees, and the short texts (the subtitle, the banner, a link shortened for a table cell).
// Pure, so it is tested without a screen; the page and components/content-list read it.
import { productionOf, publicationOf } from "./dashboard-data";
import type { ContentStatusKey } from "./content-status";
import { formatPlanDate } from "./import-rows";
import { shortName } from "./dashboard-format";
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

/** The dashboard's status key for the same post, for its pill (colour and dot). */
export function pillOf(post: { status: string; approvalStatus: string | null }): ContentStatusKey {
  const f = filterOf(post);
  return f === "pending" ? "approved" : f === "done" ? "published" : f === "failed" ? "failed" : f === "review" ? "review" : f === "rejected" ? "changes" : "brief";
}

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

/** The footer of the table: "Showing 10 of 60 posts · 60 Draft · Row # = source row in imported file". */
export function footerLine(shown: number, total: number, filter: ListFilter, counts: ListCounts, hasSourceRows: boolean): string {
  const parts = [`Showing ${shown} of ${plural(total, "post", "posts")}`];
  if (filter === "all") {
    const split = (["draft", "review", "rejected", "pending", "done", "failed"] as const).filter((f) => counts[f] > 0).map((f) => `${counts[f]} ${LIST_STATUS[f]}`);
    parts.push(...split);
  }
  if (hasSourceRows) parts.push("Row # = source row in imported file");
  return parts.join(" · ");
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
