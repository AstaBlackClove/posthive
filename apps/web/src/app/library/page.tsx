"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { apiFetch } from "../../lib/api";
import { useToast } from "../../components/Toast";

// ── Types ──────────────────────────────────────────────────────────────────

interface Account {
  id: string;
  platform: string;
  displayName: string;
}

interface LibraryItem {
  id: string;
  text: string;
  commentText?: string;
  mediaUrls: string[];
  order: number;
  status: "queued" | "scheduled" | "published" | "skipped" | "failed";
  errorMessage?: string;
  createdAt: string;
}

interface Library {
  id: string;
  name: string;
  status: "active" | "paused" | "exhausted";
  postsPerDay: number;
  timeSlots: string[];
  timezone: string;
  accountIds: string[];
  lastDripAt?: string;
  createdAt: string;
  _count: { items: number };
  statusCounts: Record<string, number>;
}

const MAX_CSV_ROWS = 500;

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  queued:    { bg: "#1a1a2e", text: "#818cf8", label: "Queued" },
  scheduled: { bg: "#0d1f0d", text: "#4ade80", label: "Scheduled" },
  published: { bg: "#0a1a10", text: "#22c55e", label: "Published" },
  skipped:   { bg: "#1a1a1a", text: "#888",    label: "Skipped" },
  failed:    { bg: "#1f0a0a", text: "#f87171", label: "Failed" },
};

const LIBRARY_STATUS: Record<string, { dot: string; label: string }> = {
  active:    { dot: "#22c55e", label: "Active" },
  paused:    { dot: "#f59e0b", label: "Paused" },
  exhausted: { dot: "#888",    label: "Exhausted" },
};

// ── Schedule preview calculator ────────────────────────────────────────────
// Given queued items and drip settings, compute what date/time each item fires

/** Convert "YYYY-MM-DDTHH:MM:SS" (naive, in `tz`) to a UTC Date. */
function zonedToUtc(naiveIso: string, tz: string): Date {
  // Probe: treat naive string as UTC to get a reference instant
  const probe = new Date(naiveIso + "Z");
  // Ask Intl what local time that UTC instant maps to in `tz`
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(probe);
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value ?? "0");
  const tzLocal = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  const naiveUtc = probe.getTime();
  const offset = naiveUtc - tzLocal; // offset = how much to add to naive-as-UTC to get real UTC
  return new Date(naiveUtc + offset);
}

function computeSchedule(
  items: LibraryItem[],
  timeSlots: string[],
  timezone: string,
  postsPerDay: number,
): Map<string, Date> {
  const map = new Map<string, Date>();
  if (!items.length || !timeSlots.length) return map;

  const sorted = [...timeSlots].sort();
  const slotsToUse = sorted.slice(0, postsPerDay);

  // Start from today in the library's timezone
  const now = new Date();
  const todayStr = now.toLocaleDateString("en-CA", { timeZone: timezone }); // YYYY-MM-DD
  const [startY, startM, startD] = todayStr.split("-").map(Number);

  let dayOffset = 0;
  let slotIdx = 0;
  let queuedIdx = 0;

  const queuedItems = items.filter(i => i.status === "queued");

  const startDate = new Date(startY, startM - 1, startD);

  while (queuedIdx < queuedItems.length) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + dayOffset);
    const y = day.getFullYear();
    const mo = String(day.getMonth() + 1).padStart(2, "0");
    const d2 = String(day.getDate()).padStart(2, "0");
    const [h, m] = slotsToUse[slotIdx].split(":").map(Number);
    const iso = `${y}-${mo}-${d2}T${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00`;
    // Convert slot time in library's timezone to UTC for correct comparison
    const utcDate = zonedToUtc(iso, timezone);

    // Skip slots already in the past
    if (utcDate.getTime() <= now.getTime()) {
      slotIdx++;
      if (slotIdx >= slotsToUse.length) { slotIdx = 0; dayOffset++; }
      continue;
    }

    map.set(queuedItems[queuedIdx].id, utcDate);
    queuedIdx++;
    slotIdx++;
    if (slotIdx >= slotsToUse.length) { slotIdx = 0; dayOffset++; }
  }

  return map;
}

