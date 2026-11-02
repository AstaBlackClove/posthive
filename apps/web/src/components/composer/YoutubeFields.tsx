"use client";
import { useId, useRef } from "react";
import { PlatformIcon } from "../PlatformIcon";
import { cn } from "@/lib/cn";

interface Props {
  youtubeTitle: string;
  onTitleChange: (v: string) => void;
  youtubeDescription: string;
  onDescriptionChange: (v: string) => void;
  youtubeType: "short" | "video";
  onTypeChange: (v: "short" | "video") => void;
  youtubeVideoMode: "upload" | "url";
  onlyYoutube: boolean;
  video: { name: string } | null;
  youtubeShortsWarning?: string | null;
  // Visibility
  youtubeVisibility: "public" | "unlisted" | "private";
  onVisibilityChange: (v: "public" | "unlisted" | "private") => void;
  // Tags
  youtubeTags: string;
  onTagsChange: (v: string) => void;
  // Made for Kids
  youtubeMadeForKids: boolean;
  onMadeForKidsChange: (v: boolean) => void;
  // Thumbnail
  youtubeThumbnailUrl: string | null;
  youtubeThumbnailPreview: string | null;
  onThumbnailUpload: (file: File) => void;
  onThumbnailRemove: () => void;
  thumbnailUploading?: boolean;
}

export function YoutubeFields({
  youtubeTitle, onTitleChange,
  youtubeDescription, onDescriptionChange,
  youtubeType, onTypeChange,
  youtubeVideoMode, onlyYoutube, video,
  youtubeShortsWarning,
  youtubeVisibility, onVisibilityChange,
  youtubeTags, onTagsChange,
  youtubeMadeForKids, onMadeForKidsChange,
  youtubeThumbnailUrl, youtubeThumbnailPreview,
  onThumbnailUpload, onThumbnailRemove,
  thumbnailUploading,
}: Props) {
  const uid = useId();
  const thumbInputId = `${uid}-yt-thumb`;
  const thumbInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="border-b border-border px-6 pb-5 pt-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <PlatformIcon platform="youtube" size={13} />
          <span className="section-label text-[#ff0000]">YouTube</span>
        </div>
        <div className="flex items-center gap-1.5">
          {(["short", "video"] as const).map((t) => (
            <button key={t} type="button" onClick={() => onTypeChange(t)}
              className={cn(
                "chip capitalize",
                youtubeType === t && "chip-active",
              )}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <p className="type-body-r-xs mb-2.5 text-muted">
        {youtubeType === "short"
          ? "Uploads to the Shorts shelf separate title and description."
          : "Uploads as a regular video separate title and description."}
        {!onlyYoutube && " Other selected platforms use the Caption above."}
      </p>

      {youtubeShortsWarning && (
        <p className="type-body-m-xs mb-2.5 flex items-start gap-1.5 text-brand-800">
          <span className="shrink-0">⚠️</span>
          <span>{youtubeShortsWarning} YouTube classifies Shorts by the video itself (vertical, ≤60s) — #Shorts alone won't override that.</span>
        </p>
      )}

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="section-label">Title</span>
          <span className={cn("type-body-r-xxs", youtubeTitle.length > 100 ? "text-red-600" : "text-neutral-500")}>{youtubeTitle.length}/100</span>
        </div>
        <input
          value={youtubeTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Video title"
          className={cn("field", youtubeTitle.length > 100 && "border-red-300")}
        />
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="section-label">Description</span>
          <span className={cn("type-body-r-xxs", youtubeDescription.length > 5000 ? "text-red-600" : "text-neutral-500")}>{youtubeDescription.length}/5000</span>
        </div>
        <textarea
          value={youtubeDescription}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Video description…"
          rows={3}
          className={cn("field resize-none", youtubeDescription.length > 5000 && "border-red-300")}
        />
      </div>

      {/* Visibility */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="section-label">Visibility</span>
        </div>
        <div className="flex items-center gap-1.5">
          {(["public", "unlisted", "private"] as const).map((v) => (
            <button key={v} type="button" onClick={() => onVisibilityChange(v)}
              className={cn(
                "chip capitalize",
                youtubeVisibility === v && "chip-active",
              )}>
              {v}
            </button>
          ))}
        </div>
        {youtubeVisibility === "unlisted" && (
          <p className="type-body-r-xxs mt-1 text-muted">Only people with the link can view.</p>
        )}
        {youtubeVisibility === "private" && (
          <p className="type-body-r-xxs mt-1 text-muted">Only you can view.</p>
        )}
      </div>

      {/* Tags */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="section-label">Tags</span>
          <span className="type-body-r-xxs text-neutral-500">comma-separated</span>
        </div>
        <input
          value={youtubeTags}
          onChange={(e) => onTagsChange(e.target.value)}
          placeholder="e.g. tutorial, coding, javascript"
          className="field"
        />
        <p className="type-body-r-xxs mt-1 text-muted">Helps with YouTube search discovery.</p>
      </div>

      {/* Made for Kids */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <span className="section-label">Made for Kids</span>
          <p className="type-body-r-xxs mt-0.5 text-muted">Required by law for children&apos;s content.</p>
        </div>
        <button
          type="button"
          onClick={() => onMadeForKidsChange(!youtubeMadeForKids)}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors",
            youtubeMadeForKids ? "bg-accent" : "bg-neutral-200",
          )}>
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform mt-0.5",
              youtubeMadeForKids ? "translate-x-4.5" : "translate-x-0.5",
            )}
          />
        </button>
      </div>

      {/* Thumbnail — not supported for Shorts */}
      {youtubeType === "short" && (
        <p className="type-body-r-xxs mb-1 text-muted">Thumbnail not supported for Shorts — YouTube uses an auto-generated frame.</p>
      )}
      <div className={cn(youtubeType === "short" && "pointer-events-none opacity-35")}>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="section-label">Thumbnail</span>
          <span className="type-body-r-xxs px-1.5 py-0.5 rounded-full border border-border bg-surface text-muted">optional</span>
        </div>
        <div className="flex items-center gap-3">
          {(youtubeThumbnailPreview ?? youtubeThumbnailUrl) ? (
            <div className="relative group shrink-0 w-28 h-16 rounded-lg overflow-hidden border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={youtubeThumbnailPreview ?? youtubeThumbnailUrl!}
                alt="thumbnail"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={onThumbnailRemove}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/90 text-white type-body-r-xxs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
            </div>
          ) : null}
          <div>
            <input
              ref={thumbInputRef}
              id={thumbInputId}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { onThumbnailUpload(f); if (thumbInputRef.current) thumbInputRef.current.value = ""; }
              }}
            />
            <label
              htmlFor={thumbInputId}
              className={cn(
                "btn-secondary gap-1.5 px-3 py-1.5 rounded-lg type-body-m-xs transition-all",
                thumbnailUploading ? "opacity-40 pointer-events-none" : "hover:border-neutral-300",
              )}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {thumbnailUploading ? "Uploading…" : (youtubeThumbnailUrl ? "Change thumbnail" : "Add thumbnail")}
            </label>
            <p className="type-body-r-xxs mt-1 text-muted">JPG/PNG · 1280×720 recommended · Requires phone-verified channel</p>
          </div>
        </div>
      </div>

      {video && youtubeVideoMode === "upload" && (
        <p className="type-body-r-xs mt-3 text-green-700">✓ Video ready</p>
      )}
    </div>
  );
}
