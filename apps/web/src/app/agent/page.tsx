import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { AgentSetupSection } from "../../components/AgentSetupSection";
import { MarketingNavBar } from "../../components/MarketingNavBar";
import { LandingFooter } from "../../components/LandingFooter";

// ── Design tokens (Nocturne) ─────────────────────────────────────────────────
const T = {
  bg:        "#0a0a0a",
  surface:   "#111111",
  text:      "#ededed",
  muted:     "rgba(237,237,237,0.45)",
  muted72:   "rgba(237,237,237,0.65)",
  muted82:   "rgba(237,237,237,0.78)",
  accent:    "#5b63d3",
  accent2:   "#9ba2ee",
  a300:      "#9ba2ee",
  a900:      "#1e2140",
  n800:      "#2a2a2a",
  n900:      "#111111",
  n200:      "#cccccc",
  divider:   "rgba(237,237,237,0.1)",
  section:   "#0d0f1f",
  shadow:    "0 0 0 1px #595d6c, 0 6px 18px rgba(0,0,0,0.55)",
} as const;

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "https://posthive.co";

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
    { "@type": "Question", name: "What is posthive-cli and how is it different from the MCP server?", acceptedAnswer: { "@type": "Answer", text: "posthive-cli is a shell command (`posthive`) that mirrors the same API. It's built for agents that run shell commands rather than speak MCP directly — OpenClaw, Claude Code skills, and custom automation pipelines. Every command outputs structured JSON." } },
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
  return (
    <hr style={{
      height: 1, border: 0, margin: 0,
      background: `linear-gradient(to right, transparent, ${T.divider} 48px, ${T.divider} calc(100% - 48px), transparent)`,
    }} />
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 12,
      fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase",
      color: T.accent, marginBottom: 20,
    }}>
      <span style={{ width: 32, height: 1, background: T.accent, display: "block", flexShrink: 0 }} />
      {children}
    </div>
  );
}

function CodePanel({ filename, children, copyable }: { filename: string; children: React.ReactNode; copyable?: boolean }) {
  return (
    <div style={{ borderRadius: 12, background: T.n900, overflow: "hidden", boxShadow: T.shadow }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderBottom: `1px solid ${T.divider}`,
        fontFamily: "ui-monospace,monospace", fontSize: 12,
      }}>
        <span style={{ color: T.muted }}>{filename}</span>
        {copyable && <span style={{ color: T.accent, fontSize: 11, letterSpacing: "0.08em", cursor: "pointer" }}>COPY</span>}
      </div>
      <pre style={{
        margin: 0, padding: 20,
        fontFamily: "ui-monospace,monospace", fontSize: 13, lineHeight: 1.65,
        color: T.n200, overflowX: "auto",
      }}>
        {children}
      </pre>
    </div>
  );
}

function TerminalPanel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 12, background: T.n900, overflow: "hidden", boxShadow: T.shadow }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "12px 16px", borderBottom: `1px solid ${T.divider}`,
      }}>
        {["#3f424d","#3f424d","#3f424d"].map((c,i) => (
          <span key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c, display: "block" }} />
        ))}
        <span style={{ marginLeft: 10, fontSize: 12, color: T.muted, fontFamily: "ui-monospace,monospace" }}>terminal</span>
      </div>
      <pre style={{
        margin: 0, padding: 20,
        fontFamily: "ui-monospace,monospace", fontSize: 13, lineHeight: 1.7,
        color: T.n200, overflowX: "auto",
      }}>
        {children}
      </pre>
    </div>
  );
}

const WRAP: React.CSSProperties = { maxWidth: 1200, margin: "0 auto", padding: "0 clamp(20px,5vw,72px)" };
const LEADING = 28;
const py = (n: number) => `${n * LEADING}px`;

