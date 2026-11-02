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
      className="review-dialog-backdrop"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <style>{`
        .review-dialog { animation: review-in 160ms ease-out; }
        @keyframes review-in { from { opacity: 0; transform: scale(0.985); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .review-dialog { animation: none; } }
        .review-dialog :focus-visible { outline: 2px solid #5b63d3; outline-offset: 2px; }
      `}</style>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Review post"
        tabIndex={-1}
        className="review-dialog flex flex-col md:flex-row overflow-hidden"
        style={{ background: "#111111", border: "1px solid #2a2a2a", borderRadius: 16, width: "min(1120px, 100%)", height: "min(90vh, 860px)", outline: "none" }}>

        {/* Media stage — the focal point of the review */}
        {media.length > 0 && (
          <div className="flex flex-col md:flex-3 min-h-0 h-[45vh] md:h-auto shrink-0 md:shrink" style={{ borderRight: "1px solid #2a2a2a" }}>
            <MediaStage media={media} index={mediaIndex} onIndexChange={setMediaIndex}
              labels={slidesMatchMedia ? slides.map((sl) => sl.label) : undefined} />
          </div>
        )}

        {/* Details + decision */}
        <div className={`flex flex-col min-h-0 ${media.length > 0 ? "md:flex-2" : "flex-1"}`} style={{ minWidth: 0 }}>
          <div className="flex items-start gap-3 px-5 pt-5 pb-3 shrink-0">
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold leading-snug" style={{ color: "#ededed" }}>
                {content.title?.trim() || "Review post"}
              </h2>
              <p className="text-xs mt-1" style={{ color: "#888" }}>{scheduledLabel}</p>
              {content.category && (
                <p className="text-xs mt-0.5" style={{ color: "#888" }}>
                  {content.category}{content.pillar ? `, ${content.pillar} pillar` : ""}
                </p>
              )}
            </div>
            <button type="button" onClick={onClose} disabled={!!saving} aria-label="Close"
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ color: "#888", border: "1px solid #2a2a2a" }}>✕</button>
          </div>

          <div role="tablist" className="flex gap-1 px-5 shrink-0" style={{ borderBottom: "1px solid #2a2a2a" }}>
            {([["copy", "Copy"], ["preview", "Platform preview"]] as const).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className="px-3 py-2 text-sm font-semibold"
                style={{ color: tab === id ? "#ededed" : "#888", borderBottom: tab === id ? "2px solid #5b63d3" : "2px solid transparent", marginBottom: -1 }}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
            {tab === "copy" ? (
              <div className="space-y-5" style={{ maxWidth: "68ch" }}>
                {category && templates && <DesignReferenceCard template={reference} category={category} />}
                {slides.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold mb-1.5" style={{ color: "#888" }}>Copywriting per slide</h3>
                    <ol className="space-y-1.5">
                      {slides.map((sl, i) => {
                        const active = slidesMatchMedia && i === mediaIndex;
                        return (
                          <li key={i}>
                            <button type="button" disabled={!slidesMatchMedia} onClick={() => setMediaIndex(i)}
                              aria-current={active}
                              className="w-full text-left rounded-xl px-3 py-2.5"
                              style={{ background: active ? "#1a1a1a" : "transparent", border: `1px solid ${active ? "#5b63d3" : "#2a2a2a"}`, cursor: slidesMatchMedia ? "pointer" : "default" }}>
                              <span className="block text-xs font-semibold" style={{ color: active ? "#ededed" : "#888" }}>{sl.label}</span>
                              <span className="block text-sm leading-relaxed whitespace-pre-wrap wrap-break-word mt-0.5" style={{ color: "#ededed" }}>
                                {sl.text.trim() || <span style={{ color: "#888" }}>No copy</span>}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                )}
                <section>
                  <h3 className="text-xs font-semibold mb-1.5" style={{ color: "#888" }}>Caption</h3>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word" style={{ color: "#ededed" }}>
                    {content.text?.trim() || <span style={{ color: "#888" }}>No caption</span>}
                  </p>
                </section>
                {job.commentText && (
                  <section>
                    <h3 className="text-xs font-semibold mb-1.5" style={{ color: "#888" }}>First comment</h3>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word" style={{ color: "#ededed" }}>{job.commentText}</p>
                  </section>
                )}
                {overrides.map((a) => (
                  <section key={a.id}>
                    <h3 className="text-xs font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: "#888" }}>
                      <PlatformIcon platform={a.platform} size={12} /> Caption for {a.displayName}
                    </h3>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word" style={{ color: "#ededed" }}>
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
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                      style={{
                        color: a.id === previewAccount.id ? "#ededed" : "#888",
                        background: a.id === previewAccount.id ? "#1a1a1a" : "transparent",
                        border: `1px solid ${a.id === previewAccount.id ? "#5b63d3" : "#2a2a2a"}`,
                      }}>
                      <PlatformIcon platform={a.platform} size={12} /> {a.displayName}
                    </button>
                  ))}
                </div>
                {limit !== undefined && (
                  <p className="text-xs" style={{ color: previewLength > limit ? "#f87171" : "#888" }}>
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
              <p className="text-sm" style={{ color: "#888" }}>This post has no target accounts.</p>
            )}
          </div>

          {/* Decision footer */}
          <div className="px-5 py-4 shrink-0" style={{ borderTop: "1px solid #2a2a2a", background: "#111111" }}>
            {rejecting ? (
              <div>
                <label htmlFor="review-note" className="text-xs font-semibold" style={{ color: "#888" }}>
                  What should be fixed?
                </label>
                <textarea
                  id="review-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
                  autoFocus
                  rows={3}
                  placeholder="e.g. Replace the header image with the new brand template, and shorten the copy."
                  className="w-full mt-1.5"
                  style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "10px 12px", fontSize: 14, color: "#ededed", resize: "vertical" }}
                />
                <div className="flex gap-2 mt-3">
                  <button type="button" onClick={() => { setRejecting(false); setNote(""); }} disabled={!!saving}
                    className="flex-1 py-2 rounded-xl text-sm"
                    style={{ border: "1px solid #2a2a2a", color: "#888" }}>
                    Cancel
                  </button>
                  <button type="button" onClick={reject} disabled={!!saving || !note.trim()}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold"
                    style={{ background: "#7f1d1d", color: "#fca5a5", opacity: saving || !note.trim() ? 0.6 : 1, cursor: saving || !note.trim() ? "not-allowed" : "pointer" }}>
                    {saving === "reject" ? "Rejecting…" : "Reject & send back"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button type="button" onClick={() => setRejecting(true)} disabled={!!saving}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold"
                  style={{ border: "1px solid #7f1d1d", color: "#fca5a5" }}>
                  Reject & send back
                </button>
                <button type="button" onClick={approve} disabled={!!saving}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-colors hover:bg-gray-100"
                  style={{ backgroundColor: "#ffffff", color: "#0a0a0a", opacity: saving ? 0.7 : 1 }}>
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
