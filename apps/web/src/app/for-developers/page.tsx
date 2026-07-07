import Link from "next/link";
import type { Metadata } from "next";
import { NavBar } from "../../components/LandingNav";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "https://posthive.co";

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Posthive",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Self-hosted, free" },
  url: WEB_URL,
  description: "Open-source social media scheduler with REST API, MCP server, and self-hosting support. Built for developers who want full control.",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the Posthive REST API?",
      acceptedAnswer: { "@type": "Answer", text: "Posthive exposes a public REST API at /api/v1 that lets you create posts, manage accounts, upload media, and work with templates programmatically using an API key." },
    },
    {
      "@type": "Question",
      name: "What is MCP and how does Posthive use it?",
      acceptedAnswer: { "@type": "Answer", text: "MCP (Model Context Protocol) is a standard for connecting AI agents to external tools. Posthive has a built-in MCP server that lets AI agents like Claude Code or Cursor create and schedule posts via tool calls." },
    },
    {
      "@type": "Question",
      name: "Can I self-host Posthive on my own server?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. Posthive is fully self-hostable under AGPL-3.0. Clone the repo, configure your .env, run database migrations, and deploy to Railway, Fly.io, Render, or any VPS." },
    },
    {
      "@type": "Question",
      name: "How do I get an API key?",
      acceptedAnswer: { "@type": "Answer", text: "API keys are available on the Pro and Team plans. Generate one from your account settings page. Keys are prefixed with ph_ and can be scoped and revoked at any time." },
    },
  ],
};

