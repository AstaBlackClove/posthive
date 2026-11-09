// The "Map columns" step of the plan import: which column of the file is read as which field.
// The field names mirror PLANNING_FIELDS in apps/api/src/lib/import/planningImport.ts.
import type { ServerRow } from "./importReview";

export type PlanningField =
  | "title"
  | "postDate"
  | "platform"
  | "pillar"
  | "category"
  | "caption"
  | "designCopy"
  | "assetNotes"
  | "picContent"
  | "picDesign"
  | "contentReview"
  | "approvedBy"
  | "reviewer"
  | "progress"
  | "outputUrl"
  | "sourceStatus";

/** A column of the uploaded file, as the preview returns it. */
export interface FileColumn {
  index: number;
  label: string;
  /** The first value below the header. */
  sample: string;
  /** The field the importer read it as; null when it does not know the column. */
  field: PlanningField | null;
}

/** column index → field, or null for "don't import". The shape the preview and the commit take. */
export type ColumnMapping = Record<number, PlanningField | null>;

export interface FieldInfo {
  field: PlanningField;
  label: string;
  required: boolean;
}

/** In the order the select lists them: the three required ones first. */
export const FIELDS: readonly FieldInfo[] = [
  { field: "title", label: "Content title", required: true },
  { field: "postDate", label: "Publish date", required: true },
  { field: "platform", label: "Channel", required: true },
  { field: "caption", label: "Caption", required: false },
  { field: "category", label: "Content category", required: false },
  { field: "pillar", label: "Content pillar", required: false },
  { field: "designCopy", label: "Design copy", required: false },
  { field: "assetNotes", label: "Supporting assets", required: false },
  { field: "picContent", label: "Content PIC", required: false },
  { field: "picDesign", label: "Design PIC", required: false },
  { field: "contentReview", label: "Content review", required: false },
  { field: "approvedBy", label: "Approved by", required: false },
  { field: "reviewer", label: "Reviewer", required: false },
  { field: "progress", label: "Progress", required: false },
  { field: "outputUrl", label: "Output link", required: false },
  { field: "sourceStatus", label: "Source status", required: false },
];

const BY_FIELD = new Map(FIELDS.map((f) => [f.field, f]));

export const REQUIRED_FIELDS: readonly PlanningField[] = FIELDS.filter((f) => f.required).map((f) => f.field);

export const fieldLabel = (field: PlanningField): string => BY_FIELD.get(field)?.label ?? field;

export type ColumnStatus = "matched" | "needs-mapping" | "skipped";

/**
 * The current mapping of every column: the importer's guess, overridden by what the user chose.
 * A column the user set to "don't import" is null even when the importer had a guess for it.
 */
export function currentFields(columns: readonly FileColumn[], overrides: ColumnMapping): Map<number, PlanningField | null> {
  return new Map(columns.map((c) => [c.index, c.index in overrides ? overrides[c.index] : c.field]));
}

/**
 * Reading `field` from column `index`. A field has one column only, so whichever other column
 * had it lets go (it becomes "don't import"). The result holds only the columns the user has
 * touched, so the rest keep the importer's guess and a column it could not place still says
 * "needs mapping".
 */
export function assignField(
  columns: readonly FileColumn[],
  overrides: ColumnMapping,
  index: number,
  field: PlanningField | null,
): ColumnMapping {
  const next: ColumnMapping = { ...overrides };
  if (field !== null) {
    for (const [i, current] of currentFields(columns, overrides)) {
      if (i !== index && current === field) next[i] = null;
    }
  }
  next[index] = field;
  return next;
}

/**
 * Matched: it has a field. Needs mapping: no field yet, and the user has not said to skip it.
 * Skipped: the user chose "don't import" (or the importer has no guess and the user confirmed it).
 * A column the importer could not place starts out as "needs mapping" until the user decides.
 */
export function columnStatus(column: FileColumn, overrides: ColumnMapping): ColumnStatus {
  const field = column.index in overrides ? overrides[column.index] : column.field;
  if (field !== null && field !== undefined) return "matched";
  return column.index in overrides ? "skipped" : "needs-mapping";
}

/** The mapping to send: only when the user changed something, so an untouched file is read the way the importer reads it. */
export function mappingToSend(columns: readonly FileColumn[], overrides: ColumnMapping): ColumnMapping | undefined {
  if (Object.keys(overrides).length === 0) return undefined;
  const full: ColumnMapping = {};
  for (const [i, f] of currentFields(columns, overrides)) full[i] = f;
  return full;
}

export interface MappingSummary {
  matched: number;
  needsMapping: number;
  skipped: number;
  /** Required fields that have a column / how many there are. */
  requiredMapped: number;
  requiredTotal: number;
  missingRequired: PlanningField[];
  /** Columns that are read as a field (what "9 of 10 columns mapped" counts). */
  mappedColumns: number;
  totalColumns: number;
}

