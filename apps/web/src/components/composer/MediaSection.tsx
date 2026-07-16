"use client";
import { useId } from "react";
import type { RefObject } from "react";
import type { UploadedImage } from "../PlatformPreview";
import { MAX_IMAGES } from "../PlatformPreview";

interface Props {
  // YouTube
  youtubeSelected: boolean;
  youtubeVideoMode: "upload" | "url";
  onYoutubeVideoModeChange: (m: "upload" | "url") => void;
  youtubeVideoUrl: string;
  onYoutubeVideoUrlChange: (url: string) => void;
  onlyYoutube: boolean;
  ytVideoInputRef: RefObject<HTMLInputElement>;
  onYtVideoUpload: (file: File) => void;

  // Media state (normalized)
  images: UploadedImage[];
  video: UploadedImage | null;
  onRemoveImage: (index: number) => void;
  onRemoveVideo: () => void;

  // Instagram
  instagramSelected: boolean;
  igMediaType: "post" | "reel" | "story";
  // Only passed by EditPostDialog — renders the toggle in Media header
  onIgMediaTypeChange?: (t: "post" | "reel" | "story") => void;

  // Alt texts — compose only
  altTexts?: string[];
  onAltTextChange?: (index: number, value: string) => void;

  // Upload
  uploading: boolean;
  uploadError: string | null;
  fileInputRef: RefObject<HTMLInputElement>;
  // Called for post/story file picks (images, or videos in story mode)
  onFileUpload: (files: File[]) => void;
  // Called for explicit reel video pick
  onVideoUpload: (file: File) => void;

  // Config
  maxImageSizeMb?: number;
  maxVideoSizeMb?: number;
  showPasteHint?: boolean;
  maxImages?: number;
}

