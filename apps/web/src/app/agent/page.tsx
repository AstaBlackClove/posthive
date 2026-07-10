import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { NavBar } from "../../components/LandingNav";
import { AgentSetupTabs } from "../../components/AgentSetupTabs";
import { PlatformIcon } from "../../components/PlatformIcon";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "https://posthive.co";

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Posthive Agent",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free to install, requires Posthive Pro/Team for MCP or a valid API key for CLI" },
  url: `${WEB_URL}/agent`,
  description: "Give any AI agent — Claude, Cursor, OpenClaw, or custom pipelines — the ability to schedule social media posts across 11 platforms via MCP or CLI.",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is posthive-mcp?",
      acceptedAnswer: { "@type": "Answer", text: "posthive-mcp is an MCP (Model Context Protocol) server you run with npx. It gives Claude Desktop, Cursor, Windsurf, and any MCP-compatible client tools to list accounts, create posts, and manage your Posthive queue." },
    },
    {
      "@type": "Question",
      name: "What is posthive-cli and how is it different from the MCP server?",
      acceptedAnswer: { "@type": "Answer", text: "posthive-cli is a shell command (`posthive`) that mirrors the same API. It's built for agents that run shell commands rather than speak MCP directly — OpenClaw, Claude Code skills, and custom automation pipelines. Every command outputs structured JSON." },
    },
    {
      "@type": "Question",
      name: "Will an AI agent publish posts without my approval?",
      acceptedAnswer: { "@type": "Answer", text: "No. Every post created by an agent is saved as a draft by default and appears in Posthive's review queue. Nothing publishes unless a human approves it, or the agent is explicitly told to schedule directly with a future timestamp." },
    },
    {
      "@type": "Question",
      name: "Do I need a paid plan to use the agent tools?",
      acceptedAnswer: { "@type": "Answer", text: "The MCP server requires a Pro or Team plan. The CLI works with any valid API key, which is also available on Pro and Team." },
    },
  ],
};

