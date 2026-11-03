"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "../lib/cn";

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
      className={cn("flex shrink-0 cursor-pointer items-center px-1 py-0.5 transition-colors", copied ? "text-brand-800" : "text-muted hover:text-fg")}
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
    file: "grokbot.jpg",
    label: "Grok Bot",
    steps: [
      {
        n: "01",
        title: "Open Connectors",
        desc: "Go to grok.com → Connectors → New Connector → Custom.",
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
        desc: "Grok Bot opens a browser window. Sign in and click Approve & connect.",
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
    <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-16">
      {/* Left: connector picker + authorize dialog */}
      <div>
        <div className="section-label mb-4">
          Hosted apps
        </div>
        <div className="mb-6 grid grid-cols-4 gap-2.5">
          {APPS.map((a, i) => (
            <button
              key={a.label}
              onClick={() => setSelected(i)}
              className={cn(
                "relative grid aspect-square cursor-pointer place-items-center rounded-xl border transition-colors",
                selected === i ? "border-brand-300 bg-brand-100" : "border-border hover:bg-surface",
              )}
            >
              <Image
                src={`/mcpfavicon/${a.file}`}
                alt={a.label}
                width={30}
                height={30}
                className="rounded-md"
              />
              <span
                className={cn(
                  "absolute bottom-1.5 type-body-r-xxs tracking-wide",
                  selected === i ? "text-brand-800" : "text-muted",
                )}
              >
                {a.label}
              </span>
            </button>
          ))}
        </div>

        {/* Authorize dialog — preview illustration */}
        <div className="relative rounded-xl border border-border bg-surface px-4.5 pt-4.5 pb-5 shadow-sm">
          <div className="absolute top-2.5 right-3 rounded-sm border border-border px-2 py-0.5 type-body-r-xxs uppercase tracking-widest text-muted">Preview</div>
          <div className="mb-4 flex items-center gap-3.5">
            <Image
              src={`/posthivemain.png`}
              alt={app.label}
              width={36}
              height={36}
              className="rounded-lg"
            />
            <svg width="20" height="12" viewBox="0 0 20 12" className="text-muted">
              <path
                d="M0 6h18M14 2l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.2"
                fill="none"
              />
            </svg>
            <Image
              src={`/mcpfavicon/${app.file}`}
              alt={app.label}
              width={36}
              height={36}
              className="rounded-lg"
            />
          </div>
          <div className="mb-1.5 type-body-m-m text-fg">
            Connect Posthive to {app.label}
          </div>
          <div className="mb-4 type-body-r-xs text-muted">
            Grants read + write access to your Posthive posts, accounts, and
            templates. Revoke anytime.
          </div>
          <button
            disabled
            className="btn-primary w-full rounded-lg py-2.5 disabled:cursor-default"
          >
            Approve &amp; connect
          </button>
        </div>
      </div>

      {/* Right: per-platform steps */}
      <ol className="flex flex-col gap-9">
        {app.steps.map((step) => (
          <li key={step.n} className="flex items-start gap-5">
            <div className="w-14 shrink-0 type-head-m-3 tracking-tight text-brand-800">
              {step.n}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 type-body-m-l text-fg">
                {step.title}
              </div>
              <div className="type-body-r-s text-muted">
                {step.desc}
              </div>
              {step.code && (
                <div className="mt-3 flex items-start gap-2 whitespace-pre-wrap break-all rounded-xl border border-border bg-surface p-4 type-mono-r-s text-fg">
                  <span className="min-w-0 flex-1">{step.code}</span>
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
