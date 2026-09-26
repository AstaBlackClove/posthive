"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PlatformIcon } from "../../components/PlatformIcon";
import { apiFetch } from "../../lib/api";
import type { Account } from "../../components/PlatformPreview";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface ParsedRow {
  scheduledFor: string;
  text: string;
  accountIds: string[];
  commentText?: string;
  mediaUrls?: string[];
  error?: string;
}

interface ServerError { row: number; reason: string; }
interface SubmitResult { succeeded: number; failed: number; errors?: ServerError[]; }

type SubmitState =
  | { phase: "idle" }
  | { phase: "sending"; done: number; total: number }
  | { phase: "done"; result: SubmitResult }
  | { phase: "error"; message: string };

const EXAMPLE_CSV = `scheduled_for,text,accounts,comment,image_urls
2026-07-10 09:00,Morning post for all platforms,all,,
2026-07-11 14:30,All except Instagram,all|!instagram,,
2026-07-12 18:00,Specific platforms with image,bluesky|mastodon,,https://example.com/img.jpg
2026-07-13 10:00,Target FB page by name,My Page Name,,`;

function parseCSV(csv: string, accounts: Account[]): ParsedRow[] {
  const lines = csv.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];

  return lines.slice(1).map((line) => {
    const cols = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) ?? [];
    const clean = (s: string) => s?.replace(/^"|"$/g, "").trim() ?? "";
    const [rawDate, rawText, rawAccounts, rawComment, rawImages] = cols.map(clean);
    const mediaUrls = rawImages ? rawImages.split(";").map(u => u.trim()).filter(Boolean) : undefined;

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

    let accountIds: string[] = [];
    const parts = rawAccounts?.split("|").map(p => p.trim()) ?? [];
    const partsLower = parts.map(p => p.toLowerCase());
    const excluded = partsLower.filter(p => p.startsWith("!")).map(p => p.slice(1));
    const included = partsLower.filter(p => !p.startsWith("!") && p !== "all");
    const includedRaw = parts.filter(p => !p.startsWith("!") && p.toLowerCase() !== "all");
    const isAll = partsLower.includes("all") || (included.length === 0 && excluded.length > 0);

    const matchesAccount = (a: Account, term: string) =>
      a.platform === term || a.displayName.toLowerCase() === term;
    const excludesAccount = (a: Account) =>
      excluded.some(ex => a.platform === ex || a.displayName.toLowerCase() === ex);

    if (isAll) {
      accountIds = accounts.filter(a => a.platform !== "youtube" && !excludesAccount(a)).map(a => a.id);
    } else {
      if (included.includes("youtube")) {
        return { scheduledFor: parsed.toISOString(), text: rawText, accountIds: [], error: "YouTube requires a video — use Compose instead" };
      }
      accountIds = accounts.filter(a => included.some(term => matchesAccount(a, term)) && !excludesAccount(a)).map(a => a.id);
      if (accountIds.length === 0) {
        return { scheduledFor: parsed.toISOString(), text: rawText, accountIds: [], mediaUrls, error: `No matching accounts for: "${rawAccounts}"` };
      }
      const unmatched = includedRaw.filter(term => !accounts.some(a => matchesAccount(a, term.toLowerCase())));
      if (unmatched.length > 0) {
        return { scheduledFor: parsed.toISOString(), text: rawText, accountIds: [], mediaUrls, error: `Unknown accounts: "${unmatched.join(", ")}" — check spelling` };
      }
    }

    const hasInstagram = accountIds.some(id => accounts.find(a => a.id === id)?.platform === "instagram");
    if (hasInstagram && !mediaUrls?.length) {
      return { scheduledFor: parsed.toISOString(), text: rawText, accountIds: [], mediaUrls, error: "Instagram requires at least one image URL" };
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

export default function BulkPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [csv, setCsv] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parsed, setParsed] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ phase: "idle" });
  const [activeTab, setActiveTab] = useState<"paste" | "format">("paste");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSendingRef = useRef(false);

  useEffect(() => {
    apiFetch<Account[]>("/accounts").then(setAccounts).catch(() => {});
  }, []);

  // Block navigation while uploading
  useEffect(() => {
    const handleBefore = (e: BeforeUnloadEvent) => {
      if (isSendingRef.current) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handleBefore);
    return () => window.removeEventListener("beforeunload", handleBefore);
  }, []);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string ?? "";
      setCsv(text);
      const result = parseCSV(text, accounts);
      setRows(result);
      setParsed(true);
      setSubmitState({ phase: "idle" });
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleParse() {
    const result = parseCSV(csv, accounts);
    setRows(result);
    setParsed(true);
    setSubmitState({ phase: "idle" });
  }

  async function handleSubmit() {
    const valid = rows.filter(r => !r.error);
    if (valid.length === 0) return;
    isSendingRef.current = true;
    setSubmitState({ phase: "sending", done: 0, total: valid.length });

    try {
      const res = await fetch(`${API_BASE}/jobs/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          jobs: valid.map(row => ({
            scheduledFor: row.scheduledFor,
            content: { text: row.text, mediaUrls: row.mediaUrls ?? [] },
            commentText: row.commentText,
            accountIds: row.accountIds,
          })),
        }),
      });

      if (!res.ok || !res.body) {
        const text = await res.text();
        let msg = `${res.status} error`;
        try { const j = JSON.parse(text); msg = j.error ?? j.message ?? msg; } catch {}
        throw new Error(msg);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let finalResult: SubmitResult | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const evt = JSON.parse(line);
            if (evt.type === "progress") setSubmitState({ phase: "sending", done: evt.done, total: evt.total });
            else if (evt.type === "done") finalResult = { succeeded: evt.succeeded, failed: evt.failed, errors: evt.errors };
          } catch {}
        }
      }

      if (!finalResult) throw new Error("No response from server");
      isSendingRef.current = false;
      setSubmitState({ phase: "done", result: finalResult });
    } catch (err) {
      isSendingRef.current = false;
      const msg = err instanceof Error ? err.message : "Request failed. Please try again.";
      setSubmitState({ phase: "error", message: msg });
    }
  }

  const validRows = rows.filter(r => !r.error);
  const errorRows = rows.filter(r => r.error);
  const isSending = submitState.phase === "sending";

  // Rows that have Google Drive / private image URLs targeting Facebook
  const googleDriveWarningRows = parsed ? validRows.filter(row => {
    const hasFacebook = row.accountIds.some(id => accounts.find(a => a.id === id)?.platform === "facebook");
    const hasPrivateUrl = row.mediaUrls?.some(u => u.includes("lh3.googleusercontent.com") || u.includes("drive.google.com"));
    return hasFacebook && hasPrivateUrl;
  }) : [];

  function handleClear() {
    setCsv("");
    setRows([]);
    setParsed(false);
    setSubmitState({ phase: "idle" });
    setExpandedRow(null);
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: "#0a0a0a", color: "#ededed" }}>

      {/* Top bar — pl-14 on mobile to clear the sidebar hamburger (fixed at left:14) */}
      <div className="flex-shrink-0 pl-14 pr-4 py-3 md:px-4" style={{ borderBottom: "1px solid #1e1e1e" }}>
        {/* Row 1: back + title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            disabled={isSending}
            className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70 disabled:opacity-30 flex-shrink-0"
            style={{ color: "#888" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="w-px h-4 flex-shrink-0" style={{ backgroundColor: "#2a2a2a" }} />
          <h1 className="text-sm font-bold truncate" style={{ color: "#ededed" }}>Bulk Schedule</h1>
        </div>
        {/* Row 2: action buttons (only when relevant) */}
        {(parsed && rows.length > 0 && submitState.phase !== "done") || submitState.phase === "done" ? (
          <div className="flex items-center gap-2 mt-2">
            {parsed && rows.length > 0 && submitState.phase !== "done" && (
              <>
                <span className="text-xs flex-1" style={{ color: validRows.length > 0 ? "#4ade80" : "#555" }}>
                  {validRows.length} ready{errorRows.length > 0 && <span style={{ color: "#f87171" }}> · {errorRows.length} errors</span>}
                </span>
                {!isSending && (
                  <button
                    onClick={handleClear}
                    className="px-3 py-1.5 rounded-xl text-sm font-medium transition-colors hover:opacity-80 flex-shrink-0"
                    style={{ backgroundColor: "#1a1a1a", color: "#666", border: "1px solid #2a2a2a" }}
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={isSending || validRows.length === 0}
                  className="px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors hover:bg-gray-100 disabled:opacity-40 flex-shrink-0"
                  style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}
                >
                  {isSending ? "Scheduling…" : `Schedule ${validRows.length}`}
                </button>
              </>
            )}
            {submitState.phase === "done" && (
              <button
                onClick={() => router.push("/jobs")}
                className="px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors hover:bg-gray-100 flex-shrink-0"
                style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}
              >
                View posts →
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* Main layout: mobile = scrollable single column, desktop = fixed-height side-by-side */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">

        {/* LEFT — input panel */}
        <div className="flex flex-col w-full lg:w-96 lg:flex-shrink-0 lg:overflow-y-auto border-b lg:border-b-0 lg:border-r" style={{ borderColor: "#1e1e1e" }}>

          {/* Tab switcher */}
          <div className="flex" style={{ borderBottom: "1px solid #1e1e1e" }}>
            {(["paste", "format"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-3 text-xs font-semibold capitalize transition-colors"
                style={{
                  color: activeTab === tab ? "#ededed" : "#555",
                  borderBottom: activeTab === tab ? "2px solid #5b63d3" : "2px solid transparent",
                }}
              >
                {tab === "paste" ? "CSV Input" : "Format Guide"}
              </button>
            ))}
          </div>

          <div className="flex-1 p-5 space-y-4">
            {activeTab === "paste" ? (
              <>
                {/* Upload button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSending}
                  className="w-full flex flex-col items-center justify-center gap-3 py-8 rounded-xl border-2 border-dashed transition-colors hover:opacity-80 disabled:opacity-40"
                  style={{ borderColor: "#2a2a2a", color: "#555" }}
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <div className="text-center">
                    <p className="text-sm font-medium" style={{ color: "#888" }}>Drop CSV file here</p>
                    <p className="text-xs mt-0.5" style={{ color: "#444" }}>or click to browse</p>
                  </div>
                </button>
                <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileUpload} />

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ backgroundColor: "#1e1e1e" }} />
                  <span className="text-xs" style={{ color: "#444" }}>or paste CSV</span>
                  <div className="flex-1 h-px" style={{ backgroundColor: "#1e1e1e" }} />
                </div>

                <textarea
                  value={csv}
                  onChange={(e) => { setCsv(e.target.value); setParsed(false); setRows([]); setSubmitState({ phase: "idle" }); }}
                  placeholder={"scheduled_for,text,accounts,comment,image_urls\n2026-07-10 09:00,My post text,bluesky|mastodon,,"}
                  rows={10}
                  disabled={isSending}
                  className="w-full resize-none rounded-xl border px-4 py-3 text-xs focus:outline-none font-mono disabled:opacity-40"
                  style={{ backgroundColor: "#111", borderColor: "#2a2a2a", color: "#ededed", lineHeight: "1.6" }}
                />

                {csv.trim() && !isSending && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleParse}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:opacity-90"
                      style={{ backgroundColor: "#1f1f2e", color: "#818cf8", border: "1px solid #3730a3" }}
                    >
                      Preview {Math.max(0, csv.trim().split("\n").length - 1)} rows
                    </button>
                    <button
                      type="button"
                      onClick={handleClear}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:opacity-80"
                      style={{ backgroundColor: "#1a1a1a", color: "#666", border: "1px solid #2a2a2a" }}
                    >
                      Clear
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* Format Guide tab */
              <div className="space-y-5 text-xs" style={{ color: "#888" }}>
                <div>
                  <p className="text-xs font-semibold mb-3" style={{ color: "#ededed" }}>Required columns</p>
                  <div className="space-y-3">
                    {[
                      { col: "scheduled_for", desc: "Date and time", ex: "2026-07-10 09:00" },
                      { col: "text", desc: "Post body text (required)", ex: "Hello world!" },
                      { col: "accounts", desc: "Target accounts (see below)", ex: "facebook|bluesky" },
                    ].map(({ col, desc, ex }) => (
                      <div key={col} className="rounded-xl p-3 space-y-1" style={{ backgroundColor: "#111", border: "1px solid #1e1e1e" }}>
                        <code className="text-xs font-bold" style={{ color: "#818cf8" }}>{col}</code>
                        <p style={{ color: "#888" }}>{desc}</p>
                        <p className="font-mono text-[11px]" style={{ color: "#555" }}>e.g. {ex}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold mb-3" style={{ color: "#ededed" }}>Optional columns</p>
                  <div className="space-y-3">
                    {[
                      { col: "comment", desc: "First comment text", ex: "Check out the link!" },
                      { col: "image_urls", desc: "Public image URLs, separated by semicolons. Must be publicly accessible — Google Drive links won't work.", ex: "https://cdn.example.com/img.jpg" },
                    ].map(({ col, desc, ex }) => (
                      <div key={col} className="rounded-xl p-3 space-y-1" style={{ backgroundColor: "#111", border: "1px solid #1e1e1e" }}>
                        <code className="text-xs font-bold" style={{ color: "#818cf8" }}>{col}</code>
                        <p style={{ color: "#888" }}>{desc}</p>
                        <p className="font-mono text-[11px]" style={{ color: "#555" }}>e.g. {ex}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold mb-3" style={{ color: "#ededed" }}>Account targeting</p>
                  <div className="space-y-2 rounded-xl p-3 mb-3 overflow-x-auto" style={{ backgroundColor: "#111", border: "1px solid #1e1e1e" }}>
                    {[
                      ["all", "All connected accounts (except YouTube)"],
                      ["facebook", "All accounts on that platform"],
                      ["My Page Name", "Specific account by display name"],
                      ["bluesky|mastodon", "Multiple targets (pipe-separated)"],
                      ["all|!instagram", "All except Instagram"],
                      ["facebook|!My Page", "All FB pages except one"],
                    ].map(([ex, desc]) => (
                      <div key={ex} className="flex gap-3 text-[11px]">
                        <code className="flex-shrink-0 font-mono" style={{ color: "#818cf8", minWidth: "140px" }}>{ex}</code>
                        <span style={{ color: "#666" }}>{desc}</span>
                      </div>
                    ))}
                  </div>

                  {/* Warning about exact names */}
                  <div className="rounded-xl p-3 mb-3" style={{ backgroundColor: "#1a1200", border: "1px solid #3a2800" }}>
                    <p className="text-[11px] font-semibold mb-1" style={{ color: "#c9a227" }}>⚠️ Display names must match exactly</p>
                    <p className="text-[11px]" style={{ color: "#8a6e1a" }}>
                      Copy names from the list below — a single typo, extra space, or different apostrophe (e.g. <code className="font-mono">&apos;</code> vs <code className="font-mono">&lsquo;</code>) will cause "No matching account" errors.
                      The <strong>compose page account selection has no effect on Bulk CSV</strong> — only the <code className="font-mono">accounts</code> column matters.
                    </p>
                  </div>

                  {/* Live account list — copy names directly */}
                  {accounts.length > 0 && (() => {
                    const filtered = accounts.filter(a => a.platform !== "youtube");
                    // Group by platform
                    const groups = filtered.reduce<Record<string, typeof filtered>>((acc, a) => {
                      (acc[a.platform] ??= []).push(a);
                      return acc;
                    }, {});
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-semibold" style={{ color: "#ededed" }}>Your connected accounts</p>
                          <p className="text-[10px]" style={{ color: "#444" }}>Click name to copy</p>
                        </div>
                        {Object.entries(groups).map(([platform, accs]) => (
                          <div key={platform} className="rounded-xl overflow-hidden" style={{ border: "1px solid #1e1e1e" }}>
                            {/* Platform header */}
                            <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: "#161616", borderBottom: "1px solid #1e1e1e" }}>
                              <PlatformIcon platform={platform} size={12} />
                              <span className="text-[11px] font-semibold capitalize" style={{ color: "#666" }}>{platform}</span>
                              <span className="text-[10px] ml-auto" style={{ color: "#333" }}>{accs.length} account{accs.length !== 1 ? "s" : ""}</span>
                            </div>
                            {/* Accounts in this platform */}
                            {accs.map((a, i) => {
                              const copied = copiedId === a.id;
                              return (
                                <button
                                  key={a.id}
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(a.displayName);
                                    setCopiedId(a.id);
                                    setTimeout(() => setCopiedId(null), 1500);
                                  }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all"
                                  style={{
                                    borderBottom: i < accs.length - 1 ? "1px solid #141414" : undefined,
                                    backgroundColor: copied ? "#0a1f0a" : undefined,
                                  }}
                                  onMouseEnter={e => { if (!copied) (e.currentTarget as HTMLElement).style.backgroundColor = "#141414"; }}
                                  onMouseLeave={e => { if (!copied) (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}
                                >
                                  {/* Avatar or initial */}
                                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                                    style={{ backgroundColor: "#1e1e1e", color: "#666", border: "1px solid #2a2a2a" }}>
                                    {a.displayName[0]?.toUpperCase() ?? "?"}
                                  </div>
                                  <span className="flex-1 text-xs font-mono truncate" style={{ color: copied ? "#4ade80" : "#ccc" }}>
                                    {a.displayName}
                                  </span>
                                  <span className="flex-shrink-0 text-[10px] font-medium transition-all" style={{ color: copied ? "#4ade80" : "#333" }}>
                                    {copied ? "Copied!" : "Copy"}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: "#ededed" }}>Example CSV</p>
                  <pre className="text-[10px] rounded-xl p-3 overflow-x-auto leading-relaxed" style={{ backgroundColor: "#111", border: "1px solid #1e1e1e", color: "#aaa", fontFamily: "monospace" }}>
                    {EXAMPLE_CSV}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — preview / results panel */}
        <div className="flex flex-col lg:flex-1 lg:overflow-hidden">

          {/* Progress bar — sticky at top of right panel */}
          {submitState.phase === "sending" && (() => {
            const pct = submitState.total > 0 ? Math.round((submitState.done / submitState.total) * 100) : 0;
            return (
              <div className="flex-shrink-0 px-6 py-4" style={{ borderBottom: "1px solid #1e1e1e", backgroundColor: "#0d0d1a" }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0" style={{ borderColor: "#5b63d3", borderTopColor: "transparent" }} />
                  <span className="text-sm font-medium" style={{ color: "#818cf8" }}>
                    Scheduling posts… {submitState.done} of {submitState.total}
                  </span>
                  <span className="ml-auto text-sm font-mono font-bold" style={{ color: "#5b63d3" }}>{pct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#1f1f1f" }}>
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct || 2}%`, backgroundColor: "#5b63d3" }} />
                </div>
                <p className="text-xs mt-2" style={{ color: "#444" }}>Do not close or navigate away</p>
              </div>
            );
          })()}

          {/* Done banner */}
          {submitState.phase === "done" && (
            <div className="flex-shrink-0 px-6 py-4" style={{ borderBottom: "1px solid #1e1e1e", backgroundColor: "#0a1a0a" }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">✓</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#4ade80" }}>
                    {submitState.result.succeeded} post{submitState.result.succeeded !== 1 ? "s" : ""} scheduled successfully
                  </p>
                  {submitState.result.failed > 0 && (
                    <p className="text-xs mt-0.5" style={{ color: "#f87171" }}>
                      {submitState.result.failed} failed — see errors below
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error banner */}
          {submitState.phase === "error" && (
            <div className="flex-shrink-0 px-6 py-4" style={{ borderBottom: "1px solid #1e1e1e", backgroundColor: "#1a0a0a" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#f87171" }}>✕ Failed to submit</p>
                  <p className="text-xs mt-0.5" style={{ color: "#888" }}>{submitState.message}</p>
                </div>
                <button onClick={() => setSubmitState({ phase: "idle" })} className="text-xs underline hover:opacity-70" style={{ color: "#818cf8" }}>
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!parsed && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 lg:flex-1" style={{ color: "#333" }}>
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: "#444" }}>No CSV loaded yet</p>
                <p className="text-xs mt-1" style={{ color: "#333" }}>Upload a file or paste CSV on the left</p>
              </div>
            </div>
          )}

          {/* Google Drive image warning */}
          {googleDriveWarningRows.length > 0 && (
            <div className="flex-shrink-0 mx-6 mt-4 rounded-xl p-3 flex gap-3" style={{ backgroundColor: "#1a1500", border: "1px solid #3a2d00" }}>
              <span className="text-base flex-shrink-0">⚠️</span>
              <div className="text-xs" style={{ color: "#c9a227" }}>
                <p className="font-semibold mb-1">Google Drive images won&apos;t work with Facebook</p>
                <p style={{ color: "#8a6e1a" }}>
                  {googleDriveWarningRows.length} row{googleDriveWarningRows.length !== 1 ? "s" : ""} use Google Drive URLs targeting Facebook.
                  Facebook&apos;s servers can&apos;t access private Google Drive links — the post will be scheduled but fail at publish time.
                  Replace with publicly accessible URLs (e.g. from your uploads in Posthive or a public CDN).
                </p>
                <p className="mt-1.5 font-mono text-[10px]" style={{ color: "#6a5010" }}>
                  Rows: {googleDriveWarningRows.map(row => rows.indexOf(row) + 2).join(", ")}
                </p>
              </div>
            </div>
          )}

          {/* Stats bar */}
          {parsed && rows.length > 0 && (
            <div className="flex-shrink-0 flex flex-wrap items-center gap-4 lg:gap-6 px-4 py-3" style={{ borderBottom: "1px solid #1e1e1e", backgroundColor: "#0d0d0d" }}>
              <Stat label="Total rows" value={rows.length} />
              <Stat label="Ready" value={validRows.length} color="#4ade80" />
              <Stat label="Errors" value={errorRows.length} color={errorRows.length > 0 ? "#f87171" : undefined} />
              <Stat label="Accounts reached" value={[...new Set(validRows.flatMap(r => r.accountIds))].length} color="#818cf8" />
            </div>
          )}

          {/* Table */}
          {parsed && rows.length > 0 && (
            <div className="overflow-x-auto lg:flex-1 lg:overflow-y-auto">
              <table className="w-full text-xs" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
                <thead className="sticky top-0 z-10" style={{ backgroundColor: "#0d0d0d" }}>
                  <tr style={{ borderBottom: "1px solid #1e1e1e" }}>
                    <th className="text-left px-4 py-3 font-semibold w-10" style={{ color: "#444" }}>#</th>
                    <th className="text-left px-4 py-3 font-semibold whitespace-nowrap" style={{ color: "#444" }}>Date & Time</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "#444" }}>Post Text</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "#444" }}>Accounts</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "#444" }}>Images</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "#444" }}>Comment</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "#444" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const isExpanded = expandedRow === i;
                    const serverErr = submitState.phase === "done"
                      ? submitState.result.errors?.find(e => e.row === validRows.indexOf(row))
                      : undefined;
                    const rowStatus = row.error ? "error"
                      : serverErr ? "server-error"
                      : submitState.phase === "done" ? "done"
                      : "ready";

                    return (
                      <tr
                        key={i}
                        onClick={() => setExpandedRow(isExpanded ? null : i)}
                        className="cursor-pointer transition-colors"
                        style={{
                          borderBottom: "1px solid #141414",
                          backgroundColor: row.error ? "#0f0808" : isExpanded ? "#151515" : undefined,
                        }}
                        onMouseEnter={e => { if (!row.error) (e.currentTarget as HTMLElement).style.backgroundColor = "#131313"; }}
                        onMouseLeave={e => { if (!row.error) (e.currentTarget as HTMLElement).style.backgroundColor = isExpanded ? "#151515" : ""; }}
                      >
                        <td className="px-4 py-3 font-mono" style={{ color: "#333" }}>{i + 2}</td>

                        <td className="px-4 py-3 whitespace-nowrap" style={{ color: row.error ? "#444" : "#aaa" }}>
                          {row.scheduledFor
                            ? new Date(row.scheduledFor).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                            : "—"}
                        </td>

                        <td className="px-4 py-3" style={{ maxWidth: "300px" }}>
                          {row.error ? (
                            <span className="text-xs" style={{ color: "#f87171" }}>{row.error}</span>
                          ) : (
                            <span
                              className={isExpanded ? "" : "block truncate"}
                              style={{ color: "#ededed", whiteSpace: isExpanded ? "pre-wrap" : undefined, wordBreak: "break-word" }}
                            >
                              {row.text || "—"}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {row.accountIds.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1 flex-wrap">
                                {row.accountIds.slice(0, isExpanded ? undefined : 4).map(id => {
                                  const acc = accounts.find(a => a.id === id);
                                  return acc ? (
                                    <span key={id} title={acc.displayName}>
                                      <PlatformIcon platform={acc.platform} size={14} />
                                    </span>
                                  ) : null;
                                })}
                                {!isExpanded && row.accountIds.length > 4 && (
                                  <span className="text-[10px]" style={{ color: "#555" }}>+{row.accountIds.length - 4}</span>
                                )}
                              </div>
                              {isExpanded && (
                                <div className="mt-1 space-y-0.5">
                                  {row.accountIds.map(id => {
                                    const acc = accounts.find(a => a.id === id);
                                    return acc ? (
                                      <div key={id} className="flex items-center gap-1.5 text-[11px]" style={{ color: "#666" }}>
                                        <PlatformIcon platform={acc.platform} size={11} />
                                        <span>{acc.displayName}</span>
                                      </div>
                                    ) : null;
                                  })}
                                </div>
                              )}
                            </div>
                          ) : <span style={{ color: "#333" }}>—</span>}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap" style={{ color: "#555" }}>
                          {row.mediaUrls?.length
                            ? <span style={{ color: "#888" }}>{row.mediaUrls.length} image{row.mediaUrls.length !== 1 ? "s" : ""}</span>
                            : "—"}
                        </td>

                        <td className="px-4 py-3" style={{ maxWidth: "160px" }}>
                          {row.commentText
                            ? <span className="block truncate" style={{ color: "#666" }}>{row.commentText}</span>
                            : <span style={{ color: "#333" }}>—</span>}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          {rowStatus === "error" && <StatusBadge color="#f87171" label="✕ Error" />}
                          {rowStatus === "server-error" && <StatusBadge color="#f87171" label={`✕ ${serverErr?.reason ?? "Failed"}`} />}
                          {rowStatus === "done" && <StatusBadge color="#4ade80" label="✓ Done" />}
                          {rowStatus === "ready" && <StatusBadge color="#4ade80" label="✓ Ready" />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-lg font-bold tabular-nums" style={{ color: color ?? "#ededed" }}>{value}</span>
      <span className="text-xs" style={{ color: "#444" }}>{label}</span>
    </div>
  );
}

function StatusBadge({ color, label }: { color: string; label: string }) {
  return (
    <span className="text-[11px] font-medium" style={{ color }}>{label}</span>
  );
}
