// The "Review & fix" and "Import complete" steps of the plan import, as plain functions:
// what to call a row, what to say under its title, which tab it is in, in what order, which
// dates to suggest for a date that does not exist, and what the success screen counts.
import { normalizeCategory } from "./contentTypes";
import { IMPORT_PLATFORMS, issuesOf, type FieldIssue, type ReviewRow } from "./importReview";
import { platformLabel } from "./platforms";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-11-02" → "02 Nov 2026". The import schedules a post at 09:00 WIB unless the file says otherwise. */
export function formatPlanDate(key: string): string {
  const m = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return key;
  return `${m[3]} ${MONTHS[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
}

export const DEFAULT_POST_TIME = "09:00";

// ── What a row is ───────────────────────────────────────────────────────────

export type RowStatus =
  | "valid"
  | "fixed"
  | "invalid-date"
  | "invalid-title"
  | "missing-info"
  | "unsupported-channel"
  | "duplicate"
  | "excluded";

export type RowTone = "success" | "danger" | "warning" | "neutral";

export interface RowState {
  status: RowStatus;
  /** The badge text: "Valid", "Valid · Fixed", "Invalid date", "Duplicate · Excluded"… */
  label: string;
  tone: RowTone;
  /** The row is part of the batch and has something to fix. */
  needsAttention: boolean;
  /** One line under the title, only when something is wrong or the row was set aside. */
  note: string | null;
}

const isDuplicateMessage = (message: string) => /^(Same as row|Already imported)/.test(message);
const stripDot = (message: string) => message.replace(/\.$/, "");

function dateNote(row: ReviewRow): string {
  const raw = String(row.details.rawPostDate ?? row.fields.postDate ?? "");
  // A date that has the shape of a date but a day or month that is not on the calendar
  return /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(raw) ? `Date "${raw}" doesn't exist` : `Date "${raw}" can't be read`;
}

function channelNote(row: ReviewRow, issue: FieldIssue): string {
  const named = String(row.details.platformLabel ?? "") || issue.message.replace(/^Unsupported channel:\s*/, "").replace(/\.$/, "");
  return `"${named}" isn't a supported channel`;
}

/** What a row is right now, from the importer's findings plus the user's edits. */
export function rowState(row: ReviewRow, all: ReviewRow[], serverRowErrors?: ReadonlyMap<number, FieldIssue[]>): RowState {
  const { errors } = issuesOf(row, all, serverRowErrors);

  if (row.removed) {
    const duplicate = row.duplicateKind !== null;
    const unsupported = row.serverErrors.some((e) => e.field === "platforms");
    return {
      status: "excluded",
      label: duplicate ? "Duplicate · Excluded" : unsupported ? "Unsupported · Excluded" : "Excluded",
      tone: "warning",
      needsAttention: false,
      note: row.duplicateReason ? stripDot(row.duplicateReason) : null,
    };
  }

  const first = errors[0];
  if (!first) {
    // A row the file had a problem in, now fixed by the user
    const wasWrong = row.serverErrors.length > 0 || row.duplicateKind !== null;
    return wasWrong
      ? { status: "fixed", label: "Valid · Fixed", tone: "success", needsAttention: false, note: null }
      : { status: "valid", label: "Valid", tone: "success", needsAttention: false, note: null };
  }

  const base = { tone: "danger" as const, needsAttention: true };
  if (first.field === "postDate") {
    const unreadable = row.fields.postDate === "" && !row.details.rawPostDate;
    return unreadable
      ? { ...base, status: "missing-info", label: "Missing required info", note: stripDot(first.message) }
      : { ...base, status: "invalid-date", label: "Invalid date", note: dateNote(row) };
  }
  if (first.field === "platforms") {
    return /^Unsupported channel/.test(first.message)
      ? { ...base, status: "unsupported-channel", label: "Unsupported channel", note: channelNote(row, first) }
      : { ...base, status: "missing-info", label: "Missing required info", note: stripDot(first.message) };
  }
  if (isDuplicateMessage(first.message)) {
    return { status: "duplicate", label: "Duplicate", tone: "warning", needsAttention: true, note: stripDot(first.message) };
  }
  if (/characters or fewer/.test(first.message)) {
    return { ...base, status: "invalid-title", label: "Invalid title", note: stripDot(first.message) };
  }
  return { ...base, status: "missing-info", label: "Missing required info", note: stripDot(first.message) };
}

