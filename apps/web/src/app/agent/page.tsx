import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { AgentSetupSection } from "../../components/AgentSetupSection";
import { MarketingNavBar } from "../../components/MarketingNavBar";
import { LandingFooter } from "../../components/LandingFooter";
import { cn } from "../../lib/cn";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "https://posthive.co";

export const metadata: Metadata = {
  title: "Schedule Social Media with AI — Claude, Cursor & ChatGPT Integration",
  description: "Connect Claude, Cursor, or any AI agent to Posthive and schedule posts across 14 platforms. Draft-first workflow — nothing goes live without your approval.",
  keywords: ["MCP social media", "Claude MCP social scheduler", "AI agent social media posting", "posthive-mcp", "social media API agent", "Claude tool social media"],
  alternates: { canonical: `${WEB_URL}/agent` },
  openGraph: {
    title: "Schedule Social Media with AI — Claude, Cursor & ChatGPT Integration",
    description: "Give Claude, Cursor, or any AI agent the ability to schedule posts across 14 platforms. Draft-first — nothing goes live without your approval.",
    url: `${WEB_URL}/agent`,
    images: [{ url: "/og/fordeveloperogimage.jpg", width: 1200, height: 630, alt: "Posthive Agent — MCP + CLI for social media" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Schedule Social Media with AI — Claude, Cursor & ChatGPT Integration",
    description: "MCP server + CLI for Claude, Cursor, VS Code, ChatGPT and more. Draft-first, revocable API keys.",
    images: ["/og/fordeveloperogimage.jpg"],
  },
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Posthive Agent",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free to install, requires Posthive Pro/Team for MCP or a valid API key for CLI" },
  url: `${WEB_URL}/agent`,
  description: "Give any AI agent — Claude, Cursor, OpenClaw, or custom pipelines — the ability to schedule social media posts across multiple platforms via MCP or CLI.",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "What is posthive-mcp?", acceptedAnswer: { "@type": "Answer", text: "posthive-mcp is an MCP (Model Context Protocol) server you run with npx. It gives Claude Desktop, Cursor, Windsurf, and any MCP-compatible client tools to list accounts, create posts, and manage your Posthive queue." } },
    { "@type": "Question", name: "What is posthive-cli and how is it different from the MCP server?", acceptedAnswer: { "@type": "Answer", text: "posthive-cli is a shell command (`posthive`) that mirrors the same API. It's built for agents that run shell commands rather than speak MCP directly OpenClaw, Claude Code skills, and custom automation pipelines. Every command outputs structured JSON." } },
    { "@type": "Question", name: "Will an AI agent publish posts without my approval?", acceptedAnswer: { "@type": "Answer", text: "No. Every post created by an agent is saved as a draft by default and appears in Posthive's review queue. Nothing publishes unless a human approves it, or the agent is explicitly told to schedule directly with a future timestamp." } },
    { "@type": "Question", name: "Do I need a paid plan to use the agent tools?", acceptedAnswer: { "@type": "Answer", text: "The MCP server requires a Pro or Team plan. The CLI works with any valid API key, which is also available on Pro and Team." } },
  ],
};

const MCP_CONFIG = `{
  "mcpServers": {
    "posthive": {
      "command": "npx",
      "args": ["posthive-mcp"],
      "env": {
        "POSTHIVE_API_KEY": "ph_yourkey",
        "POSTHIVE_API_URL": "https://api.posthive.co"
      }
    }
  }
}`;

const CLI_EXAMPLE = `$ export POSTHIVE_API_KEY=ph_yourkey

$ npx posthive-cli accounts:list

$ npx posthive-cli posts:create \\
    --content "Shipped v2.0 today" \\
    --accounts acc_bluesky,acc_threads \\
    --first-comment "Full changelog: example.com"

# → saved as a DRAFT - review it in Posthive → Posts
$ npx posthive-cli posts:list --status draft`;

