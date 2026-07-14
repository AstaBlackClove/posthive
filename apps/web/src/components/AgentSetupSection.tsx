"use client";

import { useState } from "react";
import Image from "next/image";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      title="Copy"
      style={{
        flexShrink: 0,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "2px 4px",
        color: copied ? "#5b63d3" : "rgba(237,237,237,0.35)",
        display: "flex",
        alignItems: "center",
        transition: "color 0.15s",
      }}
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

const T = {
  bg: "#0a0a0a",
  surface: "#111111",
  text: "#ededed",
  muted: "rgba(237,237,237,0.45)",
  muted72: "rgba(237,237,237,0.65)",
  accent: "#5b63d3",
  a300: "#9ba2ee",
  divider: "rgba(237,237,237,0.1)",
  shadow: "0 0 0 1px #595d6c, 0 6px 18px rgba(0,0,0,0.55)",
} as const;

interface AppStep {
  n: string;
  title: string;
  desc: string;
  code?: string;
}

interface AppSetup {
  file: string;
  label: string;
  steps: AppStep[];
}

const APPS: AppSetup[] = [
  {
    file: "claude.jpg",
    label: "Claude",
    steps: [
      {
        n: "01",
        title: "Open Connectors",
        desc: "Go to claude.ai → sidebar Customize → Connectors → Add → Add custom connector.",
      },
      {
        n: "02",
        title: "Paste the MCP URL",
        desc: "Enter the Posthive MCP URL and click Add.",
        code: "https://api.posthive.co/mcp",
      },
      {
        n: "03",
        title: "Sign in with Posthive",
        desc: "Claude opens a browser window. Sign in and click Approve & connect.",
      },
    ],
  },
  {
    file: "chatgpt.jpg",
    label: "ChatGPT",
    steps: [
      {
        n: "01",
        title: "Enable Developer Mode",
        desc: "Go to chatgpt.com → profile → Settings → enable Developer mode. This unlocks the Plugins sidebar.",
      },
      {
        n: "02",
        title: "Add via Plugins sidebar",
        desc: "Open the Plugins section in the sidebar → click the + icon → paste the Posthive MCP URL.",
        code: "https://api.posthive.co/mcp",
      },
      {
        n: "03",
        title: "Sign in with Posthive",
        desc: "ChatGPT opens a browser window. Sign in and click Approve & connect. (Posthive is also submitted to the official plugin directory — pending review.)",
      },
    ],
  },
  {
    file: "claudecode.jpg",
    label: "Claude Code",
    steps: [
      {
        n: "01",
        title: "Run one command",
        desc: "In your terminal, add Posthive as an MCP server:",
        code: "claude mcp add --transport http posthive https://api.posthive.co/mcp",
      },
      {
        n: "02",
        title: "Sign in with Posthive",
        desc: "Claude Code opens a browser window. Sign in to your Posthive account and click Approve & connect.",
      },
      {
        n: "03",
        title: "Done",
        desc: 'Start a new Claude Code session. Type "list my Posthive accounts" to verify it\'s connected.',
      },
    ],
  },
  {
    file: "cursor.jpg",
    label: "Cursor",
    steps: [
      {
        n: "01",
        title: "Add to .cursor/mcp.json",
        desc: "Create or edit .cursor/mcp.json in your project root:",
        code: `{
  "mcpServers": {
    "posthive": {
      "url": "https://api.posthive.co/mcp"
    }
  }
}`,
      },
      {
        n: "02",
        title: "Sign in with Posthive",
        desc: "Cursor opens a browser window. Sign in to your Posthive account and click Approve & connect.",
      },
      {
        n: "03",
        title: "Done",
        desc: "Restart Cursor. The Posthive tools appear in the MCP panel automatically.",
      },
    ],
  },
  {
    file: "vscode.jpg",
    label: "VS Code",
    steps: [
      {
        n: "01",
        title: "Add to .vscode/mcp.json",
        desc: "Create or edit .vscode/mcp.json in your project root:",
        code: `{
  "servers": {
    "posthive": {
      "type": "http",
      "url": "https://api.posthive.co/mcp"
    }
  }
}`,
      },
      {
        n: "02",
        title: "Sign in with Posthive",
        desc: "VS Code opens a browser window. Sign in to your Posthive account and click Approve & connect.",
      },
      {
        n: "03",
        title: "Enable in Copilot Chat",
        desc: "Open Copilot Chat → Agent mode → click the tools icon → enable Posthive.",
      },
    ],
  },
  {
    file: "codex.jpg",
    label: "Codex",
    steps: [
      {
        n: "01",
        title: "Edit the Codex config",
        desc: "Open your Codex config file in a text editor:",
        code: "vim ~/.codex/config.toml",
      },
      {
        n: "02",
        title: "Add the MCP server",
        desc: "Paste the Posthive MCP block into your config:",
        code: `[mcp_servers.posthive]
url = "https://api.posthive.co/mcp"`,
      },
      {
        n: "03",
        title: "Sign in with Posthive",
        desc: "Restart Codex. It opens a browser window — sign in and click Approve & connect.",
      },
    ],
  },
  {
    file: "openclaw.jpg",
    label: "OpenClaw",
    steps: [
      {
        n: "01",
        title: "Register the MCP server",
        desc: "In your terminal, run one command to add Posthive:",
        code: `openclaw mcp set posthive '{"url":"https://api.posthive.co/mcp","transport":"streamable-http"}'`,
      },
      {
        n: "02",
        title: "Sign in with Posthive",
        desc: "OpenClaw opens a browser window. Sign in to your Posthive account and click Approve & connect.",
      },
      {
        n: "03",
        title: "Done",
        desc: "OpenClaw imports all 10 Posthive tools automatically.",
      },
    ],
  },
  {
    file: "hermes.jpg",
    label: "Hermes",
    steps: [
      {
        n: "01",
        title: "Edit the Hermes config",
        desc: "Open your Hermes config file:",
        code: "vim ~/.hermes/config.yaml",
      },
      {
        n: "02",
        title: "Add the MCP server",
        desc: "Paste the Posthive MCP block:",
        code: `mcp_servers:
  posthive:
    url: "https://api.posthive.co/mcp"`,
      },
      {
        n: "03",
        title: "Sign in with Posthive",
        desc: "Restart Hermes. It opens a browser window — sign in and click Approve & connect.",
      },
    ],
  },
];

