// Review step of the plan import: every row of the file can be fixed or removed before
// it is saved. Pure, so the same rules run in the preview and again on commit (the
// server never trusts what the browser says is valid).
import { normalizeCategory, pillarFor, type Category, type Pillar } from "../contentTypes.js";
import { makeImportKey } from "./planningImport.js";

export const IMPORT_PLATFORMS = ["linkedin", "instagram", "website"] as const;
export const MAX_TITLE = 200;
export const MAX_CAPTION = 10_000;
export const MAX_CATEGORY = 100;

export type ImportField = "title" | "postDate" | "platforms" | "category" | "row";
export interface ImportFieldError { field: ImportField; message: string }

/** The fields the review table lets the user change. */
export interface PlanningFields {
  title: string;
  /** YYYY-MM-DD, or "" when the file's date could not be read. */
  postDate: string;
  platforms: string[];
  category: string | null;
  caption: string;
}

/** Columns the review does not edit. They are saved as the file had them. */
export interface PlanningExtras {
  designCopy: string;
  assetNotes: string;
  pillar: string | null;
  picContent: string | null;
  contentReview: string | null;
  approvedBy: string | null;
  reviewer: string | null;
  picDesign: string | null;
  progress: string | null;
  outputUrl: string | null;
  sourceStatus: string | null;
}

/** One row of the uploaded file as parsed, valid or not. */
export interface PlanningDraft {
  sourceRow: number;
  fields: PlanningFields;
  extras: PlanningExtras;
  /** Notes from reading the file (ambiguous date, formula without a value, …). */
  warnings: string[];
  /** The date cell, when it could not be read. */
  rawPostDate?: string;
  platformLabel?: string;
  /** Why the platform cell could not be read. */
  platformError?: string;
}

export type PlanningEdits = Record<number, Partial<PlanningFields>>;

const DATE_FORMAT_HINT = "Use DD-MM-YYYY (YYYY-MM-DD also works).";

function readDate(value: string): Date | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  // Content-plan dates carry no time. Default to 09:00 WIB.
  return new Date(`${value}T09:00:00+07:00`);
}

export interface FieldCheck {
  errors: ImportFieldError[];
  warnings: string[];
  title: string;
  category: Category | null;
  pillar: Pillar | null;
  scheduledFor: Date | null;
}

/** Errors block the import; warnings do not. */
export function validatePlanFields(
  fields: PlanningFields,
  file: { rawPostDate?: string; platformError?: string } = {},
): FieldCheck {
  const errors: ImportFieldError[] = [];
  const warnings: string[] = [];
  const title = fields.title.trim();

  if (!title) errors.push({ field: "title", message: "Content title is required." });
  else if (title.length > MAX_TITLE) errors.push({ field: "title", message: `Content title must be ${MAX_TITLE} characters or fewer.` });

  const postDate = fields.postDate.trim();
  const scheduledFor = postDate ? readDate(postDate) : null;
  if (!postDate && !file.rawPostDate) {
    errors.push({ field: "postDate", message: "Publish date is required." });
  } else if (!scheduledFor) {
    errors.push({ field: "postDate", message: `Publish date isn't valid: "${postDate || file.rawPostDate}". ${DATE_FORMAT_HINT}` });
  } else if (scheduledFor.getTime() < Date.now()) {
    warnings.push("The publish date is in the past; the draft is saved as an archive.");
  }

  const unknown = fields.platforms.filter((p) => !(IMPORT_PLATFORMS as readonly string[]).includes(p));
  if (file.platformError) errors.push({ field: "platforms", message: file.platformError });
  else if (unknown.length > 0) errors.push({ field: "platforms", message: `Unsupported channel: ${unknown.join(", ")}.` });
  else if (fields.platforms.length === 0) errors.push({ field: "platforms", message: "Channel is required." });
  else if (fields.platforms.includes("website")) {
    warnings.push("Website isn't supported for publishing yet; the draft is saved without social targets.");
  }

  const rawCategory = fields.category?.trim() ?? "";
  const category = normalizeCategory(rawCategory);
  if (rawCategory && !category) {
    warnings.push(`Category "${rawCategory}" isn't recognised. Pick a category before sending for review.`);
  }

  return { errors, warnings, title, category, pillar: category ? pillarFor(category) : null, scheduledFor };
}

export interface ReviewedRow {
  sourceRow: number;
  /** True while the row is part of the batch (not removed). */
  included: boolean;
  status: "valid" | "invalid" | "duplicate";
  /** The values after the user's edits. */
  fields: PlanningFields;
  errors: ImportFieldError[];
  warnings: string[];
  duplicateReason?: string;
  /** "workspace": already imported before. "file": a copy of an earlier row of this file. */
  duplicateKind?: "file" | "workspace";
  importKey?: string;
}

export interface ReviewOptions {
  edits?: PlanningEdits;
  /** Rows kept in the batch. Omitted = every row. */
  include?: number[];
  /** Import keys already saved in this workspace. */
  existingKeys?: ReadonlySet<string>;
}

