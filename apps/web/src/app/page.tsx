"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { NavBar, PLATFORMS_NAV } from "../components/LandingNav";

const GITHUB_URL = "https://github.com/AstaBlackClove/posthive";

const PLATFORMS_GRID = [
  { name: "Bluesky",        domain: "bsky.app",        meta: "300 chars · AT Protocol",      accent: "#0085ff", platform: "bluesky" },
  { name: "Threads",        domain: "threads.net",     meta: "500 chars · Meta OAuth",       accent: "#e6e6e6", platform: "threads" },
  { name: "Instagram",      domain: "instagram.com",   meta: "Posts, Reels & Stories",       accent: "#e1306c", platform: "instagram" },
  { name: "LinkedIn",       domain: "linkedin.com",    meta: "3,000 chars · Professional",   accent: "#0a66c2", platform: "linkedin" },
  { name: "Mastodon",       domain: "mastodon.social", meta: "500 chars · Federated",        accent: "#6364ff", platform: "mastodon" },
  { name: "YouTube",        domain: "youtube.com",     meta: "Shorts & video · Google OAuth", accent: "#ff0000", platform: "youtube" },
  { name: "Facebook Pages", domain: "facebook.com",    meta: "Pages · Graph API",            accent: "#1877f2", platform: "facebook" },
];

