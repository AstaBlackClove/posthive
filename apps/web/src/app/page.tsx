"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { NavBar } from "../components/LandingNav";
import { PlatformIcon } from "../components/PlatformIcon";
import { LandingFooter } from "@/components/LandingFooter";
import { cn } from "../lib/cn";

const GITHUB_URL = "https://github.com/AstaBlackClove/posthive";

const PLATFORMS_GRID = [
  {
    name: "Bluesky",
    domain: "bsky.app",
    meta: "300 chars · AT Protocol",
    accent: "#0085ff",
    platform: "bluesky",
  },
  {
    name: "Threads",
    domain: "threads.net",
    meta: "500 chars · Meta OAuth",
    accent: "#000000",
    platform: "threads",
  },
  {
    name: "Instagram",
    domain: "instagram.com",
    meta: "Posts, Reels & Stories",
    accent: "#e1306c",
    platform: "instagram",
  },
  {
    name: "TikTok",
    domain: "tiktok.com",
    meta: "Videos · Content Posting API",
    accent: "#010101",
    platform: "tiktok",
  },
  {
    name: "Facebook Pages",
    domain: "facebook.com",
    meta: "Pages · Graph API",
    accent: "#1877f2",
    platform: "facebook",
  },
  {
    name: "LinkedIn",
    domain: "linkedin.com",
    meta: "3,000 chars · Professional",
    accent: "#0a66c2",
    platform: "linkedin",
  },
  {
    name: "X (Twitter)",
    domain: "x.com",
    meta: "100 tweets/mo · Pro & Team",
    accent: "#0f1419",
    platform: "twitter",
  },
  {
    name: "Mastodon",
    domain: "mastodon.social",
    meta: "500 chars · Federated",
    accent: "#6364ff",
    platform: "mastodon",
  },
  {
    name: "Pixelfed",
    domain: "pixelfed.social",
    meta: "2,001 chars · Photo-first · Fediverse",
    accent: "#ff8c00",
    platform: "pixelfed",
  },
  {
    name: "YouTube",
    domain: "youtube.com",
    meta: "Shorts & video · Google OAuth",
    accent: "#ff0000",
    platform: "youtube",
  },
  {
    name: "Pinterest",
    domain: "pinterest.com",
    meta: "Pins · image required",
    accent: "#e60023",
    platform: "pinterest",
  },
  {
    name: "Telegram",
    domain: "telegram.org",
    meta: "4,096 chars · Bot API",
    accent: "#229ED9",
    platform: "telegram",
  },
  {
    name: "Nostr",
    domain: "nostr.com",
    meta: "Keypair · decentralized · no approval",
    accent: "#8B5CF6",
    platform: "nostr",
    iconUrl: "/Nostr.svg",
  },
  {
    name: "Discord",
    domain: "discord.com",
    meta: "2,000 chars · Bot + webhook",
    accent: "#5865F2",
    platform: "discord",
  },
  {
    name: "Tumblr",
    domain: "tumblr.com",
    meta: "4,096 chars · OAuth 1.0a",
    accent: "#35465c",
    platform: "tumblr",
  },
  {
    name: "Lemmy",
    domain: "join-lemmy.org",
    meta: "Federated · username + password",
    accent: "#ff6314",
    platform: "lemmy",
  },
];

// Hero card cycling data — one array per card slot
const HERO_CARD_SCHEDULED = [
  {
    platform: "bluesky",
    name: "Bluesky",
    text: "Write once, post to multi platforms. This is the tool I have been waiting for.",
    pill: "Fires in 2h",
    pillBg: "var(--color-brand-100)",
    pillColor: "var(--color-brand-800)",
    time: "9:00 AM",
  },
  {
    platform: "mastodon",
    name: "Mastodon",
    text: "Finally a scheduler that supports the fediverse. Set it and forget it.",
    pill: "Fires in 45m",
    pillBg: "var(--color-brand-100)",
    pillColor: "var(--color-brand-800)",
    time: "10:15 AM",
  },
  {
    platform: "twitter",
    name: "X (Twitter)",
    text: "Scheduled 30 tweets for the whole week in under 10 minutes.",
    pill: "Tomorrow 8AM",
    pillBg: "var(--color-blue-50)",
    pillColor: "var(--color-blue-700)",
    time: "8:00 AM",
  },
  {
    platform: "pinterest",
    name: "Pinterest",
    text: "Pinned my product catalogue to 6 boards on autopilot every morning.",
    pill: "Fires in 1h",
    pillBg: "var(--color-brand-100)",
    pillColor: "var(--color-brand-800)",
    time: "7:30 AM",
  },
];

const HERO_CARD_FIRST_COMMENT = [
  {
    platform: "threads",
    name: "Threads",
    text: "First comment fires automatically right after the post goes live.",
    pill: "Sent",
    pillBg: "var(--color-green-100)",
    pillColor: "var(--color-green-800)",
    time: "Just now",
  },
  {
    platform: "linkedin",
    name: "LinkedIn",
    text: "Added my link in the first comment automatically. Algorithm loves it.",
    pill: "Sent",
    pillBg: "var(--color-green-100)",
    pillColor: "var(--color-green-800)",
    time: "2m ago",
  },
  {
    platform: "instagram",
    name: "Instagram",
    text: "Drop hashtags in the first comment without cluttering the caption.",
    pill: "Sent",
    pillBg: "var(--color-green-100)",
    pillColor: "var(--color-green-800)",
    time: "Just now",
  },
  {
    platform: "facebook",
    name: "Facebook",
    text: "First comment auto-posted with the full article link seconds after.",
    pill: "Sent",
    pillBg: "var(--color-green-100)",
    pillColor: "var(--color-green-800)",
    time: "1m ago",
  },
];

const HERO_CARD_POSTED = [
  {
    platform: "linkedin",
    name: "LinkedIn",
    text: "Bulk scheduled 30 days of content in one afternoon with CSV upload.",
    pill: "Live",
    pillBg: "var(--color-green-100)",
    pillColor: "var(--color-green-800)",
    time: "8:47 AM",
  },
  {
    platform: "youtube",
    name: "YouTube Short",
    text: "Short went live at peak hour. Views are already rolling in.",
    pill: "Live",
    pillBg: "var(--color-green-100)",
    pillColor: "var(--color-green-800)",
    time: "12:00 PM",
  },
  {
    platform: "facebook",
    name: "Facebook Page",
    text: "Posted to 3 Facebook Pages at once from a single compose window.",
    pill: "Live",
    pillBg: "var(--color-green-100)",
    pillColor: "var(--color-green-800)",
    time: "9:00 AM",
  },
  {
    platform: "nostr",
    name: "Nostr",
    text: "Decentralized post published. No algorithm, no gatekeeping.",
    pill: "Live",
    pillBg: "var(--color-green-100)",
    pillColor: "var(--color-green-800)",
    time: "11:22 AM",
  },
  {
    platform: "discord",
    name: "Discord",
    text: "Announcement scheduled to the community server. Done in seconds.",
    pill: "Live",
    pillBg: "var(--color-green-100)",
    pillColor: "var(--color-green-800)",
    time: "3m ago",
  },
  {
    platform: "tumblr",
    name: "Tumblr",
    text: "Blog post queued and published to Tumblr right on schedule.",
    pill: "Live",
    pillBg: "var(--color-green-100)",
    pillColor: "var(--color-green-800)",
    time: "1m ago",
  },
];

const HERO_CARD_RESCHEDULED = [
  {
    platform: "instagram",
    name: "Instagram Reel",
    text: "Dragged to a better time slot on the calendar. Done in 2 seconds.",
    pill: "Tomorrow 9AM",
    pillBg: "var(--color-blue-50)",
    pillColor: "var(--color-blue-700)",
    time: "",
  },
  {
    platform: "telegram",
    name: "Telegram",
    text: "Moved the channel broadcast to Friday peak hours in one tap.",
    pill: "Fri 6:00 PM",
    pillBg: "var(--color-blue-50)",
    pillColor: "var(--color-blue-700)",
    time: "",
  },
  {
    platform: "bluesky",
    name: "Bluesky",
    text: "Rescheduled after spotting a typo. No stress, just drag and drop.",
    pill: "Mon 8:00 AM",
    pillBg: "var(--color-blue-50)",
    pillColor: "var(--color-blue-700)",
    time: "",
  },
  {
    platform: "twitter",
    name: "X (Twitter)",
    text: "Shifted the thread to avoid the weekend lull. Better reach guaranteed.",
    pill: "Next Mon",
    pillBg: "var(--color-blue-50)",
    pillColor: "var(--color-blue-700)",
    time: "",
  },
];

const PLANS = [
  {
    id: "creator",
    name: "Creator",
    desc: "For solo creators finding their rhythm.",
    inr: "₹550",
    usd: "$9",
    features: [
      { text: "5 connected accounts", included: true },
      { text: "400 posts / month", included: true },
      { text: "All core platforms", included: true },
      { text: "Bulk CSV scheduling", included: true },
      { text: "Post templates", included: true },
      { text: "Repeat post scheduling", included: true },
      { text: "Calendar & drag-reschedule", included: true },
      { text: "First comment automation", included: true },
      { text: "1 team member", included: true },
      { text: "Reels & Stories", included: true },
      { text: "Per-platform overrides", included: true },
      { text: "Content Library (1,000 items)", included: true },
      { text: "X/Twitter posting", included: false },
      { text: "API access & MCP", included: false },
      { text: "Webhook outbound", included: false },
    ],
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    desc: "For creators who are serious about growth.",
    inr: "₹1,700",
    usd: "$29",
    features: [
      { text: "15 connected accounts", included: true },
      { text: "Unlimited posts", included: true },
      { text: "All core platforms", included: true },
      { text: "Bulk CSV scheduling", included: true },
      { text: "Post templates", included: true },
      { text: "Repeat post scheduling", included: true },
      { text: "Calendar & drag-reschedule", included: true },
      { text: "First comment automation", included: true },
      { text: "2 team members", included: true },
      { text: "Reels & Stories", included: true },
      { text: "Per-platform overrides", included: true },
      { text: "Content Library (20,000 items)", included: true },
      { text: "X/Twitter posting (100/mo, no links)*", included: true },
      { text: "API access & MCP", included: true },
      { text: "Webhook outbound", included: true },
    ],
    popular: true,
  },
  {
    id: "team",
    name: "Team",
    desc: "For agencies and fast-moving teams.",
    inr: "₹2,600",
    usd: "$49",
    features: [
      { text: "50 connected accounts", included: true },
      { text: "Unlimited posts", included: true },
      { text: "All core platforms", included: true },
      { text: "Bulk CSV scheduling", included: true },
      { text: "Post templates", included: true },
      { text: "Repeat post scheduling", included: true },
      { text: "Calendar & drag-reschedule", included: true },
      { text: "First comment automation", included: true },
      { text: "4 team members", included: true },
      { text: "Reels & Stories", included: true },
      { text: "Per-platform overrides", included: true },
      { text: "Content Library (100,000 items)", included: true },
      { text: "X/Twitter posting (100/mo, no links)*", included: true },
      { text: "API access & MCP", included: true },
      { text: "Webhook outbound", included: true },
    ],
    popular: false,
  },
];

