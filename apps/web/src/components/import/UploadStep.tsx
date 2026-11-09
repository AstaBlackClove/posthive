"use client";

import { useRef, useState } from "react";
import { CloudUploadIcon, DownloadIcon, FileSpreadsheetIcon, InfoIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InlineAlert } from "@/components/InlineAlert";
import { Spinner } from "@/components/Spinner";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { EXAMPLE_ROWS, EXPECTED_COLUMNS, FLEXIBLE_NOTE, MAX_FILE_MB, MAX_ROWS, formatBytes } from "@/lib/import-file";

export const TEMPLATE_HREF = "/import-plan-template.xlsx";
const ACCEPT = ".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** What the preview told us about the chosen file. */
export interface UploadedFile {
  name: string;
  size: number;
  format: "csv" | "xlsx";
  rows: number;
  columns: number;
  headerRow: number;
  /** The sheet read, for a workbook. */
  sheetName: string | null;
}

type Props = {
  file: UploadedFile | null;
  /** The file is being read by the server. */
  checking: boolean;
  /** A reason the last file could not be used. */
  error: string | null;
  onFile: (file: File) => void;
  onRemove: () => void;
  onDismissError: () => void;
};

function Check({ children }: { children: string }) {
  return (
    <Badge variant="success" className="gap-1.5">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-green-600" />
      {children}
    </Badge>
  );
}