export function summarizeMapping(columns: readonly FileColumn[], overrides: ColumnMapping): MappingSummary {
  let matched = 0;
  let needsMapping = 0;
  let skipped = 0;
  for (const column of columns) {
    const status = columnStatus(column, overrides);
    if (status === "matched") matched += 1;
    else if (status === "needs-mapping") needsMapping += 1;
    else skipped += 1;
  }
  const used = new Set([...currentFields(columns, overrides).values()].filter((f): f is PlanningField => f !== null));
  const missingRequired = REQUIRED_FIELDS.filter((f) => !used.has(f));
  return {
    matched,
    needsMapping,
    skipped,
    requiredMapped: REQUIRED_FIELDS.length - missingRequired.length,
    requiredTotal: REQUIRED_FIELDS.length,
    missingRequired,
    mappedColumns: matched,
    totalColumns: columns.length,
  };
}

/** True when the file has to be read again for the mapping to take effect. */
export function mappingChanged(columns: readonly FileColumn[], overrides: ColumnMapping): boolean {
  return [...currentFields(columns, overrides)].some(([index, field]) => field !== (columns.find((c) => c.index === index)?.field ?? null));
}

export interface FieldCheck {
  field: PlanningField;
  label: string;
  required: boolean;
  /** The label of the column it is read from, or null when no column is. */
  column: string | null;
}

/** "Mapping validation": each field of the template and the column it comes from. */
export function fieldChecks(columns: readonly FileColumn[], overrides: ColumnMapping): FieldCheck[] {
  const source = new Map<PlanningField, string>();
  const current = currentFields(columns, overrides);
  for (const column of columns) {
    const field = current.get(column.index);
    if (field) source.set(field, column.label);
  }
  // The required ones always, the optional ones only when a column is read as them
  return FIELDS.filter((f) => f.required || source.has(f.field)).map((f) => ({
    field: f.field,
    label: f.label,
    required: f.required,
    column: source.get(f.field) ?? null,
  }));
}

export type DataCheckKind = "invalid-date" | "missing-value" | "unsupported-channel" | "duplicate";

export interface DataCheck {
  kind: DataCheckKind;
  title: string;
  /** "Row 9 · "31/11/2026" doesn't exist": the first row it was found in. */
  example: string;
  count: number;
  tone: "danger" | "warning";
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * What the preview found in the rows, grouped the way the design lists it: an invalid date,
 * a missing required value, an unsupported channel, a possible duplicate. One entry per kind
 * that occurs, with how many rows and the first one as an example. A row counts once, under
 * the first thing wrong with it (date, then missing value, then channel).
 */
export function dataChecks(rows: readonly ServerRow[]): DataCheck[] {
  const found: Record<DataCheckKind, { count: number; first: string }> = {
    "invalid-date": { count: 0, first: "" },
    "missing-value": { count: 0, first: "" },
    "unsupported-channel": { count: 0, first: "" },
    duplicate: { count: 0, first: "" },
  };
  const add = (kind: DataCheckKind, example: string) => {
    if (found[kind].count === 0) found[kind].first = example;
    found[kind].count += 1;
  };

  for (const row of rows) {
    if (row.status === "duplicate") {
      add("duplicate", `Row ${row.sourceRow} · ${row.duplicateReason ?? "Duplicate"}`);
      continue;
    }
    if (row.status !== "invalid") continue;
    const date = row.errors.find((e) => e.field === "postDate");
    const channel = row.errors.find((e) => e.field === "platforms");
    const title = row.errors.find((e) => e.field === "title");
    const raw = row.details.rawPostDate;
    const dateMissing = date && !raw && row.fields.postDate === "";
    if (date && !dateMissing) add("invalid-date", `Row ${row.sourceRow} · "${raw ?? row.fields.postDate}" doesn't exist`);
    else if (title || dateMissing) {
      add("missing-value", `Row ${row.sourceRow} · ${title ? "Title" : "Publish date"} is empty`);
    } else if (channel) add("unsupported-channel", `Row ${row.sourceRow} · ${channel.message.replace(/\.$/, "")}`);
  }

  const out: DataCheck[] = [];
  const entry = (kind: DataCheckKind, title: string, tone: DataCheck["tone"]) => {
    if (found[kind].count > 0) out.push({ kind, title, example: found[kind].first, count: found[kind].count, tone });
  };
  entry("invalid-date", plural(found["invalid-date"].count, "invalid date", "invalid dates"), "danger");
  entry("missing-value", plural(found["missing-value"].count, "missing required value", "missing required values"), "danger");
  entry("unsupported-channel", plural(found["unsupported-channel"].count, "unsupported channel", "unsupported channels"), "warning");
  entry("duplicate", plural(found.duplicate.count, "possible duplicate", "possible duplicates"), "warning");
  return out;
}
