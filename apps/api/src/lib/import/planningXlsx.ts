import type { Cell, Worksheet } from "exceljs";
import { CsvParseError } from "./csv.js";
import {
  applyMapping,
  findLooseHeader,
  findPlanningHeader,
  parsePlanningRows,
  type PlanningHeader,
  type PlanningMapping,
  type PlanningParseResult,
} from "./planningImport.js";

export const MAX_XLSX_SHEETS = 50;
export const MAX_XLSX_SCAN_ROWS = 5000;
export const MAX_XLSX_SCAN_COLUMNS = 200;

const MIN_EXCEL_DATE_SERIAL = 20000; // 1954-10-03, below any real content-plan date.
const MAX_EXCEL_DATE_SERIAL = 80000; // 2119-01-05, above any real content-plan date.
const EXCEL_EPOCH_1900 = Date.UTC(1899, 11, 31);
const EXCEL_EPOCH_1904 = Date.UTC(1904, 0, 1);
const DAY_MS = 24 * 60 * 60 * 1000;

type ExcelJSModule = typeof import("exceljs");

let excelJsPromise: Promise<ExcelJSModule> | null = null;

/**
 * ExcelJS is a CommonJS package. A dynamic default import keeps API startup
 * lean and works in the NodeNext ESM build.
 */
async function loadExcelJs(): Promise<ExcelJSModule> {
  if (!excelJsPromise) {
    excelJsPromise = import("exceljs").then((module) => {
      const withDefault = module as ExcelJSModule & { default?: ExcelJSModule };
      return withDefault.default ?? module;
    });
  }
  return excelJsPromise;
}

export class XlsxParseError extends Error {
  readonly code: string;

  constructor(message: string, code = "INVALID_XLSX") {
    super(message);
    this.name = "XlsxParseError";
    this.code = code;
  }
}

interface SheetMatrix {
  rows: string[][];
  /** Hyperlink targets keyed by 1-based Excel row and column. */
  links: Map<string, string>;
  /** Formula cells without a cached result, keyed by 1-based row and column. */
  unresolvedFormulas: Set<string>;
}

interface SheetCandidate {
  name: string;
  matrix: SheetMatrix;
  header: PlanningHeader;
  dataRows: number;
}

