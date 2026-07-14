import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MarketingNavBar } from "../../../components/MarketingNavBar";
import { LandingFooter } from "../../../components/LandingFooter";

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
  faq?: { q: string; a: string }[];
}

const FEATURES: Record<string, FeatureData> = {
  "multi-platform-posting": {
    title: "Multi-platform posting",
    badge: "Core feature",
    badgeColor: "#9ba2ee",
    badgeBg: "rgba(91,99,211,.15)",
    headline: "Write once. Post everywhere.",
    subheadline: "One composer, eleven platforms. Draft your content once and send it to Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, Facebook, Pinterest, Telegram, Nostr, and X in a single click.",
    image: "/screenshots/feature-multi-platform.png",
    imageAlt: "Posthive composer selecting multiple platforms",
    why: [
      { title: "Stop the copy-paste grind", desc: "Opening seven tabs, copy-pasting the same text, adjusting for each platform. That's 20 minutes per post. Posthive collapses it to one action." },
      { title: "Native previews per platform", desc: "See exactly how your post will render on each platform before it goes live. Character count, media layout, link card all shown in real time." },
      { title: "Consistent presence, less effort", desc: "Showing up consistently is what builds an audience. Posthive makes that sustainable instead of exhausting." },
    ],
    how: [
      { n: "01", title: "Connect your accounts", desc: "Link each platform once. Posthive securely stores encrypted credentials so you never have to re-authenticate." },
      { n: "02", title: "Select your platforms", desc: "Check the accounts you want to post to. Mix and match - post to three platforms today, all seven tomorrow." },
      { n: "03", title: "Compose and schedule", desc: "Write your content, attach media, set a time. Posthive handles every platform independently at the scheduled moment." },
    ],
    usecases: [
      "Indie hackers sharing build-in-public updates",
      "Creators cross-posting to grow on multiple networks",
      "Founders maintaining visibility while shipping",
      "Marketers running multi-channel campaigns from one place",
    ],
    faq: [
      { q: "How many platforms does Posthive support?", a: "Posthive currently supports 13 platforms: Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, Facebook Pages, Pinterest, Telegram, Nostr, X (Twitter), Discord, and Tumblr." },
      { q: "Can I post different content to each platform?", a: "Yes. Posthive's per-platform override feature lets you write a base post and then customise the text, media, and first comment independently for each account." },
      { q: "Is Posthive a good Buffer or Hootsuite alternative?", a: "Yes. Posthive covers all major platforms, costs significantly less, and is open source — you can self-host it if you prefer full data control." },
      { q: "Do I need a separate account for each platform?", a: "No. Connect all your social accounts once from the Accounts page and they're available in every compose session. You just tick which ones to post to." },
    ],
  },
  "instagram-reels-scheduler": {
    title: "Reels & Stories",
    badge: "Instagram",
    badgeColor: "#e86b6b",
    badgeBg: "rgba(225,100,100,.15)",
    headline: "Full Instagram support. Reels, Stories, feed posts all scheduled.",
    subheadline: "Most schedulers support basic Instagram posts. Posthive goes further. Schedule Reels, Stories, and carousels without leaving the composer.",
    image: "/screenshots/feature-reels-stories.png",
    imageAlt: "Posthive Instagram Reel scheduling with content type selector",
    imageRatio: "4/3",
    why: [
      { title: "Reels are where reach happens", desc: "Reels get dramatically more reach than feed posts on Instagram. Scheduling them means you can post at peak times without being online." },
      { title: "Stories keep you top-of-mind", desc: "Stories disappear after 24 hours which means consistent posting is everything. Schedule a week of Stories in one session." },
      { title: "Carousels drive the most saves", desc: "Carousel posts get more saves and shares than single images. Posthive supports up to 10 items per carousel with alt text on each." },
    ],
    how: [
      { n: "01", title: "Connect your Professional account", desc: "Link your Instagram Business or Creator account via Meta OAuth. Personal accounts aren't supported by the Instagram API." },
      { n: "02", title: "Choose your content type", desc: "Select Feed Post, Reel, or Story in the Compose page. Attach your media - image or video depending on the type." },
      { n: "03", title: "Schedule and publish", desc: "Posthive processes the media through Instagram's container API and publishes at your scheduled time automatically." },
    ],
    usecases: [
      "Creators scheduling Reels to hit peak-hour reach",
      "Brands maintaining a daily Story presence without daily effort",
      "Photographers scheduling carousel portfolios",
      "Coaches delivering educational carousel content on a schedule",
    ],
    faq: [
      { q: "Can I schedule Instagram Reels with Posthive?", a: "Yes. Posthive supports Instagram Reels scheduling via the official Instagram Content Publishing API. Connect a Business or Creator account and choose 'Reel' in the composer." },
      { q: "Does Posthive support Instagram Stories?", a: "Yes. You can schedule Stories from the composer — just select 'Story' as the content type and upload an image or short video." },
      { q: "Why can't I connect a personal Instagram account?", a: "Meta's Instagram API only allows publishing to Business and Creator accounts. Personal accounts are not supported by the API — you'll need to switch your account type in Instagram settings." },
      { q: "Can I schedule Instagram carousels?", a: "Yes. Select 'Carousel' in the composer and upload up to 10 images. Each image supports its own alt text for accessibility." },
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
    imageAlt: "Posthive calendar view with drag-to-reschedule",
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
    faq: [
      { q: "Can I drag posts to reschedule them?", a: "Yes. The calendar view on the Posts page lets you drag any scheduled post to a new date and Posthive updates the publish time instantly." },
      { q: "What calendar views are available?", a: "Month, week, and day views are all available. Switch between them with a single click at the top of the calendar." },
      { q: "Can I filter the calendar by platform?", a: "Yes. Use the platform filter to show only posts going to specific accounts, so you can focus on one channel at a time." },
      { q: "Does the calendar sync in real time?", a: "Yes. Any change you make — a new post, a reschedule, a deletion — appears on the calendar immediately without a page refresh." },
    ],
  },
  "first-comment": {
    title: "First comment",
    badge: "Engagement",
    badgeColor: "#d4a83c",
    badgeBg: "rgba(220,160,60,.15)",
    headline: "The first comment, posted automatically.",
    subheadline: "Drop your hashtags, a key link, or a follow-up thought in the first comment - posted automatically the moment your main content goes live.",
    image: "/screenshots/feature-first-comment.png",
    imageAlt: "Posthive composer first comment field",
    imageRatio: "4/3",
    why: [
      { title: "Hashtags without the clutter", desc: "On Instagram and Threads, putting hashtags in a comment keeps your caption clean while still getting the reach benefit. Posthive handles this automatically." },
      { title: "Add context without editing the post", desc: "Drop a link, a thread continuation, or a call-to-action in the first comment instead of cramming it into the caption." },
      { title: "Timing is everything", desc: "The first comment needs to go live right when the post does - before anyone else comments. Posthive publishes both in the same pipeline, seconds apart." },
    ],
    how: [
      { n: "01", title: "Write your first comment", desc: "In the Compose page, expand the First Comment section and write your comment: hashtags, links, follow-up copy, whatever you need." },
      { n: "02", title: "Schedule as normal", desc: "Set your publish time. The comment is queued together with the main post." },
      { n: "03", title: "Auto-published on the dot", desc: "When the job runs, Posthive posts your content first, then immediately posts the comment as a reply - per platform, per account." },
    ],
    usecases: [
      "Instagram creators keeping captions clean while using hashtags",
      "LinkedIn users adding a link in the first comment for more reach",
      "Threads users starting a reply thread automatically",
      "Bluesky users adding context or a CTA below the main post",
    ],
    faq: [
      { q: "Which platforms support first comment scheduling?", a: "First comment scheduling works on Instagram, Threads, LinkedIn, Bluesky, and Mastodon. Facebook first comment support is pending Meta app review." },
      { q: "How long after the main post does the first comment go live?", a: "The first comment is posted within a few seconds of the main post going live — in the same job run, immediately after the post is confirmed published." },
      { q: "Can I put hashtags in the first comment to avoid cluttering my caption?", a: "Yes. This is one of the most popular use cases. Write your hashtags in the first comment field and Posthive posts them as the first reply, keeping your caption clean." },
      { q: "Can the first comment contain a link?", a: "Yes. You can put any text in the first comment, including URLs. This is especially useful on LinkedIn where posts with links in the caption get less reach." },
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
    imageAlt: "Posthive per-platform customize dialog",
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
    faq: [
      { q: "What are per-platform overrides?", a: "Per-platform overrides let you write a custom version of your post for any specific account. The override replaces the base post for that platform only — all other platforms use the base." },
      { q: "Can I override the first comment per platform too?", a: "Yes. The override editor also has a first comment field, so you can have platform-specific first comments alongside platform-specific post text." },
      { q: "What happens if I don't set an override for a platform?", a: "If no override is set, Posthive uses the base post text for that platform. Overrides are optional and only apply where you explicitly configure them." },
      { q: "Is per-platform overrides available on the free plan?", a: "Per-platform overrides are available on the Pro and Team plans." },
    ],
  },
  "bulk-csv-scheduling": {
    title: "Bulk CSV scheduling",
    badge: "Power feature",
    badgeColor: "#5cb88a",
    badgeBg: "rgba(80,180,120,.15)",
    headline: "Schedule hundreds of posts from a spreadsheet.",
    subheadline: "Upload a CSV file and Posthive schedules every row automatically across multiple platforms with images, first comments, and per-row platform exclusions.",
    image: "/screenshots/feature-bulk-csv.png",
    imageAlt: "Posthive bulk CSV scheduling modal with preview table",
    imageRatio: "16/9",
    why: [
      { title: "Batch your content creation", desc: "Write a week or month of content in a spreadsheet where you can see everything at once, then upload it in one shot. No switching tabs, no repeating the same clicks." },
      { title: "Granular platform control per row", desc: "Each row can target different platforms. Use !instagram to skip Instagram on a text-only post, or bluesky|mastodon for a specific audience. No separate posts needed." },
      { title: "Validate before you commit", desc: "The preview table shows every row with a ✓ Ready or ✕ error status before anything is scheduled. Catch bad dates, missing images, or unrecognized platform names instantly." },
    ],
    how: [
      { n: "01", title: "Prepare your CSV", desc: "Create a spreadsheet with columns: scheduled_for, text, accounts, comment, image_urls. Save as CSV. Each row becomes one scheduled post." },
      { n: "02", title: "Upload and preview", desc: "Open Bulk CSV from the Posts page or Compose page. Upload your file or paste the CSV. Click Preview to validate every row before scheduling." },
      { n: "03", title: "Schedule all at once", desc: "Review the preview table, fix any errors, then click Schedule N posts. Posthive enqueues each valid row and shows a progress bar as they're submitted." },
    ],
    usecases: [
      "Content managers scheduling a month of posts from a content calendar",
      "Agencies onboarding a new client and front-loading their first month",
      "Indie hackers scheduling a product launch drip across platforms",
      "Creators batching content in one session to stay consistent all week",
    ],
    faq: [
      { q: "What columns does the CSV need?", a: "The required columns are: scheduled_for (ISO datetime), text, and accounts. Optional columns are comment (first comment text) and image_urls (comma-separated URLs)." },
      { q: "How do I target specific platforms per row?", a: "Set the accounts column to a pipe-separated list of platform names, e.g. bluesky|linkedin|threads. Use all to post to every connected account, or prefix with ! to exclude a platform." },
      { q: "Is there a row limit?", a: "There is no hard row limit in the app, but we recommend keeping batches under 500 rows for reliable preview performance. Larger batches can be split across multiple uploads." },
      { q: "Can I include images in the CSV?", a: "Yes. Add an image_urls column with one or more public image URLs per row (comma-separated). Posthive fetches and attaches them at publish time." },
    ],
  },
  "self-hostable": {
    title: "Self-hostable",
    badge: "Open source",
    badgeColor: "#3db8c8",
    badgeBg: "rgba(60,180,200,.15)",
    headline: "Run Posthive on your own infrastructure.",
    subheadline: "Posthive is open source under AGPL-3.0. Self-host it on Railway, Fly.io, Render, or your own VPS - full control, no vendor lock-in, no per-seat pricing.",
    image: "/screenshots/feature-self-hostable.png",
    imageAlt: "Posthive self-hosting architecture",
    imageRatio: "16/9",
    why: [
      { title: "Your data, your server", desc: "All OAuth credentials are AES-256-GCM encrypted at rest. In self-hosted mode, they never leave your infrastructure." },
      { title: "No billing required", desc: "Set ENABLE_BILLING=false and every feature is unlocked for all users - no plan limits, no trial, no Dodo account needed." },
      { title: "Modify it freely", desc: "Add platforms, change limits, build internal tooling on top. It's your copy. AGPL-3.0 just asks you to share modifications if you run it as a public service." },
    ],
    how: [
      { n: "01", title: "Clone and configure", desc: "Clone the repo, copy .env.example to .env, fill in your secrets - Redis URL, encryption key, JWT secrets, OAuth credentials for the platforms you want." },
      { n: "02", title: "Run the database migration", desc: "Run pnpm db:migrate inside apps/api. Posthive supports SQLite for local dev and Postgres for production." },
      { n: "03", title: "Deploy anywhere", desc: "pnpm dev spins up both the API and the web app. For production, deploy to Railway (API) + Vercel (frontend) in under 10 minutes." },
    ],
    usecases: [
      "Developers who want full control over their scheduling stack",
      "Teams running internal social media tools without SaaS fees",
      "Privacy-conscious users who don't want credentials on third-party servers",
      "Engineers building on top of Posthive for custom workflows",
    ],
    faq: [
      { q: "What does self-hostable mean?", a: "Self-hostable means you can run the entire Posthive application on your own server or cloud account. Your data — including encrypted OAuth credentials — stays on your infrastructure." },
      { q: "What infrastructure do I need to self-host Posthive?", a: "You need a Node.js server (or a platform like Railway or Fly.io), a Postgres or SQLite database, and a Redis instance (Upstash works well on a free tier)." },
      { q: "Is self-hosted Posthive free?", a: "Yes. The code is free under AGPL-3.0. You only pay for your hosting costs (which can be near-zero on hobby plans). Set ENABLE_BILLING=false to unlock all features." },
      { q: "Can I modify Posthive and run it privately?", a: "Yes, with one caveat: AGPL-3.0 requires you to share your modifications if you run a modified version as a public service. For private internal use, you can modify it freely." },
    ],
  },
};

// ── Inline mockup components ───────────────────────────────────────────────

const PLATFORM_DOMAINS: Record<string, string> = {
  Bluesky: "bsky.app",
  Threads: "threads.net",
  LinkedIn: "linkedin.com",
  Instagram: "instagram.com",
  Mastodon: "mastodon.social",
  YouTube: "youtube.com",
  Facebook: "facebook.com",
};

function PlatformFavicon({ name, size = 14 }: { name: string; size?: number }) {
  const domain = PLATFORM_DOMAINS[name];
  if (!domain) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} alt={name} width={size} height={size} style={{ borderRadius: 3, display: "block" }} />
  );
}