// ── The table: tabs, order, pages ───────────────────────────────────────────

export type RowTab = "all" | "valid" | "attention" | "excluded";

export interface Classified {
  row: ReviewRow;
  state: RowState;
}

export function classify(rows: ReviewRow[], serverRowErrors?: ReadonlyMap<number, FieldIssue[]>): Classified[] {
  return rows.map((row) => ({ row, state: rowState(row, rows, serverRowErrors) }));
}

export function tabCounts(items: Classified[]): Record<RowTab, number> {
  return {
    all: items.length,
    valid: items.filter((i) => !i.row.removed && !i.state.needsAttention).length,
    attention: items.filter((i) => i.state.needsAttention).length,
    excluded: items.filter((i) => i.row.removed).length,
  };
}

export function inTab(item: Classified, tab: RowTab): boolean {
  if (tab === "all") return true;
  if (tab === "excluded") return item.row.removed;
  if (tab === "attention") return item.state.needsAttention;
  return !item.row.removed && !item.state.needsAttention;
}

/** Rows to fix first, then the ones set aside, then the valid ones; by file row inside each group. */
export function pinIssues(items: Classified[]): Classified[] {
  const rank = (i: Classified) => (i.state.needsAttention ? 0 : i.row.removed ? 1 : 2);
  return [...items].sort((a, b) => rank(a) - rank(b) || a.row.sourceRow - b.row.sourceRow);
}

export const PAGE_SIZE = 10;

export interface Page<T> {
  items: T[];
  /** 1-based, kept inside 1..pageCount. */
  page: number;
  pageCount: number;
  /** "Showing 11–20 of 26": the first and last position shown, 1-based; 0 when empty. */
  from: number;
  to: number;
  total: number;
}

export function paginate<T>(list: T[], page: number, size = PAGE_SIZE): Page<T> {
  const pageCount = Math.max(1, Math.ceil(list.length / size));
  const current = Math.min(Math.max(1, Math.trunc(page) || 1), pageCount);
  const start = (current - 1) * size;
  const items = list.slice(start, start + size);
  return { items, page: current, pageCount, from: items.length ? start + 1 : 0, to: start + items.length, total: list.length };
}

/** The page numbers to show: all when there are few, else the first, the last and the ones around the current. */
export function pageNumbers(page: number, pageCount: number): Array<number | "gap"> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const wanted = new Set([1, pageCount, page - 1, page, page + 1]);
  const out: Array<number | "gap"> = [];
  let last = 0;
  for (const n of [...wanted].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b)) {
    if (n - last > 1) out.push("gap");
    out.push(n);
    last = n;
  }
  return out;
}

// ── What a row shows ────────────────────────────────────────────────────────

/** The channel cell: the names to show, and whether the file's own text is shown (a channel it could not read). */
export function channelCell(row: ReviewRow): { names: string[]; platforms: string[]; unreadable: boolean } {
  const unreadable = row.serverErrors.some((e) => e.field === "platforms") && row.fields.platforms.length === 0;
  if (unreadable) {
    const raw = String(row.details.platformLabel ?? "").trim();
    return { names: raw ? [raw] : [], platforms: [], unreadable: true };
  }
  return { names: row.fields.platforms.map(platformLabel), platforms: row.fields.platforms, unreadable: false };
}

/** The date cell: "18 Nov 2026 · 09:00", or the file's own text when it could not be read. */
export function dateCell(row: ReviewRow): { text: string; unreadable: boolean } {
  if (row.fields.postDate) return { text: `${formatPlanDate(row.fields.postDate)} · ${DEFAULT_POST_TIME}`, unreadable: false };
  const raw = String(row.details.rawPostDate ?? "");
  return { text: raw, unreadable: true };
}

export function categoryLabel(category: string | null | undefined): string | null {
  const raw = category?.trim();
  if (!raw) return null;
  return normalizeCategory(raw) ?? raw;
}

export const picOf = (row: ReviewRow): string | null => {
  const pic = row.details.picContent;
  return typeof pic === "string" && pic.trim() ? pic.trim() : null;
};

// ── A date that does not exist ──────────────────────────────────────────────

const key = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export interface DateSuggestion {
  /** "November has 30 days." / "There is no month 25." */
  note: string;
  /** Up to two YYYY-MM-DD keys, the likely ones first. */
  dates: string[];
}

