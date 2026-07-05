"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";
import { PlatformPreview, PLATFORM_COLOR, PLATFORM_LIMIT, MAX_IMAGES, countGraphemes } from "./PlatformPreview";
import type { Account, UploadedImage, PerAccountOverride } from "./PlatformPreview";
import { DateTimePicker } from "./DateTimePicker";
import { PlatformIcon } from "./PlatformIcon";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const pad = (n: number) => String(n).padStart(2, "0");
function toLocalInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface EditableJob {
  scheduledFor: string | null;
  status: string;
  content: string;
  commentText: string | null;
  targets: Array<{ accountId: string }>;
}

interface Props {
  open: boolean;
  job: EditableJob;
  accounts: Account[];
  onSave: (text: string, commentText: string, scheduledFor: Date, mediaUrls: string[], accountIds: string[], perAccount: Record<string, PerAccountOverride>, mediaType?: "post" | "reel" | "story", youtubeType?: "short" | "video", youtubeVideoMode?: "upload" | "url", youtubeVideoUrl?: string) => Promise<void>;
  onClose: () => void;
}

export function EditPostDialog({ open, job, accounts, onSave, onClose }: Props) {
  const parsedContent = JSON.parse(job.content) as { text: string; mediaUrls?: string[]; mediaType?: "post" | "reel" | "story"; youtubeType?: "short" | "video"; youtubeVideoMode?: "upload" | "url"; youtubeVideoUrl?: string; perAccount?: Record<string, PerAccountOverride> };

  const [text, setText] = useState(parsedContent.text);
  const [commentText, setCommentText] = useState(job.commentText ?? "");
  const isDraft = job.status === "draft";
  const [scheduledFor, setScheduledFor] = useState(
    job.scheduledFor ? toLocalInput(new Date(job.scheduledFor)) : toLocalInput(new Date(Date.now() + 60 * 60 * 1000))
  );
  const [igMediaType, setIgMediaType] = useState<"post" | "reel" | "story">(parsedContent.mediaType ?? "post");
  const [images, setImages] = useState<UploadedImage[]>(() => {
    const urls = parsedContent.mediaUrls ?? [];
    const ytVideoUrl = parsedContent.youtubeVideoUrl ?? "";
    const isVideo = (u: string) => /\.(mp4|mov|quicktime)$/i.test(u);
    return urls.filter(u => u !== ytVideoUrl && !isVideo(u)).map(url => ({
      url,
      previewUrl: url.startsWith("http") ? url : `${API_BASE}${url}`,
      name: url.split("/").pop() ?? "image",
    }));
  });
  const [video, setVideo] = useState<{ url: string; previewUrl: string; name: string } | null>(() => {
    const urls = parsedContent.mediaUrls ?? [];
    const ytVideoUrl = parsedContent.youtubeVideoUrl ?? "";
    const isVideo = (u: string) => /\.(mp4|mov|quicktime)$/i.test(u);
    const vUrl = urls.filter(u => u !== ytVideoUrl).find(isVideo);
    return vUrl ? { url: vUrl, previewUrl: vUrl.startsWith("http") ? vUrl : `${API_BASE}${vUrl}`, name: vUrl.split("/").pop() ?? "video" } : null;
  });
  const [selectedIds, setSelectedIds] = useState<string[]>(job.targets.map(t => t.accountId));
  const [perAccountOverrides, setPerAccountOverrides] = useState<Record<string, PerAccountOverride>>(parsedContent.perAccount ?? {});

  // YouTube: init title/description from the first YouTube account's override
  const initYtOverride = (() => {
    const ytAccount = job.targets.find(t => accounts.find(a => a.id === t.accountId)?.platform === "youtube");
    const ytText = parsedContent.perAccount?.[ytAccount?.accountId ?? ""]?.text ?? "";
    const parts = ytText.split("\n\n");
    return { title: parts[0] ?? "", description: parts.slice(1).join("\n\n") };
  })();
  const [youtubeTitle, setYoutubeTitle] = useState(initYtOverride.title);
  const [youtubeDescription, setYoutubeDescription] = useState(initYtOverride.description);
  const [youtubeType, setYoutubeType] = useState<"short" | "video">(parsedContent.youtubeType ?? "short");
  const [youtubeVideoMode, setYoutubeVideoMode] = useState<"upload" | "url">(parsedContent.youtubeVideoMode ?? "upload");
  const [youtubeVideoUrl, setYoutubeVideoUrl] = useState(parsedContent.youtubeVideoUrl ?? "");

  // Pinterest: init title/description from the first Pinterest account's override
  const initPinOverride = (() => {
    const pinAccount = job.targets.find(t => accounts.find(a => a.id === t.accountId)?.platform === "pinterest");
    const pinText = parsedContent.perAccount?.[pinAccount?.accountId ?? ""]?.text ?? "";
    const parts = pinText.split("\n\n");
    return { title: parts[0] ?? "", description: parts.slice(1).join("\n\n") };
  })();
  const [pinterestTitle, setPinterestTitle] = useState(initPinOverride.title);
  const [pinterestDescription, setPinterestDescription] = useState(initPinOverride.description);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  function toggleOverride(accountId: string, defaultText: string, defaultComment: string) {
    setPerAccountOverrides(prev => {
      if (accountId in prev) {
        const next = { ...prev };
        delete next[accountId];
        return next;
      }
      return { ...prev, [accountId]: { text: defaultText, commentText: defaultComment } };
    });
  }
  function setOverrideField(accountId: string, field: keyof PerAccountOverride, value: string) {
    setPerAccountOverrides(prev => ({ ...prev, [accountId]: { ...prev[accountId], [field]: value } }));
  }

  function toggleAccount(id: string) {
    const account = accounts.find(a => a.id === id);
    setSelectedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      if (account?.platform === "instagram" && !next.some(sid => accounts.find(a => a.id === sid)?.platform === "instagram")) {
        setIgMediaType("post");
      }
      return next;
    });
  }

  async function uploadFiles(files: File[]) {
    const toUpload = files.filter(f => f.type.startsWith("image/")).slice(0, MAX_IMAGES - images.length);
    if (!toUpload.length) return;
    setUploading(true); setUploadError(null);
    for (const file of toUpload) {
      const previewUrl = URL.createObjectURL(file);
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData, credentials: "include" });
        if (!res.ok) {
          const b = await res.json().catch(() => ({})) as { error?: string };
          setUploadError(b.error ?? "Upload failed");
          URL.revokeObjectURL(previewUrl);
          continue;
        }
        const { url } = await res.json() as { url: string };
        setImages(prev => [...prev, { url, previewUrl, name: file.name }]);
      } catch {
        setUploadError("Upload failed — is the API running?");
        URL.revokeObjectURL(previewUrl);
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadVideo(file: File) {
    setUploading(true); setUploadError(null);
    const previewUrl = URL.createObjectURL(file);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string };
        setUploadError(b.error ?? "Upload failed");
        URL.revokeObjectURL(previewUrl);
      } else {
        const { url } = await res.json() as { url: string };
        setVideo({ url, previewUrl, name: file.name });
      }
    } catch {
      setUploadError("Upload failed — is the API running?");
      URL.revokeObjectURL(previewUrl);
    }
    setUploading(false);
    if (videoInputRef.current) videoInputRef.current.value = "";
  }

  function removeImage(i: number) {
    setImages(prev => {
      const img = prev[i];
      if (img.previewUrl.startsWith("blob:")) URL.revokeObjectURL(img.previewUrl);
      return prev.filter((_, j) => j !== i);
    });
  }

  async function handleSave() {
    const _noPostTextNeeded = selectedIds.length > 0 && selectedIds.every(id => {
      const p = accounts.find(a => a.id === id)?.platform;
      return p === "youtube" || p === "pinterest";
    });
    if ((!text.trim() && !_noPostTextNeeded) || selectedIds.length === 0) return;
    const [dp, tp] = scheduledFor.split("T");
    const [y, mo, d] = dp.split("-").map(Number);
    const [h, m] = (tp ?? "09:00").split(":").map(Number);
    const date = new Date(y, mo - 1, d, h, m);
    if (isNaN(date.getTime())) return;
    const cleanOverrides = Object.fromEntries(
      Object.entries(perAccountOverrides).filter(([id]) => selectedIds.includes(id))
    );
    const hasInstagram = selectedAccounts.some(a => a.platform === "instagram");
    const hasYoutube = selectedAccounts.some(a => a.platform === "youtube");
    // mediaUrls = non-YouTube media (images for other platforms, or uploaded reel video)
    const mediaUrls = video ? [video.url] : images.map(i => i.url);
    setSaving(true); setSaveError(null);
    try {
      await onSave(text.trim(), commentText.trim(), date, mediaUrls, selectedIds, cleanOverrides, hasInstagram ? igMediaType : undefined, hasYoutube ? youtubeType : undefined, hasYoutube ? youtubeVideoMode : undefined, hasYoutube ? (youtubeVideoMode === "url" ? youtubeVideoUrl.trim() : "") : undefined);
      onClose();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message.replace(/^API PATCH.*→ \d+: /, "") : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const selectedAccounts = accounts.filter(a => selectedIds.includes(a.id));
  const instagramSelected = selectedAccounts.some(a => a.platform === "instagram");
  const youtubeAccounts = selectedAccounts.filter(a => a.platform === "youtube");
  const youtubeSelected = youtubeAccounts.length > 0;
  const onlyYoutube = youtubeSelected && selectedAccounts.every(a => a.platform === "youtube");
  const pinterestAccounts = selectedAccounts.filter(a => a.platform === "pinterest");
  const onlyPinterest = pinterestAccounts.length > 0 && selectedAccounts.every(a => a.platform === "pinterest");
  const noPostTextNeeded = selectedAccounts.length > 0 && selectedAccounts.every(a => a.platform === "youtube" || a.platform === "pinterest");
  const youtubeSelectedWithNoVideo = youtubeSelected && (youtubeVideoMode === "upload" ? !video : !youtubeVideoUrl.trim());

  useEffect(() => {
    if (youtubeAccounts.length === 0) return;
    const combined = youtubeDescription ? `${youtubeTitle}\n\n${youtubeDescription}` : youtubeTitle;
    setPerAccountOverrides(prev => {
      const next = { ...prev };
      for (const a of youtubeAccounts) { next[a.id] = { ...next[a.id], text: combined }; }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeTitle, youtubeDescription, selectedIds.join(",")]);

  useEffect(() => {
    if (pinterestAccounts.length === 0) return;
    const combined = pinterestDescription ? `${pinterestTitle}\n\n${pinterestDescription}` : pinterestTitle;
    setPerAccountOverrides(prev => {
      const next = { ...prev };
      for (const a of pinterestAccounts) {
        next[a.id] = { ...next[a.id], text: combined };
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinterestTitle, pinterestDescription, selectedIds.join(",")]);
  const platformLimits = selectedAccounts.filter(a => a.platform !== "youtube" && a.platform !== "pinterest").map(a => {
    const limit = PLATFORM_LIMIT[a.platform] ?? 500;
    const effectiveText = perAccountOverrides[a.id]?.text ?? text;
    const effectiveCount = countGraphemes(effectiveText);
    return { platform: a.platform, limit, effectiveCount, over: effectiveCount > limit };
  });
  const overAnyLimit = platformLimits.some(p => p.over);

  // Twitter link block
  const urlPattern = /https?:\/\/[^\s]+|(?<![a-zA-Z0-9])(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+(?:com|co|io|ai|app|dev|net|org|xyz|me|gg|tv|fm|so|sh|ly|link|pro|studio|online|site|shop|store|tech|club|news|live|blog|media|social|chat|run|tools|uk|us|ca|au|de|fr|jp|br|in|nl|se|no|fi|dk|it|es|pl|ru|id|mx|ar|za|ph|sg|my|th|vn|eg|ng|ke|gh|tz|rw)[/a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=%]*/i;
  const twitterAccounts = selectedAccounts.filter(a => a.platform === "twitter");
  const twitterSelected = twitterAccounts.length > 0;
  const twitterTextHasLink = twitterSelected && twitterAccounts.some(a => urlPattern.test(perAccountOverrides[a.id]?.text ?? text));
  const twitterCommentHasLink = twitterSelected && twitterAccounts.some(a => urlPattern.test(perAccountOverrides[a.id]?.commentText ?? commentText));
  const twitterHasLink = twitterTextHasLink || twitterCommentHasLink;

  // Footer warning logic
  const pinterestSelected = selectedAccounts.some(a => a.platform === "pinterest");
  const pinterestSelectedWithNoImage = pinterestSelected && images.length === 0;

  let mediaWarning: string | null = null;
  if (instagramSelected) {
    if (igMediaType === "story" && images.length === 0) mediaWarning = "⚠ Instagram Story requires an image";
    else if (igMediaType === "reel" && !video) mediaWarning = "⚠ Instagram Reel requires a video";
    else if (igMediaType === "post" && images.length === 0) mediaWarning = "⚠ Instagram Post requires an image";
  }
  if (!mediaWarning && pinterestSelectedWithNoImage) {
    mediaWarning = "⚠ Pinterest requires an image — the Pin will be skipped without one";
  }

  // Group accounts by platform for the selector
  const groupedAccounts = accounts.reduce<Record<string, Account[]>>((acc, a) => {
    (acc[a.platform] ??= []).push(a); return acc;
  }, {});

  return (
    <Modal open={open} onClose={onClose} maxWidth={1080}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid #2a2a2a", backgroundColor: "#0a0a0a" }}>
        <div>
          <h2 className="text-base font-bold" style={{ color: "#ededed" }}>Edit Post</h2>
          <p className="text-xs mt-0.5" style={{ color: "#555" }}>Edits apply to the pending scheduled post</p>
        </div>
        <button onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
          style={{ color: "#666" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body — editor left, preview right */}
      <div className="flex min-h-0 overflow-hidden" style={{ height: "calc(90vh - 136px)" }}>

        {/* Left: editor */}
        <div className="flex flex-col flex-1 overflow-y-auto min-w-0"
          style={{ borderRight: "1px solid #2a2a2a", backgroundColor: "#0a0a0a" }}>

          {/* Platform selector */}
          <div className="px-6 pt-5 pb-4" style={{ borderBottom: "1px solid #1a1a1a" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#444" }}>Post to</p>
              {accounts.length > 1 && (
                <button type="button"
                  onClick={() => {
                    const next = selectedIds.length === accounts.length ? [] : accounts.map(a => a.id);
                    if (!next.some(id => accounts.find(a => a.id === id)?.platform === "instagram")) setIgMediaType("post");
                    setSelectedIds(next);
                  }}
                  className="text-xs font-semibold" style={{ color: "#5b63d3" }}>
                  {selectedIds.length === accounts.length ? "Deselect all" : "Select all"}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(groupedAccounts).map(([platform, accs]) => (
                <div key={platform} className="flex items-center gap-1.5 flex-wrap">
                  <span className="flex items-center px-2 py-1 rounded-lg"
                    style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
                    <PlatformIcon platform={platform} size={11} />
                  </span>
                  {accs.map(a => {
                    const sel = selectedIds.includes(a.id);
                    const color = PLATFORM_COLOR[a.platform] ?? "#6b7280";
                    return (
                      <button key={a.id} type="button" onClick={() => toggleAccount(a.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                        style={sel
                          ? { background: color + "18", border: `1px solid ${color}50`, color }
                          : { background: "#111111", border: "1px solid #2a2a2a", color: "#888" }}>
                        {a.avatarUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.avatarUrl} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                        )}
                        <span className="truncate max-w-[96px]">{a.displayName}</span>
                        {sel && (
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                  <div className="w-px h-5 self-center" style={{ backgroundColor: "#2a2a2a" }} />
                </div>
              ))}
            </div>
            {selectedIds.length === 0 && (
              <p className="mt-2 text-xs" style={{ color: "#ef4444" }}>Select at least one account</p>
            )}
          </div>

          {/* Caption */}
          <div className="px-6 py-5" style={{ display: noPostTextNeeded ? "none" : undefined }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#444" }}>Caption</span>
              <div className="flex items-center gap-3">
                {platformLimits.map(p => (
                  <span key={p.platform} className="text-xs font-medium flex items-center gap-1"
                    style={{ color: p.over ? "#ef4444" : p.effectiveCount > p.limit * 0.8 ? "#f59e0b" : "#555" }}>
                    <PlatformIcon platform={p.platform} size={12} /> {p.effectiveCount}/{p.limit}
                  </span>
                ))}
              </div>
            </div>
            <textarea
              value={text} onChange={e => setText(e.target.value)}
              placeholder="What do you want to share?"
              rows={7}
              className="w-full resize-none rounded-xl px-4 py-3 text-sm focus:outline-none transition"
              style={{
                border: overAnyLimit ? "1px solid #fca5a5" : "1px solid #2a2a2a",
                backgroundColor: "#111111", color: "#ededed",
              }}
            />
            {overAnyLimit && (
              <p className="mt-1 text-xs" style={{ color: "#ef4444" }}>
                Over the character limit for one of your selected platforms
              </p>
            )}
          </div>

          {/* YouTube — dedicated Title + Description fields */}
          {youtubeSelected && (
            <div className="px-6 pb-5 pt-4" style={{ borderBottom: "1px solid #2a2a2a" }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <PlatformIcon platform="youtube" size={13} />
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#ff0000" }}>YouTube</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {(["short", "video"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setYoutubeType(t)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all"
                      style={youtubeType === t
                        ? { backgroundColor: "#ff000020", color: "#ff0000", border: "1px solid #ff000050" }
                        : { backgroundColor: "#111111", color: "#666", border: "1px solid #1f1f1f" }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs mb-2.5" style={{ color: "#999" }}>
                Uploads to YouTube with a separate title and description.{!onlyYoutube && " Other selected platforms use the Caption above."}
              </p>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#555" }}>Title</span>
                  <span className="text-[10px]" style={{ color: youtubeTitle.length > 100 ? "#ef4444" : "#444" }}>{youtubeTitle.length}/100</span>
                </div>
                <input
                  value={youtubeTitle} onChange={e => setYoutubeTitle(e.target.value)}
                  placeholder="Video title"
                  className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition"
                  style={{ borderColor: youtubeTitle.length > 100 ? "#fca5a5" : "#2a2a2a", backgroundColor: "#111111", color: "#ededed" }}
                />
              </div>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#555" }}>Description</span>
                  <span className="text-[10px]" style={{ color: youtubeDescription.length > 5000 ? "#ef4444" : "#444" }}>{youtubeDescription.length}/5000</span>
                </div>
                <textarea
                  value={youtubeDescription} onChange={e => setYoutubeDescription(e.target.value)}
                  placeholder="Video description…"
                  rows={3}
                  className="w-full resize-none rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition"
                  style={{ borderColor: youtubeDescription.length > 5000 ? "#fca5a5" : "#2a2a2a", backgroundColor: "#111111", color: "#ededed" }}
                />
              </div>

              {/* Video source — upload or external URL */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#555" }}>Video</span>
                  <div className="flex items-center gap-1">
                    {(["upload", "url"] as const).map((m) => (
                      <button key={m} type="button" onClick={() => setYoutubeVideoMode(m)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                        style={youtubeVideoMode === m
                          ? { backgroundColor: "#ff000020", color: "#ff0000", border: "1px solid #ff000050" }
                          : { backgroundColor: "#111111", color: "#666", border: "1px solid #1f1f1f" }}>
                        {m === "upload" ? "Upload file" : "Paste URL"}
                      </button>
                    ))}
                  </div>
                </div>
                {youtubeVideoMode === "url" ? (
                  <div>
                    <input
                      value={youtubeVideoUrl}
                      onChange={e => setYoutubeVideoUrl(e.target.value)}
                      placeholder="https://your-cdn.com/video.mp4"
                      className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition"
                      style={{ borderColor: "#2a2a2a", backgroundColor: "#111111", color: "#ededed" }}
                    />
                    <p className="text-xs mt-1.5" style={{ color: "#555" }}>
                      Any public URL — S3, Supabase, Cloudflare R2, direct CDN. No file size limit.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <input ref={videoInputRef} type="file"
                      accept="video/mp4,video/quicktime,video/webm"
                      className="hidden" id="edit-dialog-yt-video-upload"
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadVideo(f); }} />
                    <label htmlFor="edit-dialog-yt-video-upload"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${uploading ? "opacity-40 pointer-events-none" : "hover:border-white/20"}`}
                      style={{ border: "1px solid #2a2a2a", backgroundColor: "#111111", color: "#888" }}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                      {uploading ? "Uploading…" : video ? "Change video" : "Add video"}
                    </label>
                    {video && (
                      <span className="text-xs" style={{ color: "#4ade80" }}>✓ {video.name}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pinterest — dedicated Title + Description fields */}
          {pinterestAccounts.length > 0 && (
            <div className="px-6 pb-5 pt-4" style={{ borderBottom: "1px solid #2a2a2a" }}>
              <div className="flex items-center gap-2 mb-1">
                <PlatformIcon platform="pinterest" size={13} />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#e60023" }}>Pinterest</span>
              </div>
              <p className="text-xs mb-2.5" style={{ color: "#999" }}>
                Pins have a separate title and description.
              </p>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#555" }}>Pin title</span>
                  <span className="text-[10px]" style={{ color: pinterestTitle.length > 100 ? "#ef4444" : "#444" }}>{pinterestTitle.length}/100</span>
                </div>
                <input
                  value={pinterestTitle}
                  onChange={(e) => setPinterestTitle(e.target.value)}
                  placeholder="Short, catchy pin title"
                  maxLength={100}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition"
                  style={{ borderColor: pinterestTitle.length > 100 ? "#fca5a5" : "#2a2a2a", backgroundColor: "#111111", color: "#ededed" }}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#555" }}>Description</span>
                  <span className="text-[10px]" style={{ color: pinterestDescription.length > 500 ? "#ef4444" : "#444" }}>{pinterestDescription.length}/500</span>
                </div>
                <textarea
                  value={pinterestDescription}
                  onChange={(e) => setPinterestDescription(e.target.value)}
                  placeholder="What is this Pin about?"
                  rows={3}
                  maxLength={500}
                  className="w-full resize-none rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition"
                  style={{ borderColor: pinterestDescription.length > 500 ? "#fca5a5" : "#2a2a2a", backgroundColor: "#111111", color: "#ededed" }}
                />
              </div>
            </div>
          )}

          {/* First comment */}
          <div className="px-6 py-5" style={{ borderBottom: "1px solid #1a1a1a", display: onlyPinterest ? "none" : undefined }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#444" }}>First Comment</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ color: "#555", backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>optional</span>
            </div>
            <p className="text-xs mb-2.5" style={{ color: "#444" }}>
              Posted as the first reply immediately after your post goes live.
            </p>
            <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
              placeholder="Add a link, thread continuation, or extra context…"
              rows={3}
              className="w-full resize-none rounded-xl px-4 py-3 text-sm focus:outline-none"
              style={{ border: "1px solid #2a2a2a", backgroundColor: "#111111", color: "#ededed" }}
            />
          </div>

          {/* Media — hidden when only YouTube is selected in URL mode (video URL lives in the YouTube section) */}
          <div className="px-6 pb-5 pt-4" style={{ borderBottom: "1px solid #1a1a1a", display: (onlyYoutube && youtubeVideoMode === "url") ? "none" : undefined }}>
            {/* Header row with Instagram format toggle */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#444" }}>Media</span>
              {instagramSelected && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-semibold mr-1.5" style={{ color: "#555" }}>Instagram format</span>
                  {(["post", "reel", "story"] as const).map(t => (
                    <button key={t} type="button" onClick={() => {
                      setIgMediaType(t);
                      if (t === "story") setVideo(null);
                      if (t === "reel") { setImages([]); }
                    }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all"
                      style={igMediaType === t
                        ? { backgroundColor: "#E1306C20", color: "#E1306C", border: "1px solid #E1306C50" }
                        : { backgroundColor: "#111111", color: "#444", border: "1px solid #1f1f1f" }}>
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Video preview (reel) */}
            {video && (
              <div className="mb-3 relative group w-28 rounded-xl overflow-hidden" style={{ border: "1px solid #2a2a2a", backgroundColor: "#1a1a1a" }}>
                <video src={video.previewUrl} className="w-full h-20 object-cover" muted />
                <div className="absolute bottom-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(0,0,0,0.7)", color: "#fff" }}>REEL</div>
                <button type="button" onClick={() => setVideo(null)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: "rgba(239,68,68,0.9)" }}>✕</button>
              </div>
            )}

            {/* Image grid */}
            {images.length > 0 && igMediaType !== "reel" && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {images.map((img, i) => (
                  <div key={img.url + i} className="relative group w-20 h-20 rounded-xl overflow-hidden flex-shrink-0"
                    style={{ border: "1px solid #2a2a2a", backgroundColor: "#1a1a1a" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.previewUrl} alt={img.name} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: "rgba(239,68,68,0.9)" }}>✕</button>
                  </div>
                ))}
                {igMediaType === "story"
                  ? null // story = single image only
                  : images.length < MAX_IMAGES && Array.from({ length: MAX_IMAGES - images.length }).map((_, i) => (
                    <div key={`e-${i}`} className="w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center"
                      style={{ borderColor: "#222", backgroundColor: "#0a0a0a" }}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#2a2a2a" }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  ))
                }
              </div>
            )}

            {/* Upload button */}
            <div className="flex items-center gap-3">
              {/* Video input — reel mode */}
              <input ref={videoInputRef} type="file"
                accept="video/mp4,video/quicktime,video/webm"
                className="hidden" id="edit-dialog-video-upload"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadVideo(f); }} />
              {/* Image input — post / story mode */}
              <input ref={fileInputRef} type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple={igMediaType !== "story"}
                className="hidden" id="edit-dialog-media-upload"
                onChange={e => uploadFiles(Array.from(e.target.files ?? []))} />
              {igMediaType === "reel" ? (
                <label htmlFor="edit-dialog-video-upload"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${uploading ? "opacity-40 pointer-events-none" : "hover:border-white/20"}`}
                  style={{ border: "1px solid #2a2a2a", backgroundColor: "#111111", color: "#888" }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  {uploading ? "Uploading…" : video ? "Change video" : "Add video"}
                </label>
              ) : (
                <label htmlFor="edit-dialog-media-upload"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${uploading || (igMediaType !== "story" && images.length >= MAX_IMAGES) || (igMediaType === "story" && images.length >= 1) ? "opacity-40 pointer-events-none" : "hover:border-white/20"}`}
                  style={{ border: "1px solid #2a2a2a", backgroundColor: "#111111", color: "#888" }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {uploading ? "Uploading…"
                    : igMediaType === "story" ? (images.length > 0 ? "Change image" : "Add story image")
                    : images.length > 0 ? `${images.length}/${MAX_IMAGES} photos` : "Add photo"}
                </label>
              )}
            </div>
            {uploadError && (
              <p className="mt-2 text-xs rounded-lg px-3 py-2" style={{ color: "#f87171", backgroundColor: "#1f0a0a", border: "1px solid #3a1a1a" }}>
                {uploadError}
              </p>
            )}
          </div>

          {/* Per-platform overrides — YouTube and Pinterest have dedicated fields above, exclude them here */}
          {selectedAccounts.filter(a => a.platform !== "youtube" && a.platform !== "pinterest").length > 1 && (
            <div className="px-6 py-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#444" }}>Customize per platform</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: "#555", backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>optional</span>
              </div>
              <div className="space-y-2">
                {selectedAccounts.filter(a => a.platform !== "youtube" && a.platform !== "pinterest").map(a => {
                  const hasOverride = a.id in perAccountOverrides;
                  const override = perAccountOverrides[a.id];
                  const color = PLATFORM_COLOR[a.platform] ?? "#6b7280";
                  const limit = PLATFORM_LIMIT[a.platform] ?? 500;
                  const overrideCount = countGraphemes(override?.text ?? "");
                  return (
                    <div key={a.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${hasOverride ? color + "40" : "#1f1f1f"}`, backgroundColor: "#0d0d0d" }}>
                      <button type="button" onClick={() => toggleOverride(a.id, text, commentText)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
                        style={{ backgroundColor: hasOverride ? color + "10" : "transparent" }}>
                        <PlatformIcon platform={a.platform} size={14} />
                        <span className="text-xs font-medium flex-1" style={{ color: hasOverride ? color : "#666" }}>{a.displayName}</span>
                        {hasOverride ? (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: color + "20", color }}>Custom ✓</span>
                        ) : (
                          <span className="text-[10px]" style={{ color: "#444" }}>✎ Customize</span>
                        )}
                      </button>
                      {hasOverride && (
                        <div className="px-3 pb-3 space-y-2">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#555" }}>Caption</span>
                              <span className="text-[10px]" style={{ color: overrideCount > limit ? "#ef4444" : "#444" }}>{overrideCount}/{limit}</span>
                            </div>
                            <textarea
                              value={override?.text ?? ""}
                              onChange={e => setOverrideField(a.id, "text", e.target.value)}
                              rows={3}
                              placeholder={`Custom caption for ${a.displayName}…`}
                              className="w-full resize-none rounded-lg px-3 py-2 text-xs focus:outline-none"
                              style={{ backgroundColor: "#111111", border: `1px solid ${overrideCount > limit ? "#ef444480" : "#2a2a2a"}`, color: "#ededed" }}
                            />
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: "#555" }}>First Comment</span>
                            <textarea
                              value={override?.commentText ?? ""}
                              onChange={e => setOverrideField(a.id, "commentText", e.target.value)}
                              rows={2}
                              placeholder={`Custom first comment for ${a.displayName}…`}
                              className="w-full resize-none rounded-lg px-3 py-2 text-xs focus:outline-none"
                              style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a", color: "#ededed" }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: live previews */}
        <div className="w-[400px] flex-shrink-0 flex flex-col overflow-y-auto" style={{ backgroundColor: "#0a0a0a" }}>
          <div className="px-5 pt-5 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#555" }}>Preview</p>
          </div>
          <div className="px-5 pb-5 space-y-4 flex-1">
            {selectedAccounts.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed p-10 text-center" style={{ borderColor: "#1f1f1f" }}>
                <p className="text-sm" style={{ color: "#444" }}>Select an account above to see a preview</p>
              </div>
            ) : (
              selectedAccounts.map(a => {
                const ov = perAccountOverrides[a.id];
                return (
                  <PlatformPreview
                    key={a.id}
                    account={a}
                    text={ov?.text !== undefined ? ov.text : text}
                    commentText={ov?.commentText !== undefined ? ov.commentText : commentText}
                    mediaItems={[...images, ...(video ? [{ ...video, isVideo: true }] : [])]}
                    igMediaType={a.platform === "instagram" ? igMediaType : undefined}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-2 px-6 py-4 flex-shrink-0"
        style={{ borderTop: "1px solid #2a2a2a", backgroundColor: "#0a0a0a" }}>
        {(mediaWarning || saveError || twitterHasLink) && (
          <div className="flex flex-col gap-1">
            {mediaWarning && <p className="text-xs font-medium" style={{ color: "#f59e0b" }}>{mediaWarning}</p>}
            {twitterHasLink && <p className="text-xs font-medium" style={{ color: "#f59e0b" }}>⚠ X/Twitter post contains a link — links cost $0.20 each via the X API. Remove the link to schedule, or use a different platform.</p>}
            {saveError && <p className="text-xs" style={{ color: "#ef4444" }}>{saveError}</p>}
          </div>
        )}
        <div className="flex items-center gap-3">
          <DateTimePicker value={scheduledFor} onChange={setScheduledFor} />
          <div className="flex-1" />
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 text-sm rounded-xl font-medium disabled:opacity-40"
            style={{ backgroundColor: "#1a1a1a", color: "#888", border: "1px solid #2a2a2a" }}>
            Cancel
          </button>
          <button onClick={handleSave}
            disabled={saving || (!text.trim() && !noPostTextNeeded) || selectedIds.length === 0 || overAnyLimit || uploading || youtubeSelectedWithNoVideo || pinterestSelectedWithNoImage || twitterHasLink}
            className="px-5 py-2 text-sm font-semibold rounded-xl disabled:opacity-40"
            style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
            {saving ? (isDraft ? "Scheduling…" : "Saving…") : isDraft ? "Schedule Post" : "Save changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
