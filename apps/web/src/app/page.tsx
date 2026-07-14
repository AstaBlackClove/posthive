"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { NavBar, PLATFORMS_NAV, FEATURES_NAV } from "../components/LandingNav";
import { PlatformIcon } from "../components/PlatformIcon";

const GITHUB_URL = "https://github.com/AstaBlackClove/posthive";

const PLATFORMS_GRID = [
  { name: "Bluesky",        domain: "bsky.app",        meta: "300 chars · AT Protocol",      accent: "#0085ff", platform: "bluesky" },
  { name: "Threads",        domain: "threads.net",     meta: "500 chars · Meta OAuth",       accent: "#e6e6e6", platform: "threads" },
  { name: "Instagram",      domain: "instagram.com",   meta: "Posts, Reels & Stories",       accent: "#e1306c", platform: "instagram" },
  { name: "LinkedIn",       domain: "linkedin.com",    meta: "3,000 chars · Professional",   accent: "#0a66c2", platform: "linkedin" },
  { name: "Mastodon",       domain: "mastodon.social", meta: "500 chars · Federated",        accent: "#6364ff", platform: "mastodon" },
  { name: "YouTube",        domain: "youtube.com",     meta: "Shorts & video · Google OAuth", accent: "#ff0000", platform: "youtube" },
  { name: "Facebook Pages", domain: "facebook.com",    meta: "Pages · Graph API",            accent: "#1877f2", platform: "facebook" },
  { name: "Pinterest",      domain: "pinterest.com",   meta: "Pins · image required",         accent: "#e60023", platform: "pinterest" },
  { name: "X (Twitter)",    domain: "x.com",           meta: "100 tweets/mo · Pro & Team",    accent: "#e7e7e7", platform: "twitter" },
  { name: "Telegram",      domain: "telegram.org",    meta: "4,096 chars · Bot API",         accent: "#229ED9", platform: "telegram" },
  { name: "Nostr",         domain: "nostr.com",       meta: "Keypair · decentralized · no approval", accent: "#8B5CF6", platform: "nostr" },
  { name: "Discord",       domain: "discord.com",     meta: "2,000 chars · Bot + webhook",   accent: "#5865F2", platform: "discord" },
  { name: "Tumblr",        domain: "tumblr.com",      meta: "4,096 chars · OAuth 1.0a",      accent: "#35465c", platform: "tumblr" },
  { name: "Lemmy",         domain: "lemmy.world",     meta: "Federated · username + password", accent: "#ff6314", platform: "lemmy" },
];

// Hero card cycling data — one array per card slot
const HERO_CARD_SCHEDULED = [
  { platform: "bluesky",   name: "Bluesky",        text: "Write once, post to multi platforms. This is the tool I have been waiting for.", pill: "Fires in 2h", pillBg: "#fef3c7", pillColor: "#92400e", time: "9:00 AM" },
  { platform: "mastodon",  name: "Mastodon",        text: "Finally a scheduler that supports the fediverse. Set it and forget it.", pill: "Fires in 45m", pillBg: "#fef3c7", pillColor: "#92400e", time: "10:15 AM" },
  { platform: "twitter",   name: "X (Twitter)",     text: "Scheduled 30 tweets for the whole week in under 10 minutes.", pill: "Tomorrow 8AM", pillBg: "#ede9fe", pillColor: "#5b21b6", time: "8:00 AM" },
  { platform: "pinterest", name: "Pinterest",        text: "Pinned my product catalogue to 6 boards on autopilot every morning.", pill: "Fires in 1h", pillBg: "#fef3c7", pillColor: "#92400e", time: "7:30 AM" },
];

const HERO_CARD_FIRST_COMMENT = [
  { platform: "threads",   name: "Threads",         text: "First comment fires automatically right after the post goes live.", pill: "Sent", pillBg: "#dcfce7", pillColor: "#166534", time: "Just now" },
  { platform: "linkedin",  name: "LinkedIn",         text: "Added my link in the first comment automatically. Algorithm loves it.", pill: "Sent", pillBg: "#dcfce7", pillColor: "#166534", time: "2m ago" },
  { platform: "instagram", name: "Instagram",        text: "Drop hashtags in the first comment without cluttering the caption.", pill: "Sent", pillBg: "#dcfce7", pillColor: "#166534", time: "Just now" },
  { platform: "facebook",  name: "Facebook",         text: "First comment auto-posted with the full article link seconds after.", pill: "Sent", pillBg: "#dcfce7", pillColor: "#166534", time: "1m ago" },
];

const HERO_CARD_POSTED = [
  { platform: "linkedin",  name: "LinkedIn",         text: "Bulk scheduled 30 days of content in one afternoon with CSV upload.", pill: "Live", pillBg: "#dcfce7", pillColor: "#166534", time: "8:47 AM" },
  { platform: "youtube",   name: "YouTube Short",    text: "Short went live at peak hour. Views are already rolling in.", pill: "Live", pillBg: "#dcfce7", pillColor: "#166534", time: "12:00 PM" },
  { platform: "facebook",  name: "Facebook Page",    text: "Posted to 3 Facebook Pages at once from a single compose window.", pill: "Live", pillBg: "#dcfce7", pillColor: "#166534", time: "9:00 AM" },
  { platform: "nostr",     name: "Nostr",            text: "Decentralized post published. No algorithm, no gatekeeping.", pill: "Live", pillBg: "#dcfce7", pillColor: "#166534", time: "11:22 AM" },
  { platform: "discord",   name: "Discord",          text: "Announcement scheduled to the community server. Done in seconds.", pill: "Live", pillBg: "#dcfce7", pillColor: "#166534", time: "3m ago" },
  { platform: "tumblr",    name: "Tumblr",           text: "Blog post queued and published to Tumblr right on schedule.", pill: "Live", pillBg: "#dcfce7", pillColor: "#166534", time: "1m ago" },
];

const HERO_CARD_RESCHEDULED = [
  { platform: "instagram", name: "Instagram Reel",   text: "Dragged to a better time slot on the calendar. Done in 2 seconds.", pill: "Tomorrow 9AM", pillBg: "#ede9fe", pillColor: "#5b21b6", time: "" },
  { platform: "telegram",  name: "Telegram",         text: "Moved the channel broadcast to Friday peak hours in one tap.", pill: "Fri 6:00 PM", pillBg: "#ede9fe", pillColor: "#5b21b6", time: "" },
  { platform: "bluesky",   name: "Bluesky",          text: "Rescheduled after spotting a typo. No stress, just drag and drop.", pill: "Mon 8:00 AM", pillBg: "#ede9fe", pillColor: "#5b21b6", time: "" },
  { platform: "twitter",   name: "X (Twitter)",      text: "Shifted the thread to avoid the weekend lull. Better reach guaranteed.", pill: "Next Mon", pillBg: "#ede9fe", pillColor: "#5b21b6", time: "" },
];

