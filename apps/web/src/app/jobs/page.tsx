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
  createdAt: string;
  targets: Target[];
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:        { label: "Pending",        className: "bg-amber-100 text-amber-700" },
  running:        { label: "Running",        className: "bg-blue-100 text-blue-700" },
  done:           { label: "Done",           className: "bg-green-100 text-green-700" },
  failed:         { label: "Failed",         className: "bg-red-100 text-red-700" },
  post_done:      { label: "Post done",      className: "bg-blue-100 text-blue-700" },
  comment_done:   { label: "Comment done",   className: "bg-green-100 text-green-700" },
  post_failed:    { label: "Post failed",    className: "bg-red-100 text-red-700" },
  comment_failed: { label: "Comment failed", className: "bg-orange-100 text-orange-700" },
};

const PLATFORM_ICON: Record<string, string> = {
  bluesky: "🦋", threads: "🧵", linkedin: "💼",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function JobCard({ job }: { job: Job }) {
  const content = JSON.parse(job.content) as { text: string };
  const scheduled = new Date(job.scheduledFor);
  const isPast = scheduled < new Date();

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-3">{content.text}</p>
          {job.commentText && (
            <p className="mt-1.5 text-xs text-gray-400 flex items-start gap-1">
              <span className="mt-0.5">↳</span>
              <span className="italic line-clamp-2">{job.commentText}</span>
            </p>
          )}
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>
          {isPast ? "Was scheduled for" : "Scheduled for"}{" "}
          <strong className="text-gray-600">{scheduled.toLocaleString()}</strong>
        </span>
      </div>

      {job.targets.length > 0 && (
        <div className="border-t border-gray-100 pt-4 space-y-2">
          {job.targets.map((t) => (
            <div key={t.id} className="flex items-center gap-3">
              <span className="text-base">{PLATFORM_ICON[t.account.platform] ?? "🌐"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 capitalize">
                  {t.account.platform} · <span className="text-gray-700 font-medium">{t.account.displayName}</span>
                </p>
                {t.error && <p className="text-xs text-red-500 truncate mt-0.5">{t.error}</p>}
              </div>
              <StatusBadge status={t.status} />
              {t.attempts > 1 && <span className="text-xs text-gray-400">{t.attempts} attempts</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type Tab = "calendar" | "list";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("calendar");

  async function fetchJobs() {
    try {
      const data = await apiFetch<Job[]>("/jobs");
      setJobs(data);
      setLastRefresh(new Date());
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function reschedule(jobId: string, newDate: Date) {
    await apiFetch(`/jobs/${jobId}`, {
      method: "PATCH",
      body: JSON.stringify({ scheduledFor: newDate.toISOString() }),
    });
    // Optimistic update
    setJobs((prev) =>
      prev.map((j) => j.id === jobId ? { ...j, scheduledFor: newDate.toISOString() } : j)
    );
  }

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 10_000);
    return () => clearInterval(interval);
  }, []);

  const pending = jobs.filter((j) => j.status === "pending" || j.status === "running");
  const past = jobs.filter((j) => j.status === "done" || j.status === "failed");

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scheduled Jobs</h1>
          <p className="text-gray-500 text-sm mt-1">
            {lastRefresh
              ? `Auto-refreshes every 10s · Last updated ${lastRefresh.toLocaleTimeString()}`
              : "Loading…"}
          </p>
        </div>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          + New Post
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-6">
        {(["calendar", "list"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "calendar" ? "📅 Calendar" : "📋 List"}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">{error}</div>
      )}

      {/* Calendar tab */}
      {activeTab === "calendar" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {loading ? (
            <div className="text-center py-20 text-gray-400 text-sm">Loading…</div>
          ) : (
            <CalendarView jobs={jobs} onReschedule={reschedule} />
          )}
        </div>
      )}

      {/* List tab */}
      {activeTab === "list" && (
        <>
          {loading && <div className="text-center py-20 text-gray-400 text-sm">Loading jobs…</div>}

          {!loading && jobs.length === 0 && (
            <div className="text-center py-24 space-y-3">
              <p className="text-4xl">📭</p>
              <p className="text-gray-500 text-sm">
                No jobs yet.{" "}
                <a href="/" className="text-blue-600 font-medium">Schedule your first post →</a>
              </p>
            </div>
          )}

          {pending.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Upcoming</h2>
              <div className="space-y-3">
                {pending.map((job) => <JobCard key={job.id} job={job} />)}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Past</h2>
              <div className="space-y-3">
                {past.map((job) => <JobCard key={job.id} job={job} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
