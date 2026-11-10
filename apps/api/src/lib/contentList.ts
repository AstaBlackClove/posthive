// What the Content List page reads out of a post: the row of the table, the whole post of the drawer, and the
// file a plan came from. Pure, so the rules are tested without a database; routes/jobsList.ts runs the queries.
// Like the dashboard's toPost, a post leaves the server only as these fields: the content JSON never does, it can
// hold a whole design copy.
import { normalizeCategory, pillarFor } from "./contentTypes.js";
import { contentOf, images, text } from "./dashboardData.js";

/** Rows in a page of the table, as the design draws it. */
export const LIST_PAGE_SIZE = 10;
export const LIST_PAGE_MAX = 50;

/** A caption in a row is two lines of a table cell. */
const CAPTION_PREVIEW = 200;
/** The design copy cell of a plan can be a whole text; a row shows its start. */
const COPY_PREVIEW = 160;
/** A caption in the drawer: the longest any platform takes is a few thousand characters. */
const CAPTION_MAX = 5000;

// ── A link from a spreadsheet cell ──────────────────────────────────────────

/**
 * The cell's text as an address the browser may open: http(s) only. A plan file is typed by people, and a cell
 * can hold "javascript:…" or a sentence; neither may become an href. Anything else is null.
 */
export function safeLink(value: unknown): string | null {
  const raw = text(value);
  if (!raw || raw.length > 500 || /\s/.test(raw)) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? raw : null;
  } catch {
    return null;
  }
}

// ── One row of the table ────────────────────────────────────────────────────

export interface ListRecord {
  id: string;
  status: string;
  approvalStatus: string | null;
  scheduledFor: Date | null;
  content: string;
  targets: { account: { platform: string } | null }[];
}

export interface ListItem {
  id: string;
  status: string;
  approvalStatus: string | null;
  /** ISO instant, or null for a draft with no date. */
  scheduledFor: string | null;
  title: string;
  /** The start of the caption. */
  caption: string;
  /** Platform ids: the accounts it goes to, else the channels the plan file named. */
  channels: string[];
  /** The row of the imported file this post came from; null for a post made here. */
  sourceRow: number | null;
  /** The design copy cell as an address, when it is one. */
  link: string | null;
  /** The start of the design copy cell when it is text and not an address. */
  designCopy: string;
  category: string | null;
}

/** Platforms a post goes to: its accounts', else the ones a plan file named. */
export function channelsOf(content: Record<string, unknown>, targets: ListRecord["targets"]): string[] {
  const fromTargets = targets.flatMap((t) => (t.account ? [t.account.platform] : []));
  const fromFile = Array.isArray(content.platforms) ? content.platforms.filter((p): p is string => typeof p === "string") : [];
  return [...new Set(fromTargets.length > 0 ? fromTargets : fromFile)];
}

export const titleOf = (content: Record<string, unknown>): string =>
  text(content.title).slice(0, 200) || text(content.text).slice(0, 80) || "Untitled";

const sourceRowOf = (content: Record<string, unknown>): number | null =>
  typeof content.sourceRow === "number" && Number.isInteger(content.sourceRow) && content.sourceRow > 0 ? content.sourceRow : null;

export function toListItem(job: ListRecord): ListItem {
  const content = contentOf(job.content);
  const link = safeLink(content.designCopy);
  return {
    id: job.id,
    status: job.status,
    approvalStatus: job.approvalStatus,
    scheduledFor: job.scheduledFor ? job.scheduledFor.toISOString() : null,
    title: titleOf(content),
    caption: text(content.text).slice(0, CAPTION_PREVIEW),
    channels: channelsOf(content, job.targets),
    sourceRow: sourceRowOf(content),
    link,
    designCopy: link ? "" : text(content.designCopy).slice(0, COPY_PREVIEW),
    category: text(content.category).slice(0, 60) || null,
  };
}

// ── The file a plan came from ───────────────────────────────────────────────

export interface ImportSource {
  fileName: string;
  /** ISO instant of the import. */
  importedAt: string;
  importedBy: string | null;
  /** Posts that came in with that import, the ones this person may see. */
  count: number;
}

