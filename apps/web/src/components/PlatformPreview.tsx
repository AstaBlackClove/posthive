"use client";

import { useEffect, useRef, useState } from "react";
import { PlatformIcon } from "./PlatformIcon";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface OGData { title?: string; description?: string; image?: string | null; url?: string }

function useLinkCard(text: string, enabled: boolean): OGData | null {
  const [og, setOg] = useState<OGData | null>(null);
  const lastUrl = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) { setOg(null); return; }
    const match = text.match(/https?:\/\/[^\s]+/);
    const url = match?.[0] ?? null;
    if (url === lastUrl.current) return;
    lastUrl.current = url;
    setOg(null);
    if (!url) return;
    if (timer.current) clearTimeout(timer.current);
    // Debounce 800ms so we don't fetch on every keystroke
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/og?url=${encodeURIComponent(url)}`, { credentials: "include" });
        if (res.ok) { const d = await res.json() as OGData; if (d.title) setOg(d); }
      } catch { /* ignore */ }
    }, 800);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [text, enabled]);

  return og;
}

function LinkCard({ og }: { og: OGData }) {
  return (
    <div className="mt-2 rounded-xl overflow-hidden" style={{ border: "1px solid #2a2a2a" }}>
      {og.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={og.image} alt="" className="w-full h-32 object-cover" />
      )}
      <div className="px-3 py-2" style={{ backgroundColor: "#1a1a1a" }}>
        {og.url && <p className="text-[10px] mb-0.5 truncate" style={{ color: "#555" }}>{new URL(og.url).hostname}</p>}
        <p className="text-xs font-semibold leading-snug line-clamp-2" style={{ color: "#ededed" }}>{og.title}</p>
        {og.description && <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: "#888" }}>{og.description}</p>}
      </div>
    </div>
  );
}

export interface Account {
  id: string;
  platform: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface PerAccountOverride {
  text?: string;
  commentText?: string;
}

export interface UploadedImage {
  url: string;        // server URL — sent to API on save
  previewUrl: string; // display URL — blob or server
  name: string;
  isVideo?: boolean;
}

export const PLATFORM_COLOR: Record<string, string> = {
  bluesky: "#0085ff",
  threads: "#aaaaaa",
  linkedin: "#0077b5",
  instagram: "#e1306c",
  mastodon: "#6364ff",
  pixelfed: "#ff8c00",
  youtube: "#ff0000",
  facebook: "#1877f2",
  twitter: "#e7e9ea",
  pinterest: "#e60023",
  telegram: "#229ED9",
  nostr: "#7B5EA7",
  discord: "#5865F2",
  tumblr:  "#35465c",
  lemmy:   "#ff6314",
};

export const PLATFORM_LIMIT: Record<string, number> = {
  bluesky: 300,
  threads: 500,
  linkedin: 3000,
  mastodon: 500,
  pixelfed: 2001,
  youtube: 5000,
  facebook: 63206,
  twitter: 25000,
  pinterest: 500,
  telegram: 4096,
  nostr: 10000,
  discord: 2000,
  tumblr:  4096,
  lemmy:   10000,
};

export const MAX_IMAGES = 4;

export function countGraphemes(text: string): number {
  try { return [...new Intl.Segmenter().segment(text)].length; }
  catch { return text.length; }
}

export function InstagramPreview({ account, text, commentText, mediaItems = [], igMediaType = "post" }: {
  account: Account;
  text: string;
  commentText: string;
  mediaItems?: UploadedImage[];
  igMediaType?: "post" | "reel" | "story";
}) {
  const images = mediaItems.filter(m => !m.isVideo);
  const video = mediaItems.find(m => m.isVideo) ?? null;
  const [carouselIdx, setCarouselIdx] = useState(0);
  const initial = account.displayName[0]?.toUpperCase() ?? "?";
  const igGradient = "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)";

  const FORMAT_LABEL: Record<string, string> = { post: "Post", reel: "Reel", story: "Story" };

  function Avatar({ size = 8 }: { size?: number }) {
    const cls = `w-${size} h-${size} rounded-full flex-shrink-0`;
    return account.avatarUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={account.avatarUrl} alt="" className={`${cls} object-cover`} />
    ) : (
      <div className={`${cls} flex items-center justify-center text-xs font-bold text-white`}
        style={{ background: igGradient }}>{initial}</div>
    );
  }

  // ── STORY ───────────────────────────────────────────────────────────────────
  if (igMediaType === "story") {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
        <div className="flex items-center gap-2 px-4 py-2.5"
          style={{ borderBottom: "1px solid #2a2a2a", backgroundColor: "#0a0a0a", borderLeft: "3px solid #e1306c" }}>
          <PlatformIcon platform="instagram" size={16} />
          <span className="text-xs font-semibold" style={{ color: "#e1306c" }}>Instagram</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded ml-1" style={{ backgroundColor: "#E1306C20", color: "#E1306C" }}>STORY</span>
          <span className="text-xs ml-auto" style={{ color: "#666" }}>{account.displayName}</span>
        </div>

        {/* 9:16 story canvas */}
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "9/16", backgroundColor: "#000" }}>
          {video ? (
            <video src={video.previewUrl} className="w-full h-full object-cover" muted playsInline loop autoPlay />
          ) : images.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[0].previewUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <svg className="w-10 h-10 mx-auto mb-2 opacity-20" fill="none" stroke="white" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="3" strokeWidth="1.5" />
                  <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="1.5" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 15l-5-5L5 21" />
                </svg>
                <p className="text-xs" style={{ color: "#555" }}>Add an image or video</p>
              </div>
            </div>
          )}
          {/* overlay: avatar + username top left */}
          <div className="absolute top-3 left-3 right-3 flex items-center gap-2">
            <div className="ring-2 ring-white rounded-full">
              <Avatar size={8} />
            </div>
            <span className="text-xs font-semibold text-white drop-shadow">{account.displayName}</span>
            <span className="text-xs text-white/60 drop-shadow ml-1">· just now</span>
          </div>
          {/* reply bar bottom */}
          <div className="absolute bottom-4 left-3 right-3 flex items-center gap-2">
            <div className="flex-1 rounded-full border border-white/30 px-3 py-1.5 text-xs text-white/50">Send message</div>
            <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth="1.5" opacity="0.7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  // ── REEL ────────────────────────────────────────────────────────────────────
  if (igMediaType === "reel") {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
        <div className="flex items-center gap-2 px-4 py-2.5"
          style={{ borderBottom: "1px solid #2a2a2a", backgroundColor: "#0a0a0a", borderLeft: "3px solid #e1306c" }}>
          <PlatformIcon platform="instagram" size={16} />
          <span className="text-xs font-semibold" style={{ color: "#e1306c" }}>Instagram</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded ml-1" style={{ backgroundColor: "#E1306C20", color: "#E1306C" }}>REEL</span>
          <span className="text-xs ml-auto" style={{ color: "#666" }}>{account.displayName}</span>
        </div>

        {/* 9:16 reel canvas */}
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "9/16", backgroundColor: "#000" }}>
          {video ? (
            <video src={video.previewUrl} className="w-full h-full object-cover" muted loop />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <svg className="w-10 h-10 mx-auto mb-2 opacity-20" fill="none" stroke="white" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <p className="text-xs" style={{ color: "#555" }}>Add a video</p>
              </div>
            </div>
          )}

          {/* right side action buttons */}
          <div className="absolute right-2 bottom-20 flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              <span className="text-white text-[10px]">0</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
              </svg>
              <span className="text-white text-[10px]">Reply</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
              <span className="text-white text-[10px]">Share</span>
            </div>
          </div>

          {/* bottom: avatar + username + caption */}
          <div className="absolute bottom-4 left-3 right-12">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="ring-1 ring-white/50 rounded-full"><Avatar size={7} /></div>
              <span className="text-sm font-semibold text-white drop-shadow">{account.displayName}</span>
              <span className="text-xs font-semibold text-white border border-white/50 rounded px-1.5 py-0.5 ml-1">Follow</span>
            </div>
            {text && (
              <p className="text-xs text-white/80 leading-relaxed line-clamp-2 drop-shadow">{text}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── POST (default) ───────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
      <div className="flex items-center gap-2 px-4 py-2.5"
        style={{ borderBottom: "1px solid #2a2a2a", backgroundColor: "#0a0a0a", borderLeft: "3px solid #e1306c" }}>
        <PlatformIcon platform="instagram" size={16} />
        <span className="text-xs font-semibold" style={{ color: "#e1306c" }}>Instagram</span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded ml-1" style={{ backgroundColor: "#E1306C20", color: "#E1306C" }}>{FORMAT_LABEL[igMediaType]}</span>
        <span className="text-xs ml-auto" style={{ color: "#666" }}>{account.displayName}</span>
      </div>

      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="ring-2 ring-pink-500 ring-offset-1 ring-offset-[#111] rounded-full">
          <Avatar size={8} />
        </div>
        <span className="text-sm font-semibold flex-1" style={{ color: "#ededed" }}>{account.displayName}</span>
        <span className="text-xs font-semibold" style={{ color: "#3b82f6" }}>Follow</span>
      </div>

      {mediaItems.length > 0 ? (
        <div className="relative w-full aspect-square bg-black overflow-hidden">
          {/* Current slide */}
          {mediaItems[carouselIdx]?.isVideo ? (
            <video src={mediaItems[carouselIdx].previewUrl} className="w-full h-full object-cover" muted loop autoPlay />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaItems[carouselIdx]?.previewUrl} alt="" className="w-full h-full object-cover" />
          )}

          {/* Video badge */}
          {mediaItems[carouselIdx]?.isVideo && (
            <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              VIDEO
            </div>
          )}

          {/* Carousel nav arrows */}
          {mediaItems.length > 1 && (
            <>
              <button type="button"
                onClick={() => setCarouselIdx(i => Math.max(0, i - 1))}
                disabled={carouselIdx === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-0 transition-opacity"
                style={{ backgroundColor: "rgba(0,0,0,0.55)" }}>
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button type="button"
                onClick={() => setCarouselIdx(i => Math.min(mediaItems.length - 1, i + 1))}
                disabled={carouselIdx === mediaItems.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-0 transition-opacity"
                style={{ backgroundColor: "rgba(0,0,0,0.55)" }}>
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Dot indicators */}
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                {mediaItems.map((_, i) => (
                  <button key={i} type="button" onClick={() => setCarouselIdx(i)}
                    className="w-1.5 h-1.5 rounded-full transition-all"
                    style={{ backgroundColor: i === carouselIdx ? "#fff" : "rgba(255,255,255,0.4)" }} />
                ))}
              </div>

              {/* Carousel icon top-right */}
              <div className="absolute top-2 right-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white" opacity="0.85">
                  <path d="M2 6a2 2 0 012-2h.5a.5.5 0 000-1H4a3 3 0 00-3 3v.5a.5.5 0 001 0V6zM22 6a2 2 0 00-2-2h-.5a.5.5 0 010-1H20a3 3 0 013 3v.5a.5.5 0 01-1 0V6zM2 18a2 2 0 002 2h.5a.5.5 0 010 1H4a3 3 0 01-3-3v-.5a.5.5 0 011 0V18zM22 18a2 2 0 01-2 2h-.5a.5.5 0 000 1H20a3 3 0 003-3v-.5a.5.5 0 00-1 0V18zM8 7h8a1 1 0 011 1v8a1 1 0 01-1 1H8a1 1 0 01-1-1V8a1 1 0 011-1z"/>
                </svg>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="w-full aspect-square flex items-center justify-center" style={{ backgroundColor: "#1a1a1a" }}>
          <div className="text-center">
            <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="3" strokeWidth="1.5" />
              <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="1.5" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 15l-5-5L5 21" />
            </svg>
            <p className="text-xs" style={{ color: "#555" }}>Add media to preview</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 px-3 pt-2.5 pb-1">
        <svg className="w-6 h-6" fill="none" stroke="#ededed" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
        <svg className="w-6 h-6" fill="none" stroke="#ededed" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
        </svg>
        <svg className="w-6 h-6" fill="none" stroke="#ededed" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
        <svg className="w-6 h-6 ml-auto" fill="none" stroke="#ededed" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
        </svg>
      </div>

      <div className="px-3 pb-3">
        <p className="text-xs" style={{ color: "#888" }}>0 likes</p>
        {text ? (
          <p className="text-xs mt-1 leading-relaxed" style={{ color: "#ededed" }}>
            <span className="font-semibold">{account.displayName}</span>{" "}
            <span className="whitespace-pre-wrap">{text}</span>
          </p>
        ) : (
          <p className="text-xs mt-1 italic" style={{ color: "#555" }}>Caption will appear here…</p>
        )}
        <p className="text-xs mt-1.5" style={{ color: "#555" }}>View all comments</p>
        {commentText && (
          <div className="flex gap-2 mt-2">
            {account.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={account.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0 mt-0.5" />
            ) : (
              <div className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5"
                style={{ background: "linear-gradient(135deg, #f09433, #bc1888)" }} />
            )}
            <p className="text-xs leading-relaxed" style={{ color: "#ededed" }}>
              <span className="font-semibold">{account.displayName}</span>{" "}
              <span className="whitespace-pre-wrap">{commentText}</span>
            </p>
          </div>
        )}
        <p className="text-xs mt-1.5" style={{ color: "#555" }}>just now</p>
      </div>
    </div>
  );
}

function LinkedInPreview({ account, text, commentText, images }: {
  account: Account;
  text: string;
  commentText: string;
  images: UploadedImage[];
}) {
  const initial = account.displayName[0]?.toUpperCase() ?? "?";
  return (
    <div className="rounded-2xl overflow-hidden shadow-sm" style={{ backgroundColor: "#1b1f23", border: "1px solid #2a2a2a" }}>
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-2.5"
        style={{ borderBottom: "1px solid #2a2a2a", borderLeft: "3px solid #0077b5", backgroundColor: "#0a0a0a" }}>
        <PlatformIcon platform="linkedin" size={16} />
        <span className="text-xs font-semibold" style={{ color: "#0077b5" }}>LinkedIn</span>
        <span className="text-xs ml-auto" style={{ color: "#666" }}>{account.displayName}</span>
      </div>

      <div className="p-4">
        {/* Author row */}
        <div className="flex gap-3 mb-3">
          {account.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-white"
              style={{ background: "#0077b5" }}>
              {initial}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold" style={{ color: "#ededed" }}>{account.displayName}</p>
            <p className="text-xs" style={{ color: "#888" }}>Just now · 🌐</p>
          </div>
        </div>

        {/* Post text — LinkedIn shows "...more" after 3 lines */}
        {text ? (
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed line-clamp-6" style={{ color: "#d4d4d4" }}>{text}</p>
        ) : (
          <p className="text-sm italic" style={{ color: "#444" }}>Start writing your post for a preview…</p>
        )}

        {/* Images */}
        {images.length > 0 && (
          <div className={`mt-3 rounded-lg overflow-hidden grid gap-0.5 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {images.slice(0, 4).map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={img.previewUrl} alt=""
                className={`w-full object-cover ${images.length === 1 ? "h-52" : "h-32"}`} />
            ))}
          </div>
        )}

        {/* Engagement bar */}
        <div className="mt-3 pt-2.5 flex items-center gap-4" style={{ borderTop: "1px solid #2a2a2a" }}>
          {["👍 Like", "💬 Comment", "🔁 Repost", "📤 Send"].map((action) => (
            <span key={action} className="text-xs font-semibold" style={{ color: "#888" }}>{action}</span>
          ))}
        </div>

        {/* First comment */}
        {commentText && (
          <div className="mt-3 pt-2.5 flex gap-2" style={{ borderTop: "1px solid #1a1a1a" }}>
            <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: "#0077b5" }}>{initial}</div>
            <div className="flex-1 rounded-lg px-3 py-2" style={{ backgroundColor: "#111111" }}>
              <p className="text-xs font-semibold mb-0.5" style={{ color: "#ededed" }}>{account.displayName}</p>
              <p className="text-xs" style={{ color: "#aaa" }}>{commentText}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function YouTubePreview({ account, text, commentText, mediaItems = [], youtubeType = "short" }: {
  account: Account;
  text: string;
  commentText: string;
  mediaItems?: UploadedImage[];
  youtubeType?: "short" | "video";
}) {
  const video = mediaItems.find(m => m.isVideo) ?? null;
  const trimmed = text.trim();
  const newlineIdx = trimmed.indexOf("\n");
  const title = newlineIdx === -1 ? trimmed : trimmed.slice(0, newlineIdx);
  const description = newlineIdx === -1 ? "" : trimmed.slice(newlineIdx + 1).trim();
  const isShort = youtubeType === "short";
  const initial = account.displayName[0]?.toUpperCase() ?? "?";

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm" style={{ backgroundColor: "#0f0f0f", border: "1px solid #2a2a2a" }}>
      <div className="flex items-center gap-2 px-4 py-2.5"
        style={{ borderBottom: "1px solid #2a2a2a", borderLeft: "3px solid #ff0000", backgroundColor: "#0a0a0a" }}>
        <PlatformIcon platform="youtube" size={16} />
        <span className="text-xs font-semibold" style={{ color: "#ff0000" }}>YouTube</span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded ml-1" style={{ backgroundColor: "#ff000020", color: "#ff0000" }}>
          {isShort ? "SHORT" : "VIDEO"}
        </span>
        <span className="text-xs ml-auto" style={{ color: "#666" }}>{account.displayName}</span>
      </div>

      <div className="p-4">
        {/* Video thumbnail — actual video if attached, otherwise a placeholder. Shorts render
            as a tall 9:16 canvas (matching the real Shorts player), regular videos as 16:9. */}
        {isShort ? (
          <div className="mx-auto rounded-xl overflow-hidden relative" style={{ width: 160, aspectRatio: "9/16", backgroundColor: "#000", border: "1px solid #2a2a2a" }}>
            {video ? (
              <video src={video.previewUrl} className="w-full h-full object-cover" muted playsInline loop autoPlay />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5">
                  <rect x="2" y="5" width="20" height="14" rx="3" />
                  <path d="M10 9l5 3-5 3V9z" fill="#444" stroke="none" />
                </svg>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden relative" style={{ aspectRatio: "16/9", backgroundColor: "#000", border: "1px solid #2a2a2a" }}>
            {video ? (
              <video src={video.previewUrl} className="w-full h-full object-cover" muted />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5">
                  <rect x="2" y="5" width="20" height="14" rx="3" />
                  <path d="M10 9l5 3-5 3V9z" fill="#444" stroke="none" />
                </svg>
              </div>
            )}
          </div>
        )}

        <div className="mt-3 flex gap-3">
          {account.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-white"
              style={{ background: "#ff0000" }}>
              {account.displayName[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {title ? (
              <p className="text-sm font-semibold leading-snug" style={{ color: "#ededed" }}>{title}</p>
            ) : (
              <p className="text-sm italic" style={{ color: "#444" }}>Title — first line of your post</p>
            )}
            <p className="text-xs mt-1" style={{ color: "#888" }}>{account.displayName}</p>
            {description ? (
              <p className="text-xs mt-2 whitespace-pre-wrap break-words leading-relaxed line-clamp-3" style={{ color: "#aaa" }}>{description}</p>
            ) : (
              <p className="text-xs mt-2 italic" style={{ color: "#444" }}>Description everything after the first line</p>
            )}
          </div>
        </div>

        {/* First comment */}
        {commentText && (
          <div className="mt-3 pt-2.5 flex gap-2" style={{ borderTop: "1px solid #1a1a1a" }}>
            <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: "#ff0000" }}>{initial}</div>
            <div className="flex-1 rounded-lg px-3 py-2" style={{ backgroundColor: "#111111" }}>
              <p className="text-xs font-semibold mb-0.5" style={{ color: "#ededed" }}>{account.displayName}</p>
              <p className="text-xs" style={{ color: "#aaa" }}>{commentText}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PixelfedPreview({ account, text, commentText, images, video }: {
  account: Account;
  text: string;
  commentText: string;
  images: UploadedImage[];
  video: UploadedImage | null;
}) {
  const initial = account.displayName[0]?.toUpperCase() ?? "?";
  const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm" style={{ backgroundColor: "#1a1215", border: "1px solid #2a2a2a" }}>
      <div className="flex items-center gap-2 px-4 py-2.5"
        style={{ borderBottom: "1px solid #2a2a2a", borderLeft: "3px solid #ff8c00", backgroundColor: "#0a0a0a" }}>
        <PlatformIcon platform="pixelfed" size={16} />
        <span className="text-xs font-semibold" style={{ color: "#ff8c00" }}>Pixelfed</span>
        <span className="text-xs ml-auto" style={{ color: "#666" }}>@{account.displayName}</span>
      </div>

      <div className="p-4">
        <div className="flex gap-3">
          {account.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-white"
              style={{ background: "#ff8c00" }}>
              {initial}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-sm font-bold" style={{ color: "#ededed" }}>{account.displayName}</span>
              <span className="text-xs" style={{ color: "#555" }}>{timeStr}</span>
            </div>
            {text ? (
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed" style={{ color: "#d4d4d4" }}>{text}</p>
            ) : (
              <p className="text-sm italic" style={{ color: "#444" }}>Start writing your post…</p>
            )}

            {video && (
              <div className="mt-2.5 rounded-xl overflow-hidden" style={{ border: "1px solid #2a2a2a" }}>
                <video src={video.previewUrl} className="w-full h-48 object-cover" muted />
              </div>
            )}

            {images.length > 0 && (
              <div className={`mt-2.5 grid gap-1.5 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                {images.slice(0, 4).map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={img.previewUrl} alt="" className={`w-full object-cover rounded-lg ${images.length === 1 ? "h-48" : "h-28"}`} />
                ))}
              </div>
            )}

            {commentText && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: "#2a2a2a" }}>
                <p className="text-xs mb-1" style={{ color: "#555" }}>First comment</p>
                <p className="text-sm" style={{ color: "#aaa" }}>{commentText}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MastodonPreview({ account, text, commentText, images, video }: {
  account: Account;
  text: string;
  commentText: string;
  images: UploadedImage[];
  video: UploadedImage | null;
}) {
  const initial = account.displayName[0]?.toUpperCase() ?? "?";
  const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm" style={{ backgroundColor: "#1f1f2e", border: "1px solid #2a2a2a" }}>
      <div className="flex items-center gap-2 px-4 py-2.5"
        style={{ borderBottom: "1px solid #2a2a2a", borderLeft: "3px solid #6364ff", backgroundColor: "#0a0a0a" }}>
        <PlatformIcon platform="mastodon" size={16} />
        <span className="text-xs font-semibold" style={{ color: "#6364ff" }}>Mastodon</span>
        <span className="text-xs ml-auto" style={{ color: "#666" }}>@{account.displayName}</span>
      </div>

      <div className="p-4">
        <div className="flex gap-3">
          {account.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-white"
              style={{ background: "#6364ff" }}>
              {initial}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-sm font-bold" style={{ color: "#ededed" }}>{account.displayName}</span>
              <span className="text-xs" style={{ color: "#555" }}>{timeStr}</span>
            </div>
            {text ? (
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed" style={{ color: "#d4d4d4" }}>{text}</p>
            ) : (
              <p className="text-sm italic" style={{ color: "#444" }}>Start writing your post…</p>
            )}

            {video && (
              <div className="mt-2.5 rounded-xl overflow-hidden" style={{ border: "1px solid #2a2a2a" }}>
                <video src={video.previewUrl} className="w-full h-48 object-cover" muted />
              </div>
            )}

            {images.length > 0 && (
              <div className={`mt-2.5 grid gap-1 rounded-xl overflow-hidden ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                {images.slice(0, 4).map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={img.previewUrl} alt=""
                    className={`w-full object-cover ${images.length === 1 ? "h-52" : "h-28"}`} />
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center gap-4">
              {["💬", "🔁", "⭐", "🔖"].map((icon) => (
                <span key={icon} className="text-base" style={{ color: "#555" }}>{icon}</span>
              ))}
            </div>

            {commentText && (
              <div className="mt-3 pt-2.5 flex gap-2" style={{ borderTop: "1px solid #2a2a2a" }}>
                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: "#6364ff" }}>{initial}</div>
                <div className="flex-1 rounded-lg px-3 py-2" style={{ backgroundColor: "#111111" }}>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: "#ededed" }}>@{account.displayName}</p>
                  <p className="text-xs" style={{ color: "#aaa" }}>{commentText}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PinterestPreview({ account, text, images }: {
  account: Account;
  text: string;
  images: UploadedImage[];
}) {
  const lines = text.split("\n").filter(Boolean);
  const title = lines[0] ?? "";
  const description = lines.slice(1).join(" ") || text;
  const link = text.match(/https?:\/\/[^\s]+/)?.[0];
  const initial = account.displayName[0]?.toUpperCase() ?? "?";

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
      <div className="flex items-center gap-2 px-4 py-2.5"
        style={{ borderBottom: "1px solid #2a2a2a", borderLeft: "3px solid #e60023", backgroundColor: "#0a0a0a" }}>
        <PlatformIcon platform="pinterest" size={16} />
        <span className="text-xs font-semibold" style={{ color: "#e60023" }}>Pinterest</span>
        <span className="text-xs ml-auto" style={{ color: "#666" }}>{account.displayName}</span>
      </div>

      <div className="p-4">
        {/* Pin card */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", maxWidth: 220, margin: "0 auto" }}>
          {images.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[0].previewUrl} alt="" className="w-full object-cover" style={{ maxHeight: 300 }} />
          ) : (
            <div className="w-full flex flex-col items-center justify-center py-10" style={{ backgroundColor: "#1a1a1a", minHeight: 160 }}>
              <svg className="w-8 h-8 mb-2 opacity-20" fill="none" stroke="#e60023" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="3" strokeWidth="1.5" />
                <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="1.5" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 15l-5-5L5 21" />
              </svg>
              <p className="text-xs" style={{ color: "#555" }}>Image required for Pinterest</p>
            </div>
          )}

          <div className="p-3 space-y-1">
            {title && <p className="text-sm font-bold leading-snug" style={{ color: "#ededed" }}>{title}</p>}
            {description && !title && <p className="text-xs line-clamp-3" style={{ color: "#aaa" }}>{description}</p>}
            {title && description && <p className="text-xs line-clamp-2" style={{ color: "#aaa" }}>{description}</p>}
            {link && <p className="text-[10px] truncate" style={{ color: "#e60023" }}>{link}</p>}
          </div>

          <div className="px-3 pb-3 flex items-center gap-2">
            {account.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={account.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                style={{ background: "#e60023" }}>{initial}</div>
            )}
            <span className="text-[10px]" style={{ color: "#888" }}>{account.displayName}</span>
            <button className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: "#e60023" }}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TwitterPreview({ account, text, commentText, images, video }: {
  account: Account;
  text: string;
  commentText: string;
  images: UploadedImage[];
  video: UploadedImage | null;
}) {
  const initial = account.displayName[0]?.toUpperCase() ?? "?";
  const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm" style={{ backgroundColor: "#000000", border: "1px solid #2f3336" }}>
      <div className="flex items-center gap-2 px-4 py-2.5"
        style={{ borderBottom: "1px solid #2f3336", borderLeft: "3px solid #e7e9ea", backgroundColor: "#000000" }}>
        <PlatformIcon platform="twitter" size={16} />
        <span className="text-xs font-semibold" style={{ color: "#e7e9ea" }}>X (Twitter)</span>
        <span className="text-xs ml-auto" style={{ color: "#71767b" }}>@{account.displayName}</span>
      </div>

      <div className="p-4">
        <div className="flex gap-3">
          {account.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-black"
              style={{ background: "#e7e9ea" }}>
              {initial}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-sm font-bold" style={{ color: "#e7e9ea" }}>{account.displayName}</span>
              <span className="text-xs" style={{ color: "#71767b" }}>@{account.displayName} · {timeStr}</span>
            </div>
            {text ? (
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed" style={{ color: "#e7e9ea" }}>{text}</p>
            ) : (
              <p className="text-sm italic" style={{ color: "#555" }}>Start writing your tweet…</p>
            )}

            {video && (
              <div className="mt-2.5 rounded-xl overflow-hidden" style={{ border: "1px solid #2f3336" }}>
                <video src={video.previewUrl} className="w-full h-48 object-cover" muted />
              </div>
            )}

            {images.length > 0 && (
              <div className={`mt-2.5 grid gap-1 rounded-xl overflow-hidden ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                {images.slice(0, 4).map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={img.previewUrl} alt=""
                    className={`w-full object-cover ${images.length === 1 ? "h-52" : "h-28"}`} />
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center gap-5" style={{ color: "#71767b" }}>
              {[
                <svg key="reply" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
                <svg key="retweet" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
                <svg key="like" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
              ].map((icon, i) => (
                <span key={i}>{icon}</span>
              ))}
            </div>

            {commentText && (
              <div className="mt-3 pt-2.5 flex gap-2" style={{ borderTop: "1px solid #2f3336" }}>
                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-black"
                  style={{ background: "#e7e9ea" }}>{initial}</div>
                <div className="flex-1 rounded-lg px-3 py-2" style={{ backgroundColor: "#0d0d0d", border: "1px solid #2f3336" }}>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: "#e7e9ea" }}>@{account.displayName}</p>
                  <p className="text-xs" style={{ color: "#aaa" }}>{commentText}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TelegramPreview({ account, text, images, video }: {
  account: Account;
  text: string;
  images: UploadedImage[];
  video: UploadedImage | null;
}) {
  const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const hasMedia = images.length > 0 || video !== null;

  return (
    <div className="rounded-2xl shadow-sm overflow-hidden" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
      <div className="flex items-center gap-2 px-4 py-2.5"
        style={{ borderBottom: "1px solid #2a2a2a", borderLeft: "3px solid #229ED9", backgroundColor: "#0a0a0a" }}>
        <PlatformIcon platform="telegram" size={16} />
        <span className="text-xs font-semibold" style={{ color: "#229ED9" }}>Telegram</span>
        <span className="text-xs ml-auto" style={{ color: "#666" }}>{account.displayName}</span>
      </div>

      <div className="p-4" style={{ backgroundColor: "#17212B" }}>
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-tr-sm overflow-hidden" style={{ backgroundColor: "#2B5278" }}>
            {/* Media */}
            {video ? (
              <div className="relative w-full" style={{ aspectRatio: "9/16", maxHeight: 240, backgroundColor: "#1a1a1a" }}>
                <video src={video.previewUrl} className="w-full h-full object-cover" muted />
                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                  style={{ backgroundColor: "rgba(0,0,0,0.6)", color: "#fff" }}>▶ Video</div>
              </div>
            ) : images.length === 1 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images[0].previewUrl} alt="" className="w-full object-cover" style={{ maxHeight: 240 }} />
            ) : images.length > 1 ? (
              <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${Math.min(images.length, 2)}, 1fr)` }}>
                {images.slice(0, 4).map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <div key={i} className="relative">
                    <img src={img.previewUrl} alt="" className="w-full object-cover" style={{ height: 100 }} />
                    {i === 3 && images.length > 4 && (
                      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white"
                        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>+{images.length - 4}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            {/* Text */}
            {text && (
              <div className={`px-3 ${hasMedia ? "py-2" : "pt-2 pb-1"}`}>
                <p className="text-sm whitespace-pre-wrap break-words" style={{ color: "#e8e8e8" }}>{text}</p>
                <div className="flex justify-end mt-1">
                  <span className="text-[10px]" style={{ color: "#7d9bb9" }}>{timeStr} ✓✓</span>
                </div>
              </div>
            )}
            {!text && (
              <div className="flex justify-end px-2 pb-1">
                <span className="text-[10px]" style={{ color: "#7d9bb9" }}>{timeStr} ✓✓</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NostrPreview({ account, text, images }: {
  account: Account;
  text: string;
  images: UploadedImage[];
}) {
  const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="rounded-2xl shadow-sm overflow-hidden" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
      <div className="flex items-center gap-2 px-4 py-2.5"
        style={{ borderBottom: "1px solid #2a2a2a", borderLeft: "3px solid #7B5EA7", backgroundColor: "#0a0a0a" }}>
        <PlatformIcon platform="nostr" size={16} />
        <span className="text-xs font-semibold" style={{ color: "#7B5EA7" }}>Nostr</span>
        <span className="text-xs ml-auto truncate max-w-[140px]" style={{ color: "#666" }}>{account.displayName}</span>
      </div>
      <div className="p-4" style={{ backgroundColor: "#0f0f0f" }}>
        <div className="flex gap-3">
          {account.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.avatarUrl} alt={account.displayName}
              className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
              style={{ background: "#7B5EA7", color: "#fff" }}>
              {account.displayName[0]?.toUpperCase() ?? "N"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-sm font-semibold" style={{ color: "#ededed" }}>{account.displayName}</span>
              <span className="text-xs" style={{ color: "#555" }}>{timeStr}</span>
            </div>
            {text && <p className="text-sm whitespace-pre-wrap break-words" style={{ color: "#ccc" }}>{text}</p>}
            {images.length > 0 && (
              <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(images.length, 2)}, 1fr)` }}>
                {images.slice(0, 4).map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={img.previewUrl} alt="" className="w-full rounded object-cover" style={{ height: 120 }} />
                ))}
              </div>
            )}
            <div className="flex gap-5 mt-3">
              {["↩ Reply", "⚡ Zap", "♡ Like", "↗ Boost"].map(a => (
                <span key={a} className="text-xs" style={{ color: "#555" }}>{a}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TumblrPreview({ account, text, images }: { account: Account; text: string; images: UploadedImage[] }) {
  const blogName = account.displayName;
  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#35465c", fontFamily: "sans-serif" }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: "#2c3e50" }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: "#00b8ff", color: "#fff" }}>
          {account.avatarUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={account.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
            : blogName[0]?.toUpperCase()}
        </div>
        <span className="text-xs font-semibold" style={{ color: "#a9b8c3" }}>{blogName}</span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {text && (
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed" style={{ color: "#ffffff" }}>
            {text.length > 280 ? text.slice(0, 280) + "…" : text}
          </p>
        )}
        {images.length > 0 && (
          <div className={`grid gap-1 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {images.slice(0, 4).map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={img.previewUrl} alt=""
                className="w-full rounded-lg object-cover"
                style={{ maxHeight: images.length === 1 ? 300 : 140 }} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-4 px-4 py-2" style={{ borderTop: "1px solid #2c3e50" }}>
        {[["❤", "Like"], ["🔁", "Reblog"], ["✉", "Reply"]].map(([icon, label]) => (
          <button key={label} className="flex items-center gap-1 text-xs" style={{ color: "#a9b8c3", background: "none", border: "none", cursor: "default" }}>
            <span>{icon}</span><span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function LemmyPreview({ account, text, commentText, images }: { account: Account; text: string; commentText: string; images: UploadedImage[] }) {
  const lines = text.trim().split("\n");
  const title = lines[0]?.slice(0, 200) ?? "";
  const body = lines.slice(1).join("\n").trim();
  const community = account.displayName;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#1c1c1c", fontFamily: "sans-serif" }}>
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ backgroundColor: "#111", borderBottom: "1px solid #2a2a2a", borderLeft: "3px solid #ff6314" }}>
        <PlatformIcon platform="lemmy" size={16} />
        <span className="text-xs font-semibold" style={{ color: "#ff6314" }}>Lemmy</span>
        <span className="text-xs ml-auto" style={{ color: "#666" }}>{community}</span>
      </div>

      {/* Post card */}
      <div className="px-4 py-3 space-y-2">
        <p className="text-sm font-semibold leading-snug" style={{ color: "#ededed" }}>
          {title || <span style={{ color: "#555" }}>Post title (first line of text)</span>}
        </p>
        {images.length > 0 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={images[0].previewUrl} alt="" className="w-full rounded-lg object-cover" style={{ maxHeight: 220 }} />
        )}
        {body && (
          <p className="text-xs whitespace-pre-wrap break-words leading-relaxed" style={{ color: "#aaa" }}>
            {body.length > 300 ? body.slice(0, 300) + "…" : body}
          </p>
        )}
        <div className="flex items-center gap-3 pt-1">
          {[["▲", "Vote"], ["💬", "Comment"], ["🔗", "Share"]].map(([icon, label]) => (
            <span key={label} className="flex items-center gap-1 text-xs" style={{ color: "#555" }}>
              <span>{icon}</span><span>{label}</span>
            </span>
          ))}
        </div>
      </div>

      {commentText && (
        <div className="px-4 pb-3">
          <div className="rounded-xl p-2.5" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "#ff6314" }}>First comment</p>
            <p className="text-xs whitespace-pre-wrap break-words" style={{ color: "#aaa" }}>{commentText}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function DiscordPreview({ account, text, commentText, images, video }: {
  account: Account;
  text: string;
  commentText: string;
  images: UploadedImage[];
  video: UploadedImage | null;
}) {
  const initial = account.displayName[0]?.toUpperCase() ?? "?";
  // displayName is "#channel (Server)" — extract server name for header
  const serverMatch = account.displayName.match(/\((.+)\)$/);
  const serverName = serverMatch ? serverMatch[1] : account.displayName;

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm" style={{ backgroundColor: "#313338", border: "1px solid #2a2a2a" }}>
      <div className="flex items-center gap-2 px-4 py-2.5"
        style={{ borderBottom: "1px solid #2a2a2a", borderLeft: "3px solid #5865F2", backgroundColor: "#0a0a0a" }}>
        <PlatformIcon platform="discord" size={16} />
        <span className="text-xs font-semibold" style={{ color: "#5865F2" }}>Discord</span>
        <span className="text-xs ml-auto" style={{ color: "#666" }}>{serverName}</span>
      </div>

      <div className="px-4 py-3 flex gap-3">
        {account.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={account.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0 mt-0.5" />
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5"
            style={{ background: "#5865F2", color: "#fff" }}>
            {initial}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-sm font-semibold" style={{ color: "#00b0f4" }}>Posthive Bot</span>
            <span className="text-[10px]" style={{ color: "#949ba4" }}>Today at {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          {text ? (
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed" style={{ color: "#dbdee1" }}>{text}</p>
          ) : (
            <p className="text-sm italic" style={{ color: "#4e5058" }}>Start writing your post for a preview…</p>
          )}
          {images.length > 0 && (
            <div className={`mt-2 rounded-lg overflow-hidden grid gap-0.5 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
              style={{ maxWidth: 400 }}>
              {images.slice(0, 4).map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={img.previewUrl} alt="" className={`w-full object-cover ${images.length === 1 ? "h-48" : "h-28"}`} />
              ))}
            </div>
          )}
          {video && (
            <div className="mt-2 rounded-lg overflow-hidden" style={{ maxWidth: 400 }}>
              <video src={video.previewUrl} className="w-full rounded-lg" style={{ maxHeight: 200 }} controls={false} muted />
            </div>
          )}
          {commentText && (
            <div className="mt-3 pl-3 py-2" style={{ borderLeft: "2px solid #5865F2" }}>
              <span className="text-xs font-semibold" style={{ color: "#00b0f4" }}>Posthive Bot </span>
              <span className="text-xs" style={{ color: "#dbdee1" }}>{commentText}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PlatformPreview({ account, text, commentText, mediaItems = [], igMediaType, youtubeType }: {
  account: Account;
  text: string;
  commentText: string;
  mediaItems?: UploadedImage[];
  igMediaType?: "post" | "reel" | "story";
  youtubeType?: "short" | "video";
}) {
  const images = mediaItems.filter(m => !m.isVideo);
  const video = mediaItems.find(m => m.isVideo) ?? null;

  if (account.platform === "instagram") {
    return <InstagramPreview account={account} text={text} commentText={commentText} mediaItems={mediaItems} igMediaType={igMediaType} />;
  }
  if (account.platform === "linkedin") {
    return <LinkedInPreview account={account} text={text} commentText={commentText} images={images} />;
  }
  if (account.platform === "pixelfed") {
    return <PixelfedPreview account={account} text={text} commentText={commentText} images={images} video={video} />;
  }
  if (account.platform === "mastodon") {
    return <MastodonPreview account={account} text={text} commentText={commentText} images={images} video={video} />;
  }
  if (account.platform === "twitter") {
    return <TwitterPreview account={account} text={text} commentText={commentText} images={images} video={video} />;
  }
  if (account.platform === "pinterest") {
    return <PinterestPreview account={account} text={text} images={images} />;
  }
  if (account.platform === "youtube") {
    return <YouTubePreview account={account} text={text} commentText={commentText} mediaItems={mediaItems} youtubeType={youtubeType ?? "short"} />;
  }
  if (account.platform === "telegram") {
    return <TelegramPreview account={account} text={text} images={images} video={video} />;
  }
  if (account.platform === "nostr") {
    return <NostrPreview account={account} text={text} images={images} />;
  }
  if (account.platform === "discord") {
    return <DiscordPreview account={account} text={text} commentText={commentText} images={images} video={video} />;
  }
  if (account.platform === "tumblr") {
    return <TumblrPreview account={account} text={text} images={images} />;
  }
  if (account.platform === "lemmy") {
    return <LemmyPreview account={account} text={text} commentText={commentText} images={images} />;
  }

  const color = PLATFORM_COLOR[account.platform] ?? "#6b7280";
  const initial = account.displayName[0]?.toUpperCase() ?? "?";
  const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Link card: only for Bluesky, only when no images/video
  const showLinkCard = account.platform === "bluesky" && images.length === 0 && !video;
  const og = useLinkCard(text, showLinkCard);

  return (
    <div className="rounded-2xl shadow-sm overflow-hidden" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
      <div className="flex items-center gap-2 px-4 py-2.5"
        style={{ borderBottom: "1px solid #2a2a2a", borderLeft: `3px solid ${color}`, backgroundColor: "#0a0a0a" }}>
        <PlatformIcon platform={account.platform} size={16} />
        <span className="text-xs font-semibold capitalize" style={{ color }}>{account.platform}</span>
        <span className="text-xs ml-auto" style={{ color: "#666" }}>{account.displayName}</span>
      </div>

      <div className="p-4">
        <div className="flex gap-3">
          {account.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-white"
              style={{ background: color }}>
              {initial}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-sm font-bold" style={{ color: "#ededed" }}>{account.displayName}</span>
              <span className="text-xs" style={{ color: "#555" }}>{timeStr}</span>
            </div>
            {text ? (
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed" style={{ color: "#d4d4d4" }}>{text}</p>
            ) : (
              <p className="text-sm italic" style={{ color: "#444" }}>Start writing your post for a preview…</p>
            )}

            {/* Video preview */}
            {video && account.platform !== "instagram" && (
              <div className="mt-2.5 rounded-xl overflow-hidden" style={{ border: "1px solid #2a2a2a" }}>
                <video src={video.previewUrl} className="w-full h-48 object-cover" muted />
              </div>
            )}

            {images.length > 0 && (
              <div className={`mt-2.5 grid gap-1.5 rounded-xl overflow-hidden ${
                images.length === 1 ? "grid-cols-1" : "grid-cols-2"
              }`}>
                {images.slice(0, 4).map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={img.previewUrl} alt=""
                    className={`w-full object-cover ${
                      images.length === 1 ? "h-48" :
                      images.length === 3 && i === 0 ? "h-36 col-span-2" : "h-28"
                    }`} />
                ))}
              </div>
            )}

            {/* Bluesky link card */}
            {og && <LinkCard og={og} />}
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: "1px solid #1f1f1f", color: "#555" }}>
          <span className="text-xs">♡ 0</span>
          <span className="text-xs">↩ Reply</span>
          <span className="text-xs">↗ Share</span>
        </div>

        {commentText && (
          <div className="mt-3 pt-3 flex gap-2.5" style={{ borderTop: "1px solid #1f1f1f" }}>
            {account.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={account.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                style={{ background: color }}>
                {initial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold" style={{ color: "#aaa" }}>{account.displayName} </span>
              <span className="text-xs" style={{ color: "#555" }}>· first comment</span>
              <p className="text-sm mt-0.5 whitespace-pre-wrap break-words" style={{ color: "#888" }}>{commentText}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
