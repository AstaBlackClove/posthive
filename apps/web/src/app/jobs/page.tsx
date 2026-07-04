"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { CalendarView } from "../../components/CalendarView";
import { PlatformIcon } from "../../components/PlatformIcon";
import { EditPostDialog } from "../../components/EditPostDialog";
import { DeleteConfirmDialog } from "../../components/DeleteConfirmDialog";
import { useToast } from "../../components/Toast";
import { BulkScheduleModal } from "../../components/BulkScheduleModal";
import type { Account, PerAccountOverride } from "../../components/PlatformPreview";

interface Target {
  id: string;
  accountId: string;
  status: string;
  platformPostId: string | null;
  error: string | null;
  attempts: number;
  account: { platform: string; displayName: string; avatarUrl: string | null } | null;
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

function JobCard({ job, onEdit, onDelete, onRetry, onDuplicate }: {
  job: Job;
  onEdit: () => void;
  onDelete: () => void;
  onRetry: () => Promise<void>;
  onDuplicate: () => void;
}) {
  const [retrying, setRetrying] = useState(false);
  const content = JSON.parse(job.content) as { text: string; mediaUrls?: string[] };
  const scheduled = new Date(job.scheduledFor);
  const isPast = scheduled < new Date();
  const isToday = scheduled.toDateString() === new Date().toDateString();
  const canEdit = job.status === "pending";
  const hasFailedTargets = job.targets.some((t) => t.status === "post_failed");

  function formatScheduled() {
    if (isToday) return `Today at ${scheduled.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    return scheduled.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) +
      " · " + scheduled.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="job-card group rounded-2xl overflow-hidden" style={{ backgroundColor: "#111111" }}>
      <div className="p-5">

        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-1.5 mt-0.5 flex-shrink-0">
            {job.targets.map((t) => (
              <span key={t.id} title={`${t.account?.displayName ?? t.accountId} (${t.account?.platform ?? "unknown"})`}
                className="relative flex-shrink-0">
                {t.account?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.account.avatarUrl} alt={t.account.displayName}
                    className="w-7 h-7 rounded-full object-cover" style={{ border: "1px solid #2a2a2a" }} />
                ) : (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#888" }}>
                    {t.account?.displayName?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 rounded-full flex items-center justify-center"
                  style={{ width: 13, height: 13 }}>
                  <PlatformIcon platform={t.account?.platform ?? "unknown"} size={11} />
                </span>
              </span>
            ))}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-snug line-clamp-2" style={{ color: "#ededed" }}>{content.text}</p>
            {job.commentText && (
              <p className="mt-1 text-xs flex items-start gap-1" style={{ color: "#666" }}>
                <span>↳</span><span className="italic line-clamp-1">{job.commentText}</span>
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <StatusBadge status={job.status} />
              {hasFailedTargets && (
                <button
                  onClick={async () => { setRetrying(true); try { await onRetry(); } finally { setRetrying(false); } }}
                  disabled={retrying}
                  className="job-action-btn" title="Retry failed platforms"
                  style={{ color: "#f87171" }}>
                  <svg className={`w-3.5 h-3.5${retrying ? " animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
              {canEdit && (
                <button onClick={onEdit} className="job-action-btn" title="Edit post">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              <button onClick={onDuplicate} className="job-action-btn" title="Duplicate post">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button onClick={onDelete} className="job-action-btn job-action-btn--danger" title="Delete post">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            {job.dryRun && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: "#1e1a2e", color: "#a78bfa", border: "1px solid #4c1d95" }}>dry run</span>
            )}
          </div>
        </div>

        {/* Media thumbnails */}
        {content.mediaUrls && content.mediaUrls.length > 0 && job.status !== "done" && (
          <div className="flex gap-2 mt-3">
            {content.mediaUrls.slice(0, 4).map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url.startsWith("http") ? url : `${API_BASE}${url}`}
                alt="" className="w-14 h-14 rounded-xl object-cover" style={{ border: "1px solid #2a2a2a" }} />
            ))}
          </div>
        )}
        {content.mediaUrls && content.mediaUrls.length > 0 && job.status === "done" && (
          <div className="flex gap-1.5 mt-3">
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg"
              style={{ backgroundColor: "#1a1a1a", color: "#555", border: "1px solid #2a2a2a" }}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {content.mediaUrls.length} image{content.mediaUrls.length > 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Time row */}
        <div className="mt-3 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#555" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs" style={{ color: isPast ? "#555" : "#888" }}>{formatScheduled()}</span>
        </div>
      </div>

      {/* Target breakdown — smooth expand on hover */}
      {job.targets.length > 0 && (
        <div className={`job-card-targets ${job.targets.some((t) => t.error) ? "force-open" : ""}`}>
          <div className="job-card-targets-inner" style={{ borderTop: "1px solid #1f1f1f" }}>
            <div className="px-5 py-3 space-y-1.5">
              {job.targets.map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-xs">
                  <PlatformIcon platform={t.account?.platform ?? "unknown"} size={13} />
                  <span className="font-medium" style={{ color: "#666" }}>{t.account?.displayName ?? t.accountId.slice(0, 8)}</span>
                  <StatusBadge status={t.status} />
                  {t.attempts > 1 && <span style={{ color: "#555" }}>{t.attempts} attempts</span>}
                  {t.error && <span className="text-red-500 truncate flex-1">{t.error}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type ViewTab = "list" | "calendar";
type FilterTab = "all" | "pending" | "done" | "failed";

export default function JobsPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [viewTab, setViewTab] = useState<ViewTab>("list");
  const [filter, setFilter] = useState<FilterTab>("all");

  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [deletingJob, setDeletingJob] = useState<Job | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  useEffect(() => {
    apiFetch<Account[]>("/accounts").then(setAccounts).catch(() => {});
  }, []);

  async function reschedule(jobId: string, newDate: Date) {
    try {
      await apiFetch(`/jobs/${jobId}`, {
        method: "PATCH",
        body: JSON.stringify({ scheduledFor: newDate.toISOString() }),
      });
      setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, scheduledFor: newDate.toISOString() } : j));
      success("Post rescheduled.");
    } catch (err) { toastError(String(err)); }
  }

  async function deleteJob(jobId: string) {
    try {
      await apiFetch(`/jobs/${jobId}`, { method: "DELETE" });
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      success("Post deleted.");
    } catch (err) { toastError(String(err)); }
  }

  async function retryFailed(jobId: string) {
    try {
      await apiFetch(`/jobs/${jobId}/retry-failed`, { method: "POST" });
      success("Retrying failed platforms…");
    } catch (err) { toastError(String(err)); }
  }

  function duplicateJob(job: Job) {
    const content = JSON.parse(job.content) as {
      text: string;
      mediaType?: "post" | "reel" | "story";
      youtubeType?: "short" | "video";
      youtubeVideoMode?: "upload" | "url";
      youtubeVideoUrl?: string;
      perAccount?: Record<string, { text?: string; commentText?: string }>;
    };

    // Extract YouTube title/description from its perAccount override
    const ytAccountId = job.targets.find(t => accounts.find(a => a.id === t.accountId)?.platform === "youtube")?.accountId;
    const ytText = content.perAccount?.[ytAccountId ?? ""]?.text ?? "";
    const ytParts = ytText.split("\n\n");
    const youtubeTitle = ytParts[0] ?? "";
    const youtubeDescription = ytParts.slice(1).join("\n\n");

    // Extract Pinterest title/description from its perAccount override
    const pinAccountId = job.targets.find(t => accounts.find(a => a.id === t.accountId)?.platform === "pinterest")?.accountId;
    const pinText = content.perAccount?.[pinAccountId ?? ""]?.text ?? "";
    const pinParts = pinText.split("\n\n");
    const pinterestTitle = pinParts[0] ?? "";
    const pinterestDescription = pinParts.slice(1).join("\n\n");

    // Keep manual per-platform overrides (exclude YouTube and Pinterest — compose re-populates those)
    const perAccount = Object.fromEntries(
      Object.entries(content.perAccount ?? {}).filter(([id]) => {
        const platform = accounts.find(a => a.id === id)?.platform;
        return platform !== "youtube" && platform !== "pinterest";
      })
    );

    sessionStorage.setItem("posthive_duplicate_draft", JSON.stringify({
      text: content.text,
      commentText: job.commentText ?? "",
      accountIds: job.targets.map(t => t.accountId),
      mediaType: content.mediaType,
      youtubeType: content.youtubeType,
      youtubeVideoMode: content.youtubeVideoMode,
      youtubeVideoUrl: content.youtubeVideoUrl,
      youtubeTitle,
      youtubeDescription,
      pinterestTitle,
      pinterestDescription,
      ...(Object.keys(perAccount).length > 0 ? { perAccount } : {}),
    }));
    router.push("/compose");
  }

  async function updateJob(jobId: string, text: string, commentText: string, scheduledFor: Date, mediaUrls: string[], accountIds: string[], perAccount: Record<string, PerAccountOverride>, mediaType?: "post" | "reel" | "story", youtubeType?: "short" | "video", youtubeVideoMode?: "upload" | "url", youtubeVideoUrl?: string) {
    try {
      await apiFetch(`/jobs/${jobId}`, {
        method: "PATCH",
        body: JSON.stringify({
          text,
          commentText: commentText || undefined,
          scheduledFor: scheduledFor.toISOString(),
          mediaUrls,
          mediaType,
          accountIds,
          ...(youtubeType ? { youtubeType } : {}),
          ...(youtubeVideoMode ? { youtubeVideoMode } : {}),
          ...(youtubeVideoUrl !== undefined ? { youtubeVideoUrl } : {}),
          ...(Object.keys(perAccount).length > 0 ? { perAccount } : { perAccount: {} }),
        }),
      });
      const updated = await apiFetch<Job>(`/jobs/${jobId}`);
      setJobs((prev) => prev.map((j) => j.id === jobId ? updated : j));
      success("Post updated.");
    } catch (err) { toastError(String(err)); throw err; } // rethrow so dialog stays open on failure
  }

  useEffect(() => {
    let es: EventSource;

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

  const allPlatforms = Array.from(new Set(jobs.flatMap((j) => j.targets.map((t) => t.account?.platform).filter(Boolean) as string[])));

  const filteredJobs = jobs.filter((j) => {
    if (filter !== "all") {
      if (filter === "pending" && j.status !== "pending" && j.status !== "running") return false;
      if (filter !== "pending" && j.status !== filter) return false;
    }
    if (platformFilter !== "all" && !j.targets.some((t) => t.account?.platform === platformFilter)) return false;
    return true;
  });

  const upcoming = filteredJobs.filter((j) => j.status === "pending" || j.status === "running");
  const past = filteredJobs.filter((j) => j.status === "done" || j.status === "failed");


  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: "#0a0a0a" }}>

      {/* Edit dialog */}
      {editingJob && (
        <EditPostDialog
          open={!!editingJob}
          job={editingJob}
          accounts={accounts}
          onSave={async (text, commentText, scheduledFor, mediaUrls, accountIds, perAccount, mediaType, youtubeType, youtubeVideoMode, youtubeVideoUrl) => {
            await updateJob(editingJob.id, text, commentText, scheduledFor, mediaUrls, accountIds, perAccount, mediaType, youtubeType, youtubeVideoMode, youtubeVideoUrl);
          }}
          onClose={() => setEditingJob(null)}
        />
      )}

      {/* Delete confirm dialog */}
      {deletingJob && (
        <DeleteConfirmDialog
          open={!!deletingJob}
          onClose={() => setDeletingJob(null)}
          onConfirm={async () => {
            await deleteJob(deletingJob.id);
            setDeletingJob(null);
          }}
          postText={(JSON.parse(deletingJob.content) as { text: string }).text}
        />
      )}

      {/* Bulk schedule modal */}
      {showBulk && (
        <BulkScheduleModal
          accounts={accounts}
          onClose={() => setShowBulk(false)}
          onScheduled={(count) => {
            setShowBulk(false);
            success(`${count} post${count !== 1 ? "s" : ""} scheduled!`);
            apiFetch<Job[]>("/jobs").then(setJobs).catch(() => {});
          }}
        />
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between pl-16 pr-4 md:px-8 flex-shrink-0"
        style={{ height: 65, borderBottom: "1px solid #2a2a2a", backgroundColor: "#111111" }}>
        <div className="min-w-0">
          <h1 className="text-lg font-bold" style={{ color: "#ededed" }}>Posts</h1>
          <p className="text-xs mt-0.5 flex items-center gap-1.5 truncate" style={{ color: "#888888" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block flex-shrink-0" />
            {lastRefresh ? `Live · updated ${lastRefresh.toLocaleTimeString()}` : "Connecting…"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setShowBulk(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl transition-colors hover:opacity-80"
            style={{ backgroundColor: "#1a1a1a", color: "#888", border: "1px solid #2a2a2a" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="hidden sm:inline">Bulk</span>
          </button>
          <a href="/compose"
            className="inline-flex items-center gap-1.5 px-3 md:px-4 py-2 text-sm font-semibold rounded-xl transition-colors hover:bg-gray-100"
            style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">New Post</span>
          </a>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 md:px-8 py-3 flex-shrink-0 flex-wrap"
        style={{ borderBottom: "1px solid #2a2a2a", backgroundColor: "#0a0a0a" }}>

        <div className="flex gap-0.5 p-1 rounded-xl" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
          {([
            { id: "list",     icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>, label: "List" },
            { id: "calendar", icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>, label: "Calendar" },
          ] as { id: ViewTab; icon: React.ReactNode; label: string }[]).map((t) => (
            <button key={t.id} onClick={() => setViewTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={viewTab === t.id
                ? { backgroundColor: "#1f1f2e", color: "#818cf8", boxShadow: "0 0 0 1px #3730a3" }
                : { color: "" }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {viewTab === "list" && (
          <>
            <div className="h-4 w-px hidden sm:block" style={{ backgroundColor: "#2a2a2a" }} />
            <div className="flex gap-1.5 flex-wrap">
              {([
                { id: "all",     label: "All",       dot: null,       activeColor: "#ededed", activeBg: "#2a2a2a" },
                { id: "pending", label: "Scheduled",  dot: "#f59e0b", activeColor: "#fbbf24", activeBg: "#1c1a10" },
                { id: "done",    label: "Published",  dot: "#22c55e", activeColor: "#4ade80", activeBg: "#0a1f12" },
                { id: "failed",  label: "Failed",     dot: "#ef4444", activeColor: "#f87171", activeBg: "#1f0a0a" },
              ] as { id: FilterTab; label: string; dot: string | null; activeColor: string; activeBg: string }[]).map((f) => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={filter === f.id
                    ? { backgroundColor: f.activeBg, color: f.activeColor, border: `1px solid ${f.dot ?? "#3a3a3a"}40` }
                    : { backgroundColor: "transparent", border: "1px solid #2a2a2a" }}>
                  {f.dot && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: filter === f.id ? f.dot : "#333" }} />}
                  {f.label}
                  <span className="ml-0.5 tabular-nums" style={{ opacity: 0.6, fontSize: "0.65rem" }}>{counts[f.id]}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Platform filter */}
        {allPlatforms.length > 1 && (
          <>
            <div className="h-4 w-px hidden sm:block" style={{ backgroundColor: "#2a2a2a" }} />
            <div className="flex gap-1.5 flex-wrap">
              {(["all", ...allPlatforms] as string[]).map((p) => (
                <button key={p} onClick={() => setPlatformFilter(p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all capitalize"
                  style={platformFilter === p
                    ? { backgroundColor: "#1f1f2e", color: "#818cf8", border: "1px solid #3730a340" }
                    : { backgroundColor: "transparent", border: "1px solid #2a2a2a" }}>
                  {p !== "all" && <PlatformIcon platform={p} size={12} />}
                  {p === "all" ? "All platforms" : p}
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
          <div className="rounded-2xl shadow-sm p-6" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
            {loading
              ? <div className="text-center py-20 text-sm" style={{ color: "#888888" }}>Loading…</div>
              : <CalendarView jobs={filteredJobs} onReschedule={reschedule} onEdit={setEditingJob} />
            }
          </div>
        )}

        {viewTab === "list" && (
          <>
            {loading && (
              <div className="space-y-3">
                {[1,2,3].map((i) => (
                  <div key={i} className="rounded-2xl h-28 animate-pulse" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }} />
                ))}
              </div>
            )}

            {!loading && filteredJobs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <p className="text-5xl mb-4">📭</p>
                <p className="text-gray-500 text-sm font-medium">
                  {filter === "all" ? "No posts yet" : `No ${filter} posts`}
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
                  {upcoming.map((job) => (
                    <JobCard key={job.id} job={job}
                      onEdit={() => setEditingJob(job)}
                      onDelete={() => setDeletingJob(job)}
                      onRetry={() => retryFailed(job.id)}
                      onDuplicate={() => duplicateJob(job)} />
                  ))}
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
                  {past.map((job) => (
                    <JobCard key={job.id} job={job}
                      onEdit={() => setEditingJob(job)}
                      onDelete={() => setDeletingJob(job)}
                      onRetry={() => retryFailed(job.id)}
                      onDuplicate={() => duplicateJob(job)} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
