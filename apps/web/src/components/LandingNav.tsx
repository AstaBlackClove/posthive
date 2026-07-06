"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { PlatformIcon } from "./PlatformIcon";

export const PLATFORMS_NAV = [
  { platform: "bluesky",   label: "Bluesky",   desc: "300 chars, AT Protocol" },
  { platform: "threads",   label: "Threads",   desc: "500 chars, Meta OAuth" },
  { platform: "instagram", label: "Instagram", desc: "Posts, Reels & Stories" },
  { platform: "linkedin",  label: "LinkedIn",  desc: "3,000 chars, professional" },
  { platform: "mastodon",  label: "Mastodon",  desc: "500 chars, federated" },
  { platform: "youtube",   label: "YouTube",   desc: "Shorts & video, Google OAuth" },
  { platform: "facebook",  label: "Facebook Pages", desc: "Pages, Graph API" },
  { platform: "twitter",   label: "X (Twitter)",    desc: "100 tweets/mo, Pro & Team" },
  { platform: "telegram",  label: "Telegram",       desc: "4,096 chars, Bot API" },
  { platform: "nostr",     label: "Nostr",          desc: "Keypair, decentralized" },
];

export const FEATURES_NAV = [
  { icon: <SunIcon />,      bg: "rgba(91,99,211,.18)",  color: "#9ba2ee", title: "Multi-platform posting",  desc: "One composer, seven platforms", slug: "multi-platform-posting" },
  { icon: <InstagramIcon />,bg: "rgba(225,100,100,.18)",color: "#e86b6b", title: "Reels & Stories",         desc: "Full Instagram media support",  slug: "instagram-reels-scheduler" },
  { icon: <CalendarIcon />, bg: "rgba(80,180,120,.18)", color: "#5cb88a", title: "Drag-to-reschedule",      desc: "Visual calendar view",           slug: "drag-to-reschedule" },
  { icon: <CommentIcon />,  bg: "rgba(220,160,60,.18)", color: "#d4a83c", title: "First comment",           desc: "Auto-reply on publish",          slug: "first-comment" },
  { icon: <SlidersIcon />,  bg: "rgba(140,100,220,.18)",color: "#a07ee0", title: "Per-platform overrides",  desc: "Custom text per network",        slug: "per-platform-overrides" },
  { icon: <CsvNavIcon />,  bg: "rgba(80,180,120,.18)", color: "#5cb88a", title: "Bulk CSV scheduling",      desc: "Schedule hundreds from a file",  slug: "bulk-csv-scheduling" },
  { icon: <CodeIcon />,     bg: "rgba(60,180,200,.18)", color: "#3db8c8", title: "Self-hostable",           desc: "AGPL-3.0 open source",           slug: "self-hostable" },
];

interface NavBarProps {
  user: boolean;
  ctaHref: string;
  navCtaLabel: string;
}