/** The import a post came in with, as `importSource` in its content. Null for a post made here. */
export function importSourceOf(content: Record<string, unknown>): { fileName: string; importedAt: string } | null {
  const source = content.importSource;
  if (!source || typeof source !== "object") return null;
  const { fileName, importedAt } = source as Record<string, unknown>;
  const name = text(fileName);
  const at = text(importedAt);
  return name && at && !Number.isNaN(Date.parse(at)) ? { fileName: name.slice(0, 200), importedAt: new Date(at).toISOString() } : null;
}

/**
 * The text every post of one import carries in its content, to count them: the import's own timestamp, written
 * once per commit. The column is a string, so this is a substring match, and an exact one (an ISO instant has
 * nothing to escape).
 */
export const importMarker = (importedAt: string): string => `"importedAt":${JSON.stringify(importedAt)}`;

// ── The whole post, for the drawer ──────────────────────────────────────────

export interface DetailRecord extends ListRecord {
  commentText: string | null;
  createdAt: Date;
  reviewNote: string | null;
  reviewedAt: Date | null;
  reviewedBy: { name: string } | null;
  user: { name: string } | null;
  targets: { status: string; error: string | null; account: { platform: string; displayName: string } | null }[];
}

export interface ActivityEntry {
  kind: "imported" | "created" | "approved" | "revision" | "failed";
  by: string | null;
  /** ISO instant; null when nothing recorded when it happened (a failure shows the attempt, not a time). */
  at: string | null;
  /** The reviewer's note, or why a channel failed. */
  note: string | null;
  /** The platform of a failure. */
  channel: string | null;
}

export interface PostDetail extends ListItem {
  pillar: string | null;
  /** Who is asked about the post: the plan's PIC, else the person who made it. */
  owner: string | null;
  accounts: { platform: string; displayName: string }[];
  /** The whole caption (cut at a few thousand characters) and its length. */
  caption: string;
  captionLength: number;
  commentText: string | null;
  media: string[];
  reviewNote: string | null;
  source: { fileName: string; importedAt: string } | null;
  activity: ActivityEntry[];
}

/** What is recorded about a post, oldest first: when it came in, who answered its review, what failed. */
export function activityOf(job: DetailRecord, content: Record<string, unknown>): ActivityEntry[] {
  const out: ActivityEntry[] = [];
  const source = importSourceOf(content);
  const by = job.user?.name ?? null;
  out.push(
    source
      ? { kind: "imported", by, at: source.importedAt, note: null, channel: null }
      : { kind: "created", by, at: job.createdAt.toISOString(), note: null, channel: null },
  );

  if (job.reviewedAt) {
    const reviewer = job.reviewedBy?.name ?? null;
    if (job.approvalStatus === "rejected") out.push({ kind: "revision", by: reviewer, at: job.reviewedAt.toISOString(), note: job.reviewNote, channel: null });
    else if (job.approvalStatus === "approved") out.push({ kind: "approved", by: reviewer, at: job.reviewedAt.toISOString(), note: null, channel: null });
  }

  for (const t of job.targets) {
    if (t.error && t.account) out.push({ kind: "failed", by: null, at: null, note: t.error.slice(0, 300), channel: t.account.platform });
  }
  return out;
}

export function toDetail(job: DetailRecord): PostDetail {
  const content = contentOf(job.content);
  const item = toListItem(job);
  const category = normalizeCategory(content.category);
  const caption = text(content.text);
  return {
    ...item,
    pillar: text(content.pillar) || (category ? pillarFor(category) : null),
    owner: text(content.picContent) || job.user?.name || null,
    accounts: job.targets.flatMap((t) => (t.account ? [t.account] : [])),
    caption: caption.slice(0, CAPTION_MAX),
    captionLength: caption.length,
    commentText: job.commentText,
    media: images(content.mediaUrls).slice(0, 10),
    reviewNote: job.reviewNote,
    source: importSourceOf(content),
    activity: activityOf(job, content),
  };
}
