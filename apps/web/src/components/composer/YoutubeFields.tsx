"use client";
import { useId, useRef } from "react";
import { PlatformIcon } from "../PlatformIcon";

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
  youtubeThumbnailUrl, youtubeThumbnailPreview,
  onThumbnailUpload, onThumbnailRemove,
  thumbnailUploading,
}: Props) {
  const uid = useId();
  const thumbInputId = `${uid}-yt-thumb`;
  const thumbInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="px-6 pb-5 pt-4" style={{ borderBottom: "1px solid #2a2a2a" }}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <PlatformIcon platform="youtube" size={13} />
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#ff0000" }}>YouTube</span>
        </div>
        <div className="flex items-center gap-1.5">
          {(["short", "video"] as const).map((t) => (
            <button key={t} type="button" onClick={() => onTypeChange(t)}
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
          ? "Uploads to the Shorts shelf — separate title and description."
          : "Uploads as a regular video — separate title and description."}
        {!onlyYoutube && " Other selected platforms use the Caption above."}
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
          onChange={(e) => onTitleChange(e.target.value)}
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
          value={youtubeDescription}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Video description…"
          rows={3}
          className="w-full resize-none rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition"
          style={{ borderColor: youtubeDescription.length > 5000 ? "#fca5a5" : "#2a2a2a", backgroundColor: "#111111", color: "#ededed" }}
        />
      </div>

      {/* Thumbnail */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#555" }}>Thumbnail</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: "#555", backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>optional</span>
        </div>
        <div className="flex items-center gap-3">
          {(youtubeThumbnailPreview ?? youtubeThumbnailUrl) ? (
            <div className="relative group flex-shrink-0 w-28 h-16 rounded-lg overflow-hidden" style={{ border: "1px solid #2a2a2a" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={youtubeThumbnailPreview ?? youtubeThumbnailUrl!}
                alt="thumbnail"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={onThumbnailRemove}
                className="absolute top-1 right-1 w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: "rgba(239,68,68,0.9)" }}>✕</button>
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
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${thumbnailUploading ? "opacity-40 pointer-events-none" : "hover:border-white/20"}`}
              style={{ border: "1px solid #2a2a2a", backgroundColor: "#111111", color: "#888" }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {thumbnailUploading ? "Uploading…" : (youtubeThumbnailUrl ? "Change thumbnail" : "Add thumbnail")}
            </label>
            <p className="text-[10px] mt-1" style={{ color: "#555" }}>JPG/PNG · 1280×720 recommended · Requires phone-verified channel</p>
          </div>
        </div>
      </div>

      {video && youtubeVideoMode === "upload" && (
        <p className="text-xs mt-3" style={{ color: "#4ade80" }}>✓ {video.name}</p>
      )}
    </div>
  );
}
