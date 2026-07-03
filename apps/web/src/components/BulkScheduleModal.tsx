"use client";

import { useState, useRef } from "react";
import { apiFetch } from "../lib/api";
import { PlatformIcon } from "./PlatformIcon";
import type { Account } from "./PlatformPreview";

interface ParsedRow {
  scheduledFor: string; // ISO
  text: string;
  accountIds: string[];
  commentText?: string;
  mediaUrls?: string[];
  error?: string;
}

interface Props {
  accounts: Account[];
  onClose: () => void;
  onScheduled: (count: number) => void;
}

const EXAMPLE_CSV = `scheduled_for,text,accounts,comment,image_urls
2026-07-10 09:00,Morning post for all platforms,all,First comment here,
2026-07-11 14:30,All except Instagram (no image),all|!instagram,,
2026-07-12 18:00,Specific platforms with image,bluesky|mastodon,,https://example.com/img1.jpg`;

function parseCSV(csv: string, accounts: Account[]): ParsedRow[] {
  const lines = csv.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const rows = lines.slice(1); // skip header

  return rows.map((line) => {
    // Simple CSV parse — handle quoted fields
    const cols = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) ?? [];
    const clean = (s: string) => s?.replace(/^"|"$/g, "").trim() ?? "";
    const [rawDate, rawText, rawAccounts, rawComment, rawImages] = cols.map(clean);
    const mediaUrls = rawImages ? rawImages.split(";").map(u => u.trim()).filter(Boolean) : undefined;

    // Parse date — accepts "2026-07-10 09:00" or ISO
    const parsed = new Date(rawDate?.replace(" ", "T") ?? "");
    if (!rawDate || isNaN(parsed.getTime())) {
      return { scheduledFor: "", text: rawText ?? "", accountIds: [], mediaUrls, error: `Invalid date: "${rawDate}"` };
    }
    if (parsed < new Date()) {
      return { scheduledFor: "", text: rawText ?? "", accountIds: [], mediaUrls, error: `Date is in the past: "${rawDate}"` };
    }

    if (!rawText?.trim()) {
      return { scheduledFor: parsed.toISOString(), text: "", accountIds: [], mediaUrls, error: "Text is empty" };
    }

    // Resolve accounts
    // Supports: "all", "bluesky|mastodon", "all|!instagram|!youtube" (exclude with !)
    let accountIds: string[] = [];
    const parts = rawAccounts?.split("|").map(p => p.trim().toLowerCase()) ?? [];
    const excluded = parts.filter(p => p.startsWith("!")).map(p => p.slice(1));
    const included = parts.filter(p => !p.startsWith("!") && p !== "all");
    // "all" OR only exclusions provided (e.g. "!instagram") → treat as all-except
    const isAll = parts.includes("all") || (included.length === 0 && excluded.length > 0);

    if (isAll) {
      accountIds = accounts
        .filter(a => a.platform !== "youtube" && !excluded.includes(a.platform))
        .map(a => a.id);
    } else {
      if (included.includes("youtube")) {
        return { scheduledFor: parsed.toISOString(), text: rawText, accountIds: [], error: "YouTube requires a video — use Compose instead" };
      }
      accountIds = accounts
        .filter(a => included.includes(a.platform) && !excluded.includes(a.platform))
        .map(a => a.id);
      if (accountIds.length === 0) {
        return { scheduledFor: parsed.toISOString(), text: rawText, accountIds: [], mediaUrls, error: `No matching accounts for: "${rawAccounts}"` };
      }
    }

    // Instagram requires at least one image
    const hasInstagram = accountIds.some(id => accounts.find(a => a.id === id)?.platform === "instagram");
    if (hasInstagram && !mediaUrls?.length) {
      return { scheduledFor: parsed.toISOString(), text: rawText, accountIds: [], mediaUrls, error: "Instagram requires at least one image URL in image_urls" };
    }

    return {
      scheduledFor: parsed.toISOString(),
      text: rawText,
      accountIds,
      commentText: rawComment || undefined,
      mediaUrls: mediaUrls?.length ? mediaUrls : undefined,
    };
  });
}