export function MediaSection({
  youtubeSelected, youtubeVideoMode, onYoutubeVideoModeChange,
  youtubeVideoUrl, onYoutubeVideoUrlChange,
  onlyYoutube, ytVideoInputRef, onYtVideoUpload,
  images, video, onRemoveImage, onRemoveVideo,
  instagramSelected, igMediaType, onIgMediaTypeChange,
  altTexts, onAltTextChange,
  uploading, uploadError, fileInputRef, onFileUpload, onVideoUpload,
  maxImageSizeMb, maxVideoSizeMb, showPasteHint, maxImages,
}: Props) {
  const uid = useId();
  const ytUploadId = `${uid}-yt-video`;
  const mediaUploadId = `${uid}-media`;
  const maxImg = maxImages ?? MAX_IMAGES;

  const isUrlInvalid = youtubeVideoUrl.trim() && (() => {
    try { new URL(youtubeVideoUrl); return false; } catch { return true; }
  })();

  return (
    <div className="px-6 pt-4 pb-5" style={{ borderBottom: "1px solid #2a2a2a" }}>

      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#444" }}>Media</span>
        <div className="flex items-center gap-2">
          {youtubeSelected && (
            <div className="flex items-center gap-1">
              {(["upload", "url"] as const).map((m) => (
                <button key={m} type="button" onClick={() => onYoutubeVideoModeChange(m)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                  style={youtubeVideoMode === m
                    ? { backgroundColor: "#ff000020", color: "#ff0000", border: "1px solid #ff000050" }
                    : { backgroundColor: "#111111", color: "#666", border: "1px solid #1f1f1f" }}>
                  {m === "upload" ? "Upload file" : "Paste URL"}
                </button>
              ))}
            </div>
          )}
          {onIgMediaTypeChange && instagramSelected && (
            <div className="flex items-center gap-1">
              {(["post", "reel", "story"] as const).map((t) => (
                <button key={t} type="button" onClick={() => onIgMediaTypeChange(t)}
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
      </div>

      {/* YouTube URL input */}
      {youtubeSelected && youtubeVideoMode === "url" && (
        <div className="mb-3">
          <input
            value={youtubeVideoUrl}
            onChange={(e) => onYoutubeVideoUrlChange(e.target.value)}
            placeholder="https://your-cdn.com/video.mp4"
            className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition"
            style={{ borderColor: isUrlInvalid ? "#ef4444" : "#2a2a2a", backgroundColor: "#111111", color: "#ededed" }}
          />
          {isUrlInvalid ? (
            <p className="text-xs mt-1.5" style={{ color: "#ef4444" }}>Invalid URL — must start with https://</p>
          ) : (
            <p className="text-xs mt-1.5" style={{ color: "#999" }}>Any public URL — S3, Supabase, Cloudflare R2, direct CDN. No file size limit.</p>
          )}
        </div>
      )}

      {/* Video preview */}
      {video && (
        <div className="mb-3 relative group w-28 rounded-xl overflow-hidden" style={{ border: "1px solid #2a2a2a", backgroundColor: "#1a1a1a" }}>
          <video src={video.previewUrl} className="w-full h-20 object-cover" muted />
          <div className="absolute bottom-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: "rgba(0,0,0,0.7)", color: "#fff" }}>
            {igMediaType === "reel" ? "REEL" : "VID"}
          </div>
          <button type="button" onClick={onRemoveVideo}
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
              <button type="button" onClick={() => onRemoveImage(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: "rgba(239,68,68,0.9)" }}>✕</button>
            </div>
          ))}
          {igMediaType !== "story" && images.length < maxImg && Array.from({ length: maxImg - images.length }).map((_, i) => (
            <div key={`e-${i}`} className="w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center"
              style={{ borderColor: "#222", backgroundColor: "#0a0a0a" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#2a2a2a" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          ))}
        </div>
      )}

      {/* Alt texts (compose only — Instagram post with images) */}
      {altTexts && onAltTextChange && instagramSelected && igMediaType === "post" && images.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {images.map((img, i) => (
            <div key={img.url} className="flex items-center gap-2">
              <span className="text-[10px] font-semibold w-5 text-center flex-shrink-0" style={{ color: "#444" }}>{i + 1}</span>
              <input
                type="text"
                value={altTexts[i] ?? ""}
                onChange={(e) => onAltTextChange(i, e.target.value)}
                placeholder={`Alt text for image ${i + 1} (optional)`}
                className="flex-1 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a", color: "#ededed" }}
              />
            </div>
          ))}
        </div>
      )}

      {/* YouTube upload button */}
      {youtubeSelected && youtubeVideoMode === "upload" && (
        <div className="flex items-center gap-3 mb-3">
          <input ref={ytVideoInputRef} type="file"
            accept="video/mp4,video/quicktime,video/webm"
            className="hidden" id={ytUploadId}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onYtVideoUpload(f); }} />
          <label htmlFor={ytUploadId}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${uploading ? "opacity-40 pointer-events-none" : "hover:border-white/20"}`}
            style={{ border: "1px solid #ff000030", backgroundColor: "#ff000010", color: "#ff0000" }}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
            {uploading ? "Uploading…" : video ? "Change YouTube video" : "Add YouTube video"}
          </label>
          {video && <span className="text-xs" style={{ color: "#4ade80" }}>✓ {video.name}</span>}
          <p className="text-[11px]" style={{ color: "#555" }}>Max {maxVideoSizeMb ?? 100} MB</p>
        </div>
      )}

      {/* Regular upload button — hidden when exclusively YouTube */}
      {!onlyYoutube && (
        <>
          <div className="flex items-center gap-3">
            <input ref={fileInputRef} type="file"
              accept={igMediaType === "reel"
                ? "video/mp4,video/quicktime,video/webm"
                : igMediaType === "story"
                ? "image/jpeg,image/png,video/mp4,video/quicktime"
                : "image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime"}
              multiple={igMediaType === "post"}
              className="hidden" id={mediaUploadId}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (igMediaType === "reel" && files[0]) onVideoUpload(files[0]);
                else onFileUpload(files);
              }} />
            <label htmlFor={mediaUploadId}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                uploading
                || (igMediaType === "post" && images.length >= maxImg)
                || (igMediaType === "story" && images.length >= 1)
                  ? "opacity-40 pointer-events-none" : "hover:border-white/20"
              }`}
              style={{ border: "1px solid #2a2a2a", backgroundColor: "#111111", color: "#888" }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={igMediaType === "reel"
                    ? "M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    : "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"} />
              </svg>
              {uploading ? "Uploading…"
                : igMediaType === "reel" ? (video ? "Change video" : "Add video")
                : igMediaType === "story" ? (images.length > 0 ? "Change media" : "Add story image / video")
                : images.length > 0 ? `${images.length} item${images.length > 1 ? "s" : ""}` : "Add photo / video"}
            </label>
            {showPasteHint && images.length === 0 && !video && (
              <span className="text-xs" style={{ color: "#999" }}>or Ctrl+V to paste</span>
            )}
          </div>
          {(maxImageSizeMb || maxVideoSizeMb) && (
            <p className="mt-1.5 text-[11px]" style={{ color: "#555" }}>
              {maxImageSizeMb && `Images up to ${maxImageSizeMb}MB`}
              {maxImageSizeMb && maxVideoSizeMb && " · "}
              {maxVideoSizeMb && `Videos up to ${maxVideoSizeMb}MB`}
              {youtubeSelected && youtubeVideoMode === "upload" && !video && (
                <> · <span style={{ color: "#ff0000" }}>YouTube requires a video</span></>
              )}
            </p>
          )}
          {uploadError && (
            <p className="mt-2 text-xs rounded-lg px-3 py-2"
              style={{ color: "#f87171", backgroundColor: "#1f0a0a", border: "1px solid #3a1a1a" }}>
              {uploadError}
            </p>
          )}
        </>
      )}
    </div>
  );
}
