import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { NavBar } from "../../../components/LandingNav";
import { PlatformIcon } from "../../../components/PlatformIcon";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "https://posthive.co";

// ── Platform content data ──────────────────────────────────────────────────

// ── SVG icon keys ─────────────────────────────────────────────────────────

type IconKey = "text" | "image" | "link" | "comment" | "alt" | "override" | "video" | "reel" | "story" | "carousel" | "lock" | "calendar" | "globe" | "tag" | "clock" | "page";

function Icon({ name }: { name: IconKey }) {
  const s: React.CSSProperties = { display: "block", flexShrink: 0 };
  switch (name) {
    case "text":     return <svg style={s} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M4 6h16M4 10h10M4 14h12M4 18h8"/></svg>;
    case "image":    return <svg style={s} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>;
    case "link":     return <svg style={s} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
    case "comment":  return <svg style={s} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    case "alt":      return <svg style={s} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>;
    case "override": return <svg style={s} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="13" cy="18" r="2"/></svg>;
    case "video":    return <svg style={s} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="2" y="4" width="15" height="16" rx="2"/><path d="M17 9l5-3v12l-5-3"/></svg>;
    case "reel":     return <svg style={s} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
    case "story":    return <svg style={s} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="9"/></svg>;
    case "carousel": return <svg style={s} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="2" y="5" width="14" height="14" rx="2"/><path d="M18 7h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2"/></svg>;
    case "lock":     return <svg style={s} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
    case "calendar": return <svg style={s} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>;
    case "globe":    return <svg style={s} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
    case "tag":      return <svg style={s} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5"/></svg>;
    case "clock":    return <svg style={s} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
    case "page":     return <svg style={s} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>;
    default:         return null;
  }
}

interface PlatformData {
  name: string;
  domain: string;
  color: string;
  headline: string;
  subheadline: string;
  supports: { label: string; icon: IconKey }[];
  steps: { n: string; title: string; desc: string }[];
  note?: string;
  image: string;
  imageAlt: string;
}

