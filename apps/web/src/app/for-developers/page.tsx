import Link from "next/link";
import type { Metadata } from "next";
import { NavBar } from "../../components/LandingNav";
import { cn } from "../../lib/cn";

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
  title: "Posthive for Developers — API & MCP",
  description: "Open-source and API-first. Schedule posts via REST API, connect AI agents via MCP, or self-host under AGPL-3.0. Full control, no lock-in.",
  keywords: ["social media scheduler API", "open source social media API", "self-hosted social scheduler", "MCP social media", "social scheduling REST API"],
  alternates: { canonical: `${WEB_URL}/for-developers` },
  openGraph: {
    title: "Posthive for Developers — REST API, MCP & Self-Hosting",
    description: "Schedule social media posts via REST API or MCP. Self-host everything under AGPL-3.0. Full control, no lock-in.",
    url: `${WEB_URL}/for-developers`,
    images: [{ url: "/og/fordeveloperogimage.jpg", width: 1200, height: 630, alt: "Posthive for Developers — REST API, MCP & Self-Hosting" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Posthive for Developers — REST API, MCP & Self-Hosting",
    description: "Schedule social media posts via REST API or MCP. Self-host everything under AGPL-3.0.",
    images: ["/og/fordeveloperogimage.jpg"],
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

const SECTION = "px-6 pb-20";
const EYEBROW = "type-body-sb-xs uppercase tracking-wider text-muted";
const H2 = "mb-4 type-head-sb-5 tracking-tight text-fg md:type-head-sb-4";
const INLINE_CODE = "rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg";

function SectionHead({ bar, label }: { bar: string; label: string }) {
  return (
    <div className="mb-12 flex items-center gap-4">
      <div className={cn("h-1 w-8 rounded-xs", bar)} />
      <p className={EYEBROW}>{label}</p>
    </div>
  );
}

function CodeWindow({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <div className="size-2 rounded-full bg-red-400" />
        <div className="size-2 rounded-full bg-brand-500" />
        <div className="size-2 rounded-full bg-green-500" />
        <span className="ml-2 type-mono-r-xs text-muted">{name}</span>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap p-5 type-mono-r-xs text-fg">
        {children}
      </pre>
    </div>
  );
}

export default function ForDevelopersPage() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <NavBar user={false} ctaHref="/register" navCtaLabel="Get started free" />

      {/* ── Hero ── */}
      <section className="px-6 pt-30 pb-20 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-brand-300 bg-brand-100 px-4 py-1.5">
            <span className="type-body-sb-xs tracking-wider text-brand-800">OPEN SOURCE · AGPL-3.0</span>
          </div>
          <h1 className="mb-5 type-display-m-6 tracking-tight text-fg md:type-display-m-4">
            Built for developers.<br />
            <span className="text-brand-800">API-first from day one.</span>
          </h1>
          <p className="mx-auto mb-10 max-w-xl type-body-r-m text-muted md:type-body-r-l">
            Schedule social media posts programmatically via REST API, connect your AI agent via MCP, or self-host the entire stack. Full source code, no black boxes.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/docs" className="btn-primary px-6 py-3 type-body-sb-m">
              Read the docs
            </Link>
            <Link href="https://github.com/posthive/posthive" className="btn-secondary px-6 py-3 type-body-sb-m">
              View on GitHub
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className={SECTION}>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4">
          {[
            { n: "Multiple", label: "platforms" },
            { n: "10", label: "MCP tools" },
            { n: "AGPLv3", label: "license" },
            { n: "0", label: "vendor lock-in" },
          ].map((s) => (
            <div key={s.label} className="bg-surface px-5 py-7 text-center">
              <div className="type-head-sb-2 tracking-tight text-brand-800">{s.n}</div>
              <div className="mt-2 type-body-sb-xs text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── REST API ── */}
      <section className={SECTION}>
        <div className="mx-auto max-w-5xl">
          <SectionHead bar="bg-accent" label="REST API" />
          <div className="grid grid-cols-1 items-start gap-12 md:grid-cols-2">
            <div>
              <h2 className={H2}>
                Schedule posts programmatically
              </h2>
              <p className="mb-6 type-body-r-m text-muted">
                The Posthive REST API lets you create, list, update, and delete scheduled posts from any language or tool. Authenticate with an API key prefixed <code className={INLINE_CODE}>ph_</code> and you&apos;re posting.
              </p>
              <div className="flex flex-col gap-2.5">
                {[
                  ["GET /api/v1/accounts", "List connected social accounts"],
                  ["POST /api/v1/posts", "Create a scheduled post"],
                  ["PATCH /api/v1/posts/:id", "Update a scheduled post"],
                  ["POST /api/v1/posts/:id/duplicate", "Duplicate a post"],
                  ["GET /api/v1/templates", "List design templates"],
                  ["POST /api/v1/upload", "Upload media for a post"],
                ].map(([endpoint, desc]) => (
                  <div key={endpoint as string} className="flex items-start gap-3">
                    <code className="shrink-0 whitespace-nowrap rounded-md bg-brand-100 px-2 py-0.5 type-mono-r-xs text-brand-800">{endpoint as string}</code>
                    <span className="type-body-r-s text-muted">{desc as string}</span>
                  </div>
                ))}
              </div>
            </div>
            <CodeWindow name="create-post.sh">
              {CODE_EXAMPLE}
            </CodeWindow>
          </div>
        </div>
      </section>

      {/* ── MCP ── */}
      <section className={SECTION}>
        <div className="mx-auto max-w-5xl">
          <SectionHead bar="bg-blue-500" label="MCP Integration" />
          <div className="grid grid-cols-1 items-start gap-12 md:grid-cols-2">
            <CodeWindow name="mcp.json">
              {MCP_EXAMPLE}
            </CodeWindow>
            <div>
              <h2 className={H2}>
                Let your AI agent post for you
              </h2>
              <p className="mb-4 type-body-r-m text-muted">
                Posthive ships with a full MCP server. Drop your API key into your Claude Code or Cursor config and your AI agent can list accounts, create posts, approve drafts, and manage your queue — all via natural language.
              </p>
              <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-brand-400 bg-brand-100 px-3.5 py-2">
                <span className="type-body-r-s text-brand-800">MCP access requires a <Link href="/pricing" className="type-body-sb-s underline">Pro or Team plan</Link>.</span>
              </div>
              <div className="flex flex-col gap-2.5">
                {[
                  "list_accounts — see all connected social accounts",
                  "create_post — schedule content across platforms",
                  "approve_draft — promote a draft to scheduled",
                  "update_post — edit content or reschedule",
                  "list_templates — browse design templates (one per content category)",
                  "delete_post — remove from the queue",
                ].map((tool) => (
                  <div key={tool} className="flex items-start gap-2.5">
                    <span className="mt-0.5 shrink-0 text-green-700">✓</span>
                    <code className="type-mono-r-s text-muted">{tool}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Self-hosting ── */}
      <section className={SECTION}>
        <div className="mx-auto max-w-5xl">
          <SectionHead bar="bg-green-600" label="Self-hosting" />
          <div className="grid grid-cols-1 items-start gap-12 md:grid-cols-2">
            <div>
              <h2 className={H2}>
                Your server. Your data. Your rules.
              </h2>
              <p className="mb-7 type-body-r-m text-muted">
                Posthive is fully self-hostable under AGPL-3.0. OAuth credentials are AES-256-GCM encrypted at rest and never leave your infrastructure. Set <code className={INLINE_CODE}>ENABLE_BILLING=false</code> to unlock every feature for all users — no trial, no limits.
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {[
                  {
                    label: "SQLite or Postgres",
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-brand-800"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>,
                  },
                  {
                    label: "Redis / Upstash",
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-brand-800"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
                  },
                  {
                    label: "Railway · Fly.io · Render",
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-brand-800"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>,
                  },
                  {
                    label: "AES-256-GCM encryption",
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-brand-800"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-3.5">
                    {item.icon}
                    <span className="type-body-r-s text-muted">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <CodeWindow name="Terminal">
              {SELF_HOST_EXAMPLE.split("\n").map((line, i) => {
                if (line.startsWith("#")) return <span key={i} className="text-muted">{line}{"\n"}</span>;
                if (line.startsWith("git") || line.startsWith("cd") || line.startsWith("cp") || line.startsWith("pnpm")) return <span key={i}><span className="text-brand-800">$ </span>{line}{"\n"}</span>;
                if (line.startsWith("# API") || line.startsWith("# Web")) return <span key={i} className="text-green-700">{line}{"\n"}</span>;
                return <span key={i}>{line}{"\n"}</span>;
              })}
            </CodeWindow>
          </div>
        </div>
      </section>

      {/* ── Why open source ── */}
      <section className={SECTION}>
        <div className="mx-auto max-w-5xl">
          <SectionHead bar="bg-border" label="Why open source" />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              { title: "Audit the code", desc: "Every line that touches your OAuth tokens is public. Read it, fork it, run a security audit — the code is yours to inspect." },
              { title: "No surprise pricing", desc: "AGPL-3.0 means the scheduling engine can never be locked behind a paywall. Self-hosted deployments are permanently free." },
              { title: "Extend it freely", desc: "Add a new platform, build internal tooling, wire it into your existing stack. Modify and deploy without asking permission." },
            ].map((item) => (
              <div key={item.title} className="border-l-2 border-brand-300 pl-5">
                <p className="mb-2.5 type-body-sb-m text-fg">{item.title}</p>
                <p className="type-body-r-s text-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className={SECTION}>
        <div className="mx-auto max-w-3xl">
          <SectionHead bar="bg-border" label="Frequently asked questions" />
          <div className="flex flex-col">
            {faqSchema.mainEntity.map((item) => (
              <div key={item.name} className="border-b border-border py-6">
                <p className="mb-2.5 type-body-sb-m text-fg">{item.name}</p>
                <p className="type-body-r-s text-muted">{item.acceptedAnswer.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 pb-25">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="mb-4 type-head-sb-6 tracking-tight text-fg md:type-head-sb-2">
            Start building with Posthive
          </h2>
          <p className="mb-9 type-body-r-m text-muted">
            14-day free trial on hosted. Or self-host for free today — the repo is public and the docs will get you running in under 10 minutes.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/docs" className="btn-primary px-8 py-3.5 type-body-sb-m">
              Read the docs
            </Link>
            <Link href="/register" className="btn-secondary px-6 py-3.5 type-body-sb-m">
              Start free trial
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-surface px-6 py-10 text-center">
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
