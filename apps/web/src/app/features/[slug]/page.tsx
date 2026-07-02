import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { NavBar } from "../../../components/LandingNav";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "https://posthive.co";

// ── Feature content data ───────────────────────────────────────────────────

interface FeatureData {
  title: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  headline: string;
  subheadline: string;
  image: string;
  imageAlt: string;
  imageRatio?: string;
  why: { title: string; desc: string }[];
  how: { n: string; title: string; desc: string }[];
  usecases: string[];
}

const FEATURES: Record<string, FeatureData> = {
  "multi-platform-posting": {
    title: "Multi-platform posting",
    badge: "Core feature",
    badgeColor: "#9ba2ee",
    badgeBg: "rgba(91,99,211,.15)",
    headline: "Write once. Post everywhere.",
    subheadline: "One composer, seven platforms. Draft your content once and send it to Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, and Facebook Pages in a single click.",
    image: "/screenshots/feature-multi-platform.png",
    imageAlt: "Posthive composer selecting multiple platforms with platform previews",
    why: [
      { title: "Stop the copy-paste grind", desc: "Opening seven tabs, copy-pasting the same text, adjusting for each platform. That's 20 minutes per post. Posthive collapses it to one action." },
      { title: "Native previews per platform", desc: "See exactly how your post will render on each platform before it goes live. Character count, media layout, link card all shown in real time." },
      { title: "Consistent presence, less effort", desc: "Showing up consistently is what builds an audience. Posthive makes that sustainable instead of exhausting." },
    ],
    how: [
      { n: "01", title: "Connect your accounts", desc: "Link each platform once. Posthive securely stores encrypted credentials so you never have to re-authenticate." },
      { n: "02", title: "Select your platforms", desc: "Check the accounts you want to post to. Mix and match post to three platforms today, all seven tomorrow." },
      { n: "03", title: "Compose and schedule", desc: "Write your content, attach media, set a time. Posthive handles every platform independently at the scheduled moment." },
    ],
    usecases: [
      "Indie hackers sharing build-in-public updates",
      "Creators cross-posting to grow on multiple networks",
      "Founders maintaining visibility while shipping",
      "Marketers running multi-channel campaigns from one place",
    ],
  },
  "reels-and-stories": {
    title: "Reels & Stories",
    badge: "Instagram",
    badgeColor: "#e86b6b",
    badgeBg: "rgba(225,100,100,.15)",
    headline: "Full Instagram support. Reels, Stories, feed posts all scheduled.",
    subheadline: "Most schedulers support basic Instagram posts. Posthive goes further. Schedule Reels, Stories, and carousels without leaving the composer.",
    image: "/screenshots/feature-reels-stories.png",
    imageAlt: "Posthive composer Instagram Reel scheduling with content type selector",
    imageRatio: "4/3",
    why: [
      { title: "Reels are where reach happens", desc: "Reels get dramatically more reach than feed posts on Instagram. Scheduling them means you can post at peak times without being online." },
      { title: "Stories keep you top-of-mind", desc: "Stories disappear after 24 hours which means consistent posting is everything. Schedule a week of Stories in one session." },
      { title: "Carousels drive the most saves", desc: "Carousel posts get more saves and shares than single images. Posthive supports up to 10 items per carousel with alt text on each." },
    ],
    how: [
      { n: "01", title: "Connect your Professional account", desc: "Link your Instagram Business or Creator account via Meta OAuth. Personal accounts aren't supported by the Instagram API." },
      { n: "02", title: "Choose your content type", desc: "Select Feed Post, Reel, or Story in the Compose page. Attach your media image or video depending on the type." },
      { n: "03", title: "Schedule and publish", desc: "Posthive processes the media through Instagram's container API and publishes at your scheduled time automatically." },
    ],
    usecases: [
      "Creators scheduling Reels to hit peak-hour reach",
      "Brands maintaining a daily Story presence without daily effort",
      "Photographers scheduling carousel portfolios",
      "Coaches delivering educational carousel content on a schedule",
    ],
  },
  "drag-to-reschedule": {
    title: "Drag-to-reschedule",
    badge: "Calendar",
    badgeColor: "#5cb88a",
    badgeBg: "rgba(80,180,120,.15)",
    headline: "Your content calendar, actually visual.",
    subheadline: "See all your scheduled posts on a calendar. Drag to move them. Click to edit. No spreadsheets, no mental math. Just a clear picture of what's going live and when.",
    image: "/screenshots/feature-calendar.png",
    imageAlt: "Posthive calendar view scheduled posts with drag-to-reschedule",
    imageRatio: "16/9",
    why: [
      { title: "See gaps before they happen", desc: "A calendar makes it obvious when you have three posts in one day and nothing for the next five. Fix it before it becomes a problem." },
      { title: "Reschedule in one drag", desc: "Plans change. Drag a post to a new day and Posthive updates the schedule instantly. No forms, no dropdowns." },
      { title: "Filter by platform", desc: "Toggle which platforms are shown on the calendar. Focus on Instagram this week, LinkedIn next week." },
    ],
    how: [
      { n: "01", title: "Schedule your posts", desc: "Create posts in the Compose page and set publish times. They appear on the calendar immediately." },
      { n: "02", title: "Open the calendar view", desc: "Switch to Calendar on the Posts page. See your month, week, or day at a glance." },
      { n: "03", title: "Drag to reschedule", desc: "Grab any post and drop it on a new date. Posthive updates the queue in real time. The post publishes at the new time." },
    ],
    usecases: [
      "Content planners mapping out a monthly content mix",
      "Founders batching a week of posts and spreading them out visually",
      "Social media managers handling multiple clients",
      "Anyone who thinks visually about their publishing cadence",
    ],
  },
  "first-comment": {
    title: "First comment",
    badge: "Engagement",
    badgeColor: "#d4a83c",
    badgeBg: "rgba(220,160,60,.15)",
    headline: "The first comment, posted automatically.",
    subheadline: "Drop your hashtags, a key link, or a follow-up thought in the first comment posted automatically the moment your main content goes live.",
    image: "/screenshots/feature-first-comment.png",
    imageAlt: "Posthive composer first comment field below the main post area",
    imageRatio: "4/3",
    why: [
      { title: "Hashtags without the clutter", desc: "On Instagram and Threads, putting hashtags in a comment keeps your caption clean while still getting the reach benefit. Posthive handles this automatically." },
      { title: "Add context without editing the post", desc: "Drop a link, a thread continuation, or a call-to-action in the first comment instead of cramming it into the caption." },
      { title: "Timing is everything", desc: "The first comment needs to go live right when the post does before anyone else comments. Posthive publishes both in the same pipeline, seconds apart." },
    ],
    how: [
      { n: "01", title: "Write your first comment", desc: "In the Compose page, expand the First Comment section and write your comment: hashtags, links, follow-up copy, whatever you need." },
      { n: "02", title: "Schedule as normal", desc: "Set your publish time. The comment is queued together with the main post." },
      { n: "03", title: "Auto-published on the dot", desc: "When the job runs, Posthive posts your content first, then immediately posts the comment as a reply per platform, per account." },
    ],
    usecases: [
      "Instagram creators keeping captions clean while using hashtags",
      "LinkedIn users adding a link in the first comment for more reach",
      "Threads users starting a reply thread automatically",
      "Bluesky users adding context or a CTA below the main post",
    ],
  },
  "per-platform-overrides": {
    title: "Per-platform overrides",
    badge: "Pro & Team",
    badgeColor: "#a07ee0",
    badgeBg: "rgba(140,100,220,.15)",
    headline: "Different platform, different message.",
    subheadline: "LinkedIn and Bluesky have different audiences, different character limits, and different norms. Per-platform overrides let you tailor your message for each network without creating separate posts.",
    image: "/screenshots/feature-overrides.png",
    imageAlt: "Posthive per-platform customize dialog with independent text editors",
    imageRatio: "4/3",
    why: [
      { title: "One audience isn't like another", desc: "What performs on LinkedIn reads as corporate on Bluesky. What works on Threads is too casual for LinkedIn. Overrides let you adapt without duplicating your effort." },
      { title: "Character limits vary by platform", desc: "Bluesky caps you at 300 characters. LinkedIn gives you 3,000. Write the short version for one and expand it for the other in the same composer." },
      { title: "Consistent theme, different voice", desc: "Keep the same core message but adjust the tone, the hashtags, the CTA, or the media per account. Posthive tracks it all in one scheduled post." },
    ],
    how: [
      { n: "01", title: "Write your base post", desc: "Compose your post as normal. This becomes the default for all selected platforms." },
      { n: "02", title: "Click Customize for an account", desc: "Expand the per-platform section and click Customize on any account to open its override editor." },
      { n: "03", title: "Tailor and schedule", desc: "Edit the text (and first comment) independently for that account. Posthive uses the override for that platform, the base post for the rest." },
    ],
    usecases: [
      "Posting a professional update on LinkedIn and a casual take on Threads",
      "Fitting a long post into Bluesky's 300-char limit with a summarized version",
      "Using different hashtags per platform",
      "Varying the CTA depending on where the audience is",
    ],
  },
  "self-hostable": {
    title: "Self-hostable",
    badge: "Open source",
    badgeColor: "#3db8c8",
    badgeBg: "rgba(60,180,200,.15)",
    headline: "Run Posthive on your own infrastructure.",
    subheadline: "Posthive is open source under AGPL-3.0. Self-host it on Railway, Fly.io, Render, or your own VPS full control, no vendor lock-in, no per-seat pricing.",
    image: "/screenshots/feature-self-hostable.png",
    imageAlt: "Posthive self-hosting architecture API + Redis + Postgres + Storage",
    imageRatio: "16/9",
    why: [
      { title: "Your data, your server", desc: "All OAuth credentials are AES-256-GCM encrypted at rest. In self-hosted mode, they never leave your infrastructure." },
      { title: "No billing required", desc: "Set ENABLE_BILLING=false and every feature is unlocked for all users no plan limits, no trial, no Dodo account needed." },
      { title: "Modify it freely", desc: "Add platforms, change limits, build internal tooling on top. It's your copy. AGPL-3.0 just asks you to share modifications if you run it as a public service." },
    ],
    how: [
      { n: "01", title: "Clone and configure", desc: "Clone the repo, copy .env.example to .env, fill in your secrets Redis URL, encryption key, JWT secrets, OAuth credentials for the platforms you want." },
      { n: "02", title: "Run the database migration", desc: "Run pnpm db:migrate inside apps/api. Posthive supports SQLite for local dev and Postgres for production." },
      { n: "03", title: "Deploy anywhere", desc: "pnpm dev spins up both the API and the web app. For production, deploy to Railway (API) + Vercel (frontend) in under 10 minutes." },
    ],
    usecases: [
      "Developers who want full control over their scheduling stack",
      "Teams running internal social media tools without SaaS fees",
      "Privacy-conscious users who don't want credentials on third-party servers",
      "Engineers building on top of Posthive for custom workflows",
    ],
  },
};

