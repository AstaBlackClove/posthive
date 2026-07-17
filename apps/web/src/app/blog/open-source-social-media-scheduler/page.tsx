import Link from "next/link";
import type { Metadata } from "next";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "https://posthive.co";

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "The Best Open-Source Social Media Schedulers in 2026",
  description: "Tired of paying $50-100/month for a social media scheduler? Here are the best open-source alternatives you can self-host for free — including Posthive, Postiz, and more.",
  datePublished: "2026-07-17",
  author: { "@type": "Person", name: "Guna" },
  publisher: { "@type": "Organization", name: "Posthive", url: WEB_URL },
  url: `${WEB_URL}/blog/open-source-social-media-scheduler`,
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Are there free open-source social media schedulers?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. Posthive and Postiz are both open source and free to self-host. You only pay for your server infrastructure (typically $5-10/month). Both support multiple social platforms including Instagram, LinkedIn, Bluesky, and Mastodon." },
    },
    {
      "@type": "Question",
      name: "What is the best self-hosted social media scheduler?",
      acceptedAnswer: { "@type": "Answer", text: "Posthive is the best self-hosted social media scheduler in 2026 for most use cases. It covers 14 platforms including fediverse platforms (Bluesky, Mastodon, Pixelfed, Nostr, Lemmy), supports bulk CSV scheduling, first comment scheduling, and MCP agent integration. It runs with one Docker Compose command." },
    },
    {
      "@type": "Question",
      name: "Can I schedule Instagram Reels with an open-source tool?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. Posthive supports Instagram Reels, Stories, carousels, and feed posts via the official Instagram Content Publishing API. You need an Instagram Business or Creator account. Self-hosters need to configure their own Meta app credentials." },
    },
    {
      "@type": "Question",
      name: "How hard is it to self-host a social media scheduler?",
      acceptedAnswer: { "@type": "Answer", text: "With Posthive, self-hosting takes about 15 minutes. You need Docker, a Postgres database, and a Redis instance. Copy the .env.example, fill in your API keys, run docker compose up. Full instructions are in the README." },
    },
  ],
};