interface ConvertedCell {
  text: string;
  hyperlink?: string;
  unresolvedFormula?: boolean;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateOnly(date: Date): string {
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function textFromUnknown(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return formatDateOnly(value);
  if (Array.isArray(value)) return value.map(textFromUnknown).join("");

  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (Array.isArray(object.richText)) return object.richText.map(textFromUnknown).join("");
    if ("text" in object) return textFromUnknown(object.text);
    if ("error" in object) return String(object.error);
  }

  return "";
}

function convertCell(cell: Cell): ConvertedCell {
  const value = cell.value;
  const valueHyperlink =
    value && typeof value === "object" && "hyperlink" in value
      ? textFromUnknown(value.hyperlink)
      : "";
  const hyperlink = cell.hyperlink || valueHyperlink || undefined;

  if (value && typeof value === "object" && ("formula" in value || "sharedFormula" in value)) {
    const result = "result" in value ? value.result : undefined;
    if (result === undefined || result === null) {
      return { text: "", hyperlink, unresolvedFormula: true };
    }
    return { text: textFromUnknown(result), hyperlink };
  }

  return { text: textFromUnknown(value), hyperlink };
}

function worksheetToMatrix(worksheet: Worksheet): SheetMatrix {
  const lastRow = Math.min(worksheet.rowCount, MAX_XLSX_SCAN_ROWS);
  const columnCount = Math.min(Math.max(worksheet.actualColumnCount, 1), MAX_XLSX_SCAN_COLUMNS);
  const rows: string[][] = [];
  const links = new Map<string, string>();
  const unresolvedFormulas = new Set<string>();

  for (let rowNumber = 1; rowNumber <= lastRow; rowNumber += 1) {
    const row = worksheet.findRow(rowNumber);
    const values: string[] = [];

    for (let column = 1; column <= columnCount; column += 1) {
      if (!row) {
        values.push("");
        continue;
      }

      const converted = convertCell(row.getCell(column));
      values.push(converted.text);
      if (converted.hyperlink) {
        links.set(`${rowNumber}:${column}`, converted.hyperlink);
      }
      if (converted.unresolvedFormula) {
        unresolvedFormulas.add(`${rowNumber}:${column}`);
      }
    }

    rows.push(values);
  }

  return { rows, links, unresolvedFormulas };
}

function countDataRows(rows: string[][], header: PlanningHeader): number {
  return rows
    .slice(header.dataStart)
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .length;
}

/**
 * Converts an Excel serial date to YYYY-MM-DD. ExcelJS usually already returns
 * Date cells, but this fallback handles cells whose date number format is absent.
 */
export function excelSerialToIsoDate(serial: number, date1904 = false): string | null {
  if (!Number.isFinite(serial) || serial < 1) return null;

  const wholeDays = Math.floor(serial);
  let days: number;

  if (date1904) {
    days = wholeDays;
  } else {
    // Excel's 1900 date system contains a fictitious 1900-02-29 (serial 60).
    if (wholeDays === 60) return null;
    days = wholeDays < 60 ? wholeDays : wholeDays - 1;
  }

  const date = new Date((date1904 ? EXCEL_EPOCH_1904 : EXCEL_EPOCH_1900) + days * DAY_MS);
  const year = date.getUTCFullYear();
  if (year < 1950 || year > 2100) return null;

  return formatDateOnly(date);
}

function normalizeDateSerials(rows: string[][], header: PlanningHeader, date1904: boolean): void {
  const dateColumn = header.columns.postDate;
  if (dateColumn === undefined) return;

  for (let index = header.dataStart; index < rows.length; index += 1) {
    const raw = rows[index]?.[dateColumn]?.trim();
    if (!raw || !/^\d{5}(?:\.\d+)?$/.test(raw)) continue;

    const serial = Number(raw);
    if (serial < MIN_EXCEL_DATE_SERIAL || serial > MAX_EXCEL_DATE_SERIAL) continue;

    const isoDate = excelSerialToIsoDate(serial, date1904);
    if (isoDate) rows[index][dateColumn] = isoDate;
  }
}

function applyHyperlinks(rows: string[][], header: PlanningHeader, links: Map<string, string>): void {
  if (links.size === 0) return;

  const outputColumn = header.columns.outputUrl;
  const fallbackColumns = [header.columns.designCopy, header.columns.assetNotes].filter(
    (column): column is number => column !== undefined,
  );

  for (let index = header.dataStart; index < rows.length; index += 1) {
    const excelRow = index + 1;

    if (outputColumn !== undefined) {
      const link = links.get(`${excelRow}:${outputColumn + 1}`);
      if (link) rows[index][outputColumn] = link;
    }

    for (const column of fallbackColumns) {
      if (rows[index][column]?.trim()) continue;
      const link = links.get(`${excelRow}:${column + 1}`);
      if (link) rows[index][column] = link;
    }
  }
}

function formulaWarningRows(candidate: SheetCandidate): Set<number> {
  if (candidate.matrix.unresolvedFormulas.size === 0) return new Set();

  const mappedColumns = new Set(
    Object.values(candidate.header.columns).filter((column): column is number => column !== undefined),
  );
  const rowsWithWarnings = new Set<number>();

  for (const key of candidate.matrix.unresolvedFormulas) {
    const [rowText, columnText] = key.split(":");
    const row = Number(rowText);
    const column = Number(columnText) - 1;

    if (row <= candidate.header.dataStart) continue;
    if (!mappedColumns.has(column)) continue;
    rowsWithWarnings.add(row);
  }

  return rowsWithWarnings;
}

function candidateScore(candidate: SheetCandidate): number {
  // Prefer a sheet with data over an empty template, then the longest sheet.
  // Recognized columns break ties between equally sized sheets.
  return candidate.dataRows * 1_000 + candidate.header.recognizedColumns;
}

export async function parsePlanningXlsx(
  buffer: Buffer,
  options: { sheetName?: string; mapping?: PlanningMapping } = {},
): Promise<PlanningParseResult> {
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new XlsxParseError("The XLSX file isn't valid, is damaged, or is password protected.");
  }