const SKILL_EXAMPLE = `---
name: posthive
description: Schedule social posts across multi platforms
---

# Workflow
1. accounts:list — get valid account IDs
2. posts:create — saved as DRAFT by default
3. posts:approve — promote a draft to scheduled

Ships inside posthive-cli. Works with Claude Code,
OpenClaw, and any agent that runs shell commands.`;

// ── Reusable primitives ───────────────────────────────────────────────────────

function Rule() {
  return <hr className="h-px border-0 bg-linear-to-r from-transparent via-border to-transparent" />;
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 inline-flex items-center gap-3 type-body-sb-xs uppercase tracking-wider text-brand-800">
      <span className="block h-px w-8 shrink-0 bg-brand-800" />
      {children}
    </div>
  );
}

function WindowDots() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <span key={i} className="block size-2.5 rounded-full bg-neutral-200" />
      ))}
    </>
  );
}

function CodePanel({ filename, children, copyable }: { filename: string; children: React.ReactNode; copyable?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 type-mono-r-xs">
        <span className="text-muted">{filename}</span>
        {copyable && <span className="cursor-pointer tracking-wider text-brand-800">COPY</span>}
      </div>
      <pre className="overflow-x-auto p-5 type-mono-r-s text-fg">
        {children}
      </pre>
    </div>
  );
}

function TerminalPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <WindowDots />
        <span className="ml-2.5 type-mono-r-xs text-muted">terminal</span>
      </div>
      <pre className="overflow-x-auto p-5 type-mono-r-s text-fg">
        {children}
      </pre>
    </div>
  );
}

