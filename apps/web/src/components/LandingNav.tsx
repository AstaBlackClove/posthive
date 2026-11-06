"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { PlatformIcon } from "./PlatformIcon";
import { Wordmark } from "./Wordmark";
import { cn } from "../lib/cn";

export const PLATFORMS_NAV = [
  { platform: "bluesky",   label: "Bluesky",   desc: "300 chars, AT Protocol" },
  { platform: "threads",   label: "Threads",   desc: "500 chars, Meta OAuth" },
  { platform: "instagram", label: "Instagram", desc: "Posts, Reels & Stories" },
  { platform: "linkedin",  label: "LinkedIn",  desc: "3,000 chars, professional" },
  { platform: "mastodon",  label: "Mastodon",  desc: "500 chars, federated" },
  { platform: "pixelfed",  label: "Pixelfed",  desc: "2,001 chars, photo-first, fediverse" },
  { platform: "youtube",   label: "YouTube",   desc: "Shorts & video, Google OAuth" },
  { platform: "facebook",  label: "Facebook Pages", desc: "Pages, Graph API" },
  { platform: "pinterest", label: "Pinterest",      desc: "Pins, image required" },
  { platform: "twitter",   label: "X (Twitter)",    desc: "100 tweets/mo, Pro & Team" },
  { platform: "telegram",  label: "Telegram",       desc: "4,096 chars, Bot API" },
  { platform: "nostr",     label: "Nostr",          desc: "Keypair, decentralized" },
  { platform: "discord",   label: "Discord",        desc: "2,000 chars, Bot + webhook" },
  { platform: "tumblr",    label: "Tumblr",         desc: "4,096 chars, OAuth 1.0a" },
  { platform: "lemmy",     label: "Lemmy",          desc: "Federated · username + password" },
  { platform: "tiktok",   label: "TikTok",         desc: "Videos · Content Posting API" },
];

const SparklesNavIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"/>
    <path d="M20 3v4M22 5h-4M4 17v2M5 18H3"/>
  </svg>
);

// bg = icon tile, color = icon. Tailwind classes, written out in full so the scanner sees them.
export const FEATURES_NAV = [
  { icon: <SunIcon />,          bg: "bg-brand-100",   color: "text-brand-800",   title: "Multi-platform posting",  desc: "One composer, seven platforms",     slug: "multi-platform-posting" },
  { icon: <InstagramIcon />,    bg: "bg-red-100",     color: "text-red-600",     title: "Reels & Stories",         desc: "Full Instagram media support",      slug: "instagram-reels-scheduler" },
  { icon: <CalendarIcon />,     bg: "bg-green-100",   color: "text-green-700",   title: "Drag-to-reschedule",      desc: "Visual calendar view",              slug: "drag-to-reschedule" },
  { icon: <CommentIcon />,      bg: "bg-brand-100",   color: "text-brand-800",   title: "First comment",           desc: "Auto-reply on publish",             slug: "first-comment" },
  { icon: <SlidersIcon />,      bg: "bg-neutral-100", color: "text-neutral-700", title: "Per-platform overrides",  desc: "Custom text per network",           slug: "per-platform-overrides" },
  { icon: <CsvNavIcon />,       bg: "bg-green-100",   color: "text-green-700",   title: "Bulk CSV scheduling",     desc: "Schedule hundreds from a file",     slug: "bulk-csv-scheduling" },
  { icon: <CodeIcon />,         bg: "bg-blue-100",    color: "text-blue-700",    title: "Self-hostable",           desc: "AGPL-3.0 open source",              slug: "self-hostable" },
  { icon: <SparklesNavIcon />,  bg: "bg-brand-100",   color: "text-brand-800",   title: "AI caption assist",       desc: "Rewrite in one click",              slug: "ai-caption-assist" },
];

const NAV_LINK = "flex cursor-pointer items-center gap-1 px-3 py-2.5 type-body-m-s text-muted transition-colors hover:text-fg";
const MENU_ITEM = "flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-neutral-100";
const MOBILE_ITEM = "flex items-center gap-2.5 px-1 py-2";

interface NavBarProps {
  user: boolean;
  ctaHref: string;
  navCtaLabel: string;
  loading?: boolean;
}