function MultiPlatformMockup() {
  const platforms = [
    { name: "Bluesky", on: true },
    { name: "Threads", on: true },
    { name: "LinkedIn", on: true },
    { name: "Instagram", on: false },
    { name: "Mastodon", on: true },
    { name: "YouTube", on: false },
    { name: "Facebook", on: false },
  ];
  return (
    <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 20, padding: 28, width: "100%", maxWidth: 480 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#444", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 14 }}>Post to</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
        {platforms.map((p) => (
          <div key={p.name} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 11px", borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: p.on ? "rgba(91,99,211,.15)" : "#0f0f0f",
            border: `1px solid ${p.on ? "#5b63d388" : "#1e1e1e"}`,
            color: p.on ? "#9ba2ee" : "#3a3a3a",
            opacity: p.on ? 1 : 0.35,
          }}>
            <PlatformFavicon name={p.name} size={13} />
            {p.name}
          </div>
        ))}
      </div>
      <div style={{ background: "#0d0d0d", borderRadius: 12, padding: "14px 16px", marginBottom: 18 }}>
        <div style={{ fontSize: 13, color: "#333", marginBottom: 10 }}>What&apos;s on your mind?</div>
        <div style={{ fontSize: 13.5, color: "#bbb", lineHeight: 1.65 }}>
          Just shipped v2.0 🚀 New drag-to-reschedule calendar is live. Move posts around with one drag - no more manual edits.{" "}
          <span style={{ color: "#5b63d3" }}>posthive.co</span>
        </div>
        <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#333" }}>142 / 300</span>
          <div style={{ display: "flex", gap: 6 }}>
            {["BSky", "TH", "LI", "MA"].map((t) => (
              <span key={t} style={{ fontSize: 10, background: "rgba(91,99,211,.1)", color: "#7b83dd", borderRadius: 4, padding: "2px 6px" }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, color: "#444", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 14 }}>📅</span> Tomorrow, 9:00 AM
        </div>
        <div style={{ background: "#5b63d3", color: "#fff", padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
          Schedule →
        </div>
      </div>
    </div>
  );
}

function ReelsMockup() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 460 }}>
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 20, padding: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#444", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 14 }}>Instagram content type</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[
            {
              label: "Feed Post", active: false,
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>,
            },
            {
              label: "Reel", active: true,
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
            },
            {
              label: "Story", active: false,
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>,
            },
            {
              label: "Carousel", active: false,
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="14" height="14" rx="2"/><path d="M6 2h14a2 2 0 0 1 2 2v14"/></svg>,
            },
          ].map((t) => (
            <div key={t.label} style={{
              flex: 1, textAlign: "center", padding: "10px 6px", borderRadius: 10, cursor: "pointer",
              background: t.active ? "rgba(232,107,107,.12)" : "#0d0d0d",
              border: `1px solid ${t.active ? "#e86b6b66" : "#1e1e1e"}`,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            }}>
              <span style={{ color: t.active ? "#e86b6b" : "#444", display: "flex" }}>{t.icon}</span>
              <div style={{ fontSize: 10, fontWeight: 600, color: t.active ? "#e86b6b" : "#444" }}>{t.label}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "#0d0d0d", border: "1px dashed #2a2a2a", borderRadius: 10, padding: "20px 16px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          <div style={{ fontSize: 12, color: "#555" }}>Drop your Reel video here</div>
          <div style={{ fontSize: 10, color: "#3a3a3a", marginTop: 4 }}>MP4 · up to 15 min · 9:16 recommended</div>
        </div>
      </div>
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#e86b6b,#f5a623)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#ededed", fontWeight: 600 }}>Schedules at peak engagement time</div>
          <div style={{ fontSize: 11, color: "#555" }}>Tuesday · 7:00 PM · Your timezone</div>
        </div>
        <div style={{ marginLeft: "auto", width: 10, height: 10, borderRadius: "50%", background: "#4ade80", flexShrink: 0 }} />
      </div>
    </div>
  );
}

