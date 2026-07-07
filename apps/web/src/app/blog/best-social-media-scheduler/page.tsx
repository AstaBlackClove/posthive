import Link from "next/link";
import type { Metadata } from "next";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "https://posthive.co";

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "The Best Social Media Scheduler in 2026 (Free and Paid)",
  description: "A no-fluff comparison of the best social media schedulers in 2026. We cover pricing, platform support, key features, and who each tool is actually built for.",
  datePublished: "2026-07-07",
  author: { "@type": "Person", name: "Guna" },
  publisher: { "@type": "Organization", name: "Posthive", url: WEB_URL },
  url: `${WEB_URL}/blog/best-social-media-scheduler`,
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the best free social media scheduler?",
      acceptedAnswer: { "@type": "Answer", text: "Posthive offers the most generous free trial (14 days, all features) and is the only major scheduler that is also open source and self-hostable at zero cost. Buffer has a free plan limited to 3 channels and 10 scheduled posts." },
    },
    {
      "@type": "Question",
      name: "What is the cheapest social media scheduler?",
      acceptedAnswer: { "@type": "Answer", text: "Posthive starts at $9 per month with no per-channel pricing and support for 11 platforms. Buffer charges per channel, making it more expensive as you add accounts. Self-hosted Posthive is free." },
    },
    {
      "@type": "Question",
      name: "Which social media scheduler supports the most platforms?",
      acceptedAnswer: { "@type": "Answer", text: "Posthive supports 11 platforms: Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, Facebook, Pinterest, Telegram, Nostr, and X. Most other schedulers do not support Bluesky, Mastodon, Threads, or Telegram." },
    },
    {
      "@type": "Question",
      name: "Is there an open source social media scheduler?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. Posthive is open source under AGPL-3.0. You can self-host the entire application on your own server, audit the code, and modify it freely. Most social media schedulers are proprietary SaaS tools." },
    },
    {
      "@type": "Question",
      name: "Can I schedule posts to Bluesky and Mastodon?",
      acceptedAnswer: { "@type": "Answer", text: "Most schedulers do not support Bluesky or Mastodon. Posthive supports both natively. Connect your Bluesky account with an app password and your Mastodon account via OAuth on any instance." },
    },
  ],
};

