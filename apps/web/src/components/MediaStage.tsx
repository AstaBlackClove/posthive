"use client";

import { useEffect } from "react";
import type { UploadedImage } from "./PlatformPreview";
import { cn } from "../lib/cn";

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
    <div className="flex flex-col h-full min-h-0 bg-bg">
      <div className="relative flex-1 min-h-0 max-h-full flex items-center justify-center">
        {current.isVideo ? (
          <video key={current.previewUrl} src={current.previewUrl} controls playsInline
            className="max-w-full max-h-full object-contain" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.previewUrl} alt={labels?.[index] ?? `Media ${index + 1} of ${count}`}
            className="max-w-full max-h-full object-contain" />
        )}
        {count > 1 && (
          <>
            <button type="button" aria-label="Previous media"
              onClick={() => onIndexChange((index - 1 + count) % count)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center bg-surface/85 border border-border text-fg">‹</button>
            <button type="button" aria-label="Next media"
              onClick={() => onIndexChange((index + 1) % count)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center bg-surface/85 border border-border text-fg">›</button>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 px-4 py-3 shrink-0 overflow-x-auto border-t border-border">
        {count > 1 && media.map((m, i) => (
          <button key={m.previewUrl + i} type="button" onClick={() => onIndexChange(i)}
            aria-label={`Show ${labels?.[i] ?? `media ${i + 1}`}`} aria-current={i === index}
            className={cn("shrink-0 size-12 rounded-lg overflow-hidden",
              i === index ? "border-2 border-accent" : "border border-border opacity-60")}>
            {m.isVideo ? (
              <video src={m.previewUrl} muted playsInline preload="metadata" className="w-full h-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.previewUrl} alt="" className="w-full h-full object-cover" />
            )}
          </button>
        ))}
        <span className="type-body-r-xs ml-auto shrink-0 text-muted">
          {count > 1 && `${position} · `}
          <a href={current.previewUrl} target="_blank" rel="noopener noreferrer" className="underline text-fg">
            Open original
          </a>
        </span>
      </div>
    </div>
  );
}
