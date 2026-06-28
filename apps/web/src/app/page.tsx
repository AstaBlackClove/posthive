"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import confetti from "canvas-confetti";
import { apiFetch } from "../lib/api";
import { useToast } from "../components/Toast";
import { DateTimePicker } from "../components/DateTimePicker";
import { PlatformIcon } from "../components/PlatformIcon";
import {
  PlatformPreview,
  PLATFORM_COLOR, PLATFORM_LIMIT, MAX_IMAGES, countGraphemes,
} from "../components/PlatformPreview";
import type { Account, UploadedImage, PerAccountOverride } from "../components/PlatformPreview";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function defaultScheduledFor(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

export default function ComposePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [text, setText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [scheduledFor, setScheduledFor] = useState(defaultScheduledFor);
  const [mediaItems, setMediaItems] = useState<UploadedImage[]>([]);
  const [altTexts, setAltTexts] = useState<string[]>([]);
  const [igMediaType, setIgMediaType] = useState<"post" | "reel" | "story">("post");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [perAccountOverrides, setPerAccountOverrides] = useState<Record<string, PerAccountOverride>>({});
  const [showCustomize, setShowCustomize] = useState(false);
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaItemsRef = useRef(mediaItems);
  useEffect(() => { mediaItemsRef.current = mediaItems; }, [mediaItems]);

  // Delete any unsubmitted uploads if the user navigates away
  useEffect(() => {
    return () => {
      mediaItemsRef.current.forEach(m => {
        URL.revokeObjectURL(m.previewUrl);
        fetch(`${API_BASE}/upload`, { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: m.url }) }).catch(() => {});
      });
    };
  }, []);


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

  useEffect(() => {
    apiFetch<Account[]>("/accounts")
      .then((data) => { setAccounts(data); setSelectedIds(data.map((a) => a.id)); })
      .finally(() => setLoadingAccounts(false));
  }, []);

  function toggleAccount(id: string) {
    const account = accounts.find((a) => a.id === id);
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      // Reset Instagram format when the last Instagram account is deselected
      if (account?.platform === "instagram" && !next.some((sid) => accounts.find((a) => a.id === sid)?.platform === "instagram")) {
        setIgMediaType("post");
      }
      return next;
    });
  }

  async function uploadFiles(files: File[]) {
    if (!files.length) return;
    setUploading(true); setUploadError(null);

    for (const file of files) {
      const isVid = file.type.startsWith("video/");
      const isImg = file.type.startsWith("image/");
      if (!isVid && !isImg) continue;

      // Story: only 1 image allowed
      if (igMediaType === "story") {
        if (!isImg && !isVid) { setUploadError("Instagram Stories require an image or video."); continue; }
      }

      // Reel: single video only — replaces existing
      if (igMediaType === "reel") {
        if (!isVid) { setUploadError("Instagram Reels only support a single video."); continue; }
        const previewUrl = URL.createObjectURL(file);
        const formData = new FormData();
        formData.append("file", file);
        try {
          const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData, credentials: "include" });
          if (!res.ok) { const b = await res.json() as { error: string }; setUploadError(b.error); URL.revokeObjectURL(previewUrl); }
          else {
            const { url } = await res.json() as { url: string };
            setMediaItems(prev => {
              prev.forEach(m => { URL.revokeObjectURL(m.previewUrl); deleteFromStorage(m.url); });
              return [{ url, previewUrl, name: file.name, isVideo: true }];
            });
            setAltTexts([]);
          }
        } catch { setUploadError("Upload failed — is the API running?"); URL.revokeObjectURL(previewUrl); }
        continue;
      }

      // Post mode: mixed image + video carousel, up to 10 items
      if (mediaItems.length >= 10) { setUploadError("Maximum 10 media items per carousel."); continue; }
      const previewUrl = URL.createObjectURL(file);
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData, credentials: "include" });
        if (!res.ok) { const b = await res.json() as { error: string }; setUploadError(b.error); URL.revokeObjectURL(previewUrl); continue; }
        const { url } = await res.json() as { url: string };
        setMediaItems(prev => {
          // Auto-detect: only switch to reel if not already in story/reel mode
          if (isVid && prev.length === 0 && igMediaType === "post") {
            setIgMediaType("reel");
            return [{ url, previewUrl, name: file.name, isVideo: true }];
          }
          // Mixed or image only
          if (isVid && prev.length > 0 && igMediaType === "post") setIgMediaType("post");
          if (!isVid) setAltTexts(a => [...a, ""]);
          return [...prev, { url, previewUrl, name: file.name || "image", isVideo: isVid }];
        });
      } catch { setUploadError("Upload failed — is the API running?"); URL.revokeObjectURL(previewUrl); }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) { uploadFiles(Array.from(e.target.files ?? [])); }
  function handlePaste(e: React.ClipboardEvent) {
    const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (!files.length) return;
    e.preventDefault(); uploadFiles(files);
  }
  function deleteFromStorage(url: string) {
    fetch(`${API_BASE}/upload`, { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) }).catch(() => {});
  }

  function removeMediaItem(i: number) {
    setMediaItems((prev) => {
      const item = prev[i];
      URL.revokeObjectURL(item.previewUrl);
      deleteFromStorage(item.url);
      const next = prev.filter((_, j) => j !== i);
      // If no videos remain, ensure format is sensible
      if (!next.some(m => m.isVideo) && igMediaType === "reel") setIgMediaType("post");
      return next;
    });
    setAltTexts((prev) => prev.filter((_, j) => j !== i));
  }

  function validateBeforeSubmit(): string | null {
    if (selectedIds.length === 0) return "Select at least one account to post to.";

    const hasInstagram = selectedAccounts.some((a) => a.platform === "instagram");
    const hasThreads   = selectedAccounts.some((a) => a.platform === "threads");
    const hasBluesky   = selectedAccounts.some((a) => a.platform === "bluesky");

    // Text required for everything except Instagram Story
    if (!text.trim() && !onlyInstagramStory) return "Write something before scheduling.";

    // Instagram-specific
    if (hasInstagram) {
      const hasVideo = mediaItems.some(m => m.isVideo);
      const hasImage = mediaItems.some(m => !m.isVideo);
      if (igMediaType === "story" && mediaItems.length === 0)
        return "Instagram Story requires an image or video.";
      if (igMediaType === "reel" && !hasVideo)
        return "Instagram Reel requires a video.";
      if (igMediaType === "post" && mediaItems.length === 0)
        return "Instagram Post requires at least one image or video.";
    }

    // Bluesky — text required (images optional)
    if (hasBluesky && !text.trim()) return "Bluesky requires a caption.";

    // Threads — text required, video supported (single video only)
    if (hasThreads && !text.trim()) return "Threads requires a caption.";

    // Character limits
    for (const p of platformLimits) {
      if (p.over) return `Your caption is too long for ${p.platform} (limit: ${p.limit} characters).`;
    }

    // Scheduled time must be in the future
    if (new Date(scheduledFor) <= new Date()) return "Scheduled time must be in the future.";

    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateBeforeSubmit();
    if (validationError) { toastWarning(validationError); return; }
    setSubmitting(true);
    try {
      const cleanOverrides = Object.fromEntries(
        Object.entries(perAccountOverrides).filter(([id]) => selectedIds.includes(id))
      );
      const mediaUrls = mediaItems.map(m => m.url);
      const hasInstagram = selectedAccounts.some((a) => a.platform === "instagram");
      await apiFetch("/jobs", {
        method: "POST",
        body: JSON.stringify({
          scheduledFor: new Date(scheduledFor).toISOString(),
          content: {
            text,
            mediaUrls,
            ...(altTexts.some(Boolean) ? { altTexts } : {}),
            ...(hasInstagram && igMediaType !== "post" ? { mediaType: igMediaType } : {}),
            ...(Object.keys(cleanOverrides).length > 0 ? { perAccount: cleanOverrides } : {}),
          },
          commentText: commentText.trim() || undefined,
          accountIds: selectedIds,
          dryRun,
        }),
      });
      toastSuccess(dryRun ? "Dry run scheduled — no real post will be made." : "Post scheduled successfully!");
      if (!dryRun && !localStorage.getItem("posthive_first_post_done")) {
        localStorage.setItem("posthive_first_post_done", "1");
        confetti({ particleCount: 160, spread: 80, origin: { y: 0.6 }, zIndex: 9999 });
        setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { y: 0.55 }, zIndex: 9999 }), 300);
      }
      setText(""); setCommentText(""); setScheduledFor(defaultScheduledFor());
      setPerAccountOverrides({});
      mediaItems.forEach(m => URL.revokeObjectURL(m.previewUrl));
      setMediaItems([]); setAltTexts([]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
      toastError(msg.replace(/^Error: API POST \/jobs → \d+: /, "").replace(/^\{"error":"/, "").replace(/"\}$/, ""));
    }
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
  const images = mediaItems.filter(m => !m.isVideo);
  const video = mediaItems.find(m => m.isVideo) ?? null;
  const instagramSelected = selectedAccounts.some((a) => a.platform === "instagram");
  const instagramSelectedWithNoMedia = instagramSelected && mediaItems.length === 0 && igMediaType !== "story";
  const instagramStoryWithNoImage = instagramSelected && igMediaType === "story" && mediaItems.length === 0;
  const onlyInstagramStory = instagramSelected && igMediaType === "story" && selectedAccounts.every((a) => a.platform === "instagram");
  const linkedinSelectedWithMedia = selectedAccounts.some((a) => a.platform === "linkedin") && mediaItems.length > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center justify-between px-8" style={{ height: 65, borderBottom: "1px solid #2a2a2a", backgroundColor: "#0a0a0a" }}>
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
        <div className="flex flex-col flex-1 overflow-y-auto min-h-0" style={{ borderRight: "1px solid #2a2a2a", backgroundColor: "#0a0a0a" }}>

          {/* Platform selector */}
          <div className="px-6 pt-4 pb-3" style={{ borderBottom: "1px solid #2a2a2a" }}>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-semibold uppercase tracking-widest">Post to</p>
              {!loadingAccounts && accounts.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs">
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
                      style={{ backgroundColor: "#111111", color: "#555", border: "1px solid #2a2a2a" }}>
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
                    <div className="w-px h-5 self-center" style={{ backgroundColor: "#2a2a2a" }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Text editor */}
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide">Post</span>
              {/* Instagram format toggle in Post header */}
              {instagramSelected && (
                <div className="flex items-center gap-1.5">
                  <div className="relative group/iginfo">
                    <Info size={13} style={{ color: "#999", opacity: 0.7 }} className="cursor-default" />
                    <div className="absolute right-0 top-5 z-20 w-48 rounded-lg px-3 py-2 text-[11px] leading-relaxed pointer-events-none opacity-0 group-hover/iginfo:opacity-100 transition-opacity"
                      style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#aaa" }}>
                      <span style={{ color: "#E1306C", fontWeight: 600 }}>Instagram</span> format only.
                      <ul className="mt-1 space-y-0.5 list-none">
                        <li>· Post - image or carousel</li>
                        <li>· Reel - single video</li>
                        <li>· Story - single image</li>
                      </ul>
                    </div>
                  </div>
                  {(["post", "reel", "story"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => {
                      setIgMediaType(t);
                      if (t === "story") {
                        setMediaItems(prev => {
                          const firstImg = prev.find(m => !m.isVideo);
                          prev.forEach(m => { if (m !== firstImg) { URL.revokeObjectURL(m.previewUrl); deleteFromStorage(m.url); } });
                          return firstImg ? [firstImg] : [];
                        });
                        setAltTexts([]);
                      }
                      if (t === "reel") {
                        setMediaItems(prev => {
                          const firstVid = prev.find(m => m.isVideo);
                          prev.forEach(m => { if (m !== firstVid) { URL.revokeObjectURL(m.previewUrl); deleteFromStorage(m.url); } });
                          return firstVid ? [firstVid] : [];
                        });
                        setAltTexts([]);
                      }
                    }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all"
                      style={igMediaType === t
                        ? { backgroundColor: "#E1306C20", color: "#E1306C", border: "1px solid #E1306C50" }
                        : { backgroundColor: "#111111", color: "#666", border: "1px solid #1f1f1f" }}>
                      {t}
                    </button>
                  ))}
                </div>
              )}

            </div>
            {!onlyInstagramStory && (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What do you want to share?"
                required
                rows={8}
                className="w-full resize-none rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition"
                style={overAnyLimit
                  ? { borderColor: "#fca5a5", backgroundColor: "#111111", color: "#ededed" }
                  : { borderColor: "#2a2a2a", backgroundColor: "#111111", color: "#ededed" }
                }
              />
            )}
            {/* Char counters below textarea */}
            {!onlyInstagramStory && <div className="flex items-center gap-3 mt-1.5">
              {overAnyLimit && (
                <p className="text-xs text-red-500 flex-1">
                  {Math.abs(mostRestrictiveLimit - graphemeCount)} chars over limit
                </p>
              )}
              <div className="flex items-center gap-3 ml-auto">
                {platformLimits.map((p) => (
                  <span key={p.platform} className="text-xs font-medium flex items-center gap-1"
                    style={{ color: p.over ? "#ef4444" : graphemeCount > p.limit * 0.8 ? "#f59e0b" : "#444" }}>
                    <PlatformIcon platform={p.icon} size={11} /> {graphemeCount}/{p.limit}
                  </span>
                ))}
              </div>
            </div>}
          </div>

          {/* First comment — right below the post text */}
          <div className="px-6 pb-5 pt-1" style={{ borderBottom: "1px solid #2a2a2a" }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wide">First Comment</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: "#555", backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>optional</span>
              </div>
              <p className="text-xs mb-2.5" style={{ color: "#999" }}>Posted as the first reply immediately after your post goes live.</p>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a link, thread continuation, or extra context…"
                rows={2}
                className="w-full resize-none rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition"
                style={{ borderColor: "#2a2a2a", backgroundColor: "#111111", color: "#ededed" }}
              />
          </div>


          {/* Media + upload row */}
          <div className="px-6 pt-4 pb-5" style={{ borderBottom: "1px solid #2a2a2a" }}>

            {/* Section header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wide">Media</span>
            </div>

            {/* Media thumbnails — unified image + video grid */}
            {mediaItems.length > 0 && (
              <div className="space-y-2 mb-3">
                <div className="flex gap-2 flex-wrap">
                  {mediaItems.map((item, i) => (
                    <div key={item.url} className="relative group w-20 h-20 rounded-xl overflow-hidden flex-shrink-0" style={{ border: "1px solid #2a2a2a", backgroundColor: "#1a1a1a" }}>
                      {item.isVideo ? (
                        <video src={item.previewUrl} className="w-full h-full object-cover" muted />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover" />
                      )}
                      {item.isVideo && (
                        <div className="absolute bottom-1 left-1 text-[9px] font-bold px-1 py-0.5 rounded" style={{ backgroundColor: "rgba(0,0,0,0.7)", color: "#fff" }}>VID</div>
                      )}
                      <button type="button" onClick={() => removeMediaItem(i)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>✕</button>
                    </div>
                  ))}
                </div>

                {/* Alt text — only for image items when Instagram post selected */}
                {instagramSelected && igMediaType === "post" && images.length > 0 && (
                  <div className="space-y-1.5">
                    {images.map((img, i) => (
                      <div key={img.url} className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold w-5 text-center flex-shrink-0" style={{ color: "#444" }}>{i + 1}</span>
                        <input
                          type="text"
                          value={altTexts[i] ?? ""}
                          onChange={e => setAltTexts(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
                          placeholder={`Alt text for image ${i + 1} (optional)`}
                          className="flex-1 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                          style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a", color: "#ededed" }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <input ref={fileInputRef} type="file"
                accept={igMediaType === "reel"
                  ? "video/mp4,video/quicktime"
                  : igMediaType === "story"
                  ? "image/jpeg,image/png,video/mp4,video/quicktime"
                  : "image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime"}
                multiple={igMediaType === "post"}
                onChange={handleFileChange} className="hidden" id="media-upload" />
              <label htmlFor="media-upload"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all hover:border-opacity-60 ${uploading ? "opacity-50 pointer-events-none" : ""}`}
                style={{ border: "1px solid #2a2a2a", backgroundColor: "#111111", color: "#888" }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d={igMediaType === "reel"
                      ? "M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      : "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"} />
                </svg>
                {uploading ? "Uploading…" :
                  igMediaType === "reel" ? (mediaItems.length > 0 ? "Change video" : "Add video") :
                  igMediaType === "story" ? (mediaItems.length > 0 ? "Change media" : "Add story image / video") :
                  mediaItems.length > 0 ? `${mediaItems.length} item${mediaItems.length > 1 ? "s" : ""}` : "Add photo / video"}
              </label>
              {mediaItems.length === 0 && (
                <span className="text-xs" style={{ color: "#999" }}>or Ctrl+V to paste</span>
              )}
            </div>
            {uploadError && <p className="mt-2 text-xs text-red-500 rounded-lg px-3 py-2" style={{ backgroundColor: "#1f0a0a", border: "1px solid #3a1a1a" }}>{uploadError}</p>}

            {/* Option buttons row */}
            {(instagramSelected || selectedAccounts.length > 1) && (
              <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid #1a1a1a" }}>
                {selectedAccounts.length > 1 && (
                  <button type="button" onClick={() => setShowCustomize(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      border: `1px solid ${Object.keys(perAccountOverrides).length > 0 ? "#5b63d350" : "#2a2a2a"}`,
                      backgroundColor: Object.keys(perAccountOverrides).length > 0 ? "#5b63d310" : "#111111",
                      color: Object.keys(perAccountOverrides).length > 0 ? "#5b63d3" : "#888",
                    }}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Customize per platform
                    {Object.keys(perAccountOverrides).length > 0 && (
                      <span className="text-[10px] font-bold px-1 py-0.5 rounded"
                        style={{ backgroundColor: "#5b63d320", color: "#5b63d3" }}>
                        {Object.keys(perAccountOverrides).length}
                      </span>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Right — per-platform previews (fixed 480px) */}
        <div className="w-[480px] flex-shrink-0 flex flex-col overflow-y-auto" style={{ backgroundColor: "#0a0a0a" }}>
          <div className="px-5 pt-5 pb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Preview</p>
          </div>
          <div className="px-5 pb-5 space-y-4 flex-1">
            {selectedAccounts.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed p-10 text-center" style={{ borderColor: "#2a2a2a" }}>
                <p className="text-sm" style={{ color: "#888888" }}>Select an account above to see a preview</p>
              </div>
            ) : (
              selectedAccounts.map((a) => {
                const ov = perAccountOverrides[a.id];
                return (
                  <PlatformPreview
                    key={a.id}
                    account={a}
                    text={ov?.text !== undefined ? ov.text : text}
                    commentText={ov?.commentText !== undefined ? ov.commentText : commentText}
                    mediaItems={mediaItems}
                    igMediaType={a.platform === "instagram" ? igMediaType : undefined}
                  />
                );
              })
            )}
          </div>
        </div>
      </form>


      {/* Customize per platform dialog */}
      {showCustomize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowCustomize(false); }}>
          <div className="w-full max-w-lg rounded-2xl p-6" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a", maxHeight: "80vh", overflowY: "auto" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold" style={{ color: "#ededed" }}>Customize per platform</h2>
              <button type="button" onClick={() => setShowCustomize(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 text-sm" style={{ color: "#666" }}>✕</button>
            </div>
            <div className="space-y-2">
              {selectedAccounts.map(a => {
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
                      <span className="text-xs font-medium flex-1" style={{ color: hasOverride ? color : "#999" }}>{a.displayName}</span>
                      {hasOverride ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: color + "20", color }}>Custom ✓</span>
                      ) : (
                        <span className="text-[10px]" style={{ color: "#555" }}>✎ Customize</span>
                      )}
                    </button>
                    {hasOverride && (() => {
                      const isIgStory = a.platform === "instagram" && igMediaType === "story";
                      return (
                        <div className="px-3 pb-3 space-y-2">
                          {isIgStory ? (
                            <p className="text-[10px] py-1" style={{ color: "#555" }}>Instagram Stories don't support captions or comments.</p>
                          ) : (
                            <>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#555" }}>Caption</span>
                                  <span className="text-[10px]" style={{ color: overrideCount > limit ? "#ef4444" : "#444" }}>{overrideCount}/{limit}</span>
                                </div>
                                <textarea value={override?.text ?? ""} onChange={e => setOverrideField(a.id, "text", e.target.value)}
                                  rows={3} placeholder={`Custom caption for ${a.displayName}…`}
                                  className="w-full resize-none rounded-lg px-3 py-2 text-xs focus:outline-none"
                                  style={{ backgroundColor: "#111111", border: `1px solid ${overrideCount > limit ? "#ef444480" : "#2a2a2a"}`, color: "#ededed" }} />
                              </div>
                              <div>
                                <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: "#555" }}>First Comment</span>
                                <textarea value={override?.commentText ?? ""} onChange={e => setOverrideField(a.id, "commentText", e.target.value)}
                                  rows={2} placeholder={`Custom first comment for ${a.displayName}…`}
                                  className="w-full resize-none rounded-lg px-3 py-2 text-xs focus:outline-none"
                                  style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a", color: "#ededed" }} />
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end pt-4">
              <button type="button" onClick={() => setShowCustomize(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom footer bar — full width */}
      <div className="px-8 py-4 flex items-center gap-4" style={{ borderTop: "1px solid #2a2a2a", backgroundColor: "#0a0a0a" }}>
        {/* Dry run toggle */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setDryRun((v) => !v)}>
          <div className={`relative w-9 h-5 rounded-full transition-colors ${dryRun ? "bg-violet-500" : "bg-gray-300"}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full shadow transition-transform ${dryRun ? "translate-x-4" : "translate-x-0.5"}`} style={{ backgroundColor: "#111111" }} />
          </div>
          <span className={`text-xs font-medium ${dryRun ? "text-violet-700" : "text-gray-500"}`}>Dry run</span>
        </div>

        <div className="h-5 w-px" style={{ backgroundColor: "#2a2a2a" }} />

        {/* Schedule datetime */}
        <DateTimePicker value={scheduledFor} onChange={setScheduledFor} />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Inline media warnings only */}
        {instagramSelectedWithNoMedia && (
          <p className="text-xs font-medium" style={{ color: "#f59e0b" }}>
            ⚠️ {igMediaType === "reel" ? "Add a video for this Reel" : "Instagram requires an image"}
          </p>
        )}
        {instagramStoryWithNoImage && (
          <p className="text-xs font-medium" style={{ color: "#f59e0b" }}>
            ⚠️ Add an image for the Instagram Story
          </p>
        )}
        {linkedinSelectedWithMedia && (
          <p className="text-xs font-medium" style={{ color: "#888" }}>
            ℹ️ LinkedIn will post text only image/video support requires elevated API access
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          form=""
          disabled={submitting || overAnyLimit || accounts.length === 0}
          onClick={handleSubmit}
          className="px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed font-semibold rounded-xl text-sm transition-colors hover:bg-gray-100"
          style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}
        >
          {submitting ? "Scheduling…" : dryRun ? "Schedule Dry Run" : "Schedule Post"}
        </button>
      </div>
    </div>
  );
}