export default function AgentPage() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <MarketingNavBar />

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:px-12 md:py-24">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-20">
          <div>
            <Kicker>Posthive Agent · MCP + CLI</Kicker>
            <h1 className="type-display-m-6 tracking-tight md:type-display-m-4 xl:type-display-m-3">
              Let your AI&nbsp;agent<br />run your&nbsp;socials.
            </h1>
            <p className="mt-7 max-w-xl type-body-r-l text-muted">
              Claude, Cursor, OpenClaw, or any agent that can call a tool or run a shell command can now schedule posts across multi platforms with you approving everything before it goes live.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#setup" className="btn-primary px-5 py-3">
                Set up Posthive MCP
              </Link>
              <Link href="/docs#api-authentication" className="btn-secondary px-5 py-3">
                Use the API
              </Link>
            </div>
          </div>

          {/* Claude Code preview */}
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
              {/* title bar */}
              <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5 type-body-r-xs text-muted">
                <WindowDots />
                <span className="ml-2.5 tracking-wide">Claude Code</span>
              </div>
              {/* chat */}
              <div className="flex flex-col gap-4 p-5">
                {/* user turn */}
                <div className="flex items-start gap-3">
                  <div className="grid size-6 shrink-0 place-items-center rounded-md bg-neutral-100 type-body-r-xs text-muted">G</div>
                  <div className="pt-0.5 type-body-r-s">
                    Schedule a post about our launch for tomorrow at 9am.
                  </div>
                </div>
                {/* assistant */}
                <div className="flex items-start gap-3">
                  <div className="grid size-6 shrink-0 place-items-center rounded-md bg-brand-100 text-brand-800">
                    <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                      <path d="M10 1.5l7.5 4.25v8.5L10 18.5 2.5 14.25v-8.5L10 1.5z" stroke="currentColor" strokeWidth="1.4"/>
                    </svg>
                  </div>
                  <div className="type-body-r-s">
                    Draft created for tomorrow, 9:00 AM. Review before it goes live.
                  </div>
                </div>
                {/* draft card */}
                <div className="ml-9 rounded-xl border border-border bg-bg p-3.5">
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="type-body-r-xs tracking-widest text-muted">SCHEDULED · JUN 14 · 09:00</span>
                    <span className="rounded-md border border-brand-400 bg-brand-100 px-2.5 py-0.5 type-body-r-xs text-brand-800">DRAFT</span>
                  </div>
                  <p className="mb-3 type-body-r-s text-muted">
                    Shipped v2.0 today drag-to-reschedule calendar, per-platform overrides, and first-comment on every platform. Try it free →
                  </p>
                  <div className="flex items-center gap-1.5">
                    {["bsky.app","threads.net","linkedin.com","mastodon.social"].map(d => (
                      <img key={d} src={`https://www.google.com/s2/favicons?domain=${d}&sz=32`} width={16} height={16} alt={d} className="rounded-sm" />
                    ))}
                    <span className="ml-1.5 type-body-r-xs text-muted">4 accounts</span>
                    <span className="ml-auto type-body-r-xs text-brand-800">approve →</span>
                  </div>
                </div>
                {/* tool call */}
                <div className="ml-9 flex items-center gap-2 type-mono-r-xs text-muted">
                  <span className="block size-1.5 rounded-full bg-accent" />
                  posthive.create_post · 128 tokens
                </div>
              </div>
            </div>
            {/* floating chip */}
            <div className="absolute -bottom-4.5 left-0 flex items-center gap-2.5 rounded-xl border border-border bg-bg px-3.5 py-2.5 type-body-r-xs shadow-sm md:-left-6">
              <span className="block size-1.5 rounded-full bg-green-500" />
              Draft-first · nothing publishes without you
            </div>
          </div>
        </div>
      </section>

      <Rule />

      {/* ── Stat band ── */}
      <section className="bg-brand-100/60 py-14">
        <div className="mx-auto max-w-6xl px-5 md:px-12">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {[
              { n: "Multi", label: "Platforms" },
              { n: "10", label: "Tools · commands" },
              { n: "2",  label: "Install paths" },
              { n: "100%", label: "Draft-first" },
            ].map(s => (
              <div key={s.label}>
                <div className="type-display-m-6 tracking-tight md:type-display-m-5">{s.n}</div>
                <div className="mt-2.5 type-body-r-xs uppercase tracking-widest text-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Setup ── */}
      <section id="setup" className="mx-auto max-w-6xl px-5 py-16 md:px-12 md:py-24">
        <Kicker>Setup</Kicker>
        <h2 className="mb-5 type-head-sb-3 tracking-tight md:type-head-sb-1">
          Connect in three steps.
        </h2>
        <p className="mb-14 max-w-xl type-body-r-l text-muted">
          One-click for the hosted apps that ship an MCP UI Claude, ChatGPT, Cursor, Windsurf, Codex, VS Code. Config-file or shell for everything else.
        </p>

        <AgentSetupSection />
      </section>

      <Rule />

      {/* ── MCP config ── */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:px-12 md:py-24">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-20">
          <div>
            <Kicker>For Claude Desktop, Cursor &amp; Windsurf</Kicker>
            <h2 className="mb-5 type-head-sb-4 tracking-tight md:type-head-sb-2">
              One config block,<br />full MCP access.
            </h2>
            <p className="mb-7 max-w-md type-body-r-m text-muted">
              Drop <code className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">posthive-mcp</code> into any MCP client config and your agent instantly has tools to list accounts, create posts, approve drafts, and manage the queue no server to run or maintain, npx handles it.
            </p>
            <ul className="flex flex-col gap-2.5">
              {[
                ["list_accounts", "- connected accounts and IDs"],
                ["create_post", "- draft or schedule directly"],
                ["approve_draft", "- promote a draft to scheduled"],
                ["update_post / duplicate_post / delete_post", ""],
                ["list_templates / create_from_template", ""],
              ].map(([cmd, desc]) => (
                <li key={cmd} className="flex items-baseline gap-3 type-body-r-s">
                  <span className="text-brand-800">✓</span>
                  <code className="type-mono-r-s">{cmd}</code>
                  {desc && <span className="text-muted">{desc}</span>}
                </li>
              ))}
            </ul>
          </div>
          <CodePanel filename="claude_desktop_config.json" copyable>
            <span className="text-muted">{"{"}</span>{"\n"}
            {"  "}<span className="text-brand-800">&quot;mcpServers&quot;</span>{": {"}{"\n"}
            {"    "}<span className="text-brand-800">&quot;posthive&quot;</span>{": {"}{"\n"}
            {"      "}<span className="text-brand-800">&quot;command&quot;</span>{": "}<span className="text-green-700">&quot;npx&quot;</span>{","}{"\n"}
            {"      "}<span className="text-brand-800">&quot;args&quot;</span>{": ["}<span className="text-green-700">&quot;posthive-mcp&quot;</span>{"],"}{"\n"}
            {"      "}<span className="text-brand-800">&quot;env&quot;</span>{": {"}{"\n"}
            {"        "}<span className="text-brand-800">&quot;POSTHIVE_API_KEY&quot;</span>{": "}<span className="text-green-700">&quot;ph_yourkey&quot;</span>{","}{"\n"}
            {"        "}<span className="text-brand-800">&quot;POSTHIVE_API_URL&quot;</span>{": "}<span className="text-green-700">&quot;https://api.posthive.co&quot;</span>{"\n"}
            {"      }"}{"\n"}
            {"    }"}{"\n"}
            {"  }"}{"\n"}
            <span className="text-muted">{"}"}</span>
          </CodePanel>
        </div>
      </section>

      <Rule />

      {/* ── CLI ── */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:px-12 md:py-24">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-20">
          <TerminalPanel>
            {CLI_EXAMPLE.split("\n").map((line, i) => {
              const isComment = line.startsWith("#");
              const isPrompt = line.startsWith("$");
              return (
                <span key={i} className={cn("block", isComment || isPrompt ? "text-muted" : "text-fg")}>
                  {isPrompt ? (
                    <><span className="text-muted">$</span>{line.slice(1)}</>
                  ) : line}
                </span>
              );
            })}
          </TerminalPanel>
          <div>
            <Kicker>For OpenClaw, Claude Code &amp; shell agents</Kicker>
            <h2 className="mb-5 type-head-sb-4 tracking-tight md:type-head-sb-2">
              A CLI that any agent can run.
            </h2>
            <p className="mb-5 max-w-md type-body-r-m text-muted">
              <code className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">posthive-cli</code> mirrors the same API as a plain shell command. Every output is structured JSON perfect for agents that call shell tools rather than speak MCP directly, like OpenClaw or custom pipelines.
            </p>
            <p className="mb-6 max-w-md type-body-r-m text-muted">
              It ships with a bundled skill file so agents that support Claude Code-style skills discover the full command set, platform character limits, and best practices automatically.
            </p>
            <div className="rounded-lg border border-border bg-surface px-4 py-3.5 type-mono-r-xs">
              <div className="mb-1.5 text-muted">Install</div>
              <div className="text-brand-800">npx posthive-cli</div>
              <div className="text-brand-800">npm i -g posthive-cli</div>
              <div className="text-brand-800">npx skills add AstaBlackClove/posthive</div>
            </div>
          </div>
        </div>
      </section>

      <Rule />

      {/* ── SKILL.md ── */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:px-12 md:py-24">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-20">
          <div>
            <Kicker>Self-documenting</Kicker>
            <h2 className="mb-5 type-head-sb-4 tracking-tight md:type-head-sb-2">
              Agents learn the tool<br />by reading it.
            </h2>
            <p className="mb-5 max-w-md type-body-r-m text-muted">
              No prompt engineering required. The bundled <code className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">SKILL.md</code> describes every command, required flags, platform quirks (Instagram needs media, X has no links, LinkedIn rewards links in the first comment), and the draft-first workflow so any capable agent figures out the right call on its own.
            </p>
            <p className="max-w-md type-body-r-s italic text-muted">
              Try prompts like: <span className="text-fg">&ldquo;Schedule a LinkedIn post about our launch for tomorrow 9am with the link in the first comment&rdquo;</span> the agent handles the rest.
            </p>
          </div>
          <CodePanel filename="SKILL.md">
            <span className="text-muted">---</span>{"\n"}
            <span className="text-brand-800">name</span>{": posthive\n"}
            <span className="text-brand-800">description</span>{": Schedule social posts across multiple platforms\n"}
            <span className="text-muted">---</span>{"\n\n"}
            <span className="text-brand-800"># Workflow</span>{"\n"}
            {"1. accounts:list — get valid account IDs\n"}
            {"2. posts:create — saved as DRAFT by default\n"}
            {"3. posts:approve — promote a draft to scheduled\n\n"}
            {"Ships inside "}<span className="text-green-700">posthive-cli</span>{". Works with Claude Code,\nOpenClaw, and any agent that runs shell commands."}
          </CodePanel>
        </div>
      </section>

      <Rule />

      {/* ── Safety ── */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:px-12 md:py-24">
        <Kicker>Safety by default</Kicker>
        <h2 className="mb-12 type-head-sb-4 tracking-tight md:type-head-sb-2">
          Nothing goes live<br />without your approval.
        </h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {[
            {
              icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.4"/><path d="M4 10h16" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="14" r="1" fill="currentColor"/></svg>,
              title: "Drafts, not publishes",
              desc: "Every post an agent creates lands as a draft in your review queue. Nothing goes live until you or the agent explicitly approves it.",
            },
            {
              icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="1.4"/><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.4"/></svg>,
              title: "Explicit scheduling only",
              desc: "An agent can only skip the draft step by passing a future timestamp and being told to schedule directly never by default.",
            },
            {
              icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="4" y="9" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M8 9V6a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.4"/></svg>,
              title: "Scoped API keys",
              desc: "Agents authenticate with a revocable ph_ API key, never your login. Rotate or revoke access from Settings anytime.",
            },
          ].map(item => (
            <div key={item.title} className="card flex flex-col gap-3.5 p-6">
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-100 text-brand-800">
                {item.icon}
              </div>
              <h3 className="type-body-m-l">{item.title}</h3>
              <p className="type-body-r-s text-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Rule />

      {/* ── FAQ ── */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:px-12 md:py-24">
        <Kicker>FAQ</Kicker>
        <h2 className="mb-12 type-head-sb-4 tracking-tight md:type-head-sb-2">
          Frequently asked questions
        </h2>
        <div className="flex flex-col">
          {faqSchema.mainEntity.map((item, i) => (
            <details key={item.name} className={cn("border-t border-border py-5.5", i === faqSchema.mainEntity.length - 1 && "border-b")} {...(i === 0 ? { open: true } : {})}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 type-body-m-l [&::-webkit-details-marker]:hidden">
                {item.name}
                <span className="shrink-0 type-body-r-xl text-brand-800">+</span>
              </summary>
              <p className="mt-3.5 max-w-prose type-body-r-s text-muted">
                {item.acceptedAnswer.text}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-linear-to-b from-transparent to-brand-100/60 py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-5 md:px-12">
          <h2 className="mb-5 type-head-sb-3 tracking-tight md:type-head-sb-1">
            Wire up your agent<br />in minutes.
          </h2>
          <p className="mb-8 max-w-xl type-body-r-l text-muted">
            Generate an API key, drop it into your MCP config or export it for the CLI, and your agent is ready to draft posts across multi platforms.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/docs#mcp-overview" className="btn-primary px-6 py-3.5 type-body-sb-m">
              Read the docs
            </Link>
            <Link href="/register" className="btn-secondary px-6 py-3.5 type-body-sb-m">
              Start free trial
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
