// Review step of the plan import (the table where rows are fixed or removed).
// The field rules mirror apps/api/src/lib/import/reviewRows.ts; keep both identical.
// The server checks everything again on commit.
import { normalizeCategory } from "./contentTypes";

export const IMPORT_PLATFORMS = ["linkedin", "instagram", "website"] as const;
export const MAX_TITLE = 200;

export type ImportField = "title" | "postDate" | "platforms" | "category" | "row";
export interface FieldIssue { field: ImportField; message: string }

/** The fields the review table lets the user change. */
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
    warnings: r.warnings,
    details: r.details,
    removed: r.status === "duplicate" && !r.duplicateReason?.startsWith("Duplikat dengan baris"),
  }));
}

function isRealDate(value: string): boolean {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const check = new Date(Date.UTC(y, mo - 1, d));
  return check.getUTCFullYear() === y && check.getUTCMonth() === mo - 1 && check.getUTCDate() === d;
}

/** Problems that block the import. An unknown category is only a warning (see warningsOf). */
export function validateFields(f: ReviewFields): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const title = f.title.trim();
  if (!title) issues.push({ field: "title", message: "Content Title wajib diisi." });
  else if (title.length > MAX_TITLE) issues.push({ field: "title", message: `Content Title maksimal ${MAX_TITLE} karakter.` });

  const date = f.postDate.trim();
  if (!date) issues.push({ field: "postDate", message: "Post Date wajib diisi." });
  else if (!isRealDate(date)) issues.push({ field: "postDate", message: `Post Date tidak valid: "${date}".` });

  const unknown = f.platforms.filter((p) => !(IMPORT_PLATFORMS as readonly string[]).includes(p));
  if (unknown.length > 0) issues.push({ field: "platforms", message: `Platform tidak dikenal: ${unknown.join(", ")}.` });
  else if (f.platforms.length === 0) issues.push({ field: "platforms", message: "Platform wajib diisi." });
  return issues;
}

const keyOf = (f: ReviewFields) =>
  [f.title.trim().toLowerCase().replace(/\s+/g, " "), f.postDate.trim(), [...f.platforms].sort().join("+")].join("|");

const sameKey = (a: ReviewFields, b: ReviewFields) => keyOf(a) === keyOf(b);

const fieldChanged = (row: ReviewRow, field: keyof ReviewFields) =>
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
): { errors: FieldIssue[]; warnings: string[] } {
  const errors: FieldIssue[] = [];
  const own = validateFields(row.fields);
  for (const issue of own) {
    const fromFile = row.serverErrors.find((e) => e.field === issue.field);
    errors.push(fromFile && !fieldChanged(row, issue.field as keyof ReviewFields) ? fromFile : issue);
  }

  if (errors.length === 0) {
    const keyUnchanged = sameKey(row.fields, row.original);
    if (row.duplicateReason && !row.duplicateReason.startsWith("Duplikat dengan baris") && keyUnchanged) {
      errors.push({ field: "title", message: row.duplicateReason });
    } else {
      const first = all.find((other) => !other.removed && other.sourceRow < row.sourceRow
        && validateFields(other.fields).length === 0 && sameKey(other.fields, row.fields));
      if (first) errors.push({ field: "title", message: `Duplikat dengan baris ${first.sourceRow} di batch ini.` });
    }
  }

  const fromServer = serverRowErrors?.get(row.sourceRow);
  if (fromServer && errors.length === 0 && sameKey(row.fields, row.original)) errors.push(...fromServer);

  const warnings = [...row.warnings];
  const category = row.fields.category?.trim();
  if (category && !isKnownCategory(category)) {
    warnings.push(`Kategori "${category}" tidak dikenal. Pilih kategori sebelum mengirim untuk review.`);
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
  const needsFix = kept.filter((r) => issuesOf(r, rows, serverRowErrors).errors.length > 0).length;
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
  return kept.length > 0 && kept.every((r) => issuesOf(r, rows, serverRowErrors).errors.length === 0);
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