function useIsIndia(): [boolean, (v: boolean) => void] {
  const [india, setIndia] = useState(false);
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setIndia(tz === "Asia/Calcutta" || tz === "Asia/Kolkata");
    } catch {
      setIndia(false);
    }
  }, []);
  return [india, setIndia];
}

function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started.current) return;
      started.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(ease * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      io.disconnect();
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [target, duration]);
  return { val, ref };
}

function usePublicStats() {
  const [stats, setStats] = useState<{ accounts: number; published: number } | null>(null);
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/stats/public`)
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => { /* silently fail — bar shows static fallbacks */ });
  }, []);
  return stats;
}

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".scroll-hidden");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add("scroll-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function StatSkeleton({ width, height }: { width: number; height: number }) {
  return (
    <span
      className="inline-block h-(--h) w-(--w) animate-pulse rounded-md bg-black/10 align-middle"
      style={{ "--w": `${width}px`, "--h": `${height}px` } as React.CSSProperties}
    />
  );
}

function LiveStat({ value, label, skeletonWidth = 120, skeletonHeight = 56 }: { value: number | null; label: string; fallback?: string; skeletonWidth?: number; skeletonHeight?: number }) {
  const { val, ref } = useCountUp(value ?? 0);
  if (value === null) return <StatSkeleton width={skeletonWidth} height={skeletonHeight} />;
  const display = val > 0 ? val.toLocaleString() : value.toLocaleString();
  return (
    <span ref={ref}>
      {display}{label}
    </span>
  );
}

export default function RootPage() {
  const { user, loading: authLoading } = useAuth();
  const [isIndia, setIsIndia] = useIsIndia();
  useScrollReveal();
  const ctaHref = user ? "/dashboard" : "/register";
  const ctaLabel = user ? "Go to scheduler" : "Get started free";
  const navCtaLabel = user ? "Go to scheduler" : "Get started free";
  const publicStats = usePublicStats();

  const [cardIdx, setCardIdx] = useState([0, 0, 0, 0]);
  const [fade, setFade] = useState([true, true, true, true]);

  useEffect(() => {
    const SLOTS = [
      HERO_CARD_SCHEDULED,
      HERO_CARD_FIRST_COMMENT,
      HERO_CARD_POSTED,
      HERO_CARD_RESCHEDULED,
    ];
    const OFFSETS = [0, 900, 1800, 2700]; // stagger per card
    const timers: ReturnType<typeof setTimeout>[] = [];

    SLOTS.forEach((slot, i) => {
      const cycle = () => {
        setFade((f) => {
          const n = [...f];
          n[i] = false;
          return n;
        });
        timers.push(
          setTimeout(() => {
            setCardIdx((c) => {
              const n = [...c];
              n[i] = (n[i] + 1) % slot.length;
              return n;
            });
            setFade((f) => {
              const n = [...f];
              n[i] = true;
              return n;
            });
          }, 350),
        );
      };
      timers.push(
        setTimeout(() => {
          cycle();
          const interval = setInterval(cycle, 3600);
          timers.push(interval as unknown as ReturnType<typeof setTimeout>);
        }, OFFSETS[i] + 3600),
      );
    });

    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <>
      <style>{`
        html { scroll-behavior: smooth; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatA {
          from { transform: translateY(0px); }
          to   { transform: translateY(-12px); }
        }
        @keyframes floatB {
          from { transform: translateY(-12px); }
          to   { transform: translateY(0px); }
        }
        @keyframes ph-blink { 0%,100%{opacity:1} 50%{opacity:0} }

        .hero-float-a { animation: floatA 3.4s ease-in-out infinite alternate; }
        .hero-float-b { animation: floatB 3.4s ease-in-out infinite alternate; }
        .ph-caret { animation: ph-blink .75s step-end infinite; }

        .anim-2 { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) .1s both; }
        .anim-3 { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) .2s both; }
        .anim-4 { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) .3s both; }
        .anim-5 { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) .4s both; }

        .scroll-hidden { opacity: 0; transform: translateY(28px); transition: opacity .65s cubic-bezier(.22,1,.36,1), transform .65s cubic-bezier(.22,1,.36,1); }
        .scroll-hidden.scroll-visible { opacity: 1; transform: translateY(0); }
        .scroll-hidden.d1 { transition-delay: .05s; }
        .scroll-hidden.d2 { transition-delay: .15s; }
        .scroll-hidden.d3 { transition-delay: .25s; }
        .scroll-hidden.d4 { transition-delay: .35s; }
        .scroll-hidden.d5 { transition-delay: .45s; }
      `}</style>

      <NavBar
        user={!!user}
        ctaHref={ctaHref}
        navCtaLabel={navCtaLabel}
        loading={authLoading}
      />

      <div className="overflow-x-clip pt-16 antialiased selection:bg-brand-200">
        {/* ── HERO ── */}
        <section className="relative overflow-hidden px-6 pt-20 pb-16 md:pt-28 md:pb-20">
          <div className="relative mx-auto flex max-w-400 items-center gap-6 2xl:gap-10">
            {/* Left floating cards */}
            <div className="hidden w-55 shrink-0 flex-col items-center gap-5 xl:flex 2xl:w-70">
              <div className="hero-float-a self-start">
                <div className="mb-1.5 flex items-center gap-1 type-body-sb-xs text-muted">
                  <svg
                    width="10"
                    height="12"
                    viewBox="0 0 10 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <path d="M5 1 C2 1 1 4 2 7 L2 11 M2 11 L4 9 M2 11 L0 9" />
                  </svg>
                  Scheduled
                </div>
                <div className="w-50 -rotate-3 rounded-2xl border-2 border-dashed border-neutral-300 bg-surface px-4.5 py-4 shadow-lg 2xl:w-55">
                  <div
                    className={cn("transition-opacity duration-350", !fade[0] && "opacity-0")}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <PlatformIcon
                        platform={HERO_CARD_SCHEDULED[cardIdx[0]].platform}
                        size={16}
                      />
                      <span className="type-body-sb-xs text-fg">{HERO_CARD_SCHEDULED[cardIdx[0]].name}</span>
                    </div>
                    <p className="mb-3 type-body-r-xs text-muted">
                      {HERO_CARD_SCHEDULED[cardIdx[0]].text}
                    </p>
                    <div className="flex items-center justify-between">
                      <span
                        className="rounded-full bg-(--pill-bg) px-2 py-0.5 type-body-sb-xxs text-(--pill-fg)"
                        style={
                          {
                            "--pill-bg": HERO_CARD_SCHEDULED[cardIdx[0]].pillBg,
                            "--pill-fg": HERO_CARD_SCHEDULED[cardIdx[0]].pillColor,
                          } as React.CSSProperties
                        }
                      >
                        {HERO_CARD_SCHEDULED[cardIdx[0]].pill}
                      </span>
                      {HERO_CARD_SCHEDULED[cardIdx[0]].time && (
                        <span className="type-body-r-xxs text-muted">
                          {HERO_CARD_SCHEDULED[cardIdx[0]].time}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="hero-float-b self-end">
                <div className="mb-1.5 flex items-center gap-1 type-body-sb-xs text-muted">
                  <svg
                    width="10"
                    height="12"
                    viewBox="0 0 10 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <path d="M5 1 C2 1 1 4 2 7 L2 11 M2 11 L4 9 M2 11 L0 9" />
                  </svg>
                  First comment
                </div>
                <div className="w-50 rotate-2 rounded-2xl border-2 border-dashed border-neutral-300 bg-surface px-4.5 py-4 shadow-lg 2xl:w-55">
                  <div
                    className={cn("transition-opacity duration-350", !fade[1] && "opacity-0")}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <PlatformIcon
                        platform={HERO_CARD_FIRST_COMMENT[cardIdx[1]].platform}
                        size={16}
                      />
                      <span className="type-body-sb-xs text-fg">{HERO_CARD_FIRST_COMMENT[cardIdx[1]].name}</span>
                    </div>
                    <p className="mb-3 type-body-r-xs text-muted">
                      {HERO_CARD_FIRST_COMMENT[cardIdx[1]].text}
                    </p>
                    <div className="flex items-center justify-between">
                      <span
                        className="rounded-full bg-(--pill-bg) px-2 py-0.5 type-body-sb-xxs text-(--pill-fg)"
                        style={
                          {
                            "--pill-bg": HERO_CARD_FIRST_COMMENT[cardIdx[1]].pillBg,
                            "--pill-fg": HERO_CARD_FIRST_COMMENT[cardIdx[1]].pillColor,
                          } as React.CSSProperties
                        }
                      >
                        {HERO_CARD_FIRST_COMMENT[cardIdx[1]].pill}
                      </span>
                      {HERO_CARD_FIRST_COMMENT[cardIdx[1]].time && (
                        <span className="type-body-r-xxs text-muted">
                          {HERO_CARD_FIRST_COMMENT[cardIdx[1]].time}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Center — untouched */}
            <div className="min-w-0 flex-1 text-center">
              <h1 className="anim-2 mb-6 type-display-m-6 tracking-tight text-fg md:type-display-m-5 2xl:type-display-m-3">
                <span className="mb-3.5 block">
                  Automate your social media
                </span>
                <span>
                  with{" "}
                  <span className="inline-block -rotate-2 rounded-md bg-accent px-4 pt-0.5 pb-1 text-accent-fg">
                    AI agents.
                  </span>
                </span>
              </h1>

              <p className="anim-3 mx-auto mb-10 max-w-160 type-body-r-l text-muted">
                Plan, create, review, and schedule posts across every major
                social network. Connect Claude, Cursor, Codex, ChatGPT or any
                MCP-compatible AI agent to automate your social media workflow.
              </p>

              <div className="anim-4 mb-5 flex flex-col items-stretch justify-center gap-3.5 sm:flex-row sm:flex-wrap sm:items-center">
                {authLoading ? (
                  <span className="inline-block h-12 w-42 animate-pulse self-center rounded-xl bg-neutral-100" />
                ) : (
                  <Link href={ctaHref} className="btn-primary px-6 py-3 type-body-sb-m">
                    {ctaLabel}
                  </Link>
                )}
                <Link href="/docs" className="btn-secondary px-6 py-3 type-body-sb-m">
                  View docs
                </Link>
              </div>

              {!user && (
                <p className="anim-5 mb-13 type-body-r-s text-muted">
                  14-day free trial · no credit card · cancel anytime
                </p>
              )}

              <div
                className={cn(
                  "anim-5 flex flex-wrap items-center justify-center gap-3 sm:gap-4.5",
                  user && "mt-13",
                )}
              >
                <span className="type-body-sb-xs tracking-widest text-muted">
                  PUBLISH TO
                </span>
                {PLATFORMS_GRID.map((p) => (
                  <span
                    key={p.platform}
                    className="inline-flex items-center"
                  >
                    <span className="flex size-7.5 items-center justify-center rounded-lg border border-border bg-surface">
                      <PlatformIcon platform={p.platform} size={17} />
                    </span>
                  </span>
                ))}
              </div>
            </div>

            {/* Right floating cards */}
            <div className="hidden w-55 shrink-0 flex-col items-center gap-5 xl:flex 2xl:w-70">
              <div className="hero-float-b self-start">
                <div className="mb-1.5 flex items-center gap-1 type-body-sb-xs text-muted">
                  <svg
                    width="10"
                    height="12"
                    viewBox="0 0 10 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <path d="M5 1 C2 1 1 4 2 7 L2 11 M2 11 L4 9 M2 11 L0 9" />
                  </svg>
                  Posted
                </div>
                <div className="w-50 rotate-3 rounded-2xl border-2 border-dashed border-neutral-300 bg-surface px-4.5 py-4 shadow-lg 2xl:w-55">
                  <div
                    className={cn("transition-opacity duration-350", !fade[2] && "opacity-0")}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <PlatformIcon
                        platform={HERO_CARD_POSTED[cardIdx[2]].platform}
                        size={16}
                      />
                      <span className="type-body-sb-xs text-fg">{HERO_CARD_POSTED[cardIdx[2]].name}</span>
                    </div>
                    <p className="mb-3 type-body-r-xs text-muted">
                      {HERO_CARD_POSTED[cardIdx[2]].text}
                    </p>
                    <div className="flex items-center justify-between">
                      <span
                        className="rounded-full bg-(--pill-bg) px-2 py-0.5 type-body-sb-xxs text-(--pill-fg)"
                        style={
                          {
                            "--pill-bg": HERO_CARD_POSTED[cardIdx[2]].pillBg,
                            "--pill-fg": HERO_CARD_POSTED[cardIdx[2]].pillColor,
                          } as React.CSSProperties
                        }
                      >
                        {HERO_CARD_POSTED[cardIdx[2]].pill}
                      </span>
                      {HERO_CARD_POSTED[cardIdx[2]].time && (
                        <span className="type-body-r-xxs text-muted">
                          {HERO_CARD_POSTED[cardIdx[2]].time}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="hero-float-a self-end">
                <div className="mb-1.5 flex items-center gap-1 type-body-sb-xs text-muted">
                  <svg
                    width="10"
                    height="12"
                    viewBox="0 0 10 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <path d="M5 1 C2 1 1 4 2 7 L2 11 M2 11 L4 9 M2 11 L0 9" />
                  </svg>
                  Rescheduled
                </div>
                <div className="w-50 -rotate-2 rounded-2xl border-2 border-dashed border-neutral-300 bg-surface px-4.5 py-4 shadow-lg 2xl:w-55">
                  <div
                    className={cn("transition-opacity duration-350", !fade[3] && "opacity-0")}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <PlatformIcon
                        platform={HERO_CARD_RESCHEDULED[cardIdx[3]].platform}
                        size={16}
                      />
                      <span className="type-body-sb-xs text-fg">{HERO_CARD_RESCHEDULED[cardIdx[3]].name}</span>
                    </div>
                    <p className="mb-3 type-body-r-xs text-muted">
                      {HERO_CARD_RESCHEDULED[cardIdx[3]].text}
                    </p>
                    <div className="flex items-center justify-between">
                      <span
                        className="rounded-full bg-(--pill-bg) px-2 py-0.5 type-body-sb-xxs text-(--pill-fg)"
                        style={
                          {
                            "--pill-bg": HERO_CARD_RESCHEDULED[cardIdx[3]].pillBg,
                            "--pill-fg": HERO_CARD_RESCHEDULED[cardIdx[3]].pillColor,
                          } as React.CSSProperties
                        }
                      >
                        {HERO_CARD_RESCHEDULED[cardIdx[3]].pill}
                      </span>
                      {HERO_CARD_RESCHEDULED[cardIdx[3]].time && (
                        <span className="type-body-r-xxs text-muted">
                          {HERO_CARD_RESCHEDULED[cardIdx[3]].time}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* product screenshot */}
          <div className="mx-auto mt-16 max-w-280">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
              <div className="flex h-9.5 items-center gap-2 border-b border-border bg-surface px-4">
                <span className="size-3 rounded-full bg-neutral-200" />
                <span className="size-3 rounded-full bg-neutral-200" />
                <span className="size-3 rounded-full bg-neutral-200" />
              </div>
              <Image
                src="/app-screenshot.png"
                alt="Posthive composer — schedule posts across all platforms"
                width={1120}
                height={630}
                className="block h-auto w-full"
                priority
              />
            </div>
          </div>
        </section>

        {/* ── STATS TILES ── */}
        <section className="border-t border-border bg-bg">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-5 py-14 md:grid-cols-3 md:px-12">
            {/* Posts published — neutral */}
            <div className="card flex min-h-45 flex-col justify-end px-7 py-8">
              <div className="type-display-m-4 tracking-tight text-fg">
                <LiveStat value={publicStats?.published ?? null} label="" skeletonWidth={100} skeletonHeight={52} />
              </div>
              <p className="mt-2.5 type-body-sb-xs uppercase tracking-wider text-muted">Posts published</p>
            </div>

            {/* Accounts connected — accent */}
            <div className="flex min-h-45 flex-col justify-end rounded-2xl border border-accent bg-accent px-7 py-8 text-accent-fg">
              <div className="type-display-m-4 tracking-tight">
                <LiveStat value={publicStats?.accounts ?? null} label="" skeletonWidth={80} skeletonHeight={52} />
              </div>
              <p className="mt-2.5 type-body-sb-xs uppercase tracking-wider text-neutral-800">Accounts connected</p>
            </div>

            {/* Platforms supported — green */}
            <div className="flex min-h-45 flex-col justify-between rounded-2xl border border-green-200 bg-green-100 px-7 py-8">
              <div>
                <div className="mb-2.5 type-display-m-4 tracking-tight text-green-700">14+</div>
                <p className="mb-3.5 type-body-sb-xs uppercase tracking-wider text-green-800">Platforms supported</p>
                <div className="flex flex-nowrap gap-1 overflow-hidden">
                  {["bluesky","threads","instagram","linkedin","twitter","youtube","tiktok","facebook","mastodon","pinterest","telegram","discord","tumblr","nostr"].map(p => (
                    <PlatformIcon key={p} platform={p} size={14} />
                  ))}
                </div>
              </div>
              <a
                href="https://github.com/punkpeye/awesome-mcp-servers"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3.5 inline-flex items-center gap-1.5 self-start rounded-full border border-green-200 bg-green-50 px-3 py-1 type-body-r-xs text-green-800"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="text-brand-700"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                Featured in awesome-mcp-servers
              </a>
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section
          id="features"
          className="mx-auto max-w-6xl px-5 py-16 md:px-12 md:py-24"
        >
          <div className="mb-15 text-center">
            <span className="type-body-sb-xs uppercase tracking-wider text-brand-800">FEATURES</span>
            <h2 className="mt-4 mb-3.5 type-head-sb-3 tracking-tight text-fg md:type-head-sb-1">
              Everything you need to post consistently
            </h2>
            <p className="mx-auto max-w-140 type-body-r-l text-muted">
              A complete scheduling workflow built for creators and teams,
              without the manual grind.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <ChatIcon />,
                title: "First comment automation",
                href: "/features/first-comment",
                body: "Schedule a reply that fires the second your post goes live on Bluesky, Threads, Mastodon, and LinkedIn. Other tools do this only on Instagram. We do it everywhere.",
              },
              {
                icon: <LayersIcon />,
                title: "Multi-platform posting",
                href: "/features/multi-platform-posting",
                body: "Draft once and ship to all nine networks in a single click.",
              },
              {
                icon: <PlayIcon />,
                title: "Reels & Stories scheduling",
                href: "/features/instagram-reels-scheduler",
                body: "Full Instagram media support plus YouTube Shorts with native previews.",
              },
              {
                icon: <CalGridIcon />,
                title: "Drag-to-reschedule calendar",
                href: "/features/drag-to-reschedule",
                body: "See your whole week at a glance. Drag any post to a new slot in seconds.",
              },
              {
                icon: <PenIcon />,
                title: "Per-platform text overrides",
                href: "/features/per-platform-overrides",
                body: "Tweak copy and media per network without leaving the composer.",
              },
              {
                icon: <ServerIcon />,
                title: "Reliable scheduling",
                href: "/features/multi-platform-posting",
                body: "Posts fire at the exact second. BullMQ-backed queue with automatic retries.",
              },
              {
                icon: <CsvIcon />,
                title: "Bulk CSV scheduling",
                href: "/features/bulk-csv-scheduling",
                body: "Upload a CSV and schedule hundreds of posts at once. Exclude platforms per row with !platform syntax.",
              },
              {
                icon: <McpIcon />,
                title: "Give your agents hands",
                href: "/docs#mcp-overview",
                body: "Drive Posthive from Claude Code or Cursor via MCP. Your agent drafts and schedules nothing publishes without your approval.",
              },
              {
                icon: <RepeatIcon />,
                title: "Repeat post scheduling",
                href: "/docs#repeat-posts",
                body: "Set a post to repeat daily, weekly, or monthly. Each occurrence auto-schedules the next — stop anytime by deleting the upcoming post.",
              },
              {
                icon: <SparklesIcon />,
                title: "AI caption assist",
                href: "/features/ai-caption-assist",
                body: "Fix grammar, make it concise, expand, rephrase, or polish your caption in one click. Powered by Claude, built into the composer.",
              },
            ].map(({ icon, title, href, body }) => (
              <Link
                key={title}
                href={href}
                className="card block p-6 transition-colors hover:border-neutral-300"
              >
                <div className="mb-5 flex size-10 items-center justify-center rounded-xl bg-brand-100 text-brand-800">
                  {icon}
                </div>
                <h3 className="mb-2 type-body-sb-l text-fg">
                  {title}
                </h3>
                <p className="type-body-r-s text-muted">
                  {body}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* ── FEATURE DEEP-DIVE: 1 MULTI-PLATFORM ── */}
        <section className="border-t border-border bg-surface/40">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-7 px-5 py-16 sm:gap-10 md:px-12 md:py-22 lg:grid-cols-2 lg:gap-20">
            <div className="min-w-0">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-300 bg-brand-100 px-3 py-1">
                <span className="type-body-sb-xs tracking-wider text-brand-800">
                  MULTI-PLATFORM
                </span>
              </div>
              <h2 className="mb-4 type-head-sb-4 tracking-tight text-fg md:type-head-sb-2">
                Write once,
                <br />
                post everywhere
              </h2>
              <p className="mb-7 type-body-r-m text-muted">
                Compose your post in a single editor and publish to every
                connected account simultaneously. Each platform renders its own
                preview character limits, hashtags, and link handling all
                accounted for.
              </p>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS_GRID.map((p) => (
                  <span
                    key={p.domain}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 type-body-r-s text-fg"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        p.iconUrl ??
                        `https://www.google.com/s2/favicons?domain=${p.domain}&sz=32`
                      }
                      alt={p.name}
                      width={14}
                      height={14}
                    />
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
            <ComposeTypingMockup />
          </div>
        </section>

        {/* ── FEATURE DEEP-DIVE: 2 REELS & STORIES ── */}
        <section className="border-t border-border">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-7 px-5 py-16 sm:gap-10 md:px-12 md:py-22 lg:grid-cols-2 lg:gap-20">
            <div className="min-w-0 lg:order-2">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-300 bg-brand-100 px-3 py-1">
                <span className="type-body-sb-xs tracking-wider text-brand-800">
                  INSTAGRAM
                </span>
              </div>
              <h2 className="mb-4 type-head-sb-4 tracking-tight text-fg md:type-head-sb-2">
                Reels, Stories,
                <br />
                and Carousels
              </h2>
              <p className="mb-6 type-body-r-m text-muted">
                Full Instagram media support baked in. Schedule a Reel, a Story,
                or a carousel with up to 10 slides all from the same composer.
              </p>
              <div className="flex flex-col gap-2.5">
                {[
                  "Reel - short-form video with caption",
                  "Story - image or video, 24-hour expiry",
                  "Post - static or carousel up to 10 images",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2.5 type-body-r-s text-fg"
                  >
                    <CheckCircleIcon />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <InstagramMediaMockup />
          </div>
        </section>

        {/* ── FEATURE DEEP-DIVE: 3 CALENDAR ── */}
        <section className="border-t border-border bg-surface/40">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-7 px-5 py-16 sm:gap-10 md:px-12 md:py-22 lg:grid-cols-2 lg:gap-20">
            <div className="min-w-0">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-300 bg-brand-100 px-3 py-1">
                <span className="type-body-sb-xs tracking-wider text-brand-800">
                  CALENDAR
                </span>
              </div>
              <h2 className="mb-4 type-head-sb-4 tracking-tight text-fg md:type-head-sb-2">
                Drag to reschedule.
                <br />
                Instantly.
              </h2>
              <p className="mb-6 type-body-r-m text-muted">
                See your entire content pipeline on a month, week, or day
                calendar. Drag any scheduled post to a new date and time the job
                is rescheduled server-side in real time.
              </p>
              <div className="flex flex-col gap-2.5">
                {[
                  "Month, week, and day views",
                  "Drag-and-drop rescheduling",
                  "Color-coded by platform",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2.5 type-body-r-s text-fg"
                  >
                    <CheckCircleIcon />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <DragCalendarMockup />
          </div>
        </section>

        {/* ── FEATURE DEEP-DIVE: 4 FIRST COMMENT ── */}
        <section className="border-t border-border">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-7 px-5 py-16 sm:gap-10 md:px-12 md:py-22 lg:grid-cols-2 lg:gap-20">
            <div className="min-w-0 lg:order-2">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-300 bg-brand-100 px-3 py-1">
                <span className="type-body-sb-xs tracking-wider text-brand-800">
                  FIRST COMMENT
                </span>
              </div>
              <h2 className="mb-4 type-head-sb-4 tracking-tight text-fg md:type-head-sb-2">
                First comment.
                <br />
                On every platform.
              </h2>
              <p className="mb-6 type-body-r-m text-muted">
                Buffer and Hootsuite do first comments on Instagram. That&apos;s
                it. Posthive fires a reply the second your post goes live on
                Bluesky, Threads, Mastodon, and LinkedIn too. Hashtag stacks,
                affiliate links, thread continuations without cluttering your
                main copy.
              </p>
              <div className="flex flex-col gap-2.5">
                {[
                  "Works on Bluesky, Threads, Mastodon & LinkedIn",
                  "Fires within seconds of the main post",
                  "Per-platform override different comment per network",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2.5 type-body-r-s text-fg"
                  >
                    <CheckCircleIcon />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <FirstCommentMockup />
          </div>
        </section>

        {/* ── FEATURE DEEP-DIVE: 5 PER-PLATFORM OVERRIDES ── */}
        <section className="border-t border-border bg-surface/40">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-7 px-5 py-16 sm:gap-10 md:px-12 md:py-22 lg:grid-cols-2 lg:gap-20">
            <div className="min-w-0">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-300 bg-brand-100 px-3 py-1">
                <span className="type-body-sb-xs tracking-wider text-brand-800">
                  PER-PLATFORM
                </span>
              </div>
              <h2 className="mb-4 type-head-sb-4 tracking-tight text-fg md:type-head-sb-2">
                Tailor every post
                <br />
                per account
              </h2>
              <p className="mb-6 type-body-r-m text-muted">
                One base post, multiple voices. Override the caption and first
                comment for each connected account. Your Bluesky audience gets
                the long-form take; your Threads followers get the hook.
              </p>
              <div className="flex flex-col gap-2.5">
                {[
                  "Override text per connected account",
                  "Override first comment per account",
                  "Fallback to global copy if no override set",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2.5 type-body-r-s text-fg"
                  >
                    <CheckCircleIcon />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <PerPlatformMockup />
          </div>
        </section>

        {/* ── FEATURE DEEP-DIVE: 6 BULK CSV ── */}
        <section className="border-t border-border">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-7 px-5 py-16 sm:gap-10 md:px-12 md:py-22 lg:grid-cols-2 lg:gap-20">
            <div className="min-w-0 lg:order-2">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-300 bg-brand-100 px-3 py-1">
                <span className="type-body-sb-xs tracking-wider text-brand-800">
                  BULK SCHEDULING
                </span>
              </div>
              <h2 className="mb-4 type-head-sb-4 tracking-tight text-fg md:type-head-sb-2">
                Schedule hundreds
                <br />
                of posts from a CSV
              </h2>
              <p className="mb-6 type-body-r-m text-muted">
                Upload a spreadsheet and Posthive schedules every row
                automatically. Mix platforms per row, attach images, exclude
                specific networks all from a single file.
              </p>
              <div className="flex flex-col gap-2.5">
                {[
                  "Schedule dozens of posts in seconds with a CSV upload",
                  "Exclude platforms per row !instagram, !linkedin",
                  "Attach image URLs per row (up to 4, semicolon-separated)",
                  "Preview table shows ✓ Ready or ✕ error before sending",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2.5 type-body-r-s text-fg"
                  >
                    <CheckCircleIcon />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <BulkCsvMockup />
          </div>
        </section>

        {/* ── MCP / AI AGENTS ── */}
        <section className="border-t border-border bg-surface/40">
          <div className="mx-auto max-w-6xl px-5 py-16 md:px-12 md:py-24">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-20">
              {/* Left — copy */}
              <div className="min-w-0">
                <span className="scroll-hidden d1 inline-block type-body-sb-xs uppercase tracking-wider text-brand-800">
                  AI-NATIVE
                </span>
                <h2 className="scroll-hidden d2 my-4 type-head-sb-3 tracking-tight text-fg md:type-head-sb-1">
                  Use with Claude,
                  <br />
                  Cursor, or any AI agent.
                </h2>
                <p className="scroll-hidden d3 mb-8 type-body-r-l text-muted">
                  Posthive speaks MCP the Model Context Protocol. Connect your
                  AI agent once and let it draft, schedule, and manage posts
                  across all your accounts without leaving the chat.
                </p>
                <div className="scroll-hidden d4 mb-9 flex flex-col gap-3">
                  {[
                    "Schedule posts from Claude or Cursor",
                    "Approve drafts without opening the app",
                    "Works with any MCP-compatible client",
                    "Pro & Team plans one URL to connect",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2.5"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="none"
                        className="shrink-0 text-brand-800"
                      >
                        <circle
                          cx="9"
                          cy="9"
                          r="9"
                          fill="currentColor"
                          fillOpacity=".15"
                        />
                        <path
                          d="M5.5 9l2.5 2.5 4.5-5"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="type-body-r-m text-fg">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
                <a
                  href="/docs#mcp-overview"
                  className="scroll-hidden d5 btn-primary px-5 py-2.5"
                >
                  Read MCP docs
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M2 7h10M7 2l5 5-5 5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              </div>
              {/* Right — code snippet */}
              <div className="scroll-hidden d3 card min-w-0 overflow-x-auto px-5 py-7 type-mono-r-s text-fg md:px-8">
                <div className="mb-5 flex gap-1.5">
                  <span className="inline-block size-2.5 rounded-full bg-neutral-200" />
                  <span className="inline-block size-2.5 rounded-full bg-neutral-200" />
                  <span className="inline-block size-2.5 rounded-full bg-neutral-200" />
                </div>
                <div className="mb-4">
                  <span className="text-brand-800">
                    # Claude Code — one command
                  </span>
                </div>
                <div className="mb-6">
                  <span className="text-muted">$ </span>
                  <span className="text-fg">
                    claude mcp add posthive \
                  </span>
                  <br />
                  <span className="text-fg">
                    &nbsp;&nbsp;--transport http \
                  </span>
                  <br />
                  <span className="text-fg">
                    &nbsp;&nbsp;--url https://api.posthive.co/mcp/
                    <span className="text-brand-800">ph_your_key</span>
                  </span>
                </div>
                <div className="border-t border-border pt-4 text-muted">
                  <span className="text-brand-800">
                    # Or connect via claude.ai
                  </span>
                  <br />
                  <span>Settings → Connectors → Add custom</span>
                  <br />
                  <span className="text-fg">
                    https://api.posthive.co/mcp
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PLATFORMS ── */}
        <section className="border-t border-border bg-surface/40">
          <div className="mx-auto max-w-6xl px-5 py-16 md:px-12 md:py-24">
            <div className="mb-14 text-center">
              <span className="type-body-sb-xs uppercase tracking-wider text-brand-800">SUPPORTED PLATFORMS</span>
              <h2 className="mt-4 mb-3.5 type-head-sb-3 tracking-tight text-fg md:type-head-sb-1">
                Multiple networks. One workflow.
              </h2>
              <p className="mx-auto max-w-130 type-body-r-l text-muted">
                Native support for the platforms creators and indie builders
                actually use.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {PLATFORMS_GRID.map((p) => (
                <Link
                  key={p.platform}
                  href={`/platforms/${p.platform}`}
                  className="card relative flex flex-col gap-3.5 overflow-hidden p-5.5 transition-colors hover:border-neutral-300"
                >
                  <span
                    className="absolute inset-x-0 top-0 h-0.5 bg-(--c)"
                    style={{ "--c": p.accent } as React.CSSProperties}
                  />
                  <span className="flex size-10.5 items-center justify-center rounded-xl border border-border bg-bg">
                    <PlatformIcon platform={p.platform} size={22} />
                  </span>
                  <div>
                    <h3 className="mb-1 type-body-sb-m text-fg">
                      {p.name}
                    </h3>
                    <p className="type-body-r-xs text-muted">
                      {p.meta}
                    </p>
                  </div>
                </Link>
              ))}
              <a
                href="mailto:guna@posthive.co?subject=Platform%20Request"
                className="flex cursor-pointer flex-col justify-center gap-2 rounded-2xl border border-dashed border-brand-300 bg-brand-100/60 p-5.5 transition hover:border-brand-400 hover:shadow-lg"
              >
                <span className="mb-0.5 flex size-9 items-center justify-center rounded-xl border border-brand-300 bg-brand-100 type-body-r-xl text-brand-800">
                  +
                </span>
                <span className="type-body-sb-m text-fg">
                  More coming
                </span>
                <span className="type-body-r-xs text-muted">
                  Request a platform →
                </span>
              </a>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section
          id="how"
          className="mx-auto max-w-6xl px-5 py-16 md:px-12 md:py-24"
        >
          <div className="mb-15 text-center">
            <span className="type-body-sb-xs uppercase tracking-wider text-brand-800">HOW IT WORKS</span>
            <h2 className="mt-4 type-head-sb-3 tracking-tight text-fg md:type-head-sb-1">
              From zero to scheduled in minutes
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {[
              {
                n: "01",
                title: "Connect your accounts",
                desc: "Authenticate all your networks in a couple of clicks. OAuth, encrypted at rest.",
              },
              {
                n: "02",
                title: "Compose & tailor",
                desc: "Write once, then fine-tune copy and media per platform. Preview exactly what each network shows.",
              },
              {
                n: "03",
                title: "Set it and forget it",
                desc: "Pick a date and time. Posthive fires on the second. Drag to reschedule from the calendar.",
              },
            ].map(({ n, title, desc }) => (
              <div key={n} className="card p-8">
                <span className="inline-block rounded-lg border border-brand-300 bg-brand-100 px-2.5 py-1 type-mono-m-s text-brand-800">
                  {n}
                </span>
                <h3 className="mt-6 mb-2.5 type-body-sb-l text-fg">
                  {title}
                </h3>
                <p className="type-body-r-s text-muted">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FOUNDER ── */}
        <section className="mx-auto max-w-170 px-5 pb-20 md:px-10">
          <div className="card rounded-3xl px-6 py-10 text-center md:px-9">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/founder.jpg"
              alt="Guna, founder of Posthive"
              width={72}
              height={72}
              className="mx-auto mb-4 block rounded-full border-3 border-border"
            />
            <p className="mb-1 type-body-sb-l text-fg">
              Hey, I&apos;m Guna
            </p>
            <p className="mb-6 type-body-r-s text-muted">
              frontend dev by day · indie builder by night
            </p>
            <div className="flex flex-col gap-3.5 text-left">
              <p className="type-body-r-s text-muted">
                I was building in public sharing updates on Bluesky, Threads,
                LinkedIn, and Mastodon at the same time. Copy-pasting the same
                post into five different apps every single day.
              </p>
              <p className="type-body-r-s text-muted">
                Every tool I tried was either too expensive, too bloated, or
                didn&apos;t support the platforms I actually used. None of them
                felt like they were built for indie builders.
              </p>
              <p className="type-body-r-s text-muted">
                So I built Posthive focused on the platforms that matter to
                creators. Schedule once, post everywhere.
              </p>
              <p className="type-body-m-s text-fg">
                if it saves you time too, that&apos;s the whole point.
              </p>
            </div>
            <a
              href="https://x.com/gunaa_dev"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 type-body-m-s text-muted transition-colors hover:text-fg"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              @gunaa_dev
            </a>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section
          id="pricing"
          className="border-t border-border bg-surface/40"
        >
          <div className="mx-auto max-w-6xl px-5 py-16 md:px-12 md:py-24">
            <div className="mb-15 text-center">
              <span className="type-body-sb-xs uppercase tracking-wider text-brand-800">PRICING</span>
              <h2 className="mt-4 mb-3.5 type-head-sb-3 tracking-tight text-fg md:type-head-sb-1">
                Simple, transparent pricing
              </h2>
              <p className="mb-5 type-body-r-l text-muted">
                Start free. Upgrade when you&apos;re ready. No hidden fees, no
                per-channel tax.
              </p>
              {/* Currency toggle */}
              <div className="mb-7 flex justify-center">
                <div className="inline-flex rounded-xl border border-border bg-surface p-0.5">
                  {(
                    [
                      { label: "INR ₹", val: true },
                      { label: "USD $", val: false },
                    ] as const
                  ).map(({ label, val }) => (
                    <button
                      key={label}
                      onClick={() => setIsIndia(val)}
                      className={cn(
                        "cursor-pointer rounded-lg px-4 py-1 type-body-m-s transition-all duration-150",
                        isIndia === val
                          ? "bg-accent text-accent-fg"
                          : "text-muted hover:text-fg",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="inline-flex flex-col overflow-hidden rounded-xl border border-border type-body-r-s sm:flex-row sm:items-center">
                <span className="bg-surface px-5 py-2.5 text-muted">
                  7 channels on Buffer:{" "}
                  <span className="type-body-sb-s text-red-600">
                    $42/mo
                  </span>
                </span>
                <span className="border-y border-border bg-brand-100 px-5 py-2.5 type-body-sb-s text-brand-800 sm:border-x sm:border-y-0">
                  Posthive: $9/mo
                </span>
                <span className="bg-surface px-5 py-2.5 text-muted">
                  Same channels.
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 items-start gap-4.5 lg:grid-cols-3">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={cn(
                    "card relative flex flex-col gap-4.5 p-7.5",
                    plan.popular && "border-brand-400 shadow-lg ring-1 ring-brand-400",
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3 py-1 type-body-sb-xxs tracking-widest text-accent-fg">
                      MOST POPULAR
                    </div>
                  )}
                  <div>
                    <h3 className="mb-1.5 type-body-sb-l text-fg">
                      {plan.name}
                    </h3>
                    <p className="type-body-r-s text-muted">
                      {plan.desc}
                    </p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="type-head-sb-1 tracking-tight text-fg">
                      {isIndia ? plan.inr : plan.usd}
                    </span>
                    <span className="ml-1 type-body-r-s text-muted">
                      /mo · {isIndia ? `≈ ${plan.usd}` : `≈ ${plan.inr}`}
                    </span>
                  </div>
                  <Link
                    href={ctaHref}
                    className={cn(
                      "w-full py-3",
                      plan.popular ? "btn-primary" : "btn-secondary",
                    )}
                  >
                    {user ? "Go to scheduler" : "Get started"}
                  </Link>
                  <div className="flex flex-col gap-2.5">
                    {plan.features.map((f) => (
                      <div
                        key={f.text}
                        className="flex items-center gap-2.5"
                      >
                        <span
                          className={cn(
                            "shrink-0 type-body-r-s",
                            f.included ? "text-green-700" : "text-neutral-400",
                          )}
                        >
                          {f.included ? "✓" : "—"}
                        </span>
                        <span
                          className={cn(
                            "type-body-r-s",
                            f.included ? "text-fg" : "text-neutral-500",
                          )}
                        >
                          {f.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-7 text-center type-body-r-xs text-muted">
              * The 100/mo cap and no-link restriction are X API limitations,
              not Posthive limitations.
            </p>
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section className="border-t border-border bg-bg">
          <div className="mx-auto max-w-3xl px-5 py-16 md:px-6 md:py-20">
            <div className="mb-10 text-center">
              <p className="mb-3 type-body-sb-xs uppercase tracking-wider text-brand-800">What people say</p>
              <h2 className="type-head-sb-4 text-fg md:type-head-sb-2">
                Loved by creators & teams
              </h2>
            </div>
            <div className="card px-6 py-8 md:px-9">
              {/* Stars */}
              <div className="mb-5 flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-brand-700">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              {/* Quote */}
              <p className="mb-7 type-body-r-l italic text-fg">
                &ldquo;Honestly, PostHive has been really helpful for me! ❤️ I usually post on Instagram, YouTube and LinkedIn, and managing everything separately takes time. With PostHive, I can schedule all my videos in one place and it&apos;s so much easier to manage. Makes my work a little less hectic! 😅✨&rdquo;
              </p>
              {/* Author */}
              <div className="flex items-center gap-3.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://pub-3d086e1182384cb5a8b0b360696831bc.r2.dev/8e89cb88-a775-45d9-bc93-42f3d3c8ae83-avatar.png"
                  alt="Vibe with Kiki"
                  width={44}
                  height={44}
                  className="rounded-full object-cover"
                />
                <div>
                  <p className="type-body-sb-m text-fg">Vibe with Kiki</p>
                  <p className="type-body-r-s text-muted">Content Creator · Instagram, YouTube & LinkedIn</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="border-t border-border bg-surface/40">
          <div className="mx-auto max-w-3xl px-5 py-16 text-center md:px-10 md:py-24">
            <h2 className="mb-4.5 type-head-sb-3 tracking-tight text-fg md:type-head-sb-1">
              Stop switching tabs.
              <br />
              <span className="text-muted">
                Start posting consistently.
              </span>
            </h2>
            <p className="mb-10 type-body-r-l text-muted">
              One composer for every platform. Schedule your first post in under
              two minutes.
            </p>
            <div className="flex flex-wrap justify-center gap-3.5">
              <Link
                href={ctaHref}
                className="btn-primary px-7 py-3.5 type-body-sb-m"
              >
                {ctaLabel}
              </Link>
              <Link
                href="/docs"
                className="btn-secondary px-7 py-3.5 type-body-sb-m"
              >
                View docs
              </Link>
            </div>
            <p className="mt-5 type-body-r-xs text-muted">
              14-day free trial ·{" "}
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener"
                className="transition-colors hover:text-fg"
              >
                open source
              </a>{" "}
              ·{" "}
              <Link
                href="/blog/open-source-social-media-scheduler"
                className="transition-colors hover:text-fg"
              >
                open-source social media scheduler
              </Link>
            </p>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <LandingFooter />
      </div>

      {/* Discord floating button */}
      <a
        href="https://discord.gg/UEdnAtHxgN"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed right-6 bottom-6 z-9999 flex items-center gap-2 rounded-full bg-[#5865F2] px-4 py-2.5 type-body-sb-s text-white shadow-lg shadow-[#5865F2]/40"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
        Join Discord
      </a>
    </>
  );
}

function BulkCsvMockup() {
  const ROWS = [
    { date: "Aug 1 · 09:00", text: "Good morning 🌅", accounts: "all" },
    { date: "Aug 2 · 14:30", text: "Check the blog post", accounts: "bluesky" },
    {
      date: "Aug 3 · 18:00",
      text: "Skip Instagram today",
      accounts: "!instagram",
    },
    { date: "Aug 4 · 10:00", text: "Two images 🖼️", accounts: "threads" },
  ];

  const [visibleRows, setVisibleRows] = useState(0);
  const [showFooter, setShowFooter] = useState(false);
  const [phase, setPhase] = useState<
    "parsing" | "ready" | "scheduling" | "done" | "reset"
  >("parsing");

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (phase === "parsing") {
      if (visibleRows < ROWS.length) {
        t = setTimeout(() => setVisibleRows((v) => v + 1), 480);
      } else {
        t = setTimeout(() => {
          setShowFooter(true);
          setPhase("ready");
        }, 400);
      }
    } else if (phase === "ready") {
      t = setTimeout(() => setPhase("scheduling"), 1400);
    } else if (phase === "scheduling") {
      t = setTimeout(() => setPhase("done"), 900);
    } else if (phase === "done") {
      t = setTimeout(() => setPhase("reset"), 2200);
    } else {
      t = setTimeout(() => {
        setVisibleRows(0);
        setShowFooter(false);
        setPhase("parsing");
      }, 500);
    }
    return () => clearTimeout(t);
  }, [phase, visibleRows]);

  const isScheduling = phase === "scheduling";
  const isDone = phase === "done" || phase === "reset";

  return (
    <div className="card min-w-0 overflow-hidden p-6">
      <div className="mb-2.5 type-body-r-xs tracking-wider text-muted">
        CSV PREVIEW
      </div>

      {ROWS.map((row, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-2 overflow-hidden py-2 transition duration-250",
            i < ROWS.length - 1 && "border-b border-border",
            visibleRows > i ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0",
          )}
        >
          <span className="shrink-0 type-body-r-xs text-muted">
            {row.date}
          </span>
          <span className="min-w-0 flex-1 truncate type-body-r-xs text-fg">
            {row.text}
          </span>
          <span
            className={cn(
              "shrink-0 type-body-r-xxs",
              row.accounts.startsWith("!") ? "text-brand-800" : "text-muted",
            )}
          >
            {row.accounts}
          </span>
          <span
            className={cn(
              "shrink-0 type-body-sb-xs transition-colors duration-400",
              isDone ? "text-brand-800" : "text-green-700",
            )}
          >
            {isDone ? "⬆" : "✓"}
          </span>
        </div>
      ))}

      <div
        className={cn(
          "mt-4 flex items-center justify-between rounded-lg border border-brand-300 bg-brand-100 px-3.5 py-2.5 transition duration-300",
          showFooter ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0",
        )}
      >
        <span
          className={cn(
            "type-body-r-xs transition-colors duration-400",
            isDone ? "text-green-700" : "text-brand-800",
          )}
        >
          {isDone ? "✓ 4 posts scheduled!" : "4 valid · 0 errors"}
        </span>
        <span
          className={cn(
            "rounded-md px-3.5 py-1 type-body-sb-xs transition-colors duration-400",
            isDone
              ? "border border-green-200 bg-green-50 text-green-700"
              : isScheduling
                ? "bg-accent/60 text-accent-fg"
                : "bg-accent text-accent-fg",
          )}
        >
          {isDone
            ? "✓ Scheduled!"
            : isScheduling
              ? "Scheduling…"
              : "Schedule 4 posts"}
        </span>
      </div>
    </div>
  );
}

function PerPlatformMockup() {
  const PLATFORMS = [
    {
      domain: "bsky.app",
      label: "Bluesky",
      text: "Long-form thoughts on async content workflows and why scheduling beats publishing live...",
      iconUrl: undefined as string | undefined,
    },
    {
      domain: "threads.net",
      label: "Threads",
      text: "Hot take: scheduled posts perform better than live ones. Here's why 👇",
      iconUrl: undefined as string | undefined,
    },
    {
      domain: "linkedin.com",
      label: "LinkedIn",
      text: "3 lessons learned from automating our content pipeline with Posthive 🚀",
      iconUrl: undefined as string | undefined,
    },
  ];

  const [activeIdx, setActiveIdx] = useState(0);
  const [typed, setTyped] = useState(PLATFORMS[0].text);
  const [phase, setPhase] = useState<"show" | "clearing" | "typing">("show");

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (phase === "show") {
      t = setTimeout(() => setPhase("clearing"), 2200);
    } else if (phase === "clearing") {
      const next = (activeIdx + 1) % PLATFORMS.length;
      setActiveIdx(next);
      setTyped("");
      setPhase("typing");
    } else {
      const target = PLATFORMS[activeIdx].text;
      if (typed.length < target.length) {
        t = setTimeout(() => setTyped(target.slice(0, typed.length + 1)), 28);
      } else {
        t = setTimeout(() => setPhase("show"), 300);
      }
    }
    return () => clearTimeout(t);
  }, [phase, typed, activeIdx]);

  return (
    <div className="card min-w-0 overflow-hidden p-7">
      {PLATFORMS.map((p, i) => {
        const active = i === activeIdx;
        return (
          <div
            key={p.label}
            className={cn(
              "mb-3.5 rounded-xl border p-4 transition-colors duration-350",
              active ? "border-brand-300 bg-brand-100/60" : "border-border",
            )}
          >
            <div className="mb-2.5 flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  p.iconUrl ??
                  `https://www.google.com/s2/favicons?domain=${p.domain}&sz=32`
                }
                alt={p.label}
                width={14}
                height={14}
              />
              <span
                className={cn(
                  "type-body-sb-s transition-colors duration-350",
                  active ? "text-brand-800" : "text-muted",
                )}
              >
                {p.label}
              </span>
              <span
                className={cn(
                  "ml-auto rounded-full px-2 py-0.5 type-body-r-xxs tracking-wide transition-all duration-350",
                  active
                    ? "bg-brand-200 text-brand-800"
                    : "border border-border text-muted",
                )}
              >
                {active ? "OVERRIDE ACTIVE" : "global copy"}
              </span>
            </div>
            <div
              className={cn(
                "min-h-9.5 type-body-r-xs transition-colors duration-350",
                active ? "text-fg" : "text-muted",
              )}
            >
              {active ? (
                <>
                  {typed}
                  {phase === "typing" && (
                    <span className="ph-caret ml-px inline-block h-3 w-0.5 bg-brand-800 align-middle" />
                  )}
                </>
              ) : (
                p.text
              )}
            </div>
          </div>
        );
      })}
      <div className="text-center type-body-r-xs text-muted">
        + 2 more accounts using global copy
      </div>
    </div>
  );
}

function FirstCommentMockup() {
  const COMMENT = "#buildinpublic #saas #indiedev #productivity #scheduling";
  const [phase, setPhase] = useState<
    "post" | "delay" | "typing" | "done" | "reset"
  >("post");
  const [typed, setTyped] = useState("");

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (phase === "post") {
      t = setTimeout(() => setPhase("delay"), 1800);
    } else if (phase === "delay") {
      t = setTimeout(() => setPhase("typing"), 700);
    } else if (phase === "typing") {
      if (typed.length < COMMENT.length) {
        t = setTimeout(() => setTyped(COMMENT.slice(0, typed.length + 1)), 32);
      } else {
        t = setTimeout(() => setPhase("done"), 400);
      }
    } else if (phase === "done") {
      t = setTimeout(() => setPhase("reset"), 2800);
    } else {
      t = setTimeout(() => {
        setTyped("");
        setPhase("post");
      }, 400);
    }
    return () => clearTimeout(t);
  }, [phase, typed]);

  const showComment =
    phase === "typing" || phase === "done" || phase === "reset";
  const isDone = phase === "done" || phase === "reset";

  return (
    <div className="card min-w-0 overflow-hidden p-7">
      {/* Main post */}
      <div className="mb-5 flex gap-3">
        <div className="flex flex-col items-center">
          <div className="size-9 shrink-0 rounded-full bg-linear-to-br from-brand-300 to-brand-600" />
          <div className="mt-1.5 w-0.5 flex-1 bg-border" />
        </div>
        <div className="flex-1">
          <div className="mb-1.5 type-body-sb-s text-fg">
            yourhandle{" "}
            <span className="type-body-r-s text-muted">· just now</span>
            {isDone && (
              <span className="ml-2 rounded-sm border border-green-200 bg-green-50 px-1.5 py-px align-middle type-body-m-xxs text-green-700">
                ✓ posted
              </span>
            )}
          </div>
          <div className="type-body-r-s text-fg">
            Shipping features faster than ever with Posthive. The async workflow
            is a game-changer.
          </div>
          <div className="mt-2.5 flex gap-4">
            {[
              ["♥", "24"],
              ["↩", "6"],
              ["⇅", "3"],
            ].map(([icon, count]) => (
              <span
                key={icon}
                className="flex items-center gap-1 type-body-r-xs text-muted"
              >
                {icon} {count}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* First comment — slides in */}
      <div
        className={cn(
          "flex gap-3 transition duration-300",
          showComment ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        )}
      >
        <div className="size-7 shrink-0 rounded-full bg-linear-to-br from-brand-300 to-brand-600" />
        <div className="flex-1 rounded-xl border border-brand-300 bg-brand-100/60 px-3.5 py-2.5">
          <div className="mb-1.5 flex flex-wrap items-center gap-2 type-body-sb-xs tracking-wide text-brand-800">
            FIRST COMMENT · AUTO-POSTED
            {isDone && (
              <span className="type-body-r-xxs text-green-700">
                ⚡ fired instantly
              </span>
            )}
          </div>
          <div className="min-h-4.5 break-words type-body-r-xs text-muted">
            {typed}
            {phase === "typing" && (
              <span className="ph-caret ml-px inline-block h-3 w-0.5 bg-brand-800 align-middle" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InstagramMediaMockup() {
  const TABS = ["Post", "Reel", "Story"] as const;
  type Tab = (typeof TABS)[number];

  const [tabIdx, setTabIdx] = useState(1); // start on Reel
  const [slideCount, setSlideCount] = useState(0);
  const [uploadPct, setUploadPct] = useState(0);
  const [storyReady, setStoryReady] = useState(false);
  const tab: Tab = TABS[tabIdx];

  // Reset per-tab state on tab change
  useEffect(() => {
    setSlideCount(0);
    setUploadPct(0);
    setStoryReady(false);
  }, [tabIdx]);

  // Post: slides appear one by one, then move to Reel
  useEffect(() => {
    if (tab !== "Post") return;
    if (slideCount >= 3) {
      const t = setTimeout(() => setTabIdx(1), 1400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setSlideCount((c) => c + 1), 480);
    return () => clearTimeout(t);
  }, [tab, slideCount]);

  // Reel: progress bar fills, then move to Story
  useEffect(() => {
    if (tab !== "Reel") return;
    if (uploadPct >= 100) {
      const t = setTimeout(() => setTabIdx(2), 1100);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setUploadPct((p) => Math.min(100, p + 3)), 50);
    return () => clearTimeout(t);
  }, [tab, uploadPct]);

  // Story: brief pause, image "fades in", then back to Post
  useEffect(() => {
    if (tab !== "Story") return;
    const t1 = setTimeout(() => setStoryReady(true), 500);
    const t2 = setTimeout(() => setTabIdx(0), 2800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [tab]);

  const SLIDE_COLORS = [
    "var(--color-brand-600)",
    "#e1306c",
    "var(--color-blue-500)",
  ];

  return (
    <div className="card min-w-0 overflow-hidden p-7">
      {/* Tab strip */}
      <div className="mb-5">
        <div className="mb-2.5 type-body-r-xs tracking-wider text-muted">
          POST TYPE
        </div>
        <div className="flex gap-2">
          {TABS.map((t) => {
            const active = t === tab;
            return (
              <div
                key={t}
                className={cn(
                  "flex-1 rounded-lg border py-2.5 text-center transition-all duration-300",
                  active
                    ? "border-brand-300 bg-brand-100 type-body-sb-s text-brand-800"
                    : "border-border type-body-r-s text-muted",
                )}
              >
                {t}
              </div>
            );
          })}
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={cn(
          "relative mb-5 flex h-27.5 flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed transition-colors duration-300",
          tab === "Reel" && uploadPct > 0 && uploadPct < 100
            ? "border-brand-400"
            : "border-border",
          tab === "Story" && storyReady && "bg-[#e1306c]/5",
        )}
      >
        {/* Post tab: placeholder */}
        {tab === "Post" && (
          <div className="flex flex-col items-center gap-1.5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-neutral-400">
              <rect
                x="3"
                y="3"
                width="7"
                height="7"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <rect
                x="14"
                y="3"
                width="7"
                height="7"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <rect
                x="3"
                y="14"
                width="7"
                height="7"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <rect
                x="14"
                y="14"
                width="7"
                height="7"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.4"
              />
            </svg>
            <span className="type-body-r-xs text-muted">
              Carousel / single image
            </span>
          </div>
        )}

        {/* Reel tab: upload progress */}
        {tab === "Reel" && (
          <>
            {uploadPct < 100 ? (
              <div className="flex w-full flex-col items-center gap-2.5 px-7">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-brand-800 opacity-70"
                >
                  <path
                    d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="h-1 w-full overflow-hidden rounded-xs bg-neutral-100">
                  <div
                    className="h-full w-(--w) rounded-xs bg-accent transition-all duration-50 ease-linear"
                    style={{ "--w": `${uploadPct}%` } as React.CSSProperties}
                  />
                </div>
                <span className="type-body-r-xxs text-muted">
                  Uploading… {uploadPct}%
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <rect
                    x="2"
                    y="2"
                    width="24"
                    height="24"
                    rx="4"
                    className="stroke-neutral-400"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M9 14l3.5 3.5 6-7"
                    className="stroke-green-700"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="type-body-r-xs text-green-700">
                  Upload complete
                </span>
              </div>
            )}
          </>
        )}

        {/* Story tab: portrait frame */}
        {tab === "Story" && (
          <div className="flex flex-col items-center gap-2">
            <div
              className={cn(
                "flex h-15 w-9.5 items-center justify-center rounded-md border-2 transition-all duration-400",
                storyReady
                  ? "border-solid border-[#e1306c]/70 bg-[#e1306c]/10"
                  : "border-dashed border-neutral-400",
              )}
            >
              {storyReady && (
                <div className="h-7 w-4.5 rounded-sm bg-[#e1306c]/25" />
              )}
            </div>
            <span
              className={cn(
                "type-body-r-xxs transition-colors duration-400",
                storyReady ? "text-[#e1306c]" : "text-muted",
              )}
            >
              9:16 · 15s max
            </span>
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      <div className="flex gap-2">
        {[0, 1, 2].map((n) => (
          <div
            key={n}
            className={cn(
              "h-12 flex-1 rounded-md border border-border transition-colors duration-350",
              tab === "Post" && slideCount > n ? "bg-(--c)/20" : "bg-bg",
            )}
            style={{ "--c": SLIDE_COLORS[n] } as React.CSSProperties}
          >
            {tab === "Post" && slideCount > n && (
              <div className="flex size-full items-center justify-center">
                <div className="size-4 rounded-sm bg-(--c) opacity-40" />
              </div>
            )}
          </div>
        ))}
        <div
          className={cn(
            "flex size-12 items-center justify-center rounded-md border border-dashed border-border transition-opacity duration-400",
            tab === "Post" && slideCount >= 3 ? "opacity-100" : "opacity-30",
          )}
        >
          <span className="type-body-r-xl text-muted">+</span>
        </div>
      </div>
    </div>
  );
}

function ComposeTypingMockup() {
  const TEXT =
    "Just shipped a new feature 🚀 Thread-safe scheduling across all your favorite platforms. No more copy-paste marathons.";
  const MAX = 300;
  const PLATFORMS = [
    {
      domain: "bsky.app",
      label: "bsky",
      iconUrl: undefined as string | undefined,
    },
    {
      domain: "threads.net",
      label: "threads",
      iconUrl: undefined as string | undefined,
    },
    {
      domain: "instagram.com",
      label: "instagram",
      iconUrl: undefined as string | undefined,
    },
  ];

  const [displayed, setDisplayed] = useState("");
  const [pillsVisible, setPillsVisible] = useState(0);
  const [phase, setPhase] = useState<
    "typing" | "pills" | "ready" | "scheduled" | "clearing"
  >("typing");

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (phase === "typing") {
      if (displayed.length < TEXT.length) {
        t = setTimeout(
          () => setDisplayed(TEXT.slice(0, displayed.length + 1)),
          36,
        );
      } else {
        t = setTimeout(() => setPhase("pills"), 400);
      }
    } else if (phase === "pills") {
      if (pillsVisible < PLATFORMS.length) {
        t = setTimeout(() => setPillsVisible((v) => v + 1), 260);
      } else {
        t = setTimeout(() => setPhase("ready"), 500);
      }
    } else if (phase === "ready") {
      t = setTimeout(() => setPhase("scheduled"), 1100);
    } else if (phase === "scheduled") {
      t = setTimeout(() => setPhase("clearing"), 1400);
    } else {
      t = setTimeout(() => {
        setDisplayed("");
        setPillsVisible(0);
        setPhase("typing");
      }, 500);
    }
    return () => clearTimeout(t);
  }, [phase, displayed, pillsVisible]);

  const isReady =
    phase === "ready" || phase === "scheduled" || phase === "clearing";
  const isScheduled = phase === "scheduled" || phase === "clearing";

  return (
    <div className="card min-w-0 overflow-hidden p-7">
      {/* Compose box */}
      <div className="mb-4 min-h-25 rounded-xl border border-border bg-bg p-5">
        <div className="min-h-20 break-words type-body-r-s text-fg">
          {displayed}
          {phase === "typing" && (
            <span className="ph-caret ml-px inline-block h-3.5 w-0.5 bg-brand-800 align-middle" />
          )}
        </div>
      </div>

      {/* Platform pills */}
      <div className="mb-4 flex min-h-7.5 flex-wrap gap-2">
        {PLATFORMS.map((p, i) => (
          <div
            key={p.domain}
            className={cn(
              "flex items-center gap-1.5 rounded-md border border-brand-300 bg-brand-100 px-2.5 py-1 type-body-r-xs transition duration-200",
              pillsVisible > i ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                p.iconUrl ??
                `https://www.google.com/s2/favicons?domain=${p.domain}&sz=32`
              }
              alt={p.label}
              width={12}
              height={12}
            />
            <span className="text-brand-800">{p.label}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "type-body-r-xs",
            displayed.length > MAX * 0.9 ? "text-red-600" : "text-muted",
          )}
        >
          {displayed.length} / {MAX} chars
        </span>
        <div
          className={cn(
            "rounded-lg px-4.5 py-2 type-body-sb-xs transition duration-350",
            isScheduled
              ? "bg-green-100 text-green-800"
              : isReady
                ? "bg-accent text-accent-fg"
                : "bg-neutral-100 text-muted",
          )}
        >
          {isScheduled ? "✓ Scheduled!" : "Schedule"}
        </div>
      </div>
    </div>
  );
}

function DragCalendarMockup() {
  // Row geometry is fixed pixels; column geometry is percentage-based (fills container)
  const CELL_H = 36;
  const GAP = 3;
  const ROWS = 5;

  // SRC = cell index 2  → row 0, col 2  (Jun 3)
  // DST = cell index 18 → row 2, col 4  (Jun 19)
  const SRC_COL = 2;
  const SRC_ROW = 0;
  const DST_COL = 4;
  const DST_ROW = 2;

  // Percentage X-centers of each column (7 columns, gaps negligible for %)
  const pct = (col: number) => `${((col + 0.5) / 7) * 100}%`;
  // Pixel Y-centers of each row
  const rowY = (row: number) => row * (CELL_H + GAP) + CELL_H / 2;

  const srcX = pct(SRC_COL);
  const srcY = rowY(SRC_ROW); // 18px
  const dstX = pct(DST_COL);
  const dstY = rowY(DST_ROW); // 92px

  // Card: left edge of source cell in % (same percentage scheme)
  const srcCellLeft = `${(SRC_COL / 7) * 100}%`;
  const dstCellLeft = `${(DST_COL / 7) * 100}%`;
  const srcCellTop = SRC_ROW * (CELL_H + GAP) + 12;
  const dstCellTop = DST_ROW * (CELL_H + GAP) + 12;

  const gridH = ROWS * (CELL_H + GAP) - GAP;

  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const dots: Record<number, string> = {
    5: "#6364ff",
    8: "#e1306c",
    11: "#0085ff",
    14: "#6364ff",
    23: "#e1306c",
    27: "#0085ff",
  };

  return (
    <div
      className="card min-w-0 overflow-hidden p-6"
      style={
        {
          "--gap": `${GAP}px`,
          "--cell-h": `${CELL_H}px`,
          "--grid-h": `${gridH}px`,
          "--dot-w": "calc(100% / 7 - 4px)",
          "--src-left": srcCellLeft,
          "--src-top": `${srcCellTop}px`,
          "--src-x": srcX,
          "--src-y": `${srcY}px`,
        } as React.CSSProperties
      }
    >
      <style>{`
        @keyframes ph-card {
          0%,15%   { left:${srcCellLeft}; top:${srcCellTop}px; }
          40%,65%  { left:${dstCellLeft}; top:${dstCellTop}px; }
          90%,100% { left:${srcCellLeft}; top:${srcCellTop}px; }
        }
        @keyframes ph-ghost {
          0%,18%   { opacity:0; }
          22%,65%  { opacity:0.3; }
          88%,100% { opacity:0; }
        }
        @keyframes ph-cursor {
          0%,12%   { left:${srcX}; top:${srcY}px; transform:scale(1); }
          15%      { left:${srcX}; top:${srcY}px; transform:scale(0.78); }
          19%      { left:${srcX}; top:${srcY}px; transform:scale(1); }
          42%,65%  { left:${dstX}; top:${dstY}px; transform:scale(1); }
          68%      { left:${dstX}; top:${dstY}px; transform:scale(0.78); }
          71%      { left:${dstX}; top:${dstY}px; transform:scale(1); }
          90%,100% { left:${srcX}; top:${srcY}px; transform:scale(1); }
        }
        @keyframes ph-glow {
          0%,55%   { box-shadow:none; background:var(--color-bg); }
          60%,70%  { box-shadow:0 0 0 2px var(--color-brand-600); background:var(--color-brand-100); }
          85%,100% { box-shadow:none; background:var(--color-bg); }
        }
        @keyframes ph-toast {
          0%,65%   { opacity:0; transform:translateY(5px); }
          72%,78%  { opacity:1; transform:translateY(0); }
          88%,100% { opacity:0; transform:translateY(5px); }
        }
        .ph-cal-glow   { animation: ph-glow 3.8s ease-in-out infinite; }
        .ph-cal-ghost  { animation: ph-ghost 3.8s ease-in-out infinite; }
        .ph-cal-card   { animation: ph-card 3.8s ease-in-out infinite; }
        .ph-cal-cursor { animation: ph-cursor 3.8s ease-in-out infinite; }
        .ph-cal-toast  { animation: ph-toast 3.8s ease-in-out infinite; }
      `}</style>

      <div className="mb-3 flex items-center justify-between">
        <span className="type-body-sb-s text-fg">June 2026</span>
        <span className="type-body-r-xs text-muted">Month</span>
      </div>

      {/* Day headers — percentage columns, fills full width */}
      <div className="mb-(--gap) grid grid-cols-7 gap-(--gap)">
        {days.map((d) => (
          <div key={d} className="py-0.5 text-center type-body-r-xxs text-muted">
            {d}
          </div>
        ))}
      </div>

      {/* Grid — percentage columns, fixed row heights, position:relative for overlays */}
      <div className="relative grid h-(--grid-h) grid-cols-7 gap-(--gap)">
        {Array.from({ length: 35 }, (_, i) => {
          const col = i % 7;
          const row = Math.floor(i / 7);
          const num = i + 1;
          const isToday = num === 21;
          const isDst = col === DST_COL && row === DST_ROW;
          return (
            <div
              key={i}
              className={cn(
                "h-(--cell-h) rounded-md border px-1 py-0.5",
                isToday ? "border-brand-300 bg-brand-100" : "border-transparent bg-bg",
                isDst && "ph-cal-glow",
              )}
            >
              <span
                className={cn(
                  "block text-right text-[8px] leading-none",
                  isToday ? "text-brand-800" : num > 30 ? "text-neutral-400" : "text-muted",
                )}
              >
                {num <= 30 ? num : num - 30}
              </span>
              {dots[i] && !(col === SRC_COL && row === SRC_ROW) && (
                <div
                  className="mt-0.75 h-0.75 rounded-xs bg-(--c)"
                  style={{ "--c": dots[i] } as React.CSSProperties}
                />
              )}
            </div>
          );
        })}

        {/* Ghost dot — stays at source */}
        <div className="ph-cal-ghost pointer-events-none absolute top-(--src-top) left-(--src-left) h-0.75 w-(--dot-w) rounded-xs bg-[#0085ff] opacity-0" />

        {/* Dragging card dot */}
        <div className="ph-cal-card pointer-events-none absolute top-(--src-top) left-(--src-left) z-10 h-0.75 w-(--dot-w) rounded-xs bg-[#0085ff] shadow-md shadow-[#0085ff]/50" />

        {/* Cursor — left/top animated directly so percentages work */}
        <div className="ph-cal-cursor pointer-events-none absolute top-(--src-y) left-(--src-x) z-20 -mt-1.5 -ml-2 origin-[3px_2px]">
          <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
            <path
              d="M1 1l4.5 14 2.5-4.5 4.5-2.5L1 1z"
              className="fill-white stroke-fg"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Toast */}
      <div className="ph-cal-toast mt-2.5 flex items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-100 px-3 py-1.5 type-body-r-xs text-brand-800 opacity-0">
        <span>✓</span> Post rescheduled to Jun 19 — saved instantly
      </div>
    </div>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="mt-0.5 shrink-0 text-brand-800"
    >
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M5 8l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 12l9 5 9-5" />
      <path d="M3 16.5l9 5 9-5" />
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5l5 3.5-5 3.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function CalGridIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18M8 3v4M16 3v4" />
      <rect
        x="7"
        y="13"
        width="5"
        height="4"
        rx="1"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M21 11.5a8 8 0 0 1-11.5 7.2L4 20l1.3-4.8A8 8 0 1 1 21 11.5z" />
    </svg>
  );
}
function PenIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
function ServerIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <rect x="3" y="4" width="18" height="7" rx="2" />
      <rect x="3" y="13" width="18" height="7" rx="2" />
      <path d="M7 7.5h.01M7 16.5h.01" />
    </svg>
  );
}
function CsvIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
      <line x1="8" y1="9" x2="10" y2="9" />
    </svg>
  );
}
function McpIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      <path d="M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </svg>
  );
}
function RepeatIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
function SparklesIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z" />
      <path d="M20 3v4M22 5h-4M4 17v2M5 18H3" />
    </svg>
  );
}