export default function AgentPage() {
  return (
    <div className="mkt" style={{
      background: `
        radial-gradient(1100px 640px at 88% -180px, color-mix(in srgb, ${T.a900} 70%, transparent), transparent 60%),
        radial-gradient(900px 700px at -8% 110%, color-mix(in srgb, black 30%, transparent), transparent 55%),
        ${T.bg}
      `,
      minHeight: "100vh", color: T.text,
      fontFamily: "var(--font-figtree), system-ui, sans-serif",
    }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        .agent-hero-grid { display: grid; grid-template-columns: 1.05fr 1fr; gap: 80px; align-items: center; }
        .agent-setup-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: start; }
        .agent-split-grid { display: grid; grid-template-columns: 1fr 1.15fr; gap: 80px; align-items: start; }
        .agent-split-grid-r { display: grid; grid-template-columns: 1.15fr 1fr; gap: 80px; align-items: start; }
        .agent-skill-grid { display: grid; grid-template-columns: 1fr 1.1fr; gap: 80px; align-items: center; }
        .agent-safety-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; }
        .agent-stat-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 32px; }
        .agent-connector-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 32px; }
        @media (max-width: 900px) {
          .agent-hero-grid, .agent-setup-grid, .agent-split-grid, .agent-split-grid-r, .agent-skill-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .agent-safety-grid { grid-template-columns: 1fr !important; }
          .agent-stat-grid { grid-template-columns: repeat(2,1fr) !important; }
          .agent-connector-grid { grid-template-columns: repeat(4,1fr) !important; }
        }
        @media (max-width: 480px) {
          .agent-connector-grid { grid-template-columns: repeat(4,1fr) !important; }
          .agent-stat-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
        details summary::-webkit-details-marker { display: none; }
      `}</style>

      <MarketingNavBar />

      {/* ── Hero ── */}
      <section style={{ ...WRAP, padding: `${py(3.5)} clamp(20px,5vw,72px) ${py(3)}` }}>
        <div className="agent-hero-grid">
          <div>
            <Kicker>Posthive Agent · MCP + CLI</Kicker>
            <h1 style={{
              fontSize: "clamp(40px,5.6vw,72px)", lineHeight: 1.05,
              letterSpacing: "-0.02em", margin: 0, fontWeight: 500,
            }}>
              Let your AI&nbsp;agent<br />run your&nbsp;socials.
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.55, maxWidth: "58ch", color: T.muted82, marginTop: 28 }}>
              Claude, Cursor, OpenClaw, or any agent that can call a tool or run a shell command can now schedule posts across multi platforms with you approving everything before it goes live.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
              <Link href="#setup" style={{
                display: "inline-flex", alignItems: "center",
                padding: "12px 20px", fontSize: 14, fontWeight: 700,
                borderRadius: 10, background: "#5b63d3", color: "#fff",
                textDecoration: "none", boxShadow: "0 8px 24px -8px rgba(91,99,211,.7)",
              }}>
                Set up Posthive MCP
              </Link>
              <Link href="/docs#api-authentication" style={{
                display: "inline-flex", alignItems: "center",
                padding: "12px 20px", fontSize: 14, fontWeight: 700,
                borderRadius: 10, background: "#111", color: "#888",
                textDecoration: "none", border: "1px solid #2a2a2a",
              }}>
                Use the API
              </Link>
            </div>
            <div style={{ display: "flex", gap: 24, marginTop: 36, color: T.muted, fontSize: 13, flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80", display: "block" }} />
                API live · 99.98% uptime
              </span>
              <span>AGPL-3.0 · open source</span>
            </div>
          </div>

          {/* Claude Code preview */}
          <div style={{ position: "relative" }}>
            <div style={{ borderRadius: 14, background: T.surface, overflow: "hidden", boxShadow: T.shadow }}>
              {/* title bar */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                borderBottom: `1px solid ${T.divider}`, fontSize: 12, color: T.muted,
              }}>
                {["#3f424d","#3f424d","#3f424d"].map((c,i) => (
                  <span key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c, display: "block" }} />
                ))}
                <span style={{ marginLeft: 10, letterSpacing: "0.06em" }}>Claude Code</span>
              </div>
              {/* chat */}
              <div style={{ padding: "20px 20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
                {/* user turn */}
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6, background: T.n800,
                    display: "grid", placeItems: "center", fontSize: 11,
                    color: "rgba(233,233,237,0.6)", flexShrink: 0,
                  }}>G</div>
                  <div style={{ fontSize: 14, lineHeight: 1.5, paddingTop: 2 }}>
                    Schedule a post about our launch for tomorrow at 9am.
                  </div>
                </div>
                {/* assistant */}
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: `color-mix(in srgb, ${T.accent} 20%, ${T.surface})`,
                    display: "grid", placeItems: "center", flexShrink: 0,
                  }}>
                    <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                      <path d="M10 1.5l7.5 4.25v8.5L10 18.5 2.5 14.25v-8.5L10 1.5z" stroke={T.accent} strokeWidth="1.4"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                    Draft created for tomorrow, 9:00 AM. Review before it goes live.
                  </div>
                </div>
                {/* draft card */}
                <div style={{
                  border: `1px solid ${T.divider}`, borderRadius: 10, padding: 14,
                  marginLeft: 36, background: `color-mix(in srgb, ${T.bg} 60%, transparent)`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 11, letterSpacing: "0.12em", color: T.muted }}>SCHEDULED · JUN 14 · 09:00</span>
                    <span style={{ fontSize: 11, padding: "3px 10px", border: `1px solid ${T.accent}`, color: T.accent, borderRadius: 6 }}>DRAFT</span>
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.55, color: T.muted82, marginBottom: 12 }}>
                    Shipped v2.0 today — drag-to-reschedule calendar, per-platform overrides, and first-comment on every platform. Try it free →
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {["bsky.app","threads.net","linkedin.com","mastodon.social"].map(d => (
                      <img key={d} src={`https://www.google.com/s2/favicons?domain=${d}&sz=32`} width={16} height={16} alt={d} style={{ borderRadius: 3 }} />
                    ))}
                    <span style={{ fontSize: 11, color: T.muted, marginLeft: 6 }}>4 accounts</span>
                    <span style={{ marginLeft: "auto", fontSize: 11, color: T.accent }}>approve →</span>
                  </div>
                </div>
                {/* tool call */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, marginLeft: 36,
                  fontSize: 11, color: T.muted, fontFamily: "ui-monospace,monospace",
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent, display: "block" }} />
                  posthive.create_post · 128 tokens
                </div>
              </div>
            </div>
            {/* floating chip */}
            <div style={{
              position: "absolute", bottom: -18, left: -24,
              background: T.bg, padding: "10px 14px", borderRadius: 10,
              display: "flex", alignItems: "center", gap: 10, fontSize: 12,
              boxShadow: "0 0 0 1px #3f424d",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "block" }} />
              Draft-first · nothing publishes without you
            </div>
          </div>
        </div>
      </section>

      <Rule />

      {/* ── Stat band ── */}
      <section style={{
        background: `linear-gradient(180deg, ${T.section} 0%, color-mix(in srgb, ${T.section} 82%, black) 100%)`,
        padding: `${py(2)} 0`,
      }}>
        <div style={WRAP}>
          <div className="agent-stat-grid">
            {[
              { n: "13", label: "Platforms" },
              { n: "10", label: "Tools · commands" },
              { n: "2",  label: "Install paths" },
              { n: "100%", label: "Draft-first" },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 48, lineHeight: 1, fontWeight: 500, letterSpacing: "-0.03em" }}>{s.n}</div>
                <div style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(231,229,254,0.75)", marginTop: 10 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Setup ── */}
      <section id="setup" style={{ ...WRAP, padding: `${py(3.5)} clamp(20px,5vw,72px) ${py(2.5)}` }}>
        <Kicker>Setup</Kicker>
        <h2 style={{ fontSize: "clamp(30px,3.6vw,44px)", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 20px", maxWidth: "24ch", fontWeight: 500 }}>
          Connect in three steps.
        </h2>
        <p style={{ fontSize: 18, lineHeight: 1.55, maxWidth: "58ch", color: T.muted82, marginBottom: 56 }}>
          One-click for the hosted apps that ship an MCP UI — Claude, ChatGPT, Cursor, Windsurf, Codex, VS Code. Config-file or shell for everything else.
        </p>

        <AgentSetupSection />
      </section>

      <Rule />

      {/* ── MCP config ── */}
      <section style={{ ...WRAP, padding: `${py(3)} clamp(20px,5vw,72px)` }}>
        <div className="agent-split-grid">
          <div>
            <Kicker>For Claude Desktop, Cursor &amp; Windsurf</Kicker>
            <h2 style={{ fontSize: "clamp(28px,3.2vw,40px)", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 20px", fontWeight: 500 }}>
              One config block,<br />full MCP access.
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: T.muted72, marginBottom: 28, maxWidth: "44ch" }}>
              Drop <code style={{ color: T.a300, background: `color-mix(in srgb, ${T.accent} 10%, transparent)`, padding: "2px 6px", borderRadius: 4, fontSize: 13 }}>posthive-mcp</code> into any MCP client config and your agent instantly has tools to list accounts, create posts, approve drafts, and manage the queue — no server to run or maintain, npx handles it.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                ["list_accounts", "— connected accounts and IDs"],
                ["create_post", "— draft or schedule directly"],
                ["approve_draft", "— promote a draft to scheduled"],
                ["update_post / duplicate_post / delete_post", ""],
                ["list_templates / create_from_template", ""],
              ].map(([cmd, desc]) => (
                <li key={cmd} style={{ display: "flex", gap: 12, alignItems: "baseline", fontSize: 13 }}>
                  <span style={{ color: T.accent }}>✓</span>
                  <code style={{ fontSize: 13 }}>{cmd}</code>
                  {desc && <span style={{ color: T.muted }}>{desc}</span>}
                </li>
              ))}
            </ul>
          </div>
          <CodePanel filename="claude_desktop_config.json" copyable>
            <span style={{ color: T.muted }}>{"{"}</span>{"\n"}
            {"  "}<span style={{ color: T.a300 }}>&quot;mcpServers&quot;</span>{": {"}{"\n"}
            {"    "}<span style={{ color: T.a300 }}>&quot;posthive&quot;</span>{": {"}{"\n"}
            {"      "}<span style={{ color: T.a300 }}>&quot;command&quot;</span>{": "}<span style={{ color: "#c8e6c9" }}>&quot;npx&quot;</span>{","}{"\n"}
            {"      "}<span style={{ color: T.a300 }}>&quot;args&quot;</span>{": ["}<span style={{ color: "#c8e6c9" }}>&quot;posthive-mcp&quot;</span>{"],"}{"\n"}
            {"      "}<span style={{ color: T.a300 }}>&quot;env&quot;</span>{": {"}{"\n"}
            {"        "}<span style={{ color: T.a300 }}>&quot;POSTHIVE_API_KEY&quot;</span>{": "}<span style={{ color: "#c8e6c9" }}>&quot;ph_yourkey&quot;</span>{","}{"\n"}
            {"        "}<span style={{ color: T.a300 }}>&quot;POSTHIVE_API_URL&quot;</span>{": "}<span style={{ color: "#c8e6c9" }}>&quot;https://api.posthive.co&quot;</span>{"\n"}
            {"      }"}{"\n"}
            {"    }"}{"\n"}
            {"  }"}{"\n"}
            <span style={{ color: T.muted }}>{"}"}</span>
          </CodePanel>
        </div>
      </section>

      <Rule />

      {/* ── CLI ── */}
      <section style={{ ...WRAP, padding: `${py(3)} clamp(20px,5vw,72px)` }}>
        <div className="agent-split-grid-r">
          <TerminalPanel>
            {CLI_EXAMPLE.split("\n").map((line, i) => {
              const isComment = line.startsWith("#");
              const isPrompt = line.startsWith("$");
              return (
                <span key={i} style={{ display: "block", color: isComment ? T.muted : isPrompt ? T.muted : T.n200 }}>
                  {isPrompt ? (
                    <><span style={{ color: T.muted }}>$</span>{line.slice(1)}</>
                  ) : line}
                </span>
              );
            })}
          </TerminalPanel>
          <div>
            <Kicker>For OpenClaw, Claude Code &amp; shell agents</Kicker>
            <h2 style={{ fontSize: "clamp(28px,3.2vw,40px)", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 20px", fontWeight: 500 }}>
              A CLI that any agent can run.
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: T.muted72, marginBottom: 20, maxWidth: "48ch" }}>
              <code style={{ color: T.a300, background: `color-mix(in srgb, ${T.accent} 10%, transparent)`, padding: "2px 6px", borderRadius: 4, fontSize: 13 }}>posthive-cli</code> mirrors the same API as a plain shell command. Every output is structured JSON — perfect for agents that call shell tools rather than speak MCP directly, like OpenClaw or custom pipelines.
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: T.muted72, marginBottom: 24, maxWidth: "48ch" }}>
              It ships with a bundled skill file so agents that support Claude Code-style skills discover the full command set, platform character limits, and best practices automatically.
            </p>
            <div style={{
              padding: "14px 16px", border: `1px solid ${T.divider}`, borderRadius: 8,
              fontFamily: "ui-monospace,monospace", fontSize: 12, lineHeight: 1.7,
              background: `color-mix(in srgb, ${T.bg} 55%, transparent)`,
            }}>
              <div style={{ color: T.muted, marginBottom: 6 }}>Install</div>
              <div style={{ color: T.a300 }}>npx posthive-cli</div>
              <div style={{ color: T.a300 }}>npm i -g posthive-cli</div>
              <div style={{ color: T.a300 }}>npx skills add AstaBlackClove/posthive</div>
            </div>
          </div>
        </div>
      </section>

      <Rule />

      {/* ── SKILL.md ── */}
      <section style={{ ...WRAP, padding: `${py(3)} clamp(20px,5vw,72px)` }}>
        <div className="agent-skill-grid">
          <div>
            <Kicker>Self-documenting</Kicker>
            <h2 style={{ fontSize: "clamp(28px,3.2vw,40px)", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 20px", fontWeight: 500 }}>
              Agents learn the tool<br />by reading it.
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: T.muted72, marginBottom: 20, maxWidth: "46ch" }}>
              No prompt engineering required. The bundled <code style={{ color: T.a300, background: `color-mix(in srgb, ${T.accent} 10%, transparent)`, padding: "2px 6px", borderRadius: 4, fontSize: 13 }}>SKILL.md</code> describes every command, required flags, platform quirks (Instagram needs media, X has no links, LinkedIn rewards links in the first comment), and the draft-first workflow — so any capable agent figures out the right call on its own.
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: T.muted, fontStyle: "italic", maxWidth: "46ch" }}>
              Try prompts like: <span style={{ color: T.text }}>&ldquo;Schedule a LinkedIn post about our launch for tomorrow 9am with the link in the first comment&rdquo;</span> — the agent handles the rest.
            </p>
          </div>
          <CodePanel filename="SKILL.md">
            <span style={{ color: T.muted }}>---</span>{"\n"}
            <span style={{ color: T.a300 }}>name</span>{": posthive\n"}
            <span style={{ color: T.a300 }}>description</span>{": Schedule social posts across multiple platforms\n"}
            <span style={{ color: T.muted }}>---</span>{"\n\n"}
            <span style={{ color: T.accent }}># Workflow</span>{"\n"}
            {"1. accounts:list — get valid account IDs\n"}
            {"2. posts:create — saved as DRAFT by default\n"}
            {"3. posts:approve — promote a draft to scheduled\n\n"}
            {"Ships inside "}<span style={{ color: "#c8e6c9" }}>posthive-cli</span>{". Works with Claude Code,\nOpenClaw, and any agent that runs shell commands."}
          </CodePanel>
        </div>
      </section>

      <Rule />

      {/* ── Safety ── */}
      <section style={{ ...WRAP, padding: `${py(3)} clamp(20px,5vw,72px)` }}>
        <Kicker>Safety by default</Kicker>
        <h2 style={{ fontSize: "clamp(28px,3.2vw,40px)", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 48px", maxWidth: "20ch", fontWeight: 500 }}>
          Nothing goes live<br />without your approval.
        </h2>
        <div className="agent-safety-grid">
          {[
            {
              icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M4 6h16v12H4z" stroke={T.accent} strokeWidth="1.4"/><path d="M4 10h16" stroke={T.accent} strokeWidth="1.4"/><circle cx="8" cy="14" r="1" fill={T.accent}/></svg>,
              title: "Drafts, not publishes",
              desc: "Every post an agent creates lands as a draft in your review queue. Nothing goes live until you or the agent explicitly approves it.",
            },
            {
              icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 3v18M3 12h18" stroke={T.accent} strokeWidth="1.4"/><circle cx="12" cy="12" r="8" stroke={T.accent} strokeWidth="1.4"/></svg>,
              title: "Explicit scheduling only",
              desc: "An agent can only skip the draft step by passing a future timestamp and being told to schedule directly — never by default.",
            },
            {
              icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="4" y="9" width="16" height="12" rx="2" stroke={T.accent} strokeWidth="1.4"/><path d="M8 9V6a4 4 0 018 0v3" stroke={T.accent} strokeWidth="1.4"/></svg>,
              title: "Scoped API keys",
              desc: "Agents authenticate with a revocable ph_ API key, never your login. Rotate or revoke access from Settings anytime.",
            },
          ].map(item => (
            <div key={item.title} style={{
              padding: 28, border: `1px solid ${T.divider}`, borderRadius: 12,
              background: `color-mix(in srgb, ${T.surface} 60%, transparent)`,
              display: "flex", flexDirection: "column", gap: 14,
            }}>
              {item.icon}
              <h3 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>{item.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: T.muted72, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Rule />

      {/* ── FAQ ── */}
      <section style={{ ...WRAP, padding: `${py(3)} clamp(20px,5vw,72px)` }}>
        <Kicker>FAQ</Kicker>
        <h2 style={{ fontSize: "clamp(28px,3.2vw,40px)", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 48px", fontWeight: 500 }}>
          Frequently asked questions
        </h2>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {faqSchema.mainEntity.map((item, i) => (
            <details key={item.name} style={{ padding: "22px 0", borderTop: `1px solid ${T.divider}`, ...(i === faqSchema.mainEntity.length - 1 ? { borderBottom: `1px solid ${T.divider}` } : {}) }} {...(i === 0 ? { open: true } : {})}>
              <summary style={{
                cursor: "pointer", fontSize: 17, fontWeight: 500,
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                {item.name}
                <span style={{ color: T.accent, fontSize: 20, fontWeight: 400 }}>+</span>
              </summary>
              <p style={{ margin: "14px 0 0", fontSize: 14, lineHeight: 1.65, color: T.muted72, maxWidth: "70ch" }}>
                {item.acceptedAnswer.text}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        background: `linear-gradient(180deg, transparent 0%, color-mix(in srgb, ${T.a900} 32%, transparent) 100%)`,
        padding: `${py(4)} 0`,
      }}>
        <div style={{ ...WRAP, maxWidth: 900 }}>
          <h2 style={{ fontSize: "clamp(32px,4vw,56px)", letterSpacing: "-0.025em", lineHeight: 1.05, margin: "0 0 20px", fontWeight: 500 }}>
            Wire up your agent<br />in minutes.
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: T.muted72, marginBottom: 32, maxWidth: "56ch" }}>
            Generate an API key, drop it into your MCP config or export it for the CLI, and your agent is ready to draft posts across multi platforms.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/docs#mcp-overview" style={{
              display: "inline-flex", alignItems: "center",
              padding: "14px 24px", fontSize: 15, fontWeight: 700,
              borderRadius: 10, background: "#5b63d3", color: "#fff",
              textDecoration: "none", boxShadow: "0 12px 32px -8px rgba(91,99,211,.6)",
            }}>
              Read the docs
            </Link>
            <Link href="/register" style={{
              display: "inline-flex", alignItems: "center",
              padding: "14px 24px", fontSize: 15, fontWeight: 700,
              borderRadius: 10, background: "#111", color: "#888",
              textDecoration: "none", border: "1px solid #2a2a2a",
            }}>
              Start free trial
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