function CalendarMockup() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const posts: Record<number, { label: string; color: string; platform: string }[]> = {
    0: [{ label: "Product update 🚀", color: "#5b63d3", platform: "BSky" }],
    1: [{ label: "Behind the scenes", color: "#e86b6b", platform: "IG" }],
    2: [],
    3: [
      { label: "Weekly tip ✨", color: "#5b63d3", platform: "LI" },
      { label: "Thread drop", color: "#888", platform: "TH" },
    ],
    4: [{ label: "Friday recap", color: "#5cb88a", platform: "MA" }],
    5: [],
    6: [],
  };
  return (
    <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 20, padding: 24, maxWidth: 480, width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#ededed" }}>July 2026</div>
        <div style={{ display: "flex", gap: 8 }}>
          {["Month", "Week", "Day"].map((v, i) => (
            <span key={v} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: i === 1 ? "#5b63d3" : "#1a1a1a", color: i === 1 ? "#fff" : "#555", fontWeight: 600 }}>{v}</span>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {days.map((d) => (
          <div key={d} style={{ fontSize: 10, color: "#444", textAlign: "center", paddingBottom: 8, fontWeight: 700 }}>{d}</div>
        ))}
        {days.map((_, i) => (
          <div key={i} style={{ minHeight: 72, background: "#0d0d0d", borderRadius: 8, padding: 5, border: "1px solid #1a1a1a" }}>
            <div style={{ fontSize: 10, color: "#444", marginBottom: 4 }}>{i + 7}</div>
            {posts[i]?.map((p) => (
              <div key={p.label} style={{ background: p.color + "22", border: `1px solid ${p.color}44`, borderRadius: 4, padding: "3px 5px", marginBottom: 3 }}>
                <div style={{ fontSize: 9, color: p.color, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.platform}</div>
                <div style={{ fontSize: 9, color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.label}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, padding: "10px 14px", background: "#0d0d0d", borderRadius: 10, border: "1px dashed #2a2a2a", fontSize: 11, color: "#555", textAlign: "center" }}>
        ↕ Drag any post to reschedule
      </div>
    </div>
  );
}

function FirstCommentMockup() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, maxWidth: 460, width: "100%" }}>
      {/* Main post */}
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "16px 16px 4px 4px", padding: 22 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#5b63d3,#9ba2ee)", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#ededed" }}>@yourhandle</div>
            <div style={{ fontSize: 11, color: "#444" }}>Just now · via Posthive</div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 10, background: "rgba(74,222,128,.1)", color: "#4ade80", border: "1px solid #4ade8044", borderRadius: 6, padding: "3px 8px", alignSelf: "flex-start" }}>
            ✓ Published
          </div>
        </div>
        <div style={{ fontSize: 14, color: "#ccc", lineHeight: 1.65 }}>
          Excited to share what we&apos;ve been building 🧵 A thread on why we chose open-source for our social scheduling tool and what it means for you.
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 16 }}>
          {["❤ 24", "💬 7", "🔁 11"].map((a) => (
            <span key={a} style={{ fontSize: 12, color: "#555" }}>{a}</span>
          ))}
        </div>
      </div>
      {/* Connector */}
      <div style={{ display: "flex", paddingLeft: 30 }}>
        <div style={{ width: 2, height: 16, background: "#1e1e1e" }} />
      </div>
      {/* First comment */}
      <div style={{ background: "#0e0e0e", border: "1px solid #1e1e1e", borderRadius: "4px 4px 16px 16px", padding: 22, borderTop: "none" }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#5b63d3,#9ba2ee)", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#ededed" }}>@yourhandle</div>
            <div style={{ fontSize: 10, color: "#333" }}>Auto-comment · 3s after publish</div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 10, background: "rgba(91,99,211,.15)", color: "#9ba2ee", border: "1px solid #5b63d344", borderRadius: 6, padding: "3px 8px", alignSelf: "flex-start" }}>
            🤖 First comment
          </div>
        </div>
        <div style={{ fontSize: 13, color: "#888", lineHeight: 1.65 }}>
          👇 Links in the thread below. <span style={{ color: "#5b63d3" }}>posthive.co</span>{"\n"}
          <span style={{ color: "#555" }}>#OpenSource #BuildInPublic #SocialMedia</span>
        </div>
      </div>
    </div>
  );
}

