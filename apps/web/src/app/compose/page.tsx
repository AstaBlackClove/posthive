"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import confetti from "canvas-confetti";
import { apiFetch } from "../../lib/api";
import { useToast } from "../../components/Toast";
import { DateTimePicker } from "../../components/DateTimePicker";
import { PlatformIcon } from "../../components/PlatformIcon";
import { BulkScheduleModal } from "../../components/BulkScheduleModal";
import {
  PlatformPreview,
  PLATFORM_COLOR, PLATFORM_LIMIT, MAX_IMAGES, countGraphemes,
} from "../../components/PlatformPreview";
import type { Account, UploadedImage, PerAccountOverride } from "../../components/PlatformPreview";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Mirrors apps/api/src/lib/storage.ts (images) and apps/api/src/routes/upload.ts (videos)
const MAX_IMAGE_SIZE_MB = 10;
const MAX_VIDEO_SIZE_MB = 100;

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
  const [youtubeTitle, setYoutubeTitle] = useState("");
  const [youtubeDescription, setYoutubeDescription] = useState("");
  const [youtubeType, setYoutubeType] = useState<"short" | "video">("short");
  const [youtubeVideoMode, setYoutubeVideoMode] = useState<"upload" | "url">("upload");
  const [youtubeVideoUrl, setYoutubeVideoUrl] = useState("");
  const [pinterestTitle, setPinterestTitle] = useState("");
  const [pinterestDescription, setPinterestDescription] = useState("");