function fmtSchedule(d: Date): string {
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 0) return `Today ${time}`;
  if (diffDays === 1) return `Tomorrow ${time}`;
  if (diffDays < 7) return `${d.toLocaleDateString([], { weekday: "short" })} ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

// ── Guide section component ────────────────────────────────────────────────

function GuideSection({ step, title, color, description, code, rule, states }: {
  step: string; title: string; color: string; description: string;
  code?: string; rule?: string;
  states?: { label: string; color: string; desc: string }[];
}) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: color + "22", color, border: `1px solid ${color}44` }}>
        {step}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold mb-1" style={{ color: "#ededed" }}>{title}</p>
        <p className="text-xs leading-relaxed" style={{ color: "#888" }}>{description}</p>
        {code && (
          <pre className="mt-2 text-xs rounded-lg overflow-x-auto p-3" style={{ backgroundColor: "#0d0d0d", border: "1px solid #1e1e1e", color: "#6ee7b7", fontFamily: "monospace" }}>{code}</pre>
        )}
        {rule && (
          <div className="mt-2 text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: "#0d0d0d", border: "1px solid #1e1e1e", color: "#f59e0b" }}>
            ⚡ {rule}
          </div>
        )}
        {states && (
          <div className="mt-2 flex flex-col gap-1.5">
            {states.map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: s.color + "22", color: s.color }}>{s.label}</span>
                <span className="text-xs" style={{ color: "#666" }}>{s.desc}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const AI_PROMPT = `Generate a CSV file for a social media content library.

Rules:
- Columns: text, comment, mediaUrls
- "text" is required — the main post content (wrap in double quotes)
- "comment" is optional — a first comment posted right after the post
- "mediaUrls" is optional — pipe-separated URLs of images/videos
- No extra columns, no markdown, no explanation — just the CSV