  const ExcelJS = await loadExcelJs();
  const workbook = new ExcelJS.Workbook();

  try {
    // ExcelJS's bundled type shadows Node's Buffer with an ArrayBuffer.
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new XlsxParseError("The XLSX file isn't valid, is damaged, or is password protected.");
  }

  const worksheets = workbook.worksheets;
  if (worksheets.length === 0) {
    throw new XlsxParseError("The workbook has no sheets.");
  }
  if (worksheets.length > MAX_XLSX_SHEETS) {
    throw new XlsxParseError(
      `The workbook has ${worksheets.length} sheets. The limit is ${MAX_XLSX_SHEETS} sheets per file.`,
    );
  }

  const requestedSheet = options.sheetName?.trim();
  if (requestedSheet && !worksheets.some((worksheet) => worksheet.name === requestedSheet)) {
    throw new XlsxParseError(`Sheet "${requestedSheet}" isn't in the workbook.`);
  }

  const candidates: SheetCandidate[] = [];
  // Sheets without the three required headers, kept in case no sheet has them: the user maps those by hand
  const looseCandidates: SheetCandidate[] = [];

  for (const worksheet of worksheets) {
    if (worksheet.state === "veryHidden") continue;
    if (requestedSheet && worksheet.name !== requestedSheet) continue;

    if (worksheet.actualRowCount > MAX_XLSX_SCAN_ROWS) {
      if (requestedSheet) {
        throw new XlsxParseError(
          `Sheet "${worksheet.name}" has more than ${MAX_XLSX_SCAN_ROWS} rows and can't be read.`,
        );
      }
      continue;
    }
    if (worksheet.actualColumnCount > MAX_XLSX_SCAN_COLUMNS) {
      if (requestedSheet) {
        throw new XlsxParseError(
          `Sheet "${worksheet.name}" has more than ${MAX_XLSX_SCAN_COLUMNS} columns and can't be read.`,
        );
      }
      continue;
    }

    const matrix = worksheetToMatrix(worksheet);
    const strict = findPlanningHeader(matrix.rows);
    const header = strict ?? findLooseHeader(matrix.rows);
    if (!header) continue;

    (strict ? candidates : looseCandidates).push({
      name: worksheet.name,
      matrix,
      header,
      dataRows: countDataRows(matrix.rows, header),
    });
  }

  const pool = candidates.length > 0 ? candidates : looseCandidates;
  if (pool.length === 0) {
    const scope = requestedSheet ? `Sheet "${requestedSheet}"` : "The workbook";
    throw new XlsxParseError(`${scope} has no rows to read.`);
  }

  pool.sort((a, b) => candidateScore(b) - candidateScore(a) || a.name.localeCompare(b.name));
  const selected = pool[0];

  // The user's choice replaces the guess before anything reads columns (links, date serials, formula warnings)
  if (options.mapping) selected.header = applyMapping(selected.header, selected.matrix.rows, options.mapping);

  applyHyperlinks(selected.matrix.rows, selected.header, selected.matrix.links);
  normalizeDateSerials(selected.matrix.rows, selected.header, Boolean(workbook.properties.date1904));

  const warningRows = formulaWarningRows(selected);

  try {
    return parsePlanningRows(selected.matrix.rows, selected.header, {
      format: "xlsx",
      delimiter: null,
      sheetName: selected.name,
      candidateSheets: pool.map((candidate) => candidate.name),
      rowWarnings: (sourceRow) =>
        warningRows.has(sourceRow)
          ? ["This row has a formula without a saved value; open the file in Excel and save it again."]
          : [],
    });
  } catch (error) {
    if (error instanceof CsvParseError) {
      throw new XlsxParseError(error.message);
    }
    throw error;
  }
}
