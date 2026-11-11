import { createHash } from "node:crypto";
import { CsvParseError, parseCsvWithDelimiters, type CsvDelimiter } from "./csv.js";
import type { PlanningDraft } from "./reviewRows.js";

export const MAX_IMPORT_ROWS = 1000;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export type PlanningImportFormat = "csv" | "xlsx";

/** Every column of a plan file the importer can read. The mapping step lets the user pick one per column. */
export const PLANNING_FIELDS = [
  "title",
  "pillar",
  "category",
  "designCopy",
  "caption",
  "assetNotes",
  "postDate",
  "platform",
  "picContent",
  "contentReview",
  "approvedBy",
  "reviewer",
  "picDesign",
  "progress",
  "outputUrl",
  "sourceStatus",
] as const;

export type PlanningField = (typeof PLANNING_FIELDS)[number];

/** A plan cannot be read without these three. */
export const REQUIRED_FIELDS: readonly PlanningField[] = ["title", "postDate", "platform"];

const HEADER_ALIASES: Record<PlanningField, string[]> = {
  title: ["content title", "title", "post title", "judul konten", "judul"],
  pillar: ["content pillar", "main content pillar", "pillar", "pilar konten", "pilar"],
  category: ["content category", "content categories", "kategori konten", "kategori"],
  designCopy: ["link copywrite", "link copywriter", "link copy", "copywrite", "copywriter", "design copy", "copy desain"],
  caption: ["caption", "caption copy", "copy caption", "caption text", "teks caption"],
  assetNotes: ["aset pendukung", "asset pendukung", "supporting asset", "supporting assets", "asset notes"],
  postDate: ["post date", "tanggal post", "tanggal", "date"],
  platform: ["platform", "platforms", "channel", "kanal"],
  picContent: ["pic content", "pic konten"],
  contentReview: ["content review", "review konten"],
  approvedBy: ["acc by", "approved by", "approver", "acc"],
  reviewer: ["content review acc by", "reviewer", "content reviewer"],
  picDesign: ["pic design", "pic desain"],
  progress: ["progress content", "progress", "status progress"],
  outputUrl: ["link output", "output link", "output"],
  sourceStatus: ["status", "content status", "status konten"],
};

const FIELD_BY_ALIAS = new Map<string, PlanningField>();
for (const [field, aliases] of Object.entries(HEADER_ALIASES) as Array<[PlanningField, string[]]>) {
  for (const alias of aliases) FIELD_BY_ALIAS.set(normalizeHeader(alias), field);
}

export class CsvHeaderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvHeaderError";
  }
}

export interface PlanningHeader {
  /** 1-based row number in the uploaded file. */
  headerRow: number;
  /** 1-based sub-header row, if the file uses a two-row header. */
  subHeaderRow: number | null;
  /** 0-based index of the first data row. */
  dataStart: number;
  columns: Partial<Record<PlanningField, number>>;
  recognizedColumns: number;
  /** Header text per column (a two-row header is joined), "" for an empty cell. */
  labels: string[];
}

/** What the user maps in the second step: column index → field, or null for "don't import". */
export type PlanningMapping = Record<number, PlanningField | null>;

/** One column of the file as the mapping step shows it. */
export interface PlanningColumn {
  index: number;
  label: string;
  /** First non-empty value below the header, cut to 80 characters. */
  sample: string;
  /** The field the column is read as (the importer's guess, or the user's choice). */
  field: PlanningField | null;
}

export class ImportMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportMappingError";
  }
}

export interface PlanningRow {
  sourceRow: number;
  importKey: string;
  title: string;
  postDate: string;
  scheduledFor: Date;
  platforms: string[];
  platformLabel: string;
  designCopy: string;
  caption: string;
  assetNotes: string;
  pillar: string | null;
  category: string | null;
  picContent: string | null;
  contentReview: string | null;
  approvedBy: string | null;
  reviewer: string | null;
  picDesign: string | null;
  progress: string | null;
  outputUrl: string | null;
  sourceStatus: string | null;
  warnings: string[];
}

export interface PlanningInvalidRow {
  sourceRow: number;
  title: string;
  reason: string;
}

