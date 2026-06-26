"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { CalendarView } from "../../components/CalendarView";

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
  const cfg = STATUS_CONFIG[status] ?? { label: status, dot: "bg-gray-400", badge: "bg-gray-50 text-gray-600 border-gray-200" };
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
    <div className={`group bg-white rounded-2xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md ${
      isPast && job.status === "done" ? "border-gray-100" : "border-gray-200"
    }`}>
      <div className="p-5">
        <div className="flex items-start gap-3">
          {/* Platform icons */}
          <div className="flex -space-x-1 mt-0.5 flex-shrink-0">
            {job.targets.map((t) => (
              <span key={t.id} className="text-lg" title={t.account.displayName}>
                {PLATFORM_ICON[t.account.platform] ?? "🌐"}
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
                alt="" className="w-14 h-14 rounded-xl object-cover border border-gray-100" />
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
        <div className={`border-t border-gray-100 px-5 py-3 space-y-1.5 transition-all ${
          job.targets.some((t) => t.error) ? "block" : "hidden group-hover:block"
        }`}>
          {job.targets.map((t) => (
            <div key={t.id} className="flex items-center gap-2 text-xs">
              <span>{PLATFORM_ICON[t.account.platform] ?? "🌐"}</span>
              <span className="text-gray-500 font-medium">{t.account.displayName}</span>
              <StatusBadge status={t.status} />
              {t.attempts > 1 && <span className="text-gray-400">{t.attempts} attempts</span>}
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
    const es = new EventSource(`${API_BASE}/jobs/stream`);

    es.onmessage = (e: MessageEvent<string>) => {
      try {
        setJobs(JSON.parse(e.data) as Job[]);
        setLastRefresh(new Date());
        setError(null);
        setLoading(false);
      } catch { /* malformed frame — ignore */ }
    };

    es.onerror = () => {
      setError("Connection lost — retrying…");
      // Browser auto-reconnects EventSource — no manual retry needed
    };

    return () => es.close();
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
    <div className="flex flex-col h-full overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Posts</h1>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            {lastRefresh ? `Live · updated ${lastRefresh.toLocaleTimeString()}` : "Connecting…"}
          </p>
        </div>
        <a
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Post
        </a>
      </div>

      {/* Toolbar — view toggle + filter pills */}
      <div className="flex items-center gap-4 px-8 py-3 border-b border-gray-100 bg-white flex-shrink-0 flex-wrap">
        {/* View toggle */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          {(["list", "calendar"] as ViewTab[]).map((t) => (
            <button key={t} onClick={() => setViewTab(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewTab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {t === "list" ? "📋 List" : "📅 Calendar"}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-gray-200" />

        {/* Status filter — list view only */}
        {viewTab === "list" && (
          <div className="flex gap-1">
            {(["all", "pending", "done", "failed"] as FilterTab[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filter === f ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}{" "}
                <span className={filter === f ? "text-gray-400" : "text-gray-400"}>{counts[f]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">{error}</div>
        )}

        {/* Calendar view */}
        {viewTab === "calendar" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            {loading
              ? <div className="text-center py-20 text-gray-400 text-sm">Loading…</div>
              : <CalendarView jobs={jobs} onReschedule={reschedule} />
            }
          </div>
        )}

        {/* List view */}
        {viewTab === "list" && (
          <>
            {loading && (
              <div className="space-y-3">
                {[1,2,3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-200 h-28 animate-pulse" />
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
