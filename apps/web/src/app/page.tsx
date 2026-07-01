"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { PlatformIcon } from "../components/PlatformIcon";
import { NavBar, PLATFORMS_NAV } from "../components/LandingNav";

const GITHUB_URL = "https://github.com/AstaBlackClove/posthive";

const PLANS = [
  {
    id: "creator",
    name: "Creator",
    desc: "For solo creators finding their rhythm.",
    inr: "₹550", usd: "$9",
    features: ["3 connected accounts", "400 posts / month", "Calendar & drag-reschedule", "First comment scheduling"],
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    desc: "For power users posting at scale.",
    inr: "₹1,700", usd: "$29",
    features: ["15 connected accounts", "Unlimited posts", "Reels & Stories support", "Per-platform overrides"],
    popular: true,
  },
  {
    id: "team",
    name: "Team",
    desc: "For agencies managing multiple brands.",
    inr: "₹2,600", usd: "$49",
    features: ["50 connected accounts", "Unlimited posts", "Team roles & approvals", "Priority support"],
    popular: false,
  },
];

function useIsIndia() {
  const [india, setIndia] = useState(true); // default INR to avoid layout shift
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
  const ctaLabel = user ? "Go to scheduler →" : "Start for free →";
  const navCtaLabel = user ? "Go to scheduler" : "Start for free";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; overflow-x: hidden; width: 100%; }
        body {
          background: #0a0a0a;
          color: #ededed;
          font-family: 'Geist', system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
          width: 100%;
        }
        a { color: inherit; text-decoration: none; }
        ::selection { background: rgba(91,99,211,.35); }

        /* ── animations ── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes glowPulse {
          0%,100% { opacity: .5; transform: translateX(-50%) scale(1); }
          50%      { opacity: .8; transform: translateX(-50%) scale(1.08); }
        }
        @keyframes floatY {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @keyframes borderGlow {
          0%,100% { box-shadow: 0 0 0 1px rgba(91,99,211,.25), 0 30px 80px -30px rgba(91,99,211,.4); }
          50%      { box-shadow: 0 0 0 1px rgba(91,99,211,.5),  0 30px 80px -30px rgba(91,99,211,.7); }
        }

        .anim-1 { animation: fadeUp .65s cubic-bezier(.22,1,.36,1) both; }
        .anim-2 { animation: fadeUp .65s cubic-bezier(.22,1,.36,1) .12s both; }
        .anim-3 { animation: fadeUp .65s cubic-bezier(.22,1,.36,1) .22s both; }
        .anim-4 { animation: fadeUp .65s cubic-bezier(.22,1,.36,1) .34s both; }
        .anim-5 { animation: fadeUp .65s cubic-bezier(.22,1,.36,1) .44s both; }
        .anim-fade { animation: fadeIn .8s ease both; }

        /* ── nav ── */
        .nav-link { font-size: 14px; color: #888; transition: color .15s; }
        .nav-link:hover { color: #ededed; }

        /* ── hero gradient text ── */
        .hero-gradient {
          background: linear-gradient(135deg, #ffffff 0%, #c7caff 45%, #5b63d3 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* ── platform chips ── */
        .platform-chip {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 8px 16px; border-radius: 999px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
          font-size: 13px; color: #cfcfcf;
          transition: border-color .2s, background .2s;
        }
        .platform-chip:hover { border-color: rgba(91,99,211,.4); background: rgba(91,99,211,.06); }

        /* ── feature cards ── */
        .feature-card {
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.07);
          background: #111;
          padding: 28px;
          transition: border-color .25s, transform .25s;
        }
        .feature-card:hover { border-color: rgba(91,99,211,.4); transform: translateY(-3px); }

        .feature-card-accent {
          border-radius: 14px;
          border: 1px solid rgba(91,99,211,.3);
          background: linear-gradient(160deg, rgba(91,99,211,.1) 0%, #111 60%);
          padding: 28px;
          transition: border-color .25s, transform .25s;
        }
        .feature-card-accent:hover { border-color: rgba(91,99,211,.55); transform: translateY(-3px); }

        /* ── buttons ── */
        .btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 15px; font-weight: 600;
          padding: 14px 28px; border-radius: 11px;
          background: #5b63d3; color: #fff;
          box-shadow: 0 0 0 1px rgba(255,255,255,.08), 0 14px 40px -10px rgba(91,99,211,.9);
          transition: background .15s, transform .15s, box-shadow .15s;
        }
        .btn-primary:hover {
          background: #6970e0;
          transform: translateY(-1px);
          box-shadow: 0 0 0 1px rgba(255,255,255,.1), 0 18px 50px -10px rgba(91,99,211,.95);
        }

        /* ── plan cards ── */
        .plan-card { border-radius: 16px; border: 1px solid rgba(255,255,255,.1); background: #111; padding: 32px 28px; }
        .plan-card-popular {
          border-radius: 16px;
          border: 1px solid rgba(91,99,211,.5);
          background: linear-gradient(180deg, rgba(91,99,211,.12) 0%, #111 100%);
          padding: 32px 28px;
          position: relative;
          animation: borderGlow 4s ease-in-out infinite;
        }
        .plan-btn-primary {
          display: block; text-align: center;
          font-size: 14px; font-weight: 600;
          padding: 12px; border-radius: 9px;
          background: #5b63d3; color: #fff;
          margin-bottom: 26px;
          box-shadow: 0 8px 24px -8px rgba(91,99,211,.8);
          transition: background .15s;
        }
        .plan-btn-primary:hover { background: #6970e0; }
        .plan-btn-secondary {
          display: block; text-align: center;
          font-size: 14px; font-weight: 500;
          padding: 12px; border-radius: 9px;
          border: 1px solid rgba(255,255,255,.14);
          background: rgba(255,255,255,.03); color: #ededed;
          margin-bottom: 26px;
          transition: background .15s;
        }
        .plan-btn-secondary:hover { background: rgba(255,255,255,.08); }

        /* ── footer ── */
        .footer-link { font-size: 14px; color: #999; transition: color .15s; }
        .footer-link:hover { color: #ededed; }

        /* ── screenshot float ── */
        .screenshot-float { animation: floatY 6s ease-in-out infinite; }

        /* ── section fade-in on scroll ── */
        .section-reveal {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity .7s cubic-bezier(.22,1,.36,1), transform .7s cubic-bezier(.22,1,.36,1);
        }
        .section-reveal.visible { opacity: 1; transform: none; }

        /* ── mobile responsive overrides ── */
        @media (max-width: 900px) {
          .ph-features-grid, .ph-how-grid, .ph-pricing-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          .ph-hero-section { padding: 90px 20px 70px !important; }
          .ph-hero-title { font-size: clamp(2.2rem, 9vw, 3.2rem) !important; }
          .ph-hero-sub { font-size: 16px !important; padding: 0 8px; }
          .ph-section { padding-left: 20px !important; padding-right: 20px !important; }
          .ph-section-heading { font-size: clamp(1.7rem, 7vw, 2.2rem) !important; }
          .ph-cta-banner { padding: 48px 24px !important; }
          .ph-cta-title { font-size: clamp(1.6rem, 7vw, 2.2rem) !important; }
          .ph-foot-bottom { flex-direction: column !important; align-items: flex-start !important; gap: 14px !important; }
        }
        @media (max-width: 480px) {
          .ph-hero-screenshot { padding: 0 12px; }
        }
      `}</style>

      <NavBar user={!!user} ctaHref={ctaHref} navCtaLabel={navCtaLabel} />

      {/* page content — padded for fixed nav */}
      <div style={{ paddingTop: 65 }}>

        {/* ── HERO ── */}
        <section className="ph-hero-section" style={{ position: "relative", padding: "110px 40px 100px", textAlign: "center", overflow: "hidden", maxWidth: "100vw" }}>
          {/* glow blob */}
          <div style={{
            position: "absolute", top: -60, left: "50%",
            width: 900, height: 600,
            background: "radial-gradient(ellipse at center, rgba(91,99,211,.45) 0%, transparent 70%)",
            filter: "blur(50px)",
            animation: "glowPulse 7s ease-in-out infinite",
            pointerEvents: "none",
          }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 0%, rgba(91,99,211,.07) 0%, transparent 50%)", pointerEvents: "none" }} />

          <div style={{ position: "relative", maxWidth: 900, margin: "0 auto" }}>

            <h1 className="anim-2 ph-hero-title" style={{ fontSize: 80, lineHeight: 1, fontWeight: 800, letterSpacing: "-.04em", marginBottom: 26 }}>
              Stop copy-pasting.<br />
              <span className="hero-gradient">Start owning your reach.</span>
            </h1>

            <p className="anim-3 ph-hero-sub" style={{ fontSize: 19, lineHeight: 1.65, color: "#888", maxWidth: 520, margin: "0 auto 44px" }}>
              Write once, schedule everywhere at the right time, every time, without the tab-switching chaos.
            </p>

            <div className="anim-4" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <Link href={ctaHref} className="btn-primary" style={{ fontSize: 16, padding: "15px 32px" }}>
                {ctaLabel}
              </Link>
              {!user && (
                <span style={{ fontSize: 13, color: "#555", fontFamily: "'Geist Mono', monospace" }}>
                  14-day free trial
                </span>
              )}
            </div>

            <div className="anim-5" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 56 }}>
              <span style={{ fontSize: 11, color: "#555", fontFamily: "'Geist Mono', monospace", letterSpacing: ".1em", marginRight: 4 }}>PUBLISH TO</span>
              {(["bluesky", "threads", "instagram", "linkedin", "mastodon", "youtube"] as const).map(p => (
                <span key={p} className="platform-chip">
                  <PlatformIcon platform={p} size={16} />
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </span>
              ))}
            </div>
          </div>

          {/* product screenshot */}
          <div className="screenshot-float anim-fade ph-hero-screenshot" style={{ position: "relative", maxWidth: 1060, margin: "80px auto 0" }}>
            <div style={{ position: "absolute", inset: -2, borderRadius: 18, background: "linear-gradient(180deg, rgba(91,99,211,.6) 0%, transparent 50%)", filter: "blur(3px)", pointerEvents: "none" }} />
            <div style={{ position: "relative", borderRadius: 18, border: "1px solid rgba(255,255,255,.1)", background: "#111", padding: 10, boxShadow: "0 60px 140px -40px rgba(91,99,211,.5)" }}>
              <div style={{ borderRadius: 10, overflow: "hidden", lineHeight: 0 }}>
                <Image
                  src="/app-screenshot.png"
                  alt="Posthive composer — schedule posts across all platforms"
                  width={1040}
                  height={720}
                  style={{ width: "100%", height: "auto", display: "block", borderRadius: 10 }}
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" className="ph-section" style={{ padding: "120px 40px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 70 }}>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: "#5b63d3", letterSpacing: ".14em" }}>FEATURES</span>
            <h2 className="ph-section-heading" style={{ fontSize: 48, fontWeight: 700, letterSpacing: "-.03em", margin: "14px 0 16px" }}>
              Built for creators who actually post
            </h2>
            <p style={{ fontSize: 18, color: "#777", maxWidth: 500, margin: "0 auto" }}>
              Every tool you need to show up consistently without the manual grind.
            </p>
          </div>
          <div className="ph-features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {[
              { icon: <SunIcon />, title: "6 platforms, one composer", body: "Draft once and ship to Bluesky, Threads, Instagram, LinkedIn, Mastodon and YouTube in a single click." },
              { icon: <InstagramIcon />, title: "Reels, Stories & Shorts", body: "Full Instagram support (Reels, Stories, feed posts) plus YouTube Shorts all with live native previews." },
              { icon: <CalendarIcon />, title: "Drag-to-reschedule calendar", body: "See your whole content week at a glance. Drag any post to a new time slot in seconds." },
              { icon: <CommentIcon />, title: "First comment on autopilot", body: "Drop a reply the moment a post goes live perfect for hashtags, threads or a link in comments." },
              { icon: <SlidersIcon />, title: "Per-platform overrides", body: "Different character limits, different audiences. Tweak text and media per network without leaving the composer." },
              { icon: <CodeIcon />, title: "Self-host for free, forever", body: "Fully open source under AGPL-3.0. Run it on your own server your data, your rules, no monthly bill.", accent: true },
            ].map(({ icon, title, body, accent }) => (
              <div key={title} className={accent ? "feature-card-accent" : "feature-card"}>
                <FeatureIcon>{icon}</FeatureIcon>
                <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 9, letterSpacing: "-.01em" }}>{title}</h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "#777" }}>{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how" className="ph-section" style={{ borderTop: "1px solid rgba(255,255,255,.06)", borderBottom: "1px solid rgba(255,255,255,.06)", background: "#0c0c0c", padding: "100px 40px" }}>
          <div style={{ maxWidth: 1180, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 70 }}>
              <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: "#5b63d3", letterSpacing: ".14em" }}>HOW IT WORKS</span>
              <h2 className="ph-section-heading" style={{ fontSize: 48, fontWeight: 700, letterSpacing: "-.03em", marginTop: 14 }}>
                From zero to scheduled in minutes
              </h2>
            </div>
            <div className="ph-how-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 32 }}>
              {[
                { n: "01", title: "Connect your accounts", desc: "Authenticate Bluesky, Threads, Instagram, LinkedIn, Mastodon and YouTube in a couple of clicks OAuth, encrypted at rest." },
                { n: "02", title: "Compose & tailor", desc: "Write once. Then fine-tune copy and media per platform inside the same composer. Preview exactly what each network will show." },
                { n: "03", title: "Set it and forget it", desc: "Pick a date and time Posthive fires on the second. Drag to reschedule from the calendar if plans change." },
              ].map(({ n, title, desc }) => (
                <div key={n} style={{ borderLeft: "1px solid rgba(91,99,211,.25)", paddingLeft: 28 }}>
                  <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 13, color: "#5b63d3", marginBottom: 16, fontWeight: 500 }}>{n}</div>
                  <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, letterSpacing: "-.02em" }}>{title}</h3>
                  <p style={{ fontSize: 15, lineHeight: 1.65, color: "#777" }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FOUNDER ── */}
        <section style={{ padding: "80px 40px", maxWidth: 600, margin: "0 auto" }}>
          <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 20, padding: "40px 36px", textAlign: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://pbs.twimg.com/profile_images/2051139493441540096/MaZHw9f4_400x400.jpg"
              alt="Guna — founder of Posthive"
              width={72}
              height={72}
              style={{ borderRadius: "50%", border: "3px solid #2a2a2a", display: "block", margin: "0 auto 16px" }}
            />
            <p style={{ fontSize: 18, fontWeight: 700, color: "#ededed", margin: "0 0 4px" }}>hey, I&apos;m Guna</p>
            <p style={{ fontSize: 13, color: "#888", fontFamily: "'Geist Mono', monospace", margin: "0 0 24px" }}>
              frontend dev by day · indie builder by night
            </p>
            <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: 14.5, color: "#888", lineHeight: 1.7, margin: 0 }}>
                I was building in public — sharing updates on Bluesky, Threads, LinkedIn, and Mastodon at the same time. Copy-pasting the same post into five different apps every single day.
              </p>
              <p style={{ fontSize: 14.5, color: "#888", lineHeight: 1.7, margin: 0 }}>
                Every tool I tried was either too expensive, too bloated, or didn&apos;t support the platforms I actually used. None of them felt like they were built for indie builders.
              </p>
              <p style={{ fontSize: 14.5, color: "#888", lineHeight: 1.7, margin: 0 }}>
                So I built Posthive — open source, self-hostable, and focused on the platforms that matter to creators. Schedule once, post everywhere.
              </p>
              <p style={{ fontSize: 14.5, color: "#ededed", lineHeight: 1.7, margin: 0, fontWeight: 500 }}>
                if it saves you time too, that&apos;s the whole point.
              </p>
            </div>
            <a
              href="https://x.com/gunaa_dev"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 24, fontSize: 13, fontWeight: 500, color: "#888", textDecoration: "none", padding: "7px 14px", borderRadius: 8, border: "1px solid #2a2a2a" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              @gunaa_dev
            </a>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="pricing" className="ph-section" style={{ padding: "120px 40px", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: "#5b63d3", letterSpacing: ".14em" }}>PRICING</span>
            <h2 className="ph-section-heading" style={{ fontSize: 48, fontWeight: 700, letterSpacing: "-.03em", margin: "14px 0 14px" }}>Pay for what you need</h2>
            <p style={{ fontSize: 18, color: "#777" }}>14-day free trial on every plan. Cancel anytime.</p>
          </div>
          <div className="ph-pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, alignItems: "start" }}>
            {PLANS.map(plan => (
              <div key={plan.id} className={plan.popular ? "plan-card-popular" : "plan-card"}>
                {plan.popular && (
                  <div style={{ position: "absolute", top: -13, left: 24, fontFamily: "'Geist Mono', monospace", fontSize: 10, letterSpacing: ".1em", padding: "5px 12px", borderRadius: 999, background: "#5b63d3", color: "#fff", fontWeight: 600 }}>
                    MOST POPULAR
                  </div>
                )}
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{plan.name}</h3>
                <p style={{ fontSize: 13.5, color: "#777", marginBottom: 22 }}>{plan.desc}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-.03em" }}>
                    {isIndia ? plan.inr : plan.usd}
                  </span>
                  <span style={{ fontSize: 15, color: "#666" }}>/mo</span>
                </div>
                <p style={{ fontSize: 12, color: "#555", fontFamily: "'Geist Mono', monospace", marginBottom: 22 }}>
                  {isIndia ? `≈ ${plan.usd} USD` : `≈ ${plan.inr} INR`}
                </p>
                <Link href={ctaHref} className={plan.popular ? "plan-btn-primary" : "plan-btn-secondary"}>
                  {user ? "Go to scheduler" : "Start free trial"}
                </Link>
                <PlanFeatures items={plan.features} />
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", marginTop: 28, fontSize: 14, color: "#666" }}>
            Prefer full control?{" "}
            <Link href={GITHUB_URL} target="_blank" rel="noopener" style={{ color: "#9ba2ee", transition: "color .15s" }}>
              Self-host for free under AGPL-3.0 →
            </Link>
          </p>
        </section>

        {/* ── CTA BANNER ── */}
        <section className="ph-section" style={{ padding: "0 40px 120px" }}>
          <div className="ph-cta-banner" style={{ position: "relative", maxWidth: 1100, margin: "0 auto", borderRadius: 22, border: "1px solid rgba(91,99,211,.35)", background: "linear-gradient(160deg, rgba(91,99,211,.16) 0%, #0d0d0d 55%)", padding: "72px 40px", textAlign: "center", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 600, height: 360, background: "radial-gradient(ellipse, rgba(91,99,211,.5), transparent 70%)", filter: "blur(40px)", pointerEvents: "none" }} />
            <div style={{ position: "relative" }}>
              <h2 className="ph-cta-title" style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-.035em", marginBottom: 16 }}>
                Your audience is waiting.<br />Are you scheduled?
              </h2>
              <p style={{ fontSize: 18, color: "#888", marginBottom: 36 }}>
                {user ? "Head back to your scheduler and keep the momentum going." : "Join Posthive free for 14 days. No card, no pressure, no lock-in."}
              </p>
              <Link href={ctaHref} className="btn-primary" style={{ fontSize: 16, padding: "15px 32px" }}>
                {ctaLabel}
              </Link>
            </div>
          </div>
        </section>

        <SiteFooter githubUrl={GITHUB_URL} />

      </div>
    </>
  );
}

// ─── FOOTER ──────────────────────────────────────────────────
function SiteFooter({ githubUrl }: { githubUrl: string }) {
  return (
    <footer style={{ borderTop: "1px solid rgba(255,255,255,.06)", padding: "72px 0 40px", background: "#0a0a0a" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px" }}>
        <div className="ph-foot-grid" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 48 }}>

          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <Image src="/posthivemain.png" alt="Posthive" width={28} height={28} style={{ objectFit: "contain" }} />
              <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.02em" }}>Posthive</span>
            </div>
            <p style={{ fontSize: 14, color: "#666", lineHeight: 1.7, maxWidth: 240, marginBottom: 20 }}>
              Schedule once. Post everywhere. Open-source social scheduling for creators and teams.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a href={githubUrl} target="_blank" rel="noopener" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "#777", textDecoration: "none" }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#ededed"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#777"; }}>
                <GitHubIcon size={14} /> GitHub
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <FootHead>Product</FootHead>
            <FootLinks links={[
              { href: "/features", label: "Features" },
              { href: "#pricing",  label: "Pricing" },
              { href: "#how",      label: "How it works" },
              { href: "/docs",     label: "Docs" },
              { href: "/compose",  label: "Get started" },
            ]} />
          </div>

          {/* Platforms */}
          <div>
            <FootHead>Platforms</FootHead>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PLATFORMS_NAV.map(p => (
                <a key={p.platform} href="/features" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#777", textDecoration: "none" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#ededed"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#777"; }}>
                  <PlatformIcon platform={p.platform} size={14} />
                  {p.label}
                </a>
              ))}
            </div>
          </div>

          {/* Legal */}
          <div>
            <FootHead>Company</FootHead>
            <FootLinks links={[
              { href: "mailto:gunasheelan208@gmail.com", label: "Contact", external: true },
              { href: "/privacy", label: "Privacy policy" },
              { href: "/terms",   label: "Terms of service" },
              { href: githubUrl,  label: "Self-hosting guide", external: true },
            ]} />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="ph-foot-bottom" style={{ marginTop: 56, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "#444", fontFamily: "'Geist Mono', monospace" }}>
          <span>© 2026 Posthive. Open source under AGPL-3.0.</span>
          <div style={{ display: "flex", gap: 20 }}>
            <Link href="/privacy" style={{ color: "#555", textDecoration: "none" }}>Privacy</Link>
            <Link href="/terms"   style={{ color: "#555", textDecoration: "none" }}>Terms</Link>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) { .ph-foot-grid { grid-template-columns: 1fr 1fr !important; gap: 36px !important; } }
        @media (max-width: 500px) { .ph-foot-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </footer>
  );
}

function FootHead({ children }: { children: React.ReactNode }) {
  return <h4 style={{ fontSize: 13, fontWeight: 600, color: "#ededed", marginBottom: 14, marginTop: 0 }}>{children}</h4>;
}

function FootLinks({ links }: { links: { href: string; label: string; external?: boolean }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {links.map(l => l.external
        ? <a key={l.label} href={l.href} target="_blank" rel="noopener" style={{ fontSize: 14, color: "#777", textDecoration: "none" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#ededed"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#777"; }}>{l.label}</a>
        : <Link key={l.label} href={l.href} style={{ fontSize: 14, color: "#777", textDecoration: "none" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#ededed"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#777"; }}>{l.label}</Link>
      )}
    </div>
  );
}

function FeatureIcon({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(91,99,211,.12)", border: "1px solid rgba(91,99,211,.25)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
      {children}
    </div>
  );
}

function PlanFeatures({ items }: { items: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
      {items.map(item => (
        <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#bbb" }}>
          <span style={{ color: "#9ba2ee", fontWeight: 600 }}>✓</span>{item}
        </div>
      ))}
    </div>
  );
}

function GitHubIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function SunIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#9ba2ee" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>;
}
function InstagramIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#9ba2ee" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1" fill="#9ba2ee"/></svg>;
}
function CalendarIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#9ba2ee" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/><rect x="7" y="12" width="5" height="4" rx="1" fill="rgba(91,99,211,.4)"/></svg>;
}
function CommentIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#9ba2ee" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 1 1 16.1-3.8z"/><path d="M8 11h6M8 14h4"/></svg>;
}
function SlidersIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#9ba2ee" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5"/><circle cx="16" cy="6" r="2" fill="#0a0a0a"/><circle cx="8" cy="12" r="2" fill="#0a0a0a"/><circle cx="13" cy="18" r="2" fill="#0a0a0a"/></svg>;
}
function CodeIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#9ba2ee" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>;
}
