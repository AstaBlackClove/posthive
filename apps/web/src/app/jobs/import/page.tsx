"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../../lib/api";
import { PlatformIcon } from "../../../components/PlatformIcon";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const MAX_FILE_BYTES = 5 * 1024 * 1024;

interface PreviewTarget {
  accountId: string;
  platform: string;
  displayName: string;
}

interface PreviewRow {
  sourceRow: number;
  importKey: string;
  title: string;
  postDate: string;
  scheduledFor: string;
  platforms: string[];
  platformLabel: string;
  sourceStatus: string | null;
  pillar: string | null;
  category: string | null;
  picContent: string | null;
  reviewer: string | null;
  picDesign: string | null;
  progress: string | null;
  outputUrl: string | null;
  assetNotes: string;
  designCopyPreview: string;
  designCopyLength: number;
  designCopyHasLineBreaks: boolean;
  captionPreview: string;
  captionLength: number;
  captionHasLineBreaks: boolean;
  targets: PreviewTarget[];
  warnings: string[];
}

interface InvalidRow {
  sourceRow: number;
  title: string;
  reason: string;
}

interface DuplicateRow {
  sourceRow: number;
  importKey: string;
  title: string;
  reason: string;
}

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
  rows: PreviewRow[];
  invalidRows: InvalidRow[];
  duplicates: DuplicateRow[];
}

interface CommitResponse {
  summary: {
    totalRows: number;
    selectedRows: number;
    created: number;
    skipped: number;
    invalidRows: number;
    duplicateRows: number;
  };
  jobs: Array<{
    id: string;
    sourceRow: number;
    title: string;
    scheduledFor: string;
  }>;
  skipped: Array<{ sourceRow: number; reason: string }>;
}

type TableRow =
  | { kind: "valid"; row: PreviewRow }
  | { kind: "invalid"; row: InvalidRow }
  | { kind: "duplicate"; row: DuplicateRow };

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

const PLATFORM_LABEL: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  website: "Website",
};

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

function PlatformLabel({ platform }: { platform: string }) {
  if (platform === "website") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: "#aaa" }}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M12 21a9 9 0 100-18 9 9 0 000 18zm0 0c2.5-2.2 4-5.2 4-9s-1.5-6.8-4-9m0 18c-2.5-2.2-4-5.2-4-9s1.5-6.8 4-9M3.6 9h16.8M3.6 15h16.8" />
        </svg>
        Website
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: "#aaa" }}>
      <PlatformIcon platform={platform} size={14} />
      {PLATFORM_LABEL[platform] ?? platform}
    </span>
  );
}