function applyEdits(draft: PlanningDraft, edits: PlanningEdits | undefined) {
  const edit = edits?.[draft.sourceRow];
  const fields: PlanningFields = { ...draft.fields, ...edit };
  return {
    fields,
    // A fixed date or platform replaces the file's problem with that cell
    file: {
      rawPostDate: edit?.postDate !== undefined ? undefined : draft.rawPostDate,
      platformError: edit?.platforms !== undefined ? undefined : draft.platformError,
    },
  };
}

function evaluate(drafts: PlanningDraft[], options: ReviewOptions) {
  const include = options.include ? new Set(options.include) : null;
  const seen = new Map<string, number>();
  return drafts.map((draft) => {
    const { fields, file } = applyEdits(draft, options.edits);
    const check = validatePlanFields(fields, file);
    const included = include ? include.has(draft.sourceRow) : true;
    const warnings = [...draft.warnings, ...check.warnings];
    const row: ReviewedRow = {
      sourceRow: draft.sourceRow,
      included,
      status: check.errors.length > 0 ? "invalid" : "valid",
      fields: { ...fields, title: check.title },
      errors: check.errors,
      warnings,
    };
    if (row.status === "invalid") return { row, draft, check, fields };

    row.importKey = makeImportKey(check.title, fields.postDate.trim(), fields.platforms);
    if (options.existingKeys?.has(row.importKey)) {
      row.status = "duplicate";
      row.duplicateReason = "Already imported into this workspace.";
      row.duplicateKind = "workspace";
    } else if (included) {
      const first = seen.get(row.importKey);
      if (first !== undefined) {
        row.status = "duplicate";
        row.duplicateReason = `Same as row ${first} in this file.`;
        row.duplicateKind = "file";
      } else {
        seen.set(row.importKey, draft.sourceRow);
      }
    }
    return { row, draft, check, fields };
  });
}

/** Validate every row after the user's edits. Used by the preview and again on commit. */
export function reviewDrafts(drafts: PlanningDraft[], options: ReviewOptions = {}): ReviewedRow[] {
  return evaluate(drafts, options).map((e) => e.row);
}

export interface ImportRow {
  sourceRow: number;
  importKey: string;
  title: string;
  postDate: string;
  scheduledFor: Date;
  platforms: string[];
  platformLabel: string;
  caption: string;
  category: string | null;
  pillar: string | null;
  extras: PlanningExtras;
  warnings: string[];
}

export interface RowErrors { sourceRow: number; errors: ImportFieldError[] }
export type CommitPlan = { ok: true; rows: ImportRow[] } | { ok: false; rowErrors: RowErrors[] };

const PLATFORM_NAME: Record<string, string> = { linkedin: "LinkedIn", instagram: "Instagram", website: "Website" };

/**
 * Turns the reviewed batch into rows to save. All or nothing: a single row that is
 * invalid, a duplicate, or not in the file refuses the whole batch.
 */
export function commitFromDrafts(
  drafts: PlanningDraft[],
  options: ReviewOptions & { include: number[] },
): CommitPlan {
  if (options.include.length === 0) {
    return { ok: false, rowErrors: [{ sourceRow: 0, errors: [{ field: "row", message: "Pick at least one row to import." }] }] };
  }
  const evaluated = evaluate(drafts, options);
  const known = new Set(drafts.map((d) => d.sourceRow));
  const rowErrors: RowErrors[] = [];
  const rows: ImportRow[] = [];

  for (const sourceRow of new Set(options.include)) {
    if (!known.has(sourceRow)) {
      rowErrors.push({ sourceRow, errors: [{ field: "row", message: "Row not found in the file." }] });
    }
  }

  for (const { row, draft, check, fields } of evaluated) {
    if (!row.included) continue;
    if (row.status === "invalid") {
      rowErrors.push({ sourceRow: row.sourceRow, errors: row.errors });
      continue;
    }
    if (row.status === "duplicate") {
      rowErrors.push({ sourceRow: row.sourceRow, errors: [{ field: "title", message: row.duplicateReason ?? "Duplicate." }] });
      continue;
    }
    const edited = options.edits?.[draft.sourceRow]?.platforms !== undefined;
    const rawCategory = fields.category?.trim() || null;
    rows.push({
      sourceRow: row.sourceRow,
      importKey: row.importKey as string,
      title: check.title,
      postDate: fields.postDate.trim(),
      scheduledFor: check.scheduledFor as Date,
      platforms: fields.platforms,
      platformLabel: !edited && draft.platformLabel ? draft.platformLabel : fields.platforms.map((p) => PLATFORM_NAME[p] ?? p).join(", "),
      caption: fields.caption.trim(),
      category: check.category ?? rawCategory,
      pillar: check.category ? pillarFor(check.category) : draft.extras.pillar,
      extras: draft.extras,
      warnings: row.warnings,
    });
  }

  return rowErrors.length > 0 ? { ok: false, rowErrors } : { ok: true, rows };
}