export interface PlanningDuplicateRow {
  sourceRow: number;
  importKey: string;
  title: string;
  reason: string;
}

export interface PlanningParseResult {
  /** Every non-blank row as read from the file, valid or not. The review step edits these. */
  drafts: PlanningDraft[];
  rows: PlanningRow[];
  invalidRows: PlanningInvalidRow[];
  duplicates: PlanningDuplicateRow[];
  header: PlanningHeader;
  format: PlanningImportFormat;
  delimiter: CsvDelimiter | null;
  sheetName: string | null;
  candidateSheets: string[];
  totalDataRows: number;
  /** Every column with a header or a value, for the mapping step. */
  columns: PlanningColumn[];
  /** Required fields no column is read as. While any is missing no row is parsed. */
  missingFields: PlanningField[];
}

export interface PlanningRowsParseOptions {
  format: PlanningImportFormat;
  delimiter: CsvDelimiter | null;
  sheetName?: string | null;
  candidateSheets?: string[];
  rowWarnings?: (sourceRow: number, row: string[]) => string[];
}

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function cleanCell(value: string | undefined): string {
  return (value ?? "").replace(/^\uFEFF/, "").trim();
}

/** A plan row whose Status cell says Published: it went out before the app, and is still saved as a draft. */
export function isPublishedInFile(value: unknown): boolean {
  return typeof value === "string" && /^published$/i.test(value.trim());
}

function isBlankRow(row: string[]): boolean {
  return row.every((cell) => cell.trim() === "");
}

function mapHeaderColumns(row: string[], nextRow?: string[]): Partial<Record<PlanningField, number>> {
  const columns: Partial<Record<PlanningField, number>> = {};
  const width = Math.max(row.length, nextRow?.length ?? 0);

  for (let index = 0; index < width; index += 1) {
    const header = normalizeHeader(row[index] ?? "");
    const subHeader = normalizeHeader(nextRow?.[index] ?? "");
    const firstField = FIELD_BY_ALIAS.get(header);
    const secondField = FIELD_BY_ALIAS.get(subHeader);

    let field: PlanningField | undefined;
    if (firstField && secondField && firstField !== secondField) {
      field = FIELD_BY_ALIAS.get(`${header} ${subHeader}`) ?? secondField;
    } else {
      field = secondField ?? firstField;
    }

    if (field && columns[field] === undefined) columns[field] = index;
  }

  return columns;
}

function getCell(row: string[], columns: Partial<Record<PlanningField, number>>, field: PlanningField): string {
  const index = columns[field];
  return index === undefined ? "" : row[index] ?? "";
}

function looksLikeDataRow(row: string[], columns: Partial<Record<PlanningField, number>>): boolean {
  return (
    getCell(row, columns, "title").trim() !== "" ||
    getCell(row, columns, "postDate").trim() !== "" ||
    getCell(row, columns, "platform").trim() !== ""
  );
}

/**
 * Client workbooks repeat the required header labels in the second header row:
 *
 *   Category | Content Title | Post Date | Platform
 *   Content Pillar | Content Title | Post Date | Platform
 *
 * That row looks populated, so detect it by its recognized header cells instead
 * of treating it as the first data row.
 */
function looksLikeSubHeaderRow(
  row: string[],
  columns: Partial<Record<PlanningField, number>>,
): boolean {
  const requiredColumns = [columns.title, columns.postDate, columns.platform].filter(
    (column): column is number => column !== undefined,
  );

  const recognized = requiredColumns.filter((column) => {
    const header = normalizeHeader(row[column] ?? "");
    return header !== "" && FIELD_BY_ALIAS.has(header);
  }).length;

  return recognized >= 2;
}

/**
 * Supports both a normal one-row header and the client's two-row header:
 *
 *   Category | ... | Content Review | ...
 *   Content Pillar | Content Category | Acc by | PIC Design | ...
 */
