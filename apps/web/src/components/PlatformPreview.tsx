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
};

export const PLATFORM_LIMIT: Record<string, number> = {
  bluesky: 300,
  threads: 500,
  linkedin: 3000,
  mastodon: 500,
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

export function PlatformPreview({ account, text, commentText, mediaItems = [], igMediaType }: {
  account: Account;
  text: string;
  commentText: string;
  mediaItems?: UploadedImage[];
  igMediaType?: "post" | "reel" | "story";
}) {
  const images = mediaItems.filter(m => !m.isVideo);
  const video = mediaItems.find(m => m.isVideo) ?? null;

  if (account.platform === "instagram") {
    return <InstagramPreview account={account} text={text} commentText={commentText} mediaItems={mediaItems} igMediaType={igMediaType} />;
  }
  if (account.platform === "linkedin") {
    return <LinkedInPreview account={account} text={text} commentText={commentText} images={images} />;
  }
  if (account.platform === "mastodon") {
    return <MastodonPreview account={account} text={text} commentText={commentText} images={images} video={video} />;
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
