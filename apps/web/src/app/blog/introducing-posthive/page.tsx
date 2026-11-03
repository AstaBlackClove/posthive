import Link from "next/link";
import type { Metadata } from "next";
import { BlogCtaBanner } from "../../../components/BlogCtaBanner";
import { BlogPostHeader } from "../../../components/BlogPostHeader";
import { SiteNav } from "../../../components/SiteNav";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "https://posthive.co";

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Introducing Posthive: Schedule Posts to multiple platforms at Once",
  description: "We built Posthive because we were tired of switching between tabs just to post the same update everywhere. Here's what we shipped.",
  datePublished: "2026-07-03",
  dateModified: "2026-08-01",
  image: `${WEB_URL}/og/landingogimage.jpg`,
  author: { "@type": "Person", name: "Guna", url: "https://x.com/gunaa_dev" },
  publisher: { "@type": "Organization", name: "Posthive", url: WEB_URL },
  url: `${WEB_URL}/blog/introducing-posthive`,
};

export const metadata: Metadata = {
  title: "Introducing Posthive: Multi-Platform Social Scheduler | Posthive",
  description:
    "We built Posthive because we were tired of switching between tabs just to post the same update everywhere. Here's what we shipped.",
  alternates: { canonical: `${WEB_URL}/blog/introducing-posthive` },
  openGraph: {
    title: "Introducing Posthive: Schedule Posts to multiple platforms at Once",
    description:
      "We built Posthive because we were tired of switching between tabs just to post the same update everywhere. Here's what we shipped.",
    images: [
      {
        url: "/api/og?layout=post&title=Introducing%20Posthive&desc=Schedule%20posts%20to%20Bluesky%2C%20Threads%2C%20Instagram%2C%20LinkedIn%2C%20Mastodon%2C%20YouTube%20and%20Facebook%20from%20one%20place.&badge=Blog",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Introducing Posthive: Schedule Posts to multiple platforms at Once",
    description:
      "We built Posthive because we were tired of switching between tabs just to post the same update everywhere.",
  },
};

export default function PostPage() {
  return (
    <div className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <SiteNav />

      <div className="mx-auto max-w-170 px-6 pt-14 pb-24">

        <BlogPostHeader
          category="Product"
          date="July 3, 2026"
          readTime="5 min read"
          title="Introducing Posthive: Schedule posts to multiple platforms at once"
        />

        {/* Content */}
        <BlogCtaBanner />

        <div className="article-body">

          <p>
            I was managing five social accounts across Bluesky, Threads, Instagram, LinkedIn, and Mastodon. Every morning I'd write the same post, tab-switch five times, paste it in each composer, tweak the character count, and finally hit publish — one by one. It was boring, error-prone, and ate 20 minutes of my morning.
          </p>

          <p>
            So I built <strong>Posthive</strong>.
          </p>

          <h2>
            What Posthive does
          </h2>

          <p>
            Posthive is a single composer where you write once and schedule to all eleven platforms:{" "}
            <Link href="/platforms/bluesky">Bluesky</Link>,{" "}
            <Link href="/platforms/threads">Threads</Link>,{" "}
            <Link href="/platforms/instagram">Instagram</Link>,{" "}
            <Link href="/platforms/linkedin">LinkedIn</Link>,{" "}
            <Link href="/platforms/mastodon">Mastodon</Link>,{" "}
            <Link href="/platforms/youtube">YouTube</Link>,{" "}
            <Link href="/platforms/facebook">Facebook Pages</Link>,{" "}
            <Link href="/platforms/pinterest">Pinterest</Link>,{" "}
            <Link href="/platforms/telegram">Telegram</Link>,{" "}
            <Link href="/platforms/nostr">Nostr</Link>, and{" "}
            <Link href="/platforms/twitter">X</Link>. Pick a time, hit Schedule — done. The post goes out at the exact second you chose, handled by a BullMQ job queue that retries automatically if a platform hiccups.
          </p>

          <h2>
            The features that shipped at launch
          </h2>

          <p>Here's what's live today:</p>

          <ul className="list-none">
            {[
              "Multi-platform scheduling — Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, Facebook Pages",
              "Instagram Reels, Stories, and carousels (up to 10 images)",
              "YouTube Shorts and regular videos with dedicated title/description fields",
              "Drag-to-reschedule calendar — see your whole content week, drag posts to new slots",
              "First comment automation — fire a reply the moment your post goes live",
              "Per-platform overrides — different text per network without creating separate posts",
              "Post templates — save formats you use repeatedly, load them in one click",
              "Bulk CSV scheduling — upload a spreadsheet, schedule hundreds of posts at once",
              "Full REST API — schedule posts programmatically from agents or scripts",
              "Self-hostable — AGPL-3.0, run your own instance with Docker + Postgres + Redis",
            ].map(f => (
              <li key={f}>
                <span className="mr-2.5 text-green-700">✓</span>{f}
              </li>
            ))}
          </ul>

          <h2>
            Bulk CSV — the hidden power feature
          </h2>

          <p>
            My favourite thing we built is bulk CSV scheduling. Create a spreadsheet with columns for date, text, platforms, optional first comment, and image URLs — then upload it. Posthive validates every row instantly and shows a preview table before scheduling anything. Bad date? Shows an error. Instagram row missing an image? Caught. You can even write <code>!instagram</code> in the accounts column to exclude a platform for that row without affecting others.
          </p>

          <p>
            For social media managers running campaigns across multiple clients, this alone saves hours per week.
          </p>

          <h2>
            What's coming next
          </h2>

          <p>
            The backlog is full. Recurring posts, AI caption assist, post analytics, outbound webhooks, and multi-user team workspaces are all queued up. We're shipping fast — follow along on Bluesky or check the docs for what's live.
          </p>

          <h2>
            Try it
          </h2>

          <p>
            Posthive has a 14-day free trial If you're a developer or want to self-host, the repo is public on GitHub.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link href="/register" className="btn-primary px-6 py-3">
              Start free trial
            </Link>
            <a href="https://github.com/AstaBlackClove/posthive" target="_blank" rel="noreferrer" className="btn-secondary px-6 py-3">
              View on GitHub
            </a>
          </div>
        </div>

        {/* Related reading */}
        <div className="mt-12 border-t border-border pt-9">
          <p className="section-label mb-4">Related reading</p>
          <div className="flex flex-col gap-3">
            {[
              { href: "/blog/how-to-schedule-instagram-reels", label: "How to schedule Instagram Reels in 2026 (step-by-step)" },
              { href: "/blog/best-social-media-scheduler", label: "The best social media schedulers in 2026 compared" },
              { href: "/blog/buffer-alternative-open-source", label: "The best open-source Buffer alternative" },
              { href: "/blog/hootsuite-alternative", label: "Hootsuite alternatives: cheaper, open source, more platforms" },
              { href: "/platforms/instagram", label: "Schedule Instagram Reels, Stories, and carousels with Posthive" },
              { href: "/platforms/bluesky", label: "Schedule Bluesky posts without the tab-switching" },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="flex items-center gap-2 type-body-r-s text-brand-800 transition-colors hover:text-brand-900">
                <span className="text-neutral-400">→</span> {label}
              </Link>
            ))}
          </div>
          <div className="mt-8">
            <Link href="/blog" className="type-body-r-s text-muted transition-colors hover:text-fg">← Back to all posts</Link>
          </div>
        </div>
      </div>

      <footer className="border-t border-border px-6 py-10 text-center">
        <div className="mb-4 flex flex-wrap justify-center gap-6">
          {([["Privacy", "/privacy"], ["Terms", "/terms"], ["Docs", "/docs"], ["Pricing", "/pricing"], ["Blog", "/blog"]] as [string, string][]).map(([label, href]) => (
            <Link key={label} href={href} className="type-body-r-s text-muted transition-colors hover:text-fg">{label}</Link>
          ))}
        </div>
        <p className="type-body-r-xs text-muted">© {new Date().getFullYear()} Posthive · AGPL-3.0</p>
      </footer>
    </div>
  );
}