function OverridesMockup() {
  const platforms = [
    {
      name: "LinkedIn",
      color: "#0a66c2",
      text: "Thrilled to announce Posthive's v2.0 release - a major step forward in how teams manage cross-platform social media. Our drag-to-reschedule calendar and bulk CSV import have been the most requested features since launch. We built them with efficiency in mind. Looking forward to hearing how teams use them. 🔗 posthive.co",
      chars: "312 / 3000",
    },
    {
      name: "Bluesky",
      color: "#0085ff",
      text: "v2.0 is live 🚀 drag-to-reschedule calendar + bulk CSV scheduling. built different. posthive.co",
      chars: "96 / 300",
    },
    {
      name: "Threads",
      color: "#ededed",
      text: "ok v2.0 dropped. you can now drag posts around on a calendar. yes, finally. also bulk CSV if you're that kind of person 🧵",
      chars: "122 / 500",
    },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 500, width: "100%" }}>
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 14, padding: "14px 18px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#444", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 10 }}>Base post (fallback)</div>
        <div style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>v2.0 is live. Drag-to-reschedule and bulk CSV scheduling. posthive.co</div>
      </div>
      {platforms.map((p) => (
        <div key={p.name} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 14, padding: "14px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <PlatformFavicon name={p.name} size={14} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#ededed" }}>{p.name}</span>
              <span style={{ fontSize: 10, color: "#4ade80", background: "rgba(74,222,128,.08)", border: "1px solid #4ade8033", borderRadius: 5, padding: "1px 6px" }}>Custom</span>
            </div>
            <span style={{ fontSize: 10, color: "#444" }}>{p.chars}</span>
          </div>
          <div style={{ fontSize: 12.5, color: "#888", lineHeight: 1.6 }}>{p.text}</div>
        </div>
      ))}
    </div>
  );
}