export const metadata: Metadata = {
  title: "The Best Social Media Scheduler in 2026 (Free and Paid) | Posthive",
  description: "A no-fluff comparison of the best social media schedulers in 2026. Pricing, platform support, key features, and who each tool is built for.",
  keywords: ["best social media scheduler", "best free social media scheduler", "social media scheduler comparison", "cheapest social media scheduler", "top social media scheduling tools"],
  alternates: { canonical: `${WEB_URL}/blog/best-social-media-scheduler` },
  openGraph: {
    title: "The Best Social Media Scheduler in 2026 | Posthive",
    description: "A no-fluff comparison of the best social media schedulers. Pricing, platform support, and who each tool is actually built for.",
    url: `${WEB_URL}/blog/best-social-media-scheduler`,
    images: [{ url: "/api/og?layout=post&title=Best+Social+Media+Scheduler+2026&desc=Free+and+paid+options+compared&badge=Comparison", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Best Social Media Scheduler in 2026 | Posthive",
    description: "A no-fluff comparison of the best social media schedulers. Pricing, platform support, and who each tool is actually built for.",
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
        <Link href="/register" style={{ fontSize: 14, fontWeight: 600, padding: "8px 16px", borderRadius: 8, background: "#5b63d3", color: "#fff", textDecoration: "none" }}>Get started</Link>
      </div>
    </nav>
  );
}

function ToolCard({ name, badge, badgeColor, badgeBg, starting, bestFor, platforms, pros, cons }: {
  name: string; badge: string; badgeColor: string; badgeBg: string;
  starting: string; bestFor: string; platforms: string; pros: string[]; cons: string[];
}) {
  return (
    <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, padding: "24px 26px", marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#ededed", margin: 0 }}>{name}</h3>
        <span style={{ fontSize: 11, fontWeight: 700, color: badgeColor, background: badgeBg, borderRadius: 6, padding: "3px 10px", letterSpacing: ".04em" }}>{badge}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Starting price", value: starting },
          { label: "Best for", value: bestFor },
          { label: "Platforms", value: platforms },
        ].map((item) => (
          <div key={item.label} style={{ background: "#0d0d0d", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#444", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 13, color: "#aaa", fontWeight: 600 }}>{item.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#4ade80", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>Strengths</div>
          {pros.map((p) => (
            <div key={p} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <span style={{ color: "#4ade80", flexShrink: 0, fontSize: 13 }}>+</span>
              <span style={{ fontSize: 13, color: "#666", lineHeight: 1.5 }}>{p}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#e86b6b", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>Limitations</div>
          {cons.map((c) => (
            <div key={c} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <span style={{ color: "#e86b6b", flexShrink: 0, fontSize: 13 }}>-</span>
              <span style={{ fontSize: 13, color: "#666", lineHeight: 1.5 }}>{c}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BestSocialMediaSchedulerPage() {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#ededed", fontFamily: "system-ui, sans-serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <BlogNav />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "120px 24px 100px" }}>

        <Link href="/blog" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#555", textDecoration: "none", marginBottom: 40 }}>
          All posts
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#5cb88a", background: "rgba(80,180,120,.1)", borderRadius: 6, padding: "3px 9px", letterSpacing: ".04em" }}>Comparison</span>
          <span style={{ fontSize: 12, color: "#444" }}>July 7, 2026</span>
          <span style={{ fontSize: 12, color: "#444" }}>· 10 min read</span>
        </div>

        <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, margin: "0 0 24px", color: "#ededed" }}>
          The Best Social Media Scheduler in 2026 (Free and Paid)
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0", borderTop: "1px solid #1e1e1e", borderBottom: "1px solid #1e1e1e", marginBottom: 40 }}>
          <img src="/founder.png" alt="Founder" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#ededed" }}>Guna</div>
            <div style={{ fontSize: 12, color: "#555" }}>Founder, Posthive</div>
          </div>
        </div>

        <div style={{ fontSize: 16, lineHeight: 1.85, color: "#888" }}>

          <p style={{ marginBottom: 24 }}>
            The social media scheduling market has changed significantly in the past two years. Bluesky has grown to over 30 million users. Threads crossed 300 million. Mastodon and the fediverse are no longer niche. Yet most of the schedulers people recommend were built when Twitter, Instagram, and Facebook were the only platforms that mattered.
          </p>

          <p style={{ marginBottom: 24 }}>
            This guide covers the best social media schedulers in 2026 with honest assessments of pricing, platform support, and which type of creator or team each tool is actually built for. No affiliate links. No paid placements.
          </p>

          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "16px 20px", marginBottom: 36 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#ededed", margin: "0 0 10px" }}>Tools covered in this guide</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["Posthive", "Buffer", "Hootsuite", "Later", "Metricool", "Publer"].map((t) => (
                <span key={t} style={{ fontSize: 12, color: "#888", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, padding: "3px 10px" }}>{t}</span>
              ))}
            </div>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#ededed", margin: "48px 0 16px", letterSpacing: "-0.02em" }}>
            What to look for in a social media scheduler
          </h2>

          <p style={{ marginBottom: 20 }}>
            Before comparing tools, it helps to know what actually matters. Here are the criteria we used:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
            {[
              { label: "Platform coverage", desc: "Does it support the platforms you actually use? Pay close attention to Bluesky, Threads, and Mastodon." },
              { label: "Pricing model", desc: "Per-channel pricing gets expensive fast. Flat pricing is more predictable. Self-hosted options exist." },
              { label: "Scheduling features", desc: "Bulk scheduling, drag-to-reschedule calendars, and first comment support separate basic tools from advanced ones." },
              { label: "Content type support", desc: "Can it schedule Instagram Reels, Stories, carousels, and YouTube Shorts? Not all schedulers go beyond basic posts." },
              { label: "Data ownership", desc: "Your OAuth tokens give these tools access to all your social accounts. Open source and self-hosted options let you keep that data on your own server." },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: "1px solid #111" }}>
                <span style={{ color: "#5b63d3", flexShrink: 0, marginTop: 2, fontWeight: 700, fontSize: 14 }}>+</span>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#ededed" }}>{item.label}: </span>
                  <span style={{ fontSize: 14, color: "#666" }}>{item.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#ededed", margin: "48px 0 20px", letterSpacing: "-0.02em" }}>
            The best social media schedulers in 2026
          </h2>

          <ToolCard
            name="Posthive"
            badge="Best for multi-platform"
            badgeColor="#9ba2ee"
            badgeBg="rgba(91,99,211,.15)"
            starting="$9/month (hosted) or free (self-hosted)"
            bestFor="Indie hackers, creators, developers"
            platforms="11 platforms"
            pros={[
              "Supports Bluesky, Threads, Mastodon, Telegram, Nostr",
              "Open source (AGPL-3.0) and fully self-hostable",
              "Flat pricing with no per-channel fees",
              "Bulk CSV scheduling, first comment, drag-to-reschedule calendar",
              "Instagram Reels, Stories, and carousel support",
            ]}
            cons={[
              "No mobile app yet",
              "No built-in analytics dashboard",
              "Smaller team than established players",
            ]}
          />

          <ToolCard
            name="Buffer"
            badge="Best for simplicity"
            badgeColor="#5cb88a"
            badgeBg="rgba(80,180,120,.15)"
            starting="Free (3 channels, 10 posts) or $6/channel/month"
            bestFor="Beginners and small teams"
            platforms="7 platforms (no Bluesky, Mastodon, Threads)"
            pros={[
              "Clean, beginner-friendly interface",
              "Free plan available",
              "Good mobile app",
              "Start Page link-in-bio tool included",
            ]}
            cons={[
              "Per-channel pricing adds up with multiple accounts",
              "No Bluesky, Mastodon, Threads, or Telegram support",
              "Limited bulk scheduling on lower plans",
              "No self-hosting option",
            ]}
          />

          <ToolCard
            name="Hootsuite"
            badge="Best for enterprise"
            badgeColor="#d4a83c"
            badgeBg="rgba(212,168,60,.15)"
            starting="$99/month (1 user, 10 accounts)"
            bestFor="Large marketing teams"
            platforms="8 platforms (no Bluesky, Mastodon, Threads)"
            pros={[
              "Deep analytics and reporting",
              "Team collaboration and approval workflows",
              "Social listening features",
              "Long-established with large integration ecosystem",
            ]}
            cons={[
              "Very expensive for individuals and small teams",
              "No Bluesky, Mastodon, or Threads support",
              "Cluttered interface",
              "Bulk scheduling locked to higher tiers",
            ]}
          />

          <ToolCard
            name="Later"
            badge="Best for visual planning"
            badgeColor="#e86b6b"
            badgeBg="rgba(232,107,107,.15)"
            starting="$16.67/month"
            bestFor="Instagram-first creators"
            platforms="6 platforms (Instagram-focused)"
            pros={[
              "Visual content calendar with drag-and-drop",
              "Strong Instagram Reels and Stories support",
              "Link in bio tool (Linktree-style)",
              "Good media library management",
            ]}
            cons={[
              "Primarily Instagram-focused",
              "No Bluesky, Mastodon, Threads, or Telegram",
              "Higher price point for full feature access",
              "Limited bulk scheduling",
            ]}
          />

          <ToolCard
            name="Metricool"
            badge="Best for analytics"
            badgeColor="#3db8c8"
            badgeBg="rgba(61,184,200,.15)"
            starting="Free (limited) or $22/month"
            bestFor="Agencies and data-driven teams"
            platforms="10+ platforms"
            pros={[
              "Strong analytics and competitor analysis",
              "Supports X (Twitter), TikTok, and Google Business",
              "Good value at mid-tier",
              "Auto-publishing with best-time recommendations",
            ]}
            cons={[
              "No Bluesky or Mastodon support",
              "Interface can feel crowded",
              "Higher learning curve than Buffer",
            ]}
          />

          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#ededed", margin: "48px 0 16px", letterSpacing: "-0.02em" }}>
            Platform support comparison
          </h2>

          <div style={{ overflowX: "auto", marginBottom: 32 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #1e1e1e", color: "#555", fontWeight: 700, fontSize: 11 }}>Platform</th>
                  {["Posthive", "Buffer", "Hootsuite", "Later", "Metricool"].map((t) => (
                    <th key={t} style={{ textAlign: "center", padding: "10px 12px", borderBottom: "1px solid #1e1e1e", color: t === "Posthive" ? "#9ba2ee" : "#555", fontWeight: 700, fontSize: 11 }}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Instagram", true, true, true, true, true],
                  ["Facebook", true, true, true, false, true],
                  ["LinkedIn", true, true, true, false, true],
                  ["X (Twitter)", true, true, true, false, true],
                  ["Pinterest", true, true, false, true, true],
                  ["YouTube", true, true, true, false, true],
                  ["Bluesky", true, false, false, false, false],
                  ["Threads", true, false, false, false, false],
                  ["Mastodon", true, false, false, false, false],
                  ["Telegram", true, false, false, false, false],
                  ["TikTok", false, true, true, true, true],
                ].map(([platform, ...support]) => (
                  <tr key={platform as string} style={{ borderBottom: "1px solid #111" }}>
                    <td style={{ padding: "9px 12px", color: "#aaa", fontSize: 13 }}>{platform as string}</td>
                    {(support as boolean[]).map((s, i) => (
                      <td key={i} style={{ textAlign: "center", padding: "9px 12px", fontSize: 14, color: s ? (i === 0 ? "#9ba2ee" : "#4ade80") : "#2a2a2a" }}>
                        {s ? "✓" : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#ededed", margin: "48px 0 16px", letterSpacing: "-0.02em" }}>
            Pricing comparison
          </h2>

          <div style={{ overflowX: "auto", marginBottom: 32 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "10px 14px", borderBottom: "1px solid #1e1e1e", color: "#555", fontWeight: 700, fontSize: 11 }}>Tool</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", borderBottom: "1px solid #1e1e1e", color: "#555", fontWeight: 700, fontSize: 11 }}>Entry price</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", borderBottom: "1px solid #1e1e1e", color: "#555", fontWeight: 700, fontSize: 11 }}>Pricing model</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", borderBottom: "1px solid #1e1e1e", color: "#555", fontWeight: 700, fontSize: 11 }}>Free option</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Posthive", "$9/month", "Flat rate", "14-day trial + self-host free"],
                  ["Buffer", "$6/channel/month", "Per channel", "Free (3 channels, 10 posts)"],
                  ["Hootsuite", "$99/month", "Per user + channels", "30-day trial only"],
                  ["Later", "$16.67/month", "Per user", "Free (1 profile per platform)"],
                  ["Metricool", "$22/month", "Per brand", "Free (limited)"],
                ].map(([tool, price, model, free]) => (
                  <tr key={tool as string} style={{ borderBottom: "1px solid #111" }}>
                    <td style={{ padding: "10px 14px", color: tool === "Posthive" ? "#9ba2ee" : "#ededed", fontWeight: tool === "Posthive" ? 700 : 400, fontSize: 13 }}>{tool as string}</td>
                    <td style={{ padding: "10px 14px", color: "#aaa", fontSize: 13 }}>{price as string}</td>
                    <td style={{ padding: "10px 14px", color: "#666", fontSize: 13 }}>{model as string}</td>
                    <td style={{ padding: "10px 14px", color: "#666", fontSize: 13 }}>{free as string}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#ededed", margin: "48px 0 16px", letterSpacing: "-0.02em" }}>
            Which scheduler should you choose?
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
            {[
              { who: "You post to Bluesky, Mastodon, or Threads", pick: "Posthive", reason: "The only major scheduler that supports all three." },
              { who: "You are just getting started and want simple", pick: "Buffer", reason: "Clean interface, free plan, and easy to learn." },
              { who: "You run a large agency or marketing team", pick: "Hootsuite", reason: "Deep analytics, team workflows, and approval tools." },
              { who: "You are an Instagram-first creator", pick: "Later", reason: "Best visual planning experience for Instagram-heavy workflows." },
              { who: "You care about data ownership", pick: "Posthive (self-hosted)", reason: "Open source, runs on your server, zero vendor lock-in." },
              { who: "You need TikTok scheduling", pick: "Buffer or Metricool", reason: "Posthive does not support TikTok yet. Both Buffer and Metricool do." },
            ].map((item) => (
              <div key={item.who} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "16px 20px" }}>
                <p style={{ fontSize: 13, color: "#555", margin: "0 0 4px" }}>If...</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#ededed", margin: "0 0 8px" }}>{item.who}</p>
                <p style={{ fontSize: 13, color: "#9ba2ee", fontWeight: 700, margin: "0 0 4px" }}>Pick: {item.pick}</p>
                <p style={{ fontSize: 13, color: "#555", margin: 0 }}>{item.reason}</p>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#ededed", margin: "48px 0 16px", letterSpacing: "-0.02em" }}>
            Frequently asked questions
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 32 }}>
            {faqSchema.mainEntity.map((item) => (
              <div key={item.name} style={{ borderBottom: "1px solid #1a1a1a", padding: "22px 0" }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#ededed", margin: "0 0 10px" }}>{item.name}</p>
                <p style={{ fontSize: 14, color: "#666", lineHeight: 1.75, margin: 0 }}>{item.acceptedAnswer.text}</p>
              </div>
            ))}
          </div>

          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, padding: "32px 28px", textAlign: "center", marginTop: 48 }}>
            <p style={{ fontSize: 20, fontWeight: 700, color: "#ededed", margin: "0 0 10px" }}>Try Posthive free for 14 days</p>
            <p style={{ fontSize: 14, color: "#666", margin: "0 0 24px" }}>11 platforms, flat pricing, no credit card required.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/register" style={{ fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 10, background: "#5b63d3", color: "#fff", textDecoration: "none" }}>
                Get started free
              </Link>
              <Link href="/pricing" style={{ fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 10, background: "#111", color: "#888", textDecoration: "none", border: "1px solid #2a2a2a" }}>
                View pricing
              </Link>
            </div>
          </div>

        </div>
      </div>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,.06)", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
          {([["Privacy", "/privacy"], ["Terms", "/terms"], ["Docs", "/docs"], ["Pricing", "/pricing"], ["Blog", "/blog"]] as [string, string][]).map(([label, href]) => (
            <Link key={label} href={href} style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>{label}</Link>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "#444" }}>© {new Date().getFullYear()} Posthive · AGPL-3.0</p>
      </footer>
    </div>
  );
}
