import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MarketingNavBar } from "../../../components/MarketingNavBar";
import { LandingFooter } from "../../../components/LandingFooter";
import { cn } from "../../../lib/cn";

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
    badgeColor: "var(--color-brand-800)",
    badgeBg: "var(--color-brand-100)",
    headline: "Write once. Post everywhere.",
    subheadline:
      "One composer, eleven platforms. Draft your content once and send it to Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, Facebook, Pinterest, Telegram, Nostr, and X in a single click.",
    image: "/screenshots/feature-multi-platform.png",
    imageAlt: "Posthive composer selecting multiple platforms",
    why: [
      {
        title: "Stop the copy-paste grind",
        desc: "Opening seven tabs, copy-pasting the same text, adjusting for each platform. That's 20 minutes per post. Posthive collapses it to one action.",
      },
      {
        title: "Native previews per platform",
        desc: "See exactly how your post will render on each platform before it goes live. Character count, media layout, link card all shown in real time.",
      },
      {
        title: "Consistent presence, less effort",
        desc: "Showing up consistently is what builds an audience. Posthive makes that sustainable instead of exhausting.",
      },
    ],
    how: [
      {
        n: "01",
        title: "Connect your accounts",
        desc: "Link each platform once. Posthive securely stores encrypted credentials so you never have to re-authenticate.",
      },
      {
        n: "02",
        title: "Select your platforms",
        desc: "Check the accounts you want to post to. Mix and match - post to three platforms today, all seven tomorrow.",
      },
      {
        n: "03",
        title: "Compose and schedule",
        desc: "Write your content, attach media, set a time. Posthive handles every platform independently at the scheduled moment.",
      },
    ],
    usecases: [
      "Indie hackers sharing build-in-public updates",
      "Creators cross-posting to grow on multiple networks",
      "Founders maintaining visibility while shipping",
      "Marketers running multi-channel campaigns from one place",
    ],
    faq: [
      {
        q: "How many platforms does Posthive support?",
        a: "Posthive currently supports multiple platforms: Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, Facebook Pages, Pinterest, Telegram, Nostr, X (Twitter), Discord, Tumblr and more",
      },
      {
        q: "Can I post different content to each platform?",
        a: "Yes. Posthive's per-platform override feature lets you write a base post and then customise the text, media, and first comment independently for each account.",
      },
      {
        q: "Is Posthive a good Buffer or Hootsuite alternative?",
        a: "Yes. Posthive covers all major platforms, costs significantly less, and is open source you can self-host it if you prefer full data control.",
      },
      {
        q: "Do I need a separate account for each platform?",
        a: "No. Connect all your social accounts once from the Accounts page and they're available in every compose session. You just tick which ones to post to.",
      },
    ],
  },
  "instagram-reels-scheduler": {
    title: "Reels & Stories",
    badge: "Instagram",
    badgeColor: "var(--color-red-600)",
    badgeBg: "var(--color-red-50)",
    headline:
      "Full Instagram support. Reels, Stories, feed posts all scheduled.",
    subheadline:
      "Most schedulers support basic Instagram posts. Posthive goes further. Schedule Reels, Stories, and carousels without leaving the composer.",
    image: "/screenshots/feature-reels-stories.png",
    imageAlt: "Posthive Instagram Reel scheduling with content type selector",
    imageRatio: "4/3",
    why: [
      {
        title: "Reels are where reach happens",
        desc: "Reels get dramatically more reach than feed posts on Instagram. Scheduling them means you can post at peak times without being online.",
      },
      {
        title: "Stories keep you top-of-mind",
        desc: "Stories disappear after 24 hours which means consistent posting is everything. Schedule a week of Stories in one session.",
      },
      {
        title: "Carousels drive the most saves",
        desc: "Carousel posts get more saves and shares than single images. Posthive supports up to 10 items per carousel with alt text on each.",
      },
    ],
    how: [
      {
        n: "01",
        title: "Connect your Professional account",
        desc: "Link your Instagram Business or Creator account via Meta OAuth. Personal accounts aren't supported by the Instagram API.",
      },
      {
        n: "02",
        title: "Choose your content type",
        desc: "Select Feed Post, Reel, or Story in the Compose page. Attach your media - image or video depending on the type.",
      },
      {
        n: "03",
        title: "Schedule and publish",
        desc: "Posthive processes the media through Instagram's container API and publishes at your scheduled time automatically.",
      },
    ],
    usecases: [
      "Creators scheduling Reels to hit peak-hour reach",
      "Brands maintaining a daily Story presence without daily effort",
      "Photographers scheduling carousel portfolios",
      "Coaches delivering educational carousel content on a schedule",
    ],
    faq: [
      {
        q: "Can I schedule Instagram Reels with Posthive?",
        a: "Yes. Posthive supports Instagram Reels scheduling via the official Instagram Content Publishing API. Connect a Business or Creator account and choose 'Reel' in the composer.",
      },
      {
        q: "Does Posthive support Instagram Stories?",
        a: "Yes. You can schedule Stories from the composer just select 'Story' as the content type and upload an image or short video.",
      },
      {
        q: "Why can't I connect a personal Instagram account?",
        a: "Meta's Instagram API only allows publishing to Business and Creator accounts. Personal accounts are not supported by the API you'll need to switch your account type in Instagram settings.",
      },
      {
        q: "Can I schedule Instagram carousels?",
        a: "Yes. Select 'Carousel' in the composer and upload up to 10 images. Each image supports its own alt text for accessibility.",
      },
    ],
  },
  "drag-to-reschedule": {
    title: "Drag-to-reschedule",
    badge: "Calendar",
    badgeColor: "var(--color-green-700)",
    badgeBg: "var(--color-green-50)",
    headline: "Your content calendar, actually visual.",
    subheadline:
      "See all your scheduled posts on a calendar. Drag to move them. Click to edit. No spreadsheets, no mental math. Just a clear picture of what's going live and when.",
    image: "/screenshots/feature-calendar.png",
    imageAlt: "Posthive calendar view with drag-to-reschedule",
    imageRatio: "16/9",
    why: [
      {
        title: "See gaps before they happen",
        desc: "A calendar makes it obvious when you have three posts in one day and nothing for the next five. Fix it before it becomes a problem.",
      },
      {
        title: "Reschedule in one drag",
        desc: "Plans change. Drag a post to a new day and Posthive updates the schedule instantly. No forms, no dropdowns.",
      },
      {
        title: "Filter by platform",
        desc: "Toggle which platforms are shown on the calendar. Focus on Instagram this week, LinkedIn next week.",
      },
    ],
    how: [
      {
        n: "01",
        title: "Schedule your posts",
        desc: "Create posts in the Compose page and set publish times. They appear on the calendar immediately.",
      },
      {
        n: "02",
        title: "Open the calendar view",
        desc: "Switch to Calendar on the Posts page. See your month, week, or day at a glance.",
      },
      {
        n: "03",
        title: "Drag to reschedule",
        desc: "Grab any post and drop it on a new date. Posthive updates the queue in real time. The post publishes at the new time.",
      },
    ],
    usecases: [
      "Content planners mapping out a monthly content mix",
      "Founders batching a week of posts and spreading them out visually",
      "Social media managers handling multiple clients",
      "Anyone who thinks visually about their publishing cadence",
    ],
    faq: [
      {
        q: "Can I drag posts to reschedule them?",
        a: "Yes. The calendar view on the Posts page lets you drag any scheduled post to a new date and Posthive updates the publish time instantly.",
      },
      {
        q: "What calendar views are available?",
        a: "Month, week, and day views are all available. Switch between them with a single click at the top of the calendar.",
      },
      {
        q: "Can I filter the calendar by platform?",
        a: "Yes. Use the platform filter to show only posts going to specific accounts, so you can focus on one channel at a time.",
      },
      {
        q: "Does the calendar sync in real time?",
        a: "Yes. Any change you make a new post, a reschedule, a deletion appears on the calendar immediately without a page refresh.",
      },
    ],
  },
  "first-comment": {
    title: "First comment",
    badge: "Engagement",
    badgeColor: "var(--color-brand-800)",
    badgeBg: "var(--color-brand-100)",
    headline: "The first comment, posted automatically.",
    subheadline:
      "Drop your hashtags, a key link, or a follow-up thought in the first comment - posted automatically the moment your main content goes live.",
    image: "/screenshots/feature-first-comment.png",
    imageAlt: "Posthive composer first comment field",
    imageRatio: "4/3",
    why: [
      {
        title: "Hashtags without the clutter",
        desc: "On Instagram and Threads, putting hashtags in a comment keeps your caption clean while still getting the reach benefit. Posthive handles this automatically.",
      },
      {
        title: "Add context without editing the post",
        desc: "Drop a link, a thread continuation, or a call-to-action in the first comment instead of cramming it into the caption.",
      },
      {
        title: "Timing is everything",
        desc: "The first comment needs to go live right when the post does - before anyone else comments. Posthive publishes both in the same pipeline, seconds apart.",
      },
    ],
    how: [
      {
        n: "01",
        title: "Write your first comment",
        desc: "In the Compose page, expand the First Comment section and write your comment: hashtags, links, follow-up copy, whatever you need.",
      },
      {
        n: "02",
        title: "Schedule as normal",
        desc: "Set your publish time. The comment is queued together with the main post.",
      },
      {
        n: "03",
        title: "Auto-published on the dot",
        desc: "When the job runs, Posthive posts your content first, then immediately posts the comment as a reply - per platform, per account.",
      },
    ],
    usecases: [
      "Instagram creators keeping captions clean while using hashtags",
      "LinkedIn users adding a link in the first comment for more reach",
      "Threads users starting a reply thread automatically",
      "Bluesky users adding context or a CTA below the main post",
    ],
    faq: [
      {
        q: "Which platforms support first comment scheduling?",
        a: "First comment scheduling works on Instagram, Threads, LinkedIn, Bluesky, and Mastodon. Facebook first comment support is pending Meta app review.",
      },
      {
        q: "How long after the main post does the first comment go live?",
        a: "The first comment is posted within a few seconds of the main post going live in the same job run, immediately after the post is confirmed published.",
      },
      {
        q: "Can I put hashtags in the first comment to avoid cluttering my caption?",
        a: "Yes. This is one of the most popular use cases. Write your hashtags in the first comment field and Posthive posts them as the first reply, keeping your caption clean.",
      },
      {
        q: "Can the first comment contain a link?",
        a: "Yes. You can put any text in the first comment, including URLs. This is especially useful on LinkedIn where posts with links in the caption get less reach.",
      },
    ],
  },
  "per-platform-overrides": {
    title: "Per-platform overrides",
    badge: "Pro & Team",
    badgeColor: "#6d4bc3",
    badgeBg: "rgba(109,75,195,.1)",
    headline: "Different platform, different message.",
    subheadline:
      "LinkedIn and Bluesky have different audiences, different character limits, and different norms. Per-platform overrides let you tailor your message for each network without creating separate posts.",
    image: "/screenshots/feature-overrides.png",
    imageAlt: "Posthive per-platform customize dialog",
    imageRatio: "4/3",
    why: [
      {
        title: "One audience isn't like another",
        desc: "What performs on LinkedIn reads as corporate on Bluesky. What works on Threads is too casual for LinkedIn. Overrides let you adapt without duplicating your effort.",
      },
      {
        title: "Character limits vary by platform",
        desc: "Bluesky caps you at 300 characters. LinkedIn gives you 3,000. Write the short version for one and expand it for the other in the same composer.",
      },
      {
        title: "Consistent theme, different voice",
        desc: "Keep the same core message but adjust the tone, the hashtags, the CTA, or the media per account. Posthive tracks it all in one scheduled post.",
      },
    ],
    how: [
      {
        n: "01",
        title: "Write your base post",
        desc: "Compose your post as normal. This becomes the default for all selected platforms.",
      },
      {
        n: "02",
        title: "Click Customize for an account",
        desc: "Expand the per-platform section and click Customize on any account to open its override editor.",
      },
      {
        n: "03",
        title: "Tailor and schedule",
        desc: "Edit the text (and first comment) independently for that account. Posthive uses the override for that platform, the base post for the rest.",
      },
    ],
    usecases: [
      "Posting a professional update on LinkedIn and a casual take on Threads",
      "Fitting a long post into Bluesky's 300-char limit with a summarized version",
      "Using different hashtags per platform",
      "Varying the CTA depending on where the audience is",
    ],
    faq: [
      {
        q: "What are per-platform overrides?",
        a: "Per-platform overrides let you write a custom version of your post for any specific account. The override replaces the base post for that platform only all other platforms use the base.",
      },
      {
        q: "Can I override the first comment per platform too?",
        a: "Yes. The override editor also has a first comment field, so you can have platform-specific first comments alongside platform-specific post text.",
      },
      {
        q: "What happens if I don't set an override for a platform?",
        a: "If no override is set, Posthive uses the base post text for that platform. Overrides are optional and only apply where you explicitly configure them.",
      },
      {
        q: "Is per-platform overrides available on the free plan?",
        a: "Per-platform overrides are available on the Pro and Team plans.",
      },
    ],
  },
  "bulk-csv-scheduling": {
    title: "Bulk CSV scheduling",
    badge: "Power feature",
    badgeColor: "var(--color-green-700)",
    badgeBg: "var(--color-green-50)",
    headline: "Schedule hundreds of posts from a spreadsheet.",
    subheadline:
      "Upload a CSV file and Posthive schedules every row automatically across multiple platforms with images, first comments, and per-row platform exclusions.",
    image: "/screenshots/feature-bulk-csv.png",
    imageAlt: "Posthive bulk CSV scheduling modal with preview table",
    imageRatio: "16/9",
    why: [
      {
        title: "Batch your content creation",
        desc: "Write a week or month of content in a spreadsheet where you can see everything at once, then upload it in one shot. No switching tabs, no repeating the same clicks.",
      },
      {
        title: "Granular platform control per row",
        desc: "Each row can target different platforms. Use !instagram to skip Instagram on a text-only post, or bluesky|mastodon for a specific audience. No separate posts needed.",
      },
      {
        title: "Validate before you commit",
        desc: "The preview table shows every row with a ✓ Ready or ✕ error status before anything is scheduled. Catch bad dates, missing images, or unrecognized platform names instantly.",
      },
    ],
    how: [
      {
        n: "01",
        title: "Prepare your file",
        desc: "Create a spreadsheet with the required columns: Content Title, Post Date, and Platform. Save as CSV or XLSX. Each row becomes one planned post.",
      },
      {
        n: "02",
        title: "Upload and preview",
        desc: "Open Import Plan from the Posts page. Upload your CSV or XLSX file, or paste the CSV. Click Preview to validate every row against the columns, dates, and platforms before importing.",
      },
      {
        n: "03",
        title: "Schedule all at once",
        desc: "Review the preview table, fix any errors, then click Schedule N posts. Posthive enqueues each valid row and shows a progress bar as they're submitted.",
      },
    ],
    usecases: [
      "Content managers scheduling a month of posts from a content calendar",
      "Agencies onboarding a new client and front-loading their first month",
      "Indie hackers scheduling a product launch drip across platforms",
      "Creators batching content in one session to stay consistent all week",
    ],
    faq: [
      {
        q: "What columns does the CSV need?",
        a: "The required columns are: scheduled_for (ISO datetime), text, and accounts. Optional columns are comment (first comment text) and image_urls (comma-separated URLs).",
      },
      {
        q: "How do I target specific platforms per row?",
        a: "Set the accounts column to a pipe-separated list of platform names, e.g. bluesky|linkedin|threads. Use all to post to every connected account, or prefix with ! to exclude a platform.",
      },
      {
        q: "Is there a row limit?",
        a: "There is no hard row limit in the app, but we recommend keeping batches under 500 rows for reliable preview performance. Larger batches can be split across multiple uploads.",
      },
      {
        q: "Can I include images in the CSV?",
        a: "Yes. Add an image_urls column with one or more public image URLs per row (comma-separated). Posthive fetches and attaches them at publish time.",
      },
    ],
  },
  "ai-caption-assist": {
    title: "AI caption assist",
    badge: "AI-powered",
    badgeColor: "var(--color-brand-800)",
    badgeBg: "var(--color-brand-100)",
    headline: "Better captions. One click.",
    subheadline:
      "Seven AI actions built right into the composer and edit dialog. Fix grammar, tighten the copy, expand, rephrase, restructure, simplify, or polish all powered by Claude without leaving the compose window.",
    image: "",
    imageAlt: "",
    why: [
      {
        title: "Writing is the bottleneck",
        desc: "The hard part of consistent posting isn't the scheduling it's staring at a blank text box. AI assist gives you a starting point or polishes what you already wrote, in seconds.",
      },
      {
        title: "Platform tone varies",
        desc: "LinkedIn needs professional. Bluesky needs casual. Twitter needs punchy. Use Rephrase or Simplify to adapt one base caption to the platform you're posting to.",
      },
      {
        title: "No context switching",
        desc: "The AI button lives inside the composer and the edit dialog. You don't open a new tab, paste into ChatGPT, copy back. It rewrites in place.",
      },
    ],
    how: [
      {
        n: "01",
        title: "Write your caption",
        desc: "Type your post in the composer as you normally would. Even a rough draft is enough AI assist will clean it up.",
      },
      {
        n: "02",
        title: "Click the sparkles button",
        desc: "Hit the ✦ button above the textarea. A menu of seven actions appears: Fix grammar, Concise, Expand, Rephrase, Improve structure, Simplify, Polish.",
      },
      {
        n: "03",
        title: "Pick an action",
        desc: "Select the action you want. Posthive sends your caption to Claude Haiku and replaces the text with the improved version in under two seconds.",
      },
    ],
    usecases: [
      "Creators who batch-write content and want a final polish pass",
      "Non-native English speakers who want grammar and clarity checks",
      "Founders who know what to say but need help saying it concisely",
      "Teams shortening long LinkedIn posts to fit Bluesky's 300-char limit",
    ],
    faq: [
      {
        q: "Which AI model powers the caption assist?",
        a: "AI caption assist uses Claude Haiku (claude-haiku-4-5) by Anthropic fast, accurate, and cost-efficient for short-text rewrites.",
      },
      {
        q: "Does AI caption assist cost extra?",
        a: "No. It's included in all paid plans (Creator, Pro, Team). If you self-host, bring your own Anthropic API key via the ANTHROPIC_API_KEY env var.",
      },
      {
        q: "What are the seven actions?",
        a: "Fix grammar, Concise (shorter), Expand (more detail), Rephrase (fresh take), Improve structure (better flow), Simplify (plain language), Polish (professional finish). Each rewrites the caption in place.",
      },
      {
        q: "Does it work in the edit dialog too?",
        a: "Yes. The AI button appears both in the main Compose page and in the Edit Post dialog so you can refine already-scheduled posts.",
      },
    ],
  },
  "self-hostable": {
    title: "Self-hostable",
    badge: "Open source",
    badgeColor: "#0e7490",
    badgeBg: "rgba(14,116,144,.1)",
    headline: "Run Posthive on your own infrastructure.",
    subheadline:
      "Posthive is open source under AGPL-3.0. Self-host it on Railway, Fly.io, Render, or your own VPS - full control, no vendor lock-in, no per-seat pricing.",
    image: "/screenshots/feature-self-hostable.png",
    imageAlt: "Posthive self-hosting architecture",
    imageRatio: "16/9",
    why: [
      {
        title: "Your data, your server",
        desc: "All OAuth credentials are AES-256-GCM encrypted at rest. In self-hosted mode, they never leave your infrastructure.",
      },
      {
        title: "No billing required",
        desc: "Set ENABLE_BILLING=false and every feature is unlocked for all users - no plan limits, no trial, no Dodo account needed.",
      },
      {
        title: "Modify it freely",
        desc: "Add platforms, change limits, build internal tooling on top. It's your copy. AGPL-3.0 just asks you to share modifications if you run it as a public service.",
      },
    ],
    how: [
      {
        n: "01",
        title: "Clone and configure",
        desc: "Clone the repo, copy .env.example to .env, fill in your secrets - Redis URL, encryption key, JWT secrets, OAuth credentials for the platforms you want.",
      },
      {
        n: "02",
        title: "Run the database migration",
        desc: "Run pnpm db:migrate inside apps/api. Posthive supports SQLite for local dev and Postgres for production.",
      },
      {
        n: "03",
        title: "Deploy anywhere",
        desc: "pnpm dev spins up both the API and the web app. For production, deploy to Railway (API) + Vercel (frontend) in under 10 minutes.",
      },
    ],
    usecases: [
      "Developers who want full control over their scheduling stack",
      "Teams running internal social media tools without SaaS fees",
      "Privacy-conscious users who don't want credentials on third-party servers",
      "Engineers building on top of Posthive for custom workflows",
    ],
    faq: [
      {
        q: "What does self-hostable mean?",
        a: "Self-hostable means you can run the entire Posthive application on your own server or cloud account. Your data including encrypted OAuth credentials stays on your infrastructure.",
      },
      {
        q: "What infrastructure do I need to self-host Posthive?",
        a: "You need a Node.js server (or a platform like Railway or Fly.io), a Postgres or SQLite database, and a Redis instance (Upstash works well on a free tier).",
      },
      {
        q: "Is self-hosted Posthive free?",
        a: "Yes. The code is free under AGPL-3.0. You only pay for your hosting costs (which can be near-zero on hobby plans). Set ENABLE_BILLING=false to unlock all features.",
      },
      {
        q: "Can I modify Posthive and run it privately?",
        a: "Yes, with one caveat: AGPL-3.0 requires you to share your modifications if you run a modified version as a public service. For private internal use, you can modify it freely.",
      },
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
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      alt={name}
      width={size}
      height={size}
      className="block rounded-sm"
    />
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
    <div className="card w-full max-w-120 rounded-3xl p-7">
      <div className="mb-3.5 type-body-sb-xxs uppercase tracking-widest text-muted">
        Post to
      </div>
      <div className="mb-5.5 flex flex-wrap gap-2">
        {platforms.map((p) => (
          <div
            key={p.name}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 type-body-sb-xs",
              p.on
                ? "border-brand-300 bg-brand-100 text-brand-800"
                : "border-border bg-bg text-muted opacity-35",
            )}
          >
            <PlatformFavicon name={p.name} size={13} />
            {p.name}
          </div>
        ))}
      </div>
      <div className="mb-4.5 rounded-xl bg-bg px-4 py-3.5">
        <div className="mb-2.5 type-body-r-s text-neutral-400">
          What&apos;s on your mind?
        </div>
        <div className="type-body-r-s text-fg">
          Just shipped v2.0 🚀 New drag-to-reschedule calendar is live. Move
          posts around with one drag - no more manual edits.{" "}
          <span className="text-brand-800">posthive.co</span>
        </div>
        <div className="mt-3.5 flex items-center justify-between">
          <span className="type-body-r-xs text-muted">142 / 300</span>
          <div className="flex gap-1.5">
            {["BSky", "TH", "LI", "MA"].map((t) => (
              <span
                key={t}
                className="rounded-sm bg-brand-100 px-1.5 py-0.5 type-body-r-xxs text-brand-800"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 type-body-r-xs text-muted">
          <span className="type-body-r-s">📅</span> Tomorrow, 9:00 AM
        </div>
        <div className="btn-primary">
          Schedule
        </div>
      </div>
    </div>
  );
}

function ReelsMockup() {
  return (
    <div className="flex max-w-115 flex-col gap-4">
      <div className="card rounded-3xl p-6">
        <div className="mb-3.5 type-body-sb-xxs uppercase tracking-widest text-muted">
          Instagram content type
        </div>
        <div className="mb-5 flex gap-2">
          {[
            {
              label: "Feed Post",
              active: false,
              icon: (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              ),
            },
            {
              label: "Reel",
              active: true,
              icon: (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              ),
            },
            {
              label: "Story",
              active: false,
              icon: (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
              ),
            },
            {
              label: "Carousel",
              active: false,
              icon: (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="6" width="14" height="14" rx="2" />
                  <path d="M6 2h14a2 2 0 0 1 2 2v14" />
                </svg>
              ),
            },
          ].map((t) => (
            <div
              key={t.label}
              className={cn(
                "flex flex-1 cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-1.5 py-2.5 text-center",
                t.active
                  ? "border-red-200 bg-red-50 text-red-600"
                  : "border-border bg-bg text-muted",
              )}
            >
              <span className="flex">{t.icon}</span>
              <div className="type-body-sb-xxs">{t.label}</div>
            </div>
          ))}
        </div>
        <div className="dropzone bg-bg px-4 py-5 text-center">
          <div className="mb-2 flex justify-center text-muted">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div className="type-body-r-xs text-muted">
            Drop your Reel video here
          </div>
          <div className="mt-1 type-body-r-xxs text-muted">
            MP4 · up to 15 min · 9:16 recommended
          </div>
        </div>
      </div>
      <div className="card flex items-center gap-3.5 px-5 py-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-red-500 to-brand-600 text-white">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
        <div>
          <div className="type-body-sb-xs text-fg">
            Schedules at peak engagement time
          </div>
          <div className="type-body-r-xs text-muted">
            Tuesday · 7:00 PM · Your timezone
          </div>
        </div>
        <div className="ml-auto size-2.5 shrink-0 rounded-full bg-green-500" />
      </div>
    </div>
  );
}

function CalendarMockup() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  // `color` feeds the --c CSS var on each event pill
  const posts: Record<
    number,
    { label: string; color: string; platform: string }[]
  > = {
    0: [{ label: "Product update 🚀", color: "var(--color-brand-800)", platform: "BSky" }],
    1: [{ label: "Behind the scenes", color: "var(--color-red-600)", platform: "IG" }],
    2: [],
    3: [
      { label: "Weekly tip ✨", color: "var(--color-brand-800)", platform: "LI" },
      { label: "Thread drop", color: "var(--color-neutral-600)", platform: "TH" },
    ],
    4: [{ label: "Friday recap", color: "var(--color-green-700)", platform: "MA" }],
    5: [],
    6: [],
  };
  return (
    <div className="card w-full max-w-120 rounded-3xl p-6">
      <div className="mb-4.5 flex items-center justify-between">
        <div className="type-body-sb-s text-fg">
          July 2026
        </div>
        <div className="flex gap-2">
          {["Month", "Week", "Day"].map((v, i) => (
            <span
              key={v}
              className={cn(
                "rounded-md px-2.5 py-1 type-body-sb-xs",
                i === 1 ? "bg-accent text-accent-fg" : "bg-bg text-muted",
              )}
            >
              {v}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <div
            key={d}
            className="pb-2 text-center type-body-sb-xxs text-muted"
          >
            {d}
          </div>
        ))}
        {days.map((_, i) => (
          <div
            key={i}
            className="min-h-18 rounded-lg border border-border bg-bg p-1"
          >
            <div className="mb-1 type-body-r-xxs text-muted">
              {i + 7}
            </div>
            {posts[i]?.map((p) => (
              <div
                key={p.label}
                className="mb-0.5 rounded-sm border border-(--c)/25 bg-(--c)/10 px-1 py-0.5"
                style={{ "--c": p.color } as React.CSSProperties}
              >
                <div className="truncate type-body-sb-xxs text-(--c)">
                  {p.platform}
                </div>
                <div className="truncate type-body-r-xxs text-muted">
                  {p.label}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-dashed border-border bg-bg px-3.5 py-2.5 text-center type-body-r-xs text-muted">
        ↕ Drag any post to reschedule
      </div>
    </div>
  );
}

function FirstCommentMockup() {
  return (
    <div className="flex w-full max-w-115 flex-col">
      {/* Main post */}
      <div className="rounded-t-2xl rounded-b-sm border border-border bg-surface p-5.5">
        <div className="mb-3.5 flex gap-3">
          <div className="size-9 shrink-0 rounded-full bg-linear-to-br from-brand-400 to-brand-700" />
          <div>
            <div className="type-body-sb-s text-fg">
              @yourhandle
            </div>
            <div className="type-body-r-xs text-muted">
              Just now · via Posthive
            </div>
          </div>
          <div className="ml-auto self-start rounded-md border border-green-200 bg-green-50 px-2 py-0.5 type-body-r-xxs text-green-700">
            ✓ Published
          </div>
        </div>
        <div className="type-body-r-s text-fg">
          Excited to share what we&apos;ve been building 🧵 A thread on why we
          chose open-source for our social scheduling tool and what it means for
          you.
        </div>
        <div className="mt-3.5 flex gap-4">
          {["❤ 24", "💬 7", "🔁 11"].map((a) => (
            <span key={a} className="type-body-r-xs text-muted">
              {a}
            </span>
          ))}
        </div>
      </div>
      {/* Connector */}
      <div className="flex pl-7.5">
        <div className="h-4 w-0.5 bg-border" />
      </div>
      {/* First comment */}
      <div className="rounded-t-sm rounded-b-2xl border border-t-0 border-border bg-bg p-5.5">
        <div className="mb-3 flex gap-3">
          <div className="size-7 shrink-0 rounded-full bg-linear-to-br from-brand-400 to-brand-700" />
          <div>
            <div className="type-body-sb-xs text-fg">
              @yourhandle
            </div>
            <div className="type-body-r-xxs text-muted">
              Auto-comment · 3s after publish
            </div>
          </div>
          <div className="ml-auto self-start rounded-md border border-brand-300 bg-brand-100 px-2 py-0.5 type-body-r-xxs text-brand-800">
            🤖 First comment
          </div>
        </div>
        <div className="type-body-r-s text-muted">
          👇 Links in the thread below.{" "}
          <span className="text-brand-800">posthive.co</span>
          {"\n"}
          <span className="text-neutral-500">
            #OpenSource #BuildInPublic #SocialMedia
          </span>
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
      color: "#000000",
      text: "ok v2.0 dropped. you can now drag posts around on a calendar. yes, finally. also bulk CSV if you're that kind of person 🧵",
      chars: "122 / 500",
    },
  ];
  return (
    <div className="flex w-full max-w-125 flex-col gap-3">
      <div className="card px-4.5 py-3.5">
        <div className="mb-2.5 type-body-sb-xxs uppercase tracking-widest text-muted">
          Base post (fallback)
        </div>
        <div className="type-body-r-s text-muted">
          v2.0 is live. Drag-to-reschedule and bulk CSV scheduling. posthive.co
        </div>
      </div>
      {platforms.map((p) => (
        <div key={p.name} className="card px-4.5 py-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlatformFavicon name={p.name} size={14} />
              <span className="type-body-sb-xs text-fg">
                {p.name}
              </span>
              <span className="rounded-md border border-green-200 bg-green-50 px-1.5 py-px type-body-r-xxs text-green-700">
                Custom
              </span>
            </div>
            <span className="type-body-r-xxs text-muted">{p.chars}</span>
          </div>
          <div className="type-body-r-xs text-fg">
            {p.text}
          </div>
        </div>
      ))}
    </div>
  );
}

function CsvMockup() {
  const rows = [
    {
      date: "2026-07-07 09:00",
      text: "Shipping v2.0 today 🚀 drag-to-reschedule is live",
      accounts: "bluesky|threads|linkedin",
      status: "ready",
    },
    {
      date: "2026-07-08 14:00",
      text: "Behind the scenes: building a content scheduler in Next.js",
      accounts: "instagram|youtube",
      status: "ready",
    },
    {
      date: "2026-07-09 10:00",
      text: "Weekly tip: use CSV bulk upload to schedule a full month in 10 minutes",
      accounts: "all",
      status: "ready",
    },
    {
      date: "2026-07-10 08:30",
      text: "Open-source and self-hostable - why we chose AGPL-3.0",
      accounts: "bluesky|mastodon",
      status: "warn",
    },
  ];
  return (
    <div className="card w-full max-w-180 overflow-x-auto rounded-3xl p-6">
      <div className="mb-4.5 flex items-center justify-between">
        <div>
          <div className="type-body-sb-s text-fg">
            preview.csv
          </div>
          <div className="type-body-r-xs text-muted">4 rows · all valid</div>
        </div>
        <div className="btn-primary type-body-sb-xs">
          Schedule 4 posts
        </div>
      </div>
      <div className="min-w-145">
        <div className="grid grid-cols-[160px_1fr_140px_80px]">
          {["scheduled_for", "text", "accounts", "status"].map((h) => (
            <div
              key={h}
              className="border-b border-border px-2.5 py-1.5 type-body-sb-xxs uppercase tracking-wider text-muted"
            >
              {h}
            </div>
          ))}
          {rows.map((r, i) => (
            <React.Fragment key={i}>
              <div className="border-b border-border p-2.5 type-mono-r-xs text-muted">
                {r.date}
              </div>
              <div className="truncate border-b border-border p-2.5 type-body-r-xs text-fg">
                {r.text}
              </div>
              <div className="border-b border-border p-2.5 type-mono-r-xs text-muted">
                {r.accounts}
              </div>
              <div className="border-b border-border p-2.5">
                <span
                  className={cn(
                    "rounded-md border px-1.5 py-0.5 type-body-sb-xxs",
                    r.status === "ready"
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-brand-400 bg-brand-100 text-brand-800",
                  )}
                >
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

function AiCaptionMockup() {
  // `color` feeds the --c CSS var on each icon tile
  const actions = [
    { label: "Fix grammar", color: "var(--color-green-700)", icon: "✓" },
    { label: "Concise", color: "#0e7490", icon: "↓" },
    { label: "Expand", color: "var(--color-blue-700)", icon: "↑" },
    { label: "Rephrase", color: "#b45309", icon: "↺" },
    { label: "Improve structure", color: "#6d4bc3", icon: "≡" },
    { label: "Simplify", color: "var(--color-red-600)", icon: "◇" },
    { label: "Polish", color: "var(--color-brand-800)", icon: "✦" },
  ];
  return (
    <div className="flex w-full max-w-115 flex-col gap-4">
      {/* Composer */}
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="type-body-sb-xs uppercase tracking-wider text-muted">Caption</span>
          <div className="flex cursor-pointer items-center gap-2 rounded-lg border border-brand-300 bg-brand-100 px-3 py-1.5 text-brand-800">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"/>
              <path d="M20 3v4M22 5h-4M4 17v2M5 18H3"/>
            </svg>
            <span className="type-body-sb-xs">AI assist</span>
          </div>
        </div>
        <div className="mb-2.5 rounded-xl bg-bg px-3.5 py-3 type-body-r-s text-fg">
          just launched posthive v2. drag reschedule is out. csv too. check it out
        </div>
        <div className="type-body-r-xs text-muted">48 / 300 chars</div>
      </div>
      {/* Actions menu */}
      <div className="card overflow-hidden">
        <div className="border-b border-border px-4 py-2.5 type-body-sb-xs uppercase tracking-wider text-muted">Choose an action</div>
        {actions.map((a, i) => (
          <div
            key={a.label}
            className={cn(
              "flex cursor-pointer items-center gap-3.5 border-b border-border px-4 py-3 last:border-b-0",
              i === 6 && "bg-brand-100",
            )}
          >
            <span
              className="flex size-6.5 shrink-0 items-center justify-center rounded-md border border-(--c)/25 bg-(--c)/10 type-body-sb-xs text-(--c)"
              style={{ "--c": a.color } as React.CSSProperties}
            >
              {a.icon}
            </span>
            <span className={cn(i === 6 ? "type-body-sb-s text-fg" : "type-body-r-s text-muted")}>{a.label}</span>
            {i === 6 && <span className="ml-auto rounded-md border border-brand-300 bg-brand-200 px-2 py-0.5 type-body-r-xxs text-brand-800">Selected</span>}
          </div>
        ))}
      </div>
      {/* After */}
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
        <div className="mb-2.5 type-body-sb-xs uppercase tracking-wider text-green-700">✦ Polished</div>
        <div className="type-body-r-s text-fg">
          Posthive v2 is live. Drag-to-reschedule and bulk CSV scheduling are now available the two most-requested features since launch. Try it at <span className="text-brand-800">posthive.co</span>
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
    <div className="w-full max-w-140 overflow-hidden rounded-3xl border border-border bg-bg">
      <div className="flex items-center gap-2 border-b border-border bg-surface px-4.5 py-3">
        <div className="size-2.5 rounded-full bg-red-500" />
        <div className="size-2.5 rounded-full bg-brand-500" />
        <div className="size-2.5 rounded-full bg-green-500" />
        <span className="ml-2 type-mono-r-xs text-muted">
          Terminal
        </span>
      </div>
      <div className="px-5.5 py-5 type-mono-r-xs">
        {lines.map((l, i) => (
          <div
            key={i}
            className={cn(
              l.t === "comment"
                ? "text-muted"
                : l.t === "output"
                  ? "text-green-700"
                  : "text-fg",
            )}
          >
            {l.t === "cmd" ? (
              <>
                <span className="text-brand-800">$ </span>
                {l.v}
              </>
            ) : (
              l.v
            )}
          </div>
        ))}
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-brand-800">$ </span>
          <span className="inline-block h-4 w-2 bg-accent align-middle" />
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border bg-surface px-5.5 py-3">
        {[
          ["SQLite / Postgres", "🗄"],
          ["Redis / Upstash", "⚡"],
          ["Any cloud", "☁"],
        ].map(([label, icon]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="type-body-r-s">{icon}</span>
            <span className="type-body-r-xs text-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page building blocks ───────────────────────────────────────────────────

// Eyebrow above a section title, led by a short rule
function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-5 inline-flex items-center gap-3 type-body-sb-xs uppercase tracking-wider text-brand-800 before:h-px before:w-8 before:bg-current">
      {children}
    </span>
  );
}

// Hairline between sections, fading out at both ends
function Rule() {
  return (
    <div className="mx-auto max-w-6xl px-5 md:px-12">
      <hr className="h-px border-0 bg-linear-to-r from-transparent via-border to-transparent" />
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
  "ai-caption-assist": "split-right",
};

function getMockup(slug: string) {
  switch (slug) {
    case "multi-platform-posting":
      return <MultiPlatformMockup />;
    case "instagram-reels-scheduler":
      return <ReelsMockup />;
    case "drag-to-reschedule":
      return <CalendarMockup />;
    case "first-comment":
      return <FirstCommentMockup />;
    case "per-platform-overrides":
      return <OverridesMockup />;
    case "bulk-csv-scheduling":
      return <CsvMockup />;
    case "self-hostable":
      return <SelfHostMockup />;
    case "ai-caption-assist":
      return <AiCaptionMockup />;
    default:
      return null;
  }
}

// ── Metadata ───────────────────────────────────────────────────────────────

const SLUG_OVERRIDES: Record<
  string,
  { title: string; description: string; keywords: string[] }
> = {
  "multi-platform-posting": {
    title: "Multi-Platform Social Scheduler | Posthive",
    description:
      "Write once, post everywhere. Schedule to Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, Facebook, Pinterest, Telegram, Nostr, and X in one click.",
    keywords: [
      "multi-platform social media scheduler",
      "post to multiple social media at once",
      "Buffer alternative",
      "Hootsuite alternative",
      "cross-platform posting",
    ],
  },
  "instagram-reels-scheduler": {
    title: "Instagram Reels & Stories Scheduler | Posthive",
    description:
      "Schedule Instagram Reels, Stories, carousels, and feed posts without switching tabs. The easiest Instagram Reels scheduler for creators and brands.",
    keywords: [
      "Instagram Reels scheduler",
      "schedule Instagram Reels",
      "Instagram Story scheduler",
      "Instagram carousel scheduler",
      "schedule Instagram posts",
    ],
  },
  "drag-to-reschedule": {
    title: "Social Media Content Calendar | Posthive",
    description:
      "Visualise your entire posting schedule on a drag-and-drop calendar. Move posts instantly, spot gaps, and never miss a publish date.",
    keywords: [
      "social media content calendar",
      "drag and drop social media scheduler",
      "content calendar tool",
      "reschedule social media posts",
    ],
  },
  "first-comment": {
    title: "Schedule First Comment Automatically | Posthive",
    description:
      "Automatically post a first comment the moment your content goes live. Keep captions clean and drop hashtags, links, or CTAs in the first comment.",
    keywords: [
      "schedule first comment",
      "auto first comment Instagram",
      "LinkedIn first comment scheduling",
      "hashtags in first comment",
    ],
  },
  "per-platform-overrides": {
    title: "Per-Platform Post Customization | Posthive",
    description:
      "Write one post, customise it for every platform. Different character limits, different audiences, different tones all from a single composer.",
    keywords: [
      "per platform social media post",
      "customize posts per platform",
      "different text per social network",
      "platform specific content",
    ],
  },
  "bulk-csv-scheduling": {
    title:
      "Bulk CSV Social Media Scheduler | Posthive",
    description:
      "Upload a CSV and schedule hundreds of social media posts at once across multiple platforms. The fastest way to bulk-schedule content for creators and agencies.",
    keywords: [
      "bulk social media scheduling",
      "CSV social media scheduler",
      "schedule multiple posts at once",
      "bulk schedule Instagram",
      "content scheduling spreadsheet",
    ],
  },
  "ai-caption-assist": {
    title: "AI Caption Assist for Social Media | Posthive",
    description:
      "Seven AI-powered caption actions built into the composer. Fix grammar, make it concise, expand, rephrase, or polish powered by Claude Haiku without leaving the compose window.",
    keywords: [
      "AI social media caption writer",
      "AI caption assist",
      "social media post rewriter",
      "caption generator",
      "AI writing tool for social media",
    ],
  },
  "self-hostable": {
    title: "Self-Hostable Open Source Social Media Scheduler | Posthive",
    description:
      "Run your own social media scheduler. Open source (AGPL-3.0), self-hostable on Railway, Fly.io, or any VPS. Full data ownership, no vendor lock-in.",
    keywords: [
      "self-hosted social media scheduler",
      "open source social media tool",
      "self-host Buffer alternative",
      "AGPL social media scheduler",
    ],
  },
};

export async function generateStaticParams() {
  return Object.keys(FEATURES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
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

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
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
      {
        "@type": "ListItem",
        position: 2,
        name: data.title,
        item: `${WEB_URL}/features/${slug}`,
      },
    ],
  };

  const faqSchema =
    data.faq && data.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: data.faq.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }
      : null;

  const ALL_FEATURES = [
    {
      slug: "multi-platform-posting",
      label: "MULTI-PLATFORM",
      title: "Write once. Post everywhere.",
      desc: "One composer, thirteen platforms.",
    },
    {
      slug: "instagram-reels-scheduler",
      label: "REELS & STORIES",
      title: "Full Instagram media support",
      desc: "Reels, Stories, and carousels all scheduled.",
    },
    {
      slug: "drag-to-reschedule",
      label: "CALENDAR",
      title: "Drag to reschedule",
      desc: "Month, week, day. Drag any post to a new slot.",
    },
    {
      slug: "first-comment",
      label: "FIRST COMMENT",
      title: "Auto-reply on publish",
      desc: "Fires the moment your post goes live.",
    },
    {
      slug: "per-platform-overrides",
      label: "OVERRIDES",
      title: "Custom text per network",
      desc: "Same base post, per-platform voice.",
    },
    {
      slug: "bulk-csv-scheduling",
      label: "BULK CSV",
      title: "Schedule hundreds from a file",
      desc: "Upload a spreadsheet, schedule every row.",
    },
    {
      slug: "self-hostable",
      label: "SELF-HOSTABLE",
      title: "AGPL-3.0 open source",
      desc: "Run it yourself full data control.",
    },
    {
      slug: "ai-caption-assist",
      label: "AI ASSIST",
      title: "AI caption assist",
      desc: "Seven rewrite actions, one click.",
    },
  ];
  const otherFeatures = ALL_FEATURES.filter((f) => f.slug !== slug);

  return (
    <div className="min-h-screen bg-bg text-fg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <MarketingNavBar />
      <div className="h-17" />

      {/* breadcrumb */}
      <div className="mx-auto max-w-6xl px-5 pt-6 type-body-r-xs tracking-wider text-muted md:px-12">
        <Link href="/" className="transition-colors hover:text-fg">
          Home
        </Link>
        <span className="mx-2 opacity-50">/</span>
        <Link
          href="/features/multi-platform-posting"
          className="transition-colors hover:text-fg"
        >
          Features
        </Link>
        <span className="mx-2 opacity-50">/</span>
        <span className="text-fg">{data.title}</span>
      </div>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-5 pt-12 pb-16 md:px-12 md:pt-18 md:pb-20">
        <div
          className={cn(
            "grid grid-cols-1 items-center",
            isSplit && "gap-7 sm:gap-10 lg:grid-cols-2 lg:gap-20",
          )}
        >
          <div className={layout === "split-left" ? "order-2" : "order-1"}>
            <Kicker>{data.badge}</Kicker>
            <h1
              className={cn(
                "mb-6 tracking-tight",
                isSplit
                  ? "type-display-m-6 md:type-display-m-4"
                  : "type-display-m-6 md:type-display-m-3",
              )}
            >
              {data.headline}
            </h1>
            <p className="mb-8 max-w-xl type-body-r-l text-muted">
              {data.subheadline}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary px-6 py-3 type-body-sb-m">
                Try free for 14 days
              </Link>
              <Link href="/pricing" className="btn-secondary px-6 py-3 type-body-sb-m">
                View pricing
              </Link>
            </div>
            {/* inline stats */}
            {slug === "multi-platform-posting" && (
              <div className="mt-14 flex gap-8 border-t border-border pt-6 sm:gap-10">
                {[
                  { n: "13", label: "Platforms" },
                  { n: "1", label: "Composer" },
                  { n: "∞", label: "Reach" },
                ].map((s) => (
                  <div key={s.n}>
                    <div className="type-head-m-3 tracking-tight">
                      {s.n}
                    </div>
                    <div className="mt-1.5 type-body-r-xs uppercase tracking-widest text-muted">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {slug === "self-hostable" && (
              <div className="mt-14 flex gap-8 border-t border-border pt-6 sm:gap-10">
                {[
                  { n: "AGPL", label: "License" },
                  { n: "0", label: "Per-seat" },
                  { n: "100%", label: "Data ownership" },
                ].map((s) => (
                  <div key={s.n}>
                    <div className="type-head-m-4 tracking-tight">
                      {s.n}
                    </div>
                    <div className="mt-1.5 type-body-r-xs uppercase tracking-widest text-muted">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {isSplit && mockup && (
            <div
              className={cn(
                "flex justify-center",
                layout === "split-left" ? "order-1" : "order-2",
              )}
            >
              {mockup}
            </div>
          )}
        </div>
      </section>

      <Rule />

      {/* ── Why it matters ── */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:px-12 md:py-24">
        <Kicker>Why it matters</Kicker>
        <h2 className="mb-14 max-w-lg type-head-sb-4 tracking-tight md:type-head-sb-2">
          The grind of cross-posting, gone.
        </h2>
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-14">
          {data.why.map((w, i) => (
            <div key={w.title}>
              <div className="mb-5 type-body-r-xs tracking-widest text-brand-800">
                0{i + 1}
              </div>
              <h3 className="mb-3 type-head-sb-6">
                {w.title}
              </h3>
              <p className="type-body-r-s text-muted">
                {w.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Rule />

      {/* ── Under the hood (screenshot) ── */}
      {data.image && (
        <section className="mx-auto max-w-6xl px-5 py-16 md:px-12 md:py-24">
          <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <Kicker>Under the hood</Kicker>
              <h2 className="max-w-lg type-head-sb-5 tracking-tight md:type-head-sb-2">
                The feature, in the app.
              </h2>
            </div>
            <Link
              href="/register"
              className="type-body-m-s text-brand-800 transition-colors hover:text-brand-900"
            >
              Try it yourself
            </Link>
          </div>
          <div className="w-full overflow-hidden rounded-2xl border border-border bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.image}
              alt={data.imageAlt}
              className="block h-auto w-full"
            />
          </div>
          <p className="mt-3 type-body-r-xs tracking-wide text-muted">
            Fig. 01 — {data.imageAlt}
          </p>
        </section>
      )}

      <Rule />

      {/* ── How it works ── */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:px-12 md:py-24">
        <div className="grid grid-cols-1 items-start gap-7 sm:gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <div className="lg:sticky lg:top-25">
            <Kicker>How it works</Kicker>
            <h2 className="type-head-sb-4 tracking-tight md:type-head-sb-2">
              Three steps.
              <br />
              No manuals.
            </h2>
          </div>
          <ol className="flex flex-col">
            {data.how.map((s) => (
              <li
                key={s.n}
                className="flex items-start gap-6 border-b border-border py-8 last:border-b-0"
              >
                <div className="w-20 shrink-0 type-head-m-1 tracking-tight text-brand-800">
                  {s.n}
                </div>
                <div>
                  <h3 className="mb-2.5 type-head-sb-6">
                    {s.title}
                  </h3>
                  <p className="type-body-r-s text-muted">
                    {s.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Rule />

      {/* ── Who uses this ── */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:px-12 md:py-24">
        <div className="grid grid-cols-1 items-start gap-7 sm:gap-10 lg:grid-cols-2 lg:gap-20">
          <div>
            <Kicker>Who uses this</Kicker>
            <h2 className="mb-8 type-head-sb-5 tracking-tight md:type-head-sb-2">
              Built for people shipping in&nbsp;public.
            </h2>
            <ul className="flex flex-col gap-4">
              {data.usecases.map((u) => (
                <li
                  key={u}
                  className="flex items-baseline gap-3.5 type-body-r-m"
                >
                  <span className="flex-none text-brand-800">
                    ◆
                  </span>
                  {u}
                </li>
              ))}
            </ul>
          </div>
          <div className="border-l-2 border-accent py-2 pl-8">
            <div className="mb-5 type-body-sb-xs uppercase tracking-wider text-brand-800">
              From the builder
            </div>
            <p className="mb-5 type-body-r-m text-fg">
              &ldquo;I was copy-pasting the same post into five different apps
              every day. Every tool I tried was too expensive, too bloated, or
              didn&apos;t support the platforms I actually used. So I built
              Posthive.&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-neutral-100">
                {" "}
                <img
                  src="/founder.jpg"
                  alt="Guna, founder of Posthive"
                  width={72}
                  height={72}
                  className="block size-full rounded-full object-cover"
                />
              </div>
              <div>
                <div className="type-body-m-s">
                  Guna Sheelan
                </div>
                <div className="type-body-r-xs text-muted">
                  Founder · @gunaa_dev
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Rule />

      {/* ── FAQ ── */}
      {slug === "instagram-reels-scheduler" && (
        <div className="mx-auto max-w-6xl px-5 pb-12 md:px-12">
          <a
            href="/blog/how-to-schedule-instagram-reels"
            className="inline-flex items-center gap-2 rounded-lg border border-brand-300 bg-brand-100 px-4.5 py-2.5 type-body-r-s text-brand-800 transition-colors hover:border-brand-400"
          >
            📖 Read the full guide: How to Schedule Instagram Reels in 2026 →
          </a>
        </div>
      )}

      {data.faq && data.faq.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-16 md:px-12 md:py-24">
          <Kicker>FAQ</Kicker>
          <h2 className="mb-12 type-head-sb-4 tracking-tight md:type-head-sb-2">
            Frequently asked questions
          </h2>
          <div>
            {data.faq.map((item, i) => (
              <details
                key={item.q}
                className="group border-t border-border py-5.5 last:border-b"
                open={i === 0}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 type-body-m-l [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="flex-none type-body-r-xl text-brand-800 transition-transform duration-150 group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3.5 max-w-2xl type-body-r-s text-muted">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}

      <Rule />

      {/* ── Related toolkit ── */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:px-12 md:py-24">
        <Kicker>Part of a full scheduling toolkit</Kicker>
        <h2 className="mb-10 max-w-xl type-head-sb-5 tracking-tight md:type-head-sb-2">
          {data.title} is one of eight features working together.
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {otherFeatures.map((f) => (
            <Link
              key={f.slug}
              href={`/features/${f.slug}`}
              className="card flex flex-col gap-2 p-6 transition-colors hover:border-accent"
            >
              <div className="type-body-sb-xs tracking-wider text-brand-800">
                {f.label}
              </div>
              <div className="type-body-m-m text-fg">{f.title}</div>
              <div className="type-body-r-s text-muted">
                {f.desc}
              </div>
            </Link>
          ))}
        </div>
        <Link
          href="/docs"
          className="mt-7 inline-block type-body-m-s text-brand-800 transition-colors hover:text-brand-900"
        >
          Read the docs
        </Link>
        <Link
          href="/blog/open-source-social-media-scheduler"
          className="mt-3 ml-5 inline-block type-body-r-s text-muted transition-colors hover:text-fg"
        >
          Open-source social media scheduler guide →
        </Link>
      </section>

      {/* ── CTA ── */}
      <section className="bg-linear-to-b from-transparent to-brand-100/60 py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-5 md:px-12">
          <Kicker>Get started today</Kicker>
          <h2 className="mb-5 type-head-sb-3 tracking-tight md:type-head-sb-1">
            Start scheduling for free.
          </h2>
          <p className="mb-8 max-w-lg type-body-r-l text-muted">
            14-day free trial. No credit card required. Connect your first
            account in under a minute and schedule your first post today.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/register" className="btn-primary px-6 py-3 type-body-sb-m">
              Get started free
            </Link>
            <Link href="/pricing" className="btn-secondary px-6 py-3 type-body-sb-m">
              Pricing
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