export function findPlanningHeader(rows: string[][]): PlanningHeader | null {
  const limit = Math.min(rows.length, 20);

  for (let rowIndex = 0; rowIndex < limit; rowIndex += 1) {
    const baseColumns = mapHeaderColumns(rows[rowIndex]);
    const hasRequired =
      baseColumns.title !== undefined &&
      baseColumns.postDate !== undefined &&
      baseColumns.platform !== undefined;

    if (!hasRequired) continue;

    const nextRow = rows[rowIndex + 1];
    let useSubHeader = false;

    if (nextRow) {
      const nextColumns = mapHeaderColumns(nextRow);
      const nextHasHeaders = Object.keys(nextColumns).length > 0;
      useSubHeader =
        nextHasHeaders &&
        (!looksLikeDataRow(nextRow, baseColumns) || looksLikeSubHeaderRow(nextRow, baseColumns));
    }

    const columns = useSubHeader
      ? mapHeaderColumns(rows[rowIndex], nextRow)
      : baseColumns;

    if (columns.title === undefined || columns.postDate === undefined || columns.platform === undefined) {
      continue;
    }

    return {
      headerRow: rowIndex + 1,
      subHeaderRow: useSubHeader ? rowIndex + 2 : null,
      dataStart: rowIndex + (useSubHeader ? 2 : 1),
      columns,
      recognizedColumns: Object.keys(columns).length,
      labels: headerLabels(rows[rowIndex], useSubHeader ? nextRow : undefined),
    };
  }

  return null;
}

function headerLabels(first: string[], second?: string[]): string[] {
  const width = Math.max(first.length, second?.length ?? 0);
  const labels: string[] = [];
  for (let index = 0; index < width; index += 1) {
    const a = cleanCell(first[index]);
    const b = cleanCell(second?.[index]);
    labels.push(a && b && a.toLowerCase() !== b.toLowerCase() ? `${a} / ${b}` : b || a);
  }
  return labels;
}

/**
 * For a file that has none of the three required headers: the row among the first 20 with
 * the most recognised headers; among equals, the one with the most filled cells (so a title
 * line above the table loses to the header row). The user maps the rest by hand. A single
 * header row; null only for a file with no filled row.
 */
export function findLooseHeader(rows: string[][]): PlanningHeader | null {
  const limit = Math.min(rows.length, 20);
  let best: { index: number; columns: Partial<Record<PlanningField, number>>; count: number; score: number } | null = null;

  for (let index = 0; index < limit; index += 1) {
    if (isBlankRow(rows[index])) continue;
    const columns = mapHeaderColumns(rows[index]);
    const count = Object.keys(columns).length;
    const score = count * 1000 + rows[index].filter((cell) => cell.trim() !== "").length;
    if (!best || score > best.score) best = { index, columns, count, score };
  }
  if (!best) return null;

  return {
    headerRow: best.index + 1,
    subHeaderRow: null,
    dataStart: best.index + 1,
    columns: best.columns,
    recognizedColumns: best.count,
    labels: headerLabels(rows[best.index]),
  };
}

function columnCount(rows: string[][], header: PlanningHeader): number {
  let width = header.labels.length;
  for (let index = header.dataStart; index < rows.length; index += 1) width = Math.max(width, rows[index].length);
  return width;
}

/**
 * Replaces the guessed columns with the user's choice. Each field can be read from one column
 * only, and every index has to be a column of the file. The server checks this again on commit.
 */
export function applyMapping(header: PlanningHeader, rows: string[][], mapping: PlanningMapping): PlanningHeader {
  const width = columnCount(rows, header);
  const columns: Partial<Record<PlanningField, number>> = {};

  for (const [key, field] of Object.entries(mapping)) {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index >= width) {
      throw new ImportMappingError(`Column ${index + 1} isn't in the file.`);
    }
    if (field === null) continue;
    if (columns[field] !== undefined) throw new ImportMappingError(`"${field}" is mapped to more than one column.`);
    columns[field] = index;
  }

  return { ...header, columns, recognizedColumns: Object.keys(columns).length };
}

