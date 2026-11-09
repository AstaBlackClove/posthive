"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/InlineAlert";
import { Spinner } from "@/components/Spinner";
import { TopbarActions } from "@/components/dashboard/Topbar";
import { FixRecordsDialog, type RowFixes } from "@/components/import/FixRecordsDialog";
import { ImportActionBar } from "@/components/import/ImportActionBar";
import { ImportStepper } from "@/components/import/ImportStepper";
import { ImportSuccess } from "@/components/import/ImportSuccess";
import { MappingStep } from "@/components/import/MappingStep";
import { ReviewStep } from "@/components/import/ReviewStep";
import { UploadStep, type UploadedFile } from "@/components/import/UploadStep";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { formatTime, wibDateKey } from "@/lib/datetime";
import { STEP_HEADINGS, validateImportFile, type ImportStep } from "@/lib/import-file";
import {
  mappingChanged,
  mappingToSend,
  summarizeMapping,
  type ColumnMapping,
  type FileColumn,
  type PlanningField,
} from "@/lib/import-mapping";
import { classify, formatPlanDate, summarizeImport, tabCounts } from "@/lib/import-rows";
import {
  buildCommitPayload,
  buildReviewRows,
  canImport,
  type FieldIssue,
  type ReviewRow,
  type ServerRow,
} from "@/lib/importReview";

interface PreviewResponse {
  file: { name: string; format: "csv" | "xlsx"; sheetName: string | null; headerRow: number };
  columns: FileColumn[];
  missingFields: PlanningField[];
  summary: { totalRows: number };
  rows: ServerRow[];
  accountCount: Record<string, number>;
}

interface CommitResponse {
  summary: { totalRows: number; created: number };
}

interface CommitRefusal {
  rows?: Array<{ sourceRow: number; errors: FieldIssue[] }>;
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong. Try again.");

const edited = (row: ReviewRow) => JSON.stringify(row.fields) !== JSON.stringify(row.original) || row.removed !== (row.duplicateKind === "workspace");

export default function ImportPlanPage() {
  const { user } = useAuth();
  const now = useMemo(() => new Date(), []);
  const previewRequest = useRef(0);

  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState<UploadedFile | null>(null);
  const [columns, setColumns] = useState<FileColumn[]>([]);
  const [overrides, setOverrides] = useState<ColumnMapping>({});
  /** The mapping the rows on screen were read with: the commit has to read the file the same way. */
  const [sentMapping, setSentMapping] = useState<ColumnMapping | undefined>(undefined);
  const [serverRows, setServerRows] = useState<ServerRow[]>([]);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [accountCount, setAccountCount] = useState<Record<string, number>>({});
  const [serverErrors, setServerErrors] = useState<Map<number, FieldIssue[]>>(new Map());
  const [checking, setChecking] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fixing, setFixing] = useState<number[] | null>(null);
  const [importedAt, setImportedAt] = useState<Date | null>(null);

  const items = useMemo(() => classify(rows, serverErrors), [rows, serverErrors]);
  const counts = tabCounts(items);
  const kept = rows.filter((r) => !r.removed).length;
  const ready = useMemo(() => canImport(rows, serverErrors), [rows, serverErrors]);
  const hasEdits = rows.some(edited);
  const fixedCount = items.filter((i) => i.state.status === "fixed").length;
  const mapping = summarizeMapping(columns, overrides);
  const heading = STEP_HEADINGS[step];

