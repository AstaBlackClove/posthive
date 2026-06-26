"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/api";
import { DateTimePicker } from "../components/DateTimePicker";
import { PlatformIcon } from "../components/PlatformIcon";

interface Account {
  id: string;
  platform: string;
  displayName: string;
  avatarUrl: string | null;
}

interface UploadedImage {
  url: string;
  previewUrl: string;
  name: string;
}

const PLATFORM_ICON: Record<string, string> = {
  bluesky: "🦋", threads: "🧵", linkedin: "💼",
};

const PLATFORM_COLOR: Record<string, string> = {
  bluesky: "#0085ff", threads: "#aaaaaa", linkedin: "#0077b5",
};

const PLATFORM_LIMIT: Record<string, number> = {
  bluesky: 300, threads: 500, linkedin: 3000,
};

function countGraphemes(text: string): number {
  try { return [...new Intl.Segmenter().segment(text)].length; }
  catch { return text.length; }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const MAX_IMAGES = 4;

function defaultScheduledFor(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

// Per-platform preview card
function PlatformPreview({ account, text, commentText, images }: {
  account: Account; text: string; commentText: string; images: UploadedImage[];
}) {
  const color = PLATFORM_COLOR[account.platform] ?? "#6b7280";
  const initial = account.displayName[0]?.toUpperCase() ?? "?";
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="rounded-2xl shadow-sm overflow-hidden" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
      {/* Platform header */}
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid #1f1f1f", borderLeft: `3px solid ${color}`, backgroundColor: "#0a0a0a" }}>
        <PlatformIcon platform={account.platform} size={16} />
        <span className="text-xs font-semibold capitalize" style={{ color: color }}>{account.platform}</span>
        <span className="text-xs text-gray-400 ml-auto">{account.displayName}</span>
      </div>

      {/* Post body */}
      <div className="p-4" style={{ backgroundColor: "#111111" }}>
        <div className="flex gap-3">
          {account.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-white"
              style={{ background: color }}>
              {initial}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-sm font-bold text-gray-900">{account.displayName}</span>
              <span className="text-xs text-gray-400">{timeStr}</span>
            </div>
            {text ? (
              <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">{text}</p>
            ) : (
              <p className="text-sm text-gray-300 italic">Start writing your post for a preview…</p>
            )}

            {images.length > 0 && (
              <div className={`mt-2.5 grid gap-1.5 rounded-xl overflow-hidden ${
                images.length === 1 ? "grid-cols-1" :
                images.length === 2 ? "grid-cols-2" :
                images.length === 3 ? "grid-cols-2" : "grid-cols-2"
              }`}>
                {images.slice(0, 4).map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={img.previewUrl} alt=""
                    className={`w-full object-cover ${
                      images.length === 1 ? "h-48" :
                      images.length === 3 && i === 0 ? "h-36 col-span-2" : "h-28"
                    }`} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Engagement bar */}
        <div className="flex items-center gap-4 mt-3 pt-3 text-gray-300" style={{ borderTop: "1px solid #1f1f1f" }}>
          <span className="text-xs flex items-center gap-1">♡ <span>0</span></span>
          <span className="text-xs flex items-center gap-1">↩ <span>Reply</span></span>
          <span className="text-xs flex items-center gap-1">↗ <span>Share</span></span>
        </div>

        {/* Comment preview */}
        {commentText && (
          <div className="mt-3 pt-3 flex gap-2.5" style={{ borderTop: "1px solid #1f1f1f" }}>
            {account.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={account.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                style={{ background: color }}>
                {initial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-gray-700">{account.displayName} </span>
              <span className="text-xs text-gray-400">· first comment</span>
              <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap break-words">{commentText}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ComposePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [text, setText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [scheduledFor, setScheduledFor] = useState(defaultScheduledFor);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch<Account[]>("/accounts")
      .then((data) => { setAccounts(data); setSelectedIds(data.map((a) => a.id)); })
      .finally(() => setLoadingAccounts(false));
  }, []);

  function toggleAccount(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function uploadFiles(files: File[]) {
    if (!files.length) return;
    const toUpload = files.filter((f) => f.type.startsWith("image/")).slice(0, MAX_IMAGES - images.length);
    if (!toUpload.length) return;
    setUploading(true); setUploadError(null);
    for (const file of toUpload) {
      const previewUrl = URL.createObjectURL(file);
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData, credentials: "include" });
        if (!res.ok) { const b = await res.json() as { error: string }; setUploadError(b.error); URL.revokeObjectURL(previewUrl); continue; }
        const { url } = await res.json() as { url: string };
        setImages((prev) => [...prev, { url, previewUrl, name: file.name || "pasted-image" }]);
      } catch { setUploadError("Upload failed — is the API running?"); URL.revokeObjectURL(previewUrl); }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) { uploadFiles(Array.from(e.target.files ?? [])); }
  function handlePaste(e: React.ClipboardEvent) {
    const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    e.preventDefault(); uploadFiles(files);
  }
  function removeImage(i: number) {
    setImages((prev) => { URL.revokeObjectURL(prev[i].previewUrl); return prev.filter((_, j) => j !== i); });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.length === 0) { setError("Select at least one account."); return; }
    setSubmitting(true); setError(null); setSuccess(false);
    try {
      await apiFetch("/jobs", {
        method: "POST",
        body: JSON.stringify({
          scheduledFor: new Date(scheduledFor).toISOString(),
          content: { text, mediaUrls: images.map((i) => i.url) },
          commentText: commentText.trim() || undefined,
          accountIds: selectedIds,
          dryRun,
        }),
      });
      setSuccess(true);
      setText(""); setCommentText(""); setScheduledFor(defaultScheduledFor());
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl)); setImages([]);
    } catch (err) { setError(String(err)); }
    finally { setSubmitting(false); }
  }

  const graphemeCount = countGraphemes(text);
  const selectedAccounts = accounts.filter((a) => selectedIds.includes(a.id));
  const platformLimits = selectedAccounts.map((a) => ({
    platform: a.platform, limit: PLATFORM_LIMIT[a.platform] ?? 300,
    icon: a.platform,
    over: graphemeCount > (PLATFORM_LIMIT[a.platform] ?? 300),
    color: PLATFORM_COLOR[a.platform] ?? "#6b7280",
  }));
  const mostRestrictiveLimit = platformLimits.length > 0 ? Math.min(...platformLimits.map((p) => p.limit)) : 300;
  const overAnyLimit = platformLimits.some((p) => p.over);

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4" style={{ borderBottom: "1px solid #1f1f1f", backgroundColor: "#0a0a0a" }}>
        <div>
          <h1 className="text-lg font-bold text-gray-900">New Post</h1>
          <p className="text-xs text-gray-400 mt-0.5">Write once · schedule across platforms</p>
        </div>
        {!loadingAccounts && accounts.length === 0 && (
          <a href="/accounts" className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg font-medium">
            ⚠️ Connect an account first →
          </a>
        )}
      </div>

      {/* Main area — editor left, previews right */}
      <form onSubmit={handleSubmit} onPaste={handlePaste} className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left — editor */}
        <div className="flex flex-col flex-1 overflow-y-auto min-h-0" style={{ borderRight: "1px solid #1f1f1f", backgroundColor: "#0a0a0a" }}>

          {/* Platform selector */}
          <div className="px-6 pt-4 pb-3" style={{ borderBottom: "1px solid #1f1f1f" }}>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#444" }}>Post to</p>
              {!loadingAccounts && accounts.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: "#444" }}>
                    {selectedIds.length}/{accounts.length} selected
                  </span>
                  <button type="button"
                    onClick={() => {
                      if (selectedIds.length === accounts.length) setSelectedIds([]);
                      else setSelectedIds(accounts.map((a) => a.id));
                    }}
                    className="text-xs font-semibold transition-colors hover:opacity-80"
                    style={{ color: "#5b63d3" }}>
                    {selectedIds.length === accounts.length ? "Deselect all" : "Select all"}
                  </button>
                </div>
              )}
            </div>

            {loadingAccounts ? (
              <div className="flex gap-2">
                {[1,2].map(i => <div key={i} className="h-8 w-32 rounded-xl animate-pulse" style={{ backgroundColor: "#1a1a1a" }} />)}
              </div>
            ) : accounts.length === 0 ? (
              <a href="/accounts" className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80"
                style={{ color: "#5b63d3" }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Connect an account to post
              </a>
            ) : (
              /* Scrollable when many accounts */
              <div className="flex flex-wrap gap-1.5" style={{ maxHeight: 120, overflowY: "auto" }}>
                {/* Group by platform */}
                {Object.entries(
                  accounts.reduce<Record<string, typeof accounts>>((acc, a) => {
                    (acc[a.platform] ??= []).push(a); return acc;
                  }, {})
                ).map(([platform, platformAccounts]) => (
                  <div key={platform} className="flex items-center gap-1.5 flex-wrap">
                    {/* Platform label chip */}
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
                      style={{ backgroundColor: "#111111", color: "#555", border: "1px solid #1f1f1f" }}>
                      <PlatformIcon platform={platform} size={11} />
                    </span>

                    {platformAccounts.map((a) => {
                      const selected = selectedIds.includes(a.id);
                      const color = PLATFORM_COLOR[a.platform] ?? "#6b7280";
                      return (
                        <button key={a.id} type="button" onClick={() => toggleAccount(a.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                          style={selected ? {
                            background: color + "18",
                            border: `1px solid ${color}50`,
                            color: color,
                          } : {
                            background: "#111111",
                            border: "1px solid #2a2a2a",
                            color: "#888",
                          }}>
                          {a.avatarUrl
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={a.avatarUrl} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                            : null}
                          <span className="truncate max-w-[96px]">{a.displayName}</span>
                          {selected && (
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      );
                    })}

                    {/* Divider between platform groups */}
                    <div className="w-px h-5 self-center" style={{ backgroundColor: "#1f1f1f" }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Text editor */}
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#444" }}>Post</span>
              <div className="flex items-center gap-3">
                {platformLimits.map((p) => (
                  <span key={p.platform} className="text-xs font-medium flex items-center gap-1"
                    style={{ color: p.over ? "#ef4444" : graphemeCount > p.limit * 0.8 ? "#f59e0b" : "#555" }}>
                    <PlatformIcon platform={p.icon} size={12} /> {graphemeCount}/{p.limit}
                  </span>
                ))}
              </div>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What do you want to share?"
              required
              rows={8}
              className="w-full resize-none rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition"
              style={overAnyLimit
                ? { borderColor: "#fca5a5", backgroundColor: "#111111", color: "#ededed" }
                : { borderColor: "#1f1f1f", backgroundColor: "#111111", color: "#ededed" }
              }
            />
            {overAnyLimit && (
              <p className="mt-1 text-xs text-red-500">
                {Math.abs(mostRestrictiveLimit - graphemeCount)} chars over the limit for one of your selected platforms
              </p>
            )}
          </div>

          {/* Media + upload row */}
          <div className="px-6 pb-5" style={{ borderBottom: "1px solid #1f1f1f" }}>
            {images.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {images.map((img, i) => (
                  <div key={img.url} className="relative group w-20 h-20 rounded-xl overflow-hidden flex-shrink-0" style={{ border: "1px solid #1f1f1f", backgroundColor: "#1a1a1a" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.previewUrl} alt={img.name} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                      ✕
                    </button>
                  </div>
                ))}
                {images.length < MAX_IMAGES && Array.from({ length: MAX_IMAGES - images.length }).map((_, i) => (
                  <div key={`e-${i}`} className="w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center"
                    style={{ borderColor: "#222", backgroundColor: "#0a0a0a" }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#2a2a2a" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp"
                multiple onChange={handleFileChange} className="hidden" id="image-upload" />
              <label htmlFor="image-upload"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all hover:border-opacity-60 ${uploading ? "opacity-50 pointer-events-none" : ""}`}
                style={{ border: "1px solid #2a2a2a", backgroundColor: "#111111", color: "#888" }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {uploading ? "Uploading…" : images.length > 0 ? `${images.length}/${MAX_IMAGES} photos` : "Add photo"}
              </label>
              {images.length === 0 && (
                <span className="text-xs" style={{ color: "#333" }}>or Ctrl+V to paste</span>
              )}
            </div>
            {uploadError && <p className="mt-2 text-xs text-red-500 rounded-lg px-3 py-2" style={{ backgroundColor: "#1f0a0a", border: "1px solid #3a1a1a" }}>{uploadError}</p>}
          </div>

          {/* First comment */}
          <div className="px-6 pb-6 pt-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#444" }}>First Comment</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: "#555", backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>optional</span>
            </div>
            <p className="text-xs mb-2.5" style={{ color: "#444" }}>Posted as the first reply immediately after your post goes live.</p>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a link, thread continuation, or extra context…"
              rows={3}
              className="w-full resize-none rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition"
              style={{ borderColor: "#1f1f1f", backgroundColor: "#111111", color: "#ededed" }}
            />
          </div>
        </div>

        {/* Right — per-platform previews (fixed 480px) */}
        <div className="w-[480px] flex-shrink-0 flex flex-col overflow-y-auto" style={{ backgroundColor: "#0a0a0a" }}>
          <div className="px-5 pt-5 pb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Preview</p>
          </div>
          <div className="px-5 pb-5 space-y-4 flex-1">
            {selectedAccounts.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed p-10 text-center" style={{ borderColor: "#1f1f1f" }}>
                <p className="text-sm" style={{ color: "#888888" }}>Select an account above to see a preview</p>
              </div>
            ) : (
              selectedAccounts.map((a) => (
                <PlatformPreview
                  key={a.id}
                  account={a}
                  text={text}
                  commentText={commentText}
                  images={images}
                />
              ))
            )}
          </div>
        </div>
      </form>

      {/* Bottom footer bar — full width */}
      <div className="px-8 py-4 flex items-center gap-4" style={{ borderTop: "1px solid #1f1f1f", backgroundColor: "#0a0a0a" }}>
        {/* Dry run toggle */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setDryRun((v) => !v)}>
          <div className={`relative w-9 h-5 rounded-full transition-colors ${dryRun ? "bg-violet-500" : "bg-gray-300"}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full shadow transition-transform ${dryRun ? "translate-x-4" : "translate-x-0.5"}`} style={{ backgroundColor: "#111111" }} />
          </div>
          <span className={`text-xs font-medium ${dryRun ? "text-violet-700" : "text-gray-500"}`}>Dry run</span>
        </div>

        <div className="h-5 w-px" style={{ backgroundColor: "#1f1f1f" }} />

        {/* Schedule datetime */}
        <DateTimePicker value={scheduledFor} onChange={setScheduledFor} />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Errors / success */}
        {error && <p className="text-xs text-red-500 font-medium">⚠️ {error}</p>}
        {success && (
          <a href="/jobs" className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg font-medium">
            ✅ Scheduled — view posts →
          </a>
        )}

        {/* Submit */}
        <button
          type="submit"
          form=""
          disabled={submitting || overAnyLimit || accounts.length === 0}
          onClick={handleSubmit}
          className="px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
          style={{ backgroundColor: "var(--color-accent)" }}
        >
          {submitting ? "Scheduling…" : dryRun ? "Schedule Dry Run" : "Schedule Post"}
        </button>
      </div>
    </div>
  );
}
