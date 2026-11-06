"use client";

import { useEffect, useRef, useState } from "react";
import { useUnsavedChanges } from "../../lib/session";
import { useRouter } from "next/navigation";
import { Info } from "lucide-react";
import confetti from "canvas-confetti";
import { apiFetch } from "../../lib/api";
import { useToast } from "../../components/Toast";
import { trackEvent } from "../../lib/track";
import { DateTimePicker } from "../../components/DateTimePicker";
import { PlatformIcon } from "../../components/PlatformIcon";
import {
  PlatformPreview,
  PLATFORM_COLOR, PLATFORM_LIMIT, MAX_IMAGES, countGraphemes,
} from "../../components/PlatformPreview";
import type { Account, UploadedImage, PerAccountOverride } from "../../components/PlatformPreview";
import { YoutubeFields } from "../../components/composer/YoutubeFields";
import { PinterestFields } from "../../components/composer/PinterestFields";
import { PixelfedFields } from "../../components/composer/PixelfedFields";
import { LinkedinFields } from "../../components/composer/LinkedinFields";
import { BlueskyFields } from "../../components/composer/BlueskyFields";
import { FirstComment } from "../../components/composer/FirstComment";
import { WarningsBar } from "../../components/composer/WarningsBar";
import { TrialUrgentBanner } from "../../components/TrialUrgentBanner";
import { fromWibInput, toWibInput, wibDateKey } from "../../lib/datetime";
import { MediaSection } from "../../components/composer/MediaSection";
import { RepeatPicker } from "../../components/RepeatPicker";
import { useWorkspace } from "../../context/WorkspaceContext";
import { canReview } from "../../lib/permissions";
import { fileHref, templatesByCategory, type DesignTemplate } from "../../lib/templates";
import { ContentTypeSelects, toContentType, type ContentType } from "../../components/ContentTypeSelects";
import { DesignReferenceCard } from "../../components/DesignReferenceCard";
import { cn } from "../../lib/cn";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Mirrors apps/api/src/lib/storage.ts (images) and apps/api/src/routes/upload.ts (videos)
const MAX_IMAGE_SIZE_MB = 10;
const MAX_VIDEO_SIZE_MB = 100;

function defaultScheduledFor(): string {
  return toWibInput(new Date(Date.now() + 60 * 60 * 1000));
}