const PLANS = [
  {
    id: "creator",
    name: "Creator",
    desc: "For solo creators finding their rhythm.",
    inr: "₹550", usd: "$9",
    features: ["3 connected accounts", "400 posts / month", "Calendar & drag-reschedule", "First comment scheduling", "No API access"],
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    desc: "For power users posting at scale.",
    inr: "₹1,700", usd: "$29",
    features: ["15 connected accounts", "Unlimited posts", "Reels & Stories support", "Per-platform overrides", "API access (3 keys)"],
    popular: true,
  },
  {
    id: "team",
    name: "Team",
    desc: "For agencies managing multiple brands.",
    inr: "₹2,600", usd: "$49",
    features: ["50 connected accounts", "Unlimited posts", "Team roles & approvals", "Priority support", "API access (10 keys)"],
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

export default function RootPage() {
  const { user } = useAuth();
  const isIndia = useIsIndia();
  const ctaHref = user ? "/compose" : "/register";
  const ctaLabel = user ? "Go to scheduler" : "Get started free";
  const navCtaLabel = user ? "Go to scheduler" : "Get started free";

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

        @keyframes glowpulse {
          0%, 100% { opacity: .85; }
          50% { opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .anim-1 { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) both; }
        .anim-2 { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) .1s both; }
        .anim-3 { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) .2s both; }
        .anim-4 { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) .3s both; }
        .anim-5 { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) .4s both; }

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
          .ph-footer-inner { flex-direction: column !important; gap: 40px !important; }
          .ph-foot-cols { gap: 32px !important; }
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
          .ph-feature-detail-row { grid-template-columns: 1fr !important; direction: ltr !important; }
          .ph-feature-detail-row > * { direction: ltr !important; }
        }
        @media (max-width: 480px) {
          .ph-platforms-grid { grid-template-columns: 1fr !important; }
          .ph-selfhost-btns { flex-direction: row !important; flex-wrap: wrap !important; }
        }
      `}</style>

      <NavBar user={!!user} ctaHref={ctaHref} navCtaLabel={navCtaLabel} />

      <div style={{ paddingTop: 64 }}>

        {/* ── HERO ── */}
        <section className="ph-section" style={{ position: "relative", overflow: "hidden", padding: "110px 40px 80px" }}>
          <div style={{
            position: "absolute", top: -80, left: "50%", transform: "translateX(-50%)",
            width: 900, height: 620,
            background: "radial-gradient(ellipse at center, rgba(91,99,211,.28), rgba(91,99,211,.06) 45%, transparent 70%)",
            filter: "blur(30px)", pointerEvents: "none",
            animation: "glowpulse 6s ease-in-out infinite",
          }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 0%, rgba(255,255,255,.03), transparent 40%)", pointerEvents: "none" }} />

          <div style={{ maxWidth: 920, margin: "0 auto", textAlign: "center", position: "relative" }}>

            <h1 className="anim-2 ph-hero-h1" style={{ fontSize: 72, lineHeight: 1.03, fontWeight: 800, letterSpacing: "-0.035em", margin: "0 0 24px", color: "#f4f4f4" }}>
              Schedule to every platform.<br />
              <span style={{ color: "#8b8b8b" }}>From one place.</span>
            </h1>

            <p className="anim-3" style={{ fontSize: 19, lineHeight: 1.6, color: "#8f8f8f", maxWidth: 600, margin: "0 auto 38px", fontWeight: 400 }}>
              Write once and publish everywhere. One composer, one calendar, zero tab-switching.
            </p>

            <div className="anim-4 ph-hero-cta" style={{ display: "flex", gap: 14, justifyContent: "center", alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
              <Link href={ctaHref} className="ph-btn-primary">
                {ctaLabel}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </Link>
              <Link href="/docs" className="ph-btn-secondary">View docs</Link>
            </div>

            {!user && (
              <p className="anim-5 mono" style={{ fontSize: 13, color: "#666", margin: "0 0 52px" }}>14-day free trial · no card required</p>
            )}

            <div className="anim-5" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, flexWrap: "wrap", marginTop: user ? 52 : 0 }}>
              <span className="mono" style={{ fontSize: 11, letterSpacing: ".14em", color: "#5f5f5f", fontWeight: 600 }}>PUBLISH TO</span>
              {PLATFORMS_GRID.map(p => (
                <span key={p.platform} style={{ display: "inline-flex", alignItems: "center" }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: "#131313", border: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://www.google.com/s2/favicons?domain=${p.domain}&sz=64`} alt={p.name} width={17} height={17} style={{ display: "block" }} />
                  </span>
                </span>
              ))}
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
            {[["7", " platforms"], ["1", " composer"], ["14-day", " free trial"], ["No card", " required"]].map(([val, label]) => (
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
              { icon: <LayersIcon />, title: "Multi-platform posting",       href: "/features/multi-platform-posting",  body: "Draft once and ship to all seven networks in a single click." },
              { icon: <PlayIcon />,   title: "Reels & Stories scheduling",   href: "/features/reels-and-stories",       body: "Full Instagram media support plus YouTube Shorts with native previews." },
              { icon: <CalGridIcon />,title: "Drag-to-reschedule calendar",  href: "/features/drag-to-reschedule",      body: "See your whole week at a glance. Drag any post to a new slot in seconds." },
              { icon: <ChatIcon />,   title: "First comment automation",     href: "/features/first-comment",           body: "Drop a reply the moment a post goes live hashtags, links, threads." },
              { icon: <PenIcon />,    title: "Per-platform text overrides",  href: "/features/per-platform-overrides",  body: "Tweak copy and media per network without leaving the composer." },
              { icon: <ServerIcon />, title: "Reliable scheduling",          href: "/features/multi-platform-posting",  body: "Posts fire at the exact second. BullMQ-backed queue with automatic retries." },
              { icon: <CsvIcon />,    title: "Bulk CSV scheduling",          href: "/features/bulk-csv-scheduling",     body: "Upload a CSV and schedule hundreds of posts at once. Exclude platforms per row with !platform syntax." },
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
            <div className="feature-visual" style={{ background: "#111111", border: "1px solid #1e1e1e", borderRadius: 16, padding: 28 }}>
              <div style={{ background: "#0a0a0a", borderRadius: 10, border: "1px solid #1e1e1e", padding: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: "#ededed", lineHeight: 1.65, minHeight: 80 }}>
                  Just shipped a new feature 🚀 Thread-safe scheduling across all your favorite platforms. No more copy-paste marathons.
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                {["bsky.app", "threads.net", "instagram.com"].map(d => (
                  <div key={d} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 6, background: "rgba(91,99,211,.1)", border: "1px solid rgba(91,99,211,.2)", fontSize: 12 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://www.google.com/s2/favicons?domain=${d}&sz=32`} alt={d} width={12} height={12} />
                    <span style={{ color: "#9ba2ee" }}>{d.split(".")[0]}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="mono" style={{ fontSize: 12, color: "#888" }}>287 / 300 chars</span>
                <div style={{ background: "#5b63d3", color: "#fff", fontSize: 12, fontWeight: 600, padding: "7px 18px", borderRadius: 8 }}>Schedule</div>
              </div>
            </div>
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
            <div className="feature-visual" style={{ background: "#111111", border: "1px solid #1e1e1e", borderRadius: 16, padding: 28, direction: "ltr" }}>
              <div style={{ marginBottom: 20 }}>
                <div className="mono" style={{ fontSize: 11, color: "#666", marginBottom: 10, letterSpacing: ".08em" }}>POST TYPE</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Post", "Reel", "Story"].map((t, i) => (
                    <div key={t} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 8, border: i === 1 ? "1px solid rgba(91,99,211,.4)" : "1px solid #1e1e1e", background: i === 1 ? "rgba(91,99,211,.1)" : "transparent", fontSize: 13, color: i === 1 ? "#9ba2ee" : "#666", fontWeight: i === 1 ? 600 : 400 }}>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ border: "1px dashed #2a2a2a", borderRadius: 10, height: 110, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20 }}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="2" y="2" width="24" height="24" rx="4" stroke="#333" strokeWidth="1.5"/><path d="M10 14l3 3 5-6" stroke="#5b63d3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span className="mono" style={{ fontSize: 11, color: "#555" }}>Drop video here</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2, 3].map(n => (
                  <div key={n} style={{ flex: 1, height: 48, borderRadius: 6, background: `rgba(91,99,211,${0.05 * n + 0.05})`, border: "1px solid #1e1e1e" }} />
                ))}
                <div style={{ width: 48, height: 48, borderRadius: 6, border: "1px dashed #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#444", fontSize: 20, lineHeight: 1 }}>+</span>
                </div>
              </div>
            </div>
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
                See your entire content pipeline on a month, week, or day calendar. Drag any scheduled post to a new date and time — the job is rescheduled server-side in real time.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["Month, week, and day views", "Drag-and-drop rescheduling", "Color-coded by platform"].map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#ccc" }}>
                    <CheckCircleIcon />{item}
                  </div>
                ))}
              </div>
            </div>
            <div className="feature-visual" style={{ background: "#111111", border: "1px solid #1e1e1e", borderRadius: 16, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#ededed" }}>June 2026</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 4 }}>
                {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
                  <div key={d} style={{ textAlign: "center", fontSize: 10, color: "#555", padding: "4px 0" }}>{d}</div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
                {Array.from({ length: 35 }, (_, i) => {
                  const num = i + 1;
                  const hasPost = [3, 7, 10, 15, 17, 22, 24, 28].includes(num);
                  const isToday = num === 29;
                  return (
                    <div key={i} style={{ minHeight: 34, borderRadius: 6, background: isToday ? "rgba(91,99,211,.18)" : "rgba(255,255,255,.015)", border: isToday ? "1px solid rgba(91,99,211,.4)" : "1px solid transparent", padding: 3, display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 9, color: isToday ? "#9ba2ee" : num > 30 ? "#2a2a2a" : "#555", textAlign: "right", lineHeight: 1 }}>{num <= 30 ? num : num - 30}</span>
                      {hasPost && num <= 30 && (
                        <div style={{ height: 3, borderRadius: 2, background: num % 3 === 0 ? "#5b63d3" : num % 3 === 1 ? "#0085ff" : "#e1306c" }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURE DEEP-DIVE: 4 FIRST COMMENT ── */}
        <section style={{ borderTop: "1px solid #161616" }}>
          <div className="ph-feature-detail-row ph-section" style={{ maxWidth: 1100, margin: "0 auto", padding: "88px 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", direction: "rtl" }}>
            <div style={{ direction: "ltr" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", border: "1px solid #26264a", background: "#17172a", borderRadius: 999, marginBottom: 20 }}>
                <span className="mono" style={{ fontSize: 11.5, color: "#8b91e8", fontWeight: 600, letterSpacing: ".08em" }}>FIRST COMMENT</span>
              </div>
              <h2 style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.025em", margin: "0 0 16px", color: "#f2f2f2", lineHeight: 1.2 }}>Auto-post the<br />perfect reply</h2>
              <p style={{ color: "#888", lineHeight: 1.75, fontSize: 16, marginBottom: 24 }}>
                Add a first comment that fires immediately after your post goes live. Use it for hashtag stacks, affiliate links, thread continuations, or CTAs you don&apos;t want cluttering your main copy.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["Fires within seconds of the main post", "Per-platform override supported", "Perfect for hashtag stacking on Instagram"].map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#ccc" }}>
                    <CheckCircleIcon />{item}
                  </div>
                ))}
              </div>
            </div>
            <div className="feature-visual" style={{ background: "#111111", border: "1px solid #1e1e1e", borderRadius: 16, padding: 28, direction: "ltr" }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#5b63d3,#9ba2ee)", flexShrink: 0 }} />
                  <div style={{ width: 2, flex: 1, background: "#1e1e1e", marginTop: 6 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#ededed" }}>yourhandle <span style={{ fontWeight: 400, color: "#666" }}>· just now</span></div>
                  <div style={{ fontSize: 13, color: "#bbb", lineHeight: 1.6 }}>
                    Shipping features faster than ever with Posthive. The async workflow is a game-changer.
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 16 }}>
                    {[["♥","24"],["↩","6"],["⇅","3"]].map(([icon, count]) => (
                      <span key={icon} style={{ fontSize: 12, color: "#555", display: "flex", alignItems: "center", gap: 4 }}>{icon} {count}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#5b63d3,#9ba2ee)", flexShrink: 0 }} />
                <div style={{ flex: 1, background: "rgba(91,99,211,.07)", border: "1px solid rgba(91,99,211,.2)", borderRadius: 10, padding: "10px 14px" }}>
                  <div className="mono" style={{ fontSize: 11, color: "#8b91e8", fontWeight: 600, marginBottom: 6, letterSpacing: ".04em" }}>FIRST COMMENT · AUTO-POSTED</div>
                  <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>
                    #buildinpublic #saas #indiedev #productivity #scheduling
                  </div>
                </div>
              </div>
            </div>
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
            <div className="feature-visual" style={{ background: "#111111", border: "1px solid #1e1e1e", borderRadius: 16, padding: 28 }}>
              {[
                { domain: "bsky.app", label: "Bluesky", active: true, text: "Long-form thoughts on async content workflows and why scheduling beats publishing live..." },
                { domain: "threads.net", label: "Threads", active: false, text: "Hot take: scheduled posts perform better than live ones. Here's why 👇" },
              ].map(p => (
                <div key={p.label} style={{ marginBottom: 14, borderRadius: 10, border: p.active ? "1px solid rgba(91,99,211,.35)" : "1px solid #1e1e1e", background: p.active ? "rgba(91,99,211,.06)" : "transparent", padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://www.google.com/s2/favicons?domain=${p.domain}&sz=32`} alt={p.label} width={14} height={14} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: p.active ? "#9ba2ee" : "#777" }}>{p.label}</span>
                    {p.active && <span className="mono" style={{ marginLeft: "auto", fontSize: 10, color: "#8b91e8", background: "rgba(91,99,211,.12)", padding: "2px 8px", borderRadius: 999, letterSpacing: ".04em" }}>OVERRIDE ACTIVE</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#777", lineHeight: 1.6 }}>{p.text}</div>
                </div>
              ))}
              <div className="mono" style={{ textAlign: "center", fontSize: 11, color: "#555" }}>+ 3 more accounts using global copy</div>
            </div>
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
            <div className="feature-visual" style={{ background: "#111111", border: "1px solid #1e1e1e", borderRadius: 16, padding: 24, direction: "ltr" }}>
              <div className="mono" style={{ fontSize: 11, color: "#555", marginBottom: 10, letterSpacing: ".06em" }}>CSV PREVIEW</div>
              {[
                { date: "Aug 1 · 09:00", text: "Good morning 🌅", accounts: "all", status: "ready" },
                { date: "Aug 2 · 14:30", text: "Check the blog post", accounts: "bluesky|mastodon", status: "ready" },
                { date: "Aug 3 · 18:00", text: "Skip Instagram today", accounts: "!instagram", status: "ready" },
                { date: "Aug 4 · 10:00", text: "Two images 🖼️", accounts: "threads", status: "ready" },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 3 ? "1px solid #1a1a1a" : "none" }}>
                  <span className="mono" style={{ fontSize: 11, color: "#555", minWidth: 90 }}>{row.date}</span>
                  <span style={{ flex: 1, fontSize: 12, color: "#bbb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.text}</span>
                  <span className="mono" style={{ fontSize: 10, color: "#666", minWidth: 70, textAlign: "right" }}>{row.accounts}</span>
                  <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 600 }}>✓</span>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: "rgba(91,99,211,.08)", border: "1px solid rgba(91,99,211,.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#9ba2ee" }}>4 valid · 0 errors</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: "#5b63d3", padding: "5px 14px", borderRadius: 6 }}>Schedule 4 posts</span>
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
                Seven networks. One workflow.
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://www.google.com/s2/favicons?domain=${p.domain}&sz=64`} alt={p.name} width={22} height={22} style={{ display: "block" }} />
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
              { n: "01", title: "Connect your accounts",  desc: "Authenticate all seven networks in a couple of clicks. OAuth, encrypted at rest." },
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
            <p style={{ fontSize: 18, fontWeight: 700, color: "#ededed", margin: "0 0 4px" }}>hey, I&apos;m Guna</p>
            <p className="mono" style={{ fontSize: 13, color: "#888", margin: "0 0 24px" }}>frontend dev by day · indie builder by night</p>
            <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: 14.5, color: "#888", lineHeight: 1.7, margin: 0 }}>
                I was building in public — sharing updates on Bluesky, Threads, LinkedIn, and Mastodon at the same time. Copy-pasting the same post into five different apps every single day.
              </p>
              <p style={{ fontSize: 14.5, color: "#888", lineHeight: 1.7, margin: 0 }}>
                Every tool I tried was either too expensive, too bloated, or didn&apos;t support the platforms I actually used. None of them felt like they were built for indie builders.
              </p>
              <p style={{ fontSize: 14.5, color: "#888", lineHeight: 1.7, margin: 0 }}>
                So I built Posthive — focused on the platforms that matter to creators. Schedule once, post everywhere.
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
              <h2 style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.03em", margin: "16px 0 14px", color: "#f2f2f2" }}>Pay for what you need</h2>
              <p style={{ fontSize: 17, color: "#8a8a8a", margin: 0 }}>14-day free trial on every plan. Cancel anytime.</p>
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
                    <span style={{ fontSize: 38, fontWeight: 700, color: "#f2f2f2", letterSpacing: "-0.02em" }}>
                      {isIndia ? plan.inr : plan.usd}
                    </span>
                    <span style={{ fontSize: 14, color: "#777" }}>/mo · {isIndia ? `≈ ${plan.usd}` : `≈ ${plan.inr}`}</span>
                  </div>
                  <Link href={ctaHref} className={plan.popular ? "ph-plan-btn-pro" : "ph-plan-btn"}>
                    {user ? "Go to scheduler" : "Start free trial"}
                  </Link>
                  <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                    {plan.features.map(f => {
                      const isNo = f.startsWith("No ");
                      return (
                        <span key={f} style={{ display: "flex", gap: 9, alignItems: "center", fontSize: 13.5, color: isNo ? "#555" : plan.popular ? "#cfcfcf" : "#b4b4b4" }}>
                          {isNo
                            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2.6"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5b63d3" strokeWidth="2.6"><path d="M5 12l5 5L20 6"/></svg>
                          }
                          {f}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </Link>
              <Link href="/docs" className="ph-btn-secondary" style={{ fontSize: 16, padding: "15px 28px" }}>View docs</Link>
            </div>
            <p className="mono" style={{ fontSize: 12, color: "#444", marginTop: 20 }}>
              14-day free trial · no card required · <a href={GITHUB_URL} target="_blank" rel="noopener" style={{ color: "#444", textDecoration: "none" }}>open source</a>
            </p>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{ borderTop: "1px solid #161616", background: "#0a0a0a" }}>
          <div className="ph-footer-inner" style={{ maxWidth: 1120, margin: "0 auto", padding: "56px 40px 40px", display: "flex", justifyContent: "space-between", gap: 48, flexWrap: "wrap" }}>
            <div style={{ maxWidth: 280 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <Image src="/posthivemain.png" alt="Posthive" width={26} height={26} style={{ objectFit: "contain" }} />
                <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>Posthive</span>
              </div>
              <p style={{ fontSize: 13.5, color: "#7a7a7a", lineHeight: 1.6, margin: 0 }}>
                Schedule to every platform from a single composer. Built for creators and teams.
              </p>
            </div>
            <div className="ph-foot-cols" style={{ display: "flex", gap: 64, flexWrap: "wrap" }}>
              <FootCol title="PRODUCT" links={[
                { label: "Pricing",      href: "/#pricing" },
                { label: "Docs",         href: "/docs" },
              ]} />
              <FootCol title="PLATFORMS" links={PLATFORMS_NAV.map(p => ({ label: p.label, href: `/platforms/${p.platform}` }))} />
              <FootCol title="COMPANY" links={[
                { label: "Contact", href: "mailto:gunasheelan208@gmail.com", external: true },
                { label: "Privacy", href: "/privacy" },
                { label: "Terms",   href: "/terms" },
              ]} />
            </div>
          </div>
          <div style={{ borderTop: "1px solid #161616" }}>
            <div style={{ maxWidth: 1120, margin: "0 auto", padding: "20px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <span className="mono" style={{ fontSize: 12.5, color: "#666" }}>© 2026 Posthive. All rights reserved.</span>
              <span className="mono" style={{ fontSize: 12.5, color: "#666" }}>Built for creators, by an indie builder.</span>
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
