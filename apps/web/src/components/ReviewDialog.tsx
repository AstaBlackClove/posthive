"use client";

import { useEffect, useRef, useState } from "react";
import type { Job } from "../app/jobs/page";
import { PlatformIcon } from "./PlatformIcon";
import { PlatformPreview, PLATFORM_LIMIT, countGraphemes, type Account } from "./PlatformPreview";
import { MediaStage, toMediaItems } from "./MediaStage";
import { formatDateTime } from "../lib/datetime";
import { normalizeCategory } from "../lib/contentTypes";
import { templatesByCategory, type DesignTemplate } from "../lib/templates";
import { DesignReferenceCard } from "./DesignReferenceCard";
import { cn } from "../lib/cn";

const NOTE_MAX = 2000; // matches the /jobs/:id/reject body schema

interface ReviewContent {
  text?: string;
  title?: string;
  mediaUrls?: string[];
  mediaType?: "post" | "reel" | "story";
  youtubeType?: "short" | "video";
  perAccount?: Record<string, { text?: string; commentText?: string }>;
  category?: string;
  pillar?: string | null;
  /** Legacy template-kit posts only; shown read-only. */
  slides?: { label: string; text: string }[];
}

// Full-size review of a post awaiting design approval: large media, full copy and
// per-platform preview, then approve or reject (reject requires a note).
export function ReviewDialog({ job, templates, onClose, onApprove, onReject }: {
  job: Job;
  /** Design templates, to show the reference for the post's category. */
  templates?: DesignTemplate[];
  onClose: () => void;
  onApprove: () => Promise<void>;
  onReject: (note: string) => Promise<void>;
}) {
  const content = (() => { try { return JSON.parse(job.content) as ReviewContent; } catch { return {} as ReviewContent; } })();
  const media = toMediaItems(content.mediaUrls ?? []);
  const slides = content.slides ?? [];
  // Legacy template-kit posts: slide copy lines up with the designs
  const slidesMatchMedia = slides.length > 0 && slides.length === media.length;
  const accounts: Account[] = job.targets.map((t) => ({
    id: t.accountId,
    platform: t.account?.platform ?? "unknown",
    displayName: t.account?.displayName ?? t.accountId.slice(0, 8),
    avatarUrl: t.account?.avatarUrl ?? null,
  }));

  const [mediaIndex, setMediaIndex] = useState(0);
  const [tab, setTab] = useState<"copy" | "preview">("copy");
  const [previewAccountId, setPreviewAccountId] = useState(accounts[0]?.id ?? "");
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState<"approve" | "reject" | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const previewAccount = accounts.find((a) => a.id === previewAccountId) ?? accounts[0];
  const previewText = (previewAccount && content.perAccount?.[previewAccount.id]?.text) || content.text || "";
  const previewComment = (previewAccount && content.perAccount?.[previewAccount.id]?.commentText) || job.commentText || "";
  const limit = previewAccount ? PLATFORM_LIMIT[previewAccount.platform] : undefined;
  const previewLength = countGraphemes(previewText);
  const overrides = accounts.filter((a) => content.perAccount?.[a.id]?.text?.trim());
  const category = normalizeCategory(content.category);
  const reference = category && templates ? templatesByCategory(templates).get(category) : undefined;

  useEffect(() => { dialogRef.current?.focus(); }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, onClose]);

  async function approve() {
    setSaving("approve");
    try { await onApprove(); } catch { /* toast already shown; keep the dialog open */ } finally { setSaving(null); }
  }

  async function reject() {
    if (!note.trim()) return;
    setSaving("reject");
    try { await onReject(note.trim()); } catch { /* keep the note so it can be resent */ } finally { setSaving(null); }
  }

  const scheduled = job.scheduledFor ? new Date(job.scheduledFor) : null;
  const scheduledLabel = scheduled && scheduled.getTime() > 0 ? `Requested for ${formatDateTime(scheduled)} WIB` : "No time requested";

  return (
    <div
      className="review-dialog-backdrop fixed inset-0 z-1000 flex items-center justify-center bg-black/75 p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <style>{`
        .review-dialog { animation: review-in 160ms ease-out; }
        @keyframes review-in { from { opacity: 0; transform: scale(0.985); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .review-dialog { animation: none; } }
        .review-dialog :focus-visible { outline: 2px solid var(--color-brand-800); outline-offset: 2px; }
      `}</style>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Review post"
        tabIndex={-1}
        className="review-dialog card flex flex-col md:flex-row overflow-hidden w-full max-w-280 h-[90vh] max-h-215 outline-none">

        {/* Media stage — the focal point of the review */}
        {media.length > 0 && (
          <div className="flex flex-col md:flex-3 min-h-0 h-[45vh] md:h-auto shrink-0 md:shrink border-r border-border">
            <MediaStage media={media} index={mediaIndex} onIndexChange={setMediaIndex}
              labels={slidesMatchMedia ? slides.map((sl) => sl.label) : undefined} />
          </div>
        )}

        {/* Details + decision */}
        <div className={`flex flex-col min-h-0 min-w-0 ${media.length > 0 ? "md:flex-2" : "flex-1"}`}>
          <div className="flex items-start gap-3 px-5 pt-5 pb-3 shrink-0">
            <div className="flex-1 min-w-0">
              <h2 className="type-body-sb-m text-fg">
                {content.title?.trim() || "Review post"}
              </h2>
              <p className="type-body-r-xs mt-1 text-muted">{scheduledLabel}</p>
              {content.category && (
                <p className="type-body-r-xs mt-0.5 text-muted">
                  {content.category}{content.pillar ? `, ${content.pillar} pillar` : ""}
                </p>
              )}
            </div>
            <button type="button" onClick={onClose} disabled={!!saving} aria-label="Close"
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-border text-muted">✕</button>
          </div>

          <div role="tablist" className="flex gap-1 px-5 shrink-0 border-b border-border">
            {([["copy", "Copy"], ["preview", "Platform preview"]] as const).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={cn("px-3 py-2 type-body-sb-s -mb-px border-b-2",
                  tab === id ? "border-accent text-fg" : "border-transparent text-muted")}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
            {tab === "copy" ? (
              <div className="space-y-5 max-w-[68ch]">
                {category && templates && <DesignReferenceCard template={reference} category={category} />}
                {slides.length > 0 && (
                  <section>
                    <h3 className="type-body-sb-xs mb-1.5 text-muted">Copywriting per slide</h3>
                    <ol className="space-y-1.5">
                      {slides.map((sl, i) => {
                        const active = slidesMatchMedia && i === mediaIndex;
                        return (
                          <li key={i}>
                            <button type="button" disabled={!slidesMatchMedia} onClick={() => setMediaIndex(i)}
                              aria-current={active}
                              className={cn("w-full text-left rounded-xl px-3 py-2.5 border",
                                active ? "border-brand-300 bg-brand-100" : "border-border",
                                slidesMatchMedia ? "cursor-pointer" : "cursor-default")}>
                              <span className={cn("block type-body-sb-xs", active ? "text-brand-800" : "text-muted")}>{sl.label}</span>
                              <span className="block type-body-r-s whitespace-pre-wrap wrap-break-word mt-0.5 text-fg">
                                {sl.text.trim() || <span className="text-muted">No copy</span>}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                )}
                <section>
                  <h3 className="type-body-sb-xs mb-1.5 text-muted">Caption</h3>
                  <p className="type-body-r-s whitespace-pre-wrap wrap-break-word text-fg">
                    {content.text?.trim() || <span className="text-muted">No caption</span>}
                  </p>
                </section>
                {job.commentText && (
                  <section>
                    <h3 className="type-body-sb-xs mb-1.5 text-muted">First comment</h3>
                    <p className="type-body-r-s whitespace-pre-wrap wrap-break-word text-fg">{job.commentText}</p>
                  </section>
                )}
                {overrides.map((a) => (
                  <section key={a.id}>
                    <h3 className="type-body-sb-xs mb-1.5 flex items-center gap-1.5 text-muted">
                      <PlatformIcon platform={a.platform} size={12} /> Caption for {a.displayName}
                    </h3>
                    <p className="type-body-r-s whitespace-pre-wrap wrap-break-word text-fg">
                      {content.perAccount?.[a.id]?.text}
                    </p>
                  </section>
                ))}
              </div>
            ) : previewAccount ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {accounts.map((a) => (
                    <button key={a.id} type="button" onClick={() => setPreviewAccountId(a.id)}
                      aria-pressed={a.id === previewAccount.id}
                      className={cn("chip type-body-m-xs",
                        a.id === previewAccount.id && "chip-active")}>
                      <PlatformIcon platform={a.platform} size={12} /> {a.displayName}
                    </button>
                  ))}
                </div>
                {limit !== undefined && (
                  <p className={cn("type-body-r-xs", previewLength > limit ? "text-red-600" : "text-muted")}>
                    {previewLength.toLocaleString()} / {limit.toLocaleString()} characters
                    {previewLength > limit && " — over the platform limit"}
                  </p>
                )}
                <PlatformPreview
                  account={previewAccount}
                  text={previewText}
                  commentText={previewComment}
                  mediaItems={media}
                  igMediaType={content.mediaType}
                  youtubeType={content.youtubeType}
                />
              </div>
            ) : (
              <p className="type-body-r-s text-muted">This post has no target accounts.</p>
            )}
          </div>

          {/* Decision footer */}
          <div className="px-5 py-4 shrink-0 border-t border-border bg-surface">
            {rejecting ? (
              <div>
                <label htmlFor="review-note" className="type-body-sb-xs text-muted">
                  What should be fixed?
                </label>
                <textarea
                  id="review-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
                  autoFocus
                  rows={3}
                  placeholder="e.g. Replace the header image with the new brand template, and shorten the copy."
                  className="field mt-1.5 py-2.5 resize-y"
                />
                <div className="flex gap-2 mt-3">
                  <button type="button" onClick={() => { setRejecting(false); setNote(""); }} disabled={!!saving}
                    className="btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="button" onClick={reject} disabled={!!saving || !note.trim()}
                    className="btn-danger flex-1">
                    {saving === "reject" ? "Rejecting…" : "Reject & send back"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button type="button" onClick={() => setRejecting(true)} disabled={!!saving}
                  className="btn-secondary flex-1 border-red-200 text-red-600 hover:bg-red-50">
                  Reject & send back
                </button>
                <button type="button" onClick={approve} disabled={!!saving}
                  className="btn-primary flex-1">
                  {saving === "approve" ? "Approving…" : "Approve & schedule"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