export const metadata: Metadata = {
  title: "Posthive Agent — Let AI Schedule Your Social Posts",
  description: "Give Claude, Cursor, OpenClaw, or any AI agent the ability to schedule posts across 11 social platforms. MCP server and CLI, both draft-first and human-approved.",
  keywords: ["AI social media agent", "MCP social media scheduler", "Claude social media", "OpenClaw skill", "AI agent posting tool", "posthive-mcp", "posthive-cli"],
  alternates: { canonical: `${WEB_URL}/agent` },
  openGraph: {
    title: "Posthive Agent — Let AI Schedule Your Social Posts",
    description: "MCP server and CLI that let any AI agent schedule posts across 11 platforms. Draft-first, human-approved, open source.",
    url: `${WEB_URL}/agent`,
    images: [{ url: "/og/landingogimage.png", width: 1200, height: 630, alt: "Posthive Agent — AI-powered social media scheduling" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Posthive Agent — Let AI Schedule Your Social Posts",
    description: "MCP server and CLI that let any AI agent schedule posts across 11 platforms.",
    images: ["/og/landingogimage.png"],
  },
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

const CLI_EXAMPLE = `export POSTHIVE_API_KEY=ph_yourkey

npx posthive-cli accounts:list

npx posthive-cli posts:create \\
  --content "Shipped v2.0 today" \\
  --accounts acc_bluesky,acc_threads \\
  --first-comment "Full changelog: https://example.com"

# → saved as a DRAFT — review it in Posthive → Posts
npx posthive-cli posts:list --status draft`;

const SKILL_EXAMPLE = `---
name: posthive
description: Schedule social posts across 11 platforms
---

# Workflow
1. accounts:list — get valid account IDs
2. posts:create — saved as DRAFT by default
3. posts:approve — promote a draft to scheduled

Ships inside posthive-cli. Works with Claude Code,
OpenClaw, and any agent that runs shell commands.`;

export default function AgentPage() {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#ededed", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <style>{`
        @media (max-width: 768px) {
          .agent-hero { font-size: 36px !important; }
          .agent-grid-2 { grid-template-columns: 1fr !important; }
          .agent-grid-3 { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .agent-chat-demo { padding: 14px 14px !important; }
        }
      `}</style>

      <NavBar user={false} ctaHref="/register" navCtaLabel="Get started free" />

      {/* ── Hero ── */}
      <section style={{ padding: "120px 24px 80px", textAlign: "center" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <h1 className="agent-hero" style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.1, color: "#ededed", margin: "0 0 24px" }}>
            <span style={{ display: "block", marginBottom: 14 }}>
              Let your <span style={{ display: "inline-block", background: "#5b63d3", color: "#fff", padding: "2px 16px 4px", borderRadius: 6, transform: "rotate(-1.5deg)", transformOrigin: "center" }}>AI agent</span>
            </span>
            <span style={{ display: "block" }}>run your socials.</span>
          </h1>
          <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "#666", lineHeight: 1.75, maxWidth: 620, margin: "0 auto 40px" }}>
            Claude, Cursor, OpenClaw, or any agent that can call a tool or run a shell command can now schedule posts across 11 platforms with you approving everything before it goes live.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 56 }}>
            <Link href="#setup" style={{ fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 10, background: "#5b63d3", color: "#fff", textDecoration: "none", boxShadow: "0 8px 24px -8px rgba(91,99,211,.7)" }}>
              Set up Posthive MCP
            </Link>
            <Link href="/docs#api-authentication" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 10, background: "#111", color: "#888", textDecoration: "none", border: "1px solid #2a2a2a" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
              Use the API
            </Link>
          </div>

          {/* Chat demo card */}
          <div className="agent-chat-demo" style={{ maxWidth: 560, margin: "0 auto", textAlign: "left", background: "#111111", border: "1px solid #2a2a2a", borderRadius: 16, padding: "18px 20px", boxShadow: "0 20px 60px -20px rgba(0,0,0,.6)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid #1e1e1e" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#e86b6b" }} />
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#d4a83c" }} />
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#5cb88a" }} />
              <span style={{ fontSize: 11, color: "#555", fontFamily: "monospace", marginLeft: 6 }}>Claude Code</span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
              <div style={{ maxWidth: "82%", background: "#1e2140", border: "1px solid #2e3266", borderRadius: "12px 12px 2px 12px", padding: "10px 14px" }}>
                <p style={{ fontSize: 13.5, color: "#dcdeff", margin: 0, lineHeight: 1.6 }}>
                  Schedule a post about our launch for tomorrow at 9am
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <span style={{ width: 26, height: 26, borderRadius: 7, background: "#131313", border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                <Image src="/posthivemain.png" alt="" width={15} height={15} />
              </span>
              <div style={{ maxWidth: "82%", background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: "12px 12px 12px 2px", padding: "10px 14px" }}>
                <p style={{ fontSize: 13.5, color: "#ccc", margin: "0 0 10px", lineHeight: 1.6 }}>
                  Draft created for tomorrow 9:00 AM. Review it before it goes live:
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["bluesky", "threads", "linkedin"].map(p => (
                    <span key={p} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#131313", border: "1px solid #2a2a2a", borderRadius: 999, padding: "3px 9px 3px 6px" }}>
                      <span style={{ width: 14, height: 14, borderRadius: 4, overflow: "hidden", display: "flex" }}>
                        <PlatformIcon platform={p} size={14} />
                      </span>
                      <span style={{ fontSize: 10.5, color: "#999", fontWeight: 600, textTransform: "capitalize" }}>{p}</span>
                    </span>
                  ))}
                  <span style={{ display: "inline-flex", alignItems: "center", fontSize: 10.5, fontWeight: 700, color: "#d4a83c", background: "rgba(212,168,60,.1)", border: "1px solid rgba(212,168,60,.25)", borderRadius: 999, padding: "3px 9px" }}>
                    DRAFT
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "#1e1e1e", borderRadius: 16, overflow: "hidden" }} className="agent-grid-2">
          {[
            { n: "11", label: "platforms" },
            { n: "10", label: "tools/commands" },
            { n: "2", label: "install paths" },
            { n: "100%", label: "draft-first" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#0d0d0d", padding: "28px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#9ba2ee", letterSpacing: "-.03em", lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 8, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Setup ── */}
      <section id="setup" style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#5b63d3", letterSpacing: ".14em", textTransform: "uppercase", margin: "0 0 12px" }}>Setup</p>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, color: "#ededed", letterSpacing: "-0.03em", margin: "0 0 40px" }}>
            Connect in three steps
          </h2>
          <AgentSetupTabs />
        </div>
      </section>

      {/* ── MCP ── */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 48 }}>
            <div style={{ width: 32, height: 3, background: "#3db8c8", borderRadius: 2 }} />
            <p style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: ".12em", textTransform: "uppercase", margin: 0 }}>For Claude Desktop, Cursor & Windsurf</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }} className="agent-grid-2">
            <div>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: "#ededed", letterSpacing: "-0.03em", margin: "0 0 16px" }}>
                One config block, full MCP access
              </h2>
              <p style={{ fontSize: 15, color: "#666", lineHeight: 1.75, margin: "0 0 24px" }}>
                Drop <code style={{ background: "#1a1a1a", padding: "2px 6px", borderRadius: 4, fontSize: 13, color: "#9ba2ee" }}>posthive-mcp</code> into any MCP client config and your agent instantly has tools to list accounts, create posts, approve drafts, and manage the queue — no server to run or maintain, npx handles it.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "list_accounts — connected accounts and IDs",
                  "create_post — draft or schedule directly",
                  "approve_draft — promote a draft to scheduled",
                  "update_post / duplicate_post / delete_post",
                  "list_templates / create_from_template",
                ].map((tool) => (
                  <div key={tool} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ color: "#3db8c8", flexShrink: 0, marginTop: 2 }}>✓</span>
                    <code style={{ fontSize: 13, color: "#888", lineHeight: 1.5 }}>{tool}</code>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ background: "#111", padding: "10px 16px", borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#e86b6b" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#d4a83c" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#5cb88a" }} />
                <span style={{ fontSize: 11, color: "#444", marginLeft: 8, fontFamily: "monospace" }}>claude_desktop_config.json</span>
              </div>
              <pre style={{ margin: 0, padding: "20px", fontFamily: "monospace", fontSize: 12.5, lineHeight: 1.8, color: "#aaa", overflowX: "auto", whiteSpace: "pre-wrap" }}>
                {MCP_CONFIG}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ── CLI ── */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 48 }}>
            <div style={{ width: 32, height: 3, background: "#5cb88a", borderRadius: 2 }} />
            <p style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: ".12em", textTransform: "uppercase", margin: 0 }}>For OpenClaw, Claude Code & shell-based agents</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }} className="agent-grid-2">
            <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ background: "#111", padding: "10px 16px", borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#e86b6b" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#d4a83c" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#5cb88a" }} />
                <span style={{ fontSize: 11, color: "#444", marginLeft: 8, fontFamily: "monospace" }}>terminal</span>
              </div>
              <pre style={{ margin: 0, padding: "20px", fontFamily: "monospace", fontSize: 12.5, lineHeight: 1.8, color: "#aaa", overflowX: "auto", whiteSpace: "pre-wrap" }}>
                {CLI_EXAMPLE}
              </pre>
            </div>
            <div>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: "#ededed", letterSpacing: "-0.03em", margin: "0 0 16px" }}>
                A CLI that any agent can run
              </h2>
              <p style={{ fontSize: 15, color: "#666", lineHeight: 1.75, margin: "0 0 16px" }}>
                <code style={{ background: "#1a1a1a", padding: "2px 6px", borderRadius: 4, fontSize: 13, color: "#5cb88a" }}>posthive-cli</code> mirrors the same API as a plain shell command. Every output is structured JSON — perfect for agents that call shell tools rather than speak MCP directly, like OpenClaw or custom pipelines.
              </p>
              <p style={{ fontSize: 15, color: "#666", lineHeight: 1.75, margin: "0 0 24px" }}>
                It ships with a bundled skill file so agents that support Claude Code-style skills discover the full command set, platform character limits, and best practices automatically.
              </p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(60,180,200,.08)", border: "1px solid rgba(60,180,200,.25)", borderRadius: 8, padding: "8px 14px" }}>
                <span style={{ fontSize: 13, color: "#3db8c8" }}>Install with <code style={{ color: "#3db8c8" }}>npx posthive-cli</code>, <code style={{ color: "#3db8c8" }}>npm i -g posthive-cli</code>, or as a skill via <code style={{ color: "#3db8c8" }}>npx skills add AstaBlackClove/posthive</code></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Skill ── */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 48 }}>
            <div style={{ width: 32, height: 3, background: "#d4a83c", borderRadius: 2 }} />
            <p style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: ".12em", textTransform: "uppercase", margin: 0 }}>Self-documenting</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }} className="agent-grid-2">
            <div>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: "#ededed", letterSpacing: "-0.03em", margin: "0 0 16px" }}>
                Agents learn the tool by reading it
              </h2>
              <p style={{ fontSize: 15, color: "#666", lineHeight: 1.75, margin: "0 0 16px" }}>
                No prompt engineering required. The bundled <code style={{ background: "#1a1a1a", padding: "2px 6px", borderRadius: 4, fontSize: 13, color: "#d4a83c" }}>SKILL.md</code> describes every command, required flags, platform quirks (Instagram needs media, X has no links, LinkedIn rewards links in the first comment), and the draft-first workflow — so any capable agent figures out the right call on its own.
              </p>
              <p style={{ fontSize: 15, color: "#666", lineHeight: 1.75, margin: 0 }}>
                Try prompts like: <em style={{ color: "#888" }}>&quot;Schedule a LinkedIn post about our launch for tomorrow 9am with the link in the first comment&quot;</em> — the agent handles the rest.
              </p>
            </div>
            <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ background: "#111", padding: "10px 16px", borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#e86b6b" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#d4a83c" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#5cb88a" }} />
                <span style={{ fontSize: 11, color: "#444", marginLeft: 8, fontFamily: "monospace" }}>SKILL.md</span>
              </div>
              <pre style={{ margin: 0, padding: "20px", fontFamily: "monospace", fontSize: 12.5, lineHeight: 1.8, color: "#aaa", overflowX: "auto", whiteSpace: "pre-wrap" }}>
                {SKILL_EXAMPLE}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ── Human in the loop ── */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 48 }}>
            <div style={{ width: 32, height: 3, background: "#e86b6b", borderRadius: 2 }} />
            <p style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: ".12em", textTransform: "uppercase", margin: 0 }}>Safety by default</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="agent-grid-3">
            {[
              { title: "Drafts, not publishes", desc: "Every post an agent creates lands as a draft in your review queue. Nothing goes live until you or the agent explicitly approves it." },
              { title: "Explicit scheduling only", desc: "An agent can only skip the draft step by passing a future timestamp and being told to schedule directly — never by default." },
              { title: "Scoped API keys", desc: "Agents authenticate with a revocable ph_ API key, never your login. Rotate or revoke access from Settings anytime." },
            ].map((item) => (
              <div key={item.title} style={{ borderLeft: "2px solid #e86b6b44", paddingLeft: 20 }}>
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
            Wire up your agent in minutes
          </h2>
          <p style={{ fontSize: 15, color: "#666", lineHeight: 1.75, marginBottom: 36 }}>
            Generate an API key, drop it into your MCP config or export it for the CLI, and your agent is ready to draft posts across all 11 platforms.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/docs#mcp-overview" style={{ display: "inline-block", fontSize: 15, fontWeight: 700, padding: "14px 32px", borderRadius: 10, background: "#5b63d3", color: "#fff", textDecoration: "none", boxShadow: "0 12px 32px -8px rgba(91,99,211,.6)" }}>
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
