"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { CalendarView } from "../../components/CalendarView";
import { PlatformIcon } from "../../components/PlatformIcon";

interface Target {
  id: string;
  status: string;
  platformPostId: string | null;
  error: string | null;
  attempts: number;
  account: { platform: string; displayName: string };
}

export interface Job {
  id: string;
  scheduledFor: string;
  status: string;
  content: string;
  commentText: string | null;
  dryRun: boolean;
  createdAt: string;
  targets: Target[];
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  pending:        { label: "Scheduled",    dot: "bg-amber-400",  badge: "bg-amber-50 text-amber-700 border-amber-200" },
  running:        { label: "Posting…",     dot: "bg-blue-400 animate-pulse", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  done:           { label: "Published",    dot: "bg-green-400",  badge: "bg-green-50 text-green-700 border-green-200" },
  failed:         { label: "Failed",       dot: "bg-red-400",    badge: "bg-red-50 text-red-700 border-red-200" },
  post_done:      { label: "Posted",       dot: "bg-blue-300",   badge: "bg-blue-50 text-blue-600 border-blue-200" },
  comment_done:   { label: "Done",         dot: "bg-green-400",  badge: "bg-green-50 text-green-700 border-green-200" },
  post_failed:    { label: "Post failed",  dot: "bg-red-400",    badge: "bg-red-50 text-red-700 border-red-200" },
  comment_failed: { label: "Reply failed", dot: "bg-orange-400", badge: "bg-orange-50 text-orange-700 border-orange-200" },
};

const PLATFORM_ICON: Record<string, string> = {
  bluesky: "🦋", threads: "🧵", linkedin: "💼",
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, dot: "bg-gray-400", badge: "bg-stone-100 text-stone-600 border-stone-200" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function JobCard({ job }: { job: Job }) {
  const content = JSON.parse(job.content) as { text: string; mediaUrls?: string[] };
  const scheduled = new Date(job.scheduledFor);
  const isPast = scheduled < new Date();
  const isToday = scheduled.toDateString() === new Date().toDateString();

  function formatScheduled() {
    if (isToday) return `Today at ${scheduled.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    return (
      scheduled.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) +
      " · " + scheduled.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  }

  return (
    <div className="group rounded-2xl shadow-sm overflow-hidden transition-shadow hover:shadow-md"
      style={{ backgroundColor: "#111111", border: "1px solid #1f1f1f" }}>
      <div className="p-5">
        <div className="flex items-start gap-3">
          {/* Platform icons */}
          <div className="flex items-center gap-0.5 mt-0.5 flex-shrink-0">
            {job.targets.map((t) => (
              <span key={t.id} title={t.account.displayName}>
                <PlatformIcon platform={t.account.platform} size={18} />
              </span>
            ))}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">{content.text}</p>
            {job.commentText && (
              <p className="mt-1 text-xs text-gray-400 flex items-start gap-1">
                <span>↳</span>
                <span className="italic line-clamp-1">{job.commentText}</span>
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <StatusBadge status={job.status} />
            {job.dryRun && (
              <span className="text-[10px] bg-violet-50 text-violet-600 border border-violet-200 px-1.5 py-0.5 rounded-full font-semibold">
                dry run
              </span>
            )}
          </div>
        </div>

        {/* Image thumbnails */}
        {content.mediaUrls && content.mediaUrls.length > 0 && (
          <div className="flex gap-2 mt-3">
            {content.mediaUrls.slice(0, 4).map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i}
                src={url.startsWith("http") ? url : `${API_BASE}${url}`}
                alt="" className="w-14 h-14 rounded-xl object-cover" style={{ border: "1px solid #1f1f1f", backgroundColor: "#111111" }} />
            ))}
          </div>
        )}

        {/* Time row */}
        <div className="mt-3 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className={`text-xs ${isPast ? "text-gray-400" : "text-gray-500"}`}>
            {formatScheduled()}
          </span>
        </div>
      </div>

      {/* Target breakdown — hover or on error */}
      {job.targets.length > 0 && (
        <div className={`px-5 py-3 space-y-1.5 ${job.targets.some((t) => t.error) ? "block" : "hidden group-hover:block"}`}
          style={{ borderTop: "1px solid #1f1f1f" }}>
          {job.targets.map((t) => (
            <div key={t.id} className="flex items-center gap-2 text-xs">
              <PlatformIcon platform={t.account.platform} size={13} />
              <span className="font-medium" style={{ color: "#888888" }}>{t.account.displayName}</span>
              <StatusBadge status={t.status} />
              {t.attempts > 1 && <span style={{ color: "#888888" }}>{t.attempts} attempts</span>}
              {t.error && <span className="text-red-500 truncate flex-1">{t.error}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type ViewTab = "list" | "calendar";
type FilterTab = "all" | "pending" | "done" | "failed";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [viewTab, setViewTab] = useState<ViewTab>("list");
  const [filter, setFilter] = useState<FilterTab>("all");

  async function reschedule(jobId: string, newDate: Date) {
    await apiFetch(`/jobs/${jobId}`, {
      method: "PATCH",
      body: JSON.stringify({ scheduledFor: newDate.toISOString() }),
    });
    setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, scheduledFor: newDate.toISOString() } : j));
  }

  useEffect(() => {
    let es: EventSource;

    // EventSource can't send cookies cross-origin — fetch the access token
    // from the session endpoint first, then pass it as ?token= query param.
    async function connect() {
      try {
        const res = await fetch(`${API_BASE}/auth/session`, { credentials: "include" });
        if (!res.ok) { setError("Not authenticated"); setLoading(false); return; }
        const { token } = await res.json() as { token: string; user: unknown };
        es = new EventSource(`${API_BASE}/jobs/stream?token=${encodeURIComponent(token)}`);

        es.onmessage = (e: MessageEvent<string>) => {
          try {
            const data = JSON.parse(e.data) as Job[] | { error: string };
            if (!Array.isArray(data)) { setError("Not authenticated"); es.close(); return; }
            setJobs(data);
            setLastRefresh(new Date());
            setError(null);
            setLoading(false);
          } catch { /* malformed frame — ignore */ }
        };

        es.onerror = () => setError("Connection lost — retrying…");
      } catch {
        setError("Connection lost — retrying…");
      }
    }

    connect();
    return () => es?.close();
  }, []);

  const counts = {
    all: jobs.length,
    pending: jobs.filter((j) => j.status === "pending" || j.status === "running").length,
    done: jobs.filter((j) => j.status === "done").length,
    failed: jobs.filter((j) => j.status === "failed").length,
  };

  const filteredJobs = jobs.filter((j) => {
    if (filter === "all") return true;
    if (filter === "pending") return j.status === "pending" || j.status === "running";
    return j.status === filter;
  });

  const upcoming = filteredJobs.filter((j) => j.status === "pending" || j.status === "running");
  const past = filteredJobs.filter((j) => j.status === "done" || j.status === "failed");

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: "#0a0a0a" }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid #1f1f1f", backgroundColor: "#111111" }}>
        <div>
          <h1 className="text-lg font-bold" style={{ color: "#ededed" }}>Posts</h1>
          <p className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: "#888888" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            {lastRefresh ? `Live · updated ${lastRefresh.toLocaleTimeString()}` : "Connecting…"}
          </p>
        </div>
        <a href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          style={{ backgroundColor: "#5b63d3" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Post
        </a>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-8 py-3 flex-shrink-0 flex-wrap"
        style={{ borderBottom: "1px solid #1f1f1f", backgroundColor: "#0a0a0a" }}>

        {/* View toggle */}
        <div className="flex gap-0.5 p-1 rounded-xl" style={{ backgroundColor: "#111111", border: "1px solid #1f1f1f" }}>
          {([
            { id: "list",     icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>, label: "List" },
            { id: "calendar", icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>, label: "Calendar" },
          ] as { id: ViewTab; icon: React.ReactNode; label: string }[]).map((t) => (
            <button key={t.id} onClick={() => setViewTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={viewTab === t.id
                ? { backgroundColor: "#1f1f2e", color: "#818cf8", boxShadow: "0 0 0 1px #3730a3" }
                : { color: "#555" }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Filter pills — list view only */}
        {viewTab === "list" && (
          <>
            <div className="h-4 w-px" style={{ backgroundColor: "#1f1f1f" }} />
            <div className="flex gap-1.5">
              {([
                { id: "all",     label: "All",      dot: null,        activeColor: "#ededed", activeBg: "#1f1f1f" },
                { id: "pending", label: "Scheduled", dot: "#f59e0b",  activeColor: "#fbbf24", activeBg: "#1c1a10" },
                { id: "done",    label: "Published", dot: "#22c55e",  activeColor: "#4ade80", activeBg: "#0a1f12" },
                { id: "failed",  label: "Failed",    dot: "#ef4444",  activeColor: "#f87171", activeBg: "#1f0a0a" },
              ] as { id: FilterTab; label: string; dot: string | null; activeColor: string; activeBg: string }[]).map((f) => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={filter === f.id
                    ? { backgroundColor: f.activeBg, color: f.activeColor, border: `1px solid ${f.dot ?? "#3a3a3a"}40` }
                    : { backgroundColor: "transparent", color: "#555", border: "1px solid transparent" }}>
                  {f.dot && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: filter === f.id ? f.dot : "#333" }} />}
                  {f.label}
                  <span className="ml-0.5 tabular-nums" style={{ opacity: 0.6, fontSize: "0.65rem" }}>{counts[f.id]}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">{error}</div>
        )}

        {viewTab === "calendar" && (
          <div className="rounded-2xl shadow-sm p-6" style={{ backgroundColor: "#111111", border: "1px solid #1f1f1f" }}>
            {loading
              ? <div className="text-center py-20 text-sm" style={{ color: "#888888" }}>Loading…</div>
              : <CalendarView jobs={jobs} onReschedule={reschedule} />
            }
          </div>
        )}

        {viewTab === "list" && (
          <>
            {loading && (
              <div className="space-y-3">
                {[1,2,3].map((i) => (
                  <div key={i} className="rounded-2xl h-28 animate-pulse" style={{ backgroundColor: "#1a1a1a", border: "1px solid #1f1f1f" }} />
                ))}
              </div>
            )}

            {!loading && filteredJobs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <p className="text-5xl mb-4">📭</p>
                <p className="text-gray-500 text-sm font-medium">
                  {filter === "all"
                    ? "No posts yet"
                    : `No ${filter} posts`}
                </p>
                {filter === "all" && (
                  <a href="/" className="mt-3 text-sm text-blue-600 font-semibold hover:underline">
                    Schedule your first post →
                  </a>
                )}
              </div>
            )}

            {upcoming.length > 0 && (
              <section className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Upcoming · {upcoming.length}
                  </p>
                </div>
                <div className="space-y-3">
                  {upcoming.map((job) => <JobCard key={job.id} job={job} />)}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-gray-300" />
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Past · {past.length}
                  </p>
                </div>
                <div className="space-y-3">
                  {past.map((job) => <JobCard key={job.id} job={job} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
