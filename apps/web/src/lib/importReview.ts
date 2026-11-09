// Review step of the plan import (the table where rows are fixed or removed).
// The field rules mirror apps/api/src/lib/import/reviewRows.ts; keep both identical.
// The server checks everything again on commit.
import { normalizeCategory } from "./contentTypes";

export const IMPORT_PLATFORMS = ["linkedin", "instagram", "website"] as const;
export const MAX_TITLE = 200;

export type ImportField = "title" | "postDate" | "platforms" | "category" | "row";
export interface FieldIssue { field: ImportField; message: string }

/** The fields the review step lets the user change. */
export interface ReviewFields {
  title: string;
  /** YYYY-MM-DD, or "" when the file's date could not be read. */
  postDate: string;
  platforms: string[];
  category: string | null;
  caption: string;
}

/** A row as the preview endpoint returns it. */
export interface ServerRow {
  sourceRow: number;
  status: "valid" | "invalid" | "duplicate";
  fields: ReviewFields;
  errors: FieldIssue[];
  warnings: string[];
  duplicateReason: string | null;
  /** "workspace": already imported before. "file": a copy of an earlier row of this file. */
  duplicateKind: "file" | "workspace" | null;
  details: Record<string, string | number | null | undefined>;
}

export interface ReviewRow {
  sourceRow: number;
  /** Values as the file had them. */
  original: ReviewFields;
  /** Values after the user's edits. */
  fields: ReviewFields;
  /** Problems the server found in the file, per field. */
  serverErrors: FieldIssue[];
  duplicateReason: string | null;
  duplicateKind: "file" | "workspace" | null;
  warnings: string[];
  details: ServerRow["details"];
  /** Left out of the batch. Already-imported rows start out removed. */
  removed: boolean;
}

export function buildReviewRows(rows: ServerRow[]): ReviewRow[] {
  return rows.map((r) => ({
    sourceRow: r.sourceRow,
    original: r.fields,
    fields: r.fields,
    serverErrors: r.errors,
    duplicateReason: r.status === "duplicate" ? r.duplicateReason : null,
    duplicateKind: r.status === "duplicate" ? r.duplicateKind : null,
    warnings: r.warnings,
    details: r.details,
    removed: r.status === "duplicate" && r.duplicateKind === "workspace",
  }));
}

function isRealDate(value: string): boolean {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const check = new Date(Date.UTC(y, mo - 1, d));
  return check.getUTCFullYear() === y && check.getUTCMonth() === mo - 1 && check.getUTCDate() === d;
}

/** Problems that block the import. An unknown category is only a warning (see issuesOf). */
export function validateFields(f: ReviewFields): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const title = f.title.trim();
  if (!title) issues.push({ field: "title", message: "Content title is required." });
  else if (title.length > MAX_TITLE) issues.push({ field: "title", message: `Content title must be ${MAX_TITLE} characters or fewer.` });

  const date = f.postDate.trim();
  if (!date) issues.push({ field: "postDate", message: "Publish date is required." });
  else if (!isRealDate(date)) issues.push({ field: "postDate", message: `Publish date isn't valid: "${date}".` });

  const unknown = f.platforms.filter((p) => !(IMPORT_PLATFORMS as readonly string[]).includes(p));
  if (unknown.length > 0) issues.push({ field: "platforms", message: `Unsupported channel: ${unknown.join(", ")}.` });
  else if (f.platforms.length === 0) issues.push({ field: "platforms", message: "Channel is required." });
  return issues;
}

const keyOf = (f: ReviewFields) =>
  [f.title.trim().toLowerCase().replace(/\s+/g, " "), f.postDate.trim(), [...f.platforms].sort().join("+")].join("|");

const sameKey = (a: ReviewFields, b: ReviewFields) => keyOf(a) === keyOf(b);

/**
 * For each post (title, date, channels) the lowest file row that is kept and valid: a later row with
 * the same post is a copy of it. Built once for the whole batch, so checking every row stays O(n)
 * (scanning the earlier rows for each row took seconds at the 1,000-row limit).
 */
