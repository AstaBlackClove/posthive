"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../../lib/api";
import { ImportReviewTable } from "../../../components/ImportReviewTable";
import { cn } from "../../../lib/cn";
import {
  buildCommitPayload,
  buildReviewRows,
  canImport,
  reviewSummary,
  type FieldIssue,
  type ReviewFields,
  type ReviewRow,
  type ServerRow,
} from "../../../lib/importReview";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

interface PreviewResponse {
  file: {
    name: string;
    format: "csv" | "xlsx";
    delimiter: string | null;
    sheetName: string | null;
    candidateSheets: string[];
    headerRow: number;
    subHeaderRow: number | null;
  };
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
  };
  rows: ServerRow[];
  accountCount: Record<string, number>;
}

interface CommitResponse {
  summary: { totalRows: number; created: number };
  jobs: Array<{ id: string; sourceRow: number; title: string; scheduledFor: string }>;
}

interface CommitRefusal {
  rows?: Array<{ sourceRow: number; errors: FieldIssue[] }>;
}

type Phase = "idle" | "previewing" | "ready" | "committing" | "done" | "error";

const REQUIRED_COLUMNS = [
  {
    name: "Content Title",
    description: "Judul konten. Dipakai sebagai judul di kalender.",
    example: "Slope Stability Before the Rain Peaks",
  },
  {
    name: "Post Date",
    description: "Publish date. Defaults to 09:00 WIB.",
    example: "22-10-2026",
  },
  {
    name: "Platform",
    description: "LinkedIn, Instagram, Website, atau Mirroring (LI&Ig).",
    example: "Mirroring (LI&Ig)",
  },
];

const OPTIONAL_COLUMNS = [
  { name: "Content Pillar", description: "Pilar konten dari file marketing." },
  { name: "Content Category", description: "Kategori konten." },
  { name: "Link Copywrite", description: "Design copy mentah. Disimpan sebagai content.designCopy." },
  { name: "Caption", description: "Caption final. Disimpan sebagai content.text; boleh kosong." },
  { name: "Aset Pendukung", description: "Link/notes aset, bukan upload media." },
  { name: "PIC Content", description: "PIC konten." },
  { name: "Content Review / Acc by", description: "Reviewer atau approver." },
  { name: "PIC Design", description: "PIC desain." },
  { name: "Progress Content", description: "Progress dari file sumber." },
  { name: "Link Output", description: "Link output/Figma." },
  { name: "Status", description: "Status sumber, misalnya Published." },
];

const PLATFORM_GUIDE = [
  { value: "LinkedIn / LI", result: "linkedin" },
  { value: "Instagram / IG", result: "instagram" },
  { value: "Mirroring (LI&Ig)", result: "linkedin + instagram" },
  { value: "Website", result: "website (draft, tanpa target sosial)" },
];

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Terjadi kesalahan. Coba lagi.";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function validateImportFile(file: File): string | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xls") || name.endsWith(".xlsm")) {
    return "File Excel lama (.xls/.xlsm) belum didukung. Simpan ulang sebagai .xlsx atau CSV UTF-8.";
  }
  if (!name.endsWith(".csv") && !name.endsWith(".xlsx")) {
    return "Format file harus .csv atau .xlsx.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return "File terlalu besar. Maksimum 5 MB.";
  }
  return null;
}

function StatusBadge({ tone, label }: { tone: string; label: string }) {
  return (
    <span className={cn("type-body-m-xs whitespace-nowrap", tone)}>
      {label}
    </span>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className={cn("type-body-sb-l tabular-nums", tone ?? "text-fg")}>
        {value}
      </span>
      <span className="type-body-r-xs text-muted">{label}</span>
    </div>
  );
}