function columnLetter(index: number): string {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

/** Every column that has a header or a value, with the first value as a sample. */
function describeColumns(rows: string[][], header: PlanningHeader): PlanningColumn[] {
  const fieldAt = new Map<number, PlanningField>();
  for (const [field, index] of Object.entries(header.columns) as Array<[PlanningField, number]>) fieldAt.set(index, field);

  const columns: PlanningColumn[] = [];
  const width = columnCount(rows, header);
  for (let index = 0; index < width; index += 1) {
    let sample = "";
    for (let row = header.dataStart; row < rows.length && !sample; row += 1) {
      sample = cleanCell(rows[row]?.[index]).replace(/\s+/g, " ");
    }
    const label = header.labels[index] ?? "";
    if (!label && !sample) continue;
    columns.push({
      index,
      label: label || `Column ${columnLetter(index)}`,
      sample: sample.slice(0, 80),
      field: fieldAt.get(index) ?? null,
    });
  }
  return columns;
}

function parsePostDate(raw: string): { date: string; value: Date; warning?: string } | null {
  const value = raw.trim();
  if (!value) return null;

  let year: number;
  let month: number;
  let day: number;
  let warning: string | undefined;

  const iso = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T].*)?$/);
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else {
    const dayFirst = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[ T].*)?$/);
    if (!dayFirst) return null;

    const first = Number(dayFirst[1]);
    const second = Number(dayFirst[2]);
    year = Number(dayFirst[3]);

    if (first > 12 && second <= 12) {
      day = first;
      month = second;
    } else if (second > 12 && first <= 12) {
      month = first;
      day = second;
      warning = "Date read as MM/DD/YYYY.";
    } else {
      day = first;
      month = second;
      warning = "Ambiguous date; read as DD-MM-YYYY.";
    }
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return {
    date,
    // Content-plan dates are date-only. Default to 09:00 WIB.
    value: new Date(`${date}T09:00:00+07:00`),
    warning,
  };
}

const PLATFORM_ALIASES: Record<string, "linkedin" | "instagram" | "website"> = {
  linkedin: "linkedin",
  linkedincom: "linkedin",
  li: "linkedin",
  instagram: "instagram",
  instagramcom: "instagram",
  insta: "instagram",
  ig: "instagram",
  website: "website",
  web: "website",
  situs: "website",
};

export function parsePlatforms(raw: string): {
  platforms: string[];
  label: string;
  error?: string;
} {
  const label = raw.trim();
  if (!label) return { platforms: [], label, error: "Channel is required." };

  if (/mirror|li\s*&\s*ig|li\s*and\s*ig/i.test(label)) {
    return { platforms: ["linkedin", "instagram"], label };
  }

  const tokens = label
    .split(/[,+/;&]|\band\b|\n/i)
    .map((token) => token.replace(/\([^)]*\)/g, "").trim())
    .filter(Boolean);

  const platforms = new Set<string>();
  const unknown: string[] = [];

  for (const token of tokens) {
    const key = token.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const platform = PLATFORM_ALIASES[key];
    if (platform) platforms.add(platform);
    else unknown.push(token);
  }

  if (unknown.length > 0) {
    return {
      platforms: [...platforms],
      label,
      error: `Unsupported channel: ${unknown.join(", ")}.`,
    };
  }

  if (platforms.size === 0) {
    return { platforms: [], label, error: "Channel is required." };
  }

  return { platforms: [...platforms], label };
}