// ── Page image ────────────────────────────────────────────────────────────

function PageImage({ src, alt }: { src: string; alt: string; aspectRatio?: string }) {
  return (
    <div style={{ width: "100%", borderRadius: 16, overflow: "hidden", border: "1px solid #2a2a2a", background: "#111" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} style={{ width: "100%", height: "auto", display: "block" }} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  return Object.keys(FEATURES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = FEATURES[slug];
  if (!data) return {};
  return {
    title: `${data.title} | Posthive`,
    description: data.subheadline,
    openGraph: {
      title: `${data.title} | Posthive`,
      description: data.subheadline,
      url: `${WEB_URL}/features/${slug}`,
    },
  };
}

export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = FEATURES[slug];
  if (!data) notFound();

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#ededed" }}>
      <NavBar user={false} ctaHref="/register" navCtaLabel="Get started free" />

      {/* ── Hero ── */}
      <section style={{ padding: "140px 24px 80px", textAlign: "center" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: data.badgeBg, border: `1px solid ${data.badgeColor}22`, borderRadius: 999, padding: "6px 14px", marginBottom: 28 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: data.badgeColor }}>{data.badge}</span>
          </div>
          <h1 style={{ fontSize: "clamp(30px, 5vw, 52px)", fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.12, color: "#ededed", margin: "0 0 20px" }}>
            {data.headline}
          </h1>
          <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "#888", lineHeight: 1.7, maxWidth: 580, margin: "0 auto 36px" }}>
            {data.subheadline}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/register" style={{ fontSize: 15, fontWeight: 600, padding: "12px 24px", borderRadius: 10, background: "#5b63d3", color: "#fff", textDecoration: "none", boxShadow: "0 8px 24px -8px rgba(91,99,211,.7)" }}>
              Try it free
            </Link>
            <Link href="/features" style={{ fontSize: 15, fontWeight: 600, padding: "12px 24px", borderRadius: 10, background: "#111", color: "#ededed", textDecoration: "none", border: "1px solid #2a2a2a" }}>
              All features
            </Link>
          </div>
        </div>
      </section>

      {/* ── Screenshot placeholder ── */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <PageImage src={data.image} alt={data.imageAlt} aspectRatio={data.imageRatio ?? "16/9"} />
        </div>
      </section>

      {/* ── Why it matters ── */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: ".1em", textTransform: "uppercase", textAlign: "center", marginBottom: 40 }}>
            WHY IT MATTERS
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {data.why.map((w) => (
              <div key={w.title} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, padding: "24px 20px" }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#ededed", marginBottom: 8 }}>{w.title}</p>
                <p style={{ fontSize: 13.5, color: "#666", lineHeight: 1.65 }}>{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: ".1em", textTransform: "uppercase", textAlign: "center", marginBottom: 40 }}>
            HOW IT WORKS
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
            {data.how.map((s) => (
              <div key={s.n} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, padding: "24px 20px" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: data.badgeColor, letterSpacing: ".1em", marginBottom: 10 }}>{s.n}</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#ededed", marginBottom: 8 }}>{s.title}</p>
                <p style={{ fontSize: 13.5, color: "#666", lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use cases ── */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: ".1em", textTransform: "uppercase", textAlign: "center", marginBottom: 32 }}>
            WHO USES THIS
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.usecases.map((u) => (
              <div key={u} style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "14px 16px" }}>
                <span style={{ fontSize: 13, color: data.badgeColor, marginTop: 1, flexShrink: 0 }}>→</span>
                <span style={{ fontSize: 14, color: "#aaa", lineHeight: 1.5 }}>{u}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "0 24px 100px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", background: "#111", border: "1px solid #1e1e1e", borderRadius: 20, padding: "48px 36px", textAlign: "center" }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#ededed", letterSpacing: "-.02em", marginBottom: 12 }}>
            Start scheduling for free
          </h2>
          <p style={{ fontSize: 14.5, color: "#666", lineHeight: 1.7, marginBottom: 28 }}>
            14-day free trial. No credit card required. Connect your first account in under a minute.
          </p>
          <Link href="/register" style={{ display: "inline-block", fontSize: 15, fontWeight: 600, padding: "13px 32px", borderRadius: 10, background: "#5b63d3", color: "#fff", textDecoration: "none", boxShadow: "0 8px 24px -8px rgba(91,99,211,.7)" }}>
            Get started free →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,.06)", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
          {([["Privacy", "/privacy"], ["Terms", "/terms"], ["Docs", "/docs"], ["Features", "/features"]] as [string, string][]).map(([label, href]) => (
            <Link key={label} href={href} style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>{label}</Link>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "#444" }}>© {new Date().getFullYear()} Posthive · AGPL-3.0</p>
      </footer>
    </div>
  );
}
