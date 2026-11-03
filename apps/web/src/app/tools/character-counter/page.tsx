"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PlatformIcon } from "../../../components/PlatformIcon";
import { PLATFORM_COLOR } from "../../../components/PlatformPreview";
import { MarketingNavBar } from "../../../components/MarketingNavBar";
import { LandingFooter } from "../../../components/LandingFooter";
import { cn } from "../../../lib/cn";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "https://posthive.co";

// Subset of most-searched platforms — ordered by popularity
const PLATFORMS: { id: string; name: string; limit: number }[] = [
  { id: "twitter",   name: "X (Twitter)",   limit: 280 },
  { id: "instagram", name: "Instagram",      limit: 2200 },
  { id: "linkedin",  name: "LinkedIn",       limit: 3000 },
  { id: "facebook",  name: "Facebook",       limit: 63206 },
  { id: "threads",   name: "Threads",        limit: 500 },
  { id: "bluesky",   name: "Bluesky",        limit: 300 },
  { id: "mastodon",  name: "Mastodon",       limit: 500 },
  { id: "tiktok",    name: "TikTok",         limit: 2200 },
  { id: "youtube",   name: "YouTube Desc.",  limit: 5000 },
  { id: "pinterest", name: "Pinterest",      limit: 500 },
  { id: "telegram",  name: "Telegram",       limit: 4096 },
  { id: "discord",   name: "Discord",        limit: 2000 },
];

function countGraphemes(text: string): number {
  try {
    return [...new Intl.Segmenter().segment(text)].length;
  } catch {
    return text.length;
  }
}

function PlatformRow({ id, name, limit, count }: { id: string; name: string; limit: number; count: number }) {
  const pct = Math.min((count / limit) * 100, 100);
  const over = count > limit;
  const warn = !over && pct >= 80;
  const remaining = limit - count;

  return (
    <div className="border-b border-border px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PlatformIcon platform={id} size={16} />
          <span className="type-body-m-s text-fg">{name}</span>
        </div>
        <span className={cn("type-body-sb-s tabular-nums", over ? "text-red-600" : warn ? "text-brand-800" : "text-fg")}>
          {over ? `−${Math.abs(remaining).toLocaleString()} over` : `${count.toLocaleString()} / ${limit.toLocaleString()}`}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-xs bg-neutral-100">
        <div
          className={cn(
            "h-full w-(--w) rounded-xs transition-[width,background-color] duration-150 ease-out",
            over ? "bg-red-500" : warn ? "bg-accent" : "bg-(--pc)",
          )}
          style={{ "--w": `${pct}%`, "--pc": PLATFORM_COLOR[id] ?? "var(--c-fg)" } as React.CSSProperties}
        />
      </div>
    </div>
  );
}

export default function CharacterCounterPage() {
  const [text, setText] = useState("");
  const count = useMemo(() => countGraphemes(text), [text]);
  const wordCount = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text]);

  return (
    <main className="min-h-screen bg-bg text-fg">
      <MarketingNavBar />

      <div className="mx-auto max-w-225 px-6 pt-10 pb-20">
        {/* Header */}
        <div className="mb-8">
          <p className="mb-2 type-body-sb-xs uppercase tracking-wider text-brand-800">
            Free Tool
          </p>
          <h1 className="mb-2.5 type-head-sb-5 text-fg sm:type-head-sb-3">
            Social Media Character Counter
          </h1>
          <p className="type-body-r-m text-muted">
            Paste or type your post. See character limits for every major platform instantly - no sign-up required.
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-2">
          {/* Left: textarea */}
          <div>
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type or paste your post here…"
                className="field min-h-65 resize-y bg-surface p-4 type-body-r-m"
                autoFocus
              />
            </div>
            {/* Stats strip */}
            <div className="mt-2.5 flex gap-5">
              <div className="text-center">
                <div className="type-head-sb-6 tabular-nums text-fg">{count.toLocaleString()}</div>
                <div className="type-body-r-xs uppercase tracking-wider text-muted">characters</div>
              </div>
              <div className="text-center">
                <div className="type-head-sb-6 tabular-nums text-fg">{wordCount.toLocaleString()}</div>
                <div className="type-body-r-xs uppercase tracking-wider text-muted">words</div>
              </div>
              <div className="text-center">
                <div className="type-head-sb-6 tabular-nums text-fg">{text.split(/\n/).length}</div>
                <div className="type-body-r-xs uppercase tracking-wider text-muted">lines</div>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-6 rounded-xl border border-brand-300 bg-brand-100 p-4.5">
              <p className="mb-1 type-body-sb-s text-fg">Schedule this post with Posthive</p>
              <p className="mb-3 type-body-r-s text-muted">
                Schedule to 14 platforms at once. Bluesky, Threads, Instagram, LinkedIn one composer.
              </p>
              <Link href="/register" className="btn-primary">
                Start free trial →
              </Link>
            </div>
          </div>

          {/* Right: platform list */}
          <div className="card overflow-hidden rounded-xl">
            <div className="border-b border-border px-4 py-3">
              <span className="section-label">
                Platform Limits
              </span>
            </div>
            {PLATFORMS.map((p) => (
              <PlatformRow key={p.id} {...p} count={count} />
            ))}
          </div>
        </div>

        {/* SEO content */}
        <div className="mt-16 border-t border-border pt-12">
          <h2 className="mb-6 type-head-sb-6 text-fg">Character limits for every major platform (2026)</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
            {PLATFORMS.map((p) => (
              <div key={p.id} className="card flex items-center justify-between gap-2 rounded-xl px-3.5 py-3">
                <div className="flex items-center gap-2">
                  <PlatformIcon platform={p.id} size={14} />
                  <span className="type-body-r-s text-muted">{p.name}</span>
                </div>
                <span className="type-body-sb-s tabular-nums text-fg">{p.limit.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <p className="mt-5 type-body-r-s text-muted">
            Character limits vary by platform and post type. Twitter/X limits to 280 characters for standard accounts (25,000 for verified).
            Instagram captions allow up to 2,200 characters but only the first 125 show before truncation.
            LinkedIn posts support up to 3,000 characters. Bluesky and Mastodon share a 300–500 character default.
            Pinterest descriptions cap at 500 characters.
          </p>
        </div>
      </div>
      <LandingFooter />
    </main>
  );
}
