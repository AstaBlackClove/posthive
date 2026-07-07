import Link from "next/link";
import type { Metadata } from "next";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "https://posthive.co";

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "The Best Open-Source Buffer Alternative in 2026",
  description: "Looking for a Buffer alternative that's open source, self-hostable, and supports more platforms? Posthive does everything Buffer does — and more — for less.",
  datePublished: "2026-07-07",
  author: { "@type": "Person", name: "Guna" },
  publisher: { "@type": "Organization", name: "Posthive", url: WEB_URL },
  url: `${WEB_URL}/blog/buffer-alternative-open-source`,
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is there a free open-source alternative to Buffer?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. Posthive is a free, open-source Buffer alternative licensed under AGPL-3.0. You can self-host it at zero cost — you only pay for your own hosting infrastructure." },
    },
    {
      "@type": "Question",
      name: "What platforms does Posthive support compared to Buffer?",
      acceptedAnswer: { "@type": "Answer", text: "Posthive supports 11 platforms: Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, Facebook Pages, Pinterest, Telegram, Nostr, and X. Buffer supports fewer platforms and does not support Bluesky, Mastodon, Threads, or Telegram." },
    },
    {
      "@type": "Question",
      name: "Can I self-host Posthive?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. Posthive is fully self-hostable. Clone the repo, fill in your .env, run pnpm db:migrate, and deploy. It runs on Railway, Fly.io, Render, or any VPS." },
    },
    {
      "@type": "Question",
      name: "How much does Posthive cost compared to Buffer?",
      acceptedAnswer: { "@type": "Answer", text: "Posthive's hosted plans start at ₹550/month. Buffer's Essentials plan starts at $6/month per channel — costs scale quickly with multiple accounts. Self-hosted Posthive is free." },
    },
  ],
};

