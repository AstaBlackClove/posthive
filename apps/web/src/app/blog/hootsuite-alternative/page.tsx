import Link from "next/link";
import type { Metadata } from "next";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "https://posthive.co";

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "The Best Hootsuite Alternative in 2026 — Cheaper, Open Source, More Platforms",
  description: "Hootsuite costs $99/month minimum. Posthive does the same job scheduling across multiple platforms for a fraction of the price, with open-source code you can self-host.",
  datePublished: "2026-07-07",
  author: { "@type": "Person", name: "Guna" },
  publisher: { "@type": "Organization", name: "Posthive", url: WEB_URL },
  url: `${WEB_URL}/blog/hootsuite-alternative`,
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Why is Hootsuite so expensive?",
      acceptedAnswer: { "@type": "Answer", text: "Hootsuite targets enterprise teams and prices accordingly. Their cheapest paid plan starts at $99/month for one user and 10 accounts. Features like bulk scheduling and team collaboration require higher tiers." },
    },
    {
      "@type": "Question",
      name: "What is the cheapest Hootsuite alternative?",
      acceptedAnswer: { "@type": "Answer", text: "If you self-host Posthive, the cost is effectively zero — just your hosting infrastructure. The hosted Posthive plan starts at $9/month with no per-account pricing." },
    },
    {
      "@type": "Question",
      name: "Does Posthive support bulk scheduling like Hootsuite?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. Posthive has a CSV bulk scheduler — upload a spreadsheet with dates, text, and platform targets and it schedules every row automatically. This is available on all plans." },
    },
    {
      "@type": "Question",
      name: "Can Posthive replace Hootsuite for agencies?",
      acceptedAnswer: { "@type": "Answer", text: "For most agency workflows — scheduling, content calendars, multi-platform posting — yes. Posthive covers the core scheduling stack. Deep analytics and team role management at enterprise scale are areas where Hootsuite still has an edge." },
    },
  ],
};