export function NavBar({ user, ctaHref, navCtaLabel, loading }: NavBarProps) {
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
    <svg width="11" height="11" fill="none" viewBox="0 0 12 12" className={cn("opacity-50 transition-transform duration-150", open && "rotate-180")}>
      <path d="M2 4.5l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const dropClass = (open: boolean) => cn(
    "card absolute top-full left-1/2 z-200 mt-3 -translate-x-1/2 p-3.5 shadow-lg transition-opacity duration-150",
    open ? "opacity-100" : "pointer-events-none opacity-0",
  );

  return (
    <>
    {mobileOpen && (
      <div onClick={(e) => { if (e.target === e.currentTarget) setMobileOpen(false); }} className="fixed inset-x-0 top-16 bottom-0 z-99 flex flex-col gap-1 overflow-y-auto border-b border-border bg-bg px-6 pt-5 pb-7 lg:hidden">
        <p className="section-label mb-2">Features</p>
        {FEATURES_NAV.map(f => (
          <a key={f.title} href={`/features/${f.slug}`} onClick={() => setMobileOpen(false)} className={MOBILE_ITEM}>
            <div className={cn("grid size-7 place-items-center rounded-md", f.bg, f.color)}>{f.icon}</div>
            <span className="type-body-m-s text-fg">{f.title}</span>
          </a>
        ))}
        <div className="my-3 border-t border-border" />
        <p className="section-label mb-2">Platforms</p>
        {PLATFORMS_NAV.map(p => (
          <a key={p.platform} href={`/platforms/${p.platform}`} onClick={() => setMobileOpen(false)} className={MOBILE_ITEM}>
            <div className="grid size-7 place-items-center rounded-md bg-surface">
              <PlatformIcon platform={p.platform} size={16} />
            </div>
            <span className="type-body-m-s text-fg">{p.label}</span>
          </a>
        ))}
        <div className="my-3 border-t border-border" />
        {([["/pricing", "Pricing"], ["/agent", "Agents"], ["/blog", "Blog"], ["/docs", "Docs"], ["/for-developers", "API"]] as [string, string][]).map(([href, label]) => (
          <a key={label} href={href} onClick={() => setMobileOpen(false)} className="px-1 py-2 type-body-m-s text-muted transition-colors hover:text-fg">{label}</a>
        ))}
        {!user && (
          <>
            <div className="my-3 border-t border-border" />
            <Link href="/login" onClick={() => setMobileOpen(false)} className="btn-secondary py-2.5">Sign in</Link>
          </>
        )}
      </div>
    )}
    <nav className={cn(
      "fixed inset-x-0 top-0 z-100 flex h-16 items-center justify-between border-b bg-bg/90 px-4 backdrop-blur transition-colors duration-200 lg:px-10",
      scrolled ? "border-border" : "border-transparent",
    )}>
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2.5 text-fg">
        <Wordmark size="md" />
      </Link>

      {/* Desktop nav */}
      <div className="flex items-center gap-2.5 lg:gap-0.5">
        {/* Links + auth — hidden below lg, replaced by hamburger */}
        <div className="hidden items-center gap-0.5 lg:flex">
        {/* Features dropdown */}
        <div className="relative" onMouseEnter={openFeat} onMouseLeave={closeFeat}>
          <button className={NAV_LINK}>Features {chevron(featOpen)}</button>
          <div onMouseEnter={openFeat} onMouseLeave={closeFeat} className={cn(dropClass(featOpen), "w-120")}>
            <p className="section-label mb-2 pl-1.5">FEATURES</p>
            <div className="grid grid-cols-2 gap-0.5">
              {FEATURES_NAV.map((f) => (
                <a key={f.title} href={`/features/${f.slug}`} className={MENU_ITEM}>
                  <div className={cn("grid size-8 shrink-0 place-items-center rounded-lg", f.bg, f.color)}>{f.icon}</div>
                  <div>
                    <p className="type-body-sb-s text-fg">{f.title}</p>
                    <p className="type-body-r-xs text-muted">{f.desc}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Platforms dropdown */}
        <div className="relative" onMouseEnter={openPlat} onMouseLeave={closePlat}>
          <button className={NAV_LINK}>Platforms {chevron(platOpen)}</button>
          <div onMouseEnter={openPlat} onMouseLeave={closePlat} className={cn(dropClass(platOpen), "w-160")}>
            <p className="section-label mb-2 pl-1.5">SUPPORTED PLATFORMS</p>
            <div className="grid grid-cols-2 gap-0.5">
              {PLATFORMS_NAV.map((p) => (
                <a key={p.platform} href={`/platforms/${p.platform}`} className={MENU_ITEM}>
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-bg">
                    <PlatformIcon platform={p.platform} size={18} />
                  </div>
                  <div>
                    <p className="type-body-sb-s text-fg">{p.label}</p>
                    <p className="type-body-r-xs text-muted">{p.desc}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        <Link href="/pricing" className={NAV_LINK}>Pricing</Link>
        <Link href="/agent" className={NAV_LINK}>Agents</Link>
        <Link href="/blog" className={NAV_LINK}>Blog</Link>
        <Link href="/docs" className={NAV_LINK}>Docs</Link>
        <Link href="/for-developers" className={NAV_LINK}>API</Link>

        <div className="ml-2 flex items-center gap-2.5">
          {loading ? (
            <span className="inline-block h-9 w-24 animate-pulse rounded-lg bg-neutral-100" />
          ) : (
            <>
              {!user && <Link href="/login" className="px-3 py-2 type-body-r-s text-muted transition-colors hover:text-fg">Sign in</Link>}
              <Link href={ctaHref} className="btn-primary">
                {navCtaLabel}
              </Link>
            </>
          )}
        </div>
        </div>

        {/* Mobile-only: CTA stays visible outside the hamburger menu */}
        {loading ? (
          <span className="inline-block h-9 w-22 animate-pulse rounded-lg bg-neutral-100 lg:hidden" />
        ) : (
          <Link href={ctaHref} className="btn-primary px-3.5 lg:hidden">
            {navCtaLabel}
          </Link>
        )}

        <button onClick={() => setMobileOpen(o => !o)} className="block cursor-pointer p-2 text-fg lg:hidden" aria-label="Menu">
          {mobileOpen
            ? <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            : <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          }
        </button>
      </div>
    </nav>
    </>
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