export function duplicateIndex(all: ReviewRow[]): Map<string, number> {
  const first = new Map<string, number>();
  for (const other of all) {
    if (other.removed || validateFields(other.fields).length > 0) continue;
    const key = keyOf(other.fields);
    const seen = first.get(key);
    if (seen === undefined || other.sourceRow < seen) first.set(key, other.sourceRow);
  }
  return first;
}

/** True when the user changed this field from what the file had. */
export const fieldChanged = (row: ReviewRow, field: keyof ReviewFields) =>
  JSON.stringify(row.fields[field]) !== JSON.stringify(row.original[field]);

/**
 * What is wrong with a row right now. A problem the server found stays until the user
 * edits that field; after that the web rules decide. `serverRowErrors` holds the
 * problems a refused commit sent back.
 */
export function issuesOf(
  row: ReviewRow,
  all: ReviewRow[],
  serverRowErrors?: ReadonlyMap<number, FieldIssue[]>,
  /** From duplicateIndex(all). Pass it when checking many rows; alone, it is built here. */
  index: ReadonlyMap<string, number> = duplicateIndex(all),
): { errors: FieldIssue[]; warnings: string[] } {
  const errors: FieldIssue[] = [];
  const own = validateFields(row.fields);
  for (const issue of own) {
    const fromFile = row.serverErrors.find((e) => e.field === issue.field);
    errors.push(fromFile && !fieldChanged(row, issue.field as keyof ReviewFields) ? fromFile : issue);
  }

  if (errors.length === 0) {
    const keyUnchanged = sameKey(row.fields, row.original);
    if (row.duplicateReason && row.duplicateKind === "workspace" && keyUnchanged) {
      errors.push({ field: "title", message: row.duplicateReason });
    } else {
      const first = index.get(keyOf(row.fields));
      if (first !== undefined && first < row.sourceRow) errors.push({ field: "title", message: `Same as row ${first} in this file.` });
    }
  }

  const fromServer = serverRowErrors?.get(row.sourceRow);
  if (fromServer && errors.length === 0 && sameKey(row.fields, row.original)) errors.push(...fromServer);

  const warnings = [...row.warnings];
  const category = row.fields.category?.trim();
  if (category && !isKnownCategory(category)) {
    warnings.push(`Category "${category}" isn't recognised. Pick a category before sending for review.`);
  }
  return { errors, warnings };
}

const isKnownCategory = (c: string) => normalizeCategory(c) !== null;

export interface ReviewSummary {
  total: number;
  valid: number;
  needsFix: number;
  removed: number;
  duplicates: number;
}

export function reviewSummary(rows: ReviewRow[], serverRowErrors?: ReadonlyMap<number, FieldIssue[]>): ReviewSummary {
  const kept = rows.filter((r) => !r.removed);
  const index = duplicateIndex(rows);
  const needsFix = kept.filter((r) => issuesOf(r, rows, serverRowErrors, index).errors.length > 0).length;
  return {
    total: rows.length,
    valid: kept.length - needsFix,
    needsFix,
    removed: rows.length - kept.length,
    duplicates: rows.filter((r) => r.duplicateReason !== null).length,
  };
}

/** Import is on only when at least one row is kept and every kept row is valid. */
export function canImport(rows: ReviewRow[], serverRowErrors?: ReadonlyMap<number, FieldIssue[]>): boolean {
  const kept = rows.filter((r) => !r.removed);
  const index = duplicateIndex(rows);
  return kept.length > 0 && kept.every((r) => issuesOf(r, rows, serverRowErrors, index).errors.length === 0);
}

export interface CommitPayload {
  include: number[];
  edits: Record<number, Partial<ReviewFields>>;
}

/** What the commit request carries: the rows kept and only the fields the user changed. */
export function buildCommitPayload(rows: ReviewRow[]): CommitPayload {
  const include: number[] = [];
  const edits: Record<number, Partial<ReviewFields>> = {};
  for (const row of rows) {
    if (row.removed) continue;
    include.push(row.sourceRow);
    const changed: Partial<ReviewFields> = {};
    for (const field of Object.keys(row.fields) as Array<keyof ReviewFields>) {
      if (fieldChanged(row, field)) (changed as Record<string, unknown>)[field] = row.fields[field];
    }
    if (Object.keys(changed).length > 0) edits[row.sourceRow] = changed;
  }
  return { include, edits };
}