/** Option A (the dropzone, then the file card) and Option B (the template), with what a plan has to look like. */
export function UploadStep({ file, checking, error, onFile, onRemove, onDismissError }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = () => input.current?.click();
  const take = (list: FileList | null | undefined) => {
    const next = list?.[0];
    if (next) onFile(next);
  };

  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <section aria-labelledby="upload-title" className="rounded-2xl border border-border bg-surface p-5">
          <Badge variant="plain" className="border-0 bg-neutral-900 type-body-m-xxs tracking-wide text-brand-500 uppercase">
            Option A
          </Badge>
          <h2 id="upload-title" className="mt-2 type-body-sb-l">
            Upload your plan
          </h2>
          <p className="type-body-r-xs text-muted">Drop your quarterly or monthly plan, and we&apos;ll map it to {BRAND.name} fields next.</p>

          <input ref={input} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} aria-label="Choose a CSV or XLSX file" onChange={(e) => { take(e.target.files); e.target.value = ""; }} />

          {error && (
            <InlineAlert tone="danger" className="mt-4" title="This file can't be used">
              <span>{error}</span>{" "}
              <button type="button" onClick={onDismissError} className="underline underline-offset-2">
                Dismiss
              </button>
            </InlineAlert>
          )}

          {file ? (
            <div className="mt-4 rounded-2xl border border-dashed border-neutral-500 bg-bg p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-neutral-600">
                  <FileSpreadsheetIcon aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate type-body-sb-m">{file.name}</p>
                  <p className="type-body-r-xs text-muted">
                    {formatBytes(file.size)} · {file.rows} {file.rows === 1 ? "row" : "rows"} detected · {file.columns} {file.columns === 1 ? "column" : "columns"} · Header on row {file.headerRow}
                  </p>
                </div>
                <Badge variant="success">Ready to map</Badge>
                <Button variant="secondary" onClick={pick} disabled={checking}>
                  Replace
                </Button>
                <Button variant="ghost" className="text-red-600 hover:text-red-600" onClick={onRemove} disabled={checking}>
                  Remove
                </Button>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Progress value={100} aria-label="Upload progress" className="flex-1" indicatorClassName="bg-green-600" />
                <span className="type-body-r-xs whitespace-nowrap text-green-700">Upload complete · 100%</span>
              </div>
              <ul aria-label="File checks" className="mt-3 flex flex-wrap gap-2">
                <li><Check>{`File type: ${file.format.toUpperCase()}`}</Check></li>
                <li><Check>{`Size under ${MAX_FILE_MB} MB`}</Check></li>
                <li><Check>{`${file.rows} / ${MAX_ROWS.toLocaleString("en-US")} rows`}</Check></li>
                <li><Check>{file.sheetName ? `Sheet: ${file.sheetName}` : "Encoding UTF-8"}</Check></li>
              </ul>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); take(e.dataTransfer.files); }}
              className={cn("dropzone mt-4 flex flex-col items-center gap-3 bg-bg px-4 py-10 text-center transition-colors", dragging && "border-brand-500 bg-brand-100")}
            >
              {checking ? (
                <div className="flex items-center gap-2 text-brand-800">
                  <Spinner size="sm" label="Checking file" />
                  <span className="type-body-m-s">Checking file…</span>
                </div>
              ) : (
                <>
                  <span className="flex size-12 items-center justify-center rounded-xl bg-brand-100 text-brand-800">
                    <CloudUploadIcon aria-hidden="true" className="size-6" />
                  </span>
                  <p className="type-body-m-xl">Drag &amp; drop your CSV or XLSX file here</p>
                  <Button onClick={pick}>Browse file</Button>
                  <p className="type-body-r-xs text-muted">
                    .csv or .xlsx · Max {MAX_FILE_MB} MB · Up to {MAX_ROWS.toLocaleString("en-US")} rows · Your file stays private
                  </p>
                </>
              )}
            </div>
          )}

          {file && checking && (
            <p className="mt-3 flex items-center gap-2 type-body-r-xs text-brand-800">
              <Spinner size="sm" label="Checking file" /> Checking file…
            </p>
          )}

          <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 type-body-r-xs text-muted">
            <DownloadIcon aria-hidden="true" className="size-4" />
            Not sure about the format?
            <a href={TEMPLATE_HREF} download className="type-body-sb-xs text-brand-800 underline underline-offset-2">
              Download the {BRAND.name} template
            </a>
          </p>
        </section>

        <section aria-labelledby="example-title" className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="example-title" className="type-body-sb-l">
                What a plan looks like
              </h2>
              <p className="type-body-r-xs text-muted">Example rows. Your headers can differ; you match them in the next step.</p>
            </div>
            <Badge variant="plain">{Object.keys(EXAMPLE_ROWS[0]).length} columns</Badge>
          </div>
          <div className="mt-3 rounded-xl border border-border bg-bg">
            <Table aria-label="Example plan rows" className="min-w-160">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {Object.keys(EXAMPLE_ROWS[0]).map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {EXAMPLE_ROWS.map((row) => (
                  <TableRow key={row["Content Title"]}>
                    {Object.values(row).map((value, i) => (
                      <TableCell key={i} className={cn(i === 0 ? "type-body-m-s" : "text-fg", i > 0 && i < 4 && "whitespace-nowrap")}>{value || <span className="text-muted">—</span>}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <section aria-labelledby="template-title" className="rounded-2xl border border-border bg-surface p-5">
          <Badge variant="plain" className="border-0 bg-neutral-900 type-body-m-xxs tracking-wide text-brand-500 uppercase">
            Option B
          </Badge>
          <h2 id="template-title" className="mt-2 type-body-sb-l">
            Start with a template
          </h2>
          <p className="type-body-r-xs text-muted">Fill in our template in Google Sheets or Excel, then upload it here.</p>
          <Button asChild variant="olive" className="mt-4 w-full">
            <a href={TEMPLATE_HREF} download>
              <DownloadIcon />
              Download {BRAND.name} template
            </a>
          </Button>
        </section>

        <section aria-labelledby="expected-title" className="rounded-2xl border border-border bg-surface p-5">
          <h2 id="expected-title" className="type-body-sb-l">
            Expected columns
          </h2>
          <p className="type-body-r-xs text-muted">Header names don&apos;t have to match. We auto-match close variants and you can map the rest.</p>
          <ul className="mt-3 space-y-1.5">
            {EXPECTED_COLUMNS.map((c) => (
              <li key={c.name} className="flex items-center justify-between gap-2">
                <span className="rounded-lg bg-neutral-50 px-2 py-0.5 type-mono-r-xs text-fg">{c.name}</span>
                <Badge variant={c.required ? "brand" : "default"}>{c.required ? "Required" : "Optional"}</Badge>
              </li>
            ))}
          </ul>
        </section>

        <InlineAlert tone="warning" role="status" icon={<InfoIcon />} title={FLEXIBLE_NOTE.title}>
          {FLEXIBLE_NOTE.body}
        </InlineAlert>
      </div>
    </div>
  );
}