export const metadata: Metadata = {
  title: "Best Open-Source Social Media Schedulers in 2026 (Self-Hostable) | Posthive",
  description: "Tired of paying $50-100/month for Buffer or Hootsuite? Here are the best open-source social media schedulers you can self-host for free in 2026.",
  keywords: ["open source social media scheduler", "self-hosted social media scheduler", "free social media scheduler open source", "self-hostable social media scheduler", "open source buffer alternative", "open source hootsuite alternative"],
  alternates: { canonical: `${WEB_URL}/blog/open-source-social-media-scheduler` },
  openGraph: {
    title: "Best Open-Source Social Media Schedulers in 2026 | Posthive",
    description: "Self-host your social media scheduler for free. No $50/month subscriptions. Full control over your data.",
    url: `${WEB_URL}/blog/open-source-social-media-scheduler`,
    images: [{ url: "/api/og?layout=post&title=Open-Source+Social+Media+Schedulers&desc=Self-host+for+free+%C2%B7+14+platforms+%C2%B7+AGPL-3.0&badge=Guide&date=July+17%2C+2026", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Best Open-Source Social Media Schedulers in 2026 | Posthive",
    description: "Self-host your social media scheduler for free. No $50/month subscriptions.",
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

export default function OpenSourceSocialMediaSchedulerPage() {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#ededed", fontFamily: "system-ui, sans-serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <BlogNav />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "120px 24px 100px" }}>

        <Link href="/blog" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#555", textDecoration: "none", marginBottom: 40 }}>
          ← All posts
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#5cb88a", background: "rgba(80,180,120,.1)", borderRadius: 6, padding: "3px 9px", letterSpacing: ".04em" }}>Guide</span>
          <span style={{ fontSize: 12, color: "#444" }}>July 17, 2026</span>
          <span style={{ fontSize: 12, color: "#444" }}>· 6 min read</span>
        </div>

        <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, margin: "0 0 24px", color: "#ededed" }}>
          The Best Open-Source Social Media Schedulers in 2026
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
            Buffer starts at $6/month. Hootsuite starts at $99/month. Sprout Social starts at $249/month. For what — scheduling a few posts per week?
          </p>

          <p style={{ marginBottom: 24 }}>
            The open-source alternative exists. You can run a fully capable social media scheduler on your own server for the cost of a VPS — $5-10/month — with no per-seat fees, no vendor lock-in, and full control over your credentials and data.
          </p>

          <p style={{ marginBottom: 24 }}>
            Here are the best open-source social media schedulers in 2026.
          </p>

          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#ededed", margin: "48px 0 16px", letterSpacing: "-0.02em" }}>
            Why self-host a social media scheduler?
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "28px 0" }}>
            {[
              { title: "No subscription fees", desc: "Pay only for your server. $5-10/month vs $50-100/month for a SaaS equivalent." },
              { title: "Your data stays yours", desc: "OAuth tokens and content history live on your infrastructure. No third party holds your social credentials." },
              { title: "Audit the code", desc: "Open source means you can read exactly what the tool does with your accounts. No black boxes." },
              { title: "No platform lock-in", desc: "Fork it, modify it, migrate away at any time. You are never dependent on a vendor's pricing or survival." },
            ].map((item) => (
              <div key={item.title} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "16px 18px" }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#ededed", margin: "0 0 8px" }}>{item.title}</p>
                <p style={{ fontSize: 13, color: "#666", lineHeight: 1.65, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#ededed", margin: "48px 0 16px", letterSpacing: "-0.02em" }}>
            The best open-source social media schedulers in 2026
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 32 }}>
            {[
              {
                rank: "01",
                name: "Posthive",
                license: "AGPL-3.0",
                platforms: "14 platforms",
                tag: "Best overall",
                tagColor: "#5cb88a",
                desc: "The most platform-comprehensive open-source scheduler available. Covers Bluesky, Mastodon, Pixelfed, Nostr, Lemmy (the full fediverse stack) alongside mainstream platforms: Instagram, LinkedIn, YouTube, Facebook, Threads, Pinterest, Telegram, Discord, Tumblr. Built with Next.js + Fastify + BullMQ. Ships with Docker Compose for one-command self-hosting. Includes bulk CSV scheduling, first comment scheduling, per-platform content overrides, drag-to-reschedule calendar, and an MCP server for AI agent integration.",
                link: "https://github.com/AstaBlackClove/posthive",
                selfHosted: "Railway, Hetzner, Fly.io, or any VPS",
              },
              {
                rank: "02",
                name: "Postiz",
                license: "AGPL-3.0",
                platforms: "34+ platforms",
                tag: "Feature-rich",
                tagColor: "#5b63d3",
                desc: "Another well-maintained open-source scheduler with a large platform list. Includes an image editor (Polotno), team collaboration, and analytics. Built with NestJS. More complex to self-host than Posthive. Larger codebase, active community. Good choice if you need team features or the built-in design editor.",
                link: "https://github.com/gitroomhq/postiz-app",
                selfHosted: "Docker, Railway",
              },
              {
                rank: "03",
                name: "Mixpost",
                license: "MIT (self-host) / Paid cloud",
                platforms: "Major platforms",
                tag: "Laravel-based",
                tagColor: "#f0a05a",
                desc: "A Laravel/PHP-based social media scheduler. Good choice if your stack is already PHP. Supports Instagram, Facebook, Twitter, LinkedIn, Pinterest, Mastodon. Has a polished UI. Self-host the open-source version or pay for Mixpost Pro.",
                link: "https://github.com/inovector/mixpost",
                selfHosted: "Any PHP/Laravel host",
              },
            ].map((tool) => (
              <div key={tool.name} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 14, padding: "22px 24px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: "#333", fontFamily: "monospace", marginTop: 3 }}>{tool.rank}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                      <span style={{ fontSize: 17, fontWeight: 700, color: "#ededed" }}>{tool.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: tool.tagColor, background: `${tool.tagColor}18`, borderRadius: 6, padding: "2px 8px" }}>{tool.tag}</span>
                    </div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: "#555" }}>License: {tool.license}</span>
                      <span style={{ fontSize: 12, color: "#555" }}>Platforms: {tool.platforms}</span>
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 14, color: "#666", lineHeight: 1.75, margin: "0 0 12px" }}>{tool.desc}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <a href={tool.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#5b63d3", textDecoration: "none" }}>GitHub →</a>
                  <span style={{ fontSize: 12, color: "#333" }}>·</span>
                  <span style={{ fontSize: 12, color: "#444" }}>Self-host on: {tool.selfHosted}</span>
                </div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#ededed", margin: "48px 0 16px", letterSpacing: "-0.02em" }}>
            How to self-host Posthive in 15 minutes
          </h2>

          <p style={{ marginBottom: 20 }}>You need: Docker, a Postgres database, and a Redis instance. Then:</p>

          <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 10, padding: "20px 22px", fontFamily: "monospace", fontSize: 13, color: "#9ba2ee", marginBottom: 28, overflowX: "auto" }}>
            <p style={{ margin: "0 0 8px", color: "#555" }}># 1. Clone the repo</p>
            <p style={{ margin: "0 0 16px" }}>git clone https://github.com/AstaBlackClove/posthive</p>
            <p style={{ margin: "0 0 8px", color: "#555" }}># 2. Copy env and fill in your values</p>
            <p style={{ margin: "0 0 16px" }}>cp apps/api/.env.example apps/api/.env</p>
            <p style={{ margin: "0 0 8px", color: "#555" }}># 3. Start everything</p>
            <p style={{ margin: 0 }}>docker compose up -d</p>
          </div>

          <p style={{ marginBottom: 24 }}>
            Full self-host documentation including environment variable reference, platform OAuth setup guides, and Railway/Hetzner deployment guides is in the <Link href="/docs" style={{ color: "#5b63d3", textDecoration: "none" }}>Posthive docs</Link>.
          </p>

          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#ededed", margin: "48px 0 16px", letterSpacing: "-0.02em" }}>
            Open-source vs hosted: which should you choose?
          </h2>

          <div style={{ overflowX: "auto", marginBottom: 28 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "10px 14px", borderBottom: "1px solid #1e1e1e", color: "#555", fontWeight: 700, fontSize: 12 }}> </th>
                  <th style={{ textAlign: "center", padding: "10px 14px", borderBottom: "1px solid #1e1e1e", color: "#555", fontWeight: 700, fontSize: 12 }}>Self-hosted</th>
                  <th style={{ textAlign: "center", padding: "10px 14px", borderBottom: "1px solid #1e1e1e", color: "#9ba2ee", fontWeight: 700, fontSize: 12 }}>Posthive Cloud</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Monthly cost", "$5-10 (server only)", "From $9/mo"],
                  ["Setup time", "~15 minutes", "~2 minutes"],
                  ["Maintenance", "You manage updates", "Managed for you"],
                  ["Data control", "100% yours", "Encrypted, on our servers"],
                  ["OAuth setup", "You register your own Meta/Google apps", "Shared app (limits apply)"],
                  ["Best for", "Developers, privacy-first users, teams", "Non-technical users, fast setup"],
                ].map(([feature, selfHost, cloud]) => (
                  <tr key={feature as string} style={{ borderBottom: "1px solid #111" }}>
                    <td style={{ padding: "10px 14px", color: "#aaa", fontSize: 14, fontWeight: 600 }}>{feature as string}</td>
                    <td style={{ textAlign: "center", padding: "10px 14px", color: "#666", fontSize: 13 }}>{selfHost as string}</td>
                    <td style={{ textAlign: "center", padding: "10px 14px", color: "#9ba2ee", fontSize: 13 }}>{cloud as string}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            <p style={{ fontSize: 20, fontWeight: 700, color: "#ededed", margin: "0 0 10px" }}>Try Posthive — self-host or use the cloud</p>
            <p style={{ fontSize: 14, color: "#666", margin: "0 0 24px" }}>14-day free trial on cloud. Fully open source. AGPL-3.0.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/register" style={{ fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 10, background: "#5b63d3", color: "#fff", textDecoration: "none" }}>
                Get started free
              </Link>
              <a href="https://github.com/AstaBlackClove/posthive" target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 10, background: "#111", color: "#888", textDecoration: "none", border: "1px solid #2a2a2a" }}>
                View on GitHub
              </a>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #1e1e1e", marginTop: 48, paddingTop: 36 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#555", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 16 }}>Related reading</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { href: "/blog/hootsuite-alternative", label: "5 best Hootsuite alternatives in 2026" },
                { href: "/blog/buffer-alternative-open-source", label: "The best open-source Buffer alternative in 2026" },
                { href: "/features/self-hostable", label: "How Posthive self-hosting works" },
                { href: "/docs", label: "Self-host documentation and setup guide" },
              ].map(({ href, label }) => (
                <Link key={href} href={href} style={{ fontSize: 14, color: "#5b63d3", textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#333" }}>→</span> {label}
                </Link>
              ))}
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
