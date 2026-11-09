/**
 * Small RFC 4180-compatible CSV parser.
 *
 * No dependency: the content-plan import must preserve `Link Copywrite`
 * exactly, including commas, quotes, and line breaks inside a cell.
 */

export type CsvDelimiter = "," | ";";

export class CsvParseError extends Error {
  readonly line?: number;

  constructor(message: string, line?: number) {
    super(message);
    this.name = "CsvParseError";
    this.line = line;
  }
}

export function decodeUtf8(buffer: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    throw new CsvParseError("The CSV file must be UTF-8 encoded.");
  }
}

export function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

export function parseCsv(input: string, delimiter: CsvDelimiter = ","): string[][] {
  const text = stripBom(input);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let line = 1;
  let i = 0;

  const finishField = () => {
    row.push(field);
    field = "";
  };

  const finishRow = () => {
    finishField();
    rows.push(row);
    row = [];
    line += 1;
  };

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }

      // Preserve CR/LF exactly as they appear inside a quoted cell.
      if (char === "\n") line += 1;
      field += char;
      i += 1;
      continue;
    }

    if (char === '"' && field.length === 0) {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (char === delimiter) {
      finishField();
      i += 1;
      continue;
    }

    if (char === "\r") {
      if (text[i + 1] === "\n") i += 1;
      finishRow();
      i += 1;
      continue;
    }

    if (char === "\n") {
      finishRow();
      i += 1;
      continue;
    }

    field += char;
    i += 1;
  }

  if (inQuotes) {
    throw new CsvParseError(`A quote in the CSV is never closed (line ${line}).`, line);
  }

  // Do not emit a phantom row for a trailing newline.
  if (field.length > 0 || row.length > 0) {
    finishField();
    rows.push(row);
  }

  return rows;
}

/**
 * Try both delimiters and let the caller score the parsed result.
 * Excel in some locales exports semicolon-separated CSV.
 */
export function parseCsvWithDelimiters(input: string): Array<{
  delimiter: CsvDelimiter;
  rows: string[][];
  error?: CsvParseError;
}> {
  return ([",", ";"] as const).map((delimiter) => {
    try {
      return { delimiter, rows: parseCsv(input, delimiter) };
    } catch (error) {
      return {
        delimiter,
        rows: [],
        error: error instanceof CsvParseError ? error : new CsvParseError("The CSV isn't valid."),
      };
    }
  });
}