const [youtubeShortsWarning, setYoutubeShortsWarning] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [perAccountOverrides, setPerAccountOverrides] = useState<Record<string, PerAccountOverride>>({});
  const [showCustomize, setShowCustomize] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [allowOverrides, setAllowOverrides] = useState(true); // optimistic; corrected after fetch
  const [allowReels, setAllowReels] = useState(true); // optimistic; corrected after fetch
  const [maxImagesPerPost, setMaxImagesPerPost] = useState(10); // optimistic; corrected after fetch
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const [templates, setTemplates] = useState<{ id: string; name: string; content: string }[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [saveTemplateDialog, setSaveTemplateDialog] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const [deleteTemplateTarget, setDeleteTemplateTarget] = useState<{ id: string; name: string } | null>(null);
  const templatesRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaItemsRef = useRef(mediaItems);
  useEffect(() => { mediaItemsRef.current = mediaItems; }, [mediaItems]);

  // Close templates dropdown on outside click
  useEffect(() => {
    if (!showTemplates) return;
    const handler = (e: MouseEvent) => {
      if (templatesRef.current && !templatesRef.current.contains(e.target as Node)) setShowTemplates(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTemplates]);

  // Pre-fill compose from a duplicated post
  useEffect(() => {
    const raw = sessionStorage.getItem("posthive_duplicate_draft");
    if (!raw) return;
    sessionStorage.removeItem("posthive_duplicate_draft");
    try {
      const draft = JSON.parse(raw) as {
        text: string;
        commentText: string;
        accountIds: string[];
        mediaType?: "post" | "reel" | "story";
        youtubeType?: "short" | "video";
        youtubeVideoMode?: "upload" | "url";
        youtubeVideoUrl?: string;
        youtubeTitle?: string;
        youtubeDescription?: string;
        pinterestTitle?: string;
        pinterestDescription?: string;
        perAccount?: Record<string, { text?: string; commentText?: string }>;
      };
      setText(draft.text);
      setCommentText(draft.commentText);
      setSelectedIds(draft.accountIds);
      if (draft.mediaType) setIgMediaType(draft.mediaType);
      if (draft.youtubeType) setYoutubeType(draft.youtubeType);
      if (draft.youtubeVideoMode) setYoutubeVideoMode(draft.youtubeVideoMode);
      if (draft.youtubeVideoUrl) setYoutubeVideoUrl(draft.youtubeVideoUrl);
      if (draft.youtubeTitle !== undefined) setYoutubeTitle(draft.youtubeTitle);
      if (draft.youtubeDescription !== undefined) setYoutubeDescription(draft.youtubeDescription);
      if (draft.pinterestTitle !== undefined) setPinterestTitle(draft.pinterestTitle);
      if (draft.pinterestDescription !== undefined) setPinterestDescription(draft.pinterestDescription);
      if (draft.perAccount) setPerAccountOverrides(draft.perAccount);
    } catch { /* malformed draft — ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // Fetch plan capabilities when billing is enabled
    if (process.env.NEXT_PUBLIC_ENABLE_BILLING === "true") {
      apiFetch<{ allowOverrides: boolean; allowReels: boolean; maxImagesPerPost: number }>("/billing/status")
        .then(s => { setAllowOverrides(s.allowOverrides); setAllowReels(s.allowReels); setMaxImagesPerPost(s.maxImagesPerPost); })
        .catch(() => { setAllowOverrides(false); setAllowReels(false); setMaxImagesPerPost(4); });
    }

    apiFetch<Account[]>("/accounts")
      .then((data) => { setAccounts(data); })
      .finally(() => setLoadingAccounts(false));

    apiFetch<{ templates: { id: string; name: string; content: string }[] }>("/templates")
      .then((data) => setTemplates(data.templates))
      .catch(() => {});
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
      if (mediaItems.length >= maxImagesPerPost) { setUploadError(`Maximum ${maxImagesPerPost} images per post on your plan. Upgrade to Pro for up to 10.`); continue; }
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

    // Text required for everything except Instagram Story and YouTube-only (uses its own Title field)
    if (!text.trim() && !onlyInstagramStory && !noPostTextNeeded) return "Write something before scheduling.";

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

    // Bluesky "" text required (images optional)
    if (hasBluesky && !text.trim()) return "Bluesky requires a caption.";

    // Threads "" text required, video supported (single video only)
    if (hasThreads && !text.trim()) return "Threads requires a caption.";

    // YouTube — title required, video required (either uploaded or external URL)
    if (youtubeSelected) {
      if (!youtubeTitle.trim()) return "YouTube requires a title.";
      if (youtubeVideoMode === "url") {
        if (!youtubeVideoUrl.trim()) return "YouTube requires a video URL.";
        try { new URL(youtubeVideoUrl); } catch { return "Please enter a valid video URL (must start with https://)."; }
      } else {
        if (!video) return "YouTube requires a video attached.";
      }
    }

    // Character limits
    for (const p of platformLimits) {
      if (p.over) return `Your caption is too long for ${p.platform} (${p.effectiveCount}/${p.limit} characters).`;
    }

    // Scheduled time must be in the future
    if (new Date(scheduledFor) <= new Date()) return "Scheduled time must be in the future.";

    return null;
  }

  async function saveTemplate() {
    const name = saveTemplateName.trim();
    if (!name) return;
    if (templates.some(t => t.name.toLowerCase() === name.toLowerCase())) {
      toastError(`A template named "${name}" already exists.`);
      return;
    }
    setSavingTemplate(true);
    setSaveTemplateDialog(false);
    setSaveTemplateName("");
    try {
      const res = await apiFetch<{ template: { id: string; name: string; content: string } }>("/templates", {
        method: "POST",
        body: JSON.stringify({
          name,
          content: { text, commentText: commentText || undefined, mediaUrls: mediaItems.map(m => m.url), altTexts: altTexts.some(Boolean) ? altTexts : undefined, youtubeTitle: youtubeTitle || undefined, youtubeDescription: youtubeDescription || undefined, youtubeType },
        }),
      });
      setTemplates(prev => [res.template, ...prev]);
      toastSuccess("Template saved!");
    } catch {
      toastError("Failed to save template.");
    } finally {
      setSavingTemplate(false);
    }
  }

  function loadTemplate(tpl: { id: string; name: string; content: string }) {
    const content = JSON.parse(tpl.content) as { text?: string; commentText?: string; youtubeTitle?: string; youtubeDescription?: string; youtubeType?: "short" | "video"; pinterestTitle?: string; pinterestDescription?: string };
    if (content.text !== undefined) setText(content.text);
    if (content.commentText !== undefined) setCommentText(content.commentText);
    if (content.youtubeTitle !== undefined) setYoutubeTitle(content.youtubeTitle);
    if (content.youtubeDescription !== undefined) setYoutubeDescription(content.youtubeDescription);
    if (content.youtubeType) setYoutubeType(content.youtubeType);
    if (content.pinterestTitle !== undefined) setPinterestTitle(content.pinterestTitle);
    if (content.pinterestDescription !== undefined) setPinterestDescription(content.pinterestDescription);
    setShowTemplates(false);
    toastSuccess(`Template "${tpl.name}" loaded.`);
  }

  async function deleteTemplate() {
    if (!deleteTemplateTarget) return;
    const { id, name } = deleteTemplateTarget;
    setDeleteTemplateTarget(null);
    try {
      await apiFetch(`/templates/${id}`, { method: "DELETE" });
      setTemplates(prev => prev.filter(t => t.id !== id));
      toastSuccess(`Template "${name}" deleted.`);
    } catch {
      toastError("Failed to delete template.");
    }
  }

  function resetForm() {
    setText(""); setCommentText(""); setScheduledFor(defaultScheduledFor());
    setIgMediaType("post");
    setYoutubeTitle(""); setYoutubeDescription(""); setYoutubeType("short");
    setYoutubeVideoMode("upload"); setYoutubeVideoUrl("");
    setPinterestTitle(""); setPinterestDescription("");
    setPerAccountOverrides({}); setShowCustomize(false); setUploadError(null);
    mediaItems.forEach(m => URL.revokeObjectURL(m.previewUrl));
    setMediaItems([]); setAltTexts([]);
  }

  async function handleSaveDraft() {
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
          draft: true,
          content: {
            text,
            mediaUrls,
            ...(altTexts.some(Boolean) ? { altTexts } : {}),
            ...(hasInstagram && igMediaType !== "post" ? { mediaType: igMediaType } : {}),
            ...(youtubeSelected ? { youtubeType, youtubeVideoMode } : {}),
            ...(youtubeSelected && youtubeVideoMode === "url" && youtubeVideoUrl.trim() ? { youtubeVideoUrl: youtubeVideoUrl.trim() } : {}),
            ...(Object.keys(cleanOverrides).length > 0 ? { perAccount: cleanOverrides } : {}),
          },
          commentText: commentText.trim() || undefined,
          accountIds: selectedIds,
          dryRun: false,
        }),
      });
      toastSuccess("Draft saved — find it in Posts → Drafts.");
      resetForm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
      toastError(msg.replace(/^Error: API POST \/jobs → \d+: /, "").replace(/^\{"error":"/, "").replace(/"\}$/, ""));
    } finally { setSubmitting(false); }
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
            ...(youtubeSelected ? { youtubeType, youtubeVideoMode } : {}),
            ...(youtubeSelected && youtubeVideoMode === "url" && youtubeVideoUrl.trim() ? { youtubeVideoUrl: youtubeVideoUrl.trim() } : {}),
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
      resetForm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
      toastError(msg.replace(/^Error: API POST \/jobs → \d+: /, "").replace(/^\{"error":"/, "").replace(/"\}$/, ""));
    }
    finally { setSubmitting(false); }
  }

  const graphemeCount = countGraphemes(text);
  const selectedAccounts = accounts.filter((a) => selectedIds.includes(a.id));
  // YouTube doesn't use the shared Post box — it has its own dedicated Title/Description
  // counters — so it's excluded here to avoid showing a misleading/duplicate limit.
  const platformLimits = selectedAccounts.filter((a) => a.platform !== "youtube" && a.platform !== "pinterest").map((a) => {
    const limit = PLATFORM_LIMIT[a.platform] ?? 300;
    const effectiveText = perAccountOverrides[a.id]?.text ?? text;
    const effectiveCount = countGraphemes(effectiveText);
    return { platform: a.platform, limit, icon: a.platform, over: effectiveCount > limit, effectiveCount, color: PLATFORM_COLOR[a.platform] ?? "#6b7280" };
  });
  const mostRestrictiveLimit = platformLimits.length > 0 ? Math.min(...platformLimits.map((p) => p.limit)) : 300;
  const overAnyLimit = platformLimits.some((p) => p.over);
  const images = mediaItems.filter(m => !m.isVideo);
  const video = mediaItems.find(m => m.isVideo) ?? null;
  const instagramSelected = selectedAccounts.some((a) => a.platform === "instagram");
  const instagramSelectedWithNoMedia = instagramSelected && mediaItems.length === 0 && igMediaType !== "story";
  const instagramStoryWithNoImage = instagramSelected && igMediaType === "story" && mediaItems.length === 0;
  const onlyInstagramStory = instagramSelected && igMediaType === "story" && selectedAccounts.every((a) => a.platform === "instagram");
  const linkedinSelectedWithMedia = selectedAccounts.some((a) => a.platform === "linkedin") && mediaItems.length > 0;
  const pinterestAccounts = selectedAccounts.filter((a) => a.platform === "pinterest");
  const pinterestSelected = pinterestAccounts.length > 0;
  const pinterestSelectedWithNoImage = pinterestSelected && images.length === 0;
  const youtubeAccounts = selectedAccounts.filter((a) => a.platform === "youtube");
  const youtubeSelected = youtubeAccounts.length > 0;
  const youtubeSelectedWithNoVideo = youtubeSelected && (youtubeVideoMode === "upload" ? !video : !youtubeVideoUrl.trim());
  const onlyYoutube = youtubeSelected && selectedAccounts.every((a) => a.platform === "youtube");
  const onlyPinterest = pinterestSelected && selectedAccounts.every((a) => a.platform === "pinterest");
  // True when every selected account is YouTube or Pinterest — both have their own title/description fields
  const noPostTextNeeded = selectedAccounts.length > 0 && selectedAccounts.every((a) => a.platform === "youtube" || a.platform === "pinterest");
  // Telegram channels don't support first comments — hide the field when all selected accounts don't support comments
  const NO_COMMENT_PLATFORMS = new Set(["pinterest", "telegram"]);
  const noCommentSupport = selectedAccounts.length > 0 && selectedAccounts.every((a) => NO_COMMENT_PLATFORMS.has(a.platform));

  const twitterSelected = selectedAccounts.some((a) => a.platform === "twitter");
  const urlPattern = /https?:\/\/\S+|(?<![/@\w])(?:www\.)\S+|(?<![/@\w])\b[\w-]+(?:\.[\w-]+)*\.[a-z]{2,6}\b(?:[/?#]\S*)?/i;
  const twitterAccounts = selectedAccounts.filter((a) => a.platform === "twitter");
  const twitterTextHasLink = twitterSelected && twitterAccounts.some((a) => {
    const effectiveText = perAccountOverrides[a.id]?.text ?? text;
    return urlPattern.test(effectiveText);
  });
  const twitterCommentHasLink = twitterSelected && twitterAccounts.some((a) => {
    const effectiveComment = perAccountOverrides[a.id]?.commentText ?? commentText;
    return urlPattern.test(effectiveComment);
  });
  const twitterHasLink = twitterTextHasLink || twitterCommentHasLink;

  // YouTube only treats an upload as a Short when it's vertical (9:16), ≤60s, AND
  // tagged #Shorts — the hashtag alone does nothing if the video itself doesn't
  // qualify. Probe the actual file's dimensions/duration so we can warn upfront
  // instead of the upload silently landing as a regular video.
  useEffect(() => {
    if (!youtubeSelected || youtubeType !== "short" || !video) { setYoutubeShortsWarning(null); return; }
    const el = document.createElement("video");
    el.preload = "metadata";
    el.src = video.previewUrl;
    el.onloadedmetadata = () => {
      const { videoWidth: w, videoHeight: h, duration } = el;
      const issues: string[] = [];
      if (w && h && h <= w) issues.push("isn't vertical (9:16) — it'll likely upload as a regular video, not a Short");
      else if (w && h && duration && duration > 60) issues.push(`is ${Math.round(duration)}s — Shorts reliably need ≤60s`);
      setYoutubeShortsWarning(issues.length ? `This video ${issues[0]}.` : null);
    };
    return () => { el.onloadedmetadata = null; };
  }, [video, youtubeSelected, youtubeType]);

  // Keep each connected YouTube account's per-account override in sync with the
  // dedicated Title/Description fields — YouTube needs structured title+description
  // rather than the shared free-text "Post" box the other platforms use.
  useEffect(() => {
    if (youtubeAccounts.length === 0) return;
    const combined = youtubeDescription ? `${youtubeTitle}\n\n${youtubeDescription}` : youtubeTitle;
    setPerAccountOverrides(prev => {
      const next = { ...prev };
      for (const a of youtubeAccounts) {
        next[a.id] = { ...next[a.id], text: combined };
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeTitle, youtubeDescription, selectedIds.join(",")]);

  // Keep each Pinterest account's per-account override in sync with the
  // dedicated Title/Description fields.
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

  const previewContent = selectedAccounts.length === 0 ? (
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
          youtubeType={a.platform === "youtube" ? youtubeType : undefined}
        />
      );
    })
  );

  return (
    <><div className="flex flex-col h-full overflow-hidden">

      {/* Save template dialog */}
      {saveTemplateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #2a2a2a" }}>
              <h3 className="text-sm font-bold" style={{ color: "#ededed" }}>Save as template</h3>
              <p className="text-xs mt-0.5" style={{ color: "#888" }}>Give this template a name to reuse it later.</p>
            </div>
            <div className="px-5 py-4">
              <input
                autoFocus
                value={saveTemplateName}
                onChange={e => setSaveTemplateName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveTemplate(); if (e.key === "Escape") setSaveTemplateDialog(false); }}
                placeholder="e.g. Weekly update, Product launch…"
                className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
                style={{ backgroundColor: "#0d0d0d", borderColor: "#2a2a2a", color: "#ededed" }}
              />
            </div>
            <div className="flex items-center justify-end gap-2 px-5 pb-4">
              <button type="button" onClick={() => setSaveTemplateDialog(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium hover:opacity-70 transition-opacity"
                style={{ color: "#888" }}>Cancel</button>
              <button type="button" onClick={saveTemplate} disabled={!saveTemplateName.trim()}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors hover:bg-gray-100 disabled:opacity-40"
                style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete template confirm dialog */}
      {deleteTemplateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #2a2a2a" }}>
              <h3 className="text-sm font-bold" style={{ color: "#ededed" }}>Delete template</h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm" style={{ color: "#888" }}>
                Delete <span className="font-semibold" style={{ color: "#ededed" }}>&ldquo;{deleteTemplateTarget.name}&rdquo;</span>? This cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 pb-4">
              <button type="button" onClick={() => setDeleteTemplateTarget(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium hover:opacity-70 transition-opacity"
                style={{ color: "#888" }}>Cancel</button>
              <button type="button" onClick={deleteTemplate}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors hover:opacity-90"
                style={{ backgroundColor: "#ef4444", color: "#fff" }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between pl-16 pr-4 md:px-8" style={{ height: 65, borderBottom: "1px solid #2a2a2a", backgroundColor: "#0a0a0a" }}>
        <div>
          <h1 className="text-lg font-bold text-gray-900">New Post</h1>
          <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">Write once · schedule across platforms</p>
        </div>
        {!loadingAccounts && accounts.length === 0 && (
          <a href="/accounts" className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg font-medium flex-shrink-0">
            ⚠️ Connect an account first →
          </a>
        )}
      </div>

      {/* Main area "" editor left, previews right (stacked on mobile) */}
      <form onSubmit={handleSubmit} onPaste={handlePaste} className="flex flex-col md:flex-row flex-1 min-h-0 overflow-y-auto md:overflow-hidden">

        {/* Left "" editor */}
        <div className="flex flex-col md:flex-1 md:overflow-y-auto md:min-h-0" style={{ borderRight: "1px solid #2a2a2a", backgroundColor: "#0a0a0a" }}>

          {/* Platform selector */}
          <div className="px-6 pt-4 pb-3" style={{ borderBottom: "1px solid #2a2a2a" }}>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-semibold uppercase tracking-widest">Post to</p>
              {loadingAccounts && <div className="h-3 w-24 rounded animate-pulse" style={{ backgroundColor: "#1a1a1a" }} />}
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

          {/* Skeleton — shown while accounts load */}
          {loadingAccounts && (
            <div className="px-6 py-5 flex flex-col gap-4 animate-pulse">
              <div className="h-3 w-20 rounded" style={{ backgroundColor: "#1a1a1a" }} />
              <div className="rounded-xl" style={{ height: 160, backgroundColor: "#1a1a1a" }} />
              <div className="flex gap-2">
                <div className="h-8 w-28 rounded-lg" style={{ backgroundColor: "#1a1a1a" }} />
                <div className="h-8 w-20 rounded-lg" style={{ backgroundColor: "#1a1a1a" }} />
              </div>
              <div className="h-px" style={{ backgroundColor: "#1e1e1e" }} />
              <div className="h-3 w-24 rounded" style={{ backgroundColor: "#1a1a1a" }} />
              <div className="h-8 w-44 rounded-lg" style={{ backgroundColor: "#1a1a1a" }} />
              <div className="h-px" style={{ backgroundColor: "#1e1e1e" }} />
              <div className="h-3 w-16 rounded" style={{ backgroundColor: "#1a1a1a" }} />
              <div className="h-9 w-full rounded-xl" style={{ backgroundColor: "#1a1a1a" }} />
              <div className="mt-2 h-10 w-36 rounded-xl self-end" style={{ backgroundColor: "#1a1a1a" }} />
            </div>
          )}

          {/* Text editor */}
          <div className="px-6 py-5" style={{ display: (loadingAccounts || noPostTextNeeded) ? "none" : undefined }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide">Post</span>
              <div className="flex items-center gap-3">
                {/* Templates — hidden when only YouTube selected */}
                {!noPostTextNeeded && (
                  <div className="flex items-center gap-2" ref={templatesRef} style={{ position: "relative" }}>
                    <button type="button" onClick={() => setShowTemplates(v => !v)}
                      className="flex items-center gap-1 text-[11px] font-medium transition-opacity hover:opacity-80"
                      style={{ color: "#888" }}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Templates
                    </button>
                    <button type="button" onClick={() => { setSaveTemplateName(""); setSaveTemplateDialog(true); }} disabled={savingTemplate || !text.trim()}
                      className="text-[11px] font-medium transition-opacity hover:opacity-80 disabled:opacity-30"
                      style={{ color: "#5b63d3" }}>
                      {savingTemplate ? "Saving…" : "+ Save"}
                    </button>
                    {showTemplates && (
                      <div className="absolute top-6 right-0 z-30 w-56 rounded-xl overflow-hidden shadow-xl"
                        style={{ backgroundColor: "#161616", border: "1px solid #2a2a2a" }}>
                        <div className="px-3 py-2 border-b" style={{ borderColor: "#2a2a2a" }}>
                          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#555" }}>Templates</span>
                        </div>
                        {templates.length === 0 ? (
                          <p className="px-3 py-4 text-xs text-center" style={{ color: "#555" }}>No templates yet. Write something and click + Save.</p>
                        ) : (
                          <ul className="max-h-64 overflow-y-auto">
                            {templates.map(tpl => (
                              <li key={tpl.id} className="flex items-center group px-3 py-2.5 border-b last:border-0 hover:bg-white/5 transition-colors cursor-pointer"
                                style={{ borderColor: "#1f1f1f" }}
                                onClick={() => loadTemplate(tpl)}>
                                <span className="flex-1 text-xs font-medium truncate" style={{ color: "#ededed" }}>{tpl.name}</span>
                                <button type="button" onClick={(e) => { e.stopPropagation(); setShowTemplates(false); setDeleteTemplateTarget({ id: tpl.id, name: tpl.name }); }}
                                  className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:text-red-400"
                                  style={{ color: "#555" }}>✕</button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {/* Instagram format toggle */}
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
                      if ((t === "reel" || t === "story") && !allowReels) {
                        toastWarning("Instagram Reels & Stories are a Pro feature. Upgrade to unlock.");
                        return;
                      }
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
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all inline-flex items-center gap-1"
                      style={igMediaType === t
                        ? { backgroundColor: "#E1306C20", color: "#E1306C", border: "1px solid #E1306C50" }
                        : { backgroundColor: "#111111", color: "#666", border: "1px solid #1f1f1f" }}>
                      {t}
                      {(t === "reel" || t === "story") && !allowReels && (
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><rect x="2" y="5" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M4 5V3.5a2 2 0 014 0V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
              </div>{/* end flex items-center gap-3 */}

            </div>
            {!onlyInstagramStory && !noPostTextNeeded && (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What do you want to share?"
                required={!noPostTextNeeded}
                rows={8}
                className="w-full resize-none rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition"
                style={overAnyLimit
                  ? { borderColor: "#fca5a5", backgroundColor: "#111111", color: "#ededed" }
                  : { borderColor: "#2a2a2a", backgroundColor: "#111111", color: "#ededed" }
                }
              />
            )}
            {/* Char counters below textarea */}
            {!onlyInstagramStory && !noPostTextNeeded && <div className="flex items-center gap-3 mt-1.5">
              {overAnyLimit && (
                <p className="text-xs text-red-500 flex-1">
                  {Math.abs(mostRestrictiveLimit - graphemeCount)} chars over limit
                </p>
              )}
              <div className="flex items-center gap-3 ml-auto">
                {platformLimits.map((p) => (
                  <span key={p.platform} className="text-xs font-medium flex items-center gap-1"
                    style={{ color: p.over ? "#ef4444" : p.effectiveCount > p.limit * 0.8 ? "#f59e0b" : "#444" }}>
                    <PlatformIcon platform={p.icon} size={11} /> {p.effectiveCount}/{p.limit}
                  </span>
                ))}
              </div>
            </div>}
          </div>

          {/* YouTube — dedicated Title + Description fields (uses per-account overrides under the hood) */}
          {youtubeSelected && (
            <div className="px-6 pb-5 pt-4" style={{ borderBottom: "1px solid #2a2a2a", display: loadingAccounts ? "none" : undefined }}>
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
                {youtubeType === "short"
                  ? "Uploads to the Shorts shelf separate title and description, other selected platforms keep using the Post box above."
                  : "Uploads as a regular video separate title and description, other selected platforms keep using the Post box above."}
              </p>

              {youtubeShortsWarning && (
                <p className="text-xs font-medium mb-2.5 flex items-start gap-1.5" style={{ color: "#f59e0b" }}>
                  <span className="flex-shrink-0">⚠️</span>
                  <span>{youtubeShortsWarning} YouTube classifies Shorts by the video itself (vertical, ≤60s) — #Shorts alone won't override that.</span>
                </p>
              )}

              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#555" }}>Title</span>
                  <span className="text-[10px]" style={{ color: youtubeTitle.length > 100 ? "#ef4444" : "#444" }}>{youtubeTitle.length}/100</span>
                </div>
                <input
                  value={youtubeTitle}
                  onChange={(e) => setYoutubeTitle(e.target.value)}
                  placeholder="Video title"
                  required={onlyYoutube}
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
                  value={youtubeDescription}
                  onChange={(e) => setYoutubeDescription(e.target.value)}
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
                      onChange={(e) => setYoutubeVideoUrl(e.target.value)}
                      placeholder="https://your-cdn.com/video.mp4"
                      className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition"
                      style={{
                        borderColor: youtubeVideoUrl.trim() && (() => { try { new URL(youtubeVideoUrl); return false; } catch { return true; } })() ? "#ef4444" : "#2a2a2a",
                        backgroundColor: "#111111",
                        color: "#ededed",
                      }}
                    />
                    {youtubeVideoUrl.trim() && (() => { try { new URL(youtubeVideoUrl); return false; } catch { return true; } })() ? (
                      <p className="text-xs mt-1.5" style={{ color: "#ef4444" }}>Invalid URL — must start with https://</p>
                    ) : (
                      <p className="text-xs mt-1.5" style={{ color: "#555" }}>
                        Any public URL — S3, Supabase, Cloudflare R2, direct CDN. No file size limit.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: video ? "#4ade80" : "#555" }}>
                    {video ? `✓ ${video.name}` : "Attach a video using the 📎 button below. Max 100 MB for uploaded files — use Paste URL for larger videos."}
                  </p>
                )}
              </div>

            </div>
          )}

          {/* Pinterest — dedicated Title + Description fields */}
          {pinterestSelected && (
            <div className="px-6 pb-5 pt-4" style={{ borderBottom: "1px solid #2a2a2a", display: loadingAccounts ? "none" : undefined }}>
              <div className="flex items-center gap-2 mb-1">
                <PlatformIcon platform="pinterest" size={13} />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#e60023" }}>Pinterest</span>
              </div>
              <p className="text-xs mb-2.5" style={{ color: "#999" }}>
                Pins have a separate title and description. Other selected platforms keep using the Post box above.
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

          {/* First comment "" right below the post text */}
          <div className="px-6 pb-5 pt-4" style={{ borderBottom: "1px solid #2a2a2a", display: (loadingAccounts || noCommentSupport) ? "none" : undefined }}>
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


          {/* Media + upload row — hidden when only YouTube is selected in URL mode (video URL lives in the YouTube section) */}
          <div className="px-6 pt-4 pb-5" style={{ borderBottom: "1px solid #2a2a2a", display: (loadingAccounts || (onlyYoutube && youtubeVideoMode === "url")) ? "none" : undefined }}>

            {/* Section header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wide">Media</span>
            </div>

            {/* Media thumbnails "" unified image + video grid */}
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

                {/* Alt text "" only for image items when Instagram post selected */}
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

            {/* Hide file upload when only YouTube is selected and user chose Paste URL — the video URL lives in the YouTube section above */}
            {!(onlyYoutube && youtubeVideoMode === "url") && (
              <>
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
                <p className="mt-1.5 text-[11px]" style={{ color: "#555" }}>
                  Images up to {MAX_IMAGE_SIZE_MB}MB · Videos up to {MAX_VIDEO_SIZE_MB}MB
                </p>
                {uploadError && <p className="mt-2 text-xs text-red-500 rounded-lg px-3 py-2" style={{ backgroundColor: "#1f0a0a", border: "1px solid #3a1a1a" }}>{uploadError}</p>}
              </>
            )}

            {/* Option buttons row */}
            {(instagramSelected || selectedAccounts.length > 1) && (
              <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid #1a1a1a" }}>
                {selectedAccounts.filter(a => a.platform !== "youtube" && a.platform !== "pinterest").length > 1 && (() => {
                  const customizableOverrideCount = Object.keys(perAccountOverrides)
                    .filter(id => {
                      const acc = selectedAccounts.find(a => a.id === id);
                      return acc && acc.platform !== "youtube" && acc.platform !== "pinterest";
                    }).length;
                  return (
                  <button type="button" onClick={() => {
                    if (!allowOverrides) {
                      toastWarning("Per-platform customization is a Pro feature. Upgrade to unlock.");
                      return;
                    }
                    setShowCustomize(true);
                  }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      border: `1px solid ${customizableOverrideCount > 0 ? "#5b63d350" : "#2a2a2a"}`,
                      backgroundColor: customizableOverrideCount > 0 ? "#5b63d310" : "#111111",
                      color: customizableOverrideCount > 0 ? "#5b63d3" : "#888",
                    }}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Customize per platform
                    {!allowOverrides && (
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><rect x="2" y="5" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M4 5V3.5a2 2 0 014 0V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    )}
                    {customizableOverrideCount > 0 && (
                      <span className="text-[10px] font-bold px-1 py-0.5 rounded"
                        style={{ backgroundColor: "#5b63d320", color: "#5b63d3" }}>
                        {customizableOverrideCount}
                      </span>
                    )}
                  </button>
                  );
                })()}
              </div>
            )}
          </div>

        </div>

        {/* Right "" per-platform previews — desktop only, fixed 480px. Mobile uses the drawer instead */}
        <div className="hidden md:flex md:w-[480px] flex-shrink-0 flex-col md:overflow-y-auto" style={{ backgroundColor: "#0a0a0a" }}>
          <div className="px-5 pt-5 pb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Preview</p>
          </div>
          <div className="px-5 pb-5 space-y-4 flex-1">
            {previewContent}
          </div>
        </div>
      </form>

      {/* Mobile-only: preview drawer */}
      {previewOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setPreviewOpen(false)}>
          <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,.6)" }} />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl flex flex-col"
            style={{ backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", borderBottom: "none", maxHeight: "80vh" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-center pt-2.5 pb-1 flex-shrink-0">
              <div className="w-9 h-1 rounded-full" style={{ backgroundColor: "#2a2a2a" }} />
            </div>
            <div className="flex items-center justify-between px-5 pt-1 pb-3 flex-shrink-0" style={{ borderBottom: "1px solid #2a2a2a" }}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Preview</p>
              <button type="button" onClick={() => setPreviewOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5" style={{ color: "#666" }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4 space-y-4">
              {previewContent}
            </div>
          </div>
        </div>
      )}

      {/* Customize per platform dialog */}
      {showCustomize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowCustomize(false); }}>
          <div className="w-full max-w-lg rounded-2xl p-6" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a", maxHeight: "80vh", overflowY: "auto" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold" style={{ color: "#ededed" }}>Customize per platform</h2>
              <button type="button" onClick={() => setShowCustomize(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5" style={{ color: "#666" }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </button>
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
                                  rows={6} placeholder={`Custom caption for ${a.displayName}…`}
                                  className="w-full resize-y rounded-lg px-3 py-2 text-xs focus:outline-none"
                                  style={{ backgroundColor: "#111111", border: `1px solid ${overrideCount > limit ? "#ef444480" : "#2a2a2a"}`, color: "#ededed", minHeight: 100 }} />
                              </div>
                              <div>
                                <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: "#555" }}>First Comment</span>
                                <textarea value={override?.commentText ?? ""} onChange={e => setOverrideField(a.id, "commentText", e.target.value)}
                                  rows={3} placeholder={`Custom first comment for ${a.displayName}…`}
                                  className="w-full resize-y rounded-lg px-3 py-2 text-xs focus:outline-none"
                                  style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a", color: "#ededed", minHeight: 60 }} />
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
      <div className="px-4 md:px-8 py-3 md:py-4 flex flex-wrap items-center gap-3 md:gap-4" style={{ borderTop: "1px solid #2a2a2a", backgroundColor: "#0a0a0a", display: loadingAccounts ? "none" : undefined }}>

        {/* Dry run toggle */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setDryRun((v) => !v)}>
          <div className={`relative w-9 h-5 rounded-full transition-colors ${dryRun ? "bg-violet-500" : "bg-gray-300"}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full shadow transition-transform ${dryRun ? "translate-x-4" : "translate-x-0.5"}`} style={{ backgroundColor: "#111111" }} />
          </div>
          <span className={`text-xs font-medium ${dryRun ? "text-violet-700" : "text-gray-500"}`}>Dry run</span>
        </div>

        {/* Preview drawer trigger — mobile only */}
        <button type="button" onClick={() => setPreviewOpen(true)}
          className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
          style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a", color: "#ededed" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Preview
        </button>

        <div className="h-5 w-px hidden sm:block" style={{ backgroundColor: "#2a2a2a" }} />

        {/* Schedule datetime */}
        <DateTimePicker value={scheduledFor} onChange={setScheduledFor} />

        {/* Spacer — pushes buttons to the right on desktop */}
        <div className="flex-1 hidden md:block" />

        {/* Inline media warnings — full width on mobile */}
        {instagramSelectedWithNoMedia && (
          <p className="text-xs font-medium w-full md:w-auto order-last md:order-none" style={{ color: "#f59e0b" }}>
            ℹ️ {igMediaType === "reel" ? "Add a video for this Reel" : "Instagram requires an image"}
          </p>
        )}
        {instagramStoryWithNoImage && (
          <p className="text-xs font-medium w-full md:w-auto order-last md:order-none" style={{ color: "#f59e0b" }}>
            ℹ️ Add an image for the Instagram Story
          </p>
        )}
        {linkedinSelectedWithMedia && (
          <p className="text-xs font-medium w-full md:w-auto order-last md:order-none" style={{ color: "#888" }}>
            ℹ️ LinkedIn will post text only image/video support requires elevated API access
          </p>
        )}
        {youtubeSelectedWithNoVideo && (
          <p className="text-xs font-medium w-full md:w-auto order-last md:order-none" style={{ color: "#ef4444" }}>
            ⚠️ YouTube requires a video attached before you can schedule this post
          </p>
        )}
        {pinterestSelectedWithNoImage && (
          <p className="text-xs font-medium w-full md:w-auto order-last md:order-none" style={{ color: "#f59e0b" }}>
            ℹ️ Pinterest requires an image — add one or the Pin will be skipped
          </p>
        )}
        {twitterHasLink && (
          <p className="text-xs font-medium w-full md:w-auto order-last md:order-none" style={{ color: "#ef4444" }}>
            ⚠️ X/Twitter charges $0.20 per tweet containing a link — remove the URL to schedule
          </p>
        )}

        {/* Action buttons — full width on mobile, auto on desktop */}
        <div className="w-full md:w-auto flex gap-2">
          <button
            type="button"
            onClick={() => setShowBulk(true)}
            className="flex-1 md:flex-none px-4 py-2.5 font-semibold rounded-xl text-sm transition-colors hover:opacity-80"
            style={{ backgroundColor: "#1a1a1a", color: "#aaa", border: "1px solid #2a2a2a" }}
            title="Bulk schedule from CSV"
          >
            Bulk CSV
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="flex-1 md:flex-none px-4 py-2.5 font-semibold rounded-xl text-sm transition-colors hover:opacity-80"
            style={{ backgroundColor: "#1a1a1a", color: "#aaa", border: "1px solid #2a2a2a" }}
            title="Clear all inputs"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={submitting || selectedIds.length === 0 || (!text.trim() && !noPostTextNeeded) || overAnyLimit || twitterHasLink}
            onClick={handleSaveDraft}
            className="flex-1 md:flex-none px-4 py-2.5 font-semibold rounded-xl text-sm transition-colors hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#1a1a1a", color: "#aaa", border: "1px solid #2a2a2a" }}
            title="Save as draft — schedule later from Posts page"
          >
            Save Draft
          </button>
          <button
            type="submit"
            form=""
            disabled={submitting || overAnyLimit || accounts.length === 0 || youtubeSelectedWithNoVideo || pinterestSelectedWithNoImage || twitterHasLink}
            onClick={handleSubmit}
            className="flex-1 md:flex-none px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed font-semibold rounded-xl text-sm transition-colors hover:bg-gray-100"
            style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}
          >
            {submitting ? "Scheduling…" : dryRun ? "Schedule Dry Run" : "Schedule Post"}
          </button>
        </div>
      </div>
    </div>
    {showBulk && (
      <BulkScheduleModal
        accounts={accounts}
        onClose={() => setShowBulk(false)}
        onScheduled={(count) => {
          setShowBulk(false);
          toastSuccess(`${count} post${count !== 1 ? "s" : ""} scheduled!`);
        }}
      />
    )}
    </>
  );
}
