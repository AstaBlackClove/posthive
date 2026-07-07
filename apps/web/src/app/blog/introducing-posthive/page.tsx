import Link from "next/link";
import type { Metadata } from "next";

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Introducing Posthive Schedule posts to 11 platforms at once",
  description: "We built Posthive because we were tired of switching between tabs just to post the same update everywhere. Here's what we shipped.",
  datePublished: "2026-07-03",
  author: { "@type": "Person", name: "Guna" },
  publisher: { "@type": "Organization", name: "Posthive", url: "https://posthive.co" },
  url: "https://posthive.co/blog/introducing-posthive",
};

export const metadata: Metadata = {
  title: "Introducing Posthive Schedule posts to 11 platforms at once",
  description:
    "We built Posthive because we were tired of switching between tabs just to post the same update everywhere. Here's what we shipped.",
  openGraph: {
    title: "Introducing Posthive Schedule posts to 11 platforms at once",
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
    title: "Introducing Posthive Schedule posts to 11 platforms at once",
    description:
      "We built Posthive because we were tired of switching between tabs just to post the same update everywhere.",
  },
};

function BlogNav() {
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      height: 64, background: "#0a0a0a", borderBottom: "1px solid #1a1a1a",
      display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px",
    }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
        <img src="/posthivemain.png" alt="Posthive" style={{ height: 28 }} />
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <Link href="/blog" style={{ fontSize: 14, color: "#888", textDecoration: "none" }}>Blog</Link>
        <Link href="/pricing" style={{ fontSize: 14, color: "#888", textDecoration: "none" }}>Pricing</Link>
        <Link href="/docs" style={{ fontSize: 14, color: "#888", textDecoration: "none" }}>Docs</Link>
        <Link href="/register" style={{
          fontSize: 14, fontWeight: 600, padding: "8px 16px", borderRadius: 8,
          background: "#5b63d3", color: "#fff", textDecoration: "none",
        }}>Get started</Link>
      </div>
    </nav>
  );
}

export default function PostPage() {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#ededed", fontFamily: "system-ui, sans-serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <BlogNav />

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "120px 24px 100px" }}>

        {/* Back */}
        <Link href="/blog" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#555", textDecoration: "none", marginBottom: 40 }}>
          ← All posts
        </Link>

        {/* Meta */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: "#9ba2ee",
            background: "rgba(91,99,211,.1)", borderRadius: 6, padding: "3px 9px", letterSpacing: ".04em",
          }}>
            Product
          </span>
          <span style={{ fontSize: 12, color: "#444" }}>July 3, 2026</span>
          <span style={{ fontSize: 12, color: "#444" }}>· 5 min read</span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, margin: "0 0 24px", color: "#ededed" }}>
          Introducing Posthive Schedule posts to 11 platforms at once
        </h1>

        {/* Author */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0", borderTop: "1px solid #1e1e1e", borderBottom: "1px solid #1e1e1e", marginBottom: 40 }}>
          <img src="/founder.png" alt="Founder" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#ededed" }}>Guna</div>
            <div style={{ fontSize: 12, color: "#555" }}>Founder, Posthive</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ fontSize: 16, lineHeight: 1.85, color: "#888" }}>

          <p style={{ marginBottom: 24 }}>
            I was managing five social accounts across Bluesky, Threads, Instagram, LinkedIn, and Mastodon. Every morning I'd write the same post, tab-switch five times, paste it in each composer, tweak the character count, and finally hit publish — one by one. It was boring, error-prone, and ate 20 minutes of my morning.
          </p>

          <p style={{ marginBottom: 24 }}>
            So I built <strong style={{ color: "#ededed" }}>Posthive</strong>.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#ededed", margin: "40px 0 14px", letterSpacing: "-0.01em" }}>
            What Posthive does
          </h2>

          <p style={{ marginBottom: 24 }}>
            Posthive is a single composer where you write once and schedule to all seven major platforms: <strong style={{ color: "#cfcfcf" }}>Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, and Facebook Pages</strong>. Pick a time, hit Schedule — done. The post goes out at the exact second you chose, handled by a BullMQ job queue that retries automatically if a platform hiccups.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#ededed", margin: "40px 0 14px", letterSpacing: "-0.01em" }}>
            The features that shipped at launch
          </h2>

          <p style={{ marginBottom: 16 }}>Here's what's live today:</p>

          <ul style={{ paddingLeft: 20, marginBottom: 24, display: "flex", flexDirection: "column", gap: 10 }}>
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
              <li key={f} style={{ color: "#888", fontSize: 15 }}>
                <span style={{ color: "#4ade80", marginRight: 10 }}>✓</span>{f}
              </li>
            ))}
          </ul>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#ededed", margin: "40px 0 14px", letterSpacing: "-0.01em" }}>
            Bulk CSV — the hidden power feature
          </h2>

          <p style={{ marginBottom: 24 }}>
            My favourite thing we built is bulk CSV scheduling. Create a spreadsheet with columns for date, text, platforms, optional first comment, and image URLs — then upload it. Posthive validates every row instantly and shows a preview table before scheduling anything. Bad date? Shows an error. Instagram row missing an image? Caught. You can even write <code style={{ fontFamily: "monospace", fontSize: 14, color: "#9ba2ee", background: "#111", padding: "1px 5px", borderRadius: 4 }}>!instagram</code> in the accounts column to exclude a platform for that row without affecting others.
          </p>

          <p style={{ marginBottom: 24 }}>
            For social media managers running campaigns across multiple clients, this alone saves hours per week.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#ededed", margin: "40px 0 14px", letterSpacing: "-0.01em" }}>
            What's coming next
          </h2>

          <p style={{ marginBottom: 24 }}>
            The backlog is full. Recurring posts, AI caption assist, post analytics, outbound webhooks, and multi-user team workspaces are all queued up. We're shipping fast — follow along on Bluesky or check the docs for what's live.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#ededed", margin: "40px 0 14px", letterSpacing: "-0.01em" }}>
            Try it
          </h2>

          <p style={{ marginBottom: 32 }}>
            Posthive has a 14-day free trial If you're a developer or want to self-host, the repo is public on GitHub.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/register" style={{
              background: "#fff", color: "#0a0a0a", padding: "11px 24px",
              borderRadius: 9, fontSize: 14, fontWeight: 700, textDecoration: "none",
            }}>
              Start free trial
            </Link>
            <a href="https://github.com/AstaBlackClove/posthive" target="_blank" rel="noreferrer" style={{
              background: "transparent", color: "#888", padding: "11px 24px",
              borderRadius: 9, fontSize: 14, fontWeight: 600, textDecoration: "none",
              border: "1px solid #2a2a2a",
            }}>
              View on GitHub
            </a>
          </div>
        </div>

        {/* Footer nav */}
        <div style={{ borderTop: "1px solid #1e1e1e", marginTop: 64, paddingTop: 32 }}>
          <Link href="/blog" style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>← Back to all posts</Link>
        </div>
      </div>
    </div>
  );
}