function StatusBadge({ color, label }: { color: string; label: string }) {
  return (
    <span className="text-[11px] font-medium whitespace-nowrap" style={{ color }}>
      {label}
    </span>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-lg font-bold tabular-nums" style={{ color: color ?? "#ededed" }}>
        {value}
      </span>
      <span className="text-xs" style={{ color: "#444" }}>{label}</span>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide" style={{ color: "#555" }}>{label}</p>
      <p className="text-xs mt-0.5" style={{ color: value ? "#ccc" : "#444" }}>{value || "—"}</p>
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
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [commitResult, setCommitResult] = useState<CommitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const isBusy = phase === "previewing" || phase === "committing";
  const validRows = preview?.rows ?? [];
  const selectedCount = selected.size;
  const allSelected = validRows.length > 0 && selectedCount === validRows.length;

  const tableRows = useMemo<TableRow[]>(() => {
    if (!preview) return [];
    const rows: TableRow[] = [
      ...preview.rows.map((row) => ({ kind: "valid" as const, row })),
      ...preview.invalidRows.map((row) => ({ kind: "invalid" as const, row })),
      ...preview.duplicates.map((row) => ({ kind: "duplicate" as const, row })),
    ];
    return rows.sort((a, b) => a.row.sourceRow - b.row.sourceRow);
  }, [preview]);

  const createdRows = useMemo(
    () => new Set(commitResult?.jobs.map((job) => job.sourceRow) ?? []),
    [commitResult],
  );
  const skippedByRow = useMemo(
    () => new Map(commitResult?.skipped.map((item) => [item.sourceRow, item.reason]) ?? []),
    [commitResult],
  );

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

  async function runPreview(importFile: File) {
    const requestId = ++previewRequestRef.current;
    setPhase("previewing");
    setError(null);
    setPreview(null);
    setCommitResult(null);
    setSelected(new Set());
    setExpandedRow(null);

    const body = new FormData();
    body.append("file", importFile, importFile.name);

    try {
      const data = await apiFetch<PreviewResponse>("/jobs/import/preview", {
        method: "POST",
        body,
      });
      if (previewRequestRef.current !== requestId) return;
      setPreview(data);
      setSelected(new Set(data.rows.map((row) => row.sourceRow)));
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
      setPreview(null);
      setCommitResult(null);
      setSelected(new Set());
      setError(validation);
      setPhase("error");
      return;
    }

    setFile(importFile);
    setCommitResult(null);
    setSelected(new Set());
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
    if (!file || !preview || selectedCount === 0 || isBusy) return;

    setPhase("committing");
    setError(null);

    const body = new FormData();
    body.append("file", file, file.name);
    body.append("sourceRows", JSON.stringify([...selected].sort((a, b) => a - b)));

    try {
      const data = await apiFetch<CommitResponse>("/jobs/import/commit", {
        method: "POST",
        body,
      });
      setCommitResult(data);
      setPhase("done");
    } catch (err) {
      setError(errorMessage(err));
      setPhase("ready");
    }
  }

  function clearAll() {
    previewRequestRef.current += 1;
    setCsvText("");
    setFile(null);
    setPreview(null);
    setSelected(new Set());
    setCommitResult(null);
    setError(null);
    setExpandedRow(null);
    setPhase("idle");
  }

  function toggleRow(sourceRow: number) {
    if (phase === "done" || phase === "committing") return;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(sourceRow)) next.delete(sourceRow);
      else next.add(sourceRow);
      return next;
    });
  }

  function toggleAll() {
    if (phase === "done" || phase === "committing") return;
    setSelected(allSelected ? new Set() : new Set(validRows.map((row) => row.sourceRow)));
  }

  function statusFor(entry: TableRow): { color: string; label: string } {
    if (entry.kind === "invalid") return { color: "#f87171", label: "✕ Invalid" };
    if (entry.kind === "duplicate") return { color: "#fbbf24", label: "Duplicate" };

    if (phase === "done") {
      if (createdRows.has(entry.row.sourceRow)) return { color: "#4ade80", label: "✓ Created" };
      if (skippedByRow.has(entry.row.sourceRow)) return { color: "#f87171", label: "✕ Skipped" };
      return { color: "#666", label: "Not selected" };
    }

    return selected.has(entry.row.sourceRow)
      ? { color: "#4ade80", label: "✓ Ready" }
      : { color: "#666", label: "Not selected" };
  }

  const canImport = phase === "ready" && selectedCount > 0 && !!file;
  const totalRows = preview?.summary.totalRows ?? 0;
  const invalidCount = preview?.summary.invalidRows ?? 0;
  const duplicateCount = preview?.summary.duplicateRows ?? 0;

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: "#0a0a0a", color: "#ededed" }}>

      {/* Top bar — pl-14 on mobile to clear the sidebar hamburger */}
      <div className="shrink-0 pl-14 pr-4 py-3 md:px-4" style={{ borderBottom: "1px solid #1e1e1e" }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/jobs")}
            disabled={isBusy}
            className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70 disabled:opacity-30 shrink-0"
            style={{ color: "#888" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="w-px h-4 shrink-0" style={{ backgroundColor: "#2a2a2a" }} />
          <h1 className="text-sm font-bold truncate" style={{ color: "#ededed" }}>Import Content Plan</h1>
        </div>

        {(preview || phase === "done") && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs flex-1" style={{ color: validRows.length > 0 ? "#4ade80" : "#555" }}>
              {validRows.length} valid
              {invalidCount > 0 && <span style={{ color: "#f87171" }}> · {invalidCount} invalid</span>}
              {duplicateCount > 0 && <span style={{ color: "#fbbf24" }}> · {duplicateCount} duplicate</span>}
            </span>

            {phase !== "done" && (
              <>
                <button
                  onClick={clearAll}
                  disabled={isBusy}
                  className="px-3 py-1.5 rounded-xl text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-40 shrink-0"
                  style={{ backgroundColor: "#1a1a1a", color: "#666", border: "1px solid #2a2a2a" }}
                >
                  Clear
                </button>
                <button
                  onClick={handleCommit}
                  disabled={!canImport}
                  className="px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors hover:bg-gray-100 disabled:opacity-40 shrink-0"
                  style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}
                >
                  {phase === "committing" ? "Importing…" : `Import ${selectedCount}`}
                </button>
              </>
            )}

            {phase === "done" && (
              <>
                <button
                  onClick={clearAll}
                  className="px-3 py-1.5 rounded-xl text-sm font-medium transition-colors hover:opacity-80 shrink-0"
                  style={{ backgroundColor: "#1a1a1a", color: "#666", border: "1px solid #2a2a2a" }}
                >
                  Import another
                </button>
                <button
                  onClick={() => router.push("/jobs")}
                  className="px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors hover:bg-gray-100 shrink-0"
                  style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}
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
        <div className="flex flex-col w-full lg:w-96 lg:shrink-0 lg:overflow-y-auto border-b lg:border-b-0 lg:border-r" style={{ borderColor: "#1e1e1e" }}>
          <div className="flex" style={{ borderBottom: "1px solid #1e1e1e" }}>
            {(["input", "format"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-3 text-xs font-semibold transition-colors"
                style={{
                  color: activeTab === tab ? "#ededed" : "#555",
                  borderBottom: activeTab === tab ? "2px solid #5b63d3" : "2px solid transparent",
                }}
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
                  className="w-full flex flex-col items-center justify-center gap-3 py-8 rounded-xl border-2 border-dashed transition-colors hover:opacity-80 disabled:opacity-40"
                  style={{ borderColor: "#2a2a2a", color: "#555" }}
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <div className="text-center">
                    <p className="text-sm font-medium" style={{ color: "#888" }}>Drop CSV or XLSX file here</p>
                    <p className="text-xs mt-0.5" style={{ color: "#444" }}>or click to browse</p>
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
                  <div className="rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ backgroundColor: "#111", border: "1px solid #1e1e1e" }}>
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#818cf8" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate" style={{ color: "#ccc" }}>{file.name}</p>
                      <p className="text-[10px]" style={{ color: "#555" }}>{formatBytes(file.size)}</p>
                    </div>
                    <button
                      onClick={clearAll}
                      disabled={isBusy}
                      className="text-[10px] underline disabled:opacity-40"
                      style={{ color: "#666" }}
                    >
                      remove
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ backgroundColor: "#1e1e1e" }} />
                  <span className="text-xs" style={{ color: "#444" }}>or paste CSV</span>
                  <div className="flex-1 h-px" style={{ backgroundColor: "#1e1e1e" }} />
                </div>

                <textarea
                  value={csvText}
                  onChange={(event) => {
                    setCsvText(event.target.value);
                    setFile(null);
                    setPreview(null);
                    setSelected(new Set());
                    setCommitResult(null);
                    setError(null);
                    setExpandedRow(null);
                    setPhase("idle");
                  }}
                  placeholder={"Content Title,Post Date,Platform\nSlope Stability Before the Rain Peaks,22-10-2026,Mirroring (LI&Ig)"}
                  rows={10}
                  disabled={isBusy}
                  className="w-full resize-none rounded-xl border px-4 py-3 text-xs focus:outline-hidden font-mono disabled:opacity-40"
                  style={{ backgroundColor: "#111", borderColor: "#2a2a2a", color: "#ededed", lineHeight: "1.6" }}
                />

                <div className="flex gap-2">
                  <button
                    onClick={handlePastePreview}
                    disabled={isBusy || !csvText.trim()}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:opacity-90 disabled:opacity-40"
                    style={{ backgroundColor: "#1f1f2e", color: "#818cf8", border: "1px solid #3730a3" }}
                  >
                    {phase === "previewing" ? "Checking…" : "Preview CSV"}
                  </button>
                  <button
                    onClick={clearAll}
                    disabled={isBusy || (!csvText && !file)}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:opacity-80 disabled:opacity-40"
                    style={{ backgroundColor: "#1a1a1a", color: "#666", border: "1px solid #2a2a2a" }}
                  >
                    Clear
                  </button>
                </div>

                <p className="text-[11px] leading-relaxed" style={{ color: "#555" }}>
                  CSV UTF-8 atau XLSX, maksimum 5 MB dan 1.000 baris data. Sheet XLSX dideteksi otomatis dari baris header.
                </p>
              </>
            ) : (
              <>
                <div>
                  <p className="text-xs font-semibold mb-3" style={{ color: "#ededed" }}>Required columns</p>
                  <div className="space-y-3">
                    {REQUIRED_COLUMNS.map((column) => (
                      <div key={column.name} className="rounded-xl p-3 space-y-1" style={{ backgroundColor: "#111", border: "1px solid #1e1e1e" }}>
                        <code className="text-xs font-bold" style={{ color: "#818cf8" }}>{column.name}</code>
                        <p className="text-xs mt-1" style={{ color: "#888" }}>{column.description}</p>
                        <p className="font-mono text-[11px]" style={{ color: "#555" }}>e.g. {column.example}</p>
                      </div>
                    ))}
                  </div>

                  <a
                    href="/import-plan-template.xlsx"
                    download="Content Plan Template.xlsx"
                    className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:opacity-90"
                    style={{ backgroundColor: "#1a1a1a", color: "#818cf8", border: "1px solid #2a2a2a" }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Template (XLSX)
                  </a>
                </div>

                <div>
                  <p className="text-xs font-semibold mb-3" style={{ color: "#ededed" }}>Optional columns</p>
                  <div className="space-y-2">
                    {OPTIONAL_COLUMNS.map((column) => (
                      <div key={column.name} className="rounded-xl p-3" style={{ backgroundColor: "#111", border: "1px solid #1e1e1e" }}>
                        <code className="text-xs font-bold" style={{ color: "#818cf8" }}>{column.name}</code>
                        <p className="text-xs mt-1" style={{ color: "#666" }}>{column.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold mb-3" style={{ color: "#ededed" }}>Platform values</p>
                  <div className="space-y-2 rounded-xl p-3" style={{ backgroundColor: "#111", border: "1px solid #1e1e1e" }}>
                    {PLATFORM_GUIDE.map((item) => (
                      <div key={item.value} className="flex gap-3 text-[11px]">
                        <code className="shrink-0 font-mono" style={{ color: "#818cf8", minWidth: "132px" }}>{item.value}</code>
                        <span style={{ color: "#666" }}>{item.result}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl p-3" style={{ backgroundColor: "#1a1200", border: "1px solid #3a2800" }}>
                  <p className="text-[11px] font-semibold mb-1" style={{ color: "#c9a227" }}>Link Copywrite = design copy, Caption = caption final</p>
                  <p className="text-[11px] leading-relaxed" style={{ color: "#8a6e1a" }}>
                    Isi Link Copywrite disimpan mentah sebagai content.designCopy. Isi Caption disimpan sebagai content.text. Media tetap diisi manual di Posthive sebelum scheduling.
                  </p>
                </div>

                <div className="rounded-xl p-3" style={{ backgroundColor: "#111", border: "1px solid #1e1e1e" }}>
                  <p className="text-[11px] font-semibold mb-1" style={{ color: "#aaa" }}>Tanggal</p>
                  <p className="text-[11px]" style={{ color: "#666" }}>Prefer DD-MM-YYYY. YYYY-MM-DD, DD/MM/YYYY, and YYYY/MM/DD are also accepted. Excel date cells are supported. Defaults to 09:00 WIB.</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT — preview panel */}
        <div className="flex flex-col lg:flex-1 lg:overflow-hidden">

          {phase === "previewing" && (
            <div className="shrink-0 px-6 py-4" style={{ borderBottom: "1px solid #1e1e1e", backgroundColor: "#0d0d1a" }}>
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin shrink-0" style={{ borderColor: "#5b63d3", borderTopColor: "transparent" }} />
                <span className="text-sm font-medium" style={{ color: "#818cf8" }}>Checking file…</span>
              </div>
              <p className="text-xs mt-2" style={{ color: "#444" }}>Validasi kolom, tanggal, platform, dan duplikat.</p>
            </div>
          )}

          {phase === "committing" && (
            <div className="shrink-0 px-6 py-4" style={{ borderBottom: "1px solid #1e1e1e", backgroundColor: "#0d0d1a" }}>
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin shrink-0" style={{ borderColor: "#5b63d3", borderTopColor: "transparent" }} />
                <span className="text-sm font-medium" style={{ color: "#818cf8" }}>Creating drafts…</span>
              </div>
              <p className="text-xs mt-2" style={{ color: "#444" }}>Jangan tutup halaman ini.</p>
            </div>
          )}

          {error && (
            <div className="shrink-0 mx-6 mt-4 rounded-xl p-3 flex gap-3" style={{ backgroundColor: "#1a0a0a", border: "1px solid #7f1d1d" }}>
              <span className="text-base shrink-0" style={{ color: "#f87171" }}>!</span>
              <div className="flex-1">
                <p className="text-xs font-semibold" style={{ color: "#f87171" }}>Import gagal</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: "#fca5a5" }}>{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-xs underline self-start" style={{ color: "#fca5a5" }}>
                close
              </button>
            </div>
          )}

          {phase === "done" && commitResult && (
            <div className="shrink-0 px-6 py-4" style={{ borderBottom: "1px solid #1e1e1e", backgroundColor: "#0a1a0a" }}>
              <div className="flex items-center gap-3">
                <span className="text-xl" style={{ color: "#4ade80" }}>✓</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#4ade80" }}>
                    {commitResult.summary.created > 0
                      ? `${commitResult.summary.created} draft${commitResult.summary.created === 1 ? "" : "s"} created`
                      : "No new drafts created"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#888" }}>
                    {commitResult.summary.skipped} baris dilewati · {commitResult.summary.duplicateRows} duplikat · {commitResult.summary.invalidRows} invalid
                  </p>
                </div>
              </div>
            </div>
          )}

          {!preview && phase !== "previewing" && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 lg:flex-1" style={{ color: "#333" }}>
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: "#444" }}>No file loaded yet</p>
                <p className="text-xs mt-1" style={{ color: "#333" }}>Upload CSV/XLSX or paste CSV on the left</p>
              </div>
            </div>
          )}

          {preview && (
            <>
              <div className="shrink-0 flex flex-wrap items-center gap-4 lg:gap-6 px-4 py-3" style={{ borderBottom: "1px solid #1e1e1e", backgroundColor: "#0d0d0d" }}>
                <Stat label="Total rows" value={totalRows} />
                <Stat label="Valid" value={validRows.length} color="#4ade80" />
                <Stat label="Invalid" value={invalidCount} color={invalidCount > 0 ? "#f87171" : undefined} />
                <Stat label="Duplicates" value={duplicateCount} color={duplicateCount > 0 ? "#fbbf24" : undefined} />
                <Stat label="Selected" value={selectedCount} color="#818cf8" />
              </div>

              {preview.file.format === "xlsx" ? (
                <div className="shrink-0 mx-6 mt-4 rounded-xl p-3 text-xs" style={{ backgroundColor: "#111", border: "1px solid #1e1e1e", color: "#888" }}>
                  Sheet terpilih: <code style={{ color: "#818cf8" }}>{preview.file.sheetName}</code>. Header di baris {preview.file.headerRow}
                  {preview.file.subHeaderRow ? ` dan ${preview.file.subHeaderRow}` : ""}.
                  {preview.file.candidateSheets.length > 1 && (
                    <> Sheet kandidat: {preview.file.candidateSheets.join(", ")}.</>
                  )}
                </div>
              ) : preview.file.subHeaderRow ? (
                <div className="shrink-0 mx-6 mt-4 rounded-xl p-3 text-xs" style={{ backgroundColor: "#111", border: "1px solid #1e1e1e", color: "#888" }}>
                  Header terdeteksi di baris {preview.file.headerRow} dan {preview.file.subHeaderRow}.
                  {preview.file.delimiter && <> Delimiter: <code style={{ color: "#818cf8" }}>{preview.file.delimiter}</code>.</>}
                </div>
              ) : null}

              <div className="overflow-x-auto lg:flex-1 lg:overflow-y-auto mt-4">
                <table className="w-full text-xs" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
                  <thead className="sticky top-0 z-10" style={{ backgroundColor: "#0d0d0d" }}>
                    <tr style={{ borderBottom: "1px solid #1e1e1e" }}>
                      <th className="text-left px-4 py-3 w-10" style={{ color: "#444" }}>
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleAll}
                          disabled={validRows.length === 0 || phase === "done" || phase === "committing"}
                          aria-label="Select all valid rows"
                        />
                      </th>
                      <th className="text-left px-4 py-3 font-semibold w-10" style={{ color: "#444" }}>#</th>
                      <th className="text-left px-4 py-3 font-semibold" style={{ color: "#444" }}>Content Title</th>
                      <th className="text-left px-4 py-3 font-semibold whitespace-nowrap" style={{ color: "#444" }}>Post Date</th>
                      <th className="text-left px-4 py-3 font-semibold" style={{ color: "#444" }}>Platform</th>
                      <th className="text-left px-4 py-3 font-semibold" style={{ color: "#444" }}>Link Copywrite</th>
                      <th className="text-left px-4 py-3 font-semibold" style={{ color: "#444" }}>Caption</th>
                      <th className="text-left px-4 py-3 font-semibold" style={{ color: "#444" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((entry) => {
                      const sourceRow = entry.row.sourceRow;
                      const isExpanded = expandedRow === sourceRow;
                      const status = statusFor(entry);
                      const rowError = entry.kind !== "valid";
                      const selectable = entry.kind === "valid" && phase !== "done" && phase !== "committing";

                      return (
                        <Fragment key={`${entry.kind}-${sourceRow}`}>
                          <tr
                            onClick={() => setExpandedRow(isExpanded ? null : sourceRow)}
                            className="cursor-pointer transition-colors hover:bg-[#131313]"
                            style={{
                              borderBottom: "1px solid #141414",
                              backgroundColor: rowError ? "#0f0808" : isExpanded ? "#151515" : undefined,
                            }}
                          >
                            <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={entry.kind === "valid" && selected.has(sourceRow)}
                                onChange={() => toggleRow(sourceRow)}
                                disabled={!selectable}
                                aria-label={`Select row ${sourceRow}`}
                              />
                            </td>
                            <td className="px-4 py-3 font-mono" style={{ color: "#333" }}>{sourceRow}</td>
                            <td className="px-4 py-3" style={{ maxWidth: "280px" }}>
                              <span className={isExpanded ? "" : "block truncate"} style={{ color: "#ededed", whiteSpace: isExpanded ? "pre-wrap" : undefined, wordBreak: "break-word" }}>
                                {entry.row.title || "—"}
                              </span>
                              {entry.kind === "valid" && entry.row.warnings.length > 0 && (
                                <span className="inline-flex items-center gap-1 mt-1 text-[10px]" style={{ color: "#c9a227" }}>
                                  <span>▲</span>
                                  {entry.row.warnings.length} warning{entry.row.warnings.length === 1 ? "" : "s"}
                                </span>
                              )}
                              {entry.kind !== "valid" && (
                                <p className="text-[11px] mt-1" style={{ color: entry.kind === "invalid" ? "#f87171" : "#fbbf24" }}>
                                  {entry.row.reason}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap" style={{ color: "#aaa" }}>
                              {entry.kind === "valid" ? `${entry.row.postDate} · 09:00 WIB` : "—"}
                            </td>
                            <td className="px-4 py-3">
                              {entry.kind === "valid" ? (
                                <div className="flex flex-wrap gap-2">
                                  {entry.row.platforms.map((platform) => (
                                    <PlatformLabel key={platform} platform={platform} />
                                  ))}
                                </div>
                              ) : "—"}
                            </td>
                            <td className="px-4 py-3" style={{ maxWidth: "260px" }}>
                              {entry.kind === "valid" ? (
                                entry.row.designCopyPreview ? (
                                  <span
                                    className={isExpanded ? "" : "block truncate"}
                                    style={{ color: "#666", whiteSpace: isExpanded ? "pre-wrap" : undefined, wordBreak: "break-word" }}
                                  >
                                    {entry.row.designCopyPreview}
                                  </span>
                                ) : <span style={{ color: "#333" }}>—</span>
                              ) : <span style={{ color: "#444" }}>—</span>}
                            </td>
                            <td className="px-4 py-3" style={{ maxWidth: "260px" }}>
                              {entry.kind === "valid" ? (
                                entry.row.captionPreview ? (
                                  <span
                                    className={isExpanded ? "" : "block truncate"}
                                    style={{ color: "#888", whiteSpace: isExpanded ? "pre-wrap" : undefined, wordBreak: "break-word" }}
                                  >
                                    {entry.row.captionPreview}
                                  </span>
                                ) : <span style={{ color: "#333" }}>—</span>
                              ) : <span style={{ color: "#444" }}>—</span>}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <StatusBadge color={status.color} label={status.label} />
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr style={{ borderBottom: "1px solid #1e1e1e", backgroundColor: "#111" }}>
                              <td colSpan={8} className="px-6 py-4">
                                {entry.kind === "valid" ? (
                                  <div className="space-y-4">
                                    {entry.row.warnings.length > 0 && (
                                      <div className="rounded-xl p-3" style={{ backgroundColor: "#1a1200", border: "1px solid #3a2800" }}>
                                        <p className="text-[11px] font-semibold mb-1" style={{ color: "#c9a227" }}>Warnings</p>
                                        <ul className="space-y-1">
                                          {entry.row.warnings.map((warning) => (
                                            <li key={warning} className="text-[11px]" style={{ color: "#8a6e1a" }}>• {warning}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {skippedByRow.has(sourceRow) && (
                                      <p className="text-[11px]" style={{ color: "#f87171" }}>
                                        Skipped: {skippedByRow.get(sourceRow)}
                                      </p>
                                    )}

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                      <Detail label="Pillar" value={entry.row.pillar} />
                                      <Detail label="Category" value={entry.row.category} />
                                      <Detail label="PIC Content" value={entry.row.picContent} />
                                      <Detail label="Reviewer" value={entry.row.reviewer} />
                                      <Detail label="PIC Design" value={entry.row.picDesign} />
                                      <Detail label="Progress" value={entry.row.progress} />
                                      <Detail label="Source Status" value={entry.row.sourceStatus} />
                                      <Detail label="Design Copy Length" value={`${entry.row.designCopyLength} chars`} />
                                      <Detail label="Caption Length" value={`${entry.row.captionLength} chars`} />
                                    </div>

                                    <div>
                                      <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "#555" }}>Targets</p>
                                      {entry.row.targets.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                          {entry.row.targets.map((target) => (
                                            <span key={target.accountId} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px]" style={{ backgroundColor: "#161616", border: "1px solid #2a2a2a", color: "#aaa" }}>
                                              <PlatformIcon platform={target.platform} size={13} />
                                              {target.displayName}
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-[11px]" style={{ color: "#666" }}>Belum ada target akun. Pilih akun manual sebelum scheduling.</p>
                                      )}
                                    </div>

                                    <div>
                                      <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "#555" }}>Link Copywrite / Design Copy (preview)</p>
                                      {entry.row.designCopyPreview ? (
                                        <pre className="text-[11px] whitespace-pre-wrap wrap-break-word rounded-xl p-3 max-h-56 overflow-y-auto" style={{ backgroundColor: "#0a0a0a", border: "1px solid #1e1e1e", color: "#aaa", fontFamily: "monospace" }}>
                                          {entry.row.designCopyPreview}
                                        </pre>
                                      ) : (
                                        <p className="text-[11px]" style={{ color: "#444" }}>Kosong.</p>
                                      )}
                                    </div>

                                    <div>
                                      <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "#555" }}>Caption / content.text (preview)</p>
                                      {entry.row.captionPreview ? (
                                        <pre className="text-[11px] whitespace-pre-wrap wrap-break-word rounded-xl p-3 max-h-56 overflow-y-auto" style={{ backgroundColor: "#0a0a0a", border: "1px solid #1e1e1e", color: "#aaa", fontFamily: "monospace" }}>
                                          {entry.row.captionPreview}
                                        </pre>
                                      ) : (
                                        <p className="text-[11px]" style={{ color: "#444" }}>Kosong. Draft akan dibuat tanpa caption.</p>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs" style={{ color: entry.kind === "invalid" ? "#f87171" : "#fbbf24" }}>
                                    Baris {sourceRow}: {entry.row.reason}
                                  </p>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