export const metadata: Metadata = {
  title: "The Best Hootsuite Alternative in 2026 — Cheaper, Open Source | Posthive",
  description: "Hootsuite costs $99/month minimum. Posthive does the same job across multiple platforms for a fraction of the price — and it's open source.",
  keywords: ["Hootsuite alternative", "cheap Hootsuite alternative", "open source Hootsuite alternative", "Hootsuite vs Posthive", "affordable social media scheduler"],
  alternates: { canonical: `${WEB_URL}/blog/hootsuite-alternative` },
  openGraph: {
    title: "The Best Hootsuite Alternative in 2026 | Posthive",
    description: "Hootsuite costs $99/month minimum. Posthive does the same job across multiple platforms for a fraction of the price.",
    url: `${WEB_URL}/blog/hootsuite-alternative`,
    images: [{ url: "/api/og?layout=post&title=The+Best+Hootsuite+Alternative&desc=Cheaper+%C2%B7+Open+Source+%C2%B7+multiple+platforms&badge=Comparison", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Best Hootsuite Alternative in 2026 | Posthive",
    description: "Hootsuite costs $99/month minimum. Posthive does the same job across multiple platforms for a fraction of the price.",
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

export default function HootsuiteAlternativePage() {
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
          <span style={{ fontSize: 12, color: "#444" }}>· 6 min read</span>
        </div>

        <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, margin: "0 0 24px", color: "#ededed" }}>
          The Best Hootsuite Alternative in 2026 — Cheaper, Open Source, More Platforms
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
            Hootsuite used to be the default answer for social media scheduling. But at $99/month minimum for a single user, it&apos;s priced for enterprise teams — not indie hackers, solo creators, or small businesses who just need to stay consistent across a few platforms.
          </p>

          <p style={{ marginBottom: 24 }}>
            If you&apos;re paying $99/month to schedule posts and you&apos;re not a 50-person marketing team, you&apos;re almost certainly overpaying. Here&apos;s how Posthive compares — and when it might be the right switch.
          </p>

          {/* Price callout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "32px 0" }}>
            {[
              { label: "Hootsuite Professional", price: "$99/mo", sub: "1 user · 10 accounts", color: "#e86b6b" },
              { label: "Posthive Creator", price: "$9/mo", sub: "All platforms · no per-account fee", color: "#5cb88a" },
            ].map((p) => (
              <div key={p.label} style={{ background: "#111", border: `1px solid ${p.color}33`, borderRadius: 14, padding: "20px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 8 }}>{p.label}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: p.color, letterSpacing: "-0.03em" }}>{p.price}</div>
                <div style={{ fontSize: 12, color: "#444", marginTop: 6 }}>{p.sub}</div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#ededed", margin: "40px 0 14px", letterSpacing: "-0.01em" }}>
            What you get with Hootsuite — and what you don&apos;t
          </h2>

          <p style={{ marginBottom: 24 }}>
            Hootsuite has been around since 2008. It has deep analytics, a robust team management system, and integrations with almost every social platform. For a 20-person social media team managing 30 brand accounts, it&apos;s defensible.
          </p>

          <p style={{ marginBottom: 24 }}>
            But for everyone else: the interface is cluttered, the pricing is aggressive, and the feature set is bloated with things most users never touch. More importantly, Hootsuite doesn&apos;t support Bluesky, Mastodon, Threads, or Telegram — the platforms where organic growth is still very much possible.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#ededed", margin: "40px 0 14px", letterSpacing: "-0.01em" }}>
            Hootsuite vs Posthive: head-to-head
          </h2>

          <div style={{ overflowX: "auto", marginBottom: 32 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "10px 14px", borderBottom: "1px solid #1e1e1e", color: "#555", fontWeight: 700, fontSize: 12 }}>Feature</th>
                  <th style={{ textAlign: "center", padding: "10px 14px", borderBottom: "1px solid #1e1e1e", color: "#555", fontWeight: 700, fontSize: 12 }}>Hootsuite</th>
                  <th style={{ textAlign: "center", padding: "10px 14px", borderBottom: "1px solid #1e1e1e", color: "#9ba2ee", fontWeight: 700, fontSize: 12 }}>Posthive</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Starting price", "$99/mo", "$9/mo"],
                  ["Self-hostable", "✕", "✓"],
                  ["Open source", "✕", "✓ (AGPL-3.0)"],
                  ["Bluesky support", "✕", "✓"],
                  ["Mastodon support", "✕", "✓"],
                  ["Threads support", "✕", "✓"],
                  ["Telegram support", "✕", "✓"],
                  ["Bulk CSV scheduling", "Higher plans only", "✓ All plans"],
                  ["First comment scheduling", "✕", "✓"],
                  ["Per-platform overrides", "✕", "✓"],
                  ["Drag-to-reschedule calendar", "✓", "✓"],
                  ["Instagram Reels & Stories", "✓", "✓"],
                ].map(([feature, hootsuite, posthive]) => (
                  <tr key={feature as string} style={{ borderBottom: "1px solid #111" }}>
                    <td style={{ padding: "10px 14px", color: "#aaa", fontSize: 14 }}>{feature as string}</td>
                    <td style={{ textAlign: "center", padding: "10px 14px", color: hootsuite === "✕" ? "#3a3a3a" : "#888", fontSize: 13 }}>{hootsuite as string}</td>
                    <td style={{ textAlign: "center", padding: "10px 14px", color: posthive === "✕" ? "#3a3a3a" : "#9ba2ee", fontSize: 13 }}>{posthive as string}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#ededed", margin: "40px 0 14px", letterSpacing: "-0.01em" }}>
            Open source means you own your data
          </h2>

          <p style={{ marginBottom: 24 }}>
            With Hootsuite, your social account credentials live on their servers. You&apos;re trusting a third party with your Instagram, LinkedIn, and Facebook OAuth tokens indefinitely. If they get breached, or if they decide to change their pricing model, you have no fallback.
          </p>

          <p style={{ marginBottom: 24 }}>
            Posthive is <strong style={{ color: "#ededed" }}>AGPL-3.0</strong> — the full source code is public, auditable, and forkable. OAuth credentials are AES-256-GCM encrypted at rest. Self-hosted users keep everything on their own infrastructure. There is no vendor lock-in.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#ededed", margin: "40px 0 14px", letterSpacing: "-0.01em" }}>
            Who should still use Hootsuite
          </h2>

          <p style={{ marginBottom: 24 }}>
            If you need deep social listening, enterprise-grade team permissions with approval workflows, TikTok support, or a robust mobile app for on-the-go publishing, Hootsuite is still the stronger choice. It&apos;s built for teams where social media is a full-time job.
          </p>

          <p style={{ marginBottom: 24 }}>
            But if you&apos;re a solo creator, a founder, or a small team who just wants a reliable scheduler that covers all the platforms you actually use — Posthive will do more, cost less, and give you back control.
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
            <p style={{ fontSize: 20, fontWeight: 700, color: "#ededed", margin: "0 0 10px" }}>Switch from Hootsuite — free for 14 days</p>
            <p style={{ fontSize: 14, color: "#666", margin: "0 0 24px" }}>No credit card required. Connect your first account in under a minute.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/register" style={{ fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 10, background: "#5b63d3", color: "#fff", textDecoration: "none" }}>
                Get started free
              </Link>
              <Link href="/pricing" style={{ fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 10, background: "#111", color: "#888", textDecoration: "none", border: "1px solid #2a2a2a" }}>
                View pricing
              </Link>
            </div>
          </div>

          {/* Related reading */}
          <div style={{ borderTop: "1px solid #1e1e1e", marginTop: 48, paddingTop: 36 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#555", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 16 }}>Related reading</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { href: "/blog/buffer-alternative-open-source", label: "The best open-source Buffer alternative in 2026" },
                { href: "/blog/best-social-media-scheduler", label: "The best social media schedulers in 2026 compared" },
                { href: "/platforms/bluesky", label: "Schedule Bluesky posts — a platform Hootsuite doesn't support" },
                { href: "/platforms/mastodon", label: "Schedule to any Mastodon instance with Posthive" },
                { href: "/platforms/linkedin", label: "Stay consistent on LinkedIn without logging in every day" },
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