Generate [NUMBER] posts about [TOPIC]. Each post should be engaging, unique, and end with a call-to-action question.`;

function AiPromptSection() {
  const [copied, setCopied] = React.useState(false);
  function copy() {
    navigator.clipboard.writeText(AI_PROMPT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div style={{ backgroundColor: "#0a0a14", border: "1px solid #5b63d333", borderRadius: 10, padding: "14px 16px" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: "#818cf8" }}>✦ Generate CSV with AI</span>
        </div>
        <button
          onClick={copy}
          className="text-xs px-2.5 py-1 rounded-md transition-colors"
          style={{ backgroundColor: copied ? "#10b98122" : "#5b63d322", color: copied ? "#10b981" : "#818cf8", border: `1px solid ${copied ? "#10b98144" : "#5b63d344"}` }}
        >
          {copied ? "Copied!" : "Copy prompt"}
        </button>
      </div>
      <p className="text-xs mb-2" style={{ color: "#555" }}>
        Paste this into Claude, ChatGPT, or any AI. Replace <span style={{ color: "#818cf8" }}>[NUMBER]</span> and <span style={{ color: "#818cf8" }}>[TOPIC]</span>, then upload the CSV here.
      </p>
      <pre className="text-xs rounded-lg p-3 overflow-x-auto" style={{ backgroundColor: "#0d0d0d", border: "1px solid #1e1e1e", color: "#6366f1", fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {AI_PROMPT}
      </pre>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const { success, error } = useToast();

  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = libraries.find(l => l.id === selectedId) ?? null;

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    postsPerDay: 1,
    timeSlots: ["09:00"],
    timezone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC",
    accountIds: [] as string[],
  });

  // Items
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsNextCursor, setItemsNextCursor] = useState<string | null>(null);
  const [itemsHasMore, setItemsHasMore] = useState(false);
  const [itemsFilter, setItemsFilter] = useState<string>("all");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreItems = useRef(false);

  // CSV
  const [csvUploading, setCsvUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings edit
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Library | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Guide
  const [guideOpen, setGuideOpen] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────

  async function loadLibraries() {
    setLoading(true);
    try {
      const data = await apiFetch<Library[]>("/library");
      setLibraries(data);
    } catch (e) {
      error(e instanceof Error ? e.message : "Failed to load libraries");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLibraries();
    apiFetch<Account[]>("/accounts").then(setAccounts).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Items ────────────────────────────────────────────────────────────────

  const loadItems = useCallback(async (libraryId: string, cursor?: string) => {
    if (!cursor) { setItemsLoading(true); setItems([]); }
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (cursor) params.set("cursor", cursor);
      if (itemsFilter !== "all") params.set("status", itemsFilter);
      const data = await apiFetch<{ items: LibraryItem[]; nextCursor: string | null; hasMore: boolean }>(
        `/library/${libraryId}/items?${params}`
      );
      setItems(prev => cursor ? [...prev, ...data.items] : data.items);
      setItemsNextCursor(data.nextCursor);
      setItemsHasMore(data.hasMore);
    } catch { /* silent */ }
    finally { setItemsLoading(false); loadingMoreItems.current = false; }
  }, [itemsFilter]);

  useEffect(() => {
    if (selectedId) { setItemsNextCursor(null); setItemsHasMore(false); loadItems(selectedId); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, itemsFilter]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && itemsHasMore && !loadingMoreItems.current && selectedId && itemsNextCursor) {
        loadingMoreItems.current = true;
        loadItems(selectedId, itemsNextCursor);
      }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [itemsHasMore, itemsNextCursor, selectedId, loadItems]);

  // ── Create ───────────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (form.accountIds.length === 0) { error("Select at least one account"); return; }
    if (form.timeSlots.length === 0) { error("Add at least one time slot"); return; }
    setCreating(true);
    try {
      const lib = await apiFetch<{ id: string }>("/library", { method: "POST", body: JSON.stringify(form) });
      setCreateOpen(false);
      setForm({ name: "", postsPerDay: 1, timeSlots: ["09:00"], timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", accountIds: [] });
      await loadLibraries();
      success("Library created");
      setSelectedId(lib.id);
    } catch (e) {
      error(e instanceof Error ? e.message : "Failed to create library");
    } finally {
      setCreating(false);
    }
  }

  // ── Pause / Resume ───────────────────────────────────────────────────────

  async function togglePause(lib: Library) {
    const newStatus = lib.status === "paused" ? "active" : "paused";
    try {
      await apiFetch(`/library/${lib.id}`, { method: "PATCH", body: JSON.stringify({ status: newStatus }) });
      setLibraries(prev => prev.map(l => l.id === lib.id ? { ...l, status: newStatus } : l));
      success(newStatus === "paused" ? "Library paused" : "Library resumed");
    } catch (e) { error(e instanceof Error ? e.message : "Failed to update"); }
  }

  // ── Delete ───────────────────────────────────────────────────────────────

  async function deleteLibrary(lib: Library) {
    setDeleteTarget(lib);
  }

  async function confirmDeleteLibrary() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/library/${deleteTarget.id}`, { method: "DELETE" });
      setLibraries(prev => prev.filter(l => l.id !== deleteTarget.id));
      if (selectedId === deleteTarget.id) setSelectedId(null);
      setDeleteTarget(null);
      success("Library deleted");
    } catch (e) { error(e instanceof Error ? e.message : "Failed to delete"); }
    finally { setDeleting(false); }
  }

  // ── CSV Upload ───────────────────────────────────────────────────────────

  async function handleCsvFile(file: File) {
    if (!selectedId) return;
    const text = await file.text();
    const lines = text.split("\n").filter(l => l.trim());
    const dataLines = lines.slice(1);
    if (dataLines.length === 0) { error("CSV is empty"); return; }
    if (dataLines.length > MAX_CSV_ROWS) {
      error(`CSV has ${dataLines.length} rows — max ${MAX_CSV_ROWS}. Split into smaller files.`);
      return;
    }

    const parsed: { text: string; commentText?: string; mediaUrls: string[] }[] = [];
    const parseErrors: string[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const row = dataLines[i].trim();
      if (!row) continue;
      const cols = parseCSVRow(row);
      const textVal = (cols[0] ?? "").trim().replace(/^"|"$/g, "");
      const commentVal = (cols[1] ?? "").trim().replace(/^"|"$/g, "");
      const mediaRaw = (cols[2] ?? "").trim().replace(/^"|"$/g, "");
      const mediaUrls = mediaRaw ? mediaRaw.split("|").map(u => u.trim()).filter(Boolean) : [];
      if (!textVal) { parseErrors.push(`Row ${i + 2}: text required`); continue; }
      if (textVal.length > 5000) { parseErrors.push(`Row ${i + 2}: text too long`); continue; }
      parsed.push({ text: textVal, commentText: commentVal || undefined, mediaUrls });
    }

    if (parseErrors.length > 0) {
      error(`${parseErrors.length} row(s) had errors:\n${parseErrors.slice(0, 5).join("\n")}${parseErrors.length > 5 ? `\n…+${parseErrors.length - 5} more` : ""}`);
      return;
    }

    setCsvUploading(true);
    try {
      const result = await apiFetch<{ created: number }>(`/library/${selectedId}/items`, {
        method: "POST",
        body: JSON.stringify({ items: parsed }),
      });
      success(`${result.created} item${result.created === 1 ? "" : "s"} added`);
      loadLibraries();
      loadItems(selectedId);
    } catch (e) {
      error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setCsvUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function parseCSVRow(row: string): string[] {
    const cols: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"') {
        if (inQuotes && row[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) { cols.push(cur); cur = ""; }
      else cur += ch;
    }
    cols.push(cur);
    return cols;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full" style={{ backgroundColor: "#0a0a0a", color: "#ededed" }}>

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.75)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }}>
            <h3 className="text-base font-semibold mb-2" style={{ color: "#ededed" }}>Delete library</h3>
            <p className="text-sm mb-6" style={{ color: "#888" }}>
              Delete <span style={{ color: "#ededed" }}>"{deleteTarget.name}"</span> and all{" "}
              <span style={{ color: "#ededed" }}>{deleteTarget._count?.items ?? 0} items</span>? This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/5"
                style={{ color: "#888", border: "1px solid #2a2a2a" }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteLibrary}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: "#dc2626", color: "#fff", opacity: deleting ? 0.6 : 1 }}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guide modal */}
      {guideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.8)" }} onClick={() => setGuideOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #1e1e1e" }}>
              <div>
                <h2 className="text-sm font-bold" style={{ color: "#ededed" }}>Content Library — How it works</h2>
                <p className="text-xs mt-0.5" style={{ color: "#555" }}>Drip-schedule your content automatically</p>
              </div>
              <button onClick={() => setGuideOpen(false)} style={{ color: "#555", background: "none", border: "none", cursor: "pointer", fontSize: 18, lineHeight: 1 }} className="hover:text-white transition-colors">✕</button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-6">
              {/* What is it */}
              <GuideSection
                step="1"
                title="What is Content Library?"
                color="#5b63d3"
                description="A Content Library is a queue of posts that drip out automatically on a schedule — like a content calendar that runs itself. Upload your posts once, set a daily schedule, and Posthive fires them one by one without you touching anything."
              />

              {/* Upload CSV */}
              <GuideSection
                step="2"
                title="Upload posts via CSV"
                color="#0ea5e9"
                description='Each row = one post. Required column: "text". Optional columns: "comment" (first comment posted after the post) and "mediaUrls" (pipe-separated image/video URLs).'
                code={`text,comment,mediaUrls\n"Your post content here","First comment text","https://example.com/image.jpg"\n"Another post","",""`}
              />

              {/* Time slots */}
              <GuideSection
                step="3"
                title="Set your daily time slots"
                color="#10b981"
                description="Add one or more times of day (e.g. 09:00, 13:00, 18:00). Each slot fires one post per day. With 3 slots → 3 posts/day. Posts Per Day caps how many slots are used if you add more slots than needed."
                rule="Posts per day = min(postsPerDay setting, number of time slots)"
              />

              {/* How drip works */}
              <GuideSection
                step="4"
                title="How posts are drip-scheduled"
                color="#f59e0b"
                description="Every 5 minutes, Posthive checks which time slots fall in the next 5 minutes. For each matching slot, it picks the next Queued post in order and schedules it. Posts move through these states:"
                states={[
                  { label: "Queued", color: "#6366f1", desc: "Waiting to be scheduled" },
                  { label: "Scheduled", color: "#0ea5e9", desc: "BullMQ job created, will fire at slot time" },
                  { label: "Published", color: "#10b981", desc: "Posted successfully to all platforms" },
                  { label: "Failed", color: "#ef4444", desc: "One or more platforms failed" },
                ]}
              />

              {/* Rules */}
              <div style={{ backgroundColor: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px" }}>
                <p className="text-xs font-semibold mb-3" style={{ color: "#888", letterSpacing: "0.05em", textTransform: "uppercase" }}>Rules & limits</p>
                <ul className="flex flex-col gap-2">
                  {[
                    "Posts fire in order — item #1 first, then #2, etc.",
                    "Changing time slots takes effect within 5 minutes.",
                    "Last-minute slot changes (< 5 min before) may miss that slot — plan ahead.",
                    "Deleting a library cancels all scheduled posts for it.",
                    "Pausing stops new posts from being scheduled; existing scheduled posts still fire.",
                    "When all items are posted, the library becomes Exhausted — upload more to resume.",
                    "Max 500 rows per CSV upload.",
                  ].map((rule, i) => (
                    <li key={i} className="text-xs" style={{ color: "#888", paddingLeft: 2 }}>
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* AI prompt section */}
            <div className="px-6 pb-2">
              <AiPromptSection />
            </div>

            <div className="px-6 pb-5 pt-4">
              <button
                onClick={() => setGuideOpen(false)}
                className="w-full py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90"
                style={{ backgroundColor: "#fff", color: "#0a0a0a" }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left panel */}
      <div className="flex flex-col shrink-0" style={{ width: 260, borderRight: "1px solid #1e1e1e", backgroundColor: "#0d0d0d" }}>
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid #1e1e1e" }}>
          <div>
            <p className="text-xs font-bold" style={{ color: "#ededed", letterSpacing: "0.02em" }}>Content Library</p>
            <p className="text-xs" style={{ color: "#555", marginTop: 1 }}>Drip-schedule your content</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setGuideOpen(true)}
              title="How it works"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 7, backgroundColor: "#5b63d322", color: "#818cf8", border: "1px solid #5b63d355", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
              className="hover:bg-indigo-500/20 hover:border-indigo-400/60 transition-colors"
            >
              ?
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, backgroundColor: "#fff", color: "#0a0a0a", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer" }}
              className="hover:opacity-90 transition-opacity"
            >
              <svg style={{ width: 11, height: 11 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              New
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="flex justify-center py-10">
              <svg className="animate-spin w-4 h-4" style={{ color: "#555" }} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : libraries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
              <p className="text-xs font-medium" style={{ color: "#555" }}>No libraries yet</p>
              <button onClick={() => setCreateOpen(true)} className="mt-3 text-xs hover:opacity-80 transition-opacity" style={{ color: "#818cf8" }}>
                + Create one
              </button>
            </div>
          ) : (
            libraries.map(lib => {
              const sc = LIBRARY_STATUS[lib.status];
              const queued = lib.statusCounts?.queued ?? 0;
              const isActive = selectedId === lib.id;
              return (
                <button
                  key={lib.id}
                  onClick={() => setSelectedId(lib.id)}
                  className="w-full text-left transition-colors"
                  style={{
                    padding: "9px 14px",
                    backgroundColor: isActive ? "#131328" : "transparent",
                    borderLeft: `2px solid ${isActive ? "#818cf8" : "transparent"}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold truncate" style={{ color: isActive ? "#fff" : "#ccc" }}>{lib.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: sc.dot }} />
                      <span style={{ fontSize: 10, color: "#555" }}>{sc.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span style={{ fontSize: 11, color: "#777" }}>{lib._count?.items ?? 0} items</span>
                    {queued > 0 && <span style={{ fontSize: 11, color: "#818cf8" }}>{queued} queued</span>}
                    <span style={{ fontSize: 11, color: "#777" }}>{lib.postsPerDay}/day</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel */}
      {!selected ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ color: "#333" }}>
          <svg style={{ width: 40, height: 40 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-sm" style={{ color: "#444" }}>Select a library</p>
        </div>
      ) : (
        <LibraryDetail
          library={selected}
          accounts={accounts}
          items={items}
          itemsLoading={itemsLoading}
          itemsHasMore={itemsHasMore}
          itemsFilter={itemsFilter}
          setItemsFilter={setItemsFilter}
          sentinelRef={sentinelRef}
          csvUploading={csvUploading}
          fileInputRef={fileInputRef}
          settingsOpen={settingsOpen}
          setSettingsOpen={setSettingsOpen}
          onCsvFile={handleCsvFile}
          onTogglePause={() => togglePause(selected)}
          onDelete={() => deleteLibrary(selected)}
          onLibraryUpdated={(updated) => {
            setLibraries(prev => prev.map(l => l.id === updated.id ? { ...l, ...updated } : l));
          }}
          onError={error}
          onSuccess={success}
        />
      )}

      {/* Create modal */}
      {createOpen && (
        <LibraryModal
          title="Create content library"
          accounts={accounts}
          form={form}
          setForm={setForm as React.Dispatch<React.SetStateAction<typeof form>>}
          saving={creating}
          onSubmit={handleCreate}
          onClose={() => setCreateOpen(false)}
        />
      )}
    </div>
  );
}

// ── Library Detail ─────────────────────────────────────────────────────────

function LibraryDetail({
  library, accounts, items, itemsLoading, itemsHasMore,
  itemsFilter, setItemsFilter, sentinelRef,
  csvUploading, fileInputRef, settingsOpen, setSettingsOpen,
  onCsvFile, onTogglePause, onDelete, onLibraryUpdated, onError, onSuccess,
}: {
  library: Library;
  accounts: Account[];
  items: LibraryItem[];
  itemsLoading: boolean;
  itemsHasMore: boolean;
  itemsFilter: string;
  setItemsFilter: (v: string) => void;
  sentinelRef: React.RefObject<HTMLDivElement>;
  csvUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
  onCsvFile: (f: File) => void;
  onTogglePause: () => void;
  onDelete: () => void;
  onLibraryUpdated: (updated: Partial<Library> & { id: string }) => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  const linkedAccounts = accounts.filter(a => library.accountIds.includes(a.id));
  const sc = LIBRARY_STATUS[library.status];
  const total = library._count?.items ?? 0;
  const queued = library.statusCounts?.queued ?? 0;
  const published = library.statusCounts?.published ?? 0;
  const failed = library.statusCounts?.failed ?? 0;

  // Compute schedule for queued items
  const schedule = computeSchedule(items, library.timeSlots, library.timezone, library.postsPerDay);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) onCsvFile(file);
    else onError("Please drop a .csv file");
  }

  const FILTERS = ["all", "queued", "scheduled", "published", "failed", "skipped"];

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: "1px solid #1e1e1e" }}>
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold" style={{ color: "#ededed" }}>{library.name}</h2>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#111", border: "1px solid #1e1e1e" }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: sc.dot }} />
                  <span style={{ fontSize: 10, color: "#888" }}>{sc.label}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span style={{ fontSize: 11, color: "#999" }}>{library.postsPerDay} posts/day</span>
                <span style={{ fontSize: 11, color: "#555" }}>·</span>
                <span style={{ fontSize: 11, color: "#999" }}>{library.timeSlots.join(", ")}</span>
                <span style={{ fontSize: 11, color: "#555" }}>·</span>
                <span style={{ fontSize: 11, color: "#999" }}>{library.timezone}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Settings */}
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              title="Edit settings"
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 10px", borderRadius: 7,
                border: "1px solid",
                borderColor: settingsOpen ? "#3a3a5a" : "#2a2a2a",
                backgroundColor: settingsOpen ? "#18183a" : "#111",
                color: settingsOpen ? "#818cf8" : "#888",
                fontSize: 12, fontWeight: 500, cursor: "pointer",
              }}
              className="transition-colors hover:border-[#3a3a5a] hover:text-white"
            >
              <svg style={{ width: 13, height: 13 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>

            {library.status !== "exhausted" && (
              <button
                onClick={onTogglePause}
                style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #2a2a2a", backgroundColor: "#111", color: "#ededed", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                className="hover:bg-white/5 transition-colors"
              >
                {library.status === "paused" ? "Resume" : "Pause"}
              </button>
            )}
            <button
              onClick={onDelete}
              style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #3a1a1a", backgroundColor: "#1a0a0a", color: "#f87171", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
              className="hover:opacity-80 transition-opacity"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 px-5 py-2.5 shrink-0" style={{ borderBottom: "1px solid #1e1e1e" }}>
          {[
            { label: "Total", value: total, color: "#ededed" },
            { label: "Queued", value: queued, color: "#818cf8" },
            { label: "Published", value: published, color: "#22c55e" },
            { label: "Failed", value: failed, color: "#f87171" },
          ].map(s => (
            <div key={s.label} className="flex items-baseline gap-1.5">
              <span style={{ fontSize: 18, fontWeight: 700, color: s.color, fontVariantNumeric: "tabular-nums" }}>{s.value}</span>
              <span style={{ fontSize: 11, color: "#666" }}>{s.label}</span>
            </div>
          ))}

          {/* Account chips */}
          {linkedAccounts.length > 0 && (
            <div className="ml-auto flex items-center gap-1.5 flex-wrap">
              <span style={{ fontSize: 11, color: "#777" }}>To:</span>
              {linkedAccounts.slice(0, 4).map(a => (
                <span key={a.id} style={{ fontSize: 11, color: "#888", backgroundColor: "#111", border: "1px solid #1e1e1e", borderRadius: 4, padding: "1px 7px" }}>
                  {a.displayName}
                </span>
              ))}
              {linkedAccounts.length > 4 && <span style={{ fontSize: 11, color: "#444" }}>+{linkedAccounts.length - 4}</span>}
            </div>
          )}
        </div>

        {/* CSV drop zone */}
        <div
          className="mx-5 mt-3 mb-2 shrink-0"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !csvUploading && fileInputRef.current?.click()}
          style={{
            border: `1.5px dashed ${dragOver ? "#818cf8" : "#222"}`,
            borderRadius: 8,
            padding: "10px 14px",
            display: "flex", alignItems: "center", gap: 10,
            cursor: csvUploading ? "wait" : "pointer",
            backgroundColor: dragOver ? "#0d0d2a" : "#0d0d0d",
            transition: "all 0.15s",
          }}
        >
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onCsvFile(f); }} />
          <svg style={{ width: 15, height: 15, color: csvUploading ? "#818cf8" : "#444", flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {csvUploading ? (
            <p style={{ fontSize: 12, color: "#818cf8" }}>Uploading…</p>
          ) : (
            <div>
              <p style={{ fontSize: 12, color: "#aaa", fontWeight: 500 }}>Drop CSV or click to upload</p>
              <p style={{ fontSize: 11, color: "#777", marginTop: 1 }}>Columns: text, comment (opt), mediaUrls pipe-separated (opt) · max {MAX_CSV_ROWS} rows</p>
            </div>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 px-5 mb-2 shrink-0">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setItemsFilter(f)}
              style={{
                padding: "3px 9px", borderRadius: 5, fontSize: 11, fontWeight: 500, border: "1px solid",
                cursor: "pointer",
                backgroundColor: itemsFilter === f ? "#18183a" : "transparent",
                borderColor: itemsFilter === f ? "#3a3a5a" : "transparent",
                color: itemsFilter === f ? "#818cf8" : "#555",
              }}
              className="hover:text-white transition-colors capitalize"
            >
              {f}
            </button>
          ))}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {itemsLoading && items.length === 0 ? (
            <div className="flex justify-center py-10">
              <svg className="animate-spin w-4 h-4" style={{ color: "#555" }} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center">
              <p style={{ fontSize: 13, color: "#444" }}>No items{itemsFilter !== "all" ? ` with status "${itemsFilter}"` : ""}</p>
              {itemsFilter === "all" && <p style={{ fontSize: 11, color: "#333", marginTop: 4 }}>Upload a CSV above to add content</p>}
            </div>
          ) : (
            <div className="space-y-1.5">
              {items.map((item, idx) => {
                const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.queued;
                const scheduledAt = schedule.get(item.id);
                return (
                  <div
                    key={item.id}
                    style={{ backgroundColor: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 8, padding: "10px 12px" }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Order number */}
                      <span style={{ fontSize: 11, color: "#555", fontVariantNumeric: "tabular-nums", marginTop: 2, minWidth: 20, textAlign: "right" }}>#{idx + 1}</span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 13, color: "#ddd", lineHeight: 1.5 }}>
                          {item.text.length > 180 ? item.text.slice(0, 180) + "…" : item.text}
                        </p>
                        {item.commentText && (
                          <p style={{ fontSize: 11, color: "#666", borderLeft: "2px solid #1e1e1e", paddingLeft: 8, marginTop: 5 }}>
                            {item.commentText.length > 100 ? item.commentText.slice(0, 100) + "…" : item.commentText}
                          </p>
                        )}
                        {(item.mediaUrls as string[]).length > 0 && (
                          <p style={{ fontSize: 11, color: "#444", marginTop: 4 }}>
                            📎 {(item.mediaUrls as string[]).length} file{(item.mediaUrls as string[]).length > 1 ? "s" : ""}
                          </p>
                        )}
                        {item.errorMessage && (
                          <p style={{ fontSize: 11, color: "#f87171", marginTop: 4 }}>{item.errorMessage}</p>
                        )}
                      </div>

                      {/* Right column: schedule + status */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, backgroundColor: sc.bg, color: sc.text, fontWeight: 500 }}>
                          {sc.label}
                        </span>
                        {scheduledAt && item.status === "queued" && (
                          <span style={{ fontSize: 10, color: "#888", whiteSpace: "nowrap" }}>
                            🕐 {fmtSchedule(scheduledAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={sentinelRef} className="h-4 flex items-center justify-center">
                {itemsHasMore && (
                  <svg className="animate-spin w-3 h-3" style={{ color: "#444" }} fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings panel */}
      {settingsOpen && (
        <SettingsPanel
          library={library}
          accounts={accounts}
          onClose={() => setSettingsOpen(false)}
          onSaved={(updated) => onLibraryUpdated(updated)}
          onError={onError}
          onSuccess={onSuccess}
        />
      )}
    </div>
  );
}

// ── Settings Panel ─────────────────────────────────────────────────────────

function SettingsPanel({ library, accounts, onClose, onSaved, onError, onSuccess }: {
  library: Library;
  accounts: Account[];
  onClose: () => void;
  onSaved: (updated: Partial<Library> & { id: string }) => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: library.name,
    postsPerDay: library.postsPerDay,
    timeSlots: [...library.timeSlots],
    timezone: library.timezone,
    accountIds: [...library.accountIds],
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (form.accountIds.length === 0) { onError("Select at least one account"); return; }
    if (form.timeSlots.length === 0) { onError("Add at least one time slot"); return; }
    setSaving(true);
    try {
      await apiFetch(`/library/${library.id}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      onSaved({ id: library.id, ...form });
      onSuccess("Settings saved");
      onClose();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col shrink-0 overflow-y-auto" style={{ width: 280, borderLeft: "1px solid #1e1e1e", backgroundColor: "#0d0d0d" }}>
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid #1e1e1e" }}>
        <p className="text-xs font-bold" style={{ color: "#ededed" }}>Library Settings</p>
        <button onClick={onClose} style={{ color: "#555", background: "none", border: "none", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
      </div>

      <form onSubmit={handleSave} className="flex flex-col flex-1 p-4 gap-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#888" }}>Name</label>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            style={{ width: "100%", backgroundColor: "#111", border: "1px solid #2a2a2a", borderRadius: 7, padding: "7px 10px", fontSize: 12, color: "#ededed", outline: "none" }}
          />
        </div>

        {/* Posts per day */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#888" }}>Posts per day</label>
          <input
            type="number" min={1} max={50}
            value={form.postsPerDay}
            onChange={e => setForm(f => ({ ...f, postsPerDay: Number(e.target.value) }))}
            style={{ width: "100%", backgroundColor: "#111", border: "1px solid #2a2a2a", borderRadius: 7, padding: "7px 10px", fontSize: 12, color: "#ededed", outline: "none" }}
          />
        </div>

        {/* Time slots */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#888" }}>Time slots</label>
          <div className="space-y-2">
            {form.timeSlots.map((slot, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="time"
                  value={slot}
                  onChange={e => setForm(f => ({ ...f, timeSlots: f.timeSlots.map((s, idx) => idx === i ? e.target.value : s) }))}
                  style={{ flex: 1, backgroundColor: "#111", border: "1px solid #2a2a2a", borderRadius: 7, padding: "6px 8px", fontSize: 12, color: "#ededed", outline: "none" }}
                />
                {form.timeSlots.length > 1 && (
                  <button type="button" onClick={() => setForm(f => ({ ...f, timeSlots: f.timeSlots.filter((_, idx) => idx !== i) }))}
                    style={{ color: "#555", background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>×</button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setForm(f => ({ ...f, timeSlots: [...f.timeSlots, "12:00"] }))}
              className="text-xs hover:text-white transition-colors" style={{ color: "#555" }}>
              + Add time slot
            </button>
          </div>
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#888" }}>Timezone</label>
          <input
            value={form.timezone}
            onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
            style={{ width: "100%", backgroundColor: "#111", border: "1px solid #2a2a2a", borderRadius: 7, padding: "7px 10px", fontSize: 12, color: "#ededed", outline: "none" }}
          />
        </div>

        {/* Accounts */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#888" }}>Post to accounts</label>
          {accounts.length === 0 ? (
            <p className="text-xs" style={{ color: "#555" }}>No accounts connected.</p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {accounts.map(a => {
                const checked = form.accountIds.includes(a.id);
                return (
                  <label key={a.id} className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 hover:bg-white/5 transition-colors">
                    <input
                      type="checkbox" checked={checked}
                      onChange={() => setForm(f => ({
                        ...f,
                        accountIds: checked ? f.accountIds.filter(id => id !== a.id) : [...f.accountIds, a.id],
                      }))}
                      style={{ accentColor: "#818cf8" }}
                    />
                    <span style={{ fontSize: 12, color: "#ccc" }}>{a.displayName}</span>
                    <span style={{ fontSize: 10, color: "#444", marginLeft: "auto" }}>{a.platform}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{ marginTop: "auto", padding: "8px", borderRadius: 8, fontSize: 13, fontWeight: 600, backgroundColor: "#fff", color: "#0a0a0a", border: "none", cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}

// ── Create / Edit Modal ────────────────────────────────────────────────────

function LibraryModal({ title, accounts, form, setForm, saving, onSubmit, onClose }: {
  title: string;
  accounts: Account[];
  form: { name: string; postsPerDay: number; timeSlots: string[]; timezone: string; accountIds: string[] };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.8)" }}>
      <div className="w-full max-w-sm rounded-2xl p-5 overflow-y-auto max-h-[90vh]" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }}>
        <h2 className="text-sm font-bold mb-4" style={{ color: "#ededed" }}>{title}</h2>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#888" }}>Library name</label>
            <input autoFocus required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. HTM Facebook Posts"
              style={{ width: "100%", backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 7, padding: "7px 10px", fontSize: 12, color: "#ededed", outline: "none" }} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#888" }}>Posts per day</label>
            <input type="number" min={1} max={50} required value={form.postsPerDay} onChange={e => setForm(f => ({ ...f, postsPerDay: Number(e.target.value) }))}
              style={{ width: "100%", backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 7, padding: "7px 10px", fontSize: 12, color: "#ededed", outline: "none" }} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#888" }}>Time slots</label>
            <div className="space-y-2">
              {form.timeSlots.map((slot, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="time" value={slot} onChange={e => setForm(f => ({ ...f, timeSlots: f.timeSlots.map((s, idx) => idx === i ? e.target.value : s) }))}
                    style={{ flex: 1, backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 7, padding: "6px 8px", fontSize: 12, color: "#ededed", outline: "none" }} />
                  {form.timeSlots.length > 1 && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, timeSlots: f.timeSlots.filter((_, idx) => idx !== i) }))}
                      style={{ color: "#555", background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>×</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setForm(f => ({ ...f, timeSlots: [...f.timeSlots, "12:00"] }))}
                className="text-xs hover:text-white transition-colors" style={{ color: "#555" }}>+ Add slot</button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#888" }}>Timezone</label>
            <input value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))} placeholder="UTC"
              style={{ width: "100%", backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 7, padding: "7px 10px", fontSize: 12, color: "#ededed", outline: "none" }} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#888" }}>Accounts</label>
            {accounts.length === 0 ? (
              <p className="text-xs" style={{ color: "#555" }}>No accounts. <a href="/accounts" style={{ color: "#818cf8" }}>Connect one first.</a></p>
            ) : (
              <div className="space-y-1 max-h-36 overflow-y-auto rounded-lg p-1" style={{ backgroundColor: "#0a0a0a", border: "1px solid #1e1e1e" }}>
                {accounts.map(a => {
                  const checked = form.accountIds.includes(a.id);
                  return (
                    <label key={a.id} className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 hover:bg-white/5 transition-colors">
                      <input type="checkbox" checked={checked}
                        onChange={() => setForm(f => ({ ...f, accountIds: checked ? f.accountIds.filter(id => id !== a.id) : [...f.accountIds, a.id] }))}
                        style={{ accentColor: "#818cf8" }} />
                      <span style={{ fontSize: 12, color: "#ccc" }}>{a.displayName}</span>
                      <span style={{ fontSize: 10, color: "#444", marginLeft: "auto" }}>{a.platform}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: "#1a1a1a", color: "#ededed", border: "1px solid #2a2a2a", cursor: "pointer" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 1, padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: "#fff", color: "#0a0a0a", border: "none", cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving…" : "Create library"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