const PLATFORMS: Record<string, PlatformData> = {
  bluesky: {
    name: "Bluesky",
    domain: "bsky.app",
    color: "#0085ff",
    headline: "Schedule Bluesky posts without the tab-switching",
    subheadline: "Stay consistent on the open social web. Write your Bluesky posts in Posthive, set a time, and let it publish while you focus on everything else.",
    supports: [
      { label: "Text posts up to 300 chars", icon: "text" as IconKey },
      { label: "Up to 4 images per post", icon: "image" as IconKey },
      { label: "Automatic link preview cards", icon: "link" as IconKey },
      { label: "First comment on publish", icon: "comment" as IconKey },
      { label: "Alt text on images", icon: "alt" as IconKey },
      { label: "Per-account text override", icon: "override" as IconKey },
    ],
    steps: [
      { n: "01", title: "Connect with an app password", desc: "Generate an app password in Bluesky settings and paste it into Posthive. No OAuth redirect needed." },
      { n: "02", title: "Write your post", desc: "Compose in Posthive's editor. The 300-character counter updates in real time so you never go over." },
      { n: "03", title: "Pick a time and schedule", desc: "Choose your publish time. Posthive fires the post at the exact second, then auto-posts your first comment if you added one." },
    ],
    image: "/screenshots/platform-bluesky.png",
    imageAlt: "Posthive composer Bluesky post with image and character count",
  },
  threads: {
    name: "Threads",
    domain: "threads.net",
    color: "#ededed",
    headline: "Post to Threads on schedule, not on impulse",
    subheadline: "Build a consistent presence on Threads without being glued to your phone. Write ahead, schedule smart, and let Posthive handle the publishing.",
    supports: [
      { label: "Text posts up to 500 chars", icon: "text" as IconKey },
      { label: "Images and video", icon: "image" as IconKey },
      { label: "First comment on publish", icon: "comment" as IconKey },
      { label: "Per-account text override", icon: "override" as IconKey },
      { label: "60-day token auto-refresh", icon: "clock" as IconKey },
      { label: "Calendar drag-to-reschedule", icon: "calendar" as IconKey },
    ],
    steps: [
      { n: "01", title: "Connect with Meta OAuth", desc: "Click Connect Threads. Posthive redirects to Meta's OAuth, you approve in one click, and your account is linked." },
      { n: "02", title: "Compose your post", desc: "Write your Threads post in Posthive. Attach images or video, add a first comment, and see a live native preview." },
      { n: "03", title: "Schedule it", desc: "Set a date and time. Posthive queues the job and publishes at the exact moment you chose." },
    ],
    image: "/screenshots/platform-threads.png",
    imageAlt: "Posthive composer Threads post preview with image",
  },
  instagram: {
    name: "Instagram",
    domain: "instagram.com",
    color: "#e1306c",
    headline: "Reels, Stories, and feed posts all scheduled",
    subheadline: "Posthive is one of the few schedulers that supports the full range of Instagram content types. Stop opening the app to post. Set it and forget it.",
    supports: [
      { label: "Feed posts (single + carousel)", icon: "image" as IconKey },
      { label: "Instagram Reels", icon: "reel" as IconKey },
      { label: "Instagram Stories", icon: "story" as IconKey },
      { label: "Carousel up to 10 items", icon: "carousel" as IconKey },
      { label: "Alt text on images", icon: "alt" as IconKey },
      { label: "Caption up to 2,200 chars", icon: "text" as IconKey },
    ],
    steps: [
      { n: "01", title: "Connect your Professional account", desc: "Link your Instagram Business or Creator account via Meta OAuth. Requires a Professional (not personal) account." },
      { n: "02", title: "Choose your content type", desc: "Select feed post, Reel, or Story in the Compose page. Attach your media and write your caption." },
      { n: "03", title: "Schedule and publish", desc: "Posthive handles the Instagram media container API uploads, processes, and publishes at your chosen time." },
    ],
    image: "/screenshots/platform-instagram.png",
    imageAlt: "Posthive composer Instagram Reel scheduling with preview",
  },
  linkedin: {
    name: "LinkedIn",
    domain: "linkedin.com",
    color: "#0077b5",
    headline: "Stay consistent on LinkedIn without logging in every day",
    subheadline: "LinkedIn rewards consistency. Posthive lets you batch your content in one session, spread it across the week, and grow your professional presence on autopilot.",
    supports: [
      { label: "Text posts up to 3,000 chars", icon: "text" as IconKey },
      { label: "Single image and multi-image", icon: "image" as IconKey },
      { label: "First comment on publish", icon: "comment" as IconKey },
      { label: "Per-account text override", icon: "override" as IconKey },
      { label: "OAuth 2.0 secure connection", icon: "lock" as IconKey },
      { label: "Calendar drag-to-reschedule", icon: "calendar" as IconKey },
    ],
    steps: [
      { n: "01", title: "Connect via LinkedIn OAuth", desc: "Click Connect LinkedIn. You're redirected to LinkedIn to approve access, and credentials are encrypted and stored securely." },
      { n: "02", title: "Write your post", desc: "Compose your LinkedIn post long-form thoughts, announcements, or updates. Attach images if needed." },
      { n: "03", title: "Schedule for peak hours", desc: "Pick a publish time that matches your audience. Posthive posts it and fires your first comment automatically." },
    ],
    image: "/screenshots/platform-linkedin.png",
    imageAlt: "Posthive composer LinkedIn post with image preview",
  },
  mastodon: {
    name: "Mastodon",
    domain: "mastodon.social",
    color: "#6364ff",
    headline: "Schedule to any Mastodon instance, yours or anyone's",
    subheadline: "Mastodon.social, Fosstodon, Hachyderm. It doesn't matter which instance you're on. Posthive works with any Mastodon-compatible server.",
    supports: [
      { label: "Any Mastodon instance", icon: "globe" as IconKey },
      { label: "Text posts up to 500 chars", icon: "text" as IconKey },
      { label: "Images and video", icon: "image" as IconKey },
      { label: "First comment on publish", icon: "comment" as IconKey },
      { label: "Alt text on media", icon: "alt" as IconKey },
      { label: "Per-account text override", icon: "override" as IconKey },
    ],
    steps: [
      { n: "01", title: "Enter your instance URL", desc: "Type your Mastodon instance (e.g. mastodon.social). Posthive registers an OAuth app on your instance automatically." },
      { n: "02", title: "Authorize in one click", desc: "You're redirected to your instance's OAuth page. Approve access, and you're connected." },
      { n: "03", title: "Compose and schedule", desc: "Write your toot, attach media, and schedule it. Posthive publishes to your instance at the exact time you set." },
    ],
    image: "/screenshots/platform-mastodon.png",
    imageAlt: "Posthive composer Mastodon post with instance selector",
  },
  youtube: {
    name: "YouTube",
    domain: "youtube.com",
    color: "#ff0000",
    headline: "Schedule YouTube Shorts without opening YouTube Studio",
    subheadline: "Upload your video, write your description, and let Posthive post it at the right moment. No more rushing to hit publish during peak hours.",
    supports: [
      { label: "YouTube Shorts", icon: "reel" as IconKey },
      { label: "Regular video uploads", icon: "video" as IconKey },
      { label: "Title up to 100 chars", icon: "text" as IconKey },
      { label: "Description up to 5,000 chars", icon: "text" as IconKey },
      { label: "Automatic #Shorts tagging", icon: "tag" as IconKey },
      { label: "Google OAuth 2.0", icon: "lock" as IconKey },
    ],
    steps: [
      { n: "01", title: "Connect your YouTube channel", desc: "Authorize Posthive via Google OAuth. Your channel is linked securely in seconds." },
      { n: "02", title: "Upload your video and fill in details", desc: "Attach your video file, write the title and description in the dedicated YouTube fields, and toggle Short vs. Video." },
      { n: "03", title: "Schedule the upload", desc: "Posthive uses YouTube's resumable upload API to push your video and publish it at the exact scheduled time." },
    ],
    image: "/screenshots/platform-youtube.png",
    imageAlt: "Posthive composer YouTube Shorts scheduling with title and description fields",
  },
  facebook: {
    name: "Facebook Pages",
    domain: "facebook.com",
    color: "#1877f2",
    headline: "Keep your Facebook Page active on autopilot",
    subheadline: "Batch your Facebook content in one session and spread it across the week. Posthive posts to your Page while you focus on building.",
    supports: [
      { label: "Text posts up to 63,206 chars", icon: "text" as IconKey },
      { label: "Single photo posts", icon: "image" as IconKey },
      { label: "Multi-photo carousel", icon: "carousel" as IconKey },
      { label: "Video posts", icon: "video" as IconKey },
      { label: "All Pages you admin", icon: "page" as IconKey },
      { label: "Calendar drag-to-reschedule", icon: "calendar" as IconKey },
    ],
    steps: [
      { n: "01", title: "Connect via Facebook OAuth", desc: "Click Connect Facebook Page. Posthive lists all Pages you admin and connects them in one flow." },
      { n: "02", title: "Compose your post", desc: "Write your post, attach photos or a video. Preview exactly how it will look on your Page." },
      { n: "03", title: "Schedule and publish", desc: "Pick your publish time. Posthive posts to your Page via the Graph API at the exact moment you chose." },
    ],
    image: "/screenshots/platform-facebook.png",
    imageAlt: "Posthive composer Facebook Page post with image",
  },
  telegram: {
    name: "Telegram",
    domain: "telegram.org",
    color: "#229ED9",
    headline: "Schedule Telegram channel posts without staying online",
    subheadline: "Broadcast to your Telegram channel on a consistent schedule. Write your messages in Posthive, set a time, and let it publish — no OAuth, no complexity.",
    supports: [
      { label: "Text posts up to 4,096 chars", icon: "text" as IconKey },
      { label: "Single image with caption", icon: "image" as IconKey },
      { label: "Up to 10 images as media group", icon: "carousel" as IconKey },
      { label: "Video posts with caption", icon: "video" as IconKey },
      { label: "Public and private channels", icon: "lock" as IconKey },
      { label: "Per-account text override", icon: "override" as IconKey },
    ],
    steps: [
      { n: "01", title: "Create a bot via @BotFather", desc: "Message @BotFather on Telegram, send /newbot, and follow the prompts. You get a bot token — copy it." },
      { n: "02", title: "Add the bot to your channel", desc: "Open your channel → Administrators → Add Administrator → search your bot → enable Post Messages → Done." },
      { n: "03", title: "Connect in Posthive and schedule", desc: "Paste the bot token and your channel username (or numeric ID for private channels) into Posthive. Start scheduling immediately." },
    ],
    note: "No OAuth redirect or server-side app credentials needed. Each user brings their own bot token, stored encrypted. One bot can serve multiple channels.",
    image: "/screenshots/platform-telegram.png",
    imageAlt: "Posthive composer Telegram channel post scheduling",
  },
  twitter: {
    name: "X (Twitter)",
    domain: "x.com",
    color: "#e7e7e7",
    headline: "Schedule tweets without watching the clock",
    subheadline: "Stop posting in real time. Write your tweets ahead of time, schedule them for peak hours, and let Posthive publish while you focus on everything else.",
    supports: [
      { label: "Text tweets up to 280 chars", icon: "text" as IconKey },
      { label: "Up to 4 images per tweet", icon: "image" as IconKey },
      { label: "First comment / reply on publish", icon: "comment" as IconKey },
      { label: "Per-account text override", icon: "override" as IconKey },
      { label: "100 tweets/month (Pro & Team)", icon: "lock" as IconKey },
      { label: "OAuth 1.0a secure connection", icon: "lock" as IconKey },
    ],
    steps: [
      { n: "01", title: "Connect your X account", desc: "Click Connect X in Posthive's Accounts page. Approve the OAuth prompt and your account is linked instantly." },
      { n: "02", title: "Write your tweet", desc: "Compose in Posthive's editor. The 280-character counter updates live. Attach up to 4 images if needed." },
      { n: "03", title: "Schedule and publish", desc: "Pick your publish time. Posthive posts via the X API at the exact second. No links allowed — X charges $0.20 per tweet with a URL." },
    ],
    image: "/screenshots/platform-twitter.png",
    imageAlt: "Posthive composer X Twitter post scheduling",
  },
};

