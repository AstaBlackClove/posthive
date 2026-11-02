"use client";

import { useEffect } from "react";
import type { UploadedImage } from "./PlatformPreview";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const VIDEO_RE = /\.(mp4|mov|webm|quicktime)(\?|$)/i;

/** Stored media URLs (relative upload paths or absolute) → display items. */
export function toMediaItems(urls: string[]): UploadedImage[] {
  return urls.map((url, i) => ({
    url,
    previewUrl: url.startsWith("http") ? url : `${API_BASE}${url}`,
    name: `media-${i + 1}`,
    isVideo: VIDEO_RE.test(url),
  }));
}

// Large media viewer: one item at a time (object-contain), prev/next, ←/→ keys,
// thumbnail strip and a link to the original file. Used by review and template detail.
export function MediaStage({ media, index, onIndexChange, labels }: {
  media: UploadedImage[];
  index: number;
  onIndexChange: (i: number) => void;
  /** Optional per-item names shown in the strip (e.g. "Cover", "Slide 1"). */
  labels?: string[];
}) {
  const count = media.length;
  const current = media[Math.min(index, count - 1)];

  useEffect(() => {
    if (count < 2) return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;
      if (e.key === "ArrowRight") onIndexChange((index + 1) % count);
      if (e.key === "ArrowLeft") onIndexChange((index - 1 + count) % count);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, index, onIndexChange]);

  if (!current) return null;
  const position = labels?.[index] ?? `${index + 1} of ${count}`;

  return (
    <div className="flex flex-col h-full min-h-0" style={{ background: "#0a0a0a" }}>
      <div className="relative flex-1 min-h-0 flex items-center justify-center" style={{ maxHeight: "100%" }}>
        {current.isVideo ? (
          <video key={current.previewUrl} src={current.previewUrl} controls playsInline
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.previewUrl} alt={labels?.[index] ?? `Media ${index + 1} of ${count}`}
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        )}
        {count > 1 && (
          <>
            <button type="button" aria-label="Previous media"
              onClick={() => onIndexChange((index - 1 + count) % count)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "rgba(17,17,17,0.85)", border: "1px solid #2a2a2a", color: "#ededed" }}>‹</button>
            <button type="button" aria-label="Next media"
              onClick={() => onIndexChange((index + 1) % count)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "rgba(17,17,17,0.85)", border: "1px solid #2a2a2a", color: "#ededed" }}>›</button>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 px-4 py-3 shrink-0 overflow-x-auto" style={{ borderTop: "1px solid #1f1f1f" }}>
        {count > 1 && media.map((m, i) => (
          <button key={m.previewUrl + i} type="button" onClick={() => onIndexChange(i)}
            aria-label={`Show ${labels?.[i] ?? `media ${i + 1}`}`} aria-current={i === index}
            className="shrink-0 rounded-lg overflow-hidden"
            style={{ width: 48, height: 48, border: i === index ? "2px solid #5b63d3" : "1px solid #2a2a2a", opacity: i === index ? 1 : 0.6 }}>
            {m.isVideo ? (
              <video src={m.previewUrl} muted playsInline preload="metadata" className="w-full h-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.previewUrl} alt="" className="w-full h-full object-cover" />
            )}
          </button>
        ))}
        <span className="text-xs ml-auto shrink-0" style={{ color: "#888" }}>
          {count > 1 && `${position} · `}
          <a href={current.previewUrl} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#ededed" }}>
            Open original
          </a>
        </span>
      </div>
    </div>
  );
}
