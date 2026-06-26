"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/api";

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
  bluesky: "#0085ff", threads: "#000000", linkedin: "#0077b5",
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
    <div className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden bg-white">
      {/* Platform header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100" style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
        <span className="text-base">{PLATFORM_ICON[account.platform] ?? "🌐"}</span>
        <span className="text-xs font-semibold text-gray-600 capitalize">{account.platform}</span>
        <span className="text-xs text-gray-400 ml-auto">{account.displayName}</span>
      </div>

      {/* Post body */}
      <div className="p-4">
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
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-gray-300">
          <span className="text-xs flex items-center gap-1">♡ <span>0</span></span>
          <span className="text-xs flex items-center gap-1">↩ <span>Reply</span></span>
          <span className="text-xs flex items-center gap-1">↗ <span>Share</span></span>
        </div>

        {/* Comment preview */}
        {commentText && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2.5">
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
        const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData });
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
    icon: PLATFORM_ICON[a.platform] ?? "🌐",
    over: graphemeCount > (PLATFORM_LIMIT[a.platform] ?? 300),
    color: PLATFORM_COLOR[a.platform] ?? "#6b7280",
  }));
  const mostRestrictiveLimit = platformLimits.length > 0 ? Math.min(...platformLimits.map((p) => p.limit)) : 300;
  const overAnyLimit = platformLimits.some((p) => p.over);

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200 bg-white">
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
        <div className="flex flex-col flex-1 border-r border-gray-200 overflow-y-auto">

          {/* Platform selector pills */}
          <div className="px-6 pt-5 pb-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Post to</p>
            {loadingAccounts ? (
              <div className="flex gap-2"><div className="h-9 w-28 rounded-xl bg-gray-100 animate-pulse" /></div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {accounts.map((a) => {
                  const selected = selectedIds.includes(a.id);
                  const color = PLATFORM_COLOR[a.platform] ?? "#6b7280";
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAccount(a.id)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all"
                      style={selected ? {
                        background: color + "14",
                        borderColor: color + "60",
                        color: color,
                      } : {
                        background: "#f9fafb",
                        borderColor: "#e5e7eb",
                        color: "#6b7280",
                      }}
                    >
                      {a.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                      ) : (
                        <span className="text-base">{PLATFORM_ICON[a.platform] ?? "🌐"}</span>
                      )}
                      <span className="capitalize">{a.platform}</span>
                      <span className={`text-xs ${selected ? "opacity-60" : "opacity-40"}`}>{a.displayName}</span>
                      {selected && <span className="text-xs ml-0.5">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Text editor */}
          <div className="flex-1 px-6 py-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Post</span>
              <div className="flex items-center gap-3">
                {platformLimits.map((p) => (
                  <span key={p.platform} className="text-xs font-medium flex items-center gap-1"
                    style={{ color: p.over ? "#ef4444" : graphemeCount > p.limit * 0.8 ? "#f59e0b" : "#9ca3af" }}>
                    {p.icon} {graphemeCount}/{p.limit}
                  </span>
                ))}
              </div>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What do you want to share?"
              required
              rows={7}
              className={`w-full resize-none rounded-xl border px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                overAnyLimit ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"
              }`}
            />
            {overAnyLimit && (
              <p className="mt-1 text-xs text-red-500">
                {Math.abs(mostRestrictiveLimit - graphemeCount)} chars over the limit for one of your selected platforms
              </p>
            )}

            {/* Image upload row */}
            <div className="mt-3">
              {images.length > 0 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {images.map((img, i) => (
                    <div key={img.url} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.previewUrl} alt={img.name} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-gray-900/70 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                        ✕
                      </button>
                    </div>
                  ))}
                  {images.length < MAX_IMAGES && Array.from({ length: MAX_IMAGES - images.length }).map((_, i) => (
                    <div key={`e-${i}`} className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50" />
                  ))}
                </div>
              )}

              {images.length < MAX_IMAGES && (
                <div className="flex items-center gap-2">
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple onChange={handleFileChange} className="hidden" id="image-upload" />
                  <label htmlFor="image-upload"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {uploading ? "Uploading…" : `Photo${images.length > 0 ? ` · ${images.length}/${MAX_IMAGES}` : ""}`}
                  </label>
                  <span className="text-xs text-gray-400">or Ctrl+V to paste</span>
                </div>
              )}
              {uploadError && <p className="mt-2 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{uploadError}</p>}
            </div>
          </div>

          {/* First comment */}
          <div className="px-6 pb-6 border-t border-gray-100 pt-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">First Comment</span>
              <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">optional</span>
            </div>
            <p className="text-xs text-gray-400 mb-2">Posted as the first reply immediately after your post goes live.</p>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a link, thread continuation, or extra context…"
              rows={3}
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
        </div>

        {/* Right — per-platform previews (fixed 480px) */}
        <div className="w-[480px] flex-shrink-0 flex flex-col bg-gray-50 overflow-y-auto">
          <div className="px-5 pt-5 pb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Preview</p>
          </div>
          <div className="px-5 pb-5 space-y-4 flex-1">
            {selectedAccounts.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
                <p className="text-gray-400 text-sm">Select an account above to see a preview</p>
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
      <div className="border-t border-gray-200 bg-white px-8 py-4 flex items-center gap-4">
        {/* Dry run toggle */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setDryRun((v) => !v)}>
          <div className={`relative w-9 h-5 rounded-full transition-colors ${dryRun ? "bg-violet-500" : "bg-gray-300"}`}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${dryRun ? "translate-x-4" : "translate-x-0.5"}`} />
          </div>
          <span className={`text-xs font-medium ${dryRun ? "text-violet-700" : "text-gray-500"}`}>Dry run</span>
        </div>

        <div className="h-5 w-px bg-gray-200" />

        {/* Schedule datetime */}
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            required
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

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
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
        >
          {submitting ? "Scheduling…" : dryRun ? "Schedule Dry Run" : "Schedule Post"}
        </button>
      </div>
    </div>
  );
}
