"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { apiFetch } from "../../lib/api";
import { useToast } from "../../components/Toast";
import { useRouter } from "next/navigation";

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

const LIBRARY_STATUS_COLORS: Record<string, { dot: string; label: string }> = {
  active:    { dot: "#22c55e", label: "Active" },
  paused:    { dot: "#f59e0b", label: "Paused" },
  exhausted: { dot: "#888",    label: "Exhausted" },
};

// ── Main Page ──────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const { success, error } = useToast();
  const router = useRouter();

  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Selected library for detail view
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = libraries.find(l => l.id === selectedId) ?? null;

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    postsPerDay: 1,
    timeSlots: ["09:00"],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    accountIds: [] as string[],
  });

  // Items panel
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsNextCursor, setItemsNextCursor] = useState<string | null>(null);
  const [itemsHasMore, setItemsHasMore] = useState(false);
  const [itemsFilter, setItemsFilter] = useState<string>("all");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreItems = useRef(false);

  // CSV upload
  const [csvUploading, setCsvUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function loadAccounts() {
    try {
      const data = await apiFetch<Account[]>("/accounts");
      setAccounts(data);
    } catch { /* silent */ }
  }

  useEffect(() => {
    loadLibraries();
    loadAccounts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Items ────────────────────────────────────────────────────────────────

  const loadItems = useCallback(async (libraryId: string, cursor?: string) => {
    if (!cursor) {
      setItemsLoading(true);
      setItems([]);
    }
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
    } catch {
      /* silent */
    } finally {
      setItemsLoading(false);
      loadingMoreItems.current = false;
    }
  }, [itemsFilter]);

  useEffect(() => {
    if (selectedId) {
      setItemsNextCursor(null);
      setItemsHasMore(false);
      loadItems(selectedId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, itemsFilter]);

  // Infinite scroll for items
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

  // ── Create library ───────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (form.accountIds.length === 0) { error("Select at least one account"); return; }
    if (form.timeSlots.length === 0) { error("Add at least one time slot"); return; }
    setCreating(true);
    try {
      const lib = await apiFetch<Library>("/library", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setLibraries(prev => [lib, ...prev]);
      setCreateOpen(false);
      setForm({ name: "", postsPerDay: 1, timeSlots: ["09:00"], timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", accountIds: [] });
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
      await apiFetch(`/library/${lib.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setLibraries(prev => prev.map(l => l.id === lib.id ? { ...l, status: newStatus } : l));
      success(newStatus === "paused" ? "Library paused" : "Library resumed");
    } catch (e) {
      error(e instanceof Error ? e.message : "Failed to update");
    }
  }

  // ── Delete library ───────────────────────────────────────────────────────

  async function deleteLibrary(lib: Library) {
    if (!confirm(`Delete "${lib.name}" and all its items? This cannot be undone.`)) return;
    try {
      await apiFetch(`/library/${lib.id}`, { method: "DELETE" });
      setLibraries(prev => prev.filter(l => l.id !== lib.id));
      if (selectedId === lib.id) setSelectedId(null);
      success("Library deleted");
    } catch (e) {
      error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  // ── CSV Upload ───────────────────────────────────────────────────────────

  async function handleCsvFile(file: File) {
    if (!selectedId) return;
    const text = await file.text();
    const lines = text.split("\n").filter(l => l.trim());
    const dataLines = lines.slice(1); // strip header
    if (dataLines.length === 0) { error("CSV is empty"); return; }
    if (dataLines.length > MAX_CSV_ROWS) {
      error(`CSV has ${dataLines.length} rows — maximum is ${MAX_CSV_ROWS}. Split into smaller files.`);
      return;
    }

    // Parse: text,comment,mediaUrl1|mediaUrl2
    const parsed: { text: string; commentText?: string; mediaUrls: string[] }[] = [];
    const parseErrors: string[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const row = dataLines[i].trim();
      if (!row) continue;
      // CSV-aware split respecting quotes
      const cols = parseCSVRow(row);
      const textVal = (cols[0] ?? "").trim().replace(/^"|"$/g, "");
      const commentVal = (cols[1] ?? "").trim().replace(/^"|"$/g, "");
      const mediaRaw = (cols[2] ?? "").trim().replace(/^"|"$/g, "");
      const mediaUrls = mediaRaw ? mediaRaw.split("|").map(u => u.trim()).filter(Boolean) : [];

      if (!textVal) {
        parseErrors.push(`Row ${i + 2}: text is required`);
        continue;
      }
      if (textVal.length > 5000) {
        parseErrors.push(`Row ${i + 2}: text too long (max 5000 chars)`);
        continue;
      }
      parsed.push({ text: textVal, commentText: commentVal || undefined, mediaUrls });
    }

    if (parseErrors.length > 0) {
      error(`${parseErrors.length} row(s) had errors:\n${parseErrors.slice(0, 5).join("\n")}${parseErrors.length > 5 ? `\n…and ${parseErrors.length - 5} more` : ""}`);
      return;
    }

    setCsvUploading(true);
    try {
      const result = await apiFetch<{ created: number }>(`/library/${selectedId}/items`, {
        method: "POST",
        body: JSON.stringify({ items: parsed }),
      });
      success(`${result.created} item${result.created === 1 ? "" : "s"} added`);
      // Reload library list and items
      loadLibraries();
      loadItems(selectedId);
    } catch (e) {
      error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setCsvUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Simple CSV row parser (handles quoted fields)
  function parseCSVRow(row: string): string[] {
    const cols: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"') {
        if (inQuotes && row[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        cols.push(cur); cur = "";
      } else {
        cur += ch;
      }
    }
    cols.push(cur);
    return cols;
  }

  // ── Time slot helpers ─────────────────────────────────────────────────────

  function addTimeSlot() {
    setForm(f => ({ ...f, timeSlots: [...f.timeSlots, "12:00"] }));
  }
  function removeTimeSlot(i: number) {
    setForm(f => ({ ...f, timeSlots: f.timeSlots.filter((_, idx) => idx !== i) }));
  }
  function updateTimeSlot(i: number, val: string) {
    setForm(f => ({ ...f, timeSlots: f.timeSlots.map((s, idx) => idx === i ? val : s) }));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full" style={{ backgroundColor: "#0a0a0a", color: "#ededed" }}>

      {/* Left panel — library list */}
      <div className="flex flex-col shrink-0 border-r" style={{ width: 280, borderColor: "#2a2a2a", backgroundColor: "#0f0f0f" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: "1px solid #2a2a2a" }}>
          <div>
            <h1 className="text-sm font-bold" style={{ color: "#ededed" }}>Content Library</h1>
            <p className="text-xs mt-0.5" style={{ color: "#888" }}>Drip-schedule your content</p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, backgroundColor: "#fff", color: "#0a0a0a", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer" }}
            className="hover:opacity-90 transition-opacity shrink-0"
          >
            <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            New
          </button>
        </div>

        {/* Library list */}
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin w-5 h-5" style={{ color: "#888" }} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : libraries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <svg style={{ width: 20, height: 20, color: "#444" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </div>
              <p className="text-sm font-medium" style={{ color: "#aaa" }}>No libraries yet</p>
              <p className="text-xs mt-1" style={{ color: "#555" }}>Upload a CSV once, drip posts daily</p>
              <button
                onClick={() => setCreateOpen(true)}
                style={{ marginTop: 16, padding: "8px 20px", borderRadius: 8, backgroundColor: "#fff", color: "#0a0a0a", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}
                className="hover:opacity-90 transition-opacity"
              >
                Create library
              </button>
            </div>
          ) : (
            libraries.map(lib => {
              const sc = LIBRARY_STATUS_COLORS[lib.status];
              const queued = lib.statusCounts?.queued ?? 0;
              const isActive = selectedId === lib.id;
              return (
                <button
                  key={lib.id}
                  onClick={() => setSelectedId(lib.id)}
                  className="w-full text-left transition-colors"
                  style={{
                    padding: "10px 14px",
                    backgroundColor: isActive ? "#18183a" : "transparent",
                    borderLeft: isActive ? "2px solid #818cf8" : "2px solid transparent",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate" style={{ color: isActive ? "#fff" : "#ededed" }}>{lib.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: sc.dot }} />
                      <span style={{ fontSize: 10, color: "#888" }}>{sc.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span style={{ fontSize: 11, color: "#555" }}>{lib._count.items} items</span>
                    {queued > 0 && <span style={{ fontSize: 11, color: "#818cf8" }}>{queued} queued</span>}
                    <span style={{ fontSize: 11, color: "#555" }}>{lib.postsPerDay}/day</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel — detail */}
      {!selected ? (
        <div className="flex-1 flex flex-col items-center justify-center" style={{ color: "#444" }}>
          <svg style={{ width: 48, height: 48, marginBottom: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-sm" style={{ color: "#555" }}>Select a library to view items</p>
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
          onCsvFile={handleCsvFile}
          onTogglePause={() => togglePause(selected)}
          onDelete={() => deleteLibrary(selected)}
          onRefreshLibraries={loadLibraries}
          onError={error}
          onSuccess={success}
        />
      )}

      {/* Create modal */}
      {createOpen && (
        <CreateModal
          accounts={accounts}
          form={form}
          setForm={setForm}
          creating={creating}
          onSubmit={handleCreate}
          onClose={() => setCreateOpen(false)}
          addTimeSlot={addTimeSlot}
          removeTimeSlot={removeTimeSlot}
          updateTimeSlot={updateTimeSlot}
        />
      )}
    </div>
  );
}

// ── Library Detail ─────────────────────────────────────────────────────────

function LibraryDetail({
  library, accounts, items, itemsLoading, itemsHasMore,
  itemsFilter, setItemsFilter, sentinelRef,
  csvUploading, fileInputRef, onCsvFile,
  onTogglePause, onDelete, onRefreshLibraries, onError, onSuccess,
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
  onCsvFile: (f: File) => void;
  onTogglePause: () => void;
  onDelete: () => void;
  onRefreshLibraries: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const linkedAccounts = accounts.filter(a => library.accountIds.includes(a.id));

  const sc = LIBRARY_STATUS_COLORS[library.status];
  const queued = library.statusCounts?.queued ?? 0;
  const published = library.statusCounts?.published ?? 0;
  const failed = library.statusCounts?.failed ?? 0;

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) onCsvFile(file);
    else onError("Please drop a .csv file");
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Library header */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: "1px solid #2a2a2a" }}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold" style={{ color: "#ededed" }}>{library.name}</h2>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: sc.dot }} />
              <span style={{ fontSize: 11, color: "#888" }}>{sc.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-1">
            <span style={{ fontSize: 12, color: "#555" }}>{library.postsPerDay} posts/day</span>
            <span style={{ fontSize: 12, color: "#555" }}>·</span>
            <span style={{ fontSize: 12, color: "#555" }}>{library.timeSlots.join(", ")}</span>
            <span style={{ fontSize: 12, color: "#555" }}>·</span>
            <span style={{ fontSize: 12, color: "#555" }}>{library.timezone}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {library.status !== "exhausted" && (
            <button
              onClick={onTogglePause}
              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #2a2a2a", backgroundColor: "#1a1a1a", color: "#ededed", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              className="hover:bg-white/5 transition-colors"
            >
              {library.status === "paused" ? "Resume" : "Pause"}
            </button>
          )}
          <button
            onClick={onDelete}
            style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #3a1a1a", backgroundColor: "#1f0a0a", color: "#f87171", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            className="hover:opacity-80 transition-opacity"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 px-6 py-3 shrink-0" style={{ borderBottom: "1px solid #2a2a2a" }}>
        {[
          { label: "Total", value: library._count.items, color: "#ededed" },
          { label: "Queued", value: queued, color: "#818cf8" },
          { label: "Published", value: published, color: "#22c55e" },
          { label: "Failed", value: failed, color: "#f87171" },
        ].map(s => (
          <div key={s.label}>
            <p style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</p>
            <p style={{ fontSize: 11, color: "#555" }}>{s.label}</p>
          </div>
        ))}
        {linkedAccounts.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5">
            <span style={{ fontSize: 11, color: "#555" }}>Posting to:</span>
            {linkedAccounts.slice(0, 5).map(a => (
              <span key={a.id} style={{ fontSize: 11, color: "#888", backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 4, padding: "1px 6px" }}>
                {a.displayName}
              </span>
            ))}
            {linkedAccounts.length > 5 && <span style={{ fontSize: 11, color: "#555" }}>+{linkedAccounts.length - 5}</span>}
          </div>
        )}
      </div>

      {/* CSV drop zone */}
      <div
        className="mx-6 mt-4 mb-3 shrink-0"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `1.5px dashed ${dragOver ? "#818cf8" : "#2a2a2a"}`,
          borderRadius: 10,
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: csvUploading ? "wait" : "pointer",
          backgroundColor: dragOver ? "#0d0d2a" : "#111",
          transition: "all 0.15s",
        }}
      >
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onCsvFile(f); }} />
        <svg style={{ width: 18, height: 18, color: "#555", flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <div>
          {csvUploading ? (
            <p style={{ fontSize: 13, color: "#888" }}>Uploading…</p>
          ) : (
            <>
              <p style={{ fontSize: 13, color: "#ededed", fontWeight: 500 }}>Drop CSV file or click to browse</p>
              <p style={{ fontSize: 11, color: "#555", marginTop: 2 }}>Columns: text, comment (optional), mediaUrls pipe-separated (optional) · Max {MAX_CSV_ROWS} rows per upload</p>
            </>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 px-6 mb-3 shrink-0">
        {["all", "queued", "scheduled", "published", "failed", "skipped"].map(f => (
          <button
            key={f}
            onClick={() => setItemsFilter(f)}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              border: "1px solid",
              cursor: "pointer",
              backgroundColor: itemsFilter === f ? "#1a1a2e" : "transparent",
              borderColor: itemsFilter === f ? "#3a3a5a" : "transparent",
              color: itemsFilter === f ? "#818cf8" : "#555",
            }}
            className="hover:text-white transition-colors capitalize"
          >
            {f}
          </button>
        ))}
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {itemsLoading && items.length === 0 ? (
          <div className="flex justify-center py-12">
            <svg className="animate-spin w-5 h-5" style={{ color: "#888" }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <p style={{ fontSize: 14, color: "#555" }}>No items{itemsFilter !== "all" ? ` with status "${itemsFilter}"` : ""}</p>
            {itemsFilter === "all" && (
              <p style={{ fontSize: 12, color: "#444", marginTop: 4 }}>Upload a CSV above to add content</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, idx) => {
              const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.queued;
              return (
                <div
                  key={item.id}
                  style={{ backgroundColor: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "12px 14px" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 13, color: "#ededed", lineHeight: 1.5, marginBottom: item.commentText ? 6 : 0 }}>
                        {item.text.length > 200 ? item.text.slice(0, 200) + "…" : item.text}
                      </p>
                      {item.commentText && (
                        <p style={{ fontSize: 12, color: "#888", borderLeft: "2px solid #2a2a2a", paddingLeft: 8, marginTop: 4 }}>
                          {item.commentText.length > 100 ? item.commentText.slice(0, 100) + "…" : item.commentText}
                        </p>
                      )}
                      {(item.mediaUrls as string[]).length > 0 && (
                        <p style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
                          {(item.mediaUrls as string[]).length} media file{(item.mediaUrls as string[]).length > 1 ? "s" : ""}
                        </p>
                      )}
                      {item.errorMessage && (
                        <p style={{ fontSize: 11, color: "#f87171", marginTop: 4 }}>{item.errorMessage}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span style={{ fontSize: 11, color: "#444" }}>#{idx + 1}</span>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, backgroundColor: sc.bg, color: sc.text, fontWeight: 500 }}>
                        {sc.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={sentinelRef} className="h-4 flex items-center justify-center">
              {itemsHasMore && (
                <svg className="animate-spin w-4 h-4" style={{ color: "#555" }} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Create Modal ──────────────────────────────────────────────────────────

function CreateModal({ accounts, form, setForm, creating, onSubmit, onClose, addTimeSlot, removeTimeSlot, updateTimeSlot }: {
  accounts: Account[];
  form: { name: string; postsPerDay: number; timeSlots: string[]; timezone: string; accountIds: string[] };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  creating: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  addTimeSlot: () => void;
  removeTimeSlot: (i: number) => void;
  updateTimeSlot: (i: number, val: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-md rounded-2xl p-6 overflow-y-auto max-h-[90vh]" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
        <h2 className="text-base font-bold mb-1" style={{ color: "#ededed" }}>Create content library</h2>
        <p className="text-xs mb-5" style={{ color: "#888" }}>Upload posts once — the system drips them out daily on your schedule.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#aaa" }}>Library name</label>
            <input
              autoFocus
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. HTM Facebook Posts"
              style={{ width: "100%", backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#ededed", outline: "none" }}
            />
          </div>

          {/* Posts per day */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#aaa" }}>Posts per day</label>
            <input
              type="number"
              min={1}
              max={50}
              required
              value={form.postsPerDay}
              onChange={e => setForm(f => ({ ...f, postsPerDay: Number(e.target.value) }))}
              style={{ width: "100%", backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#ededed", outline: "none" }}
            />
            <p className="text-xs mt-1" style={{ color: "#555" }}>Capped by your plan limit</p>
          </div>

          {/* Time slots */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#aaa" }}>Time slots</label>
            <div className="space-y-2">
              {form.timeSlots.map((slot, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="time"
                    value={slot}
                    onChange={e => updateTimeSlot(i, e.target.value)}
                    style={{ flex: 1, backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 8, padding: "6px 10px", fontSize: 13, color: "#ededed", outline: "none" }}
                  />
                  {form.timeSlots.length > 1 && (
                    <button type="button" onClick={() => removeTimeSlot(i)} style={{ color: "#555", background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>×</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addTimeSlot} className="text-xs hover:text-white transition-colors" style={{ color: "#555" }}>
                + Add time slot
              </button>
            </div>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#aaa" }}>Timezone</label>
            <input
              value={form.timezone}
              onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
              placeholder="UTC"
              style={{ width: "100%", backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#ededed", outline: "none" }}
            />
          </div>

          {/* Accounts */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#aaa" }}>Post to accounts</label>
            {accounts.length === 0 ? (
              <p className="text-xs" style={{ color: "#555" }}>No accounts connected. <a href="/accounts" style={{ color: "#818cf8" }}>Connect one first.</a></p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {accounts.map(a => {
                  const checked = form.accountIds.includes(a.id);
                  return (
                    <label key={a.id} className="flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-white/5 transition-colors">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setForm(f => ({
                          ...f,
                          accountIds: checked ? f.accountIds.filter(id => id !== a.id) : [...f.accountIds, a.id],
                        }))}
                        style={{ accentColor: "#818cf8" }}
                      />
                      <span style={{ fontSize: 13, color: "#ededed" }}>{a.displayName}</span>
                      <span style={{ fontSize: 11, color: "#555", marginLeft: "auto" }}>{a.platform}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: "9px", borderRadius: 10, fontSize: 13, fontWeight: 600, backgroundColor: "#1a1a1a", color: "#ededed", border: "1px solid #2a2a2a", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              style={{ flex: 1, padding: "9px", borderRadius: 10, fontSize: 13, fontWeight: 600, backgroundColor: "#ffffff", color: "#0a0a0a", border: "none", cursor: creating ? "wait" : "pointer", opacity: creating ? 0.7 : 1 }}
            >
              {creating ? "Creating…" : "Create library"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