export default function ComposePage() {
  const router = useRouter();
  const { activeWorkspace } = useWorkspace();
  // Design-approval flow — members send posts for review instead of scheduling
  const needsApprovalFlow = (activeWorkspace?.approvalRequired ?? false) && !canReview(activeWorkspace?.role);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [groups, setGroups] = useState<{ id: string; name: string; accountIds: string[] }[]>([]);
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
  const [youtubeThumbnailUrl, setYoutubeThumbnailUrl] = useState<string | null>(null);
  const [youtubeThumbnailPreview, setYoutubeThumbnailPreview] = useState<string | null>(null);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [youtubeVisibility, setYoutubeVisibility] = useState<"public" | "unlisted" | "private">("public");
  const [youtubeTags, setYoutubeTags] = useState("");
  const [youtubeMadeForKids, setYoutubeMadeForKids] = useState(false);
  const [pinterestTitle, setPinterestTitle] = useState("");
  const [pinterestDescription, setPinterestDescription] = useState("");
  const [pixelfedSensitive, setPixelfedSensitive] = useState(false);
  const [pixelfedVisibility, setPixelfedVisibility] = useState<"public" | "unlisted" | "private">("public");
  const [linkedinVisibility, setLinkedinVisibility] = useState<"PUBLIC" | "CONNECTIONS">("PUBLIC");
  const [blueskyContentWarning, setBlueskyContentWarning] = useState("");
const [youtubeShortsWarning, setYoutubeShortsWarning] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const uploading = uploadProgress !== null;
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(false);
  const [repeatInterval, setRepeatInterval] = useState<"" | "daily" | "weekly" | "monthly">("");
  const [repeatEndsAt, setRepeatEndsAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [perAccountOverrides, setPerAccountOverrides] = useState<Record<string, PerAccountOverride>>({});
  const [showCustomize, setShowCustomize] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [allowOverrides, setAllowOverrides] = useState(true); // optimistic; corrected after fetch
  const [allowReels, setAllowReels] = useState(true); // optimistic; corrected after fetch
  const [maxImagesPerPost, setMaxImagesPerPost] = useState(10); // optimistic; corrected after fetch
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  // Content type (docs/content-types.md). Picking a template only sets this — the
  // template's design stays a reference and is never attached to the post.
  const [title, setTitle] = useState("");
  // Warn instead of silently dropping the draft if the session ends mid-compose
  useUnsavedChanges("compose", !!(text.trim() || title.trim() || commentText.trim() || mediaItems.length));
  const [contentType, setContentType] = useState<ContentType>({ pillar: null, category: null });
  const [showReorder, setShowReorder] = useState(false);
  const [accountOrder, setAccountOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("posthive_account_order") ?? "[]"); } catch { return []; }
  });
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const templatesRef = useRef<HTMLDivElement>(null);
  const aiMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ytVideoInputRef = useRef<HTMLInputElement>(null);
  const mediaItemsRef = useRef(mediaItems);
  useEffect(() => { mediaItemsRef.current = mediaItems; }, [mediaItems]);

  // Close AI menu on outside click
  useEffect(() => {
    if (!showAiMenu) return;
    const handler = (e: MouseEvent) => {
      if (aiMenuRef.current && !aiMenuRef.current.contains(e.target as Node)) setShowAiMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAiMenu]);

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
        title?: string;
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
        pillar?: string | null;
        category?: string | null;
      };
      setText(draft.text);
      if (draft.title) setTitle(draft.title);
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
      setContentType(toContentType(draft.pillar, draft.category));
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
      return { ...prev, [accountId]: { text: defaultText, commentText: defaultComment || undefined } };
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

    apiFetch<{ id: string; name: string; accountIds: string[] }[]>("/account-groups")
      .then((data) => setGroups(data))
      .catch(() => {});

    apiFetch<{ templates: DesignTemplate[] }>("/templates")
      .then((data) => {
        setTemplates(data.templates);
        // Opened from the Template Library: /compose?template=<id>
        const requested = new URLSearchParams(window.location.search).get("template");
        const tpl = requested ? data.templates.find((t) => t.id === requested) : undefined;
        if (tpl) applyTemplate(tpl);
        if (requested) window.history.replaceState(null, "", "/compose");
      })
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
    const validFiles = files.filter(f => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (!validFiles.length) return;
    setUploadProgress({ done: 0, total: validFiles.length });
    setUploadError(null);

    // Reel: single video only — sequential (replaces existing)
    if (igMediaType === "reel") {
      const file = validFiles[0];
      if (!file.type.startsWith("video/")) { setUploadError("Instagram Reels only support a single video."); setUploadProgress(null); return; }
      const previewUrl = URL.createObjectURL(file);
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData, credentials: "include" });
        if (!res.ok) { const b = await res.json() as { error: string }; setUploadError(b.error); URL.revokeObjectURL(previewUrl); }
        else {
          const { url } = await res.json() as { url: string };
          setMediaItems(prev => { prev.forEach(m => { URL.revokeObjectURL(m.previewUrl); deleteFromStorage(m.url); }); return [{ url, previewUrl, name: file.name, isVideo: true }]; });
          setAltTexts([]);
        }
      } catch { setUploadError("Upload failed — is the API running?"); URL.revokeObjectURL(previewUrl); }
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Post / story mode: parallel uploads
    const eligible = igMediaType === "story" ? validFiles.slice(0, 1) : validFiles.slice(0, Math.max(0, maxImagesPerPost - mediaItems.length));
    if (eligible.length < validFiles.length) setUploadError(`Maximum ${maxImagesPerPost} images per post on your plan.`);

    let done = 0;
    await Promise.all(eligible.map(async (file) => {
      const isVid = file.type.startsWith("video/");
      const previewUrl = URL.createObjectURL(file);
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData, credentials: "include" });
        if (!res.ok) { const b = await res.json() as { error: string }; setUploadError(b.error); URL.revokeObjectURL(previewUrl); return; }
        const { url } = await res.json() as { url: string };
        setMediaItems(prev => {
          if (isVid && prev.length === 0 && igMediaType === "post") { setIgMediaType("reel"); return [{ url, previewUrl, name: file.name, isVideo: true }]; }
          if (!isVid) setAltTexts(a => [...a, ""]);
          return [...prev, { url, previewUrl, name: file.name || "image", isVideo: isVid }];
        });
      } catch { setUploadError("Upload failed — is the API running?"); URL.revokeObjectURL(previewUrl); }
      done++;
      setUploadProgress({ done, total: eligible.length });
    }));

    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }


  function handlePaste(e: React.ClipboardEvent) {
    const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (!files.length) return;
    e.preventDefault(); uploadFiles(files);
  }
  function deleteFromStorage(url: string) {
    fetch(`${API_BASE}/upload`, { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) }).catch(() => {});
  }

  async function uploadYtVideo(file: File) {
    setUploadProgress({ done: 0, total: 1 }); setUploadError(null);
    const previewUrl = URL.createObjectURL(file);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) { const b = await res.json() as { error: string }; setUploadError(b.error); URL.revokeObjectURL(previewUrl); }
      else {
        const { url } = await res.json() as { url: string };
        setMediaItems(prev => {
          const existing = prev.find(m => m.isVideo);
          if (existing) { URL.revokeObjectURL(existing.previewUrl); deleteFromStorage(existing.url); }
          return [...prev.filter(m => !m.isVideo), { url, previewUrl, name: file.name, isVideo: true }];
        });
      }
    } catch { setUploadError("Upload failed — is the API running?"); URL.revokeObjectURL(previewUrl); }
    setUploadProgress(null);
    if (ytVideoInputRef.current) ytVideoInputRef.current.value = "";
  }

  async function uploadReelVideo(file: File) {
    setUploadProgress({ done: 0, total: 1 }); setUploadError(null);
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
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadThumbnail(file: File) {
    setThumbnailUploading(true);
    const previewUrl = URL.createObjectURL(file);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) { const b = await res.json() as { error: string }; setUploadError(b.error ?? "Thumbnail upload failed"); URL.revokeObjectURL(previewUrl); }
      else {
        const { url } = await res.json() as { url: string };
        if (youtubeThumbnailUrl) deleteFromStorage(youtubeThumbnailUrl);
        if (youtubeThumbnailPreview) URL.revokeObjectURL(youtubeThumbnailPreview);
        setYoutubeThumbnailUrl(url);
        setYoutubeThumbnailPreview(previewUrl);
      }
    } catch { setUploadError("Upload failed — is the API running?"); URL.revokeObjectURL(previewUrl); }
    setThumbnailUploading(false);
  }

  function removeThumbnail() {
    if (youtubeThumbnailUrl) deleteFromStorage(youtubeThumbnailUrl);
    if (youtubeThumbnailPreview) URL.revokeObjectURL(youtubeThumbnailPreview);
    setYoutubeThumbnailUrl(null);
    setYoutubeThumbnailPreview(null);
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

  async function runAiAction(action: string) {
    if (!text.trim()) return;
    setAiLoading(true);
    setShowAiMenu(false);
    try {
      const data = await apiFetch<{ text: string }>("/ai/caption", { method: "POST", body: JSON.stringify({ text, action }) });
      setText(data.text);
    } catch {
      // silently fail — user keeps original text
    } finally {
      setAiLoading(false);
    }
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

    // TikTok — video required
    const hasTikTok = selectedAccounts.some(a => a.platform === "tiktok");
    if (hasTikTok && !video) return "TikTok requires a video — attach an mp4 or mov file.";

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
    if (fromWibInput(scheduledFor) <= new Date()) return "Scheduled time must be in the future.";

    return null;
  }

  // A template is a design reference: it only sets the content type. Media, caption and
  // schedule are left as they are; the design file/link shows in the reference card.
  function applyTemplate(t: DesignTemplate) {
    setShowTemplates(false);
    setContentType({ pillar: t.pillar, category: t.category });
    toastSuccess(`Content type set to ${t.category}. Open the design from the reference card.`);
  }

  // Content type sent with the post; the API derives the pillar from the category
  function contentTypeFields() {
    if (!contentType.pillar && !contentType.category) return {};
    return { pillar: contentType.pillar, category: contentType.category };
  }

  function resetForm() {
    setText(""); setTitle(""); setCommentText(""); setScheduledFor(defaultScheduledFor());
    if (textareaRef.current) textareaRef.current.style.height = "160px";
    setIgMediaType("post");
    setYoutubeTitle(""); setYoutubeDescription(""); setYoutubeType("short");
    setYoutubeVideoMode("upload"); setYoutubeVideoUrl("");
    if (youtubeThumbnailPreview) URL.revokeObjectURL(youtubeThumbnailPreview);
    setYoutubeThumbnailUrl(null); setYoutubeThumbnailPreview(null);
    setYoutubeVisibility("public"); setYoutubeTags(""); setYoutubeMadeForKids(false);
    setPinterestTitle(""); setPinterestDescription("");
    setPixelfedSensitive(false); setPixelfedVisibility("public");
    setLinkedinVisibility("PUBLIC");
    setBlueskyContentWarning("");
    setPerAccountOverrides({}); setShowCustomize(false); setUploadError(null);
    mediaItems.forEach(m => URL.revokeObjectURL(m.previewUrl));
    setMediaItems([]); setAltTexts([]);
    setContentType({ pillar: null, category: null });
    setRepeatInterval(""); setRepeatEndsAt("");
  }

  async function handleSaveDraft() {
    setSubmitting(true);
    try {
      const cleanOverrides = Object.fromEntries(
        Object.entries(perAccountOverrides)
          .filter(([id]) => selectedIds.includes(id))
          .map(([id, ov]) => [id, ov.commentText?.trim() ? ov : { ...ov, commentText: undefined }])
      );
      const mediaUrls = mediaItems.map(m => m.url);
      const hasInstagram = selectedAccounts.some((a) => a.platform === "instagram");
      await apiFetch("/jobs", {
        method: "POST",
        body: JSON.stringify({
          draft: true,
          content: {
            text,
            ...(title.trim() ? { title: title.trim() } : {}),
            mediaUrls,
            ...(altTexts.some(Boolean) ? { altTexts } : {}),
            ...(hasInstagram && igMediaType !== "post" ? { mediaType: igMediaType } : {}),
            ...(youtubeSelected ? { youtubeType, youtubeVideoMode } : {}),
            ...(youtubeSelected && youtubeVideoMode === "url" && youtubeVideoUrl.trim() ? { youtubeVideoUrl: youtubeVideoUrl.trim() } : {}),
            ...(youtubeSelected && youtubeThumbnailUrl ? { youtubeThumbnailUrl } : {}),
            ...(youtubeSelected ? { youtubeVisibility } : {}),
            ...(youtubeSelected && youtubeTags.trim() ? { youtubeTags: youtubeTags.split(",").map(t => t.trim()).filter(Boolean) } : {}),
            ...(youtubeSelected && youtubeMadeForKids ? { youtubeMadeForKids } : {}),
            ...(pixelfedSelected ? { pixelfedSensitive, pixelfedVisibility } : {}),
            ...(linkedinSelected ? { linkedinVisibility } : {}),
            ...(blueskySelected && blueskyContentWarning ? { blueskyContentWarning } : {}),
            ...(Object.keys(cleanOverrides).length > 0 ? { perAccount: cleanOverrides } : {}),
            ...contentTypeFields(),
          },
          commentText: commentText.trim() || undefined,
          accountIds: selectedIds,
          dryRun: false,
        }),
      });
      toastSuccess("Draft saved - find it in Posts → Drafts.");
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
        Object.entries(perAccountOverrides)
          .filter(([id]) => selectedIds.includes(id))
          .map(([id, ov]) => [id, ov.commentText?.trim() ? ov : { ...ov, commentText: undefined }])
      );
      const mediaUrls = mediaItems.map(m => m.url);
      const hasInstagram = selectedAccounts.some((a) => a.platform === "instagram");
      await apiFetch("/jobs", {
        method: "POST",
        body: JSON.stringify({
          scheduledFor: fromWibInput(scheduledFor).toISOString(),
          content: {
            text,
            ...(title.trim() ? { title: title.trim() } : {}),
            mediaUrls,
            ...(altTexts.some(Boolean) ? { altTexts } : {}),
            ...(hasInstagram && igMediaType !== "post" ? { mediaType: igMediaType } : {}),
            ...(youtubeSelected ? { youtubeType, youtubeVideoMode } : {}),
            ...(youtubeSelected && youtubeVideoMode === "url" && youtubeVideoUrl.trim() ? { youtubeVideoUrl: youtubeVideoUrl.trim() } : {}),
            ...(youtubeSelected && youtubeThumbnailUrl ? { youtubeThumbnailUrl } : {}),
            ...(youtubeSelected ? { youtubeVisibility } : {}),
            ...(youtubeSelected && youtubeTags.trim() ? { youtubeTags: youtubeTags.split(",").map(t => t.trim()).filter(Boolean) } : {}),
            ...(youtubeSelected && youtubeMadeForKids ? { youtubeMadeForKids } : {}),
            ...(pixelfedSelected ? { pixelfedSensitive, pixelfedVisibility } : {}),
            ...(linkedinSelected ? { linkedinVisibility } : {}),
            ...(blueskySelected && blueskyContentWarning ? { blueskyContentWarning } : {}),
            ...(Object.keys(cleanOverrides).length > 0 ? { perAccount: cleanOverrides } : {}),
            ...contentTypeFields(),
          },
          commentText: commentText.trim() || undefined,
          accountIds: selectedIds,
          dryRun,
          ...(repeatInterval ? { repeatInterval } : {}),
          ...(repeatInterval && repeatEndsAt ? { repeatEndsAt: new Date(repeatEndsAt).toISOString() } : {}),
        }),
      });
      if (!dryRun && needsApprovalFlow) {
        toastSuccess("Sent for review — waiting for design team approval.");
      } else {
        if (!dryRun) trackEvent("post_scheduled", { platforms: selectedAccounts.map(a => a.platform) });
        if (!dryRun) window.dispatchEvent(new CustomEvent("ph:post-scheduled"));
        toastSuccess(dryRun ? "Dry run scheduled no real post will be made." : "Post scheduled successfully!");
        if (!dryRun && !localStorage.getItem("posthive_first_post_done")) {
          localStorage.setItem("posthive_first_post_done", "1");
          confetti({ particleCount: 160, spread: 80, origin: { y: 0.6 }, zIndex: 9999 });
          setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { y: 0.55 }, zIndex: 9999 }), 300);
        }
      }
      resetForm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
      toastError(msg.replace(/^Error: API POST \/jobs → \d+: /, "").replace(/^\{"error":"/, "").replace(/"\}$/, ""));
    }
    finally { setSubmitting(false); }
  }

  const graphemeCount = countGraphemes(text);
  const sortedAccounts = accountOrder.length
    ? [...accounts].sort((a, b) => {
        const ai = accountOrder.indexOf(a.id);
        const bi = accountOrder.indexOf(b.id);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      })
    : accounts;

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
  const pinterestAccounts = selectedAccounts.filter((a) => a.platform === "pinterest");
  const pinterestSelected = pinterestAccounts.length > 0;
  const pinterestSelectedWithNoImage = pinterestSelected && images.length === 0;
  const pixelfedAccounts = selectedAccounts.filter((a) => a.platform === "pixelfed");
  const pixelfedSelected = pixelfedAccounts.length > 0;
  const linkedinSelected = selectedAccounts.some((a) => a.platform === "linkedin");
  const pixelfedSelectedWithNoImage = pixelfedSelected && images.length === 0;
  const youtubeAccounts = selectedAccounts.filter((a) => a.platform === "youtube");
  const youtubeSelected = youtubeAccounts.length > 0;
  const youtubeSelectedWithNoVideo = youtubeSelected && (youtubeVideoMode === "upload" ? !video : !youtubeVideoUrl.trim());
  const youtubePrivateWithComment = youtubeSelected && youtubeVisibility === "private" && commentText.trim().length > 0;
  const onlyYoutube = youtubeSelected && selectedAccounts.every((a) => a.platform === "youtube");
  const onlyPinterest = pinterestSelected && selectedAccounts.every((a) => a.platform === "pinterest");
  // True when every selected account is YouTube or Pinterest — both have their own title/description fields
  const noPostTextNeeded = selectedAccounts.length > 0 && selectedAccounts.every((a) => a.platform === "youtube" || a.platform === "pinterest");
  // One design template per category — the reference card looks it up by the post's category
  const templateMap = templatesByCategory(templates);
  // Telegram channels don't support first comments — hide the field when all selected accounts don't support comments
  const NO_COMMENT_PLATFORMS = new Set(["pinterest", "telegram", "tumblr", "linkedin", "tiktok"]);
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
  const blueskySelected = selectedAccounts.some((a) => a.platform === "bluesky");
  const blueskyFirstCommentTooLong = blueskySelected && selectedAccounts
    .filter((a) => a.platform === "bluesky")
    .some((a) => {
      const effective = perAccountOverrides[a.id]?.commentText !== undefined
        ? perAccountOverrides[a.id].commentText!
        : commentText;
      return effective.trim().length > 0 && [...new Intl.Segmenter().segment(effective)].length > 300;
    });

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
      if (w && h && h <= w) issues.push("isn't vertical (9:16) it'll likely upload as a regular video, not a Short");
      else if (w && h && duration && duration > 60) issues.push(`is ${Math.round(duration)}s Shorts reliably need ≤60s`);
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

  // Non-YouTube/Pinterest accounts with a custom caption — drives the "Customize per platform" button state
  const customizedCount = Object.keys(perAccountOverrides).filter(id => { const acc = selectedAccounts.find(a => a.id === id); return acc && acc.platform !== "youtube" && acc.platform !== "pinterest"; }).length;

  const previewContent = selectedAccounts.length === 0 ? (
    <div className="dropzone rounded-2xl p-10 text-center">
      <p className="type-body-r-s text-neutral-500">Select an account above to see a preview</p>
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
      <TrialUrgentBanner />

      {/* Top bar */}
      <div className="page-header">
        <div>
          <h1 className="type-body-sb-l text-fg">New Post</h1>
          <p className="type-body-r-xs text-muted mt-0.5 hidden sm:block">Write once · schedule across platforms</p>
        </div>
        {!loadingAccounts && accounts.length === 0 && (
          <a href="/accounts" className="type-body-m-xs text-brand-800 bg-brand-100 border border-brand-400 px-3 py-1.5 rounded-lg shrink-0">
            ⚠️ Connect an account first
          </a>
        )}
      </div>

      {/* Main area "" editor left, previews right (stacked on mobile) */}
      <form onSubmit={handleSubmit} onPaste={handlePaste} className="flex flex-col md:flex-row flex-1 min-h-0 overflow-y-auto md:overflow-hidden">

        {/* Left "" editor */}
        <div className="flex flex-col md:flex-1 md:overflow-y-auto md:min-h-0 border-r border-border bg-bg">

          {/* Platform selector */}
          <div className="px-6 pt-4 pb-3 border-b border-border">
            <div className="flex items-center justify-between mb-2.5">
              <p className="section-label">Post to</p>
              {loadingAccounts && <div className="h-3 w-24 rounded-sm animate-pulse bg-surface" />}
              {!loadingAccounts && accounts.length > 1 && (
                <div className="flex items-center gap-3">
                  <span className="type-body-r-xs text-muted">
                    {selectedIds.length}/{accounts.length} selected
                  </span>
                  <button type="button"
                    onClick={() => {
                      if (selectedIds.length === accounts.length) setSelectedIds([]);
                      else setSelectedIds(accounts.map((a) => a.id));
                    }}
                    className="type-body-sb-xs text-brand-800 transition-colors hover:opacity-80">
                    {selectedIds.length === accounts.length ? "Deselect all" : "Select all"}
                  </button>
                  <button type="button" onClick={() => setShowReorder(true)}
                    className="type-body-sb-xs text-muted transition-colors hover:opacity-80">
                    ⇅ Reorder
                  </button>
                </div>
              )}
            </div>

            {/* Group quick-select pills */}
            {!loadingAccounts && groups.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {groups.map((g) => {
                  const groupAccounts = g.accountIds.filter((id) => accounts.some((a) => a.id === id));
                  const allSelected = groupAccounts.length > 0 && groupAccounts.every((id) => selectedIds.includes(id));
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        if (allSelected) {
                          setSelectedIds((prev) => prev.filter((id) => !groupAccounts.includes(id)));
                        } else {
                          setSelectedIds((prev) => Array.from(new Set([...prev, ...groupAccounts])));
                        }
                      }}
                      className={cn("chip", allSelected && "chip-active")}>
                      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {g.name}
                      <span className="opacity-50 type-body-sb-xxs">{groupAccounts.length}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {loadingAccounts ? (
              <div className="flex gap-2">
                {[1,2].map(i => <div key={i} className="h-8 w-32 rounded-xl animate-pulse bg-surface" />)}
              </div>
            ) : (
              /* Scrollable when many accounts */
              <div className="flex flex-wrap gap-1.5 max-h-30 overflow-y-auto">
                {/* Group by platform, respecting custom order */}
                {Object.entries(
                  sortedAccounts.reduce<Record<string, typeof accounts>>((acc, a) => {
                    (acc[a.platform] ??= []).push(a); return acc;
                  }, {})
                ).map(([platform, platformAccounts]) => (
                  <div key={platform} className="flex items-center gap-1.5 flex-wrap">
                    {/* Platform label chip */}
                    <span className="flex items-center px-2 py-1 rounded-lg bg-surface border border-border">
                      <PlatformIcon platform={platform} size={11} />
                    </span>

                    {platformAccounts.map((a) => {
                      const selected = selectedIds.includes(a.id);
                      return (
                        <button key={a.id} type="button" onClick={() => toggleAccount(a.id)}
                          className={cn("chip type-body-m-xs", selected && "chip-active")}>
                          {a.avatarUrl
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={a.avatarUrl} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
                            : null}
                          <span className="truncate max-w-24">{a.displayName}</span>
                          {selected && (
                            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      );
                    })}

                    {/* Divider between platform groups */}
                    <div className="w-px h-5 self-center bg-border" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Skeleton — shown while accounts load */}
          {loadingAccounts && (
            <div className="px-6 py-5 flex flex-col gap-4 animate-pulse">
              <div className="h-3 w-20 rounded-sm bg-surface" />
              <div className="rounded-xl h-40 bg-surface" />
              <div className="flex gap-2">
                <div className="h-8 w-28 rounded-lg bg-surface" />
                <div className="h-8 w-20 rounded-lg bg-surface" />
              </div>
              <div className="h-px bg-border" />
              <div className="h-3 w-24 rounded-sm bg-surface" />
              <div className="h-8 w-44 rounded-lg bg-surface" />
              <div className="h-px bg-border" />
              <div className="h-3 w-16 rounded-sm bg-surface" />
              <div className="h-9 w-full rounded-xl bg-surface" />
              <div className="mt-2 h-10 w-36 rounded-xl self-end bg-surface" />
            </div>
          )}

          {/* Title — shown in Posts and the calendar; optional here, needed before design approval */}
          {!loadingAccounts && (
            <div className="px-6 py-5 border-b border-border">
              <label htmlFor="compose-title" className="section-label">Title</label>
              <input id="compose-title" value={title} maxLength={200}
                onChange={e => setTitle(e.target.value)}
                placeholder="Content title"
                className="field mt-2" />
            </div>
          )}

          {/* Content type — a template only fills this in; its design stays a reference */}
          {!loadingAccounts && (
            <div className="px-6 py-5 border-b border-border">
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="section-label">Content type</span>
                <div ref={templatesRef} className="relative">
                  <button type="button" onClick={() => setShowTemplates(v => !v)} aria-expanded={showTemplates}
                    className="flex items-center gap-1 type-body-m-xs text-muted transition-opacity hover:opacity-80">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Pick from templates
                  </button>
                  {showTemplates && (
                    <div className="absolute top-6 right-0 z-30 w-72 rounded-xl overflow-hidden shadow-xl bg-surface border border-border">
                      {templates.length === 0 ? (
                        <p className="px-3 py-4 type-body-r-xs text-center text-muted">No templates yet. The design team adds them in Templates.</p>
                      ) : (
                        <ul className="max-h-72 overflow-y-auto">
                          {[...templateMap.values()].map(t => (
                            <li key={t.id}>
                              <button type="button" onClick={() => applyTemplate(t)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-neutral-100 transition-colors">
                                {t.previewUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={fileHref(t.previewUrl)} alt="" className="w-8 h-10 rounded-sm object-cover shrink-0 border border-border" />
                                ) : (
                                  <span className="w-8 h-10 rounded-sm shrink-0 flex items-center justify-center type-body-sb-xxs border border-border text-muted">FIG</span>
                                )}
                                <span className="min-w-0">
                                  <span className="block type-body-m-xs truncate text-fg">{t.category}</span>
                                  <span className="block type-body-r-xs truncate text-muted">{t.pillar ?? "No pillar"}</span>
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <Link href="/templates" className="block px-3 py-2 type-body-m-xs text-fg hover:bg-neutral-100 border-t border-border">
                        Browse all templates
                      </Link>
                    </div>
                  )}
                </div>
              </div>
              <ContentTypeSelects idPrefix="compose" pillar={contentType.pillar} category={contentType.category} onChange={setContentType} />
              {contentType.category && (
                <div className="mt-3">
                  <DesignReferenceCard template={templateMap.get(contentType.category)} category={contentType.category} showPreview />
                </div>
              )}
            </div>
          )}

          {/* Text editor */}
          <div className={cn("px-6 py-5", (loadingAccounts || noPostTextNeeded) && "hidden")}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="section-label">Post</span>
                {selectedAccounts.filter(a => a.platform !== "youtube" && a.platform !== "pinterest").length > 1 && (
                  <button type="button" onClick={() => {
                    if (!allowOverrides) { toastWarning("Per-platform customization is a Pro feature. Upgrade to unlock."); return; }
                    setShowCustomize(true);
                  }}
                    className={cn("chip type-body-m-xs px-3 py-1.5", customizedCount > 0 && "chip-active")}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Customize per platform
                    {!allowOverrides && (
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><rect x="2" y="5" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M4 5V3.5a2 2 0 014 0V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    )}
                    {customizedCount > 0 ? <span className="type-body-sb-xxs px-1 py-0.5 rounded-sm bg-brand-200 text-brand-800">{customizedCount}</span> : null}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {/* Instagram format toggle */}
                {instagramSelected && (
                <div className="flex items-center gap-1.5">
                  <div className="relative group/iginfo">
                    <Info size={13} className="cursor-default text-muted opacity-70" />
                    <div className="absolute right-0 top-5 z-20 w-48 rounded-lg px-3 py-2 type-body-r-xs pointer-events-none opacity-0 group-hover/iginfo:opacity-100 transition-opacity bg-surface border border-border text-muted">
                      <span className="type-body-sb-xs text-[#E1306C]">Instagram</span> format only.
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
                      className={cn("chip capitalize gap-1", igMediaType === t && "chip-active")}>
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
                onChange={(e) => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.value ? `${e.target.scrollHeight}px` : "160px"; }}
                ref={(el) => { (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el; if (el) { el.style.height = el.value ? `${el.scrollHeight}px` : "160px"; } }}
                placeholder="What do you want to share?"
                required={!noPostTextNeeded}
                className={cn("field resize-none px-4 py-3 min-h-40 overflow-hidden", overAnyLimit && "border-red-300")}
              />
            )}
            {/* Char counters + AI button below textarea */}
            {!onlyInstagramStory && !noPostTextNeeded && <div className="flex items-center gap-3 mt-1.5">
              {overAnyLimit && (
                <p className="type-body-r-xs text-red-600 flex-1">
                  {Math.abs(mostRestrictiveLimit - graphemeCount)} chars over limit
                </p>
              )}
              {/* AI caption button */}
              <div ref={aiMenuRef} className="relative ml-auto flex items-center gap-3">
                <button type="button" onClick={() => setShowAiMenu(v => !v)} disabled={aiLoading || !text.trim()}
                  className={cn("flex items-center gap-1.5 px-3 py-1 rounded-lg border type-body-sb-xs transition-all disabled:opacity-40",
                    aiLoading ? "bg-brand-200 border-brand-400 text-brand-900" : "bg-brand-100 border-brand-300 text-brand-800")}>
                  {aiLoading ? (
                    <>
                      <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                      Generating…
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036a2.63 2.63 0 0 0 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258a2.63 2.63 0 0 0-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.63 2.63 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.63 2.63 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5Z"/></svg>
                      AI
                    </>
                  )}
                </button>
                {showAiMenu && (
                  <div className="absolute bottom-full right-0 mb-1 rounded-xl overflow-hidden z-50 min-w-45 bg-surface border border-border shadow-xl">
                    {[
                      { action: "fix_grammar",       label: "Fix Grammar",         icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg> },
                      { action: "concise",            label: "Make it Concise",     icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 9l7-7 7 7M5 15l7 7 7-7"/></svg> },
                      { action: "expand",             label: "Expand",              icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg> },
                      { action: "rephrase",           label: "Rephrase",            icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg> },
                      { action: "improve_structure",  label: "Improve Structure",   icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 10h10M4 14h12M4 18h8"/></svg> },
                      { action: "simplify",           label: "Simplify Language",   icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg> },
                      { action: "polish",             label: "Polish my Caption",   icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2zM4.5 14L5.5 17 8.5 18l-3 1-1 3-1-3-3-1 3-1 1-3z"/></svg> },
                    ].map(({ action, label, icon }) => (
                      <button key={action} type="button" onClick={() => runAiAction(action)}
                        className="w-full text-left px-3 py-2 type-body-r-xs text-fg transition-colors hover:bg-neutral-100 flex items-center gap-2.5">
                        <span className="text-brand-800">{icon}</span>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                {platformLimits.map((p) => (
                  <span key={p.platform}
                    className={cn("type-body-m-xs flex items-center gap-1",
                      p.over ? "text-red-600" : p.effectiveCount > p.limit * 0.8 ? "text-brand-800" : "text-neutral-500")}>
                    <PlatformIcon platform={p.icon} size={11} /> {p.effectiveCount}/{p.limit}
                  </span>
                ))}
              </div>
            </div>}
          </div>

          {/* YouTube — dedicated Title + Description fields */}
          {youtubeSelected && !loadingAccounts && (
            <YoutubeFields
              youtubeTitle={youtubeTitle} onTitleChange={setYoutubeTitle}
              youtubeDescription={youtubeDescription} onDescriptionChange={setYoutubeDescription}
              youtubeType={youtubeType} onTypeChange={setYoutubeType}
              youtubeVideoMode={youtubeVideoMode}
              onlyYoutube={onlyYoutube}
              video={video}
              youtubeShortsWarning={youtubeShortsWarning}
              youtubeVisibility={youtubeVisibility} onVisibilityChange={setYoutubeVisibility}
              youtubeTags={youtubeTags} onTagsChange={setYoutubeTags}
              youtubeMadeForKids={youtubeMadeForKids} onMadeForKidsChange={setYoutubeMadeForKids}
              youtubeThumbnailUrl={youtubeThumbnailUrl}
              youtubeThumbnailPreview={youtubeThumbnailPreview}
              onThumbnailUpload={uploadThumbnail}
              onThumbnailRemove={removeThumbnail}
              thumbnailUploading={thumbnailUploading}
            />
          )}

          {/* Pinterest — dedicated Title + Description fields */}
          {pinterestSelected && !loadingAccounts && (
            <PinterestFields
              pinterestTitle={pinterestTitle} onTitleChange={setPinterestTitle}
              pinterestDescription={pinterestDescription} onDescriptionChange={setPinterestDescription}
              onlyPinterest={onlyPinterest}
            />
          )}

          {/* Pixelfed — NSFW toggle + audience */}
          {pixelfedSelected && !loadingAccounts && (
            <PixelfedFields
              sensitive={pixelfedSensitive} onSensitiveChange={setPixelfedSensitive}
              visibility={pixelfedVisibility} onVisibilityChange={setPixelfedVisibility}
            />
          )}

          {/* LinkedIn — visibility */}
          {linkedinSelected && !loadingAccounts && (
            <LinkedinFields
              linkedinVisibility={linkedinVisibility} onVisibilityChange={setLinkedinVisibility}
            />
          )}

          {/* Bluesky — language + content warning */}
          {blueskySelected && !loadingAccounts && (
            <BlueskyFields
              blueskyContentWarning={blueskyContentWarning} onContentWarningChange={setBlueskyContentWarning}
            />
          )}

          {/* First comment */}
          {!loadingAccounts && !noCommentSupport && (
            <FirstComment value={commentText} onChange={setCommentText} />
          )}


          {/* Media */}
          {!loadingAccounts && (
            <MediaSection
              youtubeSelected={youtubeSelected}
              youtubeVideoMode={youtubeVideoMode}
              onYoutubeVideoModeChange={setYoutubeVideoMode}
              youtubeVideoUrl={youtubeVideoUrl}
              onYoutubeVideoUrlChange={setYoutubeVideoUrl}
              onlyYoutube={onlyYoutube}
              ytVideoInputRef={ytVideoInputRef}
              onYtVideoUpload={uploadYtVideo}
              images={images}
              video={video}
              onRemoveImage={(i) => removeMediaItem(mediaItems.indexOf(images[i]))}
              onRemoveVideo={() => { if (video) removeMediaItem(mediaItems.indexOf(video)); }}
              instagramSelected={instagramSelected}
              igMediaType={igMediaType}
              altTexts={altTexts}
              onAltTextChange={(i, v) => setAltTexts(prev => { const n = [...prev]; n[i] = v; return n; })}
              uploading={uploading}
              uploadProgress={uploadProgress}
              uploadError={uploadError}
              fileInputRef={fileInputRef}
              onFileUpload={uploadFiles}
              onVideoUpload={uploadReelVideo}
              maxImageSizeMb={MAX_IMAGE_SIZE_MB}
              maxVideoSizeMb={MAX_VIDEO_SIZE_MB}
              showPasteHint
              maxImages={maxImagesPerPost}
            />
          )}


        </div>

        {/* Right "" per-platform previews — desktop only, fixed 480px. Mobile uses the drawer instead */}
        <div className="hidden md:flex md:w-120 shrink-0 flex-col md:overflow-y-auto bg-bg">
          <div className="px-5 pt-5 pb-3">
            <p className="section-label">Preview</p>
          </div>
          <div className="px-5 pb-5 space-y-4 flex-1">
            {previewContent}
          </div>
        </div>
      </form>

      {/* Mobile-only: preview drawer */}
      {previewOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setPreviewOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl flex flex-col bg-bg border border-border border-b-0 max-h-[80vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-center pt-2.5 pb-1 shrink-0">
              <div className="w-9 h-1 rounded-full bg-border" />
            </div>
            <div className="flex items-center justify-between px-5 pt-1 pb-3 shrink-0 border-b border-border">
              <p className="section-label">Preview</p>
              <button type="button" onClick={() => setPreviewOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-surface">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={e => { if (e.target === e.currentTarget) setShowCustomize(false); }}>
          <div data-customize-scroll className="card w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="type-body-sb-s text-fg">Customize per platform</h2>
              <button type="button" onClick={() => setShowCustomize(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-neutral-100">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="space-y-2">
              {selectedAccounts.filter(a => a.platform !== "youtube" && a.platform !== "pinterest").map(a => {
                const hasOverride = a.id in perAccountOverrides;
                const override = perAccountOverrides[a.id];
                const limit = PLATFORM_LIMIT[a.platform] ?? 500;
                const overrideCount = countGraphemes(override?.text ?? "");
                return (
                  <div key={a.id} className={cn("rounded-xl overflow-hidden border bg-bg", hasOverride ? "border-brand-300" : "border-border")}>
                    <button type="button" onClick={() => toggleOverride(a.id, text, commentText)}
                      className={cn("w-full flex items-center gap-2.5 px-3 py-2.5 text-left", hasOverride && "bg-brand-100")}>
                      <PlatformIcon platform={a.platform} size={14} />
                      <span className={cn("type-body-m-xs flex-1", hasOverride ? "text-brand-800" : "text-muted")}>{a.displayName}</span>
                      {hasOverride ? (
                        <span className="type-body-sb-xxs px-1.5 py-0.5 rounded-full bg-brand-200 text-brand-800">Custom ✓</span>
                      ) : (
                        <span className="type-body-r-xxs text-neutral-500">✎ Customize</span>
                      )}
                    </button>
                    {hasOverride && (() => {
                      const isIgStory = a.platform === "instagram" && igMediaType === "story";
                      return (
                        <div className="px-3 pb-3 space-y-2">
                          {isIgStory ? (
                            <p className="type-body-r-xxs py-1 text-neutral-500">Instagram Stories don't support captions or comments.</p>
                          ) : (
                            <>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="type-body-sb-xxs uppercase tracking-wide text-muted">Caption</span>
                                  <span className={cn("type-body-r-xxs", overrideCount > limit ? "text-red-600" : "text-neutral-500")}>{overrideCount}/{limit}</span>
                                </div>
                                <textarea value={override?.text ?? ""}
                                  onChange={e => { setOverrideField(a.id, "text", e.target.value); const sc = e.target.closest("[data-customize-scroll]") as HTMLElement | null; const sv = sc?.scrollTop ?? 0; e.target.style.height = "auto"; e.target.style.height = `${e.target.scrollHeight}px`; if (sc) sc.scrollTop = sv; }}
                                  ref={el => { if (el) { el.style.height = `${el.scrollHeight}px`; } }}
                                  placeholder={`Custom caption for ${a.displayName}…`}
                                  className={cn("field resize-none rounded-lg type-body-r-xs min-h-25 overflow-hidden", overrideCount > limit && "border-red-300")} />
                              </div>
                              {!NO_COMMENT_PLATFORMS.has(a.platform) && (
                              <div>
                                <span className="type-body-sb-xxs uppercase tracking-wide block mb-1 text-muted">First Comment</span>
                                <textarea value={override?.commentText ?? ""}
                                  onChange={e => { setOverrideField(a.id, "commentText", e.target.value); const sc = e.target.closest("[data-customize-scroll]") as HTMLElement | null; const sv = sc?.scrollTop ?? 0; e.target.style.height = "auto"; e.target.style.height = `${e.target.scrollHeight}px`; if (sc) sc.scrollTop = sv; }}
                                  ref={el => { if (el) { el.style.height = `${el.scrollHeight}px`; } }}
                                  placeholder={`Custom first comment for ${a.displayName}…`}
                                  className="field resize-none rounded-lg type-body-r-xs min-h-15 overflow-hidden" />
                              </div>
                              )}
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
                className="btn-primary">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Warnings bar */}
      {!loadingAccounts && (
        <WarningsBar
          className="md:px-8"
          youtubeSelectedWithNoVideo={youtubeSelectedWithNoVideo}
          pinterestSelectedWithNoImage={pinterestSelectedWithNoImage}
          pixelfedSelectedWithNoImage={pixelfedSelectedWithNoImage}
          tiktokSelectedWithNoVideo={selectedAccounts.some(a => a.platform === "tiktok") && !video}
          instagramSelectedWithNoMedia={instagramSelectedWithNoMedia}
          instagramStoryWithNoImage={instagramStoryWithNoImage}
          twitterHasLink={twitterHasLink}
          blueskyFirstCommentTooLong={blueskyFirstCommentTooLong}
          youtubePrivateWithComment={youtubePrivateWithComment}
          igMediaType={igMediaType}
        />
      )}

      {/* Bottom footer bar — full width */}
      <div className={cn("px-4 md:px-8 py-3 md:py-4 flex flex-wrap items-center gap-3 md:gap-4 border-t border-border bg-bg", loadingAccounts && "hidden")}>


        {/* Preview drawer trigger — mobile only */}
        <button type="button" onClick={() => setPreviewOpen(true)}
          className="btn-secondary md:hidden gap-1.5 px-3 py-1.5 type-body-sb-xs">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Preview
        </button>

        {/* Schedule datetime */}
        <DateTimePicker value={scheduledFor} onChange={setScheduledFor} min={wibDateKey(new Date())} />

        {/* Repeat */}
        <RepeatPicker
          value={repeatInterval}
          endsAt={repeatEndsAt}
          onChangeInterval={setRepeatInterval}
          onChangeEndsAt={setRepeatEndsAt}
        />

        {/* Spacer — pushes buttons to the right on desktop */}
        <div className="flex-1 hidden md:block" />


        {/* Action buttons — full width on mobile, auto on desktop */}
        <div className="w-full md:w-auto flex gap-2">
          <button
            type="button"
            onClick={() => router.push("/jobs/import")}
            className="btn-secondary flex-1 md:flex-none px-4 py-2.5"
            title="Import content plan from CSV or XLSX"
          >
            Import Plan
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="btn-secondary flex-1 md:flex-none px-4 py-2.5"
            title="Clear all inputs"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={submitting || selectedIds.length === 0 || (!text.trim() && !noPostTextNeeded) || overAnyLimit || twitterHasLink}
            onClick={handleSaveDraft}
            className="btn-secondary flex-1 md:flex-none px-4 py-2.5"
            title="Save as draft schedule later from Posts page"
          >
            Save Draft
          </button>
          <button
            type="submit"
            form=""
            disabled={submitting || overAnyLimit || accounts.length === 0 || youtubeSelectedWithNoVideo || pinterestSelectedWithNoImage || pixelfedSelectedWithNoImage || twitterHasLink || blueskyFirstCommentTooLong}
            onClick={handleSubmit}
            className="btn-primary flex-1 md:flex-none px-6 py-2.5"
          >
            {submitting
              ? (needsApprovalFlow ? "Submitting…" : "Scheduling…")
              : dryRun
                ? "Schedule Dry Run"
                : needsApprovalFlow
                  ? "Submit for Review"
                  : "Schedule Post"}
          </button>
        </div>
      </div>
    </div>
    {showReorder && (() => {
      const [reorderList, setReorderList] = [sortedAccounts.map(a => a.id), (ids: string[]) => {
        setAccountOrder(ids);
        localStorage.setItem("posthive_account_order", JSON.stringify(ids));
      }];
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={() => setShowReorder(false)}>
          <div className="card w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="type-body-sb-s text-fg">Reorder Accounts</p>
                <p className="type-body-r-xs mt-0.5 text-muted">Drag to set the order they appear in compose</p>
              </div>
              <button onClick={() => setShowReorder(false)} className="type-body-r-l text-muted">×</button>
            </div>
            <div className="p-4 space-y-1.5 max-h-96 overflow-y-auto">
              {sortedAccounts.map((a, idx) => (
                <div key={a.id}
                  draggable
                  onDragStart={e => e.dataTransfer.setData("text/plain", a.id)}
                  onDragOver={e => { e.preventDefault(); setDragOverId(a.id); }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={e => {
                    e.preventDefault();
                    setDragOverId(null);
                    const fromId = e.dataTransfer.getData("text/plain");
                    if (fromId === a.id) return;
                    const ids = sortedAccounts.map(x => x.id);
                    const fromIdx = ids.indexOf(fromId);
                    const toIdx = ids.indexOf(a.id);
                    const next = [...ids];
                    next.splice(fromIdx, 1);
                    next.splice(toIdx, 0, fromId);
                    setAccountOrder(next);
                    localStorage.setItem("posthive_account_order", JSON.stringify(next));
                  }}
                  className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-grab select-none",
                    dragOverId === a.id ? "bg-neutral-100 border-accent" : "bg-bg border-border")}>
                  <span className="type-body-r-s text-neutral-500">⠿</span>
                  <PlatformIcon platform={a.platform} size={16} />
                  {a.avatarUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={a.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                    : null}
                  <span className="type-body-r-s flex-1 truncate text-fg">{a.displayName}</span>
                  <span className="type-body-r-xs text-neutral-500">{idx + 1}</span>
                </div>
              ))}
            </div>
            <div className="px-4 pb-4 pt-2 flex gap-2">
              <button onClick={() => { setAccountOrder([]); localStorage.removeItem("posthive_account_order"); }}
                className="btn-secondary flex-1">
                Reset order
              </button>
              <button onClick={() => setShowReorder(false)}
                className="btn-primary flex-1">
                Done
              </button>
            </div>
          </div>
        </div>
      );
    })()}
    </>
  );
}