// ── Shared page image ─────────────────────────────────────────────────────

function PageImage({ src, alt }: { src: string; alt: string; aspectRatio?: string }) {
  return (
    <div style={{ width: "100%", borderRadius: 16, overflow: "hidden", border: "1px solid #2a2a2a", background: "#111" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} style={{ width: "100%", height: "auto", display: "block" }} />
    </div>
  );
}

// ── Check icon ─────────────────────────────────────────────────────────────

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="8" fill="#5b63d3" fillOpacity="0.15" />
      <path d="M5 8l2.5 2.5L11 5.5" stroke="#9ba2ee" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  return Object.keys(PLATFORMS).map((platform) => ({ platform }));
}

export async function generateMetadata({ params }: { params: Promise<{ platform: string }> }): Promise<Metadata> {
  const { platform } = await params;
  const data = PLATFORMS[platform];
  if (!data) return {};
  return {
    title: `${data.name} Scheduler | Posthive`,
    description: data.subheadline,
    openGraph: {
      title: `${data.name} Scheduler | Posthive`,
      description: data.subheadline,
      url: `${WEB_URL}/platforms/${platform}`,
    },
  };
}

export default async function PlatformPage({ params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const data = PLATFORMS[platform];
  if (!data) notFound();

  const registerUrl = `${process.env.NEXT_PUBLIC_API_URL ? "" : ""}/register`;

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#ededed" }}>
      <NavBar user={false} ctaHref="/register" navCtaLabel="Get started free" />

      {/* ── Hero ── */}
      <section style={{ paddingTop: 140, paddingBottom: 80, textAlign: "center", padding: "140px 24px 80px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {/* Platform badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#111", border: "1px solid #2a2a2a", borderRadius: 999, padding: "6px 14px", marginBottom: 28 }}>
            <PlatformIcon platform={platform} size={16} />
            <span style={{ fontSize: 13, fontWeight: 600, color: data.color }}>{data.name}</span>
          </div>

          <h1 style={{ fontSize: "clamp(32px, 5vw, 54px)", fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.12, color: "#ededed", margin: "0 0 20px" }}>
            {data.headline}
          </h1>
          <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "#888", lineHeight: 1.7, maxWidth: 580, margin: "0 auto 36px" }}>
            {data.subheadline}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/register" style={{ fontSize: 15, fontWeight: 600, padding: "12px 24px", borderRadius: 10, background: "#5b63d3", color: "#fff", textDecoration: "none", boxShadow: "0 8px 24px -8px rgba(91,99,211,.7)" }}>
              Get started free
            </Link>
            <Link href="/docs" style={{ fontSize: 15, fontWeight: 600, padding: "12px 24px", borderRadius: 10, background: "#111", color: "#ededed", textDecoration: "none", border: "1px solid #2a2a2a" }}>
              View docs
            </Link>
          </div>
        </div>
      </section>

      {/* ── What's supported ── */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: ".1em", textTransform: "uppercase", textAlign: "center", marginBottom: 32 }}>
            WHAT POSTHIVE SUPPORTS ON {data.name.toUpperCase()}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {data.supports.map((s) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 12, background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1a1a1a", border: "1px solid #2a2a2a", display: "grid", placeItems: "center", color: "#666", flexShrink: 0 }}>
                  <Icon name={s.icon} />
                </div>
                <span style={{ fontSize: 14, color: "#ccc", fontWeight: 500 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Screenshot placeholder ── */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <PageImage src={data.image} alt={data.imageAlt} aspectRatio="16/9" />
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: ".1em", textTransform: "uppercase", textAlign: "center", marginBottom: 48 }}>
            HOW IT WORKS
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 24 }}>
            {data.steps.map((s) => (
              <div key={s.n} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, padding: "24px 20px" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#5b63d3", letterSpacing: ".1em", marginBottom: 10 }}>{s.n}</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#ededed", marginBottom: 8 }}>{s.title}</p>
                <p style={{ fontSize: 13.5, color: "#666", lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Note callout (optional) ── */}
      {data.note && (
        <section style={{ padding: "0 24px 48px" }}>
          <div style={{ maxWidth: 860, margin: "0 auto" }}>
            <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 12, padding: "16px 20px", display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
              <p style={{ fontSize: 13.5, color: "#888", lineHeight: 1.6, margin: 0 }}>{data.note}</p>
            </div>
          </div>
        </section>
      )}

      {/* ── Works with everything else ── */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", background: "#111", border: "1px solid #1e1e1e", borderRadius: 20, padding: "40px 36px", textAlign: "center" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#5b63d3", marginBottom: 12, letterSpacing: ".04em" }}>PART OF A BIGGER PICTURE</p>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#ededed", letterSpacing: "-.02em", marginBottom: 12 }}>
            {data.name} is one of nine platforms
          </h2>
          <p style={{ fontSize: 14.5, color: "#666", lineHeight: 1.7, marginBottom: 28 }}>
            Posthive also posts to Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, Facebook Pages, Pinterest, and Telegram — all from the same composer. Write once, choose your platforms, done.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
            {(["bluesky", "threads", "instagram", "linkedin", "mastodon", "youtube", "facebook", "pinterest", "telegram", "twitter"] as const)
              .filter(p => p !== platform)
              .map(p => (
                <Link key={p} href={`/platforms/${p}`} style={{ display: "flex", alignItems: "center", gap: 6, background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 999, padding: "5px 12px", textDecoration: "none" }}>
                  <PlatformIcon platform={p} size={13} />
                  <span style={{ fontSize: 12, color: "#888", fontWeight: 500 }}>{PLATFORMS[p]?.name ?? p}</span>
                </Link>
              ))}
          </div>
          <Link href="/register" style={{ display: "inline-block", fontSize: 15, fontWeight: 600, padding: "12px 28px", borderRadius: 10, background: "#5b63d3", color: "#fff", textDecoration: "none", boxShadow: "0 8px 24px -8px rgba(91,99,211,.7)" }}>
            Connect all your platforms →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,.06)", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
          {([["Privacy", "/privacy"], ["Terms", "/terms"], ["Docs", "/docs"]] as [string, string][]).map(([label, href]) => (
            <Link key={label} href={href} style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>{label}</Link>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "#444" }}>© {new Date().getFullYear()} Posthive · AGPL-3.0</p>
      </footer>
    </div>
  );
}