function normalizeKeyPart(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function makeImportKey(title: string, postDate: string, platforms: string[]): string {
  const key = [
    normalizeKeyPart(title),
    postDate,
    platforms.slice().sort().join("+"),
  ].join("|");

  return createHash("sha256").update(key).digest("hex");
}

function nullable(value: string): string | null {
  const cleaned = value.trim();
  return cleaned === "" ? null : cleaned;
}

export function parsePlanningRows(
  rows: string[][],
  header: PlanningHeader,
  options: PlanningRowsParseOptions,
): PlanningParseResult {
  const dataRows = rows.slice(header.dataStart);
  const nonBlankRows = dataRows.filter((row) => !isBlankRow(row));

  if (nonBlankRows.length > MAX_IMPORT_ROWS) {
    throw new CsvParseError(
      `The file has ${nonBlankRows.length} data rows. The limit is ${MAX_IMPORT_ROWS} rows per import.`,
    );
  }

  const validRows: PlanningRow[] = [];
  const invalidRows: PlanningInvalidRow[] = [];
  const duplicates: PlanningDuplicateRow[] = [];
  const drafts: PlanningDraft[] = [];
  const seenKeys = new Map<string, number>();

  const columnsInfo = describeColumns(rows, header);
  const missingFields = REQUIRED_FIELDS.filter((field) => header.columns[field] === undefined);
  if (missingFields.length > 0) {
    // Nothing to read until the user says which column is the title, the date and the channel.
    return {
      drafts,
      rows: validRows,
      invalidRows,
      duplicates,
      header,
      format: options.format,
      delimiter: options.delimiter,
      sheetName: options.sheetName ?? null,
      candidateSheets: options.candidateSheets ?? [],
      totalDataRows: nonBlankRows.length,
      columns: columnsInfo,
      missingFields,
    };
  }

  for (let index = 0; index < dataRows.length; index += 1) {
    const row = dataRows[index];
    if (isBlankRow(row)) continue;

    const sourceRow = header.dataStart + index + 1;
    const title = cleanCell(getCell(row, header.columns, "title"));
    const postDateRaw = cleanCell(getCell(row, header.columns, "postDate"));
    const platformRaw = cleanCell(getCell(row, header.columns, "platform"));

    const errors: string[] = [];
    if (!title) errors.push("Content title is required.");
    if (!postDateRaw) errors.push("Publish date is required.");

    const parsedDate = parsePostDate(postDateRaw);
    if (postDateRaw && !parsedDate) {
      errors.push(`Publish date isn't valid: "${postDateRaw}". Use DD-MM-YYYY (YYYY-MM-DD also works).`);
    }

    const parsedPlatforms = parsePlatforms(platformRaw);
    if (parsedPlatforms.error) errors.push(parsedPlatforms.error);

    const extraWarnings = options.rowWarnings?.(sourceRow, row) ?? [];

    const draftContentReview = nullable(cleanCell(getCell(row, header.columns, "contentReview")));
    const draftApprovedBy = nullable(cleanCell(getCell(row, header.columns, "approvedBy")));
    drafts.push({
      sourceRow,
      fields: {
        title,
        postDate: parsedDate?.date ?? "",
        platforms: parsedPlatforms.platforms,
        category: nullable(cleanCell(getCell(row, header.columns, "category"))),
        caption: cleanCell(getCell(row, header.columns, "caption")),
      },
      extras: {
        designCopy: getCell(row, header.columns, "designCopy"),
        assetNotes: cleanCell(getCell(row, header.columns, "assetNotes")),
        pillar: nullable(cleanCell(getCell(row, header.columns, "pillar"))),
        picContent: nullable(cleanCell(getCell(row, header.columns, "picContent"))),
        contentReview: draftContentReview,
        approvedBy: draftApprovedBy,
        reviewer: draftApprovedBy ?? draftContentReview ?? nullable(cleanCell(getCell(row, header.columns, "reviewer"))),
        picDesign: nullable(cleanCell(getCell(row, header.columns, "picDesign"))),
        progress: nullable(cleanCell(getCell(row, header.columns, "progress"))),
        outputUrl: nullable(cleanCell(getCell(row, header.columns, "outputUrl"))),
        sourceStatus: nullable(cleanCell(getCell(row, header.columns, "sourceStatus"))),
      },
      warnings: [
        ...(parsedDate?.warning ? [parsedDate.warning] : []),
        ...(isPublishedInFile(getCell(row, header.columns, "sourceStatus"))
          ?["The source status is Published; it is still saved as a draft."]
          : []),
        ...extraWarnings,
      ],
      ...(postDateRaw && !parsedDate ? { rawPostDate: postDateRaw } : {}),
      platformLabel: parsedPlatforms.label,
      ...(parsedPlatforms.error ? { platformError: parsedPlatforms.error } : {}),
    });

    if (errors.length > 0 || !parsedDate) {
      invalidRows.push({
        sourceRow,
        title,
        reason: [...errors, ...extraWarnings].join(" "),
      });
      continue;
    }

    const warnings: string[] = [];
    if (parsedDate.warning) warnings.push(parsedDate.warning);
    if (parsedPlatforms.platforms.includes("website")) {
      warnings.push("Website isn't supported for publishing yet; the draft is saved without social targets.");
    }
    if (parsedDate.value.getTime() < Date.now()) {
      warnings.push("The publish date is in the past; the draft is saved as an archive.");
    }

    const sourceStatus = nullable(cleanCell(getCell(row, header.columns, "sourceStatus")));
    if (isPublishedInFile(sourceStatus)) {
      warnings.push("The source status is Published; it is still saved as a draft.");
    }

    if (extraWarnings.length > 0) warnings.push(...extraWarnings);

    const contentReview = nullable(cleanCell(getCell(row, header.columns, "contentReview")));
    const approvedBy = nullable(cleanCell(getCell(row, header.columns, "approvedBy")));
    const reviewer = approvedBy ?? contentReview ?? nullable(cleanCell(getCell(row, header.columns, "reviewer")));

    const importKey = makeImportKey(title, parsedDate.date, parsedPlatforms.platforms);
    const duplicateOf = seenKeys.get(importKey);
    if (duplicateOf !== undefined) {
      duplicates.push({
        sourceRow,
        importKey,
        title,
        reason: `Same as row ${duplicateOf} in this file.`,
      });
      continue;
    }
    seenKeys.set(importKey, sourceRow);

    validRows.push({
      sourceRow,
      importKey,
      title,
      postDate: parsedDate.date,
      scheduledFor: parsedDate.value,
      platforms: parsedPlatforms.platforms,
      platformLabel: parsedPlatforms.label,
      // Preserve the raw cell exactly (including line breaks) for future Figma placeholders.
      designCopy: getCell(row, header.columns, "designCopy"),
      caption: cleanCell(getCell(row, header.columns, "caption")),
      assetNotes: cleanCell(getCell(row, header.columns, "assetNotes")),
      pillar: nullable(cleanCell(getCell(row, header.columns, "pillar"))),
      category: nullable(cleanCell(getCell(row, header.columns, "category"))),
      picContent: nullable(cleanCell(getCell(row, header.columns, "picContent"))),
      contentReview,
      approvedBy,
      reviewer,
      picDesign: nullable(cleanCell(getCell(row, header.columns, "picDesign"))),
      progress: nullable(cleanCell(getCell(row, header.columns, "progress"))),
      outputUrl: nullable(cleanCell(getCell(row, header.columns, "outputUrl"))),
      sourceStatus,
      warnings,
    });
  }

  return {
    drafts,
    rows: validRows,
    invalidRows,
    duplicates,
    header,
    format: options.format,
    delimiter: options.delimiter,
    sheetName: options.sheetName ?? null,
    candidateSheets: options.candidateSheets ?? [],
    totalDataRows: nonBlankRows.length,
    columns: columnsInfo,
    missingFields,
  };
}

export function parsePlanningCsv(
  input: string,
  options: { mapping?: PlanningMapping } = {},
): PlanningParseResult {
  const attempts = parseCsvWithDelimiters(input);
  let selected: {
    delimiter: CsvDelimiter;
    rows: string[][];
    header: PlanningHeader;
    score: number;
  } | null = null;
  let firstError: CsvParseError | null = null;

  for (const attempt of attempts) {
    if (attempt.error) {
      firstError ??= attempt.error;
      continue;
    }

    // A file with the three required headers always beats one the user has to map by hand
    const strict = findPlanningHeader(attempt.rows);
    const header = strict ?? findLooseHeader(attempt.rows);
    if (!header) continue;

    const score = strict
      ? 1_000_000 + header.recognizedColumns + header.dataStart
      : header.recognizedColumns * 1000 + header.labels.length;
    if (!selected || score > selected.score) {
      selected = {
        delimiter: attempt.delimiter,
        rows: attempt.rows,
        header,
        score,
      };
    }
  }

  if (!selected) {
    if (firstError) throw firstError;
    throw new CsvHeaderError("The file has no rows to read.");
  }

  const header = options.mapping ? applyMapping(selected.header, selected.rows, options.mapping) : selected.header;
  return parsePlanningRows(selected.rows, header, {
    format: "csv",
    delimiter: selected.delimiter,
    sheetName: null,
    candidateSheets: [],
  });
}