export default function ImportContentPlanPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRequestRef = useRef(0);
  const [activeTab, setActiveTab] = useState<"input" | "format">("input");
  const [csvText, setCsvText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [fileInfo, setFileInfo] = useState<PreviewResponse["file"] | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [accountCount, setAccountCount] = useState<Record<string, number>>({});
  const [serverErrors, setServerErrors] = useState<Map<number, FieldIssue[]>>(new Map());
  const [commitResult, setCommitResult] = useState<CommitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isBusy = phase === "previewing" || phase === "committing";
  const locked = phase === "committing" || phase === "done";
  const summary = useMemo(() => reviewSummary(rows, serverErrors), [rows, serverErrors]);
  const ready = useMemo(() => canImport(rows, serverErrors), [rows, serverErrors]);
  const keptCount = summary.total - summary.removed;

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (phase === "committing") {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [phase]);

  function resetReview() {
    setFileInfo(null);
    setRows([]);
    setServerErrors(new Map());
    setCommitResult(null);
  }

  async function runPreview(importFile: File) {
    const requestId = ++previewRequestRef.current;
    setPhase("previewing");
    setError(null);
    resetReview();

    const body = new FormData();
    body.append("file", importFile, importFile.name);

    try {
      const data = await apiFetch<PreviewResponse>("/jobs/import/preview", {
        method: "POST",
        body,
      });
      if (previewRequestRef.current !== requestId) return;
      setFileInfo(data.file);
      setRows(buildReviewRows(data.rows));
      setAccountCount(data.accountCount);
      setPhase("ready");
    } catch (err) {
      if (previewRequestRef.current !== requestId) return;
      setError(errorMessage(err));
      setPhase("error");
    }
  }

  async function processFile(importFile: File) {
    const validation = validateImportFile(importFile);
    if (validation) {
      setFile(null);
      resetReview();
      setError(validation);
      setPhase("error");
      return;
    }

    setFile(importFile);
    setCommitResult(null);
    setError(null);

    if (importFile.name.toLowerCase().endsWith(".csv")) {
      try {
        setCsvText(await importFile.text());
      } catch {
        setCsvText("");
      }
    } else {
      // XLSX is binary; keep the paste editor empty so it cannot show garbled data.
      setCsvText("");
    }

    await runPreview(importFile);
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const importFile = event.target.files?.[0];
    event.target.value = "";
    if (!importFile) return;
    await processFile(importFile);
  }

  async function handleDrop(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    const importFile = event.dataTransfer.files?.[0];
    if (!importFile) return;
    await processFile(importFile);
  }

  async function handlePastePreview() {
    if (!csvText.trim()) {
      setError("CSV masih kosong.");
      return;
    }
    const pasted = new File([csvText], "pasted-content-plan.csv", { type: "text/csv" });
    setFile(pasted);
    await runPreview(pasted);
  }

  async function handleCommit() {
    if (!file || !ready || isBusy) return;

    setPhase("committing");
    setError(null);
    setServerErrors(new Map());

    const payload = buildCommitPayload(rows);
    const body = new FormData();
    body.append("file", file, file.name);
    body.append("include", JSON.stringify(payload.include));
    body.append("edits", JSON.stringify(payload.edits));

    try {
      const data = await apiFetch<CommitResponse>("/jobs/import/commit", {
        method: "POST",
        body,
      });
      setCommitResult(data);
      setPhase("done");
    } catch (err) {
      // Nothing was saved. Mark the rows the server refused so they can be fixed.
      const refused = (err as { data?: CommitRefusal }).data?.rows;
      if (refused?.length) {
        setServerErrors(new Map(refused.map((r) => [r.sourceRow, r.errors])));
        setError(`${errorMessage(err)} Periksa ${refused.length} baris yang ditandai.`);
      } else {
        setError(errorMessage(err));
      }
      setPhase("ready");
    }
  }

  function clearAll() {
    previewRequestRef.current += 1;
    setCsvText("");
    setFile(null);
    resetReview();
    setError(null);
    setPhase("idle");
  }

  function editRow(sourceRow: number, patch: Partial<ReviewFields>) {
    setRows((current) => current.map((r) => (r.sourceRow === sourceRow ? { ...r, fields: { ...r.fields, ...patch } } : r)));
  }

  function setRemoved(sourceRow: number, removed: boolean) {
    setRows((current) => current.map((r) => (r.sourceRow === sourceRow ? { ...r, removed } : r)));
  }

  const importHint = phase !== "ready"
    ? null
    : keptCount === 0
      ? "Tidak ada baris untuk diimpor"
      : summary.needsFix > 0
        ? `Perbaiki ${summary.needsFix} baris dulu`
        : null;

  return (
    <div className="flex flex-col h-full bg-bg text-fg">

      {/* Top bar — pl-14 on mobile to clear the sidebar hamburger */}
      <div className="shrink-0 pl-14 pr-4 py-3 md:px-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/jobs")}
            disabled={isBusy}
            className="flex items-center gap-1.5 type-body-r-s text-muted transition-opacity hover:opacity-70 disabled:opacity-30 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="w-px h-4 shrink-0 bg-border" />
          <h1 className="type-body-sb-s truncate text-fg">Import Content Plan</h1>
        </div>

        {(fileInfo || phase === "done") && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="type-body-r-xs flex-1 min-w-40" aria-live="polite">
              {phase === "done" && commitResult ? (
                <span className="text-green-700">{commitResult.summary.created} draft dibuat</span>
              ) : importHint ? (
                <span className="text-red-600">{importHint}</span>
              ) : (
                <span className="text-green-700">Semua baris valid</span>
              )}
            </span>

            {phase !== "done" && (
              <>
                <button
                  onClick={clearAll}
                  disabled={isBusy}
                  className="btn-secondary min-h-11 px-3 py-1.5 type-body-m-s text-muted disabled:opacity-40 shrink-0"
                >
                  Clear
                </button>
                <button
                  onClick={handleCommit}
                  disabled={!ready || isBusy || !file}
                  className="btn-primary min-h-11 px-3 py-1.5 disabled:opacity-40 shrink-0"
                >
                  {phase === "committing" ? "Mengimpor…" : `Import ${keptCount} post`}
                </button>
              </>
            )}

            {phase === "done" && (
              <>
                <button
                  onClick={clearAll}
                  className="btn-secondary min-h-11 px-3 py-1.5 type-body-m-s text-muted shrink-0"
                >
                  Import another
                </button>
                <button
                  onClick={() => router.push("/jobs")}
                  className="btn-primary min-h-11 px-3 py-1.5 shrink-0"
                >
                  View drafts →
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Main layout: mobile = single column, desktop = side-by-side */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">

        {/* LEFT — input panel */}
        <div className="flex flex-col w-full lg:w-96 lg:shrink-0 lg:overflow-y-auto border-b lg:border-b-0 lg:border-r border-border">
          <div className="flex border-b border-border">
            {(["input", "format"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn("flex-1 py-3 type-body-sb-xs border-b-2 transition-colors",
                  activeTab === tab ? "border-accent text-fg" : "border-transparent text-muted")}
              >
                {tab === "input" ? "CSV / XLSX" : "Format Guide"}
              </button>
            ))}
          </div>

          <div className="flex-1 p-5 space-y-4">
            {activeTab === "input" ? (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleDrop}
                  disabled={isBusy}
                  className="dropzone w-full flex flex-col items-center justify-center gap-3 py-8 text-neutral-500 cursor-pointer hover:border-neutral-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <div className="text-center">
                    <p className="type-body-m-s text-fg">Drop CSV or XLSX file here</p>
                    <p className="type-body-r-xs mt-0.5 text-muted">or click to browse</p>
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                {file && (
                  <div className="card rounded-xl px-3 py-2.5 flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0 text-brand-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <p className="type-body-m-xs truncate text-fg">{file.name}</p>
                      <p className="type-body-r-xxs text-muted">{formatBytes(file.size)}</p>
                    </div>
                    <button
                      onClick={clearAll}
                      disabled={isBusy}
                      className="type-body-r-xxs underline text-muted disabled:opacity-40"
                    >
                      remove
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="type-body-r-xs text-muted">or paste CSV</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <textarea
                  value={csvText}
                  onChange={(event) => {
                    setCsvText(event.target.value);
                    setFile(null);
                    resetReview();
                    setError(null);
                    setPhase("idle");
                  }}
                  placeholder={"Content Title,Post Date,Platform\nSlope Stability Before the Rain Peaks,22-10-2026,Mirroring (LI&Ig)"}
                  rows={10}
                  disabled={isBusy}
                  className="field resize-none px-4 py-3 type-mono-r-xs disabled:opacity-40"
                />

                <div className="flex gap-2">
                  <button
                    onClick={handlePastePreview}
                    disabled={isBusy || !csvText.trim()}
                    className="flex-1 py-2.5 rounded-xl border border-brand-300 bg-brand-100 type-body-sb-s text-brand-800 cursor-pointer transition-colors hover:bg-brand-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {phase === "previewing" ? "Checking…" : "Preview CSV"}
                  </button>
                  <button
                    onClick={clearAll}
                    disabled={isBusy || (!csvText && !file)}
                    className="btn-secondary py-2.5 text-muted disabled:opacity-40"
                  >
                    Clear
                  </button>
                </div>

                <p className="type-body-r-xs text-muted">
                  CSV UTF-8 atau XLSX, maksimum 5 MB dan 1.000 baris data. Sheet XLSX dideteksi otomatis dari baris header.
                </p>
              </>
            ) : (
              <>
                <div>
                  <p className="type-body-sb-xs mb-3 text-fg">Required columns</p>
                  <div className="space-y-3">
                    {REQUIRED_COLUMNS.map((column) => (
                      <div key={column.name} className="card rounded-xl p-3 space-y-1">
                        <code className="type-body-sb-xs text-brand-800">{column.name}</code>
                        <p className="type-body-r-xs mt-1 text-muted">{column.description}</p>
                        <p className="type-mono-r-xs text-muted">e.g. {column.example}</p>
                      </div>
                    ))}
                  </div>

                  <a
                    href="/import-plan-template.xlsx"
                    download="Content Plan Template.xlsx"
                    className="btn-secondary mt-3 flex justify-start py-2.5 text-brand-800"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Template (XLSX)
                  </a>
                </div>

                <div>
                  <p className="type-body-sb-xs mb-3 text-fg">Optional columns</p>
                  <div className="space-y-2">
                    {OPTIONAL_COLUMNS.map((column) => (
                      <div key={column.name} className="card rounded-xl p-3">
                        <code className="type-body-sb-xs text-brand-800">{column.name}</code>
                        <p className="type-body-r-xs mt-1 text-muted">{column.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="type-body-sb-xs mb-3 text-fg">Platform values</p>
                  <div className="card space-y-2 rounded-xl p-3">
                    {PLATFORM_GUIDE.map((item) => (
                      <div key={item.value} className="flex gap-3 type-body-r-xs">
                        <code className="shrink-0 min-w-33 type-mono-r-xs text-brand-800">{item.value}</code>
                        <span className="text-muted">{item.result}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl p-3 border border-brand-400 bg-brand-100">
                  <p className="type-body-sb-xs mb-1 text-brand-800">Link Copywrite = design copy, Caption = caption final</p>
                  <p className="type-body-r-xs text-brand-800">
                    Isi Link Copywrite disimpan mentah sebagai content.designCopy. Isi Caption disimpan sebagai content.text. Media tetap diisi manual di Posthive sebelum scheduling.
                  </p>
                </div>

                <div className="card rounded-xl p-3">
                  <p className="type-body-sb-xs mb-1 text-fg">Tanggal</p>
                  <p className="type-body-r-xs text-muted">Prefer DD-MM-YYYY. YYYY-MM-DD, DD/MM/YYYY, and YYYY/MM/DD are also accepted. Excel date cells are supported. Defaults to 09:00 WIB.</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT — preview panel */}
        <div className="flex flex-col lg:flex-1 lg:overflow-hidden">

          {phase === "previewing" && (
            <div className="shrink-0 px-6 py-4 border-b border-border bg-brand-100">
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-brand-800 border-t-transparent animate-spin shrink-0" />
                <span className="type-body-m-s text-brand-800">Checking file…</span>
              </div>
              <p className="type-body-r-xs mt-2 text-muted">Validasi kolom, tanggal, platform, dan duplikat.</p>
            </div>
          )}

          {phase === "committing" && (
            <div className="shrink-0 px-6 py-4 border-b border-border bg-brand-100">
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-brand-800 border-t-transparent animate-spin shrink-0" />
                <span className="type-body-m-s text-brand-800">Creating drafts…</span>
              </div>
              <p className="type-body-r-xs mt-2 text-muted">Jangan tutup halaman ini.</p>
            </div>
          )}

          {error && (
            <div className="shrink-0 mx-6 mt-4 rounded-xl p-3 flex gap-3 border border-red-200 bg-red-50">
              <span className="type-body-r-m shrink-0 text-red-600">!</span>
              <div className="flex-1">
                <p className="type-body-sb-xs text-red-600">Import gagal</p>
                <p className="type-body-r-xs mt-1 text-red-600">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="type-body-r-xs underline self-start text-red-600">
                close
              </button>
            </div>
          )}

          {phase === "done" && commitResult && (
            <div className="shrink-0 px-6 py-4 border-b border-border bg-green-50">
              <div className="flex items-center gap-3">
                <span className="type-body-r-xl text-green-700">✓</span>
                <div>
                  <p className="type-body-sb-s text-green-700">
                    {commitResult.summary.created} draft{commitResult.summary.created === 1 ? "" : "s"} dibuat
                  </p>
                  <p className="type-body-r-xs mt-0.5 text-muted">
                    Draft belum punya media. Lengkapi media dan akun tujuan sebelum mengirim untuk Design Approval.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!fileInfo && phase !== "previewing" && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 lg:flex-1 text-neutral-300">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="text-center">
                <p className="type-body-m-s text-neutral-500">No file loaded yet</p>
                <p className="type-body-r-xs mt-1 text-neutral-500">Upload CSV/XLSX or paste CSV on the left</p>
              </div>
            </div>
          )}

          {fileInfo && (
            <div className="lg:flex-1 lg:overflow-y-auto">
              <div className="flex flex-wrap items-center gap-4 lg:gap-6 px-4 py-3 border-b border-border bg-surface">
                <Stat label="Total" value={summary.total} />
                <Stat label="Valid" value={summary.valid} tone="text-green-700" />
                <Stat label="Perlu diperbaiki" value={summary.needsFix} tone={summary.needsFix > 0 ? "text-red-600" : undefined} />
                <Stat label="Dihapus" value={summary.removed} tone={summary.removed > 0 ? "text-brand-800" : undefined} />
              </div>

              {fileInfo.format === "xlsx" ? (
                <div className="card rounded-xl mx-4 mt-4 p-3 type-body-r-xs text-muted">
                  Sheet terpilih: <code className="text-brand-800">{fileInfo.sheetName}</code>. Header di baris {fileInfo.headerRow}
                  {fileInfo.subHeaderRow ? ` dan ${fileInfo.subHeaderRow}` : ""}.
                  {fileInfo.candidateSheets.length > 1 && (
                    <> Sheet kandidat: {fileInfo.candidateSheets.join(", ")}.</>
                  )}
                </div>
              ) : fileInfo.subHeaderRow ? (
                <div className="card rounded-xl mx-4 mt-4 p-3 type-body-r-xs text-muted">
                  Header terdeteksi di baris {fileInfo.headerRow} dan {fileInfo.subHeaderRow}.
                  {fileInfo.delimiter && <> Delimiter: <code className="text-brand-800">{fileInfo.delimiter}</code>.</>}
                </div>
              ) : null}

              <p className="px-4 pt-4 type-body-r-xs text-muted">
                Perbaikan di sini hanya mengubah data import, bukan file aslinya. Draft yang dibuat belum punya media, jadi lengkapi media dan akun tujuan sebelum dikirim untuk Design Approval.
              </p>

              <ImportReviewTable
                rows={rows}
                serverErrors={serverErrors}
                accountCount={accountCount}
                locked={locked}
                onEdit={editRow}
                onRemove={(sourceRow) => setRemoved(sourceRow, true)}
                onRestore={(sourceRow) => setRemoved(sourceRow, false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