const PLANS = [
  {
    id: "creator",
    name: "Creator",
    desc: "For solo creators finding their rhythm.",
    inr: "₹550", usd: "$9",
    features: [
      { text: "5 connected accounts", included: true },
      { text: "400 posts / month", included: true },
      { text: "All core platforms", included: true },
      { text: "Bulk CSV scheduling", included: true },
      { text: "Post templates", included: true },
      { text: "Calendar & drag-reschedule", included: true },
      { text: "First comment automation", included: true },
      { text: "Reels & Stories", included: false },
      { text: "Per-platform overrides", included: false },
      { text: "X/Twitter posting", included: false },
      { text: "API access", included: false },
      { text: "Webhook outbound", included: false },
    ],
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    desc: "For creators who are serious about growth.",
    inr: "₹1,700", usd: "$29",
    features: [
      { text: "15 connected accounts", included: true },
      { text: "Unlimited posts", included: true },
      { text: "All core platforms", included: true },
      { text: "Bulk CSV scheduling", included: true },
      { text: "Post templates", included: true },
      { text: "Calendar & drag-reschedule", included: true },
      { text: "First comment automation", included: true },
      { text: "Reels & Stories", included: true },
      { text: "Per-platform overrides", included: true },
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
    inr: "₹2,600", usd: "$49",
    features: [
      { text: "50 connected accounts", included: true },
      { text: "Unlimited posts", included: true },
      { text: "All core platforms", included: true },
      { text: "Bulk CSV scheduling", included: true },
      { text: "Post templates", included: true },
      { text: "Calendar & drag-reschedule", included: true },
      { text: "First comment automation", included: true },
      { text: "Reels & Stories", included: true },
      { text: "Per-platform overrides", included: true },
      { text: "X/Twitter posting (100/mo, no links)*", included: true },
      { text: "Webhook outbound", included: true },
    ],
    popular: false,
  },
];

function useIsIndia() {
  const [india, setIndia] = useState(false);
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setIndia(tz === "Asia/Calcutta" || tz === "Asia/Kolkata");
    } catch {
      setIndia(false);
    }
  }, []);
  return india;
}

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".scroll-hidden");
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { (e.target as HTMLElement).classList.add("scroll-visible"); io.unobserve(e.target); } });
    }, { threshold: 0.15 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export default function RootPage() {
  const { user, loading: authLoading } = useAuth();
  const isIndia = useIsIndia();
  useScrollReveal();
  const ctaHref = user ? "/compose" : "/register";
  const ctaLabel = user ? "Go to scheduler" : "Get started free";
  const navCtaLabel = user ? "Go to scheduler" : "Get started free";

  const [cardIdx, setCardIdx] = useState([0, 0, 0, 0]);
  const [fade, setFade] = useState([true, true, true, true]);

  useEffect(() => {
    const SLOTS = [HERO_CARD_SCHEDULED, HERO_CARD_FIRST_COMMENT, HERO_CARD_POSTED, HERO_CARD_RESCHEDULED];
    const OFFSETS = [0, 900, 1800, 2700]; // stagger per card
    const timers: ReturnType<typeof setTimeout>[] = [];

    SLOTS.forEach((slot, i) => {
      const cycle = () => {
        setFade(f => { const n = [...f]; n[i] = false; return n; });
        timers.push(setTimeout(() => {
          setCardIdx(c => { const n = [...c]; n[i] = (n[i] + 1) % slot.length; return n; });
          setFade(f => { const n = [...f]; n[i] = true; return n; });
        }, 350));
      };
      timers.push(setTimeout(() => {
        cycle();
        const interval = setInterval(cycle, 3600);
        timers.push(interval as unknown as ReturnType<typeof setTimeout>);
      }, OFFSETS[i] + 3600));
    });

    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; overflow-x: hidden; }
        body {
          background: #0a0a0a;
          color: #ededed;
          font-family: 'Inter', -apple-system, system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
          overflow-x: hidden;
        }
        a { color: inherit; text-decoration: none; }
        ::selection { background: rgba(91,99,211,.35); }

        .hero-card-inner { transition: opacity .35s ease; }
        .hero-card-inner.fade-out { opacity: 0; }

        @keyframes glowpulse {
          0%, 100% { opacity: .85; }
          50% { opacity: 1; }
        }
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
        .hero-float-a { animation: floatA 3.4s ease-in-out infinite alternate; }
        .hero-float-b { animation: floatB 3.4s ease-in-out infinite alternate; }
        .hero-card {
          background: #fff; border-radius: 14px; padding: 16px 18px; width: 220px;
          border: 2px dashed #555; box-shadow: 0 4px 24px rgba(0,0,0,.35);
          font-family: 'Inter', system-ui, sans-serif;
        }
        .hero-card-platform { display: flex; align-items: center; gap: 7px; margin-bottom: 9px; }
        .hero-card-platform span { font-size: 12.5px; font-weight: 700; color: #111; }
        .hero-card-text { font-size: 12px; color: #444; line-height: 1.5; margin-bottom: 11px; }
        .hero-card-footer { display: flex; align-items: center; justify-content: space-between; }
        .hero-status { font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 20px; }
        .hero-time { font-size: 10.5px; color: #999; }
        .hero-arrow-label {
          font-size: 11.5px; font-weight: 600; color: #aaa; display: flex; align-items: center; gap: 4px; margin-bottom: 6px;
        }
        /* medium: smaller columns + smaller H1 so text doesn't break */
        @media (min-width: 1101px) and (max-width: 1440px) {
          .ph-hero-grid { grid-template-columns: 220px 1fr 220px !important; gap: 24px !important; }
          .ph-hero-h1 { font-size: 56px !important; }
          .hero-card { width: 200px !important; }
        }
        /* ≤1100px: hide side cards, center takes full width */
        @media (max-width: 1100px) {
          .ph-hero-cards { display: none !important; }
          .ph-hero-grid { display: block !important; }
        }
        /* mobile: tighten hero padding */
        @media (max-width: 640px) {
          .ph-hero-grid { padding: 0 4px !important; }
        }

        .anim-1 { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) both; }
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

        .mono { font-family: 'JetBrains Mono', monospace; }
        .section-label { font-size: 12px; letter-spacing: .16em; color: #5b63d3; font-weight: 600; font-family: 'JetBrains Mono', monospace; }

        .ph-feature-card {
          background: #111111; border: 1px solid #1e1e1e; border-radius: 16px; padding: 28px;
          transition: border-color .2s;
        }
        .ph-feature-card:hover { border-color: #2c2c2c; }

        .ph-platform-card {
          background: #111111; border: 1px solid #1e1e1e; border-radius: 14px; padding: 22px;
          display: flex; flex-direction: column; gap: 14px; position: relative; overflow: hidden;
          transition: border-color .2s; text-decoration: none; color: inherit;
        }
        .ph-platform-card:hover { border-color: #2c2c2c; }

        .ph-plan-card {
          background: #111111; border: 1px solid #1e1e1e; border-radius: 16px; padding: 30px;
          display: flex; flex-direction: column; gap: 18px; position: relative;
        }
        .ph-plan-card-pro {
          background: #0f0f14; border: 1px solid #5b63d3; border-radius: 16px; padding: 30px;
          display: flex; flex-direction: column; gap: 18px; position: relative;
          box-shadow: 0 0 0 1px #5b63d3, 0 24px 70px -24px rgba(91,99,211,.55);
        }

        .ph-btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          background: #5b63d3; color: #fff; font-size: 15px; font-weight: 600;
          padding: 13px 24px; border-radius: 11px; text-decoration: none;
          box-shadow: 0 8px 30px -8px rgba(91,99,211,.75); transition: filter .15s;
        }
        .ph-btn-primary:hover { filter: brightness(1.12); }

        .ph-btn-secondary {
          display: inline-flex; align-items: center; gap: 8px;
          background: #111111; color: #ededed; font-size: 15px; font-weight: 600;
          padding: 13px 24px; border: 1px solid #2a2a2a; border-radius: 11px; text-decoration: none;
          transition: border-color .15s, background .15s;
        }
        .ph-btn-secondary:hover { border-color: #3a3a3a; background: #151515; }

        .ph-plan-btn-pro {
          display: block; text-align: center; background: #5b63d3; color: #fff;
          font-size: 14.5px; font-weight: 600; padding: 11px; border-radius: 10px; text-decoration: none;
          box-shadow: 0 8px 24px -8px rgba(91,99,211,.8); transition: filter .15s;
        }
        .ph-plan-btn-pro:hover { filter: brightness(1.12); }

        .ph-plan-btn {
          display: block; text-align: center; background: #1a1a1a; color: #ededed;
          font-size: 14.5px; font-weight: 600; padding: 11px; border-radius: 10px; text-decoration: none;
          border: 1px solid #2a2a2a; transition: background .15s;
        }
        .ph-plan-btn:hover { background: #202020; }

        .ph-gh-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 9px;
          background: #ededed; color: #0a0a0a; font-size: 14.5px; font-weight: 600;
          padding: 13px 22px; border-radius: 11px; text-decoration: none; white-space: nowrap;
          transition: filter .15s;
        }
        .ph-gh-btn:hover { filter: brightness(.92); }

        .ph-docs-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 9px;
          background: #111111; color: #ededed; font-size: 14.5px; font-weight: 600;
          padding: 13px 22px; border: 1px solid #2a2a2a; border-radius: 11px; text-decoration: none;
          white-space: nowrap; transition: border-color .15s;
        }
        .ph-docs-btn:hover { border-color: #3a3a3a; }

        .foot-link { font-size: 13.5px; color: #9a9a9a; text-decoration: none; transition: color .15s; }
        .foot-link:hover { color: #ededed; }

        @media (max-width: 1024px) {
          .ph-platforms-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 900px) {
          .ph-features-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .ph-how-grid { grid-template-columns: 1fr !important; }
          .ph-pricing-grid { grid-template-columns: 1fr !important; }
          .ph-selfhost-inner { flex-direction: column !important; }
          .ph-footer-inner { grid-template-columns: 1fr !important; gap: 40px !important; }
          .ph-foot-cols { grid-template-columns: repeat(2, 1fr) !important; gap: 28px !important; }
        }
        @media (max-width: 640px) {
          .ph-features-grid { grid-template-columns: 1fr !important; }
          .ph-platforms-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .ph-hero-h1 { font-size: clamp(36px, 10vw, 56px) !important; }
          .ph-section { padding-left: 20px !important; padding-right: 20px !important; }
          .ph-hero-cta { flex-direction: column !important; align-items: stretch !important; }
          .ph-proof-bar { gap: 18px !important; }
        }
        .feature-visual { transition: box-shadow .3s; }
        .feature-visual:hover { box-shadow: 0 0 40px rgba(91,99,211,.08); }

        @media (max-width: 900px) {
          .ph-feature-detail-row { grid-template-columns: 1fr !important; direction: ltr !important; gap: 40px !important; }
          .ph-feature-detail-row > * { direction: ltr !important; min-width: 0; max-width: 100%; overflow: hidden; }
        }
        @media (max-width: 480px) {
          .ph-platforms-grid { grid-template-columns: 1fr !important; }
          .ph-selfhost-btns { flex-direction: row !important; flex-wrap: wrap !important; }
          .ph-feature-detail-row { gap: 28px !important; }
        }
      `}</style>

      <NavBar user={!!user} ctaHref={ctaHref} navCtaLabel={navCtaLabel} loading={authLoading} />

      <div style={{ paddingTop: 64 }}>

        {/* ── HERO ── */}
        <section className="ph-section" style={{ position: "relative", overflow: "hidden", padding: "110px 24px 80px" }}>
          <div style={{
            position: "absolute", top: -80, left: "50%", transform: "translateX(-50%)",
            width: 900, height: 620,
            filter: "blur(30px)", pointerEvents: "none",
            animation: "glowpulse 6s ease-in-out infinite",
          }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 0%, rgba(255,255,255,.03), transparent 40%)", pointerEvents: "none" }} />

          <div className="ph-hero-grid" style={{ maxWidth: 1600, margin: "0 auto", display: "grid", gridTemplateColumns: "280px 1fr 280px", alignItems: "center", gap: 40, position: "relative" }}>

            {/* Left floating cards */}
            <div className="ph-hero-cards" style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
              <div className="hero-float-a" style={{ alignSelf: "flex-start" }}>
                <div className="hero-arrow-label">
                  <svg width="10" height="12" viewBox="0 0 10 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 1 C2 1 1 4 2 7 L2 11 M2 11 L4 9 M2 11 L0 9"/></svg>
                  Scheduled
                </div>
                <div className="hero-card" style={{ transform: "rotate(-3deg)" }}>
                  <div className={`hero-card-inner${fade[0] ? "" : " fade-out"}`}>
                    <div className="hero-card-platform">
                      <PlatformIcon platform={HERO_CARD_SCHEDULED[cardIdx[0]].platform} size={16} />
                      <span>{HERO_CARD_SCHEDULED[cardIdx[0]].name}</span>
                    </div>
                    <p className="hero-card-text">{HERO_CARD_SCHEDULED[cardIdx[0]].text}</p>
                    <div className="hero-card-footer">
                      <span className="hero-status" style={{ background: HERO_CARD_SCHEDULED[cardIdx[0]].pillBg, color: HERO_CARD_SCHEDULED[cardIdx[0]].pillColor }}>{HERO_CARD_SCHEDULED[cardIdx[0]].pill}</span>
                      {HERO_CARD_SCHEDULED[cardIdx[0]].time && <span className="hero-time">{HERO_CARD_SCHEDULED[cardIdx[0]].time}</span>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="hero-float-b" style={{ alignSelf: "flex-end" }}>
                <div className="hero-arrow-label">
                  <svg width="10" height="12" viewBox="0 0 10 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 1 C2 1 1 4 2 7 L2 11 M2 11 L4 9 M2 11 L0 9"/></svg>
                  First comment
                </div>
                <div className="hero-card" style={{ transform: "rotate(2deg)" }}>
                  <div className={`hero-card-inner${fade[1] ? "" : " fade-out"}`}>
                    <div className="hero-card-platform">
                      <PlatformIcon platform={HERO_CARD_FIRST_COMMENT[cardIdx[1]].platform} size={16} />
                      <span>{HERO_CARD_FIRST_COMMENT[cardIdx[1]].name}</span>
                    </div>
                    <p className="hero-card-text">{HERO_CARD_FIRST_COMMENT[cardIdx[1]].text}</p>
                    <div className="hero-card-footer">
                      <span className="hero-status" style={{ background: HERO_CARD_FIRST_COMMENT[cardIdx[1]].pillBg, color: HERO_CARD_FIRST_COMMENT[cardIdx[1]].pillColor }}>{HERO_CARD_FIRST_COMMENT[cardIdx[1]].pill}</span>
                      {HERO_CARD_FIRST_COMMENT[cardIdx[1]].time && <span className="hero-time">{HERO_CARD_FIRST_COMMENT[cardIdx[1]].time}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Center — untouched */}
            <div style={{ textAlign: "center" }}>
              <h1 className="anim-2 ph-hero-h1" style={{ fontSize: 72, lineHeight: 1.03, fontWeight: 800, letterSpacing: "-0.035em", margin: "0 0 24px", color: "#f4f4f4" }}>
                <span style={{ display: "block", marginBottom: 14 }}>The agentic scheduler</span>
                <span style={{ color: "#f4f4f4" }}>for the <span style={{ display: "inline-block", background: "#5b63d3", color: "#fff", padding: "2px 16px 4px", borderRadius: 6, transform: "rotate(-1.5deg)", transformOrigin: "center" }}>new social web.</span></span>
              </h1>

              <p className="anim-3" style={{ fontSize: 19, lineHeight: 1.6, color: "#8f8f8f", maxWidth: 640, margin: "0 auto 38px", fontWeight: 400 }}>
                Plan, create, review, and schedule posts across every major social network. Connect Claude, Cursor, Codex, ChatGPT or any MCP-compatible AI agent to automate your social media workflow.
              </p>

              <div className="anim-4 ph-hero-cta" style={{ display: "flex", gap: 14, justifyContent: "center", alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
                {authLoading ? (
                  <span className="ph-cta-skeleton" style={{ display: "inline-block", width: 168, height: 47, borderRadius: 11, background: "#161822" }} />
                ) : (
                  <Link href={ctaHref} className="ph-btn-primary">
                    {ctaLabel}
                  </Link>
                )}
                <Link href="/docs" className="ph-btn-secondary">View docs</Link>
              </div>

              {!user && (
                <p className="anim-5 mono" style={{ fontSize: 13, color: "#666", margin: "0 0 52px" }}>14-day free trial</p>
              )}

              <div className="anim-5" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, flexWrap: "wrap", marginTop: user ? 52 : 0 }}>
                <span className="mono" style={{ fontSize: 11, letterSpacing: ".14em", color: "#5f5f5f", fontWeight: 600 }}>PUBLISH TO</span>
                {PLATFORMS_GRID.map(p => (
                  <span key={p.platform} style={{ display: "inline-flex", alignItems: "center" }}>
                    <span style={{ width: 30, height: 30, borderRadius: 8, background: "#131313", border: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <PlatformIcon platform={p.platform} size={17} />
                    </span>
                  </span>
                ))}
              </div>
            </div>

            {/* Right floating cards */}
            <div className="ph-hero-cards" style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
              <div className="hero-float-b" style={{ alignSelf: "flex-start" }}>
                <div className="hero-arrow-label">
                  <svg width="10" height="12" viewBox="0 0 10 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 1 C2 1 1 4 2 7 L2 11 M2 11 L4 9 M2 11 L0 9"/></svg>
                  Posted
                </div>
                <div className="hero-card" style={{ transform: "rotate(3deg)" }}>
                  <div className={`hero-card-inner${fade[2] ? "" : " fade-out"}`}>
                    <div className="hero-card-platform">
                      <PlatformIcon platform={HERO_CARD_POSTED[cardIdx[2]].platform} size={16} />
                      <span>{HERO_CARD_POSTED[cardIdx[2]].name}</span>
                    </div>
                    <p className="hero-card-text">{HERO_CARD_POSTED[cardIdx[2]].text}</p>
                    <div className="hero-card-footer">
                      <span className="hero-status" style={{ background: HERO_CARD_POSTED[cardIdx[2]].pillBg, color: HERO_CARD_POSTED[cardIdx[2]].pillColor }}>{HERO_CARD_POSTED[cardIdx[2]].pill}</span>
                      {HERO_CARD_POSTED[cardIdx[2]].time && <span className="hero-time">{HERO_CARD_POSTED[cardIdx[2]].time}</span>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="hero-float-a" style={{ alignSelf: "flex-end" }}>
                <div className="hero-arrow-label">
                  <svg width="10" height="12" viewBox="0 0 10 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 1 C2 1 1 4 2 7 L2 11 M2 11 L4 9 M2 11 L0 9"/></svg>
                  Rescheduled
                </div>
                <div className="hero-card" style={{ transform: "rotate(-2deg)" }}>
                  <div className={`hero-card-inner${fade[3] ? "" : " fade-out"}`}>
                    <div className="hero-card-platform">
                      <PlatformIcon platform={HERO_CARD_RESCHEDULED[cardIdx[3]].platform} size={16} />
                      <span>{HERO_CARD_RESCHEDULED[cardIdx[3]].name}</span>
                    </div>
                    <p className="hero-card-text">{HERO_CARD_RESCHEDULED[cardIdx[3]].text}</p>
                    <div className="hero-card-footer">
                      <span className="hero-status" style={{ background: HERO_CARD_RESCHEDULED[cardIdx[3]].pillBg, color: HERO_CARD_RESCHEDULED[cardIdx[3]].pillColor }}>{HERO_CARD_RESCHEDULED[cardIdx[3]].pill}</span>
                      {HERO_CARD_RESCHEDULED[cardIdx[3]].time && <span className="hero-time">{HERO_CARD_RESCHEDULED[cardIdx[3]].time}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* product screenshot */}
          <div style={{ maxWidth: 1120, margin: "64px auto 0", position: "relative" }}>
            <div style={{ position: "absolute", inset: -1, background: "linear-gradient(180deg, rgba(91,99,211,.35), transparent 30%)", borderRadius: 18, filter: "blur(2px)", pointerEvents: "none" }} />
            <div style={{ position: "relative", background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ height: 38, borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: 7, padding: "0 16px", background: "#0f0f0f" }}>
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#2a2a2a" }} />
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#2a2a2a" }} />
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#2a2a2a" }} />
              </div>
              <Image
                src="/app-screenshot.png"
                alt="Posthive composer — schedule posts across all platforms"
                width={1120}
                height={630}
                style={{ width: "100%", height: "auto", display: "block" }}
                priority
              />
            </div>
          </div>
        </section>

        {/* ── SOCIAL PROOF BAR ── */}
        <section style={{ borderTop: "1px solid #161616", borderBottom: "1px solid #161616", background: "#0c0c0c" }}>
          <div className="ph-proof-bar" style={{ maxWidth: 1120, margin: "0 auto", padding: "22px 40px", display: "flex", alignItems: "center", justifyContent: "center", gap: 36, flexWrap: "wrap" }}>
            {[["Multi", " platforms"], ["1", " composer"], ["14-day", " free trial"]].map(([val, label]) => (
              <span key={label} className="mono" style={{ fontSize: 13.5, color: "#9a9a9a" }}>
                <span style={{ color: "#ededed", fontWeight: 500 }}>{val}</span>{label}
              </span>
            ))}
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" className="ph-section" style={{ maxWidth: 1120, margin: "0 auto", padding: "104px 40px" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <span className="section-label">FEATURES</span>
            <h2 style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.03em", margin: "16px 0 14px", color: "#f2f2f2" }}>
              Everything you need to post consistently
            </h2>
            <p style={{ fontSize: 17, color: "#8a8a8a", maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
              A complete scheduling workflow built for creators and teams, without the manual grind.
            </p>
          </div>
          <div className="ph-features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
            {[
              { icon: <ChatIcon />,   title: "First comment automation",     href: "/features/first-comment",           body: "Schedule a reply that fires the second your post goes live on Bluesky, Threads, Mastodon, and LinkedIn. Other tools do this only on Instagram. We do it everywhere." },
              { icon: <LayersIcon />, title: "Multi-platform posting",       href: "/features/multi-platform-posting",  body: "Draft once and ship to all nine networks in a single click." },
              { icon: <PlayIcon />,   title: "Reels & Stories scheduling",   href: "/features/instagram-reels-scheduler",       body: "Full Instagram media support plus YouTube Shorts with native previews." },
              { icon: <CalGridIcon />,title: "Drag-to-reschedule calendar",  href: "/features/drag-to-reschedule",      body: "See your whole week at a glance. Drag any post to a new slot in seconds." },
              { icon: <PenIcon />,    title: "Per-platform text overrides",  href: "/features/per-platform-overrides",  body: "Tweak copy and media per network without leaving the composer." },
              { icon: <ServerIcon />, title: "Reliable scheduling",          href: "/features/multi-platform-posting",  body: "Posts fire at the exact second. BullMQ-backed queue with automatic retries." },
              { icon: <CsvIcon />,    title: "Bulk CSV scheduling",          href: "/features/bulk-csv-scheduling",     body: "Upload a CSV and schedule hundreds of posts at once. Exclude platforms per row with !platform syntax." },
              { icon: <McpIcon />,    title: "Give your agents hands",        href: "/docs#mcp-overview",                body: "Drive Posthive from Claude Code or Cursor via MCP. Your agent drafts and schedules nothing publishes without your approval." },
            ].map(({ icon, title, href, body }) => (
              <Link key={title} href={href} className="ph-feature-card" style={{ display: "block" }}>
                <div style={{ width: 44, height: 44, borderRadius: 11, background: "#17172a", border: "1px solid #26264a", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, color: "#8b91e8" }}>
                  {icon}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 8px", color: "#ededed" }}>{title}</h3>
                <p style={{ fontSize: 14.5, color: "#888", lineHeight: 1.55, margin: 0 }}>{body}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* ── FEATURE DEEP-DIVE: 1 MULTI-PLATFORM ── */}
        <section style={{ borderTop: "1px solid #161616", background: "#0c0c0c" }}>
          <div className="ph-feature-detail-row ph-section" style={{ maxWidth: 1100, margin: "0 auto", padding: "88px 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", border: "1px solid #26264a", background: "#17172a", borderRadius: 999, marginBottom: 20 }}>
                <span className="mono" style={{ fontSize: 11.5, color: "#8b91e8", fontWeight: 600, letterSpacing: ".08em" }}>MULTI-PLATFORM</span>
              </div>
              <h2 style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.025em", margin: "0 0 16px", color: "#f2f2f2", lineHeight: 1.2 }}>Write once,<br />post everywhere</h2>
              <p style={{ color: "#888", lineHeight: 1.75, fontSize: 16, marginBottom: 28 }}>
                Compose your post in a single editor and publish to every connected account simultaneously. Each platform renders its own preview character limits, hashtags, and link handling all accounted for.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {PLATFORMS_GRID.map(p => (
                  <span key={p.domain} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, border: "1px solid #1e1e1e", background: "#111", fontSize: 13, color: "#ccc" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://www.google.com/s2/favicons?domain=${p.domain}&sz=32`} alt={p.name} width={14} height={14} />
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
            <ComposeTypingMockup />
          </div>
        </section>

        {/* ── FEATURE DEEP-DIVE: 2 REELS & STORIES ── */}
        <section style={{ borderTop: "1px solid #161616" }}>
          <div className="ph-feature-detail-row ph-section" style={{ maxWidth: 1100, margin: "0 auto", padding: "88px 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", direction: "rtl" }}>
            <div style={{ direction: "ltr" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", border: "1px solid #26264a", background: "#17172a", borderRadius: 999, marginBottom: 20 }}>
                <span className="mono" style={{ fontSize: 11.5, color: "#8b91e8", fontWeight: 600, letterSpacing: ".08em" }}>INSTAGRAM</span>
              </div>
              <h2 style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.025em", margin: "0 0 16px", color: "#f2f2f2", lineHeight: 1.2 }}>Reels, Stories,<br />and Carousels</h2>
              <p style={{ color: "#888", lineHeight: 1.75, fontSize: 16, marginBottom: 24 }}>
                Full Instagram media support baked in. Schedule a Reel, a Story, or a carousel with up to 10 slides all from the same composer.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["Reel - short-form video with caption", "Story - image or video, 24-hour expiry", "Post - static or carousel up to 10 images"].map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#ccc" }}>
                    <CheckCircleIcon />{item}
                  </div>
                ))}
              </div>
            </div>
            <InstagramMediaMockup />
          </div>
        </section>

        {/* ── FEATURE DEEP-DIVE: 3 CALENDAR ── */}
        <section style={{ borderTop: "1px solid #161616", background: "#0c0c0c" }}>
          <div className="ph-feature-detail-row ph-section" style={{ maxWidth: 1100, margin: "0 auto", padding: "88px 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", border: "1px solid #26264a", background: "#17172a", borderRadius: 999, marginBottom: 20 }}>
                <span className="mono" style={{ fontSize: 11.5, color: "#8b91e8", fontWeight: 600, letterSpacing: ".08em" }}>CALENDAR</span>
              </div>
              <h2 style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.025em", margin: "0 0 16px", color: "#f2f2f2", lineHeight: 1.2 }}>Drag to reschedule.<br />Instantly.</h2>
              <p style={{ color: "#888", lineHeight: 1.75, fontSize: 16, marginBottom: 24 }}>
                See your entire content pipeline on a month, week, or day calendar. Drag any scheduled post to a new date and time the job is rescheduled server-side in real time.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["Month, week, and day views", "Drag-and-drop rescheduling", "Color-coded by platform"].map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#ccc" }}>
                    <CheckCircleIcon />{item}
                  </div>
                ))}
              </div>
            </div>
            <DragCalendarMockup />
          </div>
        </section>

        {/* ── FEATURE DEEP-DIVE: 4 FIRST COMMENT ── */}
        <section style={{ borderTop: "1px solid #161616" }}>
          <div className="ph-feature-detail-row ph-section" style={{ maxWidth: 1100, margin: "0 auto", padding: "88px 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", direction: "rtl" }}>
            <div style={{ direction: "ltr" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", border: "1px solid #26264a", background: "#17172a", borderRadius: 999, marginBottom: 20 }}>
                <span className="mono" style={{ fontSize: 11.5, color: "#8b91e8", fontWeight: 600, letterSpacing: ".08em" }}>FIRST COMMENT</span>
              </div>
              <h2 style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.025em", margin: "0 0 16px", color: "#f2f2f2", lineHeight: 1.2 }}>First comment.<br />On every platform.</h2>
              <p style={{ color: "#888", lineHeight: 1.75, fontSize: 16, marginBottom: 24 }}>
                Buffer and Hootsuite do first comments on Instagram. That&apos;s it. Posthive fires a reply the second your post goes live on Bluesky, Threads, Mastodon, and LinkedIn too. Hashtag stacks, affiliate links, thread continuations without cluttering your main copy.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["Works on Bluesky, Threads, Mastodon & LinkedIn", "Fires within seconds of the main post", "Per-platform override different comment per network"].map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#ccc" }}>
                    <CheckCircleIcon />{item}
                  </div>
                ))}
              </div>
            </div>
            <FirstCommentMockup />
          </div>
        </section>

        {/* ── FEATURE DEEP-DIVE: 5 PER-PLATFORM OVERRIDES ── */}
        <section style={{ borderTop: "1px solid #161616", background: "#0c0c0c" }}>
          <div className="ph-feature-detail-row ph-section" style={{ maxWidth: 1100, margin: "0 auto", padding: "88px 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", border: "1px solid #26264a", background: "#17172a", borderRadius: 999, marginBottom: 20 }}>
                <span className="mono" style={{ fontSize: 11.5, color: "#8b91e8", fontWeight: 600, letterSpacing: ".08em" }}>PER-PLATFORM</span>
              </div>
              <h2 style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.025em", margin: "0 0 16px", color: "#f2f2f2", lineHeight: 1.2 }}>Tailor every post<br />per account</h2>
              <p style={{ color: "#888", lineHeight: 1.75, fontSize: 16, marginBottom: 24 }}>
                One base post, multiple voices. Override the caption and first comment for each connected account. Your Bluesky audience gets the long-form take; your Threads followers get the hook.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["Override text per connected account", "Override first comment per account", "Fallback to global copy if no override set"].map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#ccc" }}>
                    <CheckCircleIcon />{item}
                  </div>
                ))}
              </div>
            </div>
            <PerPlatformMockup />
          </div>
        </section>

        {/* ── FEATURE DEEP-DIVE: 6 BULK CSV ── */}
        <section style={{ borderTop: "1px solid #161616" }}>
          <div className="ph-feature-detail-row ph-section" style={{ maxWidth: 1100, margin: "0 auto", padding: "88px 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", direction: "rtl" }}>
            <div style={{ direction: "ltr" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", border: "1px solid #26264a", background: "#17172a", borderRadius: 999, marginBottom: 20 }}>
                <span className="mono" style={{ fontSize: 11.5, color: "#8b91e8", fontWeight: 600, letterSpacing: ".08em" }}>BULK SCHEDULING</span>
              </div>
              <h2 style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.025em", margin: "0 0 16px", color: "#f2f2f2", lineHeight: 1.2 }}>Schedule hundreds<br />of posts from a CSV</h2>
              <p style={{ color: "#888", lineHeight: 1.75, fontSize: 16, marginBottom: 24 }}>
                Upload a spreadsheet and Posthive schedules every row automatically. Mix platforms per row, attach images, exclude specific networks all from a single file.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "Schedule dozens of posts in seconds with a CSV upload",
                  "Exclude platforms per row !instagram, !linkedin",
                  "Attach image URLs per row (up to 4, semicolon-separated)",
                  "Preview table shows ✓ Ready or ✕ error before sending",
                ].map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#ccc" }}>
                    <CheckCircleIcon />{item}
                  </div>
                ))}
              </div>
            </div>
            <BulkCsvMockup />
          </div>
        </section>

        {/* ── MCP / AI AGENTS ── */}
        <section style={{ borderTop: "1px solid #161616", background: "#0c0c0c" }}>
          <div className="ph-section" style={{ maxWidth: 1100, margin: "0 auto", padding: "104px 40px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }} className="ph-feature-detail-row">
              {/* Left — copy */}
              <div>
                <span className="section-label scroll-hidden d1">AI-NATIVE</span>
                <h2 className="scroll-hidden d2" style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.03em", margin: "16px 0 16px", color: "#f2f2f2", lineHeight: 1.1 }}>
                  Use with Claude,<br />Cursor, or any AI agent.
                </h2>
                <p className="scroll-hidden d3" style={{ color: "#888", fontSize: 17, lineHeight: 1.7, margin: "0 0 32px" }}>
                  Posthive speaks MCP the Model Context Protocol. Connect your AI agent once and let it draft, schedule, and manage posts across all your accounts without leaving the chat.
                </p>
                <div className="scroll-hidden d4" style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
                  {[
                    "Schedule posts from Claude or Cursor",
                    "Approve drafts without opening the app",
                    "Works with any MCP-compatible client",
                    "Pro & Team plans one URL to connect",
                  ].map(item => (
                    <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="9" fill="#5b63d3" fillOpacity=".15"/><path d="M5.5 9l2.5 2.5 4.5-5" stroke="#5b63d3" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <span style={{ color: "#ccc", fontSize: 15 }}>{item}</span>
                    </div>
                  ))}
                </div>
                <a href="/docs#mcp-overview" className="scroll-hidden d5" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", color: "#0a0a0a", padding: "11px 22px", borderRadius: 8, fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                  Read MCP docs
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2l5 5-5 5" stroke="#0a0a0a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </a>
              </div>
              {/* Right — code snippet */}
              <div className="scroll-hidden d3" style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, padding: "28px 32px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, lineHeight: 1.7, color: "#ccc" }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#333", display: "inline-block" }}/>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#333", display: "inline-block" }}/>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#333", display: "inline-block" }}/>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <span style={{ color: "#5b63d3" }}># Claude Code — one command</span>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <span style={{ color: "#888" }}>$ </span>
                  <span style={{ color: "#f2f2f2" }}>claude mcp add posthive \</span>
                  <br />
                  <span style={{ color: "#f2f2f2" }}>&nbsp;&nbsp;--transport http \</span>
                  <br />
                  <span style={{ color: "#f2f2f2" }}>&nbsp;&nbsp;--url https://api.posthive.co/mcp/<span style={{ color: "#5b63d3" }}>ph_your_key</span></span>
                </div>
                <div style={{ borderTop: "1px solid #1e1e1e", paddingTop: 16, color: "#888" }}>
                  <span style={{ color: "#5b63d3" }}># Or connect via claude.ai</span>
                  <br />
                  <span>Settings → Connectors → Add custom</span>
                  <br />
                  <span style={{ color: "#f2f2f2" }}>https://api.posthive.co/mcp</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PLATFORMS ── */}
        <section style={{ borderTop: "1px solid #161616", background: "#0c0c0c" }}>
          <div className="ph-section" style={{ maxWidth: 1120, margin: "0 auto", padding: "104px 40px" }}>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <span className="section-label">SUPPORTED PLATFORMS</span>
              <h2 style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.03em", margin: "16px 0 14px", color: "#f2f2f2" }}>
                Mutliple networks. One workflow.
              </h2>
              <p style={{ fontSize: 17, color: "#8a8a8a", maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
                Native support for the platforms creators and indie builders actually use.
              </p>
            </div>
            <div className="ph-platforms-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              {PLATFORMS_GRID.map(p => (
                <Link key={p.platform} href={`/platforms/${p.platform}`} className="ph-platform-card">
                  <span style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: p.accent }} />
                  <span style={{ width: 42, height: 42, borderRadius: 11, background: "#181818", border: "1px solid #232323", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <PlatformIcon platform={p.platform} size={22} />
                  </span>
                  <div>
                    <h3 style={{ fontSize: 15.5, fontWeight: 600, margin: "0 0 4px", color: "#ededed" }}>{p.name}</h3>
                    <p className="mono" style={{ fontSize: 12.5, color: "#777", margin: 0 }}>{p.meta}</p>
                  </div>
                </Link>
              ))}
              <div style={{ background: "linear-gradient(140deg,#131320,#0f0f16)", border: "1px dashed #2a2a3d", borderRadius: 14, padding: 22, display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
                <span style={{ fontSize: 15.5, fontWeight: 600, color: "#ededed" }}>More coming</span>
                <span className="mono" style={{ fontSize: 12.5, color: "#777" }}>Request a platform →</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how" className="ph-section" style={{ maxWidth: 1120, margin: "0 auto", padding: "104px 40px" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <span className="section-label">HOW IT WORKS</span>
            <h2 style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.03em", margin: "16px 0 0", color: "#f2f2f2" }}>
              From zero to scheduled in minutes
            </h2>
          </div>
          <div className="ph-how-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {[
              { n: "01", title: "Connect your accounts",  desc: "Authenticate all your networks in a couple of clicks. OAuth, encrypted at rest." },
              { n: "02", title: "Compose & tailor",       desc: "Write once, then fine-tune copy and media per platform. Preview exactly what each network shows." },
              { n: "03", title: "Set it and forget it",   desc: "Pick a date and time. Posthive fires on the second. Drag to reschedule from the calendar." },
            ].map(({ n, title, desc }) => (
              <div key={n} style={{ background: "#111111", border: "1px solid #1e1e1e", borderRadius: 16, padding: 32 }}>
                <span className="mono" style={{ display: "inline-block", fontSize: 14, fontWeight: 500, color: "#8b91e8", border: "1px solid #26264a", background: "#17172a", borderRadius: 8, padding: "5px 10px" }}>{n}</span>
                <h3 style={{ fontSize: 19, fontWeight: 600, margin: "24px 0 10px", color: "#ededed" }}>{title}</h3>
                <p style={{ fontSize: 14.5, color: "#888", lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FOUNDER ── */}
        <section className="ph-section" style={{ padding: "0 40px 80px", maxWidth: 680, margin: "0 auto" }}>
          <div style={{ background: "#111111", border: "1px solid #1e1e1e", borderRadius: 20, padding: "40px 36px", textAlign: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/founder.png" alt="Guna, founder of Posthive" width={72} height={72} style={{ borderRadius: "50%", border: "3px solid #2a2a2a", display: "block", margin: "0 auto 16px" }} />
            <p style={{ fontSize: 18, fontWeight: 700, color: "#ededed", margin: "0 0 4px" }}>Hey, I&apos;m Guna</p>
            <p className="mono" style={{ fontSize: 13, color: "#888", margin: "0 0 24px" }}>frontend dev by day · indie builder by night</p>
            <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: 14.5, color: "#888", lineHeight: 1.7, margin: 0 }}>
                I was building in public sharing updates on Bluesky, Threads, LinkedIn, and Mastodon at the same time. Copy-pasting the same post into five different apps every single day.
              </p>
              <p style={{ fontSize: 14.5, color: "#888", lineHeight: 1.7, margin: 0 }}>
                Every tool I tried was either too expensive, too bloated, or didn&apos;t support the platforms I actually used. None of them felt like they were built for indie builders.
              </p>
              <p style={{ fontSize: 14.5, color: "#888", lineHeight: 1.7, margin: 0 }}>
                So I built Posthive focused on the platforms that matter to creators. Schedule once, post everywhere.
              </p>
              <p style={{ fontSize: 14.5, color: "#ededed", lineHeight: 1.7, margin: 0, fontWeight: 500 }}>
                if it saves you time too, that&apos;s the whole point.
              </p>
            </div>
            <a href="https://x.com/gunaa_dev" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 24, fontSize: 13, fontWeight: 500, color: "#888", padding: "7px 14px", borderRadius: 8, border: "1px solid #2a2a2a" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              @gunaa_dev
            </a>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="pricing" style={{ borderTop: "1px solid #161616", background: "#0c0c0c" }}>
          <div className="ph-section" style={{ maxWidth: 1120, margin: "0 auto", padding: "104px 40px" }}>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <span className="section-label">PRICING</span>
              <h2 style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.03em", margin: "16px 0 14px", color: "#f2f2f2" }}>Simple, transparent pricing</h2>
              <p style={{ fontSize: 17, color: "#8a8a8a", margin: "0 0 32px" }}>Start free. Upgrade when you&apos;re ready. No hidden fees, no per-channel tax.</p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 0, border: "1px solid #2a2a2a", borderRadius: 12, overflow: "hidden", fontSize: 13.5 }}>
                <span style={{ padding: "10px 20px", background: "#111", color: "#666" }}>7 channels on Buffer: <span style={{ color: "#ef4444", fontWeight: 600 }}>$42/mo</span></span>
                <span style={{ padding: "10px 20px", background: "#17172a", color: "#9ba2ee", borderLeft: "1px solid #2a2a2a", borderRight: "1px solid #2a2a2a", fontWeight: 600 }}>Posthive: $9/mo</span>
                <span style={{ padding: "10px 20px", background: "#111", color: "#555" }}>Same channels.</span>
              </div>
            </div>
            <div className="ph-pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, alignItems: "start" }}>
              {PLANS.map(plan => (
                <div key={plan.id} className={plan.popular ? "ph-plan-card-pro" : "ph-plan-card"}>
                  {plan.popular && (
                    <div className="mono" style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: "#5b63d3", color: "#fff", fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", padding: "4px 12px", borderRadius: 999, whiteSpace: "nowrap" }}>
                      MOST POPULAR
                    </div>
                  )}
                  <div>
                    <h3 style={{ fontSize: 19, fontWeight: 600, margin: "0 0 6px", color: "#ededed" }}>{plan.name}</h3>
                    <p style={{ fontSize: 13.5, color: "#888", margin: 0, lineHeight: 1.5 }}>{plan.desc}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 44, fontWeight: 800, color: "#f2f2f2", letterSpacing: "-0.03em" }}>
                      {isIndia ? plan.inr : plan.usd}
                    </span>
                    <span style={{ fontSize: 14, color: "#555", marginLeft: 4 }}>/mo · {isIndia ? `≈ ${plan.usd}` : `≈ ${plan.inr}`}</span>
                  </div>
                  <Link href={ctaHref} className={plan.popular ? "ph-plan-btn-pro" : "ph-plan-btn"}>
                    {user ? "Go to scheduler" : "Get started"}
                  </Link>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {plan.features.map(f => (
                      <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 14, color: f.included ? "#4ade80" : "#333", flexShrink: 0 }}>
                          {f.included ? "✓" : "—"}
                        </span>
                        <span style={{ fontSize: 13.5, color: f.included ? (plan.popular ? "#cfcfcf" : "#b4b4b4") : "#444" }}>{f.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mono" style={{ textAlign: "center", marginTop: 28, fontSize: 12, color: "#555" }}>
              * The 100/mo cap and no-link restriction are X API limitations, not Posthive limitations.
            </p>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section style={{ borderTop: "1px solid #161616", background: "#0c0c0c" }}>
          <div className="ph-section" style={{ maxWidth: 760, margin: "0 auto", padding: "104px 40px", textAlign: "center" }}>
            <h2 style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.035em", color: "#f4f4f4", margin: "0 0 18px", lineHeight: 1.08 }}>
              Stop switching tabs.<br />
              <span style={{ color: "#8b8b8b" }}>Start posting consistently.</span>
            </h2>
            <p style={{ fontSize: 17, color: "#8a8a8a", lineHeight: 1.65, margin: "0 0 38px" }}>
              One composer for every platform. Schedule your first post in under two minutes.
            </p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href={ctaHref} className="ph-btn-primary" style={{ fontSize: 16, padding: "15px 28px" }}>
                {ctaLabel}
              </Link>
              <Link href="/docs" className="ph-btn-secondary" style={{ fontSize: 16, padding: "15px 28px" }}>View docs</Link>
            </div>
            <p className="mono" style={{ fontSize: 12, color: "#444", marginTop: 20 }}>
              14-day free trial · <a href={GITHUB_URL} target="_blank" rel="noopener" style={{ color: "#444", textDecoration: "none" }}>open source</a>
            </p>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{ borderTop: "1px solid #161616", background: "#0a0a0a" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto", padding: "64px 40px 48px", display: "grid", gridTemplateColumns: "260px 1fr", gap: 64, flexWrap: "wrap" }} className="ph-footer-inner">

            {/* Brand column */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <Image src="/posthivemain.png" alt="Posthive" width={28} height={28} style={{ objectFit: "contain" }} />
                <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>Posthive</span>
              </div>
              <p style={{ fontSize: 13.5, color: "#555", lineHeight: 1.65, margin: "0 0 24px" }}>
                The social media scheduler built for creators and teams. Write once, publish everywhere.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  {
                    href: "https://github.com/AstaBlackClove/posthive",
                    label: "GitHub",
                    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>,
                  },
                  {
                    href: "https://x.com/gunaa_dev",
                    label: "X",
                    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
                  },
                  {
                    href: "https://www.linkedin.com/in/guna-sheelan-aa5325254/",
                    label: "LinkedIn",
                    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
                  },
                ].map(({ href, label, icon }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" title={label}
                    style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", textDecoration: "none", transition: "all 150ms" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#ededed"; e.currentTarget.style.borderColor = "#444"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "#555"; e.currentTarget.style.borderColor = "#222"; }}>
                    {icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Link columns */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 40 }} className="ph-foot-cols">

              {/* Features */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span className="mono" style={{ fontSize: 11, letterSpacing: ".1em", color: "#444", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>Features</span>
                {FEATURES_NAV.map(f => (
                  <Link key={f.slug} href={`/features/${f.slug}`} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "#666", fontSize: 13.5 }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#ededed")} onMouseLeave={e => (e.currentTarget.style.color = "#666")}>
                    <span style={{ color: f.color, display: "flex", flexShrink: 0 }}>{f.icon}</span>
                    {f.title}
                  </Link>
                ))}
              </div>

              {/* Product */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span className="mono" style={{ fontSize: 11, letterSpacing: ".1em", color: "#444", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>Product</span>
                {([
                  ["/pricing", "Pricing"],
                  ["/blog", "Blog"],
                  ["/docs", "Docs"],
                  ["https://github.com/AstaBlackClove/posthive", "GitHub"],
                ] as [string, string][]).map(([href, label]) => (
                  <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                    style={{ textDecoration: "none", color: "#666", fontSize: 13.5 }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#ededed")} onMouseLeave={e => (e.currentTarget.style.color = "#666")}>
                    {label}
                  </a>
                ))}
              </div>

              {/* Company */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span className="mono" style={{ fontSize: 11, letterSpacing: ".1em", color: "#444", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>Company</span>
                {([
                  ["mailto:gunasheelan208@gmail.com", "Contact us"],
                  ["/privacy", "Privacy policy"],
                  ["/terms", "Terms of service"],
                ] as [string, string][]).map(([href, label]) => (
                  <a key={label} href={href}
                    style={{ textDecoration: "none", color: "#666", fontSize: 13.5 }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#ededed")} onMouseLeave={e => (e.currentTarget.style.color = "#666")}>
                    {label}
                  </a>
                ))}
              </div>

            </div>
          </div>

          <div style={{ borderTop: "1px solid #161616" }}>
            <div style={{ maxWidth: 1120, margin: "0 auto", padding: "20px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <span className="mono" style={{ fontSize: 12.5, color: "#444" }}>© 2026 Posthive. All rights reserved.</span>
              <span className="mono" style={{ fontSize: 12.5, color: "#444" }}>Open-source · AGPL-3.0 · Built by an indie builder.</span>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}

function FootCol({ title, links }: { title: string; links: { label: string; href: string; external?: boolean }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <span className="mono" style={{ fontSize: 12, letterSpacing: ".1em", color: "#666", fontWeight: 600, marginBottom: 2 }}>{title}</span>
      {links.map(l => l.external
        ? <a key={l.label} href={l.href} target="_blank" rel="noopener" className="foot-link">{l.label}</a>
        : <Link key={l.label} href={l.href} className="foot-link">{l.label}</Link>
      )}
    </div>
  );
}

function BulkCsvMockup() {
  const ROWS = [
    { date: "Aug 1 · 09:00", text: "Good morning 🌅",      accounts: "all" },
    { date: "Aug 2 · 14:30", text: "Check the blog post",  accounts: "bluesky" },
    { date: "Aug 3 · 18:00", text: "Skip Instagram today", accounts: "!instagram" },
    { date: "Aug 4 · 10:00", text: "Two images 🖼️",        accounts: "threads" },
  ];

  const [visibleRows, setVisibleRows] = useState(0);
  const [showFooter, setShowFooter]   = useState(false);
  const [phase, setPhase]             = useState<"parsing"|"ready"|"scheduling"|"done"|"reset">("parsing");

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (phase === "parsing") {
      if (visibleRows < ROWS.length) {
        t = setTimeout(() => setVisibleRows(v => v + 1), 480);
      } else {
        t = setTimeout(() => { setShowFooter(true); setPhase("ready"); }, 400);
      }
    } else if (phase === "ready") {
      t = setTimeout(() => setPhase("scheduling"), 1400);
    } else if (phase === "scheduling") {
      t = setTimeout(() => setPhase("done"), 900);
    } else if (phase === "done") {
      t = setTimeout(() => setPhase("reset"), 2200);
    } else {
      t = setTimeout(() => { setVisibleRows(0); setShowFooter(false); setPhase("parsing"); }, 500);
    }
    return () => clearTimeout(t);
  }, [phase, visibleRows]);

  const isScheduling = phase === "scheduling";
  const isDone       = phase === "done" || phase === "reset";

  return (
    <div className="feature-visual" style={{ background:"#111111", border:"1px solid #1e1e1e", borderRadius:16, padding:24, direction:"ltr" }}>
      <div className="mono" style={{ fontSize:11, color:"#555", marginBottom:10, letterSpacing:".06em" }}>CSV PREVIEW</div>

      {ROWS.map((row, i) => (
        <div key={i} style={{
          display:"flex", alignItems:"center", gap:8,
          padding:"8px 0", borderBottom: i < ROWS.length - 1 ? "1px solid #1a1a1a" : "none",
          overflow:"hidden",
          opacity: visibleRows > i ? 1 : 0,
          transform: visibleRows > i ? "translateY(0)" : "translateY(6px)",
          transition:"opacity .25s ease, transform .25s ease",
        }}>
          <span className="mono" style={{ fontSize:11, color:"#555", flexShrink:0 }}>{row.date}</span>
          <span style={{ flex:1, fontSize:12, color:"#bbb", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", minWidth:0 }}>{row.text}</span>
          <span className="mono" style={{ fontSize:10, color: row.accounts.startsWith("!") ? "#f59e0b" : "#666", flexShrink:0 }}>{row.accounts}</span>
          <span style={{
            fontSize:11, fontWeight:600, flexShrink:0,
            color: isDone ? "#5b63d3" : "#4ade80",
            transition:"color .4s ease",
          }}>{isDone ? "⬆" : "✓"}</span>
        </div>
      ))}

      <div style={{
        marginTop:16, padding:"10px 14px", borderRadius:8,
        background:"rgba(91,99,211,.08)", border:"1px solid rgba(91,99,211,.2)",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        opacity: showFooter ? 1 : 0,
        transform: showFooter ? "translateY(0)" : "translateY(6px)",
        transition:"opacity .3s ease, transform .3s ease",
      }}>
        <span style={{ fontSize:12, color: isDone ? "#4ade80" : "#9ba2ee", transition:"color .4s ease" }}>
          {isDone ? "✓ 4 posts scheduled!" : "4 valid · 0 errors"}
        </span>
        <span style={{
          fontSize:12, fontWeight:600, padding:"5px 14px", borderRadius:6,
          color:"#fff",
          background: isDone ? "rgba(74,222,128,.15)" : isScheduling ? "rgba(91,99,211,.6)" : "#5b63d3",
          border: isDone ? "1px solid rgba(74,222,128,.3)" : "none",
          transition:"background .4s ease",
        }}>
          {isDone ? "✓ Scheduled!" : isScheduling ? "Scheduling…" : "Schedule 4 posts"}
        </span>
      </div>
    </div>
  );
}

function PerPlatformMockup() {
  const PLATFORMS = [
    { domain: "bsky.app",      label: "Bluesky",   text: "Long-form thoughts on async content workflows and why scheduling beats publishing live..." },
    { domain: "threads.net",   label: "Threads",   text: "Hot take: scheduled posts perform better than live ones. Here's why 👇" },
    { domain: "linkedin.com",  label: "LinkedIn",  text: "3 lessons learned from automating our content pipeline with Posthive 🚀" },
  ];

  const [activeIdx, setActiveIdx] = useState(0);
  const [typed, setTyped]         = useState(PLATFORMS[0].text);
  const [phase, setPhase]         = useState<"show"|"clearing"|"typing">("show");

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
    <div className="feature-visual" style={{ background:"#111111", border:"1px solid #1e1e1e", borderRadius:16, padding:28 }}>
      {PLATFORMS.map((p, i) => {
        const active = i === activeIdx;
        return (
          <div key={p.label} style={{
            marginBottom:14, borderRadius:10, padding:16,
            border: active ? "1px solid rgba(91,99,211,.35)" : "1px solid #1e1e1e",
            background: active ? "rgba(91,99,211,.06)" : "transparent",
            transition:"border-color .35s ease, background .35s ease",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://www.google.com/s2/favicons?domain=${p.domain}&sz=32`} alt={p.label} width={14} height={14} />
              <span style={{ fontSize:13, fontWeight:600, color: active ? "#9ba2ee" : "#555", transition:"color .35s ease" }}>{p.label}</span>
              <span className="mono" style={{
                marginLeft:"auto", fontSize:10, padding:"2px 8px", borderRadius:999, letterSpacing:".04em",
                color: active ? "#8b91e8" : "#333",
                background: active ? "rgba(91,99,211,.12)" : "transparent",
                border: active ? "none" : "1px solid #222",
                transition:"all .35s ease",
              }}>
                {active ? "OVERRIDE ACTIVE" : "global copy"}
              </span>
            </div>
            <div style={{ fontSize:12, lineHeight:1.6, color: active ? "#999" : "#444", minHeight:38, transition:"color .35s ease" }}>
              {active ? (
                <>
                  {typed}
                  {phase === "typing" && (
                    <span style={{ display:"inline-block", width:1.5, height:11, background:"#5b63d3", verticalAlign:"middle", marginLeft:1, animation:"ph-blink .75s step-end infinite" }} />
                  )}
                </>
              ) : p.text}
            </div>
          </div>
        );
      })}
      <div className="mono" style={{ textAlign:"center", fontSize:11, color:"#555" }}>+ 2 more accounts using global copy</div>
    </div>
  );
}

function FirstCommentMockup() {
  const COMMENT = "#buildinpublic #saas #indiedev #productivity #scheduling";
  const [phase, setPhase] = useState<"post"|"delay"|"typing"|"done"|"reset">("post");
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
      t = setTimeout(() => { setTyped(""); setPhase("post"); }, 400);
    }
    return () => clearTimeout(t);
  }, [phase, typed]);

  const showComment = phase === "typing" || phase === "done" || phase === "reset";
  const isDone      = phase === "done" || phase === "reset";

  return (
    <div className="feature-visual" style={{ background:"#111111", border:"1px solid #1e1e1e", borderRadius:16, padding:28, direction:"ltr" }}>

      {/* Main post */}
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
          <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#5b63d3,#9ba2ee)", flexShrink:0 }} />
          <div style={{ width:2, flex:1, background:"#1e1e1e", marginTop:6 }} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:6, color:"#ededed" }}>
            yourhandle <span style={{ fontWeight:400, color:"#666" }}>· just now</span>
            {isDone && (
              <span style={{ marginLeft:8, fontSize:10, color:"#4ade80", background:"rgba(74,222,128,.1)", border:"1px solid rgba(74,222,128,.2)", borderRadius:4, padding:"1px 6px", fontWeight:500, verticalAlign:"middle" }}>
                ✓ posted
              </span>
            )}
          </div>
          <div style={{ fontSize:13, color:"#bbb", lineHeight:1.6 }}>
            Shipping features faster than ever with Posthive. The async workflow is a game-changer.
          </div>
          <div style={{ marginTop:10, display:"flex", gap:16 }}>
            {[["♥","24"],["↩","6"],["⇅","3"]].map(([icon, count]) => (
              <span key={icon} style={{ fontSize:12, color:"#555", display:"flex", alignItems:"center", gap:4 }}>{icon} {count}</span>
            ))}
          </div>
        </div>
      </div>

      {/* First comment — slides in */}
      <div style={{
        display:"flex", gap:12,
        opacity: showComment ? 1 : 0,
        transform: showComment ? "translateY(0)" : "translateY(8px)",
        transition:"opacity .3s ease, transform .3s ease",
      }}>
        <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#5b63d3,#9ba2ee)", flexShrink:0 }} />
        <div style={{ flex:1, background:"rgba(91,99,211,.07)", border:"1px solid rgba(91,99,211,.2)", borderRadius:10, padding:"10px 14px" }}>
          <div className="mono" style={{ fontSize:11, color:"#8b91e8", fontWeight:600, marginBottom:6, letterSpacing:".04em", display:"flex", alignItems:"center", gap:8 }}>
            FIRST COMMENT · AUTO-POSTED
            {isDone && <span style={{ color:"#4ade80", fontWeight:400, fontSize:10 }}>⚡ fired instantly</span>}
          </div>
          <div style={{ fontSize:12, color:"#aaa", lineHeight:1.6, minHeight:18, wordBreak:"break-word" }}>
            {typed}
            {phase === "typing" && (
              <span style={{ display:"inline-block", width:1.5, height:11, background:"#5b63d3", verticalAlign:"middle", marginLeft:1, animation:"ph-blink .75s step-end infinite" }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InstagramMediaMockup() {
  const TABS = ["Post", "Reel", "Story"] as const;
  type Tab = typeof TABS[number];

  const [tabIdx, setTabIdx] = useState(1); // start on Reel
  const [slideCount, setSlideCount]   = useState(0);
  const [uploadPct, setUploadPct]     = useState(0);
  const [storyReady, setStoryReady]   = useState(false);
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
    const t = setTimeout(() => setSlideCount(c => c + 1), 480);
    return () => clearTimeout(t);
  }, [tab, slideCount]);

  // Reel: progress bar fills, then move to Story
  useEffect(() => {
    if (tab !== "Reel") return;
    if (uploadPct >= 100) {
      const t = setTimeout(() => setTabIdx(2), 1100);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setUploadPct(p => Math.min(100, p + 3)), 50);
    return () => clearTimeout(t);
  }, [tab, uploadPct]);

  // Story: brief pause, image "fades in", then back to Post
  useEffect(() => {
    if (tab !== "Story") return;
    const t1 = setTimeout(() => setStoryReady(true), 500);
    const t2 = setTimeout(() => setTabIdx(0), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [tab]);

  const SLIDE_COLORS = ["rgba(91,99,211,.18)", "rgba(225,48,108,.14)", "rgba(255,184,0,.12)"];

  return (
    <div className="feature-visual" style={{ background:"#111111", border:"1px solid #1e1e1e", borderRadius:16, padding:28, direction:"ltr" }}>

      {/* Tab strip */}
      <div style={{ marginBottom:20 }}>
        <div className="mono" style={{ fontSize:11, color:"#666", marginBottom:10, letterSpacing:".08em" }}>POST TYPE</div>
        <div style={{ display:"flex", gap:8 }}>
          {TABS.map((t) => {
            const active = t === tab;
            return (
              <div key={t} style={{
                flex:1, textAlign:"center", padding:"10px 0", borderRadius:8, fontSize:13,
                border: active ? "1px solid rgba(91,99,211,.4)" : "1px solid #1e1e1e",
                background: active ? "rgba(91,99,211,.1)" : "transparent",
                color: active ? "#9ba2ee" : "#555",
                fontWeight: active ? 600 : 400,
                transition:"all .3s ease",
              }}>{t}</div>
            );
          })}
        </div>
      </div>

      {/* Drop zone */}
      <div style={{
        border: tab === "Reel" && uploadPct > 0 && uploadPct < 100
          ? "1px dashed rgba(91,99,211,.6)"
          : "1px dashed #2a2a2a",
        borderRadius:10, height:110,
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        gap:8, marginBottom:20, position:"relative", overflow:"hidden",
        transition:"border-color .3s ease",
        background: tab === "Story" && storyReady ? "rgba(225,48,108,.06)" : "transparent",
      }}>

        {/* Post tab: placeholder */}
        {tab === "Post" && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#333" strokeWidth="1.4"/>
              <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#333" strokeWidth="1.4"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#333" strokeWidth="1.4"/>
              <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="#333" strokeWidth="1.4"/>
            </svg>
            <span className="mono" style={{ fontSize:11, color:"#555" }}>Carousel / single image</span>
          </div>
        )}

        {/* Reel tab: upload progress */}
        {tab === "Reel" && (
          <>
            {uploadPct < 100 ? (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, width:"100%", padding:"0 28px", boxSizing:"border-box" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ opacity:.7 }}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="#5b63d3" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div style={{ width:"100%", height:4, background:"#1e1e1e", borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${uploadPct}%`, background:"linear-gradient(90deg,#5b63d3,#9ba2ee)", borderRadius:2, transition:"width .05s linear" }} />
                </div>
                <span className="mono" style={{ fontSize:10, color:"#555" }}>Uploading… {uploadPct}%</span>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <rect x="2" y="2" width="24" height="24" rx="4" stroke="#333" strokeWidth="1.5"/>
                  <path d="M9 14l3.5 3.5 6-7" stroke="#4ade80" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="mono" style={{ fontSize:11, color:"#4ade80" }}>Upload complete</span>
              </div>
            )}
          </>
        )}

        {/* Story tab: portrait frame */}
        {tab === "Story" && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
            <div style={{
              width:38, height:60, borderRadius:5,
              border: storyReady ? "1.5px solid rgba(225,48,108,.7)" : "1.5px dashed #333",
              background: storyReady ? "rgba(225,48,108,.1)" : "transparent",
              transition:"all .4s ease",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              {storyReady && <div style={{ width:18, height:28, borderRadius:3, background:"rgba(225,48,108,.25)" }} />}
            </div>
            <span className="mono" style={{ fontSize:10, color: storyReady ? "#e1306c" : "#555", transition:"color .4s" }}>9:16 · 15s max</span>
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      <div style={{ display:"flex", gap:8 }}>
        {[0,1,2].map(n => (
          <div key={n} style={{
            flex:1, height:48, borderRadius:6,
            background: tab === "Post" && slideCount > n ? SLIDE_COLORS[n] : "rgba(255,255,255,.03)",
            border:"1px solid #1e1e1e",
            transition:"background .35s ease",
          }}>
            {tab === "Post" && slideCount > n && (
              <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{ width:16, height:16, borderRadius:3, background:SLIDE_COLORS[n].replace(".18","1").replace(".14","1").replace(".12","1"), opacity:.4 }} />
              </div>
            )}
          </div>
        ))}
        <div style={{
          width:48, height:48, borderRadius:6, border:"1px dashed #2a2a2a",
          display:"flex", alignItems:"center", justifyContent:"center",
          opacity: tab === "Post" && slideCount >= 3 ? 1 : 0.3,
          transition:"opacity .4s ease",
        }}>
          <span style={{ color:"#444", fontSize:20, lineHeight:1 }}>+</span>
        </div>
      </div>
    </div>
  );
}

function ComposeTypingMockup() {
  const TEXT = "Just shipped a new feature 🚀 Thread-safe scheduling across all your favorite platforms. No more copy-paste marathons.";
  const MAX = 300;
  const PLATFORMS = [
    { domain: "bsky.app",       label: "bsky" },
    { domain: "threads.net",    label: "threads" },
    { domain: "instagram.com",  label: "instagram" },
  ];

  const [displayed, setDisplayed] = useState("");
  const [pillsVisible, setPillsVisible] = useState(0);
  const [phase, setPhase] = useState<"typing"|"pills"|"ready"|"scheduled"|"clearing">("typing");

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (phase === "typing") {
      if (displayed.length < TEXT.length) {
        t = setTimeout(() => setDisplayed(TEXT.slice(0, displayed.length + 1)), 36);
      } else {
        t = setTimeout(() => setPhase("pills"), 400);
      }
    } else if (phase === "pills") {
      if (pillsVisible < PLATFORMS.length) {
        t = setTimeout(() => setPillsVisible(v => v + 1), 260);
      } else {
        t = setTimeout(() => setPhase("ready"), 500);
      }
    } else if (phase === "ready") {
      t = setTimeout(() => setPhase("scheduled"), 1100);
    } else if (phase === "scheduled") {
      t = setTimeout(() => setPhase("clearing"), 1400);
    } else {
      t = setTimeout(() => { setDisplayed(""); setPillsVisible(0); setPhase("typing"); }, 500);
    }
    return () => clearTimeout(t);
  }, [phase, displayed, pillsVisible]);

  const isReady     = phase === "ready" || phase === "scheduled" || phase === "clearing";
  const isScheduled = phase === "scheduled" || phase === "clearing";

  return (
    <div className="feature-visual" style={{ background:"#111111", border:"1px solid #1e1e1e", borderRadius:16, padding:28 }}>
      <style>{`@keyframes ph-blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>

      {/* Compose box */}
      <div style={{ background:"#0a0a0a", borderRadius:10, border:"1px solid #1e1e1e", padding:20, marginBottom:16, minHeight:100 }}>
        <div style={{ fontSize:13, color:"#ededed", lineHeight:1.65, minHeight:80, wordBreak:"break-word" }}>
          {displayed}
          {phase === "typing" && (
            <span style={{ display:"inline-block", width:1.5, height:13, background:"#5b63d3", verticalAlign:"middle", marginLeft:1, animation:"ph-blink .75s step-end infinite" }} />
          )}
        </div>
      </div>

      {/* Platform pills */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16, minHeight:30 }}>
        {PLATFORMS.map((p, i) => (
          <div key={p.domain} style={{
            display:"flex", alignItems:"center", gap:6,
            padding:"4px 10px", borderRadius:6, fontSize:12,
            background:"rgba(91,99,211,.1)", border:"1px solid rgba(91,99,211,.2)",
            opacity: pillsVisible > i ? 1 : 0,
            transform: pillsVisible > i ? "translateY(0)" : "translateY(5px)",
            transition:"opacity .22s ease, transform .22s ease",
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://www.google.com/s2/favicons?domain=${p.domain}&sz=32`} alt={p.label} width={12} height={12} />
            <span style={{ color:"#9ba2ee" }}>{p.label}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span className="mono" style={{ fontSize:12, color: displayed.length > MAX * 0.9 ? "#e1306c" : "#888" }}>
          {displayed.length} / {MAX} chars
        </span>
        <div style={{
          fontSize:12, fontWeight:600, padding:"7px 18px", borderRadius:8,
          background: isScheduled ? "rgba(74,222,128,.12)" : isReady ? "#5b63d3" : "#1e1e1e",
          color: isScheduled ? "#4ade80" : "#fff",
          boxShadow: isReady && !isScheduled ? "0 0 18px rgba(91,99,211,.45)" : "none",
          transition:"background .35s ease, color .35s ease, box-shadow .35s ease",
        }}>
          {isScheduled ? "✓ Scheduled!" : "Schedule"}
        </div>
      </div>
    </div>
  );
}

function DragCalendarMockup() {
  // Row geometry is fixed pixels; column geometry is percentage-based (fills container)
  const CELL_H = 36;
  const GAP    = 3;
  const ROWS   = 5;

  // SRC = cell index 2  → row 0, col 2  (Jun 3)
  // DST = cell index 18 → row 2, col 4  (Jun 19)
  const SRC_COL = 2; const SRC_ROW = 0;
  const DST_COL = 4; const DST_ROW = 2;

  // Percentage X-centers of each column (7 columns, gaps negligible for %)
  const pct = (col: number) => `${(col + 0.5) / 7 * 100}%`;
  // Pixel Y-centers of each row
  const rowY = (row: number) => row * (CELL_H + GAP) + CELL_H / 2;

  const srcX = pct(SRC_COL); const srcY = rowY(SRC_ROW); // 18px
  const dstX = pct(DST_COL); const dstY = rowY(DST_ROW); // 92px

  // Card: left edge of source cell in % (same percentage scheme)
  const srcCellLeft = `${SRC_COL / 7 * 100}%`;
  const dstCellLeft = `${DST_COL / 7 * 100}%`;
  const srcCellTop  = SRC_ROW * (CELL_H + GAP) + 12;
  const dstCellTop  = DST_ROW * (CELL_H + GAP) + 12;

  const gridH = ROWS * (CELL_H + GAP) - GAP;

  const days = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const dots: Record<number, string> = {
    5: "#5b63d3", 8: "#e1306c",
    11: "#0085ff", 14: "#5b63d3",
    23: "#e1306c", 27: "#0085ff",
  };

  return (
    <div className="feature-visual" style={{ background:"#111111", border:"1px solid #1e1e1e", borderRadius:16, padding:24, overflow:"hidden" }}>
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
          0%,55%   { box-shadow:none; background:rgba(255,255,255,.015); }
          60%,70%  { box-shadow:0 0 0 2px #5b63d3; background:rgba(91,99,211,.14); }
          85%,100% { box-shadow:none; background:rgba(255,255,255,.015); }
        }
        @keyframes ph-toast {
          0%,65%   { opacity:0; transform:translateY(5px); }
          72%,78%  { opacity:1; transform:translateY(0); }
          88%,100% { opacity:0; transform:translateY(5px); }
        }
      `}</style>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <span style={{ fontSize:13, fontWeight:600, color:"#ededed" }}>June 2026</span>
        <span style={{ fontSize:11, color:"#555" }}>Month</span>
      </div>

      {/* Day headers — percentage columns, fills full width */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:GAP, marginBottom:GAP }}>
        {days.map(d => <div key={d} style={{ textAlign:"center", fontSize:9, color:"#555", padding:"3px 0" }}>{d}</div>)}
      </div>

      {/* Grid — percentage columns, fixed row heights, position:relative for overlays */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:GAP, position:"relative", height:gridH }}>
        {Array.from({ length:35 }, (_,i) => {
          const col = i % 7;
          const row = Math.floor(i / 7);
          const num = i + 1;
          const isToday = num === 21;
          const isDst   = col === DST_COL && row === DST_ROW;
          return (
            <div key={i} style={{
              height:CELL_H, borderRadius:6, padding:"3px 4px",
              boxSizing:"border-box",
              background: isToday ? "rgba(91,99,211,.18)" : "rgba(255,255,255,.015)",
              border: isToday ? "1px solid rgba(91,99,211,.4)" : "1px solid transparent",
              animation: isDst ? "ph-glow 3.8s ease-in-out infinite" : undefined,
            }}>
              <span style={{ fontSize:8, display:"block", textAlign:"right", lineHeight:1,
                color: isToday ? "#9ba2ee" : num > 30 ? "#2a2a2a" : "#555" }}>
                {num <= 30 ? num : num - 30}
              </span>
              {dots[i] && !(col === SRC_COL && row === SRC_ROW) && (
                <div style={{ height:3, marginTop:3, borderRadius:2, background:dots[i] }} />
              )}
            </div>
          );
        })}

        {/* Ghost dot — stays at source */}
        <div style={{
          position:"absolute", pointerEvents:"none",
          left:srcCellLeft, top:srcCellTop,
          width:"calc(100% / 7 - 4px)", height:3,
          borderRadius:2, background:"#0085ff",
          opacity:0, animation:"ph-ghost 3.8s ease-in-out infinite",
        }} />

        {/* Dragging card dot */}
        <div style={{
          position:"absolute", pointerEvents:"none", zIndex:10,
          left:srcCellLeft, top:srcCellTop,
          width:"calc(100% / 7 - 4px)", height:3,
          borderRadius:2, background:"#0085ff",
          boxShadow:"0 4px 12px rgba(0,133,255,.55)",
          animation:"ph-card 3.8s ease-in-out infinite",
        }} />

        {/* Cursor — left/top animated directly so percentages work */}
        <div style={{
          position:"absolute", pointerEvents:"none", zIndex:20,
          left:srcX, top:srcY,
          transformOrigin:"3px 2px",
          animation:"ph-cursor 3.8s ease-in-out infinite",
          marginLeft:-8, marginTop:-6,
        }}>
          <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
            <path d="M1 1l4.5 14 2.5-4.5 4.5-2.5L1 1z" fill="white" stroke="#1a1a1a" strokeWidth="1.2" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Toast */}
      <div style={{
        marginTop:10, padding:"6px 12px", borderRadius:8,
        background:"rgba(91,99,211,.12)", border:"1px solid rgba(91,99,211,.25)",
        fontSize:11.5, color:"#9ba2ee", display:"flex", alignItems:"center", gap:6,
        opacity:0, animation:"ph-toast 3.8s ease-in-out infinite",
      }}>
        <span>✓</span> Post rescheduled to Jun 19 — saved instantly
      </div>
    </div>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="8" cy="8" r="7" stroke="#5b63d3" strokeWidth="1.2"/>
      <path d="M5 8l2 2 4-4" stroke="#5b63d3" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function LayersIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 16.5l9 5 9-5"/></svg>;
}
function PlayIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5z" fill="currentColor" stroke="none"/></svg>;
}
function CalGridIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 3v4M16 3v4"/><rect x="7" y="13" width="5" height="4" rx="1" fill="currentColor" stroke="none"/></svg>;
}
function ChatIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M21 11.5a8 8 0 0 1-11.5 7.2L4 20l1.3-4.8A8 8 0 1 1 21 11.5z"/></svg>;
}
function PenIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>;
}
function ServerIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/></svg>;
}
function CsvIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="8" y1="9" x2="10" y2="9"/></svg>;
}
function McpIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><path d="M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>;
}
