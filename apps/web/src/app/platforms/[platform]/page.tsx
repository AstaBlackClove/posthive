import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MarketingNavBar } from "../../../components/MarketingNavBar";
import { LandingFooter } from "../../../components/LandingFooter";
import { PlatformIcon } from "../../../components/PlatformIcon";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "https://posthive.co";

function buildSchemas(platform: string, data: PlatformData) {
  const url = `${WEB_URL}/platforms/${platform}`;
  const softwareApp = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Posthive",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: `Schedule ${data.name} posts automatically. ${data.subheadline}`,
    url,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "14-day free trial" },
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: WEB_URL },
      { "@type": "ListItem", position: 2, name: "Platforms", item: `${WEB_URL}/platforms` },
      { "@type": "ListItem", position: 3, name: `${data.name} Scheduler`, item: url },
    ],
  };
  const faqPage = data.faq && data.faq.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faq.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  } : null;
  return { softwareApp, breadcrumb, faqPage };
}

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
  why?: { title: string; desc: string }[];
  faq?: { q: string; a: string }[];
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
    why: [
      { title: "Bluesky is growing fast — consistency wins", desc: "Bluesky crossed 30 million users and is still accelerating. The accounts that grow fastest are the ones that show up every day. Posthive makes that effortless — batch a week of content in one session, schedule it, and let it run." },
      { title: "No other scheduler does Bluesky this well", desc: "Buffer and Hootsuite still don't support Bluesky. Posthive was built for the new social web from day one — AT Protocol, app passwords, link cards, and first comment are all handled natively." },
      { title: "First comment automation is a Bluesky superpower", desc: "Schedule a reply to your own post that fires the moment it goes live. Use it for a link you couldn't fit in 300 chars, a thread continuation, or a CTA. No other tool does this on Bluesky." },
    ],
    faq: [
      { q: "Does Posthive support Bluesky threads?", a: "Posthive supports first comment automation on Bluesky — you can schedule a reply that posts immediately after your main post. Full thread scheduling (multiple replies in sequence) is on the roadmap." },
      { q: "Do I need to share my Bluesky password?", a: "No. You generate an app password inside Bluesky settings (Settings → Privacy and Security → App Passwords). This is a separate, revocable credential — your main password is never shared." },
      { q: "What happens if my post fails to publish?", a: "Posthive retries automatically. If the post still fails, the job is marked as failed and you get a visible error in your Posts dashboard so you can re-schedule." },
      { q: "Can I schedule images on Bluesky?", a: "Yes up to 4 images per post. You can also add alt text to each image directly in the Posthive composer." },
    ],
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
    why: [
      { title: "Threads punishes inconsistency", desc: "The Threads algorithm heavily favours accounts that post regularly. Missing a day tanks your reach. Posthive lets you batch a week of content in one sitting and schedule it so you never go dark." },
      { title: "60-day OAuth tokens handled automatically", desc: "Threads access tokens expire every 60 days. Posthive refreshes them silently in the background — you never get an unexpected 'account disconnected' failure mid-schedule." },
      { title: "Write once, post everywhere", desc: "Posthive lets you write one post and push it to Threads and nine other platforms simultaneously. Tweak the copy per-platform with overrides if you need to — no copy-pasting required." },
    ],
    faq: [
      { q: "Does Posthive support Threads carousels?", a: "Threads carousels are not yet supported via the API. Posthive supports text posts and single image/video posts on Threads." },
      { q: "How does Threads OAuth work?", a: "Posthive redirects you to Meta's OAuth page where you approve access. The token is encrypted and stored securely. Posthive refreshes it automatically before it expires." },
      { q: "Can I schedule Threads posts with images?", a: "Yes — attach an image or video in the Posthive composer and it will be included in your Threads post at the scheduled time." },
    ],
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
    why: [
      { title: "Reels, Stories, and feed posts — all from one place", desc: "Most schedulers support Instagram feed posts and stop there. Posthive handles the full content mix: feed posts, carousels up to 10 images, Reels, and Stories. You don't need a separate app for each content type." },
      { title: "Consistency is what the Instagram algorithm rewards", desc: "Instagram's algorithm heavily favours accounts that post at regular intervals. Going dark for a few days tanks your reach. Posthive lets you batch a week of content in one session and schedule it so your profile stays active even when you're not." },
      { title: "Stop posting manually at peak hours", desc: "You know 7pm Tuesday gets the best engagement — but you're not always free at 7pm Tuesday. Posthive fires the post at the exact second you schedule it, so you capture peak-hour reach without being glued to your phone." },
    ],
    faq: [
      { q: "Does Posthive support Instagram Reels scheduling?", a: "Yes. Posthive supports scheduling Instagram Reels via the Instagram Graph API. Attach your video in the composer, write your caption, and set a publish time. Posthive handles the media container upload and publish automatically." },
      { q: "Can I schedule Instagram carousels?", a: "Yes. Posthive supports carousels of up to 10 images. Attach multiple images in the composer and Posthive will publish them as a single carousel post." },
      { q: "What type of Instagram account do I need?", a: "You need an Instagram Professional account — either Business or Creator. Personal accounts are not supported by the Instagram Graph API. Switching to a Professional account is free and takes about 30 seconds in the Instagram app." },
      { q: "Can I schedule Instagram Stories?", a: "Yes. Posthive supports Instagram Stories scheduling via the Graph API. Attach your Story image or video and select Story as the content type in the composer." },
    ],
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
    why: [
      { title: "LinkedIn reach is highest in the first hour", desc: "The LinkedIn algorithm judges a post's reach by its early engagement. If you're posting at 2am when nobody's online, you're wasting it. Posthive lets you schedule for 8am Tuesday when your audience is actually active." },
      { title: "First comment is a LinkedIn growth hack", desc: "LinkedIn's algorithm counts comments heavily. Many creators post their main content, then immediately add a first comment with hashtags or a question to drive replies. Posthive automates this — the comment fires the second the post goes live." },
      { title: "3,000 characters — use them", desc: "LinkedIn posts that tell a full story consistently outperform short ones. Posthive's composer gives you the full 3,000 character limit with a live counter, so you can write thoughtful long-form content without being cut off." },
    ],
    faq: [
      { q: "Can I schedule LinkedIn articles with Posthive?", a: "Posthive schedules LinkedIn posts (feed updates) via the UGC API. Full LinkedIn articles (long-form content) are not supported via the LinkedIn API at this time." },
      { q: "How does first comment work on LinkedIn?", a: "Write your first comment in the dedicated field in the Posthive composer. When your post goes live, Posthive immediately posts the comment as a reply from the same account." },
      { q: "Does Posthive support LinkedIn company pages?", a: "Posthive connects to LinkedIn personal profiles via OAuth. Company page scheduling requires LinkedIn's Marketing Developer Platform access, which is on the roadmap." },
      { q: "What happens to my LinkedIn token after 60 days?", a: "Posthive stores your LinkedIn OAuth token and refreshes it automatically before it expires. You won't get disconnected mid-campaign." },
    ],
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
    why: [
      { title: "Any instance, no configuration headaches", desc: "Posthive works with any Mastodon-compatible server. Enter your instance URL, approve OAuth, and you're posting. Whether you're on mastodon.social, fosstodon.org, hachyderm.io, or a private instance — it just works." },
      { title: "The only scheduler that also does Bluesky and Nostr", desc: "If you're building a presence across the fediverse and the open social web, Posthive is the only tool that handles Mastodon, Bluesky, and Nostr from one composer. Cross-post to all three in a single click." },
      { title: "First comment on Mastodon", desc: "Schedule a reply to your own toot that fires immediately after the main post. Use it for content warnings, links, or a thread continuation — exactly the way power users do it manually, but automated." },
    ],
    faq: [
      { q: "Which Mastodon instances does Posthive support?", a: "Any instance running Mastodon 3.0 or later. This includes mastodon.social, fosstodon.org, hachyderm.io, infosec.exchange, and thousands of others. Posthive registers an OAuth app on your instance automatically." },
      { q: "Is my Mastodon account safe?", a: "Yes. Posthive uses standard OAuth — no password is ever shared. You approve access directly on your instance's login page. You can revoke access anytime from your Mastodon settings." },
      { q: "Can I connect multiple Mastodon accounts from different instances?", a: "Yes. Each account is connected separately. You can have accounts on mastodon.social, fosstodon.org, and any other instance all active in Posthive at the same time." },
      { q: "What character limit does Posthive use for Mastodon?", a: "Posthive respects your instance's character limit, which is 500 characters on most instances. The composer shows a live counter so you never go over." },
    ],
  },
  pixelfed: {
    name: "Pixelfed",
    domain: "pixelfed.social",
    color: "#ff8c00",
    headline: "Schedule to Pixelfed the federated, open-source photo platform",
    subheadline: "An Instagram alternative built on ActivityPub. Share photos to the fediverse without algorithmic manipulation or ads.",
    supports: [
      { label: "Photo posts up to 2,001 chars", icon: "text" as IconKey },
      { label: "Up to 4 images per post", icon: "image" as IconKey },
      { label: "Alt text on media", icon: "alt" as IconKey },
      { label: "First comment on publish", icon: "comment" as IconKey },
      { label: "Per-account text override", icon: "override" as IconKey },
      { label: "ActivityPub · federated", icon: "globe" as IconKey },
    ],
    steps: [
      { n: "01", title: "Enter your instance URL", desc: "Type your Pixelfed instance (e.g. pixelfed.social, pixelfed.uno). Posthive registers an OAuth app on your instance automatically." },
      { n: "02", title: "Compose your post", desc: "Write your caption, attach at least one photo (required), and add alt text for accessibility. Choose audience and toggle NSFW if needed." },
      { n: "03", title: "Schedule and publish", desc: "Pick a time and Posthive posts to your Pixelfed instance automatically." },
    ],
    image: "/screenshots/platform-pixelfed.png",
    imageAlt: "Posthive composer with Pixelfed post preview",
    why: [
      { title: "Instagram alternative, federated", desc: "Pixelfed is what Instagram would look like if it were open-source and user-owned. Posts live on the fediverse — they can be seen from Mastodon and any ActivityPub client. No algorithm, no ads." },
      { title: "Schedule to the open social web", desc: "Posthive is the only social scheduler that covers both the Mastodon and Pixelfed sides of ActivityPub. Post to both from one composer in a single click." },
      { title: "First comment support", desc: "Schedule a reply to your own Pixelfed post that fires immediately after it goes live — great for links, credits, or hashtag lists you don't want cluttering the main caption." },
    ],
    faq: [
      { q: "Which Pixelfed instances does Posthive support?", a: "Any Pixelfed instance — pixelfed.social, pixelfed.uno, or your own self-hosted server. Enter the instance URL on the Accounts page and Posthive registers an OAuth app automatically." },
      { q: "Do I need a Pixelfed account to use this?", a: "Yes — you need an account on any Pixelfed instance. Registration is free on public instances like pixelfed.social and pixelfed.uno." },
      { q: "Can I post text-only to Pixelfed?", a: "No — Pixelfed requires at least one image per post. The Posthive composer will warn you if you try to schedule without an image attached." },
      { q: "Can I post videos to Pixelfed?", a: "Video support varies by instance. Posthive will attempt to upload the video; if the instance rejects it, you'll see an error on that target." },
    ],
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
    why: [
      { title: "Schedule Shorts at peak hours without staying up late", desc: "YouTube Shorts get the most traction when published during peak viewing windows — typically evenings and weekends. Posthive lets you upload your video and set an exact publish time so you hit those windows every time without being at your desk." },
      { title: "Dedicated title and description fields", desc: "YouTube is different from every other platform — it needs a title, a description, and a video file. Posthive has dedicated fields for all three, separate from your main post content, so nothing gets mixed up between platforms." },
      { title: "Resumable upload API — no dropped uploads", desc: "Posthive uses YouTube's resumable upload API to push video files. If the connection hiccups mid-upload, it resumes from where it left off. Large video files don't fail silently." },
    ],
    faq: [
      { q: "Can I schedule YouTube Shorts with Posthive?", a: "Yes. Posthive supports YouTube Shorts scheduling. Toggle the Short option in the composer and Posthive automatically adds the #Shorts tag and sets the correct video parameters for the Shorts feed." },
      { q: "What video formats does Posthive support for YouTube?", a: "Posthive uploads video files to YouTube using the resumable upload API. Standard formats like MP4, MOV, and AVI are supported. YouTube processes the video after upload, which may take a few minutes." },
      { q: "How do I connect my YouTube channel?", a: "Click Connect YouTube in the Accounts page. You're redirected to Google's OAuth page where you approve access to your YouTube channel. The token is stored encrypted and refreshed automatically." },
      { q: "Can I schedule regular YouTube videos (not just Shorts)?", a: "Yes. Posthive supports both YouTube Shorts and regular video uploads. Toggle between Short and Video in the composer. Regular videos include a full title and description field." },
    ],
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
    why: [
      { title: "Facebook Pages die without consistency", desc: "Organic reach on Facebook Pages is already low — posting irregularly makes it worse. The algorithm deprioritises Pages that go quiet. Posthive keeps your Page active on autopilot so you maintain whatever reach you've built." },
      { title: "All your Pages in one place", desc: "If you manage multiple Facebook Pages — for different brands, clients, or projects — Posthive connects all of them in one account. Switch between Pages in the composer without logging in and out of Business Manager." },
      { title: "Text, photo, video, and carousel all supported", desc: "Facebook Pages support a wider range of post types than most platforms. Posthive handles text posts, single photos, multi-photo carousels, and video posts via the Graph API — so you're not limited to just text." },
    ],
    faq: [
      { q: "Does Posthive support Facebook personal profiles?", a: "No. Facebook's API only allows posting to Pages, not personal profiles. You need a Facebook Page to use Posthive. Creating a Page is free and takes about two minutes." },
      { q: "Can I manage multiple Facebook Pages with Posthive?", a: "Yes. When you connect via Facebook OAuth, Posthive lists all Pages you administer. Connect each Page as a separate account and post to them independently or simultaneously." },
      { q: "Does Posthive support Facebook video posts?", a: "Yes. Posthive supports video posts to Facebook Pages via the Graph API. Attach your video file in the composer and schedule it like any other post." },
      { q: "What is the character limit for Facebook posts?", a: "Facebook Pages support up to 63,206 characters per post. Posthive's composer shows a live counter so you always know how much space you have left." },
    ],
  },
  pinterest: {
    name: "Pinterest",
    domain: "pinterest.com",
    color: "#e60023",
    headline: "Schedule Pinterest Pins without losing momentum",
    subheadline: "Pinterest rewards consistency. Write your Pin descriptions in Posthive, attach your image, set a time, and let it publish — so your boards stay active without you staying online.",
    supports: [
      { label: "Pin with image (required)", icon: "image" as IconKey },
      { label: "Title and description text", icon: "text" as IconKey },
      { label: "Destination link URL", icon: "link" as IconKey },
      { label: "Board selection per account", icon: "page" as IconKey },
      { label: "Per-account text override", icon: "override" as IconKey },
      { label: "Calendar drag-to-reschedule", icon: "calendar" as IconKey },
    ],
    steps: [
      { n: "01", title: "Connect with Pinterest OAuth", desc: "Click Connect Pinterest in Posthive's Accounts page. Approve the OAuth prompt and your Pinterest account is linked with publish access." },
      { n: "02", title: "Compose your Pin", desc: "Write your Pin title and description, attach an image, and add a destination URL. Select the board you want to post to." },
      { n: "03", title: "Schedule and publish", desc: "Pick your publish time. Posthive creates the Pin via the Pinterest API v5 at the exact moment you chose." },
    ],
    note: "Pinterest requires an image for every Pin — text-only posts are not supported. Sandbox mode is available for testing without publishing to live boards.",
    image: "/screenshots/platform-pinterest.png",
    imageAlt: "Posthive composer Pinterest Pin scheduling with image",
    why: [
      { title: "Pinterest rewards volume — scheduling makes it sustainable", desc: "Pinterest's algorithm favours accounts that Pin consistently over time. Most creators burn out trying to post daily manually. Posthive lets you batch 30 Pins in one session and drip them out over a month automatically." },
      { title: "Every Pin is a link back to your site", desc: "Unlike other platforms, Pinterest Pins have a destination URL built in. Every scheduled Pin is also a scheduled backlink. Posthive makes it easy to attach your URL to every post without extra steps." },
      { title: "Flat price, no per-seat nonsense", desc: "Pinterest schedulers like Tailwind charge per seat and lock features behind higher tiers. Posthive is a flat monthly price — Creator, Pro, or Team — with all platforms included on every plan." },
    ],
    faq: [
      { q: "Does Pinterest scheduling require an image?", a: "Yes. Pinterest requires an image for every Pin — text-only posts are not supported by the Pinterest API. Attach an image in the Posthive composer before scheduling." },
      { q: "Which Pinterest boards can I post to?", a: "Posthive can post to any board on your connected Pinterest account. Select the target board in the compose screen before scheduling." },
      { q: "What is Pinterest sandbox mode?", a: "Pinterest sandbox mode lets you test the full scheduling flow — connecting your account, composing Pins, and triggering publish — without creating real Pins on your live boards. Useful for testing integrations." },
      { q: "How do I connect my Pinterest account?", a: "Click Connect Pinterest in the Accounts page. You're redirected to Pinterest's OAuth page where you approve Posthive's access. The token is encrypted and stored securely." },
    ],
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
    why: [
      { title: "No OAuth, no waiting, no approval process", desc: "Telegram scheduling via Posthive requires no Meta app review, no OAuth redirect, and no API key approval. Create a bot via @BotFather in two minutes, add it to your channel, and start scheduling immediately." },
      { title: "4,096 characters — more room than any other platform", desc: "Telegram channels are where people share long-form updates, deep dives, and newsletters. Posthive gives you the full 4,096 character limit with media support so nothing gets cut off." },
      { title: "Media groups — 10 images in one post", desc: "Send up to 10 images as a single media group post. Perfect for product showcases, step-by-step guides, or photo essays. Posthive handles the Telegram media group API automatically." },
    ],
    faq: [
      { q: "Do I need a Telegram account to use this?", a: "Yes. You need a Telegram account to create a bot via @BotFather. The bot is what Posthive uses to post to your channel — no OAuth or Meta approval required." },
      { q: "Can I post to private Telegram channels?", a: "Yes. Private channels work with their numeric ID (e.g. -1001234567890) instead of a username. Posthive accepts both formats." },
      { q: "What media types does Posthive support on Telegram?", a: "Single images with captions, multi-image media groups (up to 10), and video posts with captions. Text-only posts are also supported up to 4,096 characters." },
      { q: "Can one bot post to multiple channels?", a: "Yes. A single Telegram bot can be added as an admin to multiple channels. In Posthive, connect each channel as a separate account using the same bot token with different channel usernames." },
    ],
  },
  discord: {
    name: "Discord",
    domain: "discord.com",
    color: "#5865F2",
    headline: "Schedule Discord announcements without staying online",
    subheadline: "Post to your Discord server channels on a consistent schedule. Write your message in Posthive, pick a time, and let it publish via webhook — no manual posting needed.",
    supports: [
      { label: "Text posts up to 2,000 chars", icon: "text" as IconKey },
      { label: "Single image with message", icon: "image" as IconKey },
      { label: "Up to 10 images in one post", icon: "carousel" as IconKey },
      { label: "Video posts", icon: "video" as IconKey },
      { label: "First comment as thread reply", icon: "comment" as IconKey },
      { label: "Per-account text override", icon: "override" as IconKey },
    ],
    steps: [
      { n: "01", title: "Create a Discord app and bot", desc: "Go to discord.com/developers, create a new application named Posthive, add a bot, and copy the bot token." },
      { n: "02", title: "Add env vars and connect", desc: "Add DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_BOT_TOKEN, and DISCORD_REDIRECT_URI to your .env. Then click Connect Discord on the Accounts page." },
      { n: "03", title: "Authorise and pick a channel", desc: "Discord's OAuth page lets you choose which server to add the bot to. Back in Posthive, pick the channel to post to. A webhook is created automatically." },
    ],
    note: "Posts are sent via a webhook created automatically when you connect a channel. This avoids the bot badge on messages and gives cleaner attribution in Discord.",
    image: "/screenshots/platform-discord.png",
    imageAlt: "Posthive composer Discord channel post scheduling",
    why: [
      { title: "Keep your community updated without manual effort", desc: "Product updates, blog posts, weekly digests — schedule them ahead of time and let Posthive post to your Discord server at the right moment. No need to be online." },
      { title: "Webhook-based posting for clean messages", desc: "Posthive auto-creates a channel webhook when you connect. Messages post under the Posthive name without a heavy bot badge, keeping your announcement channel looking clean." },
      { title: "Images and video in every post", desc: "Attach up to 10 images or a video to your Discord post. Posthive uploads them directly to the channel so they render inline — no external links needed." },
    ],
    faq: [
      { q: "Do I need a Discord bot to use Posthive with Discord?", a: "Yes. You create a free Discord application and bot at discord.com/developers. The bot token goes in your Posthive .env file. The OAuth flow then lets users add the bot to their server and pick a channel." },
      { q: "Why does the post show an APP label in Discord?", a: "Discord shows an APP label on all programmatic posts — whether via bot or webhook. This is a Discord platform-level requirement that cannot be removed. All Discord scheduling tools work the same way." },
      { q: "Can I post to multiple Discord channels?", a: "Yes. Each channel you connect in Posthive becomes a separate account. You can select multiple channels in the compose window and post to all of them at once." },
      { q: "What happens if webhook creation fails?", a: "Posthive automatically falls back to direct bot token posting so your post still goes through. The webhook is a best-effort optimisation, not a hard requirement." },
    ],
  },
  nostr: {
    name: "Nostr",
    domain: "nostr.com",
    color: "#8B5CF6",
    headline: "Schedule Nostr notes without staying online",
    subheadline: "Publish to the decentralized social web on a consistent schedule. Write your notes in Posthive, set a time, and let it broadcast to Nostr relays — no OAuth, no approval needed.",
    supports: [
      { label: "Text notes up to 10,000 chars", icon: "text" as IconKey },
      { label: "Images appended as URLs (NIP-92 imeta)", icon: "image" as IconKey },
      { label: "Publishes to 4 major relays simultaneously", icon: "globe" as IconKey },
      { label: "First comment as NIP-10 reply", icon: "comment" as IconKey },
      { label: "Keypair auth — no OAuth, no app approval", icon: "lock" as IconKey },
      { label: "Per-account text override", icon: "override" as IconKey },
    ],
    steps: [
      { n: "01", title: "Get your nsec private key", desc: "Open any Nostr client (Primal, Damus, Amethyst) and export your nsec private key. Or generate a brand-new keypair directly in Posthive." },
      { n: "02", title: "Connect in Posthive", desc: "Paste your nsec1... key into the Connect Nostr dialog. Your profile name and photo are fetched automatically from relays." },
      { n: "03", title: "Write and schedule your note", desc: "Compose in Posthive's editor. Pick a publish time and Posthive broadcasts your Kind 1 note to Damus, Nostr.band, nos.lol, and Snort relays." },
    ],
    note: "No OAuth redirect or server-side app credentials needed. Your nsec is stored AES-256-GCM encrypted per-user and never logged or exposed.",
    image: "/screenshots/platform-nostr.png",
    imageAlt: "Posthive composer Nostr note scheduling",
    why: [
      { title: "No approval, no OAuth, no gatekeeping", desc: "Nostr is a keypair-based protocol. There's no company to approve your app, no OAuth scopes to request, no API key waiting list. Paste your nsec, and you're posting. Posthive is one of the only schedulers in the world that supports Nostr." },
      { title: "Publish to multiple relays simultaneously", desc: "A Nostr note is only as visible as the relays it reaches. Posthive broadcasts to Damus, Nostr.band, nos.lol, and Snort relay simultaneously — maximising reach without any extra effort on your part." },
      { title: "Your keys stay yours", desc: "Posthive stores your nsec encrypted with AES-256-GCM — the same standard used in banking. It is never logged, never exposed in API responses, and never visible to anyone but you. You can also self-host Posthive if you want complete control." },
    ],
    faq: [
      { q: "What is a Nostr scheduler?", a: "A Nostr scheduler is a tool that lets you write Nostr notes (Kind 1 events) in advance and publish them to relays at a scheduled time. Posthive is one of the only social media schedulers that supports Nostr." },
      { q: "Is it safe to paste my nsec into Posthive?", a: "Your nsec is encrypted with AES-256-GCM before being stored. It is never logged or returned in API responses. If you prefer zero trust, you can self-host Posthive on your own server — the source code is fully open on GitHub." },
      { q: "Can I generate a new Nostr keypair in Posthive?", a: "Yes. If you don't have a Nostr keypair yet, Posthive can generate one for you. Your new npub and nsec are shown once — save them in a password manager before closing the dialog." },
      { q: "Which relays does Posthive publish to?", a: "Posthive publishes to relay.damus.io, relay.nostr.band, nos.lol, and relay.snort.social by default. These are among the highest-uptime public relays on the network." },
    ],
  },
  tumblr: {
    name: "Tumblr",
    domain: "tumblr.com",
    color: "#35465c",
    headline: "Schedule Tumblr posts without staying logged in",
    subheadline: "Write your blog posts in Posthive, pick a publish time, and let Posthive push them to your Tumblr blog automatically text, images, and all.",
    supports: [
      { label: "Text posts up to 4,096 chars", icon: "text" as IconKey },
      { label: "Images in NPF format", icon: "image" as IconKey },
      { label: "Posts to your primary blog", icon: "globe" as IconKey },
      { label: "OAuth 1.0a secure connection", icon: "lock" as IconKey },
      { label: "Per-account text override", icon: "override" as IconKey },
    ],
    steps: [
      { n: "01", title: "Register a Tumblr app", desc: "Go to tumblr.com/oauth/apps and register a new application. Set the callback URL to your Posthive API domain + /auth/tumblr/callback." },
      { n: "02", title: "Add env vars", desc: "Add TUMBLR_CONSUMER_KEY, TUMBLR_CONSUMER_SECRET, and TUMBLR_REDIRECT_URI to your .env file." },
      { n: "03", title: "Connect your blog", desc: "Click Connect Tumblr on the Accounts page. Approve the OAuth prompt and Posthive links to your primary Tumblr blog." },
    ],
    note: "Tumblr uses OAuth 1.0a with HMAC-SHA1 — the same auth method as X/Twitter. Tokens do not expire, so you only need to connect once.",
    image: "/screenshots/platform-tumblr.png",
    imageAlt: "Posthive composer Tumblr post scheduling",
    why: [
      { title: "A platform Postiz and most schedulers skip", desc: "Tumblr has a large, active creative community that most social schedulers ignore. Posthive is one of the only open-source schedulers that supports Tumblr — giving you access to an audience your competitors aren't reaching." },
      { title: "No expiring tokens, no re-auth needed", desc: "Tumblr's OAuth 1.0a access tokens never expire. Connect once and Posthive will keep posting without ever asking you to re-authenticate." },
      { title: "Text and images in every post", desc: "Posthive posts using Tumblr's NPF (Neue Post Format) — supporting rich text blocks and inline images. Your posts render beautifully in Tumblr's native UI." },
    ],
    faq: [
      { q: "Does Posthive post to my primary blog or all blogs?", a: "Posthive posts to your primary Tumblr blog by default. You can connect additional blogs as separate accounts by going through the OAuth flow again." },
      { q: "Does Tumblr require API approval?", a: "No. Registering a Tumblr app at tumblr.com/oauth/apps is instant — no review process, no waitlist, no business verification. You get your consumer key immediately." },
      { q: "Can I schedule reblogs?", a: "Not currently. Posthive creates new original posts on your blog. Reblog scheduling is not supported by the Tumblr API for third-party apps." },
      { q: "What post format does Posthive use?", a: "Posthive uses Tumblr's NPF (Neue Post Format) for all posts. Text is posted as a text block, images are posted as image blocks — all in a single post, rendered natively in Tumblr." },
    ],
  },
  lemmy: {
    name: "Lemmy",
    domain: "join-lemmy.org",
    color: "#ff6314",
    headline: "Schedule posts to any Lemmy community automatically",
    subheadline: "Post to federated Lemmy communities on a schedule. Write once in Posthive, pick a time, and let it publish to any instance — lemmy.world, lemmy.ml, beehaw.org, or your own.",
    supports: [
      { label: "Text posts with Markdown body", icon: "text" as IconKey },
      { label: "Image upload via pictrs", icon: "image" as IconKey },
      { label: "First comment on publish", icon: "comment" as IconKey },
      { label: "Any Lemmy instance supported", icon: "text" as IconKey },
      { label: "Per-account text override", icon: "override" as IconKey },
    ],
    steps: [
      { n: "01", title: "Create a Lemmy account", desc: "Sign up on any Lemmy instance — lemmy.world, lemmy.ml, beehaw.org, or any other. No API key or app registration needed." },
      { n: "02", title: "Connect in Posthive", desc: "Go to Accounts → Connect Lemmy. Enter your instance URL, username, password, and the community to post to (e.g. selfhosted@lemmy.world)." },
      { n: "03", title: "Compose and schedule", desc: "Write your post in Posthive. The first line becomes the post title, the rest becomes the body. Pick a time and schedule." },
    ],
    note: "Lemmy uses username and password authentication — no OAuth flow, no app registration required. Your credentials are stored AES-256-GCM encrypted. Posthive re-authenticates on each post since Lemmy JWTs expire.",
    image: "/screenshots/platform-lemmy.png",
    imageAlt: "Posthive composer Lemmy community post scheduling",
    why: [
      { title: "Reach the federated open-source community", desc: "Lemmy's selfhosted, opensource, and programming communities are highly engaged. Schedule your project updates, releases, and announcements to reach developers who actually care about open-source software." },
      { title: "No app registration or API keys", desc: "Unlike most platforms, Lemmy requires no developer account, no OAuth app, no approval process. Just a username and password — connect in seconds." },
      { title: "Any instance, any community", desc: "Connect to multiple Lemmy instances and communities as separate accounts. Post the same content to selfhosted@lemmy.world and opensource@lemmy.ml simultaneously." },
    ],
    faq: [
      { q: "Does Posthive work with any Lemmy instance?", a: "Yes. Enter any public Lemmy instance URL (e.g. https://lemmy.world, https://lemmy.ml). The instance must be running Lemmy v0.19+ with a public API." },
      { q: "How does the post title work?", a: "Lemmy requires a title for every post. Posthive uses the first line of your text as the title (up to 200 characters) and the remaining lines as the post body." },
      { q: "Can I post to multiple communities?", a: "Yes. Each community you connect becomes a separate account in Posthive. Connect selfhosted@lemmy.world and opensource@beehaw.org as two separate accounts and select both in the composer." },
      { q: "Is my password stored securely?", a: "Yes. Your Lemmy password is stored AES-256-GCM encrypted in Posthive's database — the same encryption used for all OAuth tokens. It is never logged or transmitted in plain text." },
      { q: "Does Lemmy require API approval?", a: "No. Lemmy has a fully open API — no developer account, no app registration, no review process. You only need a regular Lemmy user account on any instance." },
    ],
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
    why: [
      { title: "Post at peak hours without watching the clock", desc: "X engagement spikes at specific windows — early morning, lunch, and early evening in your audience's timezone. Posthive lets you write your tweets whenever inspiration hits and schedule them to go live exactly when your audience is most active." },
      { title: "100 tweets/month included on Pro and Team", desc: "X's API pricing is steep. Posthive absorbs the API cost and includes 100 tweets per month on Pro and Team plans — no extra billing, no per-tweet charges. Links are not supported due to X's API restrictions on the Basic tier." },
      { title: "Cross-post to 10 other platforms simultaneously", desc: "If you're on X, you're probably also on Bluesky, LinkedIn, or Threads. Posthive lets you write once and post to all of them in one click. Use per-platform overrides to tweak the copy for each network without creating separate posts." },
    ],
    faq: [
      { q: "Why can't I include links in X posts via Posthive?", a: "X charges significantly more for API access that allows link posting. Posthive uses the Basic API tier, which does not support tweets containing URLs. This is an X API restriction, not a Posthive limitation." },
      { q: "How many tweets can I schedule per month?", a: "Pro and Team plans include 100 tweets per month. This resets on your billing cycle. The limit is shared across all connected X accounts on your plan." },
      { q: "Can I schedule X threads with Posthive?", a: "Posthive currently supports individual tweets and first comment (reply) automation. Full thread scheduling — multiple sequential replies — is on the roadmap." },
      { q: "How do I connect my X account?", a: "Click Connect X in the Accounts page. You're redirected to X's OAuth page to approve access. The connection uses OAuth 1.0a, which is what X requires for posting via the API." },
    ],
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

// ── Platform mockup samples ─────────────────────────────────────────────────

const PLATFORM_SAMPLES: Record<string, { text: string; count: number; limit: number | string; showImages: boolean; authLabel: string; mediaLabel: string }> = {
  bluesky:   { text: "Shipping features faster than ever with Posthive. The async workflow is a game-changer.", count: 88, limit: 300, showImages: true, authLabel: "App password", mediaLabel: "4 images" },
  threads:   { text: "Sunday reset thread. Six things I'm carrying into the week 👇", count: 63, limit: 500, showImages: true, authLabel: "Meta OAuth", mediaLabel: "10 images" },
  instagram: { text: "New collection drop 🎨 Every piece is one-of-a-kind. Tap to see the full series.", count: 80, limit: 2200, showImages: true, authLabel: "Meta OAuth", mediaLabel: "Reels + Stories" },
  linkedin:  { text: "3 lessons learned from automating our content pipeline with Posthive. We used to spend 90 minutes a day cross-posting. Now it's 10.", count: 135, limit: 3000, showImages: true, authLabel: "LinkedIn OAuth", mediaLabel: "9 images" },
  mastodon:  { text: "Open source, open web. Shipped a new feature today — all the details in the thread below 🧵", count: 91, limit: 500, showImages: true, authLabel: "OAuth 2.0", mediaLabel: "Image + Video" },
  youtube:   { text: "How I Automated My Entire Social Media Strategy (in 1 hour)", count: 57, limit: 100, showImages: false, authLabel: "Google OAuth", mediaLabel: "Video upload" },
  facebook:  { text: "Big update on our content strategy. We've been using Posthive for 3 months now — here's what changed:", count: 93, limit: "63k", showImages: true, authLabel: "Meta OAuth", mediaLabel: "Photo + Video" },
  pinterest: { text: "10 desk setups that actually boost productivity → link in bio", count: 58, limit: 500, showImages: true, authLabel: "Pinterest OAuth", mediaLabel: "Image required" },
  telegram:  { text: "📡 Weekly digest is live. New MCP integrations, scheduling tips, and community highlights.", count: 89, limit: 4096, showImages: true, authLabel: "Bot token", mediaLabel: "10 images" },
  discord:   { text: "📣 New release! Posthive now supports Discord scheduling via webhook. No more manual announcements.", count: 93, limit: 2000, showImages: true, authLabel: "Bot + webhook", mediaLabel: "10 images" },
  nostr:     { text: "The open social web is growing. Shipped Nostr support in Posthive — schedule Kind 1 notes across 4 relays.", count: 107, limit: "10k", showImages: false, authLabel: "Keypair (nsec)", mediaLabel: "NIP-92 images" },
  tumblr:    { text: "new post: why I switched from Buffer to a self-hosted scheduler (and what I learned)", count: 82, limit: 4096, showImages: true, authLabel: "OAuth 1.0a", mediaLabel: "NPF images" },
  twitter:   { text: "shipped: drag-to-reschedule calendar is live. move posts around with one drag — no more manual edits", count: 97, limit: 280, showImages: true, authLabel: "OAuth 1.0a", mediaLabel: "4 images" },
};

// ── Platform hero mockup card ──────────────────────────────────────────────

function PlatformMockup({ platform, name, color }: { platform: string; name: string; color: string }) {
  const s = PLATFORM_SAMPLES[platform] ?? PLATFORM_SAMPLES.bluesky;
  const accentClr = "#5b63d3";
  const divClr = "rgba(237,237,237,0.1)";

  return (
    <div style={{ width: "100%", borderRadius: 16, overflow: "hidden", border: `1px solid ${divClr}`, background: "#0e0e14", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
      {/* header bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${divClr}`, background: "rgba(255,255,255,0.03)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <PlatformIcon platform={platform} size={16} />
          <span style={{ fontSize: 13, fontWeight: 500, color: "#ededed" }}>Posthive · {name}</span>
        </div>
        <div style={{ fontSize: 10, letterSpacing: "0.1em", color: accentClr, border: `1px solid ${accentClr}`, borderRadius: 4, padding: "2px 7px", fontWeight: 600 }}>DRAFT</div>
      </div>

      {/* post card */}
      <div style={{ margin: 14, borderRadius: 12, border: `1px solid ${divClr}`, background: "#111", overflow: "hidden" }}>
        {/* post header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#2a2a2a", display: "grid", placeItems: "center", flexShrink: 0, fontSize: 13, fontWeight: 600, color: "rgba(237,237,237,0.6)" }}>@</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#ededed" }}>@yourhandle</div>
            <div style={{ fontSize: 11, color: "rgba(237,237,237,0.4)", marginTop: 1 }}>Scheduled · Tomorrow 9:00 AM</div>
          </div>
        </div>

        {/* post text */}
        <div style={{ padding: "0 16px 14px", fontSize: 14, lineHeight: 1.55, color: "rgba(237,237,237,0.85)" }}>{s.text}</div>

        {/* image placeholders */}
        {s.showImages && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, margin: "0 16px 14px" }}>
            {[1, 2].map(n => (
              <div key={n} style={{ borderRadius: 8, background: "rgba(91,99,211,0.12)", border: `1px solid ${divClr}`, aspectRatio: "16/10", display: "grid", placeItems: "center" }}>
                <span style={{ fontSize: 11, color: "rgba(237,237,237,0.25)", letterSpacing: "0.06em" }}>image 0{n}</span>
              </div>
            ))}
          </div>
        )}

        {/* stats row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: `1px solid ${divClr}` }}>
          <div style={{ display: "flex", gap: 16, fontSize: 12, color: "rgba(237,237,237,0.35)" }}>
            <span>♥ 24</span><span>↩ 6</span><span>↕ 3</span>
          </div>
          <span style={{ fontSize: 12, color: "rgba(237,237,237,0.35)", fontFeatureSettings: "'tnum' 1" }}>{s.count} / {s.limit}</span>
        </div>
      </div>

      {/* first comment section */}
      <div style={{ margin: "0 14px 14px", borderRadius: 10, border: `1px solid ${divClr}`, background: "rgba(91,99,211,0.06)", padding: "12px 14px" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.12em", color: color, fontWeight: 600, marginBottom: 6 }}>FIRST COMMENT · AUTO-POSTED</div>
        <div style={{ fontSize: 13, color: "rgba(237,237,237,0.6)" }}>Full changelog and screenshots → posthive.co/blog</div>
      </div>
    </div>
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
    alternates: { canonical: `${WEB_URL}/platforms/${platform}` },
    openGraph: {
      title: `${data.name} Scheduler | Posthive`,
      description: data.subheadline,
      url: `${WEB_URL}/platforms/${platform}`,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(data.name + " Scheduler")}&desc=${encodeURIComponent(data.subheadline)}`,
          width: 1200,
          height: 630,
          alt: `${data.name} Scheduler — Posthive`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: `${data.name} Scheduler | Posthive`,
      description: data.subheadline,
    },
  };
}

export default async function PlatformPage({ params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const data = PLATFORMS[platform];
  if (!data) notFound();

  const registerUrl = `${process.env.NEXT_PUBLIC_API_URL ? "" : ""}/register`;

  const { softwareApp, breadcrumb, faqPage } = buildSchemas(platform, data);

  const W = "1200px";
  const div = "rgba(237,237,237,0.1)";
  const muted75 = "rgba(237,237,237,0.75)";
  const muted55 = "rgba(237,237,237,0.55)";
  const accent = "#5b63d3";

  const sample = PLATFORM_SAMPLES[platform] ?? PLATFORM_SAMPLES.bluesky;

  return (
    <div style={{
      minHeight: "100vh", color: "#ededed", fontFamily: "Inter,system-ui,-apple-system,sans-serif",
      background: `radial-gradient(1100px 640px at 88% -180px, rgba(30,33,64,0.7), transparent 60%), radial-gradient(900px 700px at -8% 110%, rgba(0,0,0,0.3), transparent 55%), #0a0a0a`,
    }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApp) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqPage && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }} />}
      <style>{`
        .plat-wrap { max-width: ${W}; margin: 0 auto; padding: 0 clamp(20px,5vw,72px); }
        .plat-rule { height: 1px; border: 0; margin: 0; background: linear-gradient(to right, transparent, ${div} 48px calc(100% - 48px), transparent); }
        .plat-kicker { display: inline-flex; align-items: center; gap: 12px; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: ${accent}; margin: 0 0 20px; }
        .plat-kicker::before { content: ""; width: 32px; height: 1px; background: ${accent}; }
        @media (max-width: 900px) {
          .plat-hero-grid, .plat-supports-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .plat-sticky { position: static !important; }
        }
        @media (max-width: 700px) {
          .plat-steps-grid { grid-template-columns: 1fr !important; }
          .plat-why-grid { grid-template-columns: 1fr !important; }
          .plat-checklist { grid-template-columns: 1fr !important; }
          .plat-hero-grid, .plat-supports-grid { gap: 28px !important; }
          .plat-spec-strip { grid-template-columns: 1fr 1fr !important; gap: 24px !important; }
        }
        @media (max-width: 400px) {
          .plat-spec-strip { grid-template-columns: 1fr !important; }
        }
        .plat-faq { }
        .plat-faq details { padding: 22px 0; border-top: 1px solid ${div}; }
        .plat-faq details summary { cursor: pointer; font-size: 17px; font-weight: 500; list-style: none; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .plat-faq details summary::-webkit-details-marker { display: none; }
        .plat-faq-last { border-bottom: 1px solid ${div}; }
        .plat-faq summary .faq-plus { color: ${accent}; font-size: 20px; font-weight: 400; flex: none; transition: transform 0.15s; }
        .plat-faq details[open] summary .faq-plus { transform: rotate(45deg); }
        .plat-chip { display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px; border: 1px solid ${div}; border-radius: 20px; text-decoration: none; color: rgba(237,237,237,0.7); font-size: 13px; transition: border-color 0.12s; }
        .plat-chip:hover { border-color: ${accent}; }
      `}</style>

      <MarketingNavBar />
      <div style={{ height: 68 }} />

      {/* breadcrumb */}
      <div className="plat-wrap" style={{ paddingTop: 24, fontSize: 12, letterSpacing: "0.06em", color: muted55 }}>
        <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>Home</Link>
        <span style={{ margin: "0 8px", opacity: 0.5 }}>/</span>
        <Link href="/platforms/bluesky" style={{ color: "inherit", textDecoration: "none" }}>Platforms</Link>
        <span style={{ margin: "0 8px", opacity: 0.5 }}>/</span>
        <span style={{ color: "#ededed" }}>{data.name}</span>
      </div>

      {/* ── Hero ── */}
      <section className="plat-wrap" style={{ padding: "calc(2.5*28px) clamp(20px,5vw,72px) calc(3*28px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 80, alignItems: "center" }} className="plat-hero-grid">
          {/* Left: text + spec strip */}
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
              <PlatformIcon platform={platform} size={16} />
              <span style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: data.color, fontWeight: 500 }}>{data.name} Scheduler</span>
            </div>
            <h1 style={{ fontSize: "clamp(36px,4.8vw,60px)", fontWeight: 500, letterSpacing: "-.02em", lineHeight: 1.05, margin: "0 0 24px" }}>
              {data.headline}
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.55, color: muted75, margin: "0 0 32px", maxWidth: "54ch" }}>
              {data.subheadline}
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href={registerUrl} style={{ display: "inline-flex", alignItems: "center", fontSize: 14, fontWeight: 600, padding: "12px 20px", borderRadius: 8, background: accent, color: "#fff", textDecoration: "none", border: `1px solid ${accent}` }}>
                Try free for 14 days
              </Link>
              <Link href="/docs" style={{ display: "inline-flex", alignItems: "center", fontSize: 14, fontWeight: 600, padding: "12px 20px", borderRadius: 8, background: "transparent", color: muted75, textDecoration: "none", border: `1px solid ${div}` }}>
                View docs
              </Link>
            </div>
            {/* Spec strip */}
            <div className="plat-spec-strip" style={{ display: "grid", gridTemplateColumns: "repeat(3,auto)", gap: 48, marginTop: 48, paddingTop: 24, borderTop: `1px solid ${div}`, width: "fit-content" }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: muted55, marginBottom: 6 }}>Character limit</div>
                <div style={{ fontSize: 20, fontWeight: 500 }}>{sample.limit.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: muted55, marginBottom: 6 }}>Media</div>
                <div style={{ fontSize: 20, fontWeight: 500 }}>{sample.mediaLabel}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: muted55, marginBottom: 6 }}>Auth</div>
                <div style={{ fontSize: 20, fontWeight: 500 }}>{sample.authLabel}</div>
              </div>
            </div>
          </div>
          {/* Right: platform mockup card */}
          <div>
            <PlatformMockup platform={platform} name={data.name} color={data.color} />
          </div>
        </div>
      </section>

      <div className="plat-wrap"><hr className="plat-rule" /></div>

      {/* ── What's supported ── */}
      <section className="plat-wrap" style={{ padding: "calc(3*28px) clamp(20px,5vw,72px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 80, alignItems: "start" }} className="plat-supports-grid">
          <div className="plat-sticky" style={{ position: "sticky", top: 100 }}>
            <span className="plat-kicker">What Posthive supports</span>
            <h2 style={{ fontSize: "clamp(28px,3.2vw,40px)", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 20px", fontWeight: 500 }}>
              Native, not glued on.
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: muted75, margin: 0 }}>
              Every {data.name} feature Posthive supports is implemented against the native {data.name} API — not workarounds, not browser automation.
            </p>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }} className="plat-checklist">
            {data.supports.map((s, i) => (
              <li key={s.label} style={{ display: "flex", gap: 14, padding: "20px 0", borderBottom: `1px solid ${div}`, alignItems: "baseline", borderRight: i % 2 === 0 ? `1px solid ${div}` : "none", paddingRight: i % 2 === 0 ? 24 : 0, paddingLeft: i % 2 === 1 ? 24 : 0 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                  <path d="M2 7l3.5 3.5L12 3" stroke={accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontSize: 15, lineHeight: 1.5 }}>{s.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="plat-wrap"><hr className="plat-rule" /></div>

      {/* ── Screenshot section ── */}
      <section className="plat-wrap" style={{ padding: "calc(3*28px) clamp(20px,5vw,72px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <span className="plat-kicker">In Posthive</span>
            <h2 style={{ fontSize: "clamp(24px,3vw,34px)", letterSpacing: "-0.02em", lineHeight: 1.1, margin: 0, fontWeight: 500 }}>Schedule {data.name} from one composer.</h2>
          </div>
          <Link href={registerUrl} style={{ fontSize: 14, color: accent, textDecoration: "none" }}>Try it yourself</Link>
        </div>
        <div style={{ width: "100%", borderRadius: 14, overflow: "hidden", background: "#111", border: `1px solid ${div}` }}>
          <PageImage src={data.image} alt={data.imageAlt} />
        </div>
        <p style={{ fontSize: 12, color: muted55, marginTop: 12, letterSpacing: "0.02em" }}>Fig. 01 — Posthive composer showing {data.name} post preview</p>
      </section>

      <div className="plat-wrap"><hr className="plat-rule" /></div>

      {/* ── How it works ── */}
      <section className="plat-wrap" style={{ padding: "calc(3*28px) clamp(20px,5vw,72px)" }}>
        <span className="plat-kicker">How it works</span>
        <h2 style={{ fontSize: "clamp(28px,3.2vw,40px)", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 56px", fontWeight: 500, maxWidth: "22ch" }}>
          Connect once. Schedule forever.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 48 }} className="plat-steps-grid">
          {data.steps.map((s) => (
            <div key={s.n}>
              <div style={{ fontSize: 48, lineHeight: 1, fontWeight: 500, color: accent, letterSpacing: "-0.03em", marginBottom: 24, fontFeatureSettings: "'tnum' 1" }}>{s.n}</div>
              <h3 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 12px" }}>{s.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: muted75, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
        {data.note && (
          <div style={{ marginTop: 40, padding: "14px 18px", border: `1px solid ${div}`, borderRadius: 10, fontSize: 13, color: muted55, lineHeight: 1.6 }}>
            {data.note}
          </div>
        )}
      </section>

      <div className="plat-wrap"><hr className="plat-rule" /></div>

      {/* ── Why section ── */}
      {data.why && data.why.length > 0 && (
        <section className="plat-wrap" style={{ padding: "calc(3*28px) clamp(20px,5vw,72px)" }}>
          <span className="plat-kicker">Why use Posthive for {data.name}</span>
          <h2 style={{ fontSize: "clamp(28px,3.2vw,40px)", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 40px", fontWeight: 500, maxWidth: "28ch" }}>
            Built for {data.name} from day one.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }} className="plat-why-grid">
            {data.why.map((w, i) => (
              <div key={w.title} style={{ padding: 28, border: `1px solid ${div}`, borderRadius: 12, background: "rgba(17,17,17,0.55)", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 11, letterSpacing: "0.14em", color: accent }}>0{i + 1}</div>
                <h3 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>{w.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: muted75, margin: 0 }}>{w.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      {data.faq && data.faq.length > 0 && (
        <>
          <div className="plat-wrap"><hr className="plat-rule" /></div>
          <section className="plat-wrap" style={{ padding: "calc(3*28px) clamp(20px,5vw,72px)" }}>
            <span className="plat-kicker">FAQ</span>
            <h2 style={{ fontSize: "clamp(28px,3.2vw,40px)", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 48px", fontWeight: 500 }}>Frequently asked questions</h2>
            <div className="plat-faq" style={{ maxWidth: 860 }}>
              {data.faq.map((item, i) => (
                <details key={item.q} className={i === data.faq!.length - 1 ? "plat-faq-last" : ""} open={i === 0}>
                  <summary>
                    {item.q}
                    <span className="faq-plus">+</span>
                  </summary>
                  <p style={{ margin: "14px 0 0", fontSize: 14, lineHeight: 1.65, color: muted75, maxWidth: "72ch" }}>{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        </>
      )}

      <div className="plat-wrap"><hr className="plat-rule" /></div>

      {/* ── Part of a bigger picture ── OPEN text layout, no boxed card */}
      <section className="plat-wrap" style={{ padding: "calc(3*28px) clamp(20px,5vw,72px)" }}>
        <span className="plat-kicker">Part of a bigger picture</span>
        <h2 style={{ fontSize: "clamp(28px,3.2vw,40px)", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 16px", fontWeight: 500 }}>
          {data.name} is one of thirteen platforms.
        </h2>
        <p style={{ fontSize: 16, color: muted75, lineHeight: 1.6, margin: "0 0 32px", maxWidth: "60ch" }}>
          Posthive also posts to Bluesky, Threads, Instagram, LinkedIn, Mastodon, Pixelfed, YouTube, Facebook Pages, Pinterest, Telegram, Nostr, Discord, and Tumblr — all from the same composer.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 32 }}>
          {(["bluesky", "threads", "instagram", "linkedin", "mastodon", "pixelfed", "youtube", "facebook", "pinterest", "telegram", "twitter", "nostr", "discord", "tumblr"] as const)
            .filter(p => p !== platform)
            .map(p => (
              <Link key={p} href={`/platforms/${p}`} className="plat-chip">
                <PlatformIcon platform={p} size={14} />
                {PLATFORMS[p]?.name ?? p}
              </Link>
            ))}
        </div>
        <Link href={registerUrl} style={{ fontSize: 14, color: accent, textDecoration: "none" }}>Connect all your platforms</Link>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: "linear-gradient(180deg, transparent 0%, rgba(30,33,64,0.32) 100%)", padding: "calc(4*28px) 0" }}>
        <div className="plat-wrap" style={{ maxWidth: 900 }}>
          <span className="plat-kicker">Get started today</span>
          <h2 style={{ fontSize: "clamp(32px,4vw,56px)", letterSpacing: "-0.025em", lineHeight: 1.05, margin: "0 0 20px", fontWeight: 500 }}>Start scheduling for free.</h2>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: "rgba(237,237,237,0.78)", marginBottom: 32, maxWidth: "56ch" }}>
            14-day free trial. No credit card required. Connect your {data.name} account in under a minute and schedule your first post today.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href={registerUrl} style={{ display: "inline-flex", alignItems: "center", fontSize: 14, fontWeight: 600, padding: "14px 24px", borderRadius: 8, background: accent, color: "#fff", textDecoration: "none", border: `1px solid ${accent}` }}>
              Get started free
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