export const metadata: Metadata = {
  title: "The Best Open-Source Buffer Alternative in 2026 | Posthive",
  description: "Looking for a Buffer alternative that's open source, self-hostable, and supports more platforms? Posthive does everything Buffer does — and more — for less.",
  keywords: ["Buffer alternative", "open source Buffer alternative", "self-hosted social media scheduler", "free Buffer alternative", "Buffer vs Posthive"],
  alternates: { canonical: `${WEB_URL}/blog/buffer-alternative-open-source` },
  openGraph: {
    title: "The Best Open-Source Buffer Alternative in 2026 | Posthive",
    description: "Open source, self-hostable, 11 platforms. Posthive is the Buffer alternative built for developers and indie hackers.",
    url: `${WEB_URL}/blog/buffer-alternative-open-source`,
    images: [{ url: "/api/og?layout=post&title=The+Best+Open-Source+Buffer+Alternative&desc=Self-hostable+%C2%B7+11+platforms+%C2%B7+AGPL-3.0&badge=Comparison", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Best Open-Source Buffer Alternative in 2026 | Posthive",
    description: "Open source, self-hostable, 11 platforms. Posthive is the Buffer alternative built for developers and indie hackers.",
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

export default function BufferAlternativePage() {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#ededed", fontFamily: "system-ui, sans-serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <BlogNav />

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "120px 24px 100px" }}>

        <Link href="/blog" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#555", textDecoration: "none", marginBottom: 40 }}>
          ← All posts
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#5cb88a", background: "rgba(80,180,120,.1)", borderRadius: 6, padding: "3px 9px", letterSpacing: ".04em" }}>
            Comparison
          </span>
          <span style={{ fontSize: 12, color: "#444" }}>July 7, 2026</span>
          <span style={{ fontSize: 12, color: "#444" }}>· 7 min read</span>
        </div>

        <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, margin: "0 0 24px", color: "#ededed" }}>
          The Best Open-Source Buffer Alternative in 2026
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
            Buffer is good. It was one of the first tools to make social media scheduling approachable, and it still works fine for basic use cases. But if you&apos;re a developer, an indie hacker, or someone who cares about where your OAuth credentials live — Buffer has a ceiling. It&apos;s a closed, per-channel SaaS that gets expensive fast and doesn&apos;t support Bluesky, Mastodon, or Threads.
          </p>

          <p style={{ marginBottom: 24 }}>
            That&apos;s why we built <strong style={{ color: "#ededed" }}>Posthive</strong> — an open-source, self-hostable social media scheduler that covers more platforms, costs less, and gives you full control over your data.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#ededed", margin: "40px 0 14px", letterSpacing: "-0.01em" }}>
            Buffer vs Posthive: platform coverage
          </h2>

          <p style={{ marginBottom: 20 }}>
            This is where the gap is most obvious. Buffer supports Instagram, Facebook, X, LinkedIn, Pinterest, TikTok, and YouTube — a solid list, but missing the newer networks entirely.
          </p>

          {/* Comparison table */}
          <div style={{ overflowX: "auto", marginBottom: 32 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "10px 14px", borderBottom: "1px solid #1e1e1e", color: "#555", fontWeight: 700, fontSize: 12 }}>Platform</th>
                  <th style={{ textAlign: "center", padding: "10px 14px", borderBottom: "1px solid #1e1e1e", color: "#555", fontWeight: 700, fontSize: 12 }}>Buffer</th>
                  <th style={{ textAlign: "center", padding: "10px 14px", borderBottom: "1px solid #1e1e1e", color: "#9ba2ee", fontWeight: 700, fontSize: 12 }}>Posthive</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Instagram", true, true],
                  ["Facebook Pages", true, true],
                  ["LinkedIn", true, true],
                  ["X (Twitter)", true, true],
                  ["Pinterest", true, true],
                  ["YouTube", true, true],
                  ["Bluesky", false, true],
                  ["Threads", false, true],
                  ["Mastodon", false, true],
                  ["Telegram", false, true],
                  ["Nostr", false, true],
                ].map(([platform, buffer, posthive]) => (
                  <tr key={platform as string} style={{ borderBottom: "1px solid #111" }}>
                    <td style={{ padding: "10px 14px", color: "#aaa", fontSize: 14 }}>{platform as string}</td>
                    <td style={{ textAlign: "center", padding: "10px 14px", fontSize: 16 }}>{buffer ? "✓" : <span style={{ color: "#3a3a3a" }}>—</span>}</td>
                    <td style={{ textAlign: "center", padding: "10px 14px", fontSize: 16, color: "#9ba2ee" }}>{posthive ? "✓" : <span style={{ color: "#3a3a3a" }}>—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#ededed", margin: "40px 0 14px", letterSpacing: "-0.01em" }}>
            Pricing: Buffer gets expensive fast
          </h2>

          <p style={{ marginBottom: 24 }}>
            Buffer charges per channel. At $6/month per channel on Essentials, connecting just 5 accounts costs $30/month. The Team plan jumps to $12/channel. If you&apos;re running multiple brands or clients, the math gets painful quickly.
          </p>

          <p style={{ marginBottom: 24 }}>
            Posthive&apos;s hosted plan starts at ₹550/month with no per-channel pricing. Or self-host it for free — your only cost is the VPS or cloud instance, which can be near-zero on Railway&apos;s or Fly.io&apos;s hobby tier.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#ededed", margin: "40px 0 14px", letterSpacing: "-0.01em" }}>
            Open source: full control, no lock-in
          </h2>

          <p style={{ marginBottom: 24 }}>
            Buffer is proprietary. When you connect your social accounts, your OAuth tokens live on their servers. You have to trust that their security practices are solid and that they won&apos;t change their pricing model next quarter.
          </p>

          <p style={{ marginBottom: 24 }}>
            Posthive is <strong style={{ color: "#ededed" }}>AGPL-3.0</strong>. The entire codebase is on GitHub. OAuth credentials are AES-256-GCM encrypted at rest. If you self-host, they never leave your server. You can audit every line of code that touches your tokens.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#ededed", margin: "40px 0 14px", letterSpacing: "-0.01em" }}>
            Features Buffer doesn&apos;t have
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
            {[
              { title: "Bulk CSV scheduling", desc: "Upload a spreadsheet and schedule hundreds of posts at once. Specify different platforms per row with pipe-separated account names." },
              { title: "First comment automation", desc: "Post a first comment — hashtags, a link, a CTA — automatically the moment your content goes live. Buffer has no equivalent." },
              { title: "Per-platform overrides", desc: "Write one base post and customise the text independently per platform. LinkedIn gets the long version, Bluesky gets the 300-char summary." },
              { title: "Drag-to-reschedule calendar", desc: "A visual content calendar where you can drag posts to new dates instantly. No form-filling, no dropdowns." },
            ].map((f) => (
              <div key={f.title} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#ededed", marginBottom: 6 }}>✓ {f.title}</div>
                <div style={{ fontSize: 13.5, color: "#666", lineHeight: 1.65 }}>{f.desc}</div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#ededed", margin: "40px 0 14px", letterSpacing: "-0.01em" }}>
            When Buffer is still the right choice
          </h2>

          <p style={{ marginBottom: 24 }}>
            Buffer is polished, battle-tested, and has a great mobile app. If you need TikTok support, a native mobile scheduler, or don&apos;t want to manage your own infrastructure, Buffer is still a solid option. It&apos;s also the safer choice for non-technical teams who aren&apos;t comfortable with self-hosting.
          </p>

          <p style={{ marginBottom: 24 }}>
            But if you post to Bluesky, Threads, Mastodon, or Telegram — or if you care about open source and data ownership — Posthive is the better fit.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#ededed", margin: "40px 0 14px", letterSpacing: "-0.01em" }}>
            Frequently asked questions
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 32 }}>
            {faqSchema.mainEntity.map((item) => (
              <div key={item.name} style={{ borderBottom: "1px solid #1a1a1a", padding: "20px 0" }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#ededed", margin: "0 0 8px" }}>{item.name}</p>
                <p style={{ fontSize: 14, color: "#666", lineHeight: 1.75, margin: 0 }}>{item.acceptedAnswer.text}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, padding: "32px 28px", textAlign: "center", marginTop: 48 }}>
            <p style={{ fontSize: 20, fontWeight: 700, color: "#ededed", margin: "0 0 10px" }}>Try Posthive free for 14 days</p>
            <p style={{ fontSize: 14, color: "#666", margin: "0 0 24px" }}>No credit card required. Connect your first account in under a minute.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/register" style={{ fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 10, background: "#5b63d3", color: "#fff", textDecoration: "none" }}>
                Get started free →
              </Link>
              <Link href="https://github.com/posthive/posthive" style={{ fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 10, background: "#111", color: "#888", textDecoration: "none", border: "1px solid #2a2a2a" }}>
                View on GitHub
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