function CsvMockup() {
  const rows = [
    { date: "2026-07-07 09:00", text: "Shipping v2.0 today 🚀 drag-to-reschedule is live", accounts: "bluesky|threads|linkedin", status: "ready" },
    { date: "2026-07-08 14:00", text: "Behind the scenes: building a content scheduler in Next.js", accounts: "instagram|youtube", status: "ready" },
    { date: "2026-07-09 10:00", text: "Weekly tip: use CSV bulk upload to schedule a full month in 10 minutes", accounts: "all", status: "ready" },
    { date: "2026-07-10 08:30", text: "Open-source and self-hostable - why we chose AGPL-3.0", accounts: "bluesky|mastodon", status: "warn" },
  ];
  return (
    <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 20, padding: 24, width: "100%", maxWidth: 720, overflowX: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#ededed" }}>preview.csv</div>
          <div style={{ fontSize: 11, color: "#555" }}>4 rows · all valid</div>
        </div>
        <div style={{ background: "#5b63d3", color: "#fff", padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
          Schedule 4 posts →
        </div>
      </div>
      <div style={{ minWidth: 580 }}>
        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 140px 80px", gap: 0 }}>
          {["scheduled_for", "text", "accounts", "status"].map((h) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#444", letterSpacing: ".06em", textTransform: "uppercase", padding: "6px 10px", borderBottom: "1px solid #1e1e1e" }}>{h}</div>
          ))}
          {rows.map((r, i) => (
            <React.Fragment key={i}>
              <div style={{ fontSize: 11, color: "#666", padding: "10px 10px", borderBottom: "1px solid #111", fontFamily: "monospace" }}>{r.date}</div>
              <div style={{ fontSize: 12, color: "#aaa", padding: "10px 10px", borderBottom: "1px solid #111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.text}</div>
              <div style={{ fontSize: 11, color: "#666", padding: "10px 10px", borderBottom: "1px solid #111", fontFamily: "monospace" }}>{r.accounts}</div>
              <div style={{ padding: "10px 10px", borderBottom: "1px solid #111" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: r.status === "ready" ? "#4ade80" : "#f59e0b", background: r.status === "ready" ? "rgba(74,222,128,.08)" : "rgba(245,158,11,.08)", border: `1px solid ${r.status === "ready" ? "#4ade8033" : "#f59e0b33"}`, borderRadius: 5, padding: "2px 6px" }}>
                  {r.status === "ready" ? "✓ Ready" : "⚠ Warn"}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function SelfHostMockup() {
  const lines = [
    { t: "comment", v: "# Clone the repo" },
    { t: "cmd", v: "git clone https://github.com/posthive/posthive" },
    { t: "cmd", v: "cd posthive && cp apps/api/.env.example apps/api/.env" },
    { t: "blank", v: "" },
    { t: "comment", v: "# Run migrations & start" },
    { t: "cmd", v: "pnpm install" },
    { t: "cmd", v: "cd apps/api && pnpm db:migrate" },
    { t: "cmd", v: "pnpm dev" },
    { t: "blank", v: "" },
    { t: "output", v: "▶  API  ready on http://localhost:3001" },
    { t: "output", v: "▶  Web  ready on http://localhost:3000" },
  ];
  return (
    <div style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 20, overflow: "hidden", maxWidth: 560, width: "100%" }}>
      <div style={{ background: "#111", padding: "12px 18px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #1e1e1e" }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#e86b6b" }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#d4a83c" }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#5cb88a" }} />
        <span style={{ fontSize: 11, color: "#444", marginLeft: 8, fontFamily: "monospace" }}>Terminal</span>
      </div>
      <div style={{ padding: "20px 22px", fontFamily: "monospace" }}>
        {lines.map((l, i) => (
          <div key={i} style={{ fontSize: 12.5, lineHeight: 1.8, color: l.t === "comment" ? "#555" : l.t === "output" ? "#4ade80" : "#bbb" }}>
            {l.t === "cmd" ? <><span style={{ color: "#5b63d3" }}>$ </span>{l.v}</> : l.v}
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
          <span style={{ color: "#5b63d3" }}>$ </span>
          <span style={{ display: "inline-block", width: 8, height: 16, background: "#5b63d3", animation: "none", verticalAlign: "middle" }} />
        </div>
      </div>
      <div style={{ background: "#0d0d0d", borderTop: "1px solid #1a1a1a", padding: "12px 22px", display: "flex", gap: 16 }}>
        {[["SQLite / Postgres", "🗄"], ["Redis / Upstash", "⚡"], ["Any cloud", "☁"]].map(([label, icon]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13 }}>{icon}</span>
            <span style={{ fontSize: 11, color: "#555" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Layout variants ────────────────────────────────────────────────────────

type Layout = "split-right" | "split-left" | "center";

const LAYOUT_MAP: Record<string, Layout> = {
  "multi-platform-posting": "split-right",
  "instagram-reels-scheduler": "split-right",
  "drag-to-reschedule": "split-left",
  "first-comment": "split-right",
  "per-platform-overrides": "split-left",
  "bulk-csv-scheduling": "center",
  "self-hostable": "center",
};

function getMockup(slug: string) {
  switch (slug) {
    case "multi-platform-posting": return <MultiPlatformMockup />;
    case "instagram-reels-scheduler": return <ReelsMockup />;
    case "drag-to-reschedule": return <CalendarMockup />;
    case "first-comment": return <FirstCommentMockup />;
    case "per-platform-overrides": return <OverridesMockup />;
    case "bulk-csv-scheduling": return <CsvMockup />;
    case "self-hostable": return <SelfHostMockup />;
    default: return null;
  }
}

// ── Metadata ───────────────────────────────────────────────────────────────

const SLUG_OVERRIDES: Record<string, { title: string; description: string; keywords: string[] }> = {
  "multi-platform-posting": {
    title: "Multi-Platform Social Media Scheduler — Post to 13 platforms at Once | Posthive",
    description: "Write once, post everywhere. Schedule to Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, Facebook, Pinterest, Telegram, Nostr, and X in one click. The best Buffer and Hootsuite alternative.",
    keywords: ["multi-platform social media scheduler", "post to multiple social media at once", "Buffer alternative", "Hootsuite alternative", "cross-platform posting"],
  },
  "instagram-reels-scheduler": {
    title: "Instagram Reels Scheduler — Schedule Reels, Stories & Carousels | Posthive",
    description: "Schedule Instagram Reels, Stories, carousels, and feed posts without switching tabs. The easiest Instagram Reels scheduler for creators and brands.",
    keywords: ["Instagram Reels scheduler", "schedule Instagram Reels", "Instagram Story scheduler", "Instagram carousel scheduler", "schedule Instagram posts"],
  },
  "drag-to-reschedule": {
    title: "Social Media Content Calendar with Drag-to-Reschedule | Posthive",
    description: "Visualise your entire posting schedule on a drag-and-drop calendar. Move posts instantly, spot gaps, and never miss a publish date.",
    keywords: ["social media content calendar", "drag and drop social media scheduler", "content calendar tool", "reschedule social media posts"],
  },
  "first-comment": {
    title: "Auto First Comment Scheduling — Post Hashtags Automatically | Posthive",
    description: "Automatically post a first comment the moment your content goes live. Keep captions clean and drop hashtags, links, or CTAs in the first comment.",
    keywords: ["schedule first comment", "auto first comment Instagram", "LinkedIn first comment scheduling", "hashtags in first comment"],
  },
  "per-platform-overrides": {
    title: "Per-Platform Social Media Overrides — Different Text Per Network | Posthive",
    description: "Write one post, customise it for every platform. Different character limits, different audiences, different tones — all from a single composer.",
    keywords: ["per platform social media post", "customize posts per platform", "different text per social network", "platform specific content"],
  },
  "bulk-csv-scheduling": {
    title: "Bulk Social Media Scheduling via CSV — Schedule Hundreds of Posts | Posthive",
    description: "Upload a CSV and schedule hundreds of social media posts at once across 13 platforms. The fastest way to bulk-schedule content for creators and agencies.",
    keywords: ["bulk social media scheduling", "CSV social media scheduler", "schedule multiple posts at once", "bulk schedule Instagram", "content scheduling spreadsheet"],
  },
  "self-hostable": {
    title: "Self-Hostable Open Source Social Media Scheduler | Posthive",
    description: "Run your own social media scheduler. Posthive is open source (AGPL-3.0) and self-hostable on Railway, Fly.io, or any VPS. Full data ownership, no vendor lock-in.",
    keywords: ["self-hosted social media scheduler", "open source social media tool", "self-host Buffer alternative", "AGPL social media scheduler"],
  },
};

export async function generateStaticParams() {
  return Object.keys(FEATURES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = FEATURES[slug];
  if (!data) return {};
  const override = SLUG_OVERRIDES[slug];
  const title = override?.title ?? `${data.title} | Posthive`;
  const description = override?.description ?? data.subheadline;
  const ogImage = `/api/og?layout=features&title=${encodeURIComponent(data.headline)}&desc=${encodeURIComponent(data.badge)}&badge=${encodeURIComponent(data.badge)}`;
  return {
    title,
    description,
    keywords: override?.keywords,
    alternates: { canonical: `${WEB_URL}/features/${slug}` },
    openGraph: {
      title,
      description,
      url: `${WEB_URL}/features/${slug}`,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────

export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = FEATURES[slug];
  if (!data) notFound();

  const layout = LAYOUT_MAP[slug] ?? "center";
  const mockup = getMockup(slug);
  const isSplit = layout === "split-right" || layout === "split-left";

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: data.headline,
    description: data.subheadline,
    step: data.how.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      text: s.desc,
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Posthive", item: WEB_URL },
      { "@type": "ListItem", position: 2, name: data.title, item: `${WEB_URL}/features/${slug}` },
    ],
  };

  const faqSchema = data.faq && data.faq.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  } : null;

  const W = "1200px";
  const div = "rgba(237,237,237,0.1)";
  const muted75 = "rgba(237,237,237,0.75)";
  const muted55 = "rgba(237,237,237,0.55)";
  const accent = "#5b63d3";

  const ALL_FEATURES = [
    { slug: "multi-platform-posting",    label: "MULTI-PLATFORM",   title: "Write once. Post everywhere.",       desc: "One composer, thirteen platforms." },
    { slug: "instagram-reels-scheduler", label: "REELS & STORIES",  title: "Full Instagram media support",       desc: "Reels, Stories, and carousels — all scheduled." },
    { slug: "drag-to-reschedule",        label: "CALENDAR",         title: "Drag to reschedule",                 desc: "Month, week, day. Drag any post to a new slot." },
    { slug: "first-comment",             label: "FIRST COMMENT",    title: "Auto-reply on publish",              desc: "Fires the moment your post goes live." },
    { slug: "per-platform-overrides",    label: "OVERRIDES",        title: "Custom text per network",            desc: "Same base post, per-platform voice." },
    { slug: "bulk-csv-scheduling",       label: "BULK CSV",         title: "Schedule hundreds from a file",      desc: "Upload a spreadsheet, schedule every row." },
    { slug: "self-hostable",             label: "SELF-HOSTABLE",    title: "AGPL-3.0 open source",               desc: "Run it yourself — full data control." },
  ];
  const otherFeatures = ALL_FEATURES.filter(f => f.slug !== slug);

  return (
    <div style={{
      minHeight: "100vh", color: "#ededed", fontFamily: "Inter,system-ui,-apple-system,sans-serif",
      background: `radial-gradient(1100px 640px at 88% -180px, rgba(30,33,64,0.7), transparent 60%), radial-gradient(900px 700px at -8% 110%, rgba(0,0,0,0.3), transparent 55%), #0a0a0a`,
    }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}
      <style>{`
        .feat-wrap { max-width: ${W}; margin: 0 auto; padding: 0 clamp(20px,5vw,72px); }
        .feat-rule { height: 1px; border: 0; margin: 0; background: linear-gradient(to right, transparent, ${div} 48px calc(100% - 48px), transparent); }
        .feat-kicker { display: inline-flex; align-items: center; gap: 12px; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: ${accent}; margin: 0 0 20px; }
        .feat-kicker::before { content: ""; width: 32px; height: 1px; background: ${accent}; }
        @media (max-width: 900px) {
          .feat-hero-grid, .feat-how-grid, .feat-who-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .feat-why-grid, .feat-toolkit-grid { grid-template-columns: 1fr 1fr !important; }
          .feat-hero-sticky { position: static !important; }
        }
        @media (max-width: 600px) {
          .feat-why-grid, .feat-toolkit-grid { grid-template-columns: 1fr !important; }
          .feat-hero-grid, .feat-how-grid, .feat-who-grid { gap: 28px !important; }
        }
        .feat-faq details { padding: 22px 0; border-top: 1px solid ${div}; }
        .feat-faq details summary { cursor: pointer; font-size: 17px; font-weight: 500; list-style: none; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .feat-faq details summary::-webkit-details-marker { display: none; }
        .feat-faq-last { border-bottom: 1px solid ${div}; }
        .feat-faq summary .faq-plus { color: ${accent}; font-size: 20px; font-weight: 400; flex: none; transition: transform 0.15s; }
        .feat-faq details[open] summary .faq-plus { transform: rotate(45deg); }
        .feat-toolkit-card { text-decoration: none; color: inherit; padding: 22px; border: 1px solid ${div}; border-radius: 12px; display: flex; flex-direction: column; gap: 8px; background: rgba(17,17,17,0.5); transition: border-color 0.15s; }
        .feat-toolkit-card:hover { border-color: ${accent}; }
      `}</style>

      <MarketingNavBar />
      <div style={{ height: 68 }} />

      {/* breadcrumb */}
      <div className="feat-wrap" style={{ paddingTop: 24, fontSize: 12, letterSpacing: "0.06em", color: muted55 }}>
        <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>Home</Link>
        <span style={{ margin: "0 8px", opacity: 0.5 }}>/</span>
        <Link href="/features/multi-platform-posting" style={{ color: "inherit", textDecoration: "none" }}>Features</Link>
        <span style={{ margin: "0 8px", opacity: 0.5 }}>/</span>
        <span style={{ color: "#ededed" }}>{data.title}</span>
      </div>

      {/* ── Hero ── */}
      <section className="feat-wrap" style={{ padding: "calc(2.5*28px) clamp(20px,5vw,72px) calc(3*28px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: isSplit ? "1fr 1.05fr" : "1fr", gap: isSplit ? 80 : 0, alignItems: "center" }} className="feat-hero-grid">
          <div style={{ order: layout === "split-left" ? 2 : 1 }}>
            <span className="feat-kicker">{data.badge}</span>
            <h1 style={{ fontSize: isSplit ? "clamp(36px,4.8vw,60px)" : "clamp(36px,5vw,68px)", fontWeight: 500, letterSpacing: "-.02em", lineHeight: 1.05, margin: "0 0 24px" }}>
              {data.headline}
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.55, maxWidth: "58ch", color: muted75, margin: "0 0 32px" }}>
              {data.subheadline}
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/register" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, padding: "12px 20px", borderRadius: 8, background: accent, color: "#fff", textDecoration: "none", border: `1px solid ${accent}` }}>
                Try free for 14 days →
              </Link>
              <Link href="/pricing" style={{ display: "inline-flex", alignItems: "center", fontSize: 14, fontWeight: 600, padding: "12px 20px", borderRadius: 8, background: "transparent", color: muted75, textDecoration: "none", border: `1px solid ${div}` }}>
                View pricing
              </Link>
            </div>
            {/* inline stats */}
            {slug === "multi-platform-posting" && (
              <div style={{ display: "flex", gap: 40, marginTop: 56, paddingTop: 24, borderTop: `1px solid ${div}` }}>
                {[{ n: "13", label: "Platforms" }, { n: "1", label: "Composer" }, { n: "∞", label: "Reach" }].map(s => (
                  <div key={s.n}>
                    <div style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-0.02em", fontFeatureSettings: "'tnum' 1" }}>{s.n}</div>
                    <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: muted55, marginTop: 6 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
            {slug === "self-hostable" && (
              <div style={{ display: "flex", gap: 40, marginTop: 56, paddingTop: 24, borderTop: `1px solid ${div}` }}>
                {[{ n: "AGPL", label: "License" }, { n: "0", label: "Per-seat" }, { n: "100%", label: "Data ownership" }].map(s => (
                  <div key={s.n}>
                    <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em" }}>{s.n}</div>
                    <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: muted55, marginTop: 6 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {isSplit && mockup && (
            <div style={{ order: layout === "split-left" ? 1 : 2, display: "flex", justifyContent: "center" }}>
              {mockup}
            </div>
          )}
        </div>
      </section>

      <div className="feat-wrap"><hr className="feat-rule" /></div>

      {/* ── Why it matters ── */}
      <section className="feat-wrap" style={{ padding: "calc(3*28px) clamp(20px,5vw,72px)" }}>
        <span className="feat-kicker">Why it matters</span>
        <h2 style={{ fontSize: "clamp(28px,3.2vw,40px)", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 56px", maxWidth: "26ch", fontWeight: 500 }}>
          The grind of cross-posting, gone.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 56 }} className="feat-why-grid">
          {data.why.map((w, i) => (
            <div key={w.title}>
              <div style={{ fontSize: 11, letterSpacing: "0.14em", color: accent, fontFeatureSettings: "'tnum' 1", marginBottom: 20 }}>0{i + 1}</div>
              <h3 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 12px" }}>{w.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: muted75, margin: 0 }}>{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="feat-wrap"><hr className="feat-rule" /></div>

      {/* ── Under the hood (screenshot) ── */}
      {data.image && (
        <section className="feat-wrap" style={{ padding: "calc(3*28px) clamp(20px,5vw,72px)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
            <div>
              <span className="feat-kicker">Under the hood</span>
              <h2 style={{ fontSize: "clamp(26px,3vw,36px)", letterSpacing: "-0.02em", lineHeight: 1.1, margin: 0, fontWeight: 500, maxWidth: "28ch" }}>The feature, in the app.</h2>
            </div>
            <Link href="/register" style={{ fontSize: 14, color: accent, textDecoration: "none" }}>Try it yourself →</Link>
          </div>
          <div style={{ width: "100%", borderRadius: 14, overflow: "hidden", background: "#111", border: `1px solid ${div}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.image} alt={data.imageAlt} style={{ width: "100%", height: "auto", display: "block" }} />
          </div>
          <p style={{ fontSize: 12, color: muted55, marginTop: 12, letterSpacing: "0.02em" }}>Fig. 01 — {data.imageAlt}</p>
        </section>
      )}

      <div className="feat-wrap"><hr className="feat-rule" /></div>

      {/* ── How it works ── */}
      <section className="feat-wrap" style={{ padding: "calc(3*28px) clamp(20px,5vw,72px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 80, alignItems: "start" }} className="feat-how-grid">
          <div className="feat-hero-sticky" style={{ position: "sticky", top: 100 }}>
            <span className="feat-kicker">How it works</span>
            <h2 style={{ fontSize: "clamp(28px,3.2vw,40px)", letterSpacing: "-0.02em", lineHeight: 1.1, margin: 0, fontWeight: 500 }}>
              Three steps.<br />No manuals.
            </h2>
          </div>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column" }}>
            {data.how.map((s, i) => (
              <li key={s.n} style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 24, alignItems: "start", padding: "32px 0", borderBottom: i < data.how.length - 1 ? `1px solid ${div}` : "none" }}>
                <div style={{ fontSize: 44, lineHeight: 1, fontWeight: 500, color: accent, fontFeatureSettings: "'tnum' 1", letterSpacing: "-0.03em" }}>{s.n}</div>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 10px" }}>{s.title}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: muted75, margin: 0 }}>{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="feat-wrap"><hr className="feat-rule" /></div>

      {/* ── Who uses this ── */}
      <section className="feat-wrap" style={{ padding: "calc(3*28px) clamp(20px,5vw,72px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "start" }} className="feat-who-grid">
          <div>
            <span className="feat-kicker">Who uses this</span>
            <h2 style={{ fontSize: "clamp(26px,3vw,36px)", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 32px", fontWeight: 500 }}>
              Built for people shipping in&nbsp;public.
            </h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
              {data.usecases.map((u) => (
                <li key={u} style={{ display: "flex", gap: 14, alignItems: "baseline", fontSize: 15, lineHeight: 1.5 }}>
                  <span style={{ color: accent, flex: "none", marginTop: 1 }}>◆</span>
                  {u}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ borderLeft: `1px solid ${accent}`, padding: "8px 0 8px 32px" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: accent, marginBottom: 20 }}>From the builder</div>
            <p style={{ fontSize: 16, lineHeight: 1.65, color: "#ededed", margin: "0 0 20px" }}>
              &ldquo;I was copy-pasting the same post into five different apps every day. Every tool I tried was too expensive, too bloated, or didn&apos;t support the platforms I actually used. So I built Posthive.&rdquo;
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#2a2a2a", display: "grid", placeItems: "center", flexShrink: 0, fontSize: 15, fontWeight: 500, color: muted75 }}>G</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Guna Sheelan</div>
                <div style={{ fontSize: 12, color: muted55 }}>Founder · @gunaa_dev</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="feat-wrap"><hr className="feat-rule" /></div>

      {/* ── FAQ ── */}
      {data.faq && data.faq.length > 0 && (
        <section className="feat-wrap" style={{ padding: "calc(3*28px) clamp(20px,5vw,72px)" }}>
          <span className="feat-kicker">FAQ</span>
          <h2 style={{ fontSize: "clamp(28px,3.2vw,40px)", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 48px", fontWeight: 500 }}>Frequently asked questions</h2>
          <div className="feat-faq">
            {data.faq.map((item, i) => (
              <details key={item.q} className={i === data.faq!.length - 1 ? "feat-faq-last" : ""} open={i === 0}>
                <summary>
                  {item.q}
                  <span className="faq-plus">+</span>
                </summary>
                <p style={{ margin: "14px 0 0", fontSize: 14, lineHeight: 1.65, color: muted75, maxWidth: "72ch" }}>{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      <div className="feat-wrap"><hr className="feat-rule" /></div>

      {/* ── Related toolkit ── */}
      <section className="feat-wrap" style={{ padding: "calc(3*28px) clamp(20px,5vw,72px)" }}>
        <span className="feat-kicker">Part of a full scheduling toolkit</span>
        <h2 style={{ fontSize: "clamp(26px,3vw,36px)", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 40px", maxWidth: "32ch", fontWeight: 500 }}>
          {data.title} is one of seven features working together.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }} className="feat-toolkit-grid">
          {otherFeatures.map((f) => (
            <Link key={f.slug} href={`/features/${f.slug}`} className="feat-toolkit-card">
              <div style={{ fontSize: 11, letterSpacing: "0.12em", color: accent }}>{f.label}</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: muted55, lineHeight: 1.55 }}>{f.desc}</div>
            </Link>
          ))}
        </div>
        <Link href="/docs" style={{ fontSize: 14, color: accent, textDecoration: "none", display: "inline-block", marginTop: 28 }}>Read the docs →</Link>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: "linear-gradient(180deg, transparent 0%, rgba(30,33,64,0.32) 100%)", padding: "calc(4*28px) 0" }}>
        <div className="feat-wrap" style={{ maxWidth: 900 }}>
          <span className="feat-kicker">Get started today</span>
          <h2 style={{ fontSize: "clamp(32px,4vw,56px)", letterSpacing: "-0.025em", lineHeight: 1.05, margin: "0 0 20px", fontWeight: 500 }}>Start scheduling for free.</h2>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: "rgba(237,237,237,0.78)", marginBottom: 32, maxWidth: "56ch" }}>
            14-day free trial. No credit card required. Connect your first account in under a minute and schedule your first post today.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/register" style={{ display: "inline-flex", alignItems: "center", fontSize: 14, fontWeight: 600, padding: "14px 24px", borderRadius: 8, background: accent, color: "#fff", textDecoration: "none", border: `1px solid ${accent}` }}>
              Get started free →
            </Link>
            <Link href="/pricing" style={{ display: "inline-flex", alignItems: "center", fontSize: 14, fontWeight: 600, padding: "14px 24px", borderRadius: 8, background: "transparent", color: muted75, textDecoration: "none", border: `1px solid ${div}` }}>
              Pricing
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
