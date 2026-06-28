"use client";

import { useEffect, useRef, useState } from "react";
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
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [altTexts, setAltTexts] = useState<string[]>([]);
  const [video, setVideo] = useState<{ url: string; previewUrl: string; name: string } | null>(null);
  const [igMediaType, setIgMediaType] = useState<"post" | "reel" | "story">("post");
  const [igLocation, setIgLocation] = useState<{ id: string; name: string } | null>(null);
  const [igLocationQuery, setIgLocationQuery] = useState("");
  const [igLocationResults, setIgLocationResults] = useState<{ id: string; name: string; subtitle?: string }[]>([]);
  const [igUserTags, setIgUserTags] = useState<string[]>([]);
  const [igUserTagInput, setIgUserTagInput] = useState("");
  const [igCollaborators, setIgCollaborators] = useState<string[]>([]);
  const [igCollabInput, setIgCollabInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [perAccountOverrides, setPerAccountOverrides] = useState<Record<string, PerAccountOverride>>({});
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const locationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (locationTimer.current) clearTimeout(locationTimer.current);
    if (!igLocationQuery.trim() || igLocationQuery.length < 2) { setIgLocationResults([]); return; }
    locationTimer.current = setTimeout(async () => {
      try {
        const results = await apiFetch<{ id: string; name: string; subtitle?: string }[]>(
          `/accounts/instagram/locations?q=${encodeURIComponent(igLocationQuery)}`
        );
        setIgLocationResults(results);
      } catch { setIgLocationResults([]); }
    }, 500);
    return () => { if (locationTimer.current) clearTimeout(locationTimer.current); };
  }, [igLocationQuery]);

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

      // One video at a time — replaces any existing video
      if (isVid) {
        const previewUrl = URL.createObjectURL(file);
        const formData = new FormData();
        formData.append("file", file);
        try {
          const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData, credentials: "include" });
          if (!res.ok) { const b = await res.json() as { error: string }; setUploadError(b.error); URL.revokeObjectURL(previewUrl); }
          else {
            const { url } = await res.json() as { url: string };
            setVideo((prev) => { if (prev) { URL.revokeObjectURL(prev.previewUrl); deleteFromStorage(prev.url); } return { url, previewUrl, name: file.name }; });
            setImages((prev) => { prev.forEach((img) => { URL.revokeObjectURL(img.previewUrl); deleteFromStorage(img.url); }); return []; });
            setAltTexts([]); // video and images are mutually exclusive
            setIgMediaType("reel");
          }
        } catch { setUploadError("Upload failed — is the API running?"); URL.revokeObjectURL(previewUrl); }
        continue;
      }

      // Images — up to MAX_IMAGES
      if (images.length >= MAX_IMAGES) continue;
      const previewUrl = URL.createObjectURL(file);
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData, credentials: "include" });
        if (!res.ok) { const b = await res.json() as { error: string }; setUploadError(b.error); URL.revokeObjectURL(previewUrl); continue; }
        const { url } = await res.json() as { url: string };
        setImages((prev) => [...prev, { url, previewUrl, name: file.name || "image" }]);
        setAltTexts((prev) => [...prev, ""]);
        if (video) { URL.revokeObjectURL(video.previewUrl); deleteFromStorage(video.url); setVideo(null); } // clear video when images added
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
  function deleteFromStorage(url: string) {
    // Fire-and-forget — don't block the UI, don't show error if it fails
    fetch(`${API_BASE}/upload`, { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) }).catch(() => {});
  }

  function removeImage(i: number) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[i].previewUrl);
      deleteFromStorage(prev[i].url);
      return prev.filter((_, j) => j !== i);
    });
    setAltTexts((prev) => prev.filter((_, j) => j !== i));
  }
  function removeVideo() {
    if (video) {
      URL.revokeObjectURL(video.previewUrl);
      deleteFromStorage(video.url);
      setVideo(null);
      setIgMediaType("post");
    }
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
      if (igMediaType === "story" && images.length === 0)
        return "Instagram Story requires an image.";
      if (igMediaType === "reel" && !video)
        return "Instagram Reel requires a video.";
      if (igMediaType === "post" && images.length === 0)
        return "Instagram Post requires at least one image.";
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
      const mediaUrls = video ? [video.url] : images.map((i) => i.url);
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
            ...(hasInstagram && igLocation ? { locationId: igLocation.id } : {}),
            ...(hasInstagram && igUserTags.length > 0 ? { userTags: igUserTags } : {}),
            ...(hasInstagram && igCollaborators.length > 0 ? { collaborators: igCollaborators } : {}),
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
      setIgLocation(null); setIgLocationQuery(""); setIgUserTags([]); setIgCollaborators([]);
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      setImages([]); setAltTexts([]); setVideo(null);
    } catch (err) {
      toastError(String(err).replace(/^Error: API POST \/jobs → \d+: /, "").replace(/^\{"error":"/, "").replace(/"\}$/, ""));
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
  const instagramSelected = selectedAccounts.some((a) => a.platform === "instagram");
  const instagramSelectedWithNoMedia = instagramSelected && images.length === 0 && !video && igMediaType !== "story";
  const instagramStoryWithNoImage = instagramSelected && igMediaType === "story" && images.length === 0;
  const onlyInstagramStory = instagramSelected && igMediaType === "story" && selectedAccounts.every((a) => a.platform === "instagram");
  const linkedinSelectedWithMedia = selectedAccounts.some((a) => a.platform === "linkedin") && (images.length > 0 || !!video);

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
                : { borderColor: "#2a2a2a", backgroundColor: "#111111", color: "#ededed" }
              }
            />
            {overAnyLimit && (
              <p className="mt-1 text-xs text-red-500">
                {Math.abs(mostRestrictiveLimit - graphemeCount)} chars over the limit for one of your selected platforms
              </p>
            )}
          </div>

          {/* Per-platform overrides */}
          {selectedAccounts.length > 1 && (
            <div className="px-6 pb-4" style={{ borderBottom: "1px solid #1a1a1a" }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide">Customize per platform</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: "#555", backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>optional</span>
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
                          <span className="text-[10px]">✎ Customize</span>
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
                                    <span className="text-[10px] font-semibold uppercase tracking-wide">Caption</span>
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
                                  <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1">First Comment</span>
                                  <textarea
                                    value={override?.commentText ?? ""}
                                    onChange={e => setOverrideField(a.id, "commentText", e.target.value)}
                                    rows={2}
                                    placeholder={`Custom first comment for ${a.displayName}…`}
                                    className="w-full resize-none rounded-lg px-3 py-2 text-xs focus:outline-none"
                                    style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a", color: "#ededed" }}
                                  />
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
            </div>
          )}

          {/* Media + upload row */}
          <div className="px-6 pt-4 pb-5" style={{ borderBottom: "1px solid #2a2a2a" }}>

            {/* Section header with Instagram format toggle inline */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wide">Media</span>
              {instagramSelected && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-semibold mr-1.5">Instagram format</span>
                  {(["post", "reel", "story"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => {
                      setIgMediaType(t);
                      if (t === "story" && video) { URL.revokeObjectURL(video.previewUrl); deleteFromStorage(video.url); setVideo(null); }
                      if (t === "reel") { images.forEach((img) => { URL.revokeObjectURL(img.previewUrl); deleteFromStorage(img.url); }); setImages([]); setAltTexts([]); }
                    }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all"
                      style={igMediaType === t
                        ? { backgroundColor: "#E1306C20", color: "#E1306C", border: "1px solid #E1306C50" }
                        : { backgroundColor: "#111111", color: "#999", border: "1px solid #1f1f1f" }}>
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Video preview */}
            {video && (
              <div className="mb-3 relative group w-40 rounded-xl overflow-hidden" style={{ border: "1px solid #2a2a2a", backgroundColor: "#1a1a1a" }}>
                <video src={video.previewUrl} className="w-full h-28 object-cover" muted />
                <div className="absolute bottom-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(0,0,0,0.7)", color: "#fff" }}>
                  REEL
                </div>
                <button type="button" onClick={removeVideo}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                  style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>✕</button>
              </div>
            )}

            {/* Image thumbnails + alt text */}
            {images.length > 0 && (
              <div className="space-y-2 mb-3">
                <div className="flex gap-2 flex-wrap">
                  {images.map((img, i) => (
                    <div key={img.url} className="relative group w-20 h-20 rounded-xl overflow-hidden flex-shrink-0" style={{ border: "1px solid #2a2a2a", backgroundColor: "#1a1a1a" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.previewUrl} alt={img.name} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>✕</button>
                    </div>
                  ))}
                  {images.length < MAX_IMAGES && igMediaType !== "story" && Array.from({ length: MAX_IMAGES - images.length }).map((_, i) => (
                    <div key={`e-${i}`} className="w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center"
                      style={{ borderColor: "#222", backgroundColor: "#0a0a0a" }}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#2a2a2a" }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  ))}
                </div>

                {/* Alt text inputs — show when Instagram is selected */}
                {instagramSelected && igMediaType === "post" && (
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
                  ? "image/jpeg,image/png"
                  : "image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime"}
                multiple={igMediaType !== "reel" && igMediaType !== "story"}
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
                  igMediaType === "reel" ? (video ? "Change video" : "Add video") :
                  igMediaType === "story" ? (images.length > 0 ? "Change image" : "Add story image") :
                  video ? "Change video" :
                  images.length > 0 ? `${images.length}/${MAX_IMAGES} photos` : "Add photo / video"}
              </label>
              {!video && images.length === 0 && (
                <span className="text-xs">or Ctrl+V to paste</span>
              )}
            </div>
            {uploadError && <p className="mt-2 text-xs text-red-500 rounded-lg px-3 py-2" style={{ backgroundColor: "#1f0a0a", border: "1px solid #3a1a1a" }}>{uploadError}</p>}
          </div>

          {/* Instagram tagging options — location, user tags, collaborators */}
          {instagramSelected && igMediaType === "post" && (
            <div className="px-6 pb-5 pt-4" style={{ borderBottom: "1px solid #2a2a2a" }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide">Instagram Options</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: "#555", backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>optional</span>
              </div>
              <div className="space-y-3">

                {/* Location */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#aaa" }}>Location</label>
                  {igLocation ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: "#0a1a0a", border: "1px solid #14532d" }}>
                      <span className="text-xs flex-1" style={{ color: "#ededed" }}>{igLocation.name}</span>
                      <button type="button" onClick={() => { setIgLocation(null); setIgLocationQuery(""); }}
                        className="text-xs hover:opacity-70" style={{ color: "#555" }}>✕</button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        value={igLocationQuery}
                        onChange={e => setIgLocationQuery(e.target.value)}
                        placeholder="Search for a place…"
                        className="w-full rounded-xl px-3 py-2 text-xs focus:outline-none"
                        style={{ backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", color: "#ededed" }}
                      />
                      {igLocationResults.length > 0 && (
                        <div className="absolute z-10 top-full mt-1 w-full rounded-xl overflow-hidden shadow-lg" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
                          {igLocationResults.slice(0, 5).map(loc => (
                            <button key={loc.id} type="button"
                              onClick={() => { setIgLocation({ id: loc.id, name: loc.name }); setIgLocationQuery(""); setIgLocationResults([]); }}
                              className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors">
                              <p className="text-xs font-medium" style={{ color: "#ededed" }}>{loc.name}</p>
                              {loc.subtitle && <p className="text-[10px]" style={{ color: "#555" }}>{loc.subtitle}</p>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* User tags */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#aaa" }}>Tag users</label>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {igUserTags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "#5b63d315", color: "#5b63d3", border: "1px solid #5b63d330" }}>
                        @{tag}
                        <button type="button" onClick={() => setIgUserTags(p => p.filter(t => t !== tag))} className="hover:opacity-70">✕</button>
                      </span>
                    ))}
                  </div>
                  <form onSubmit={e => {
                    e.preventDefault();
                    const u = igUserTagInput.trim().replace(/^@/, "");
                    if (u && !igUserTags.includes(u)) setIgUserTags(p => [...p, u]);
                    setIgUserTagInput("");
                  }} className="flex gap-2">
                    <input type="text" value={igUserTagInput} onChange={e => setIgUserTagInput(e.target.value)}
                      placeholder="username (without @)"
                      className="flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none"
                      style={{ backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", color: "#ededed" }} />
                    <button type="submit" className="text-xs px-3 py-2 rounded-xl font-semibold"
                      style={{ backgroundColor: "#1a1a1a", color: "#888", border: "1px solid #2a2a2a" }}>Add</button>
                  </form>
                </div>

                {/* Collaborators */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#aaa" }}>Collaborators <span style={{ color: "#555", fontWeight: 400 }}>(co-author the post)</span></label>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {igCollaborators.map(c => (
                      <span key={c} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "#7c3aed15", color: "#7c3aed", border: "1px solid #7c3aed30" }}>
                        @{c}
                        <button type="button" onClick={() => setIgCollaborators(p => p.filter(x => x !== c))} className="hover:opacity-70">✕</button>
                      </span>
                    ))}
                  </div>
                  <form onSubmit={e => {
                    e.preventDefault();
                    const u = igCollabInput.trim().replace(/^@/, "");
                    if (u && !igCollaborators.includes(u)) setIgCollaborators(p => [...p, u]);
                    setIgCollabInput("");
                  }} className="flex gap-2">
                    <input type="text" value={igCollabInput} onChange={e => setIgCollabInput(e.target.value)}
                      placeholder="username (without @)"
                      className="flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none"
                      style={{ backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", color: "#ededed" }} />
                    <button type="submit" className="text-xs px-3 py-2 rounded-xl font-semibold"
                      style={{ backgroundColor: "#1a1a1a", color: "#888", border: "1px solid #2a2a2a" }}>Add</button>
                  </form>
                </div>

              </div>
            </div>
          )}

          {/* First comment — hidden when all selected accounts are Instagram Story */}
          {!onlyInstagramStory && (
            <div className="px-6 pb-6 pt-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wide">First Comment</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: "#555", backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>optional</span>
              </div>
              <p className="text-xs mb-2.5">Posted as the first reply immediately after your post goes live.</p>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a link, thread continuation, or extra context…"
                rows={3}
                className="w-full resize-none rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition"
                style={{ borderColor: "#2a2a2a", backgroundColor: "#111111", color: "#ededed" }}
              />
            </div>
          )}
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
                    images={images}
                    video={video}
                    igMediaType={a.platform === "instagram" ? igMediaType : undefined}
                  />
                );
              })
            )}
          </div>
        </div>
      </form>

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
