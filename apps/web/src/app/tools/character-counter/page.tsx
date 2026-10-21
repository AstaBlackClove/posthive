"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PlatformIcon } from "../../../components/PlatformIcon";
import { MarketingNavBar } from "../../../components/MarketingNavBar";
import { LandingFooter } from "../../../components/LandingFooter";

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
  const barColor = over ? "#ef4444" : warn ? "#f59e0b" : "#5b63d3";
  const textColor = over ? "#ef4444" : warn ? "#f59e0b" : "#ededed";
  const remaining = limit - count;

  return (
    <div style={{ padding: "12px 16px", borderBottom: "1px solid #1e1e1e" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <PlatformIcon platform={id} size={16} />
          <span style={{ fontSize: 14, color: "#ededed", fontWeight: 500 }}>{name}</span>
        </div>
        <span style={{ fontSize: 13, color: textColor, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {over ? `−${Math.abs(remaining).toLocaleString()} over` : `${count.toLocaleString()} / ${limit.toLocaleString()}`}
        </span>
      </div>
      <div style={{ height: 4, backgroundColor: "#1e1e1e", borderRadius: 2, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            backgroundColor: barColor,
            borderRadius: 2,
            transition: "width 0.15s ease, background-color 0.15s ease",
          }}
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
    <main style={{ minHeight: "100vh", backgroundColor: "#0a0a0a", color: "#ededed" }}>
      <MarketingNavBar />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "#5b63d3", textTransform: "uppercase", marginBottom: 8 }}>
            Free Tool
          </p>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "#ededed", margin: "0 0 10px", lineHeight: 1.2 }}>
            Social Media Character Counter
          </h1>
          <p style={{ fontSize: 16, color: "#888", margin: 0, lineHeight: 1.6 }}>
            Paste or type your post. See character limits for every major platform instantly - no sign-up required.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
          {/* Left: textarea */}
          <div>
            <div style={{ position: "relative" }}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type or paste your post here…"
                style={{
                  width: "100%",
                  minHeight: 260,
                  backgroundColor: "#111",
                  border: "1px solid #2a2a2a",
                  borderRadius: 12,
                  padding: 16,
                  color: "#ededed",
                  fontSize: 15,
                  lineHeight: 1.6,
                  resize: "vertical",
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
                autoFocus
              />
            </div>
            {/* Stats strip */}
            <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#ededed", fontVariantNumeric: "tabular-nums" }}>{count.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" }}>characters</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#ededed", fontVariantNumeric: "tabular-nums" }}>{wordCount.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" }}>words</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#ededed", fontVariantNumeric: "tabular-nums" }}>{text.split(/\n/).length}</div>
                <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" }}>lines</div>
              </div>
            </div>

            {/* CTA */}
            <div style={{ marginTop: 24, backgroundColor: "#0d0f1f", border: "1px solid #3a3a5a", borderRadius: 12, padding: 18 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#ededed", margin: "0 0 4px" }}>Schedule this post with Posthive</p>
              <p style={{ fontSize: 13, color: "#888", margin: "0 0 12px", lineHeight: 1.5 }}>
                Schedule to 14 platforms at once. Bluesky, Threads, Instagram, LinkedIn one composer.
              </p>
              <Link
                href="/register"
                style={{ fontSize: 13, fontWeight: 600, color: "#0a0a0a", backgroundColor: "#ffffff", padding: "8px 16px", borderRadius: 8, textDecoration: "none", display: "inline-block" }}
              >
                Start free trial →
              </Link>
            </div>
          </div>

          {/* Right: platform list */}
          <div style={{ backgroundColor: "#111", border: "1px solid #1e1e1e", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #1e1e1e" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Platform Limits
              </span>
            </div>
            {PLATFORMS.map((p) => (
              <PlatformRow key={p.id} {...p} count={count} />
            ))}
          </div>
        </div>

        {/* SEO content */}
        <div style={{ marginTop: 64, borderTop: "1px solid #1e1e1e", paddingTop: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#ededed", marginBottom: 24 }}>Character limits for every major platform (2026)</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {PLATFORMS.map((p) => (
              <div key={p.id} style={{ backgroundColor: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <PlatformIcon platform={p.id} size={14} />
                  <span style={{ fontSize: 13, color: "#888" }}>{p.name}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#ededed", fontVariantNumeric: "tabular-nums" }}>{p.limit.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 20, fontSize: 13, color: "#555", lineHeight: 1.7 }}>
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