export function AgentSetupSection() {
  const [selected, setSelected] = useState(0);
  const app = APPS[selected];

  return (
    <div className="agent-setup-grid">
      {/* Left: connector picker + authorize dialog */}
      <div>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: T.muted,
            marginBottom: 16,
          }}
        >
          Hosted apps
        </div>
        <div className="agent-connector-grid" style={{ marginBottom: 24 }}>
          {APPS.map((a, i) => (
            <button
              key={a.label}
              onClick={() => setSelected(i)}
              style={{
                aspectRatio: "1",
                borderRadius: 10,
                position: "relative",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                border:
                  selected === i
                    ? `1px solid ${T.accent}`
                    : `1px solid ${T.divider}`,
                background:
                  selected === i ? "rgba(91,99,211,0.1)" : "transparent",
                padding: 0,
              }}
            >
              <Image
                src={`/mcpfavicon/${a.file}`}
                alt={a.label}
                width={30}
                height={30}
                style={{ borderRadius: 6 }}
              />
              <span
                style={{
                  position: "absolute",
                  bottom: 6,
                  fontSize: 10,
                  color: selected === i ? T.accent : T.muted,
                  letterSpacing: "0.06em",
                }}
              >
                {a.label}
              </span>
            </button>
          ))}
        </div>

        {/* Authorize dialog */}
        <div
          style={{
            borderRadius: 12,
            background: T.surface,
            padding: "18px 18px 20px",
            boxShadow: T.shadow,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 16,
            }}
          >
            <Image
              src={`/posthivemain.png`}
              alt={app.label}
              width={36}
              height={36}
              style={{ borderRadius: 8 }}
            />
            <svg width="20" height="12" viewBox="0 0 20 12">
              <path
                d="M0 6h18M14 2l4 4-4 4"
                stroke={T.muted}
                strokeWidth="1.2"
                fill="none"
              />
            </svg>
            <Image
              src={`/mcpfavicon/${app.file}`}
              alt={app.label}
              width={36}
              height={36}
              style={{ borderRadius: 8 }}
            />
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 500,
              marginBottom: 6,
              color: T.text,
            }}
          >
            Connect Posthive to {app.label}
          </div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>
            Grants read + write access to your Posthive posts, accounts, and
            templates. Revoke anytime.
          </div>
          <button
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              cursor: "pointer",
              border: "none",
              color: "#fff",
              background: "#5b63d3",
              fontSize: 14,
              fontFamily: "inherit",
              fontWeight: 700,
            }}
          >
            Approve &amp; connect
          </button>
        </div>
      </div>

      {/* Right: per-platform steps */}
      <ol
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 36,
        }}
      >
        {app.steps.map((step) => (
          <li
            key={step.n}
            style={{
              display: "grid",
              gridTemplateColumns: "56px 1fr",
              gap: 20,
              alignItems: "start",
            }}
          >
            <div
              style={{
                fontSize: 32,
                fontWeight: 500,
                color: T.accent,
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              {step.n}
            </div>
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 500,
                  marginBottom: 6,
                  color: T.text,
                }}
              >
                {step.title}
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.55, color: T.muted72 }}>
                {step.desc}
              </div>
              {step.code && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "10px 14px",
                    border: `1px solid ${T.divider}`,
                    borderRadius: 8,
                    fontFamily: "ui-monospace,monospace",
                    fontSize: 12,
                    color: T.a300,
                    background: "rgba(0,0,0,0.4)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <span style={{ flex: 1 }}>{step.code}</span>
                  <CopyButton text={step.code} />
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