export function NavBar({ user, ctaHref, navCtaLabel }: NavBarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [featOpen, setFeatOpen] = useState(false);
  const [platOpen, setPlatOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const featTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const platTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openFeat = () => { if (featTimer.current) clearTimeout(featTimer.current); setFeatOpen(true); };
  const closeFeat = () => { featTimer.current = setTimeout(() => setFeatOpen(false), 120); };
  const openPlat = () => { if (platTimer.current) clearTimeout(platTimer.current); setPlatOpen(true); };
  const closePlat = () => { platTimer.current = setTimeout(() => setPlatOpen(false), 120); };

  const chevron = (open: boolean) => (
    <svg width="11" height="11" fill="none" viewBox="0 0 12 12" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms", opacity: 0.5 }}>
      <path d="M2 4.5l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const dropStyle = (open: boolean): React.CSSProperties => ({
    position: "absolute", top: "calc(100% + 12px)", left: "50%", transform: "translateX(-50%)",
    width: 480, background: "#161616", border: "1px solid rgba(255,255,255,.1)",
    borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,.6)", padding: 14, zIndex: 200,
    opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
    transition: "opacity 120ms ease",
  });

  const btnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 5,
    color: "#888", padding: "10px 12px", fontSize: 14.5, fontWeight: 500,
    background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
  };

  return (
    <nav className="ph-nav" style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      height: 64,
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      background: "rgba(10,10,10,.88)",
      borderBottom: scrolled ? "1px solid rgba(255,255,255,.08)" : "1px solid transparent",
      transition: "border-color 200ms ease",
    }}>
      {/* Brand */}
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
        <Image src="/posthivemain.png" alt="Posthive" width={30} height={30} style={{ objectFit: "contain" }} />
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.02em" }}>Posthive</span>
      </Link>

      {/* Desktop nav */}
      <div className="ph-nav-right" style={{ display: "flex", alignItems: "center", gap: 2 }}>
        {/* Links + auth — hidden on mobile, replaced by hamburger */}
        <div className="ph-desktop-links" style={{ display: "flex", alignItems: "center", gap: 2 }}>
        {/* Features dropdown */}
        <div style={{ position: "relative" }} onMouseEnter={openFeat} onMouseLeave={closeFeat}>
          <button style={btnStyle}>Features {chevron(featOpen)}</button>
          <div onMouseEnter={openFeat} onMouseLeave={closeFeat} style={dropStyle(featOpen)}>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: "#555", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8, paddingLeft: 6 }}>FEATURES</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              {FEATURES_NAV.map((f) => (
                <a key={f.title} href={`/features/${f.slug}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 9, textDecoration: "none", transition: "background 100ms" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.04)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "none"; }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: f.bg, color: f.color, display: "grid", placeItems: "center", flexShrink: 0 }}>{f.icon}</div>
                  <div>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: "#ededed", marginBottom: 1, lineHeight: 1.3 }}>{f.title}</p>
                    <p style={{ fontSize: 11.5, color: "#666", lineHeight: 1.4 }}>{f.desc}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Platforms dropdown */}
        <div style={{ position: "relative" }} onMouseEnter={openPlat} onMouseLeave={closePlat}>
          <button style={btnStyle}>Platforms {chevron(platOpen)}</button>
          <div onMouseEnter={openPlat} onMouseLeave={closePlat} style={{ ...dropStyle(platOpen), width: 340 }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: "#555", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8, paddingLeft: 6 }}>SUPPORTED PLATFORMS</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {PLATFORMS_NAV.map((p) => (
                <a key={p.platform} href={`/platforms/${p.platform}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 9, textDecoration: "none", transition: "background 100ms" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.04)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "none"; }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,.06)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <PlatformIcon platform={p.platform} size={18} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: "#ededed", marginBottom: 1, lineHeight: 1.3 }}>{p.label}</p>
                    <p style={{ fontSize: 11.5, color: "#666", lineHeight: 1.4 }}>{p.desc}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        <Link href="/pricing" style={{ ...btnStyle, textDecoration: "none" }}>Pricing</Link>
        <Link href="/blog" style={{ ...btnStyle, textDecoration: "none" }}>Blog</Link>
        <Link href="/docs" style={{ ...btnStyle, textDecoration: "none" }}>Docs</Link>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 8 }}>
          {!user && <Link href="/login" style={{ fontSize: 14, color: "#888", padding: "9px 12px", textDecoration: "none" }}>Sign in</Link>}
          <Link href={ctaHref} style={{
            fontSize: 14, fontWeight: 600, padding: "9px 18px", borderRadius: 8,
            background: "#5b63d3", color: "#fff",
            boxShadow: "0 0 0 1px rgba(255,255,255,.08), 0 8px 24px -8px rgba(91,99,211,.75)",
          }}>
            {navCtaLabel}
          </Link>
        </div>
        </div>

        {/* Mobile-only: CTA stays visible outside the hamburger menu */}
        <Link href={ctaHref} className="ph-mobile-cta" style={{
          display: "none", fontSize: 13.5, fontWeight: 600, padding: "8px 14px", borderRadius: 8,
          background: "#5b63d3", color: "#fff",
          boxShadow: "0 0 0 1px rgba(255,255,255,.08), 0 8px 24px -8px rgba(91,99,211,.75)",
        }}>
          {navCtaLabel}
        </Link>

        <button onClick={() => setMobileOpen(o => !o)} style={{ display: "none", background: "none", border: "none", cursor: "pointer", padding: 8, color: "#ededed" }} className="ph-hamburger" aria-label="Menu">
          {mobileOpen
            ? <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            : <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          }
        </button>
      </div>

      {mobileOpen && (
        <div style={{ position: "absolute", top: 64, left: 0, right: 0, background: "#111", borderBottom: "1px solid rgba(255,255,255,.08)", padding: "20px 24px 28px", display: "flex", flexDirection: "column", gap: 4, maxHeight: "calc(100vh - 64px)", overflowY: "auto" }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, color: "#555", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>Features</p>
          {FEATURES_NAV.map(f => (
            <a key={f.title} href={`/features/${f.slug}`} onClick={() => setMobileOpen(false)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", textDecoration: "none" }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: f.bg, color: f.color, display: "grid", placeItems: "center" }}>{f.icon}</div>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#ededed" }}>{f.title}</span>
            </a>
          ))}
          <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", margin: "12px 0" }} />
          {([["/pricing", "Pricing"], ["/blog", "Blog"], ["/docs", "Docs"]] as [string, string][]).map(([href, label]) => (
            <a key={label} href={href} onClick={() => setMobileOpen(false)} style={{ padding: "9px 4px", fontSize: 14, fontWeight: 500, color: "#888", textDecoration: "none" }}>{label}</a>
          ))}
          {!user && (
            <>
              <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", margin: "12px 0" }} />
              <Link href="/login" onClick={() => setMobileOpen(false)} style={{ textAlign: "center", padding: "10px 0", borderRadius: 8, border: "1px solid rgba(255,255,255,.12)", color: "#ededed", fontSize: 14, fontWeight: 500, textDecoration: "none" }}>Sign in</Link>
            </>
          )}
        </div>
      )}

      <style>{`
        .ph-nav { padding: 0 40px; }
        @media (max-width: 768px) {
          .ph-nav { padding: 0 16px; }
          .ph-nav-right { gap: 10px !important; }
          .ph-desktop-links { display: none !important; }
          .ph-mobile-cta { display: inline-flex !important; align-items: center; }
          .ph-hamburger { display: block !important; }
        }
      `}</style>
    </nav>
  );
}

function SunIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>;
}
function InstagramIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1" fill="currentColor"/></svg>;
}
function CalendarIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>;
}
function CommentIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 1 1 16.1-3.8z"/></svg>;
}
function SlidersIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="13" cy="18" r="2"/></svg>;
}
function CodeIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>;
}
function CsvNavIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="8" y1="9" x2="10" y2="9"/></svg>;
}