export const metadata: Metadata = {
  title: "Posthive for Developers — REST API, MCP Server & Self-Hosting",
  description: "Posthive is open-source and built API-first. Schedule social media posts programmatically via REST API, connect AI agents via MCP, or self-host the entire stack under AGPL-3.0.",
  keywords: ["social media scheduler API", "open source social media API", "self-hosted social scheduler", "MCP social media", "social scheduling REST API"],
  alternates: { canonical: `${WEB_URL}/for-developers` },
  openGraph: {
    title: "Posthive for Developers — REST API, MCP & Self-Hosting",
    description: "Schedule social media posts via REST API or MCP. Self-host everything under AGPL-3.0. Full control, no lock-in.",
    url: `${WEB_URL}/for-developers`,
    images: [{ url: "/api/og?layout=default&title=Posthive+for+Developers&desc=REST+API+%C2%B7+MCP+Server+%C2%B7+Self-Hostable&badge=Open+Source", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Posthive for Developers — REST API, MCP & Self-Hosting",
    description: "Schedule social media posts via REST API or MCP. Self-host everything under AGPL-3.0.",
  },
};

const CODE_EXAMPLE = `curl -X POST https://posthive.co/api/v1/posts \\
  -H "Authorization: Bearer ph_yourkey" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "Shipped v2.0 today 🚀",
    "accountIds": ["acc_bluesky", "acc_threads"],
    "scheduledFor": "2026-07-08T09:00:00Z"
  }'`;

const MCP_EXAMPLE = `// .claude/mcp.json
{
  "mcpServers": {
    "posthive": {
      "type": "http",
      "url": "https://posthive.co/mcp/ph_yourkey"
    }
  }
}

// Claude Code now has access to:
// list_accounts · create_post · list_scheduled_posts
// approve_draft · update_post · delete_post · and more`;

const SELF_HOST_EXAMPLE = `git clone https://github.com/posthive/posthive
cd posthive && cp apps/api/.env.example apps/api/.env

# Fill in your secrets, then:
pnpm install
cd apps/api && pnpm db:migrate
pnpm dev

# API → http://localhost:3001
# Web → http://localhost:3000`;

export default function ForDevelopersPage() {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#ededed", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <style>{`
        @media (max-width: 768px) {
          .dev-hero { font-size: 36px !important; }
          .dev-grid-2 { grid-template-columns: 1fr !important; }
          .dev-grid-3 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <NavBar user={false} ctaHref="/register" navCtaLabel="Get started free" />

      {/* ── Hero ── */}
      <section style={{ padding: "120px 24px 80px", textAlign: "center" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(91,99,211,.1)", border: "1px solid rgba(91,99,211,.25)", borderRadius: 999, padding: "6px 16px", marginBottom: 28 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#9ba2ee", letterSpacing: ".06em" }}>OPEN SOURCE · AGPL-3.0</span>
          </div>
          <h1 className="dev-hero" style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.1, color: "#ededed", margin: "0 0 20px" }}>
            Built for developers.<br />
            <span style={{ color: "#5b63d3" }}>API-first from day one.</span>
          </h1>
          <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "#666", lineHeight: 1.75, maxWidth: 580, margin: "0 auto 40px" }}>
            Schedule social media posts programmatically via REST API, connect your AI agent via MCP, or self-host the entire stack. Full source code, no black boxes.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/docs" style={{ fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 10, background: "#5b63d3", color: "#fff", textDecoration: "none", boxShadow: "0 8px 24px -8px rgba(91,99,211,.7)" }}>
              Read the docs →
            </Link>
            <Link href="https://github.com/posthive/posthive" style={{ fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 10, background: "#111", color: "#888", textDecoration: "none", border: "1px solid #2a2a2a" }}>
              View on GitHub
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "#1e1e1e", borderRadius: 16, overflow: "hidden" }} className="dev-grid-2" >
          {[
            { n: "11", label: "platforms" },
            { n: "10", label: "MCP tools" },
            { n: "AGPLv3", label: "license" },
            { n: "0", label: "vendor lock-in" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#0d0d0d", padding: "28px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#9ba2ee", letterSpacing: "-.03em", lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 8, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── REST API ── */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 48 }}>
            <div style={{ width: 32, height: 3, background: "#5b63d3", borderRadius: 2 }} />
            <p style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: ".12em", textTransform: "uppercase", margin: 0 }}>REST API</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }} className="dev-grid-2">
            <div>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: "#ededed", letterSpacing: "-0.03em", margin: "0 0 16px" }}>
                Schedule posts programmatically
              </h2>
              <p style={{ fontSize: 15, color: "#666", lineHeight: 1.75, margin: "0 0 24px" }}>
                The Posthive REST API lets you create, list, update, and delete scheduled posts from any language or tool. Authenticate with an API key prefixed <code style={{ background: "#1a1a1a", padding: "2px 6px", borderRadius: 4, fontSize: 13, color: "#9ba2ee" }}>ph_</code> and you&apos;re posting.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  ["GET /api/v1/accounts", "List connected social accounts"],
                  ["POST /api/v1/posts", "Create a scheduled post"],
                  ["PATCH /api/v1/posts/:id", "Update a scheduled post"],
                  ["POST /api/v1/posts/:id/duplicate", "Duplicate a post"],
                  ["GET /api/v1/templates", "List post templates"],
                  ["POST /api/v1/upload", "Upload media for a post"],
                ].map(([endpoint, desc]) => (
                  <div key={endpoint as string} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <code style={{ fontSize: 12, color: "#9ba2ee", background: "rgba(91,99,211,.08)", borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap", flexShrink: 0 }}>{endpoint as string}</code>
                    <span style={{ fontSize: 13, color: "#555", lineHeight: 1.5 }}>{desc as string}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ background: "#111", padding: "10px 16px", borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#e86b6b" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#d4a83c" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#5cb88a" }} />
                <span style={{ fontSize: 11, color: "#444", marginLeft: 8, fontFamily: "monospace" }}>create-post.sh</span>
              </div>
              <pre style={{ margin: 0, padding: "20px", fontFamily: "monospace", fontSize: 12.5, lineHeight: 1.8, color: "#aaa", overflowX: "auto", whiteSpace: "pre-wrap" }}>
                {CODE_EXAMPLE}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ── MCP ── */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 48 }}>
            <div style={{ width: 32, height: 3, background: "#3db8c8", borderRadius: 2 }} />
            <p style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: ".12em", textTransform: "uppercase", margin: 0 }}>MCP Integration</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }} className="dev-grid-2">
            <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ background: "#111", padding: "10px 16px", borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#e86b6b" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#d4a83c" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#5cb88a" }} />
                <span style={{ fontSize: 11, color: "#444", marginLeft: 8, fontFamily: "monospace" }}>mcp.json</span>
              </div>
              <pre style={{ margin: 0, padding: "20px", fontFamily: "monospace", fontSize: 12.5, lineHeight: 1.8, color: "#aaa", overflowX: "auto", whiteSpace: "pre-wrap" }}>
                {MCP_EXAMPLE}
              </pre>
            </div>
            <div>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: "#ededed", letterSpacing: "-0.03em", margin: "0 0 16px" }}>
                Let your AI agent post for you
              </h2>
              <p style={{ fontSize: 15, color: "#666", lineHeight: 1.75, margin: "0 0 16px" }}>
                Posthive ships with a full MCP server. Drop your API key into your Claude Code or Cursor config and your AI agent can list accounts, create posts, approve drafts, and manage your queue — all via natural language.
              </p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(212,168,60,.08)", border: "1px solid rgba(212,168,60,.25)", borderRadius: 8, padding: "8px 14px", marginBottom: 24 }}>
                <span style={{ fontSize: 13, color: "#d4a83c" }}>MCP access requires a <Link href="/pricing" style={{ color: "#d4a83c", fontWeight: 700, textDecoration: "underline" }}>Pro or Team plan</Link>.</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "list_accounts — see all connected social accounts",
                  "create_post — schedule content across platforms",
                  "approve_draft — promote a draft to scheduled",
                  "update_post — edit content or reschedule",
                  "list_templates — browse saved post templates",
                  "delete_post — remove from the queue",
                ].map((tool) => (
                  <div key={tool} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ color: "#3db8c8", flexShrink: 0, marginTop: 2 }}>✓</span>
                    <code style={{ fontSize: 13, color: "#888", lineHeight: 1.5 }}>{tool}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Self-hosting ── */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 48 }}>
            <div style={{ width: 32, height: 3, background: "#5cb88a", borderRadius: 2 }} />
            <p style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: ".12em", textTransform: "uppercase", margin: 0 }}>Self-hosting</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }} className="dev-grid-2">
            <div>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: "#ededed", letterSpacing: "-0.03em", margin: "0 0 16px" }}>
                Your server. Your data. Your rules.
              </h2>
              <p style={{ fontSize: 15, color: "#666", lineHeight: 1.75, margin: "0 0 28px" }}>
                Posthive is fully self-hostable under AGPL-3.0. OAuth credentials are AES-256-GCM encrypted at rest and never leave your infrastructure. Set <code style={{ background: "#1a1a1a", padding: "2px 6px", borderRadius: 4, fontSize: 13, color: "#5cb88a" }}>ENABLE_BILLING=false</code> to unlock every feature for all users — no trial, no limits.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="dev-grid-2">
                {[
                  {
                    label: "SQLite or Postgres",
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5b63d3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>,
                  },
                  {
                    label: "Redis / Upstash",
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5b63d3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
                  },
                  {
                    label: "Railway · Fly.io · Render",
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5b63d3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>,
                  },
                  {
                    label: "AES-256-GCM encryption",
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5b63d3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
                  },
                ].map((item) => (
                  <div key={item.label} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                    {item.icon}
                    <span style={{ fontSize: 13, color: "#777" }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ background: "#111", padding: "10px 16px", borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#e86b6b" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#d4a83c" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#5cb88a" }} />
                <span style={{ fontSize: 11, color: "#444", marginLeft: 8, fontFamily: "monospace" }}>Terminal</span>
              </div>
              <pre style={{ margin: 0, padding: "20px", fontFamily: "monospace", fontSize: 12.5, lineHeight: 1.9, color: "#aaa", overflowX: "auto", whiteSpace: "pre-wrap" }}>
                {SELF_HOST_EXAMPLE.split("\n").map((line, i) => {
                  if (line.startsWith("#")) return <span key={i} style={{ color: "#444" }}>{line}{"\n"}</span>;
                  if (line.startsWith("git") || line.startsWith("cd") || line.startsWith("cp") || line.startsWith("pnpm")) return <span key={i}><span style={{ color: "#5b63d3" }}>$ </span>{line}{"\n"}</span>;
                  if (line.startsWith("# API") || line.startsWith("# Web")) return <span key={i} style={{ color: "#5cb88a" }}>{line}{"\n"}</span>;
                  return <span key={i}>{line}{"\n"}</span>;
                })}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why open source ── */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 48 }}>
            <div style={{ width: 32, height: 3, background: "#2a2a2a", borderRadius: 2 }} />
            <p style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: ".12em", textTransform: "uppercase", margin: 0 }}>Why open source</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="dev-grid-3">
            {[
              { title: "Audit the code", desc: "Every line that touches your OAuth tokens is public. Read it, fork it, run a security audit — the code is yours to inspect." },
              { title: "No surprise pricing", desc: "AGPL-3.0 means the scheduling engine can never be locked behind a paywall. Self-hosted deployments are permanently free." },
              { title: "Extend it freely", desc: "Add a new platform, build internal tooling, wire it into your existing stack. Modify and deploy without asking permission." },
            ].map((item) => (
              <div key={item.title} style={{ borderLeft: "2px solid #5b63d344", paddingLeft: 20 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#ededed", marginBottom: 10, lineHeight: 1.3 }}>{item.title}</p>
                <p style={{ fontSize: 13.5, color: "#555", lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 48 }}>
            <div style={{ width: 32, height: 3, background: "#2a2a2a", borderRadius: 2 }} />
            <p style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: ".12em", textTransform: "uppercase", margin: 0 }}>Frequently asked questions</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {faqSchema.mainEntity.map((item) => (
              <div key={item.name} style={{ borderBottom: "1px solid #1a1a1a", padding: "22px 0" }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#ededed", margin: "0 0 10px" }}>{item.name}</p>
                <p style={{ fontSize: 14, color: "#666", lineHeight: 1.75, margin: 0 }}>{item.acceptedAnswer.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "0 24px 100px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(22px, 3.5vw, 36px)", fontWeight: 800, color: "#ededed", letterSpacing: "-.03em", lineHeight: 1.2, marginBottom: 16 }}>
            Start building with Posthive
          </h2>
          <p style={{ fontSize: 15, color: "#666", lineHeight: 1.75, marginBottom: 36 }}>
            14-day free trial on hosted. Or self-host for free today — the repo is public and the docs will get you running in under 10 minutes.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/docs" style={{ display: "inline-block", fontSize: 15, fontWeight: 700, padding: "14px 32px", borderRadius: 10, background: "#5b63d3", color: "#fff", textDecoration: "none", boxShadow: "0 12px 32px -8px rgba(91,99,211,.6)" }}>
              Read the docs →
            </Link>
            <Link href="/register" style={{ display: "inline-block", fontSize: 15, fontWeight: 700, padding: "14px 24px", borderRadius: 10, background: "#111", color: "#888", textDecoration: "none", border: "1px solid #2a2a2a" }}>
              Start free trial
            </Link>
          </div>
        </div>
      </section>

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