/**
 * Dates to offer for a cell that has the shape of a date but is not one. A day past the end of
 * its month (31/11/2026) → the last day of that month and the first of the next. A month past 12
 * with a day up to 12 (25/12 read as month 25) is probably day and month swapped → the swap.
 * Anything else has no suggestion.
 */
export function suggestDates(raw: string): DateSuggestion | null {
  const m = raw.trim().match(/^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})/);
  if (!m) return null;
  const [a, b, c] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const yearFirst = m[1].length === 4;
  const [year, month, day] = yearFirst ? [a, b, c] : [c, b, a];
  if (String(year).length !== 4 || year < 1900 || day < 1 || month < 1) return null;

  if (month <= 12) {
    const days = daysIn(year, month);
    if (day <= days) return null; // a real date: nothing to suggest
    const next = month === 12 ? key(year + 1, 1, 1) : key(year, month + 1, 1);
    return { note: `${MONTHS_FULL[month - 1]} has ${days} days.`, dates: [key(year, month, days), next] };
  }

  if (day <= 12) {
    return { note: `There is no month ${month}.`, dates: [key(year, day, month)] };
  }
  return null;
}

// ── "Import complete" ───────────────────────────────────────────────────────

export interface ChannelBreakdown {
  platform: string;
  label: string;
  /** "Case Study", or "No category". */
  category: string;
  count: number;
}

export interface NeedsInfo {
  sourceRow: number;
  title: string;
  /** "No caption yet · No category" */
  detail: string;
}

export interface ImportSummary {
  imported: number;
  /** The channels the batch goes to, in the order of IMPORT_PLATFORMS. */
  channels: string[];
  channelsLine: string;
  breakdown: ChannelBreakdown[];
  /** The earliest date of the batch that is still ahead (YYYY-MM-DD), or null. */
  firstLive: string | null;
  needsInfo: NeedsInfo[];
}

const list = (items: string[]) => (items.length <= 2 ? items.join(" & ") : `${items.slice(0, -1).join(", ")} & ${items[items.length - 1]}`);

/** What was added, from the rows kept in the batch (the ones the commit saved). */
export function summarizeImport(rows: ReviewRow[], accountCount: Record<string, number>, todayKey: string): ImportSummary {
  const kept = rows.filter((r) => !r.removed);
  const platformOrder = new Map<string, number>(IMPORT_PLATFORMS.map((p, i) => [p, i]));

  const channelSet = new Set<string>();
  const counts = new Map<string, ChannelBreakdown>();
  for (const row of kept) {
    const category = categoryLabel(row.fields.category) ?? "No category";
    for (const platform of row.fields.platforms) {
      channelSet.add(platform);
      const id = `${platform}|${category}`;
      const entry = counts.get(id) ?? { platform, label: platformLabel(platform), category, count: 0 };
      entry.count += 1;
      counts.set(id, entry);
    }
  }
  const channels = [...channelSet].sort((a, b) => (platformOrder.get(a) ?? 99) - (platformOrder.get(b) ?? 99));
  const breakdown = [...counts.values()].sort(
    (a, b) => (platformOrder.get(a.platform) ?? 99) - (platformOrder.get(b.platform) ?? 99) || b.count - a.count || a.category.localeCompare(b.category),
  );

  const ahead = kept.map((r) => r.fields.postDate).filter((d) => d && d >= todayKey).sort();

  const needsInfo: NeedsInfo[] = [];
  for (const row of kept) {
    const reasons: string[] = [];
    if (!row.fields.caption.trim()) reasons.push("No caption yet");
    if (!normalizeCategory(row.fields.category ?? "")) reasons.push("No category");
    for (const p of row.fields.platforms) {
      if (p === "website") reasons.push("Website has no social target");
      else if (!accountCount[p]) reasons.push(`No ${platformLabel(p)} account connected`);
      else if (accountCount[p] > 1) reasons.push(`Choose a ${platformLabel(p)} account`);
    }
    if (row.fields.postDate && row.fields.postDate < todayKey) reasons.push("Date has passed");
    if (reasons.length) needsInfo.push({ sourceRow: row.sourceRow, title: row.fields.title.trim(), detail: reasons.slice(0, 2).join(" · ") });
  }

  return {
    imported: kept.length,
    channels: channels.map(platformLabel),
    channelsLine: list(channels.map(platformLabel)),
    breakdown,
    firstLive: ahead[0] ?? null,
    needsInfo,
  };
}
