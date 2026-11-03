"use client";

import { useEffect, useRef, useState } from "react";
import { PlatformIcon } from "./PlatformIcon";
import { formatTime } from "../lib/datetime";
import { cn } from "../lib/cn";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Mockups render each platform's LIGHT mode: white card, platform-native colors as
// arbitrary classes. The header bar above each mockup is app chrome (tokens).
const CARD = "overflow-hidden rounded-2xl border border-border bg-white";
const HEADER = "flex items-center gap-2 border-b border-l-3 border-border bg-surface px-4 py-2.5";
const IG_GRADIENT = "bg-[linear-gradient(135deg,#f09433_0%,#e6683c_25%,#dc2743_50%,#cc2366_75%,#bc1888_100%)]";

// Light-mode text / secondary / border for platforms rendered by the generic preview
type MockTheme = { text: string; sub: string; border: string };
const GENERIC_THEME: Record<string, MockTheme> = {
  bluesky:  { text: "text-[#0b0f14]", sub: "text-[#42576c]", border: "border-[#d4dbe2]" },
  threads:  { text: "text-black",     sub: "text-[#737373]", border: "border-[#dbdbdb]" },
  facebook: { text: "text-[#050505]", sub: "text-[#65676b]", border: "border-[#ced0d4]" },
};
const GENERIC_THEME_DEFAULT: MockTheme = { text: "text-[#111111]", sub: "text-[#666666]", border: "border-[#e5e5e5]" };

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
    <div className="mt-2 rounded-xl overflow-hidden border border-[#d4dbe2]">
      {og.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={og.image} alt="" className="w-full h-32 object-cover" />
      )}
      <div className="px-3 py-2 bg-white">
        {og.url && <p className="text-[10px] mb-0.5 truncate text-[#42576c]">{new URL(og.url).hostname}</p>}
        <p className="text-xs font-semibold leading-snug line-clamp-2 text-[#0b0f14]">{og.title}</p>
        {og.description && <p className="text-[11px] mt-0.5 line-clamp-2 text-[#42576c]">{og.description}</p>}
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
  threads: "#000000",
  linkedin: "#0077b5",
  instagram: "#e1306c",
  mastodon: "#6364ff",
  pixelfed: "#ff8c00",
  youtube: "#ff0000",
  facebook: "#1877f2",
  twitter: "#0f1419",
  pinterest: "#e60023",
  telegram: "#229ED9",
  nostr: "#7B5EA7",
  discord: "#5865F2",
  tumblr:         "#35465c",
  lemmy:          "#ff6314",
  googlebusiness: "#4285f4",
  tiktok: "#010101",
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
  tumblr:         4096,
  lemmy:          10000,
  googlebusiness: 1500,
  tiktok: 2200,
  instagram: 2200,
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

  const FORMAT_LABEL: Record<string, string> = { post: "Post", reel: "Reel", story: "Story" };
  const AVATAR_SIZE = { 7: "size-7", 8: "size-8" } as const;

  function Avatar({ size = 8 }: { size?: keyof typeof AVATAR_SIZE }) {
    const cls = cn(AVATAR_SIZE[size], "rounded-full shrink-0");
    return account.avatarUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={account.avatarUrl} alt="" className={cn(cls, "object-cover")} />
    ) : (
      <div className={cn(cls, IG_GRADIENT, "flex items-center justify-center text-xs font-bold text-white")}>{initial}</div>
    );
  }

  // ── STORY ───────────────────────────────────────────────────────────────────
  if (igMediaType === "story") {
    return (
      <div className={CARD}>
        <div className={cn(HEADER, "border-l-[#e1306c]")}>
          <PlatformIcon platform="instagram" size={16} />
          <span className="type-body-sb-xs text-[#e1306c]">Instagram</span>
          <span className="type-body-sb-xxs px-1.5 py-0.5 rounded-sm ml-1 bg-[#e1306c]/12 text-[#e1306c]">STORY</span>
          <span className="type-body-r-xs ml-auto text-muted">{account.displayName}</span>
        </div>

        {/* 9:16 story canvas */}
        <div className="relative w-full overflow-hidden aspect-9/16 bg-black">
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
                <p className="type-body-r-xs text-neutral-500">Add an image or video</p>
              </div>
            </div>
          )}
          {/* overlay: avatar + username top left */}
          <div className="absolute top-3 left-3 right-3 flex items-center gap-2">
            <div className="ring-2 ring-white rounded-full">
              <Avatar size={8} />
            </div>
            <span className="text-xs font-semibold text-white drop-shadow-sm">{account.displayName}</span>
            <span className="text-xs text-white/60 drop-shadow-sm ml-1">· just now</span>
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
      <div className={CARD}>
        <div className={cn(HEADER, "border-l-[#e1306c]")}>
          <PlatformIcon platform="instagram" size={16} />
          <span className="type-body-sb-xs text-[#e1306c]">Instagram</span>
          <span className="type-body-sb-xxs px-1.5 py-0.5 rounded-sm ml-1 bg-[#e1306c]/12 text-[#e1306c]">REEL</span>
          <span className="type-body-r-xs ml-auto text-muted">{account.displayName}</span>
        </div>

        {/* 9:16 reel canvas */}
        <div className="relative w-full overflow-hidden aspect-9/16 bg-black">
          {video ? (
            <video src={video.previewUrl} className="w-full h-full object-cover" muted loop />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <svg className="w-10 h-10 mx-auto mb-2 opacity-20" fill="none" stroke="white" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <p className="type-body-r-xs text-neutral-500">Add a video</p>
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
              <span className="text-sm font-semibold text-white drop-shadow-sm">{account.displayName}</span>
              <span className="text-xs font-semibold text-white border border-white/50 rounded-sm px-1.5 py-0.5 ml-1">Follow</span>
            </div>
            {text && (
              <p className="text-xs text-white/80 leading-relaxed line-clamp-2 drop-shadow-sm">{text}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── POST (default) ───────────────────────────────────────────────────────────
  return (
    <div className={CARD}>
      <div className={cn(HEADER, "border-l-[#e1306c]")}>
        <PlatformIcon platform="instagram" size={16} />
        <span className="type-body-sb-xs text-[#e1306c]">Instagram</span>
        <span className="type-body-sb-xxs px-1.5 py-0.5 rounded-sm ml-1 bg-[#e1306c]/12 text-[#e1306c]">{FORMAT_LABEL[igMediaType]}</span>
        <span className="type-body-r-xs ml-auto text-muted">{account.displayName}</span>
      </div>

      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="ring-2 ring-pink-500 ring-offset-1 ring-offset-white rounded-full">
          <Avatar size={8} />
        </div>
        <span className="text-sm font-semibold flex-1 text-black">{account.displayName}</span>
        <span className="text-xs font-semibold text-[#0095f6]">Follow</span>
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
            <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
              VIDEO
            </div>
          )}

          {/* Carousel nav arrows */}
          {mediaItems.length > 1 && (
            <>
              <button type="button"
                onClick={() => setCarouselIdx(i => Math.max(0, i - 1))}
                disabled={carouselIdx === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-0 transition-opacity bg-black/55">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button type="button"
                onClick={() => setCarouselIdx(i => Math.min(mediaItems.length - 1, i + 1))}
                disabled={carouselIdx === mediaItems.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-0 transition-opacity bg-black/55">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Dot indicators */}
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                {mediaItems.map((_, i) => (
                  <button key={i} type="button" onClick={() => setCarouselIdx(i)}
                    className={cn("w-1.5 h-1.5 rounded-full transition-all", i === carouselIdx ? "bg-white" : "bg-white/40")} />
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
        <div className="w-full aspect-square flex items-center justify-center bg-surface">
          <div className="text-center text-neutral-500">
            <svg className="w-10 h-10 mx-auto mb-2 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="3" strokeWidth="1.5" />
              <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="1.5" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 15l-5-5L5 21" />
            </svg>
            <p className="type-body-r-xs">Add media to preview</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 px-3 pt-2.5 pb-1 text-black">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
        </svg>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
        <svg className="w-6 h-6 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
        </svg>
      </div>

      <div className="px-3 pb-3">
        <p className="text-xs text-[#737373]">0 likes</p>
        {text ? (
          <p className="text-xs mt-1 leading-relaxed text-black">
            <span className="font-semibold">{account.displayName}</span>{" "}
            <span className="whitespace-pre-wrap">{text}</span>
          </p>
        ) : (
          <p className="type-body-r-xs mt-1 italic text-neutral-500">Caption will appear here…</p>
        )}
        <p className="text-xs mt-1.5 text-[#737373]">View all comments</p>
        {commentText && (
          <div className="flex gap-2 mt-2">
            {account.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={account.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0 mt-0.5" />
            ) : (
              <div className="w-5 h-5 rounded-full shrink-0 mt-0.5 bg-[linear-gradient(135deg,#f09433,#bc1888)]" />
            )}
            <p className="text-xs leading-relaxed text-black">
              <span className="font-semibold">{account.displayName}</span>{" "}
              <span className="whitespace-pre-wrap">{commentText}</span>
            </p>
          </div>
        )}
        <p className="text-xs mt-1.5 text-[#737373]">just now</p>
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
    <div className={cn(CARD, "shadow-xs")}>
      {/* Header bar */}
      <div className={cn(HEADER, "border-l-[#0077b5]")}>
        <PlatformIcon platform="linkedin" size={16} />
        <span className="type-body-sb-xs text-[#0077b5]">LinkedIn</span>
        <span className="type-body-r-xs ml-auto text-muted">{account.displayName}</span>
      </div>

      <div className="p-4">
        {/* Author row */}
        <div className="flex gap-3 mb-3">
          {account.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white bg-[#0077b5]">
              {initial}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-[#191919]">{account.displayName}</p>
            <p className="text-xs text-[#666666]">Just now · 🌐</p>
          </div>
        </div>

        {/* Post text — LinkedIn shows "...more" after 3 lines */}
        {text ? (
          <p className="text-sm whitespace-pre-wrap wrap-break-word leading-relaxed line-clamp-6 text-[#191919]">{text}</p>
        ) : (
          <p className="type-body-r-s italic text-neutral-500">Start writing your post for a preview…</p>
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
        <div className="mt-3 pt-2.5 flex items-center gap-4 border-t border-[#e0dfdc]">
          {["👍 Like", "💬 Comment", "🔁 Repost", "📤 Send"].map((action) => (
            <span key={action} className="text-xs font-semibold text-[#666666]">{action}</span>
          ))}
        </div>

        {/* First comment — LinkedIn API removed first comment support */}
        {commentText && (
          <div className="mt-3 pt-2.5 border-t border-[#e0dfdc]">
            <p className="type-body-r-xs text-muted">
              ⚠️ LinkedIn no longer supports first comments via API — this won&apos;t be posted.
            </p>
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
    <div className={cn(CARD, "shadow-xs")}>
      <div className={cn(HEADER, "border-l-[#ff0000]")}>
        <PlatformIcon platform="youtube" size={16} />
        <span className="type-body-sb-xs text-[#ff0000]">YouTube</span>
        <span className="type-body-sb-xxs px-1.5 py-0.5 rounded-sm ml-1 bg-[#ff0000]/12 text-[#ff0000]">
          {isShort ? "SHORT" : "VIDEO"}
        </span>
        <span className="type-body-r-xs ml-auto text-muted">{account.displayName}</span>
      </div>

      <div className="p-4">
        {/* Video thumbnail — actual video if attached, otherwise a placeholder. Shorts render
            as a tall 9:16 canvas (matching the real Shorts player), regular videos as 16:9. */}
        {isShort ? (
          <div className="mx-auto rounded-xl overflow-hidden relative w-40 aspect-9/16 bg-black border border-[#e5e5e5]">
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
          <div className="rounded-xl overflow-hidden relative aspect-video bg-black border border-[#e5e5e5]">
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
            <img src={account.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white bg-[#ff0000]">
              {account.displayName[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {title ? (
              <p className="text-sm font-semibold leading-snug text-[#0f0f0f]">{title}</p>
            ) : (
              <p className="type-body-r-s italic text-neutral-500">Title — first line of your post</p>
            )}
            <p className="text-xs mt-1 text-[#606060]">{account.displayName}</p>
            {description ? (
              <p className="text-xs mt-2 whitespace-pre-wrap wrap-break-word leading-relaxed line-clamp-3 text-[#606060]">{description}</p>
            ) : (
              <p className="type-body-r-xs mt-2 italic text-neutral-500">Description everything after the first line</p>
            )}
          </div>
        </div>

        {/* First comment */}
        {commentText && (
          <div className="mt-3 pt-2.5 flex gap-2 border-t border-[#e5e5e5]">
            <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white bg-[#ff0000]">{initial}</div>
            <div className="flex-1 rounded-lg px-3 py-2 bg-[#f2f2f2]">
              <p className="text-xs font-semibold mb-0.5 text-[#0f0f0f]">{account.displayName}</p>
              <p className="text-xs text-[#606060]">{commentText}</p>
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
  const timeStr = formatTime(new Date());

  return (
    <div className={cn(CARD, "shadow-xs")}>
      <div className={cn(HEADER, "border-l-[#ff8c00]")}>
        <PlatformIcon platform="pixelfed" size={16} />
        <span className="type-body-sb-xs text-[#ff8c00]">Pixelfed</span>
        <span className="type-body-r-xs ml-auto text-muted">@{account.displayName}</span>
      </div>

      <div className="p-4">
        <div className="flex gap-3">
          {account.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white bg-[#ff8c00]">
              {initial}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-sm font-bold text-[#212529]">{account.displayName}</span>
              <span className="text-xs text-[#6c757d]">{timeStr}</span>
            </div>
            {text ? (
              <p className="text-sm whitespace-pre-wrap wrap-break-word leading-relaxed text-[#212529]">{text}</p>
            ) : (
              <p className="type-body-r-s italic text-neutral-500">Start writing your post…</p>
            )}

            {video && (
              <div className="mt-2.5 rounded-xl overflow-hidden border border-[#dee2e6]">
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
              <div className="mt-3 pt-3 border-t border-[#dee2e6]">
                <p className="text-xs mb-1 text-[#6c757d]">First comment</p>
                <p className="text-sm text-[#6c757d]">{commentText}</p>
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
  const timeStr = formatTime(new Date());

  return (
    <div className={cn(CARD, "shadow-xs")}>
      <div className={cn(HEADER, "border-l-[#6364ff]")}>
        <PlatformIcon platform="mastodon" size={16} />
        <span className="type-body-sb-xs text-[#6364ff]">Mastodon</span>
        <span className="type-body-r-xs ml-auto text-muted">@{account.displayName}</span>
      </div>

      <div className="p-4">
        <div className="flex gap-3">
          {account.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white bg-[#6364ff]">
              {initial}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-sm font-bold text-[#282c37]">{account.displayName}</span>
              <span className="text-xs text-[#606984]">{timeStr}</span>
            </div>
            {text ? (
              <p className="text-sm whitespace-pre-wrap wrap-break-word leading-relaxed text-[#282c37]">{text}</p>
            ) : (
              <p className="type-body-r-s italic text-neutral-500">Start writing your post…</p>
            )}

            {video && (
              <div className="mt-2.5 rounded-xl overflow-hidden border border-[#d9e1e8]">
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
                <span key={icon} className="text-base text-[#606984]">{icon}</span>
              ))}
            </div>

            {commentText && (
              <div className="mt-3 pt-2.5 flex gap-2 border-t border-[#d9e1e8]">
                <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white bg-[#6364ff]">{initial}</div>
                <div className="flex-1 rounded-lg px-3 py-2 bg-[#eff3f5]">
                  <p className="text-xs font-semibold mb-0.5 text-[#282c37]">@{account.displayName}</p>
                  <p className="text-xs text-[#606984]">{commentText}</p>
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
    <div className={cn(CARD, "shadow-xs")}>
      <div className={cn(HEADER, "border-l-[#e60023]")}>
        <PlatformIcon platform="pinterest" size={16} />
        <span className="type-body-sb-xs text-[#e60023]">Pinterest</span>
        <span className="type-body-r-xs ml-auto text-muted">{account.displayName}</span>
      </div>

      <div className="p-4">
        {/* Pin card */}
        <div className="mx-auto max-w-55 rounded-2xl overflow-hidden bg-white border border-[#e9e9e9]">
          {images.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[0].previewUrl} alt="" className="w-full object-cover max-h-75" />
          ) : (
            <div className="w-full flex flex-col items-center justify-center py-10 min-h-40 bg-surface">
              <svg className="w-8 h-8 mb-2 opacity-40" fill="none" stroke="#e60023" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="3" strokeWidth="1.5" />
                <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="1.5" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 15l-5-5L5 21" />
              </svg>
              <p className="type-body-r-xs text-neutral-500">Image required for Pinterest</p>
            </div>
          )}

          <div className="p-3 space-y-1">
            {title && <p className="text-sm font-bold leading-snug text-[#111111]">{title}</p>}
            {description && !title && <p className="text-xs line-clamp-3 text-[#767676]">{description}</p>}
            {title && description && <p className="text-xs line-clamp-2 text-[#767676]">{description}</p>}
            {link && <p className="text-[10px] truncate text-[#e60023]">{link}</p>}
          </div>

          <div className="px-3 pb-3 flex items-center gap-2">
            {account.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={account.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white bg-[#e60023]">{initial}</div>
            )}
            <span className="text-[10px] text-[#767676]">{account.displayName}</span>
            <button className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full text-white bg-[#e60023]">
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
  const timeStr = formatTime(new Date());

  return (
    <div className={cn(CARD, "shadow-xs")}>
      <div className={cn(HEADER, "border-l-[#0f1419]")}>
        <PlatformIcon platform="twitter" size={16} />
        <span className="type-body-sb-xs text-[#0f1419]">X (Twitter)</span>
        <span className="type-body-r-xs ml-auto text-muted">@{account.displayName}</span>
      </div>

      <div className="p-4">
        <div className="flex gap-3">
          {account.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white bg-[#0f1419]">
              {initial}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-sm font-bold text-[#0f1419]">{account.displayName}</span>
              <span className="text-xs text-[#536471]">@{account.displayName} · {timeStr}</span>
            </div>
            {text ? (
              <p className="text-sm whitespace-pre-wrap wrap-break-word leading-relaxed text-[#0f1419]">{text}</p>
            ) : (
              <p className="type-body-r-s italic text-neutral-500">Start writing your tweet…</p>
            )}

            {video && (
              <div className="mt-2.5 rounded-xl overflow-hidden border border-[#eff3f4]">
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

            <div className="mt-3 flex items-center gap-5 text-[#536471]">
              {[
                <svg key="reply" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
                <svg key="retweet" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
                <svg key="like" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
              ].map((icon, i) => (
                <span key={i}>{icon}</span>
              ))}
            </div>

            {commentText && (
              <div className="mt-3 pt-2.5 flex gap-2 border-t border-[#eff3f4]">
                <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white bg-[#0f1419]">{initial}</div>
                <div className="flex-1 rounded-lg px-3 py-2 bg-[#f7f9f9] border border-[#eff3f4]">
                  <p className="text-xs font-semibold mb-0.5 text-[#0f1419]">@{account.displayName}</p>
                  <p className="text-xs text-[#536471]">{commentText}</p>
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
  const timeStr = formatTime(new Date());
  const hasMedia = images.length > 0 || video !== null;

  return (
    <div className={cn(CARD, "shadow-xs")}>
      <div className={cn(HEADER, "border-l-[#229ED9]")}>
        <PlatformIcon platform="telegram" size={16} />
        <span className="type-body-sb-xs text-[#229ED9]">Telegram</span>
        <span className="type-body-r-xs ml-auto text-muted">{account.displayName}</span>
      </div>

      <div className="p-4 bg-[#e7ebf0]">
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-tr-sm overflow-hidden bg-[#effdde] shadow-xs">
            {/* Media */}
            {video ? (
              <div className="relative w-full aspect-9/16 max-h-60 bg-black">
                <video src={video.previewUrl} className="w-full h-full object-cover" muted />
                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-sm text-[10px] font-semibold bg-black/60 text-white">▶ Video</div>
              </div>
            ) : images.length === 1 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images[0].previewUrl} alt="" className="w-full object-cover max-h-60" />
            ) : images.length > 1 ? (
              <div className="grid grid-cols-2 gap-0.5">
                {images.slice(0, 4).map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <div key={i} className="relative">
                    <img src={img.previewUrl} alt="" className="w-full object-cover h-25" />
                    {i === 3 && images.length > 4 && (
                      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white bg-black/50">+{images.length - 4}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            {/* Text */}
            {text && (
              <div className={`px-3 ${hasMedia ? "py-2" : "pt-2 pb-1"}`}>
                <p className="text-sm whitespace-pre-wrap wrap-break-word text-black">{text}</p>
                <div className="flex justify-end mt-1">
                  <span className="text-[10px] text-[#4fae4e]">{timeStr} ✓✓</span>
                </div>
              </div>
            )}
            {!text && (
              <div className="flex justify-end px-2 pb-1">
                <span className="text-[10px] text-[#4fae4e]">{timeStr} ✓✓</span>
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
  const timeStr = formatTime(new Date());
  return (
    <div className={cn(CARD, "shadow-xs")}>
      <div className={cn(HEADER, "border-l-[#7B5EA7]")}>
        <PlatformIcon platform="nostr" size={16} />
        <span className="type-body-sb-xs text-[#7B5EA7]">Nostr</span>
        <span className="type-body-r-xs ml-auto truncate max-w-35 text-muted">{account.displayName}</span>
      </div>
      <div className="p-4">
        <div className="flex gap-3">
          {account.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.avatarUrl} alt={account.displayName}
              className="w-9 h-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold bg-[#7B5EA7] text-white">
              {account.displayName[0]?.toUpperCase() ?? "N"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-sm font-semibold text-[#111111]">{account.displayName}</span>
              <span className="text-xs text-[#6b6b6b]">{timeStr}</span>
            </div>
            {text && <p className="text-sm whitespace-pre-wrap wrap-break-word text-[#111111]">{text}</p>}
            {images.length > 0 && (
              <div className={cn("mt-2 grid gap-1", images.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
                {images.slice(0, 4).map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={img.previewUrl} alt="" className="w-full rounded-sm object-cover h-30" />
                ))}
              </div>
            )}
            <div className="flex gap-5 mt-3">
              {["↩ Reply", "⚡ Zap", "♡ Like", "↗ Boost"].map(a => (
                <span key={a} className="text-xs text-[#6b6b6b]">{a}</span>
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
    <div className={CARD}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-[#00b8ff] text-white">
          {account.avatarUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={account.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
            : blogName[0]?.toUpperCase()}
        </div>
        <span className="text-xs font-semibold text-black">{blogName}</span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {text && (
          <p className="text-sm whitespace-pre-wrap wrap-break-word leading-relaxed text-black">
            {text.length > 280 ? text.slice(0, 280) + "…" : text}
          </p>
        )}
        {images.length > 0 && (
          <div className={`grid gap-1 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {images.slice(0, 4).map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={img.previewUrl} alt=""
                className={cn("w-full rounded-lg object-cover", images.length === 1 ? "max-h-75" : "max-h-35")} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-[#ebebeb]">
        {[["❤", "Like"], ["🔁", "Reblog"], ["✉", "Reply"]].map(([icon, label]) => (
          <button key={label} className="flex items-center gap-1 text-xs text-[#595959] bg-transparent border-0 cursor-default">
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
    <div className={CARD}>
      {/* Header bar */}
      <div className={cn(HEADER, "border-l-[#ff6314]")}>
        <PlatformIcon platform="lemmy" size={16} />
        <span className="type-body-sb-xs text-[#ff6314]">Lemmy</span>
        <span className="type-body-r-xs ml-auto text-muted">{community}</span>
      </div>

      {/* Post card */}
      <div className="px-4 py-3 space-y-2">
        <p className="text-sm font-semibold leading-snug text-[#222222]">
          {title || <span className="text-neutral-500">Post title (first line of text)</span>}
        </p>
        {images.length > 0 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={images[0].previewUrl} alt="" className="w-full rounded-lg object-cover max-h-55" />
        )}
        {body && (
          <p className="text-xs whitespace-pre-wrap wrap-break-word leading-relaxed text-[#6c757d]">
            {body.length > 300 ? body.slice(0, 300) + "…" : body}
          </p>
        )}
        <div className="flex items-center gap-3 pt-1">
          {[["▲", "Vote"], ["💬", "Comment"], ["🔗", "Share"]].map(([icon, label]) => (
            <span key={label} className="flex items-center gap-1 text-xs text-[#6c757d]">
              <span>{icon}</span><span>{label}</span>
            </span>
          ))}
        </div>
      </div>

      {commentText && (
        <div className="px-4 pb-3">
          <div className="rounded-xl p-2.5 bg-[#f8f9fa] border border-[#dee2e6]">
            <p className="text-xs font-semibold mb-1 text-[#ff6314]">First comment</p>
            <p className="text-xs whitespace-pre-wrap wrap-break-word text-[#6c757d]">{commentText}</p>
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
    <div className={cn(CARD, "shadow-xs")}>
      <div className={cn(HEADER, "border-l-[#5865F2]")}>
        <PlatformIcon platform="discord" size={16} />
        <span className="type-body-sb-xs text-[#5865F2]">Discord</span>
        <span className="type-body-r-xs ml-auto text-muted">{serverName}</span>
      </div>

      <div className="px-4 py-3 flex gap-3">
        {account.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={account.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0 mt-0.5" />
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 bg-[#5865F2] text-white">
            {initial}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-sm font-semibold text-[#0089c7]">Posthive Bot</span>
            <span className="text-[10px] text-[#5c5e66]">Today at {formatTime(new Date())}</span>
          </div>
          {text ? (
            <p className="text-sm whitespace-pre-wrap wrap-break-word leading-relaxed text-[#313338]">{text}</p>
          ) : (
            <p className="type-body-r-s italic text-neutral-500">Start writing your post for a preview…</p>
          )}
          {images.length > 0 && (
            <div className={`mt-2 rounded-lg overflow-hidden grid gap-0.5 max-w-100 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
              {images.slice(0, 4).map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={img.previewUrl} alt="" className={`w-full object-cover ${images.length === 1 ? "h-48" : "h-28"}`} />
              ))}
            </div>
          )}
          {video && (
            <div className="mt-2 rounded-lg overflow-hidden max-w-100">
              <video src={video.previewUrl} className="w-full rounded-lg max-h-50" controls={false} muted />
            </div>
          )}
          {commentText && (
            <div className="mt-3 pl-3 py-2 border-l-2 border-l-[#5865F2]">
              <span className="text-xs font-semibold text-[#0089c7]">Posthive Bot </span>
              <span className="text-xs text-[#313338]">{commentText}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TikTokPreview({ account, text, video }: { account: Account; text: string; video: UploadedImage | null }) {
  const initial = account.displayName[0]?.toUpperCase() ?? "?";
  return (
    <div className={cn(CARD, "shadow-xs")}>
      <div className={cn(HEADER, "border-l-[#ff004f]")}>
        <PlatformIcon platform="tiktok" size={16} />
        <span className="type-body-sb-xs text-[#ff004f]">TikTok</span>
        <span className="type-body-r-xs ml-auto text-muted">{account.displayName}</span>
      </div>

      {/* Full-width 9:16 canvas */}
      <div className="relative w-full overflow-hidden aspect-9/16 bg-black">
        {video ? (
          <video src={video.previewUrl} className="w-full h-full object-cover" muted playsInline loop autoPlay />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <svg className="w-10 h-10 mx-auto mb-2 opacity-20" fill="none" stroke="white" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <p className="type-body-r-xs text-neutral-500">Add a video</p>
            </div>
          </div>
        )}

        {/* Right side action buttons */}
        <div className="absolute right-3 bottom-20 flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            <span className="text-white text-[10px]">0</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
            </svg>
            <span className="text-white text-[10px]">0</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
            <span className="text-white text-[10px]">Share</span>
          </div>
        </div>

        {/* Bottom: avatar + username + caption */}
        <div className="absolute bottom-4 left-3 right-12">
          <div className="flex items-center gap-2 mb-1.5">
            {account.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={account.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover ring-1 ring-white/50" />
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ring-1 ring-white/50 bg-[#ff004f]">{initial}</div>
            )}
            <span className="text-sm font-semibold text-white drop-shadow-sm">@{account.displayName}</span>
          </div>
          {text ? (
            <p className="text-xs text-white/80 leading-relaxed line-clamp-3 drop-shadow-sm">{text}</p>
          ) : (
            <p className="type-body-r-xs italic text-neutral-500">Your caption here…</p>
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
  if (account.platform === "tiktok") {
    return <TikTokPreview account={account} text={text} video={video} />;
  }

  const color = PLATFORM_COLOR[account.platform] ?? "#6b7280";
  const initial = account.displayName[0]?.toUpperCase() ?? "?";
  const timeStr = formatTime(new Date());

  // Link card: only for Bluesky, only when no images/video
  const showLinkCard = account.platform === "bluesky" && images.length === 0 && !video;
  const og = useLinkCard(text, showLinkCard);

  const theme = GENERIC_THEME[account.platform] ?? GENERIC_THEME_DEFAULT;

  return (
    <div className={cn(CARD, "shadow-xs")}
      style={{ "--pc": color } as React.CSSProperties}>
      <div className={cn(HEADER, "border-l-(--pc)")}>
        <PlatformIcon platform={account.platform} size={16} />
        <span className="type-body-sb-xs capitalize text-(--pc)">{account.platform}</span>
        <span className="type-body-r-xs ml-auto text-muted">{account.displayName}</span>
      </div>

      <div className="p-4">
        <div className="flex gap-3">
          {account.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white bg-(--pc)">
              {initial}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className={cn("text-sm font-bold", theme.text)}>{account.displayName}</span>
              <span className={cn("text-xs", theme.sub)}>{timeStr}</span>
            </div>
            {text ? (
              <p className={cn("text-sm whitespace-pre-wrap wrap-break-word leading-relaxed", theme.text)}>{text}</p>
            ) : (
              <p className="type-body-r-s italic text-neutral-500">Start writing your post for a preview…</p>
            )}

            {/* Video preview */}
            {video && account.platform !== "instagram" && (
              <div className={cn("mt-2.5 rounded-xl overflow-hidden border", theme.border)}>
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

        <div className={cn("flex items-center gap-4 mt-3 pt-3 border-t", theme.border, theme.sub)}>
          <span className="text-xs">♡ 0</span>
          <span className="text-xs">↩ Reply</span>
          <span className="text-xs">↗ Share</span>
        </div>

        {commentText && (
          <div className={cn("mt-3 pt-3 flex gap-2.5 border-t", theme.border)}>
            {account.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={account.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white bg-(--pc)">
                {initial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <span className={cn("text-xs font-bold", theme.text)}>{account.displayName} </span>
              <span className={cn("text-xs", theme.sub)}>· first comment</span>
              <p className={cn("text-sm mt-0.5 whitespace-pre-wrap wrap-break-word", theme.sub)}>{commentText}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
