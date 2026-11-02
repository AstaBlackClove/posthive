"use client";
import { useId } from "react";
import type { RefObject } from "react";
import type { UploadedImage } from "../PlatformPreview";
import { MAX_IMAGES } from "../PlatformPreview";
import { cn } from "@/lib/cn";

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
  uploadProgress?: { done: number; total: number } | null;
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
  uploading, uploadProgress, uploadError, fileInputRef, onFileUpload, onVideoUpload,
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
    <div className="border-b border-border px-6 pt-4 pb-5">

      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <span className="section-label text-fg">Media</span>
        <div className="flex items-center gap-2">
          {youtubeSelected && (
            <div className="flex items-center gap-1">
              {(["upload", "url"] as const).map((m) => (
                <button key={m} type="button" onClick={() => onYoutubeVideoModeChange(m)}
                  className={cn(
                    "chip",
                    youtubeVideoMode === m && "chip-active",
                  )}>
                  {m === "upload" ? "Upload file" : "Paste URL"}
                </button>
              ))}
            </div>
          )}
          {onIgMediaTypeChange && instagramSelected && (
            <div className="flex items-center gap-1">
              {(["post", "reel", "story"] as const).map((t) => (
                <button key={t} type="button" onClick={() => onIgMediaTypeChange(t)}
                  className={cn(
                    "chip capitalize",
                    igMediaType === t && "chip-active",
                  )}>
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
            className={cn("field", isUrlInvalid && "border-red-500")}
          />
          {isUrlInvalid ? (
            <p className="type-body-r-xs mt-1.5 text-red-600">Invalid URL — must start with https://</p>
          ) : (
            <p className="type-body-r-xs mt-1.5 text-muted">Any public URL — S3, Supabase, Cloudflare R2, direct CDN. No file size limit.</p>
          )}
        </div>
      )}

      {/* Video preview */}
      {video && (
        <div className="mb-3 relative group w-28 rounded-xl overflow-hidden border border-border bg-surface">
          <video src={video.previewUrl} className="w-full h-20 object-cover" muted />
          <div className="absolute bottom-1 left-1 type-body-sb-xxs px-1.5 py-0.5 rounded-sm bg-black/70 text-white">
            {igMediaType === "reel" ? "REEL" : "VID"}
          </div>
          <button type="button" onClick={onRemoveVideo}
            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/90 text-white type-body-r-xxs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
        </div>
      )}

      {/* Image grid */}
      {images.length > 0 && igMediaType !== "reel" && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {images.map((img, i) => (
            <div key={img.url + i} className="relative group w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-border bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.previewUrl} alt={img.name} className="w-full h-full object-cover" />
              <button type="button" onClick={() => onRemoveImage(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/90 text-white type-body-r-xxs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
            </div>
          ))}
          {igMediaType !== "story" && images.length < maxImg && Array.from({ length: maxImg - images.length }).map((_, i) => (
            <div key={`e-${i}`} className="dropzone w-20 h-20 flex items-center justify-center">
              <svg className="w-5 h-5 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <span className="type-body-sb-xxs w-5 text-center shrink-0 text-neutral-500">{i + 1}</span>
              <input
                type="text"
                value={altTexts[i] ?? ""}
                onChange={(e) => onAltTextChange(i, e.target.value)}
                placeholder={`Alt text for image ${i + 1} (optional)`}
                className="field flex-1 rounded-lg py-1.5 type-body-r-xs"
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
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ff0000]/20 bg-[#ff0000]/5 text-[#ff0000] type-body-m-xs cursor-pointer transition-all",
              uploading ? "opacity-40 pointer-events-none" : "hover:border-[#ff0000]/40",
            )}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
            {uploading ? (uploadProgress ? `Uploading…` : "Uploading…") : video ? "Change YouTube video" : "Add YouTube video"}
          </label>
          {video && <span className="type-body-r-xs text-green-700">✓ Video ready</span>}
          <p className="type-body-r-xs text-neutral-500">Max {maxVideoSizeMb ?? 100} MB</p>
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
              className={cn(
                "btn-secondary gap-1.5 px-3 py-1.5 rounded-lg type-body-m-xs transition-all",
                uploading
                  ? "pointer-events-none border-brand-300 bg-brand-100 text-brand-800"
                  : (igMediaType === "post" && images.length >= maxImg) || (igMediaType === "story" && images.length >= 1)
                  ? "opacity-40 pointer-events-none" : "hover:border-neutral-300",
              )}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={igMediaType === "reel"
                    ? "M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    : "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"} />
              </svg>
              {uploading
                ? <>
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
                    </svg>
                    {uploadProgress && uploadProgress.total > 1
                      ? `Uploading ${uploadProgress.done}/${uploadProgress.total}`
                      : "Uploading…"}
                  </>
                : igMediaType === "reel" ? (video ? "Change video" : "Add video")
                : igMediaType === "story" ? (images.length > 0 ? "Change media" : "Add story image / video")
                : images.length > 0 ? `${images.length} item${images.length > 1 ? "s" : ""}` : "Add photo / video"}
            </label>
            {showPasteHint && images.length === 0 && !video && (
              <span className="type-body-r-xs text-muted">or Ctrl+V to paste</span>
            )}
          </div>
          {(maxImageSizeMb || maxVideoSizeMb) && (
            <p className="mt-1.5 type-body-r-xs text-neutral-500">
              {maxImageSizeMb && `Images up to ${maxImageSizeMb}MB`}
              {maxImageSizeMb && maxVideoSizeMb && " · "}
              {maxVideoSizeMb && `Videos up to ${maxVideoSizeMb}MB`}
              {youtubeSelected && youtubeVideoMode === "upload" && !video && (
                <> · <span className="text-[#ff0000]">YouTube requires a video</span></>
              )}
            </p>
          )}
          {uploadError && (
            <p className="mt-2 type-body-r-xs rounded-lg px-3 py-2 border border-red-200 bg-red-50 text-red-600">
              {uploadError}
            </p>
          )}
        </>
      )}
    </div>
  );
}
