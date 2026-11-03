"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { CalendarView } from "../../components/CalendarView";
import { PlatformIcon } from "../../components/PlatformIcon";
import { EditPostDialog } from "../../components/EditPostDialog";
import { toContentType, type ContentType } from "../../components/ContentTypeSelects";
import type { DesignTemplate } from "../../lib/templates";
import { ReviewDialog } from "../../components/ReviewDialog";
import { DeleteConfirmDialog } from "../../components/DeleteConfirmDialog";
import { useToast } from "../../components/Toast";
import { TrialUrgentBanner } from "../../components/TrialUrgentBanner";
import { DatePicker } from "../../components/DatePicker";
import { formatDateTime, formatTime, minKeyForInterval, wibDateKey } from "../../lib/datetime";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import { canEditContent, canReview as roleCanReview } from "../../lib/permissions";
import type { Account, PerAccountOverride } from "../../components/PlatformPreview";
import { cn } from "../../lib/cn";
import { missingForReview, MISSING_LABEL, type MissingField } from "../../lib/submitReadiness";
import {
  DEFAULT_SORT, JOB_SORTS, countJobs, matchesFilter, sectionOf, sortJobs,
  type FilterTab, type JobCounts, type JobSort,
} from "../../lib/postList";

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
  userId?: string;
  scheduledFor: string | null;
  status: string;
  content: string;
  commentText: string | null;
  dryRun: boolean;
  createdAt: string;
  repeatInterval?: string | null;
  repeatParentId?: string | null;
  approvalStatus?: string | null;  // pending | approved | rejected | null
  reviewNote?: string | null;
  reviewedBy?: { name: string } | null;
  reviewedAt?: string | null;
  targets: Target[];
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  draft:          { label: "Draft",        dot: "bg-neutral-500", badge: "bg-surface text-muted border-border" },
  pending:        { label: "Scheduled",    dot: "bg-accent",      badge: "bg-brand-100 text-brand-800 border-brand-400" },
  running:        { label: "Posting…",     dot: "bg-blue-500 animate-pulse", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  done:           { label: "Published",    dot: "bg-green-500",   badge: "bg-green-50 text-green-700 border-green-200" },
  failed:         { label: "Failed",       dot: "bg-red-500",     badge: "bg-red-50 text-red-600 border-red-200" },
  post_done:      { label: "Posted",       dot: "bg-blue-400",    badge: "bg-blue-50 text-blue-700 border-blue-200" },
  comment_done:   { label: "Done",         dot: "bg-green-500",   badge: "bg-green-50 text-green-700 border-green-200" },
  post_failed:    { label: "Post failed",  dot: "bg-red-500",     badge: "bg-red-50 text-red-600 border-red-200" },
  comment_failed: { label: "Reply failed", dot: "bg-red-400",     badge: "bg-brand-100 text-brand-800 border-brand-400" },
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function contentDisplayTitle(content: { text?: string; title?: string }): string {
  return content.title?.trim() || content.text?.trim() || "Untitled";
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, dot: "bg-neutral-500", badge: "bg-surface text-muted border-border" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full type-body-sb-xs border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// Design-approval state chip — shown on draft cards under the approval flow
function ApprovalChip({ approvalStatus, reviewedBy }: { approvalStatus: string; reviewedBy?: { name: string } | null }) {
  const label = approvalStatus === "pending" ? "In review" : approvalStatus === "rejected" ? "Rejected" : "Approved";
  const tone =
    approvalStatus === "pending"
      ? "bg-brand-100 text-brand-800 border-brand-300"
      : approvalStatus === "rejected"
      ? "bg-red-50 text-red-600 border-red-200"
      : "bg-green-50 text-green-700 border-green-200";
  return (
    <span
      title={reviewedBy ? `${label} by ${reviewedBy.name}` : label}
      className={cn("inline-flex items-center px-2 py-0.5 rounded-full type-body-sb-xs border", tone)}>
      {label}
    </span>
  );
}

interface AnalyticsResult {
  likes?: number;
  reposts?: number;
  replies?: number;
  views?: number;
  fetchedAt: string;
}

const ANALYTICS_PLATFORMS = new Set(["bluesky", "mastodon", "pixelfed", "lemmy", "instagram", "threads", "facebook"]);

const REPEAT_OPTIONS = [
  { value: "daily", label: "Every Day" },
  { value: "weekly", label: "Every Week" },
  { value: "monthly", label: "Every Month" },
] as const;

function RepeatModal({ job, onClose, onConfirm }: {
  job: Job;
  onClose: () => void;
  onConfirm: (interval: "daily" | "weekly" | "monthly", endsAt: string) => Promise<void>;
}) {
  const [interval, setInterval] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);
  const content = JSON.parse(job.content) as { text: string; title?: string };
  const displayTitle = contentDisplayTitle(content);

  async function submit() {
    setSaving(true);
    try { await onConfirm(interval, endsAt); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card p-6 w-95 max-w-[calc(100vw-32px)]">
        <h3 className="type-body-sb-m text-fg mb-1">Repeat this post</h3>
        <p className="type-body-r-s text-neutral-500 mb-5 line-clamp-2">{displayTitle}</p>

        <label className="section-label">Frequency</label>
        <div className="flex gap-2 mt-2 mb-5">
          {REPEAT_OPTIONS.map(opt => (
            <button key={opt.value} type="button" onClick={() => { setInterval(opt.value); setEndsAt(""); }}
              className={cn("chip flex-1 justify-center py-2 rounded-xl type-body-sb-s", interval === opt.value ? "chip-active" : "bg-bg")}>
              {opt.label}
            </button>
          ))}
        </div>

        <div className="mb-6">
          <DatePicker
            value={endsAt}
            onChange={setEndsAt}
            min={minKeyForInterval(interval)}
            placeholder="End date (optional)"
          />
        </div>

        <div className="flex gap-2.5">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="btn-primary flex-1">
            {saving ? "Starting…" : "Start repeating"}
          </button>
        </div>
      </div>
    </div>
  );
}

function JobCard({ job, onEdit, onDelete, onRetry, onDuplicate, onRepeat, selected, onToggleSelect, canReview, canSubmitOwn, canEditContentAccess = true, isOwn, onReview, onSubmitOwn }: {
  job: Job;
  onEdit: () => void;
  onDelete: () => void;
  onRetry: () => Promise<void>;
  onDuplicate: () => void;
  onRepeat: () => void;
  selected?: boolean;
  onToggleSelect?: () => void;
  canReview?: boolean;
  canSubmitOwn?: boolean;
  canEditContentAccess?: boolean;
  isOwn?: boolean;
  onReview?: () => void;
  onSubmitOwn?: () => void;
}) {
  const [retrying, setRetrying] = useState(false);
  const [analytics, setAnalytics] = useState<Record<string, AnalyticsResult | "loading" | "error">>({});
  const content = JSON.parse(job.content) as { text: string; title?: string; mediaUrls?: string[] };
  const displayTitle = contentDisplayTitle(content);
  const isDraft = job.status === "draft";
  const scheduled = job.scheduledFor ? new Date(job.scheduledFor) : null;
  const isPast = scheduled ? scheduled < new Date() : false;
  const isToday = scheduled ? wibDateKey(scheduled) === wibDateKey(new Date()) : false;
  // Marketing (canSubmitOwn) loses edit once the post is approved and scheduled
  const canEdit = isDraft || (job.status === "pending" && !canSubmitOwn);
  const missing = isDraft && canSubmitOwn
    ? missingForReview({
        scheduledFor: job.scheduledFor,
        content: job.content,
        targetPlatforms: job.targets.map((t) => t.account?.platform).filter((p): p is string => !!p),
      })
    : [];
  const hasFailedTargets = job.targets.some((t) => t.status === "post_failed");
  const reviewable = !!canReview && !!onReview && isDraft && job.approvalStatus === "pending";

  function formatScheduled() {
    if (!scheduled) return "No date set";
    if (isToday) return `Today at ${formatTime(scheduled)} WIB`;
    return `${formatDateTime(scheduled)} WIB`;
  }

  return (
    <div
      className={cn("job-card group rounded-2xl overflow-hidden",
        selected ? "bg-brand-100 outline outline-brand-400" : "bg-surface",
        reviewable && "cursor-pointer")}
      // In-review cards open the full review; inner controls keep their own behaviour
      onClick={reviewable ? (e) => {
        if ((e.target as HTMLElement).closest("button, input, a, video")) return;
        onReview?.();
      } : undefined}
    >
      <div className="p-5">

        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          {onToggleSelect && (
            <div className={cn("shrink-0 mt-1 transition-opacity", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
              <input
                type="checkbox"
                checked={!!selected}
                onChange={(e) => { e.stopPropagation(); onToggleSelect(); }}
                onClick={(e) => e.stopPropagation()}
                className="w-3.5 h-3.5 rounded-sm cursor-pointer accent-brand-600"
              />
            </div>
          )}
          <div className="flex items-center gap-1.5 mt-0.5 shrink-0">
            {job.targets.map((t) => (
              <span key={t.id} title={`${t.account?.displayName ?? t.accountId} (${t.account?.platform ?? "unknown"})`}
                className="relative shrink-0">
                {t.account?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.account.avatarUrl} alt={t.account.displayName}
                    className="w-7 h-7 rounded-full object-cover border border-border" />
                ) : (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center type-body-sb-xs bg-bg border border-border text-muted">
                    {t.account?.displayName?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  <PlatformIcon platform={t.account?.platform ?? "unknown"} size={11} />
                </span>
              </span>
            ))}
          </div>

          <div className="flex-1 min-w-0">
            <p className="type-body-m-s line-clamp-2 text-fg">{displayTitle}</p>
            {job.commentText && (
              <p className="mt-1 type-body-r-xs flex items-start gap-1 text-muted">
                <span>↳</span><span className="italic line-clamp-1">{job.commentText}</span>
              </p>
            )}
            {missing.length > 0 && job.approvalStatus !== "pending" && (
              <p className="mt-1.5 inline-flex rounded-lg border border-brand-400 bg-brand-100 px-2 py-1 type-body-m-xs text-brand-800">
                Missing: {missing.map((m) => MISSING_LABEL[m]).join(", ")}
              </p>
            )}
            {isDraft && job.approvalStatus === "rejected" && job.reviewNote && (
              <p className="mt-1.5 type-body-r-xs rounded-lg px-2 py-1.5 bg-red-50 text-red-600 border border-red-200">
                <span className="type-body-sb-xs">Design review:</span> {job.reviewNote}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <StatusBadge status={job.status} />
              {isDraft && job.approvalStatus && (
                <ApprovalChip approvalStatus={job.approvalStatus} reviewedBy={job.reviewedBy} />
              )}
              {job.repeatInterval && (
                <span title={`Repeats ${job.repeatInterval}${job.repeatParentId ? " (chain)" : ""}`}
                  className="type-body-sb-xs px-2 py-px rounded-full bg-brand-100 text-brand-800 border border-brand-300">
                  🔁 {job.repeatInterval}
                </span>
              )}
              {canEditContentAccess && hasFailedTargets && (
                <button
                  onClick={async () => { setRetrying(true); try { await onRetry(); } finally { setRetrying(false); } }}
                  disabled={retrying}
                  className="job-action-btn text-red-600" title="Retry failed platforms">
                  <svg className={`w-3.5 h-3.5${retrying ? " animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
              {canEditContentAccess && canEdit && (
                <button onClick={onEdit} className="job-action-btn" title="Edit post">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              {reviewable && (
                <button onClick={onReview} title="Open the full post to approve or reject"
                  className="btn-primary px-2.5 py-1 rounded-lg type-body-sb-xs">
                  Review
                </button>
              )}
              {canSubmitOwn && isOwn && isDraft && (job.approvalStatus === null || job.approvalStatus === undefined || job.approvalStatus === "rejected") && (
                <button onClick={onSubmitOwn} disabled={missing.length > 0}
                  className="job-action-btn text-brand-800 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={missing.length > 0 ? `Missing: ${missing.map((m) => MISSING_LABEL[m]).join(", ")}` : "Send for Design Approval"}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              )}
              {canEditContentAccess && (
                <button onClick={onDuplicate} className="job-action-btn" title="Duplicate post">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              )}
              {canEditContentAccess && (job.status === "done" || job.status === "comment_done") && !job.repeatInterval && (
                <button onClick={onRepeat} className="job-action-btn" title="Repeat this post">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
                    <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                    <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                  </svg>
                </button>
              )}
              {canEditContentAccess && (
                <button onClick={onDelete} className="job-action-btn job-action-btn--danger" title="Delete post">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
            {job.dryRun && (
              <span className="type-body-sb-xxs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">dry run</span>
            )}
          </div>
        </div>

        {/* Media thumbnails */}
        {content.mediaUrls && content.mediaUrls.length > 0 && job.status !== "done" && (
          <div className="flex gap-2 mt-3">
            {content.mediaUrls.slice(0, 4).map((url, i) => {
              const src = url.startsWith("http") ? url : `${API_BASE}${url}`;
              const isVideo = /\.(mp4|mov|webm|quicktime)(\?|$)/i.test(url);
              return isVideo ? (
                <video key={i} src={src} className="w-14 h-14 rounded-xl object-cover border border-border"
                  muted playsInline preload="metadata" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt="" className="w-14 h-14 rounded-xl object-cover border border-border" />
              );
            })}
          </div>
        )}
        {content.mediaUrls && content.mediaUrls.length > 0 && job.status === "done" && (
          <div className="flex gap-1.5 mt-3">
            <span className="inline-flex items-center gap-1 type-body-r-xs px-2 py-0.5 rounded-lg bg-bg text-muted border border-border">
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
          <svg className="w-3.5 h-3.5 shrink-0 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className={cn("type-body-r-xs", isPast ? "text-neutral-500" : "text-muted")}>{formatScheduled()}</span>
        </div>
      </div>

      {/* Target breakdown — smooth expand on hover */}
      {job.targets.length > 0 && (
        <div className={`job-card-targets ${job.targets.some((t) => t.error) ? "force-open" : ""}`}>
          <div className="job-card-targets-inner border-t border-border">
            <div className="px-5 py-3 space-y-1.5">
              {job.targets.map((t) => {
                const platform = t.account?.platform ?? "";
                const isPublished = ["done", "post_done", "comment_done"].includes(t.status);
                const canFetchAnalytics = isPublished && !!t.platformPostId && ANALYTICS_PLATFORMS.has(platform);
                const analytic = analytics[t.id];

                async function fetchAnalytics() {
                  setAnalytics(prev => ({ ...prev, [t.id]: "loading" }));
                  try {
                    const data = await apiFetch<AnalyticsResult>(`/jobs/targets/${t.id}/analytics`);
                    setAnalytics(prev => ({ ...prev, [t.id]: data }));
                  } catch {
                    setAnalytics(prev => ({ ...prev, [t.id]: "error" }));
                  }
                }

                return (
                  <div key={t.id} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 type-body-r-xs">
                      <PlatformIcon platform={platform || "unknown"} size={13} />
                      <span className="type-body-m-xs text-muted">{t.account?.displayName ?? t.accountId.slice(0, 8)}</span>
                      <StatusBadge status={t.status} />
                      {t.attempts > 1 && <span className="text-neutral-500">{t.attempts} attempts</span>}
                      {t.error && <span className="text-red-600 truncate flex-1">{t.error}</span>}
                      {canFetchAnalytics && !analytic && (
                        <button onClick={fetchAnalytics} className="ml-auto type-body-sb-xxs px-2 py-0.5 rounded-md transition-colors text-muted border border-border bg-bg hover:text-fg">
                          Stats
                        </button>
                      )}
                      {analytic === "loading" && <span className="ml-auto type-body-r-xxs text-neutral-500">Loading…</span>}
                      {analytic === "error" && <span className="ml-auto type-body-r-xxs text-red-600">Failed</span>}
                    </div>
                    {analytic && analytic !== "loading" && analytic !== "error" && (
                      <div className="flex items-center gap-3 pl-5 type-body-r-xxs text-muted">
                        {analytic.likes !== undefined && <span>❤ {analytic.likes}</span>}
                        {analytic.reposts !== undefined && <span>🔁 {analytic.reposts}</span>}
                        {analytic.replies !== undefined && <span>💬 {analytic.replies}</span>}
                        {analytic.views !== undefined && <span>👁 {analytic.views}</span>}
                        <button onClick={fetchAnalytics} title="Refresh" className="ml-auto text-neutral-500 hover:text-fg">↻</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type ViewTab = "list" | "calendar";

// Sorting a non-default order needs every post loaded; stop auto-loading here
const SORT_LOAD_CAP = 1000;

export default function JobsPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [viewTab, setViewTab] = useState<ViewTab>("list");
  const [filter, setFilter] = useState<FilterTab>("all");
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [deletingJob, setDeletingJob] = useState<Job | null>(null);
  const [repeatingJob, setRepeatingJob] = useState<Job | null>(null);
  const [reviewingJob, setReviewingJob] = useState<Job | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [sort, setSort] = useState<JobSort>(DEFAULT_SORT);
  // Chip counts from the server (full data); null until the first response
  const [serverCounts, setServerCounts] = useState<JobCounts | null>(null);
  // Platforms ever seen — the platform chips must not shrink when the list is filtered by platform
  const [knownPlatforms, setKnownPlatforms] = useState<string[]>([]);

  // Design-approval flow — owner/admin/designer review; members submit for review
  const role = activeWorkspace?.role ?? user?.role;
  const canReview = roleCanReview(role);
  const canSubmitOwn = (activeWorkspace?.approvalRequired ?? false) && !canReview;
  const canEditContentAccess = canEditContent(role);
  // Review-only roles never create drafts, so they get no Drafts tab
  const showDraftTab = canEditContentAccess;
  // Admin/owner move any draft or scheduled post. Marketing moves its own posts until
  // they are approved (draft / in review / rejected); approved posts are locked.
  const canRescheduleJob = (j: Job) => {
    if (!canEditContentAccess) return false;
    if (canSubmitOwn) return j.status === "draft" && !!user && j.userId === user.id;
    return j.status === "pending" || j.status === "draft";
  };

  // Bulk select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleteType, setBulkDeleteType] = useState<"selected" | "draft" | "pending" | "done" | "failed">("selected");
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);

  useEffect(() => {
    apiFetch<Account[]>("/accounts").then(setAccounts).catch(() => {});
    // Design references for the edit and review dialogs
    apiFetch<{ templates: DesignTemplate[] }>("/templates").then((d) => setTemplates(d.templates)).catch(() => {});
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

  async function bulkDelete(ids: string[]) {
    setBulkDeleting(true);
    try {
      const res = await apiFetch("/jobs/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const { deleted } = res as { deleted: number };
      setJobs(prev => prev.filter(j => !ids.includes(j.id)));
      setSelectedIds(new Set());
      success(`Deleted ${deleted} post${deleted !== 1 ? "s" : ""}.`);
    } catch {
      // fallback: individual deletes for partial success
      let deleted = 0;
      for (const id of ids) {
        try { await apiFetch(`/jobs/${id}`, { method: "DELETE" }); deleted++; } catch {}
      }
      setJobs(prev => prev.filter(j => !ids.includes(j.id)));
      setSelectedIds(new Set());
      success(`Deleted ${deleted} post${deleted !== 1 ? "s" : ""}.`);
    } finally {
      setBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
    }
  }

  async function retryFailed(jobId: string) {
    try {
      await apiFetch(`/jobs/${jobId}/retry-failed`, { method: "POST" });
      success("Retrying failed platforms…");
    } catch (err) { toastError(String(err)); }
  }

  // ─── Design-approval actions ──────────────────────────────────────────────

  function applyJobUpdate(updated: Job) {
    setJobs(prev => prev.map(j => j.id === updated.id ? { ...j, ...updated } : j));
  }

  async function approveJob(job: Job) {
    const requested = job.scheduledFor ? new Date(job.scheduledFor) : null;
    // Keep the creator's requested time, or schedule 5 minutes from now.
    const when = requested && requested > new Date() ? requested.toISOString() : new Date(Date.now() + 5 * 60_000).toISOString();
    try {
      const updated = await apiFetch<Job>(`/jobs/${job.id}/schedule`, {
        method: "POST",
        body: JSON.stringify({ scheduledFor: when }),
      });
      applyJobUpdate(updated);
      success("Approved — post is scheduled.");
      window.dispatchEvent(new CustomEvent("ph:post-scheduled"));
    } catch (err) { toastError(String(err)); throw err; }
  }

  async function rejectJob(job: Job, note: string) {
    try {
      const updated = await apiFetch<Job>(`/jobs/${job.id}/reject`, {
        method: "POST",
        body: JSON.stringify({ note }),
      });
      applyJobUpdate(updated);
      success("Rejected — sent back to the creator with your note.");
    } catch (err) { toastError(String(err)); throw err; }
  }

  async function submitForReview(job: Job) {
    try {
      const updated = await apiFetch<Job>(`/jobs/${job.id}/submit`, { method: "POST" });
      applyJobUpdate(updated);
      success("Sent for design review — waiting for approval.");
    } catch (err) { toastError(String(err)); }
  }

  async function submitSelectedForReview() {
    const ids = [...selectedIds];
    try {
      const res = await apiFetch<{ submitted: string[]; skipped: { id: string; title: string; reason: string; missing?: MissingField[] }[] }>(
        "/jobs/submit-bulk", { method: "POST", body: JSON.stringify({ ids }) });
      if (res.submitted.length > 0) {
        setJobs(prev => prev.map(j => res.submitted.includes(j.id) ? { ...j, approvalStatus: "pending", reviewNote: null } : j));
        success(`Sent ${res.submitted.length} for design review.`);
      }
      if (res.skipped.length > 0) {
        const first = res.skipped[0];
        const why = first.missing ? `missing ${first.missing.map(m => MISSING_LABEL[m]).join(", ")}` : first.reason.toLowerCase();
        toastError(`Skipped ${res.skipped.length}: "${first.title}" ${why}${res.skipped.length > 1 ? " and more" : ""}.`);
      }
      clearSelection();
    } catch (err) { toastError(String(err)); }
  }

  function duplicateJob(job: Job) {
    const content = JSON.parse(job.content) as {
      text: string;
      title?: string;
      mediaType?: "post" | "reel" | "story";
      youtubeType?: "short" | "video";
      youtubeVideoMode?: "upload" | "url";
      youtubeVideoUrl?: string;
      perAccount?: Record<string, { text?: string; commentText?: string }>;
      pillar?: string | null;
      category?: string | null;
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
      ...(content.title ? { title: content.title } : {}),
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
      ...toContentType(content.pillar, content.category),
    }));
    router.push("/compose");
  }

  async function startRepeat(job: Job, interval: "daily" | "weekly" | "monthly", endsAt: string) {
    const content = JSON.parse(job.content) as { text: string; mediaUrls?: string[]; mediaType?: string; perAccount?: Record<string, unknown>; pillar?: string | null; category?: string | null };
    const type = toContentType(content.pillar, content.category);
    const next = new Date();
    if (interval === "daily")   next.setDate(next.getDate() + 1);
    if (interval === "weekly")  next.setDate(next.getDate() + 7);
    if (interval === "monthly") next.setMonth(next.getMonth() + 1);
    next.setSeconds(0, 0);
    await apiFetch("/jobs", {
      method: "POST",
      body: JSON.stringify({
        content: { text: content.text, mediaUrls: content.mediaUrls ?? [], mediaType: content.mediaType, ...(type.pillar || type.category ? type : {}) },
        commentText: job.commentText ?? undefined,
        accountIds: job.targets.map(t => t.accountId),
        scheduledFor: next.toISOString(),
        mediaUrls: content.mediaUrls ?? [],
        mediaType: content.mediaType,
        perAccount: content.perAccount,
        repeatInterval: interval,
        ...(endsAt ? { repeatEndsAt: new Date(endsAt).toISOString() } : {}),
      }),
    });
    setRepeatingJob(null);
    success("Repeat chain started — next post scheduled.");
    // Fetch without resetting list — merge new job in
    apiFetch<{ items: Job[] }>(`/jobs?limit=50${filter !== "all" ? `&status=${filter}` : ""}`).then(data => {
      setJobs(prev => {
        const existingIds = new Set(prev.map(j => j.id));
        const incoming = data.items.map(d => {
          const existing = prev.find(j => j.id === d.id);
          return existing ? { ...existing, ...d } : d;
        });
        const newOnes = data.items.filter(d => !existingIds.has(d.id));
        return [...incoming.filter(d => existingIds.has(d.id)), ...newOnes];
      });
    }).catch(() => {});
  }

  async function updateJob(jobId: string, text: string, commentText: string, scheduledFor: Date, mediaUrls: string[], accountIds: string[], perAccount: Record<string, PerAccountOverride>, mediaType?: "post" | "reel" | "story", youtubeType?: "short" | "video", youtubeVideoMode?: "upload" | "url", youtubeVideoUrl?: string, isDraft?: boolean, youtubeThumbnailUrl?: string, pixelfedSensitive?: boolean, pixelfedVisibility?: "public" | "unlisted" | "private", youtubeVisibility?: "public" | "unlisted" | "private", youtubeTags?: string[], youtubeMadeForKids?: boolean, linkedinVisibility?: "PUBLIC" | "CONNECTIONS", blueskyContentWarning?: string, contentType?: ContentType, title?: string, send?: boolean) {
    try {
      // Always patch content/accounts first
      await apiFetch(`/jobs/${jobId}`, {
        method: "PATCH",
        body: JSON.stringify({
          text,
          ...(title !== undefined ? { title } : {}),
          commentText,
          // Drafts keep their date too — it is the requested post date
          scheduledFor: scheduledFor.toISOString(),
          mediaUrls,
          mediaType,
          // An imported draft can still have no account; the API requires at least one when sent
          ...(accountIds.length > 0 ? { accountIds } : {}),
          ...(youtubeType ? { youtubeType } : {}),
          ...(youtubeVideoMode ? { youtubeVideoMode } : {}),
          ...(youtubeVideoUrl !== undefined ? { youtubeVideoUrl } : {}),
          ...(youtubeThumbnailUrl !== undefined ? { youtubeThumbnailUrl } : {}),
          ...(pixelfedSensitive !== undefined ? { pixelfedSensitive } : {}),
          ...(pixelfedVisibility !== undefined ? { pixelfedVisibility } : {}),
          ...(youtubeVisibility !== undefined ? { youtubeVisibility } : {}),
          ...(youtubeTags !== undefined ? { youtubeTags } : {}),
          ...(youtubeMadeForKids !== undefined ? { youtubeMadeForKids } : {}),
          ...(linkedinVisibility !== undefined ? { linkedinVisibility } : {}),
          ...(blueskyContentWarning !== undefined ? { blueskyContentWarning } : {}),
          ...(contentType ? { pillar: contentType.pillar, category: contentType.category } : {}),
          ...(Object.keys(perAccount).length > 0 ? { perAccount } : { perAccount: {} }),
        }),
      });
      // Drafts: Marketing saves, or saves and sends for design approval (the API checks
      // the required fields); owner/admin/designer promote straight to the schedule.
      if (isDraft) {
        if (canSubmitOwn) {
          if (send) await apiFetch(`/jobs/${jobId}/submit`, { method: "POST" });
        } else {
          await apiFetch(`/jobs/${jobId}/schedule`, {
            method: "POST",
            body: JSON.stringify({ scheduledFor: scheduledFor.toISOString() }),
          });
        }
      }
      const updated = await apiFetch<Job>(`/jobs/${jobId}`);
      setJobs((prev) => prev.map((j) => j.id === jobId ? updated : j));
      success(isDraft ? (canSubmitOwn ? (send ? "Sent for design review." : "Draft saved.") : "Draft scheduled!") : "Post updated.");
    } catch (err) { toastError(String(err)); throw err; }
  }

  // Initial load + filter change
  const loadJobs = useCallback(async (statusFilter: FilterTab, platform: string, cursor?: string) => {
    const isFirstPage = !cursor;
    if (isFirstPage) setLoading(true); else setLoadingMore(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (platform !== "all") params.set("platform", platform);
      if (cursor) params.set("cursor", cursor);
      const data = await apiFetch<{ items: Job[]; nextCursor: string | null; hasMore: boolean }>(`/jobs?${params}`);
      if (isFirstPage) {
        setJobs(data.items);
      } else {
        setJobs(prev => [...prev, ...data.items]);
      }
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
      setLastRefresh(new Date());
      setError(null);
    } catch {
      setError("Failed to load posts");
    } finally {
      if (isFirstPage) setLoading(false); else setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setNextCursor(null);
    setHasMore(false);
    loadJobs(filter, platformFilter);
  }, [filter, platformFilter, loadJobs]);

  // Infinite scroll sentinel
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && nextCursor) {
        loadJobs(filter, platformFilter, nextCursor);
      }
    }, { threshold: 0.1 });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, nextCursor, filter, platformFilter, loadJobs]);

  // A non-default sort is only correct over the whole list, so keep paging until
  // everything is loaded (capped). The default order matches the server order and scrolls lazily.
  useEffect(() => {
    if (sort === DEFAULT_SORT || loading || loadingMore || !hasMore || !nextCursor) return;
    if (jobs.length >= SORT_LOAD_CAP) return;
    loadJobs(filter, platformFilter, nextCursor);
  }, [sort, loading, loadingMore, hasMore, nextCursor, jobs.length, filter, platformFilter, loadJobs]);

  // Chip counts come from the server over ALL visible posts (platform filter only),
  // never from the loaded/filtered list. Refetch when a post's bucket may have changed.
  const bucketSignature = jobs.map((j) => `${j.id}:${j.status}:${j.approvalStatus ?? ""}`).join("|");
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      const qs = platformFilter !== "all" ? `?platform=${encodeURIComponent(platformFilter)}` : "";
      apiFetch<JobCounts>(`/jobs/counts${qs}`)
        .then((c) => { if (!cancelled) setServerCounts(c); })
        .catch(() => {});
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [platformFilter, bucketSignature]);

  // Remember every platform seen so the platform chips stay put while filtering
  useEffect(() => {
    const seen = jobs.flatMap((j) => j.targets.map((t) => t.account?.platform).filter(Boolean) as string[]);
    setKnownPlatforms((prev) => {
      const next = Array.from(new Set([...prev, ...seen]));
      return next.length === prev.length ? prev : next;
    });
  }, [jobs]);

  // SSE for live status updates on visible jobs — merges status changes only
  useEffect(() => {
    let es: EventSource;

    async function connect() {
      try {
        const res = await fetch(`${API_BASE}/auth/session`, { credentials: "include" });
        if (!res.ok) return;
        const { token } = await res.json() as { token: string; user: unknown };
        es = new EventSource(`${API_BASE}/jobs/stream?token=${encodeURIComponent(token)}`);

        es.onmessage = (e: MessageEvent<string>) => {
          try {
            const data = JSON.parse(e.data) as Job[] | { error: string };
            if (!Array.isArray(data)) return;
            // Merge status updates into existing list — don't replace
            setJobs(prev => prev.map(j => {
              const updated = data.find(d => d.id === j.id);
              return updated
                ? { ...j, status: updated.status, targets: updated.targets, approvalStatus: updated.approvalStatus, reviewNote: updated.reviewNote }
                : j;
            }));
            // Add any new jobs from SSE (e.g. just created) that aren't in list yet
            setJobs(prev => {
              const existingIds = new Set(prev.map(j => j.id));
              const newJobs = data.filter(d => !existingIds.has(d.id));
              return newJobs.length ? [...prev, ...newJobs] : prev;
            });
            setLastRefresh(new Date());
            setError(null);
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

  // Server counts cover every post; until they arrive, count whatever is loaded
  const counts: JobCounts = serverCounts ?? countJobs(jobs, platformFilter);

  const allPlatforms = knownPlatforms;

  // Bulk select helpers
  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const selectAll = (ids: string[]) => setSelectedIds(new Set(ids));
  const clearSelection = () => setSelectedIds(new Set());

  // IDs to delete based on bulkDeleteType
  const getBulkDeleteIds = (): string[] => {
    if (bulkDeleteType === "selected") return [...selectedIds];
    const statusMap: Record<string, string[]> = {
      draft: ["draft"],
      pending: ["pending", "running"],
      done: ["done", "comment_done", "post_done"],
      failed: ["failed", "post_failed", "comment_failed"],
    };
    const statuses = statusMap[bulkDeleteType] ?? [];
    return jobs.filter(j => statuses.includes(j.status)).map(j => j.id);
  };

  const filteredJobs = jobs.filter((j) => matchesFilter(j, filter, platformFilter));

  // Sorting only reorders inside each section; it never changes which posts are shown or counted
  const drafts = sortJobs(filteredJobs.filter((j) => sectionOf(j) === "draft"), sort, "draft");
  const upcoming = sortJobs(filteredJobs.filter((j) => sectionOf(j) === "upcoming"), sort, "upcoming");
  const past = sortJobs(filteredJobs.filter((j) => sectionOf(j) === "past"), sort, "past");


  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg">
      <TrialUrgentBanner />

      {/* Edit dialog */}
      {editingJob && (
        <EditPostDialog
          open={!!editingJob}
          job={editingJob}
          accounts={accounts}
          templates={templates}
          reviewMode={editingJob.status === "draft" && canSubmitOwn}
          onSave={async (text, commentText, scheduledFor, mediaUrls, accountIds, perAccount, mediaType, youtubeType, youtubeVideoMode, youtubeVideoUrl, youtubeThumbnailUrl, pixelfedSensitive, pixelfedVisibility, youtubeVisibility, youtubeTags, youtubeMadeForKids, linkedinVisibility, blueskyContentWarning, contentType, title, send) => {
            await updateJob(editingJob.id, text, commentText, scheduledFor, mediaUrls, accountIds, perAccount, mediaType, youtubeType, youtubeVideoMode, youtubeVideoUrl, editingJob.status === "draft", youtubeThumbnailUrl, pixelfedSensitive, pixelfedVisibility, youtubeVisibility, youtubeTags, youtubeMadeForKids, linkedinVisibility, blueskyContentWarning, contentType, title, send);
          }}
          onClose={() => setEditingJob(null)}
        />
      )}

      {/* Repeat post modal */}
      {repeatingJob && (
        <RepeatModal
          job={repeatingJob}
          onClose={() => setRepeatingJob(null)}
          onConfirm={(interval, endsAt) => startRepeat(repeatingJob, interval, endsAt)}
        />
      )}

      {/* Full review (approve / reject with note) */}
      {reviewingJob && (
        <ReviewDialog
          job={reviewingJob}
          templates={templates}
          onClose={() => setReviewingJob(null)}
          onApprove={async () => { await approveJob(reviewingJob); setReviewingJob(null); }}
          onReject={async (note) => { await rejectJob(reviewingJob, note); setReviewingJob(null); }}
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

      {/* Bulk delete confirm dialog */}
      {showBulkDeleteConfirm && (() => {
        const ids = getBulkDeleteIds();
        const label = bulkDeleteType === "selected" ? `${ids.length} selected` : `all ${bulkDeleteType} posts (${ids.length})`;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
            <div className="card w-full max-w-sm p-6 shadow-2xl">
              <h3 className="type-body-sb-m mb-2 text-fg">Delete {label}?</h3>
              <p className="type-body-r-s mb-5 text-muted">
                This will permanently delete {ids.length} post{ids.length !== 1 ? "s" : ""}. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowBulkDeleteConfirm(false)} disabled={bulkDeleting}
                  className="btn-secondary flex-1 py-2.5">
                  Cancel
                </button>
                <button onClick={() => bulkDelete(ids)} disabled={bulkDeleting || ids.length === 0}
                  className="btn-danger flex-1 py-2.5">
                  {bulkDeleting ? "Deleting…" : `Delete ${ids.length}`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}


      {/* Top bar */}
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="type-body-sb-l text-fg">Posts</h1>
          <p className="type-body-r-xs mt-0.5 flex items-center gap-1.5 truncate text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block shrink-0" />
            {lastRefresh ? `Live · updated ${formatTime(lastRefresh, { seconds: true })}` : "Connecting…"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canEditContentAccess && (
            <>
              <button onClick={() => router.push("/jobs/import")}
                className="btn-secondary gap-1.5 px-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                <span className="hidden sm:inline">Import Plan</span>
              </button>
              <a href="/compose"
                className="btn-primary gap-1.5 px-3 md:px-4">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">New Post</span>
              </a>
            </>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 md:px-8 py-3 shrink-0 flex-wrap border-b border-border bg-bg">

        <div className="flex gap-0.5 p-1 rounded-xl bg-surface border border-border">
          {([
            { id: "list",     icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>, label: "List" },
            { id: "calendar", icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>, label: "Calendar" },
          ] as { id: ViewTab; icon: React.ReactNode; label: string }[]).map((t) => (
            <button key={t.id} onClick={() => setViewTab(t.id)}
              className={cn("chip px-3 py-1.5", viewTab === t.id ? "chip-active" : "border-transparent")}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {viewTab === "list" && (
          <>
            <div className="h-4 w-px hidden sm:block bg-border" />
            <div className="flex gap-1.5 flex-wrap">
          {([
            { id: "all",     label: "All",       dot: null },
            ...(showDraftTab ? ([{ id: "draft", label: "Drafts",   dot: "bg-neutral-500" }] as const) : []),
            ...(canReview || canSubmitOwn ? ([{ id: "review", label: "In review", dot: "bg-brand-800" }] as const) : []),
            ...(canSubmitOwn ? ([{ id: "rejected", label: "Rejected", dot: "bg-red-500" }] as const) : []),
            { id: "pending", label: "Scheduled",  dot: "bg-accent" },
            { id: "done",    label: "Published",  dot: "bg-green-500" },
            { id: "failed",  label: "Failed",     dot: "bg-red-500" },
          ] as { id: FilterTab; label: string; dot: string | null }[]).map((f) => (
                <button key={f.id} onClick={() => { setFilter(f.id); clearSelection(); }}
                  className={cn("chip px-3 py-1.5 rounded-xl", filter === f.id && "chip-active")}>
                  {f.dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", filter === f.id ? f.dot : "bg-neutral-300")} />}
                  {f.label}
                  <span className="ml-0.5 tabular-nums opacity-60 type-body-sb-xxs">{counts[f.id]}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Platform filter */}
        {allPlatforms.length > 1 && (
          <>
            <div className="h-4 w-px hidden sm:block bg-border" />
            <div className="flex gap-1.5 flex-wrap">
              {(["all", ...allPlatforms] as string[]).map((p) => (
                <button key={p} onClick={() => setPlatformFilter(p)}
                  className={cn("chip px-3 py-1.5 rounded-xl capitalize", platformFilter === p && "chip-active")}>
                  {p !== "all" && <PlatformIcon platform={p} size={12} />}
                  {p === "all" ? "All platforms" : p}
                </button>
              ))}
            </div>
          </>
        )}
        {/* Sort — right end of the toolbar, own row on mobile. Reorders only; counts never change. */}
        {viewTab === "list" && (
          <label className={cn("chip w-full justify-between rounded-xl px-3 py-1.5 sm:ml-auto sm:w-auto",
            sort !== DEFAULT_SORT && "chip-active")}>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h13M3 12h9M3 17h5m8 0V9m0 8l-3-3m3 3l3-3" />
              </svg>
              Sort
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as JobSort)}
              aria-label="Sort posts"
              className="cursor-pointer rounded-md bg-transparent py-0.5 pr-1 type-body-sb-xs text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
              {JOB_SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
        )}
      </div>

      {/* Bulk action bar — content creation roles only */}
      {viewTab === "list" && canEditContentAccess && (
        <div className="flex items-center gap-3 px-4 md:px-8 py-2.5 shrink-0 flex-wrap border-b border-border bg-bg">
          {/* Select all / deselect */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filteredJobs.length > 0 && filteredJobs.every(j => selectedIds.has(j.id))}
              onChange={(e) => e.target.checked ? selectAll(filteredJobs.map(j => j.id)) : clearSelection()}
              className="w-3.5 h-3.5 rounded-sm accent-brand-600 cursor-pointer"
            />
            <span className="type-body-r-xs text-muted">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
            </span>
          </label>

          {selectedIds.size > 0 && (
            <>
              <div className="h-4 w-px bg-border" />
              <button onClick={clearSelection} className="type-body-r-xs text-muted hover:opacity-70 transition-opacity">
                Clear
              </button>
              {canSubmitOwn && (
                <>
                  <div className="h-4 w-px bg-border" />
                  <button onClick={submitSelectedForReview}
                    className="btn-secondary px-3 py-1.5 rounded-lg type-body-sb-xs">
                    Send {selectedIds.size} for review
                  </button>
                </>
              )}
              <div className="h-4 w-px bg-border" />
              <button
                onClick={() => { setBulkDeleteType("selected"); setShowBulkDeleteConfirm(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg type-body-sb-xs transition-colors hover:opacity-80 bg-red-50 text-red-600 border border-red-200">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete {selectedIds.size} selected
              </button>
            </>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="type-body-r-xs text-muted">Delete by type:</span>
            {([
              { type: "draft" as const, label: "Drafts", tone: "bg-surface text-muted border-border", dot: "bg-neutral-500" },
              { type: "pending" as const, label: "Scheduled", tone: "bg-brand-100 text-brand-800 border-brand-400", dot: "bg-accent" },
              { type: "done" as const, label: "Published", tone: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500" },
              { type: "failed" as const, label: "Failed", tone: "bg-red-50 text-red-600 border-red-200", dot: "bg-red-500" },
            ]).map(({ type, label, tone, dot }) => {
              const statusMap: Record<string, string[]> = {
                draft: ["draft"], pending: ["pending", "running"],
                done: ["done", "comment_done", "post_done"],
                failed: ["failed", "post_failed", "comment_failed"],
              };
              const count = jobs.filter(j => statusMap[type]?.includes(j.status)).length;
              if (count === 0) return null;
              return (
                <button
                  key={type}
                  onClick={() => { setBulkDeleteType(type); setShowBulkDeleteConfirm(true); }}
                  className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg type-body-sb-xs border transition-colors hover:opacity-80", tone)}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
                  {label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">

        {error && (
          <div className="type-body-r-s text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">{error}</div>
        )}

        {viewTab === "calendar" && (
          <div className="card shadow-xs p-6">
            {loading
              ? <div className="text-center py-20 type-body-r-s text-muted">Loading…</div>
              : <CalendarView jobs={filteredJobs} onReschedule={reschedule} onEdit={setEditingJob} readOnly={!canEditContentAccess}
                  canReschedule={canRescheduleJob} />
            }
          </div>
        )}

        {viewTab === "list" && (
          <>
            {loading && (
              <div className="space-y-3">
                {[1,2,3].map((i) => (
                  <div key={i} className="rounded-2xl h-28 animate-pulse bg-surface border border-border" />
                ))}
              </div>
            )}

            {!loading && filteredJobs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center px-4">
                {filter === "all" ? (
                  <>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-brand-100 border border-brand-300">
                      <svg className="w-7 h-7 text-brand-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="type-body-sb-m mb-2 text-fg">No posts scheduled yet</p>
                    <p className="type-body-r-s mb-6 max-w-xs text-muted">Schedule your first post and it will appear here. Write once, publish to multiple platforms.</p>
                    <a href="/compose" className="btn-primary px-5 py-2.5">
                      Write your first post →
                    </a>
                  </>
                ) : (
                  <p className="type-body-r-s text-muted">{filter === "review" ? "Nothing waiting for review" : filter === "rejected" ? "No rejected posts" : `No ${filter} posts`}</p>
                )}
              </div>
            )}

            {drafts.length > 0 && (
              <section className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-neutral-500" />
                  <p className="section-label">
                    {filter === "rejected" ? "Rejected" : filter === "review" || !showDraftTab ? "In review" : "Drafts"} · {drafts.length}
                  </p>
                </div>
                <div className="space-y-3">
                  {drafts.map((job) => (
                    <JobCard key={job.id} job={job}
                      onEdit={() => setEditingJob(job)}
                      onDelete={() => setDeletingJob(job)}
                      onRetry={() => retryFailed(job.id)}
                      onDuplicate={() => duplicateJob(job)}
                      onRepeat={() => setRepeatingJob(job)}
                      selected={selectedIds.has(job.id)}
                      onToggleSelect={() => toggleSelect(job.id)}
                      canReview={canReview}
                      canSubmitOwn={canSubmitOwn}
                      canEditContentAccess={canEditContentAccess}
                      isOwn={!!user && job.userId === user.id}
                      onReview={() => setReviewingJob(job)}
                      onSubmitOwn={() => submitForReview(job)} />
                  ))}
                </div>
              </section>
            )}

            {upcoming.length > 0 && (
              <section className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  <p className="section-label">
                    Upcoming · {upcoming.length}
                  </p>
                </div>
                <div className="space-y-3">
                  {upcoming.map((job) => (
                    <JobCard key={job.id} job={job}
                      onEdit={() => setEditingJob(job)}
                      onDelete={() => setDeletingJob(job)}
                      onRetry={() => retryFailed(job.id)}
                      onDuplicate={() => duplicateJob(job)}
                      onRepeat={() => setRepeatingJob(job)}
                      selected={selectedIds.has(job.id)}
                      onToggleSelect={() => toggleSelect(job.id)}
                      canSubmitOwn={canSubmitOwn}
                      canEditContentAccess={canEditContentAccess} />
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-neutral-300" />
                  <p className="section-label">
                    Past · {past.length}
                  </p>
                </div>
                <div className="space-y-3">
                  {past.map((job) => (
                    <JobCard key={job.id} job={job}
                      onEdit={() => setEditingJob(job)}
                      onDelete={() => setDeletingJob(job)}
                      onRetry={() => retryFailed(job.id)}
                      onDuplicate={() => duplicateJob(job)}
                      onRepeat={() => setRepeatingJob(job)}
                      selected={selectedIds.has(job.id)}
                      onToggleSelect={() => toggleSelect(job.id)}
                      canSubmitOwn={canSubmitOwn}
                      canEditContentAccess={canEditContentAccess} />
                  ))}
                </div>
              </section>
            )}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="py-4 text-center">
              {loadingMore && (
                <div className="flex items-center justify-center gap-2 type-body-r-xs text-muted">
                  <div className="w-3 h-3 rounded-full border-2 border-neutral-500 border-t-transparent animate-spin" />
                  Loading more…
                </div>
              )}
              {!hasMore && jobs.length > 0 && !loading && (
                <p className="type-body-r-xs text-neutral-500">— {jobs.length} posts loaded —</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