  // An import in flight must not be interrupted by closing the tab
  useEffect(() => {
    if (!committing) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [committing]);

  /** Reads the file on the server (with the user's mapping, when there is one) and shows what it found. */
  async function preview(source: File, mappingToUse: ColumnMapping | undefined): Promise<PreviewResponse | null> {
    const id = ++previewRequest.current;
    setChecking(true);
    const body = new FormData();
    body.append("file", source, source.name);
    if (mappingToUse) body.append("mapping", JSON.stringify(mappingToUse));
    try {
      const data = await apiFetch<PreviewResponse>("/jobs/import/preview", { method: "POST", body });
      if (previewRequest.current !== id) return null;
      setUploaded({
        name: data.file.name || source.name,
        size: source.size,
        format: data.file.format,
        rows: data.summary.totalRows,
        columns: data.columns.length,
        headerRow: data.file.headerRow,
        sheetName: data.file.sheetName,
      });
      setColumns(data.columns);
      setServerRows(data.rows);
      setRows(buildReviewRows(data.rows));
      setAccountCount(data.accountCount);
      setServerErrors(new Map());
      setSentMapping(mappingToUse);
      // The columns now say what they were read as, so what the user decided is the whole mapping
      setOverrides(mappingToUse ?? {});
      return data;
    } catch (err) {
      if (previewRequest.current !== id) return null;
      setUploadError(errorMessage(err));
      return null;
    } finally {
      if (previewRequest.current === id) setChecking(false);
    }
  }

  function reset() {
    previewRequest.current += 1;
    setChecking(false);
    setFile(null);
    setUploaded(null);
    setColumns([]);
    setOverrides({});
    setSentMapping(undefined);
    setServerRows([]);
    setRows([]);
    setServerErrors(new Map());
    setUploadError(null);
    setNotice(null);
    setImportedAt(null);
    setStep("upload");
  }

  async function handleFile(picked: File) {
    const problem = validateImportFile(picked);
    if (problem) {
      setUploadError(problem);
      return;
    }
    setUploadError(null);
    setNotice(null);
    setFile(picked);
    setUploaded(null);
    const data = await preview(picked, undefined);
    if (!data) setFile(null);
  }

  async function continueFromMapping() {
    if (!file) return;
    setNotice(null);
    // Read the file again only when the mapping is not the one the rows were read with
    if (mappingChanged(columns, overrides)) {
      const data = await preview(file, mappingToSend(columns, overrides));
      if (!data) return;
    }
    setStep("review");
  }

  async function commit() {
    if (!file || !ready || committing) return;
    setCommitting(true);
    setNotice(null);
    setServerErrors(new Map());
    const payload = buildCommitPayload(rows);
    const body = new FormData();
    body.append("file", file, file.name);
    body.append("include", JSON.stringify(payload.include));
    body.append("edits", JSON.stringify(payload.edits));
    if (sentMapping) body.append("mapping", JSON.stringify(sentMapping));
    try {
      await apiFetch<CommitResponse>("/jobs/import/commit", { method: "POST", body });
      setImportedAt(new Date());
      setStep("done");
    } catch (err) {
      // Nothing was saved. Mark the rows the server refused so they can be fixed.
      const refused = (err as { data?: CommitRefusal }).data?.rows;
      if (refused?.length) {
        setServerErrors(new Map(refused.map((r) => [r.sourceRow, r.errors])));
        setNotice(`${errorMessage(err)} Check the ${refused.length} ${refused.length === 1 ? "row" : "rows"} marked below.`);
      } else {
        setNotice(errorMessage(err));
      }
    } finally {
      setCommitting(false);
    }
  }

  const setRemoved = (sourceRow: number, removed: boolean) =>
    setRows((current) => current.map((r) => (r.sourceRow === sourceRow ? { ...r, removed } : r)));

  function applyFixes(fixes: RowFixes, exclude: number[]) {
    setRows((current) =>
      current.map((r) => {
        const fixed = fixes[r.sourceRow] ? { ...r, fields: { ...r.fields, ...fixes[r.sourceRow] } } : r;
        return exclude.includes(r.sourceRow) ? { ...fixed, removed: true } : fixed;
      })
    );
  }

  const openFix = (only?: number) => setFixing(only !== undefined ? [only] : items.filter((i) => i.state.needsAttention).map((i) => i.row.sourceRow));

  return (
    <div className="theme-dashboard flex-1 overflow-y-auto bg-background">
      <div className="mx-auto flex max-w-[110rem] flex-col gap-4 p-4 pt-16 md:p-6 md:pt-6">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between xl:gap-6">
          <div className="min-w-0">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>Content workspace</BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Import quarter plan</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="mt-3 type-display-m-6 text-fg">{heading.title}</h1>
            <p className="mt-1 max-w-2xl type-body-r-m text-fg">{heading.subtitle}</p>
          </div>
          <TopbarActions fullName={user?.name ?? ""} avatarUrl={user?.avatarUrl} today={now} />
        </header>

        <ImportStepper current={step} />

        {notice && (
          <InlineAlert tone="danger" title="The import didn't go through">
            {notice}{" "}
            <button type="button" onClick={() => setNotice(null)} className="underline underline-offset-2">
              Dismiss
            </button>
          </InlineAlert>
        )}

        {step === "upload" && (
          <>
            <UploadStep
              file={uploaded}
              checking={checking}
              error={uploadError}
              onFile={handleFile}
              onRemove={reset}
              onDismissError={() => setUploadError(null)}
            />
            <ImportActionBar status={uploaded ? `${uploaded.name} ready · ${uploaded.rows} ${uploaded.rows === 1 ? "row" : "rows"} detected` : "No file selected yet"}>
              <Button asChild variant="secondary">
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
              <Button disabled={!uploaded || checking} onClick={() => setStep("map")}>
                Continue
              </Button>
            </ImportActionBar>
          </>
        )}

        {step === "map" && uploaded && (
          <>
            <MappingStep
              fileName={uploaded.name}
              rowCount={uploaded.rows}
              columns={columns}
              overrides={overrides}
              onChange={setOverrides}
              rows={serverRows}
              onReplaceFile={() => setStep("upload")}
            />
            {uploadError && (
              <InlineAlert tone="danger" title="This mapping can't be used">
                {uploadError}{" "}
                <button type="button" onClick={() => setUploadError(null)} className="underline underline-offset-2">
                  Dismiss
                </button>
              </InlineAlert>
            )}
            <ImportActionBar
              status={
                <>
                  Step 2 of 4 · {mapping.mappedColumns} of {mapping.totalColumns} columns mapped · {mapping.requiredMapped}/{mapping.requiredTotal} required fields
                  {hasEdits && mappingChanged(columns, overrides) && <span className="block text-brand-800">Changing the mapping reads the file again and resets the fixes you made.</span>}
                </>
              }
            >
              <Button variant="secondary" disabled={checking} onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button disabled={mapping.missingRequired.length > 0 || checking} onClick={continueFromMapping}>
                {checking ? (
                  <>
                    <Spinner size="sm" label="Checking file" /> Checking…
                  </>
                ) : (
                  <>
                    Continue to preview <ArrowRightIcon />
                  </>
                )}
              </Button>
            </ImportActionBar>
          </>
        )}

        {step === "review" && uploaded && (
          <>
            <ReviewStep
              file={{ name: uploaded.name, size: uploaded.size, rows: uploaded.rows, mappedColumns: mapping.mappedColumns, totalColumns: mapping.totalColumns }}
              items={items}
              locked={committing}
              fixedCount={fixedCount}
              onEditMapping={() => setStep("map")}
              onExclude={(n) => setRemoved(n, true)}
              onInclude={(n) => setRemoved(n, false)}
              onFix={openFix}
            />
            <ImportActionBar
              status={
                counts.attention > 0
                  ? `${counts.valid} ready · ${counts.attention} need attention · ${counts.excluded} excluded (kept in the Excluded tab, not deleted)`
                  : kept === 0
                    ? "Nothing to import · every row is excluded"
                    : `${kept} ${kept === 1 ? "row" : "rows"} will be imported as ${kept === 1 ? "a draft" : "drafts"}${counts.excluded > 0 ? ` · ${counts.excluded} excluded ${counts.excluded === 1 ? "row stays" : "rows stay"} in the Excluded tab` : ""}`
              }
            >
              <Button variant="secondary" disabled={committing} onClick={() => setStep("map")}>
                Back
              </Button>
              {counts.attention > 0 ? (
                <Button onClick={() => openFix()}>
                  Fix {counts.attention} {counts.attention === 1 ? "record" : "records"}
                </Button>
              ) : (
                <Button disabled={!ready || committing} onClick={commit}>
                  {committing ? (
                    <>
                      <Spinner size="sm" label="Importing" /> Importing…
                    </>
                  ) : (
                    `Confirm import (${kept})`
                  )}
                </Button>
              )}
            </ImportActionBar>
            <FixRecordsDialog
              open={fixing !== null}
              onOpenChange={(open) => !open && setFixing(null)}
              rows={rows}
              fixing={fixing ?? []}
              serverErrors={serverErrors}
              onSave={applyFixes}
            />
          </>
        )}

        {step === "done" && uploaded && (
          <>
            <ImportSuccess fileName={uploaded.name} summary={summarizeImport(rows, accountCount, wibDateKey(now))} />
            <ImportActionBar
              status={importedAt ? `Imported ${formatPlanDate(wibDateKey(importedAt))} · ${formatTime(importedAt)}${user?.name ? ` by ${user.name}` : ""}` : "Imported"}
            >
              <Button variant="ghost" onClick={reset}>
                Import another plan
              </Button>
              <Button asChild variant="secondary">
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
              <Button asChild>
                <Link href="/jobs">View imported content</Link>
              </Button>
            </ImportActionBar>
          </>
        )}
      </div>
    </div>
  );
}
