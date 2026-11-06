"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { apiFetch } from "../../lib/api";
import { useToast } from "../../components/Toast";
import { PlatformIcon } from "../../components/PlatformIcon";
import { TimeInput24 } from "../../components/TimeInput24";
import { APP_TIMEZONE, formatDate, formatTime } from "../../lib/datetime";
import { cn } from "../../lib/cn";
import { PLATFORM_COLOR } from "../../components/PlatformPreview";

// ── Types ──────────────────────────────────────────────────────────────────

interface Account {
  id: string;
  platform: string;
  displayName: string;
  avatarUrl: string | null;
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

const STATUS_COLORS: Record<string, { tone: string; label: string }> = {
  queued:    { tone: "bg-brand-100 text-brand-800",   label: "Queued" },
  scheduled: { tone: "bg-blue-50 text-blue-700",      label: "Scheduled" },
  published: { tone: "bg-green-50 text-green-700",    label: "Published" },
  skipped:   { tone: "bg-neutral-100 text-muted",     label: "Skipped" },
  failed:    { tone: "bg-red-50 text-red-600",        label: "Failed" },
};

const LIBRARY_STATUS: Record<string, { dot: string; label: string }> = {
  active:    { dot: "bg-green-500",   label: "Active" },
  paused:    { dot: "bg-brand-600",   label: "Paused" },
  exhausted: { dot: "bg-neutral-400", label: "Exhausted" },
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
  const time = formatTime(d);
  if (diffDays === 0) return `Today ${time}`;
  if (diffDays === 1) return `Tomorrow ${time}`;
  if (diffDays < 7) return `${formatDate(d, { weekday: "short" })} ${time}`;
  return `${formatDate(d)} ${time}`;
}

// ── Guide section component ────────────────────────────────────────────────

function GuideSection({ step, title, tone, description, code, rule, states }: {
  step: string; title: string; /** bg + text + border classes */ tone: string; description: string;
  code?: string; rule?: string;
  states?: { label: string; /** bg + text classes */ tone: string; desc: string }[];
}) {
  return (
    <div className="flex gap-3">
      <div className={cn("shrink-0 size-6 rounded-full flex items-center justify-center border type-body-sb-xs", tone)}>
        {step}
      </div>
      <div className="flex-1 min-w-0">
        <p className="type-body-sb-s mb-1 text-fg">{title}</p>
        <p className="type-body-r-xs text-muted">{description}</p>
        {code && (
          <pre className="mt-2 rounded-lg overflow-x-auto p-3 border border-border bg-bg type-mono-r-xs text-fg">{code}</pre>
        )}
        {rule && (
          <div className="mt-2 px-3 py-2 rounded-lg border border-brand-400 bg-brand-100 type-body-r-xs text-brand-800">
            ⚡ {rule}
          </div>
        )}
        {states && (
          <div className="mt-2 flex flex-col gap-1.5">
            {states.map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <span className={cn("px-2 py-0.5 rounded-full type-body-m-xs", s.tone)}>{s.label}</span>
                <span className="type-body-r-xs text-muted">{s.desc}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const AI_PROMPT = `Generate a CSV file for a Posthive social media content library.

STRICT CSV FORMAT RULES:
- First row must be exactly: text,comment,mediaUrls
- "text" column is REQUIRED — the main post content (max 5000 chars)
- "comment" column is optional — a first comment posted right after the post (leave blank if none)
- "mediaUrls" column is optional — pipe-separated ( | ) public image/video URLs (leave blank if none)
- Always wrap cell values in double quotes, especially if they contain commas or newlines
- Escape a literal double quote inside a value by doubling it: ""like this""
- No extra columns, no headers other than the first row, no markdown, no explanation — output ONLY the raw CSV
- Maximum 500 rows per upload
- ⚠️ mediaUrls must be publicly accessible without authentication — Google Drive, Google Photos, and similar links require sign-in and WILL FAIL when the platform tries to fetch the image. Use a public CDN, Imgur, Cloudinary, S3 public URL, or upload via Posthive's upload first.

EXAMPLE OUTPUT (copy the exact format):
text,comment,mediaUrls
"Your first post content here 🚀","First comment text here","https://example.com/image1.jpg|https://example.com/image2.jpg"
"Second post — no comment or media","",""
"Third post with just a comment","This is the first comment",""

Now generate [NUMBER] posts about [TOPIC].
Style: [e.g. educational / motivational / storytelling / product launch]
Tone: [e.g. casual / professional / witty]
Each post should be unique, platform-appropriate, and end with a call-to-action or question.`;

function AiPromptSection() {
  const [copied, setCopied] = React.useState(false);
  function copy() {
    navigator.clipboard.writeText(AI_PROMPT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div className="rounded-xl border border-brand-300 bg-bg px-4 py-3.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="type-body-sb-xs text-brand-800">✦ Generate CSV with AI</span>
        </div>
        <button
          onClick={copy}
          className={cn("px-2.5 py-1 rounded-md border type-body-r-xs transition-colors cursor-pointer",
            copied ? "border-green-200 bg-green-50 text-green-700" : "border-brand-300 bg-brand-100 text-brand-800")}
        >
          {copied ? "Copied!" : "Copy prompt"}
        </button>
      </div>
      <p className="type-body-r-xs mb-2 text-muted">
        Paste into Claude, ChatGPT, or any AI. Fill in <span className="text-brand-800">[NUMBER]</span>, <span className="text-brand-800">[TOPIC]</span>, <span className="text-brand-800">[Style]</span> and <span className="text-brand-800">[Tone]</span>. Save the AI output as <span className="text-brand-800">posts.csv</span>, then upload here.
      </p>
      <pre className="rounded-lg p-3 overflow-x-auto border border-border bg-surface type-mono-r-xs text-fg whitespace-pre-wrap wrap-break-word">
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
  const [planLimits, setPlanLimits] = useState({ maxDripPerDay: 50, maxLibraries: 999, maxLibraryItems: 999999 });

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    postsPerDay: 1,
    timeSlots: ["09:00"],
    timezone: APP_TIMEZONE,
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
      const data = await apiFetch<{ libraries: Library[]; planLimits: typeof planLimits }>("/library");
      setLibraries(data.libraries);
      setPlanLimits(data.planLimits);
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
      setForm({ name: "", postsPerDay: 1, timeSlots: ["09:00"], timezone: APP_TIMEZONE, accountIds: [] });
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
    <div className="flex h-full flex-col md:flex-row bg-bg text-fg">

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-sm p-6">
            <h3 className="type-body-sb-m mb-2 text-fg">Delete library</h3>
            <p className="type-body-r-s mb-6 text-muted">
              Delete <span className="text-fg">"{deleteTarget.name}"</span> and all{" "}
              <span className="text-fg">{deleteTarget._count?.items ?? 0} items</span>? This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteLibrary}
                disabled={deleting}
                className="btn-danger"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guide modal */}
      {guideOpen && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setGuideOpen(false)}>
          <div className="card w-full max-w-lg max-h-[90vh] overflow-x-hidden overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="type-body-sb-s text-fg">Content Library - How it works</h2>
                <p className="type-body-r-xs mt-0.5 text-muted">Drip-schedule your content automatically</p>
              </div>
              <button onClick={() => setGuideOpen(false)} className="type-body-r-l text-muted cursor-pointer transition-colors hover:text-fg">✕</button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-6">
              {/* What is it */}
              <GuideSection
                step="1"
                title="What is Content Library?"
                tone="bg-brand-100 text-brand-800 border-brand-300"
                description="A Content Library is a queue of posts that drip out automatically on a schedule like a content calendar that runs itself. Upload your posts once, set a daily schedule, and Posthive fires them one by one without you touching anything."
              />

              {/* Upload CSV */}
              <GuideSection
                step="2"
                title="Upload posts via CSV"
                tone="bg-blue-50 text-blue-700 border-blue-200"
                description='Each row = one post. Required column: "text" (main post, max 5000 chars). Optional: "comment" (first comment posted after the post) and "mediaUrls" (pipe-separated "|" public image/video URLs — must be publicly accessible; Google Drive/Photos links require sign-in and will fail). Always wrap values in double quotes. Escape a literal quote by doubling it: ""like this"".'
                code={`text,comment,mediaUrls\n"Your first post 🚀","First comment here","https://cdn.example.com/img1.jpg|https://cdn.example.com/img2.jpg"\n"Second post — no media or comment","",""\n"Post with a comment only","Great thread below!",""`}
              />

              {/* Time slots */}
              <GuideSection
                step="3"
                title="Set your daily time slots"
                tone="bg-green-50 text-green-700 border-green-200"
                description="Add one or more times of day (e.g. 09:00, 13:00, 18:00). Each slot fires one post per day. With 3 slots → 3 posts/day. Posts Per Day caps how many slots are used if you add more slots than needed."
                rule="Posts per day = min(postsPerDay setting, number of time slots)"
              />

              {/* How drip works */}
              <GuideSection
                step="4"
                title="How posts are drip-scheduled"
                tone="bg-brand-100 text-brand-800 border-brand-400"
                description="Every 5 minutes, Posthive checks which time slots fall in the next 5 minutes. For each matching slot, it picks the next Queued post in order and schedules it. Posts move through these states:"
                states={[
                  { label: "Queued", tone: STATUS_COLORS.queued.tone, desc: "Waiting to be scheduled" },
                  { label: "Scheduled", tone: STATUS_COLORS.scheduled.tone, desc: "BullMQ job created, will fire at slot time" },
                  { label: "Published", tone: STATUS_COLORS.published.tone, desc: "Posted successfully to all platforms" },
                  { label: "Failed", tone: STATUS_COLORS.failed.tone, desc: "One or more platforms failed" },
                ]}
              />

              {/* Rules */}
              <div className="rounded-xl border border-border bg-bg px-4 py-3.5">
                <p className="section-label mb-3">Rules & limits</p>
                <ul className="flex flex-col gap-2">
                  {[
                    "Posts fire in order item #1 first, then #2, etc.",
                    "Changing time slots takes effect within 5 minutes.",
                    "Last-minute slot changes (< 5 min before) may miss that slot plan ahead.",
                    "Deleting a library cancels all scheduled posts for it.",
                    "Pausing stops new posts from being scheduled; existing scheduled posts still fire.",
                    "When all items are posted, the library becomes Exhausted upload more to resume.",
                    "Max 500 rows per CSV upload.",
                  ].map((rule, i) => (
                    <li key={i} className="type-body-r-xs pl-0.5 text-muted">
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
                className="btn-primary w-full"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left panel — full width on mobile, 260px sidebar on desktop. Hidden on mobile when a library is selected. */}
      <div className={`flex flex-col shrink-0 w-full flex-1 md:w-75 md:flex-none border-r border-border bg-surface ${selectedId ? "hidden md:flex" : "flex"}`}>
        <div className="flex items-center justify-between px-4 py-3 shrink-0 pl-14 md:pl-4 border-b border-border">
          <div>
            <p className="type-body-sb-xs tracking-wide text-fg">Content Library</p>
            <p className="type-body-r-xs text-muted">Drip-schedule your content</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setGuideOpen(true)}
              title="How it works"
              className="flex size-6.5 items-center justify-center rounded-md border border-brand-300 bg-brand-100 type-body-sb-xs text-brand-800 cursor-pointer transition-colors hover:border-brand-400 hover:bg-brand-200"
            >
              ?
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              className="btn-primary gap-1 rounded-md px-2.5 py-1 type-body-sb-xs"
            >
              <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              New
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="flex justify-center py-10">
              <svg className="animate-spin w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : libraries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
              <p className="type-body-m-xs text-muted">No libraries yet</p>
              <button onClick={() => setCreateOpen(true)} className="mt-3 type-body-r-xs text-brand-800 cursor-pointer hover:opacity-80 transition-opacity">
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
                  className={cn("w-full text-left transition-colors px-3.5 py-2 border-l-2 cursor-pointer",
                    isActive ? "bg-brand-100 border-accent" : "border-transparent")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("type-body-sb-xs truncate", isActive ? "text-brand-800" : "text-fg")}>{lib.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <div className={cn("size-1.5 rounded-full", sc.dot)} />
                      <span className="type-body-r-xxs text-muted">{sc.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="type-body-r-xs text-muted">{lib._count?.items ?? 0} items</span>
                    {queued > 0 && <span className="type-body-r-xs text-brand-800">{queued} queued</span>}
                    <span className="type-body-r-xs text-muted">{lib.postsPerDay}/day</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel — hidden on mobile when nothing selected; full-width on mobile when selected */}
      {!selected ? (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-3 text-neutral-300">
          <svg className="size-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="type-body-r-s text-neutral-500">Select a library</p>
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
          maxDripPerDay={planLimits.maxDripPerDay}
          onBack={() => setSelectedId(null)}
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
          maxDripPerDay={planLimits.maxDripPerDay}
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
  onCsvFile, onTogglePause, onDelete, onLibraryUpdated, onError, onSuccess, maxDripPerDay = 50, onBack,
}: {
  library: Library;
  accounts: Account[];
  items: LibraryItem[];
  itemsLoading: boolean;
  itemsHasMore: boolean;
  itemsFilter: string;
  setItemsFilter: (v: string) => void;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  csvUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
  onCsvFile: (f: File) => void;
  onTogglePause: () => void;
  onDelete: () => void;
  onLibraryUpdated: (updated: Partial<Library> & { id: string }) => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
  maxDripPerDay?: number;
  onBack?: () => void;
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
        <div className="flex items-center justify-between gap-2 px-4 py-3 shrink-0 flex-wrap border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            {/* Back button — mobile only */}
            {onBack && (
              <button
                onClick={onBack}
                className="md:hidden shrink-0 flex items-center justify-center size-7 rounded-lg border border-border bg-surface text-muted transition-colors hover:bg-neutral-100"
              >
                <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="type-body-sb-s truncate text-fg">{library.name}</h2>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-border bg-surface">
                  <div className={cn("size-1.5 rounded-full", sc.dot)} />
                  <span className="type-body-r-xxs text-muted">{sc.label}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <span className="type-body-r-xs text-muted">{library.postsPerDay} posts/day</span>
                <span className="type-body-r-xs text-neutral-500">·</span>
                <span className="type-body-r-xs text-muted truncate max-w-30 md:max-w-none">{library.timeSlots.join(", ")}</span>
                <span className="type-body-r-xs text-neutral-500">·</span>
                <span className="type-body-r-xs text-muted truncate max-w-25 md:max-w-none">{library.timezone}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            {/* Settings */}
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              title="Edit settings"
              className={cn("chip type-body-m-xs", settingsOpen && "chip-active")}
            >
              <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>

            {library.status !== "exhausted" && (
              <button
                onClick={onTogglePause}
                className="btn-secondary rounded-md px-2.5 py-1 type-body-m-xs"
              >
                {library.status === "paused" ? "Resume" : "Pause"}
              </button>
            )}
            <button
              onClick={onDelete}
              className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 type-body-m-xs text-red-600 cursor-pointer transition-colors hover:bg-red-100"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 px-4 py-2.5 shrink-0 overflow-x-auto border-b border-border">
          {[
            { label: "Total", value: total, tone: "text-fg" },
            { label: "Queued", value: queued, tone: "text-brand-800" },
            { label: "Published", value: published, tone: "text-green-700" },
            { label: "Failed", value: failed, tone: "text-red-600" },
          ].map(s => (
            <div key={s.label} className="flex items-baseline gap-1.5">
              <span className={cn("type-body-sb-l tabular-nums", s.tone)}>{s.value}</span>
              <span className="type-body-r-xs text-muted">{s.label}</span>
            </div>
          ))}

          {/* Account chips */}
          {linkedAccounts.length > 0 && (
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              <span className="type-body-r-xs text-muted">To:</span>
              {linkedAccounts.slice(0, 4).map(a => (
                <span key={a.id} className="rounded-sm border border-border bg-surface px-2 py-0.5 type-body-r-xs text-muted">
                  {a.displayName}
                </span>
              ))}
              {linkedAccounts.length > 4 && <span className="type-body-r-xs text-neutral-500">+{linkedAccounts.length - 4}</span>}
            </div>
          )}
        </div>

        {/* CSV drop zone */}
        <div
          className={cn("dropzone mx-4 mt-3 mb-2 shrink-0 flex items-center gap-2.5 rounded-lg px-3.5 py-2.5",
            csvUploading ? "cursor-wait" : "cursor-pointer",
            dragOver ? "border-accent bg-brand-100" : !csvUploading && "hover:border-neutral-300")}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !csvUploading && fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onCsvFile(f); }} />
          <svg className={cn("size-4 shrink-0", csvUploading ? "text-brand-800" : "text-neutral-500")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {csvUploading ? (
            <p className="type-body-r-xs text-brand-800">Uploading…</p>
          ) : (
            <div>
              <p className="type-body-m-xs text-fg">Drop CSV or click to upload</p>
              <p className="type-body-r-xs text-muted">Columns: text, comment (opt), mediaUrls pipe-separated (opt) · max {MAX_CSV_ROWS} rows</p>
            </div>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 px-4 mb-2 shrink-0 overflow-x-auto">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setItemsFilter(f)}
              className={cn("chip type-body-m-xs capitalize", itemsFilter === f && "chip-active")}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {itemsLoading && items.length === 0 ? (
            <div className="flex justify-center py-10">
              <svg className="animate-spin w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center">
              <p className="type-body-r-s text-neutral-500">No items{itemsFilter !== "all" ? ` with status "${itemsFilter}"` : ""}</p>
              {itemsFilter === "all" && <p className="type-body-r-xs mt-1 text-neutral-500">Upload a CSV above to add content</p>}
            </div>
          ) : (
            <div className="space-y-1.5">
              {items.map((item, idx) => {
                const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.queued;
                const scheduledAt = schedule.get(item.id);
                return (
                  <div
                    key={item.id}
                    className="card rounded-lg px-3 py-2.5"
                  >
                    <div className="flex items-start gap-3">
                      {/* Order number */}
                      <span className="type-body-r-xs tabular-nums mt-0.5 min-w-5 text-right text-neutral-500">#{idx + 1}</span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="type-body-r-s text-fg">
                          {item.text.length > 180 ? item.text.slice(0, 180) + "…" : item.text}
                        </p>
                        {item.commentText && (
                          <p className="type-body-r-xs mt-1 border-l-2 border-border pl-2 text-muted">
                            {item.commentText.length > 100 ? item.commentText.slice(0, 100) + "…" : item.commentText}
                          </p>
                        )}
                        {(item.mediaUrls as string[]).length > 0 && (
                          <p className="type-body-r-xs mt-1 text-muted">
                            📎 {(item.mediaUrls as string[]).length} file{(item.mediaUrls as string[]).length > 1 ? "s" : ""}
                          </p>
                        )}
                        {item.errorMessage && (
                          <p className="type-body-r-xs mt-1 text-red-600">{item.errorMessage}</p>
                        )}
                      </div>

                      {/* Right column: schedule + status */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={cn("rounded-sm px-2 py-0.5 type-body-m-xs", sc.tone)}>
                          {sc.label}
                        </span>
                        {scheduledAt && item.status === "queued" && (
                          <span className="type-body-r-xxs whitespace-nowrap text-muted">
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
                  <svg className="animate-spin w-3 h-3 text-neutral-500" fill="none" viewBox="0 0 24 24">
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
          maxDripPerDay={maxDripPerDay}
        />
      )}
    </div>
  );
}

// ── Settings Panel ─────────────────────────────────────────────────────────

function SettingsPanel({ library, accounts, onClose, onSaved, onError, onSuccess, maxDripPerDay = 50 }: {
  library: Library;
  accounts: Account[];
  onClose: () => void;
  onSaved: (updated: Partial<Library> & { id: string }) => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
  maxDripPerDay?: number;
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
    <div className="flex flex-col shrink-0 overflow-y-auto fixed inset-0 z-40 md:static md:inset-auto md:z-auto w-full max-w-full md:w-70 md:max-w-70 border-l border-border bg-surface">
      <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-border">
        <p className="type-body-sb-xs text-fg">Library Settings</p>
        <button onClick={onClose} className="type-body-r-l text-muted cursor-pointer">×</button>
      </div>

      <form onSubmit={handleSave} className="flex flex-col flex-1 p-4 gap-4">
        {/* Name */}
        <div>
          <label className="block type-body-m-xs mb-1.5 text-muted">Name</label>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="field rounded-lg px-2.5 type-body-r-xs"
          />
        </div>

        {/* Posts per day */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="type-body-m-xs text-muted">Posts per day</label>
            <span className="type-body-r-xs text-neutral-500">max {maxDripPerDay}</span>
          </div>
          <input
            type="number" min={1} max={maxDripPerDay}
            value={form.postsPerDay}
            onChange={e => setForm(f => ({ ...f, postsPerDay: Math.min(Number(e.target.value), maxDripPerDay) }))}
            className="field rounded-lg px-2.5 type-body-r-xs"
          />
        </div>

        {/* Time slots */}
        <div>
          <label className="block type-body-m-xs mb-1.5 text-muted">Time slots</label>
          <div className="space-y-2">
            {form.timeSlots.map((slot, i) => (
              <div key={i} className="flex items-center gap-2">
                <TimeInput24
                  value={slot}
                  onChange={v => setForm(f => ({ ...f, timeSlots: f.timeSlots.map((s, idx) => idx === i ? v : s) }))}
                  className="flex-1"
                />
                {form.timeSlots.length > 1 && (
                  <button type="button" onClick={() => setForm(f => ({ ...f, timeSlots: f.timeSlots.filter((_, idx) => idx !== i) }))}
                    className="type-body-r-m text-muted cursor-pointer">×</button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setForm(f => ({ ...f, timeSlots: [...f.timeSlots, "12:00"] }))}
              className="type-body-r-xs text-muted cursor-pointer transition-colors hover:text-fg">
              + Add time slot
            </button>
          </div>
        </div>

        {/* Timezone */}
        <div>
          <label className="block type-body-m-xs mb-1.5 text-muted">Timezone</label>
          <input
            value={form.timezone}
            onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
            className="field rounded-lg px-2.5 type-body-r-xs"
          />
        </div>

        {/* Accounts */}
        <div>
          <label className="block type-body-m-xs mb-1.5 text-muted">Post to accounts</label>
          {accounts.length === 0 ? (
            <p className="type-body-r-xs text-muted">No accounts connected.</p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {accounts.map(a => {
                const checked = form.accountIds.includes(a.id);
                return (
                  <label key={a.id} className="flex items-center gap-2 cursor-pointer rounded-sm px-2 py-1.5 hover:bg-neutral-100 transition-colors">
                    <input
                      type="checkbox" checked={checked}
                      onChange={() => setForm(f => ({
                        ...f,
                        accountIds: checked ? f.accountIds.filter(id => id !== a.id) : [...f.accountIds, a.id],
                      }))}
                      className="accent-brand-600"
                    />
                    <span className="type-body-r-xs text-fg">{a.displayName}</span>
                    <span className="type-body-r-xxs ml-auto text-muted">{a.platform}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary mt-auto rounded-lg"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}

// ── Create / Edit Modal ────────────────────────────────────────────────────

function LibraryModal({ title, accounts, form, setForm, saving, onSubmit, onClose, maxDripPerDay = 50 }: {
  title: string;
  accounts: Account[];
  form: { name: string; postsPerDay: number; timeSlots: string[]; timezone: string; accountIds: string[] };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  maxDripPerDay?: number;
}) {
  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card w-full max-w-md flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0 border-b border-border">
          <div>
            <h2 className="type-body-sb-s text-fg">{title}</h2>
            <p className="type-body-r-xs mt-0.5 text-muted">Configure drip schedule and target accounts</p>
          </div>
          <button onClick={onClose} className="p-1 leading-none text-muted cursor-pointer transition-colors hover:text-fg">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

            {/* Library name */}
            <div>
              <label className="block mb-1.5 type-body-r-xs text-muted">Library name</label>
              <input autoFocus required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Facebook Motivational Posts"
                className="field rounded-lg" />
            </div>

            {/* Posts per day + Time slots side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block type-body-r-xs text-muted">Posts per day</label>
                  <span className="type-body-r-xs text-neutral-500">max {maxDripPerDay}</span>
                </div>
                <input type="number" min={1} max={maxDripPerDay} required value={form.postsPerDay}
                  onChange={e => setForm(f => ({ ...f, postsPerDay: Math.min(Number(e.target.value), maxDripPerDay) }))}
                  className="field rounded-lg" />
              </div>
              <div>
                <label className="block mb-1.5 type-body-r-xs text-muted">Timezone</label>
                <input value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))} placeholder="UTC"
                  className="field rounded-lg" />
              </div>
            </div>

            {/* Time slots */}
            <div>
              <label className="block mb-1.5 type-body-r-xs text-muted">Time slots</label>
              <div className="space-y-2">
                {form.timeSlots.map((slot, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <TimeInput24 value={slot}
                      onChange={v => setForm(f => ({ ...f, timeSlots: f.timeSlots.map((s, idx) => idx === i ? v : s) }))}
                      className="flex-1" />
                    {form.timeSlots.length > 1 && (
                      <button type="button"
                        onClick={() => setForm(f => ({ ...f, timeSlots: f.timeSlots.filter((_, idx) => idx !== i) }))}
                        className="px-2 py-1 type-body-r-l text-muted cursor-pointer transition-colors hover:text-fg">×</button>
                    )}
                  </div>
                ))}
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, timeSlots: [...f.timeSlots, "12:00"] }))}
                  className="type-body-r-xs text-brand-800 cursor-pointer transition-opacity hover:opacity-80">
                  + Add slot
                </button>
              </div>
            </div>

            {/* Accounts */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block type-body-r-xs text-muted">Accounts</label>
                {form.accountIds.length > 0 && (
                  <span className="type-body-r-xs text-brand-800">{form.accountIds.length} selected</span>
                )}
              </div>
              {accounts.length === 0 ? (
                <p className="type-body-r-xs text-muted">No accounts. <a href="/accounts" className="text-brand-800">Connect one first.</a></p>
              ) : (
                <div className="space-y-1.5">
                  {accounts.map(a => {
                    const checked = form.accountIds.includes(a.id);
                    const color = PLATFORM_COLOR[a.platform] ?? "#6b7280";
                    const platformLabel = a.platform.charAt(0).toUpperCase() + a.platform.slice(1);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, accountIds: checked ? f.accountIds.filter(id => id !== a.id) : [...f.accountIds, a.id] }))}
                        className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left cursor-pointer",
                          checked ? "border-(color:--brand)/25 bg-(color:--brand)/7" : "border-border bg-bg")}
                        style={{ "--brand": color } as React.CSSProperties}
                      >
                        {/* Avatar with platform badge */}
                        <div className="relative shrink-0">
                          {a.avatarUrl
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={a.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                            : (
                              <div className="w-8 h-8 rounded-full flex items-center justify-center border border-(color:--brand)/19 bg-(color:--brand)/12">
                                <PlatformIcon platform={a.platform} size={16} />
                              </div>
                            )}
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border border-border bg-bg">
                            <PlatformIcon platform={a.platform} size={10} />
                          </div>
                        </div>
                        {/* Name + platform */}
                        <div className="flex-1 min-w-0">
                          <p className="type-body-m-s truncate text-fg">{a.displayName}</p>
                          <p className={cn("type-body-r-xs", checked ? "text-(color:--brand)" : "text-muted")}>{platformLabel}</p>
                        </div>
                        {/* Checkmark */}
                        {checked && (
                          <svg className="w-4 h-4 shrink-0 text-(color:--brand)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-2 px-5 py-4 shrink-0 border-t border-border">
            <button type="button" onClick={onClose}
              className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="btn-primary flex-1">
              {saving ? "Saving…" : "Create library"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