export function BulkScheduleModal({ accounts, onClose, onScheduled }: Props) {
  const [csv, setCsv] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parsed, setParsed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleParse() {
    const result = parseCSV(csv, accounts);
    setRows(result);
    setParsed(true);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsv(ev.target?.result as string ?? "");
      setParsed(false);
      setRows([]);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleSubmit() {
    const valid = rows.filter(r => !r.error);
    if (valid.length === 0) return;
    setSubmitting(true);
    setProgress({ done: 0, total: valid.length });
    let succeeded = 0;
    for (const row of valid) {
      try {
        await apiFetch("/jobs", {
          method: "POST",
          body: JSON.stringify({
            scheduledFor: row.scheduledFor,
            content: { text: row.text, mediaUrls: row.mediaUrls ?? [] },
            commentText: row.commentText,
            accountIds: row.accountIds,
          }),
        });
        succeeded++;
      } catch { /* skip failed rows */ }
      setProgress(p => p ? { ...p, done: p.done + 1 } : null);
    }
    setSubmitting(false);
    onScheduled(succeeded);
  }

  const validRows = rows.filter(r => !r.error);
  const errorRows = rows.filter(r => r.error);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a", maxHeight: "90vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid #2a2a2a" }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: "#ededed" }}>Bulk Schedule</h2>
            <p className="text-xs mt-0.5" style={{ color: "#888" }}>Upload a CSV or paste rows below</p>
          </div>
          <button onClick={onClose} className="text-lg leading-none hover:opacity-60 transition-opacity" style={{ color: "#888" }}>✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* CSV format hint */}
          <div className="rounded-xl p-3" style={{ backgroundColor: "#0d0d0d", border: "1px solid #1f1f1f" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#666" }}>CSV Format</p>
              {/* Info tooltip */}
              <div className="relative group">
                <button
                  type="button"
                  className="flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold transition-colors"
                  style={{ backgroundColor: "#1f1f1f", color: "#888", border: "1px solid #333" }}
                  aria-label="Column reference"
                >
                  i
                </button>
                <div
                  className="absolute right-0 top-7 z-10 hidden group-hover:block rounded-xl p-3 text-xs shadow-2xl"
                  style={{ backgroundColor: "#1a1a1a", border: "1px solid #333", width: "280px", color: "#ccc", lineHeight: "1.6" }}
                >
                  <p className="font-semibold mb-2" style={{ color: "#ededed" }}>Column Reference</p>
                  <div className="space-y-1.5">
                    <div><span className="font-mono" style={{ color: "#818cf8" }}>scheduled_for</span> - date &amp; time, e.g. <span className="font-mono" style={{ color: "#888" }}>2026-07-10 09:00</span></div>
                    <div><span className="font-mono" style={{ color: "#818cf8" }}>text</span> - post body (required)</div>
                    <div><span className="font-mono" style={{ color: "#818cf8" }}>accounts</span> - <span className="font-mono" style={{ color: "#888" }}>all</span> or platform names separated by <span className="font-mono" style={{ color: "#888" }}>|</span>. Prefix with <span className="font-mono" style={{ color: "#f87171" }}>!</span> to exclude e.g. <span className="font-mono" style={{ color: "#888" }}>all|!instagram</span>. YouTube not supported (needs video).</div>
                    <div><span className="font-mono" style={{ color: "#818cf8" }}>comment</span> - first comment text (optional)</div>
                    <div><span className="font-mono" style={{ color: "#818cf8" }}>image_urls</span> - public image URLs separated by <span className="font-mono" style={{ color: "#888" }}>;</span> (optional, up to 4)</div>
                  </div>
                </div>
              </div>
            </div>
            <pre className="text-[11px] leading-relaxed whitespace-pre-wrap" style={{ color: "#aaa", fontFamily: "monospace" }}>{EXAMPLE_CSV}</pre>
          </div>

          {/* Upload + paste */}
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors hover:opacity-80"
              style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#888" }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload CSV
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileUpload} />
            <span className="text-xs" style={{ color: "#444" }}>or paste below</span>
          </div>

          <textarea
            value={csv}
            onChange={(e) => { setCsv(e.target.value); setParsed(false); setRows([]); }}
            placeholder={"scheduled_for,text,accounts,comment,image_urls\n2026-07-10 09:00,My post text,bluesky|mastodon,,"}
            rows={6}
            className="w-full resize-none rounded-xl border px-4 py-3 text-sm focus:outline-none font-mono"
            style={{ backgroundColor: "#1a1a1a", borderColor: "#3a3a3a", color: "#ededed" }}
          />

          {/* Parse button */}
          {!parsed && csv.trim() && (
            <button type="button" onClick={handleParse}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors hover:opacity-90"
              style={{ backgroundColor: "#1f1f2e", color: "#818cf8", border: "1px solid #3730a3" }}>
              Preview {csv.trim().split("\n").length - 1} rows
            </button>
          )}

          {/* Preview table */}
          {parsed && rows.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold" style={{ color: "#ededed" }}>{validRows.length} valid</span>
                {errorRows.length > 0 && <span className="text-xs font-semibold" style={{ color: "#f87171" }}>{errorRows.length} errors</span>}
              </div>
              <div className="rounded-xl overflow-x-auto" style={{ border: "1px solid #2a2a2a" }}>
                <table className="w-full text-xs" style={{ minWidth: "480px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#161616", borderBottom: "1px solid #2a2a2a" }}>
                      <th className="text-left px-3 py-2 font-semibold" style={{ color: "#555" }}>Date</th>
                      <th className="text-left px-3 py-2 font-semibold" style={{ color: "#555" }}>Text</th>
                      <th className="text-left px-3 py-2 font-semibold" style={{ color: "#555" }}>Accounts</th>
                      <th className="text-left px-3 py-2 font-semibold" style={{ color: "#555" }}>Images</th>
                      <th className="text-left px-3 py-2 font-semibold" style={{ color: "#555" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #1f1f1f", backgroundColor: row.error ? "#1a0a0a" : undefined }}>
                        <td className="px-3 py-2 whitespace-nowrap" style={{ color: row.error ? "#555" : "#ededed" }}>
                          {row.scheduledFor ? new Date(row.scheduledFor).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td className="px-3 py-2 max-w-[180px]" style={{ color: "#aaa" }}>
                          <span className="block truncate">{row.text || "—"}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="flex gap-1 flex-wrap">
                            {row.accountIds.map(id => {
                              const acc = accounts.find(a => a.id === id);
                              return acc ? <PlatformIcon key={id} platform={acc.platform} size={13} /> : null;
                            })}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap" style={{ color: "#888" }}>
                          {row.mediaUrls?.length ? `${row.mediaUrls.length} img` : "—"}
                        </td>
                        <td className="px-3 py-2 max-w-[160px]">
                          {row.error
                            ? <span className="block truncate" title={row.error} style={{ color: "#f87171" }}>✕ {row.error}</span>
                            : <span style={{ color: "#4ade80" }}>✓ Ready</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Progress */}
          {progress && (
            <div>
              <div className="flex justify-between text-xs mb-1" style={{ color: "#888" }}>
                <span>Scheduling…</span>
                <span>{progress.done}/{progress.total}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#1f1f1f" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${(progress.done / progress.total) * 100}%`, backgroundColor: "#5b63d3" }} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderTop: "1px solid #2a2a2a" }}>
          <button onClick={onClose} className="text-sm font-medium hover:opacity-70 transition-opacity" style={{ color: "#888" }}>
            Cancel
          </button>
          {parsed && validRows.length > 0 && (
            <button onClick={handleSubmit} disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:bg-gray-100 disabled:opacity-50"
              style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
              {submitting ? `Scheduling… (${progress?.done}/${progress?.total})` : `Schedule ${validRows.length} post${validRows.length !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
