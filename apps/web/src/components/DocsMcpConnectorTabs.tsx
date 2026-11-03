"use client";

import { useState, type ReactNode } from "react";
import { cn } from "../lib/cn";

function CopyCode({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2.5 mb-3.5 flex items-start gap-2 whitespace-pre-wrap break-all rounded-xl border border-border bg-surface p-4 type-mono-r-s text-fg">
      <span className="min-w-0 flex-1">{children}</span>
      <button
        onClick={() => { navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className={cn("shrink-0 cursor-pointer px-1 py-0.5 transition-colors", copied ? "text-brand-800" : "text-muted hover:text-fg")}
      >
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
        )}
      </button>
    </div>
  );
}

// Same look as the warn Callout on the docs page
function Warn({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 mb-6 flex items-start gap-3 rounded-xl border border-brand-400 bg-brand-100 px-5 py-4 text-brand-800">
      <span className="shrink-0 type-body-r-m">⚠</span>
      <div className="min-w-0 type-body-r-s">{children}</div>
    </div>
  );
}

const CONNECTORS = [
  {
    id: "mcp-claudeai",
    label: "Claude",
    content: (
      <>
        <p className="mb-4 type-body-r-m text-muted">Streamable HTTP MCP endpoint — no local binary required. Claude handles OAuth automatically.</p>
        <p className="mb-4 type-body-r-m text-muted"><strong>Steps:</strong></p>
        <p className="mb-4 type-body-r-m text-muted">1. Go to <strong>Claude.ai → Settings → Connectors → Add custom connector</strong></p>
        <p className="mb-4 type-body-r-m text-muted">2. Enter the Posthive MCP URL:</p>
        <CopyCode>https://api.posthive.co/mcp</CopyCode>
        <p className="mb-4 type-body-r-m text-muted">3. Claude.ai opens a Posthive authorization page — log in and click <strong>Allow access</strong>.</p>
        <p className="mb-4 type-body-r-m text-muted">4. Claude.ai discovers all tools automatically. Revoke access anytime from <strong>Settings → API Keys</strong>.</p>
        <Warn>
          Self-hosters: replace <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">https://api.posthive.co</span> with your own API URL.
        </Warn>
      </>
    ),
  },
  {
    id: "mcp-chatgpt",
    label: "ChatGPT",
    content: (
      <>
        <p className="mb-4 type-body-r-m text-muted">Same Streamable HTTP + OAuth endpoint as Claude — confirmed working with ChatGPT&apos;s Developer Mode.</p>
        <p className="mb-4 type-body-r-m text-muted"><strong>Steps:</strong></p>
        <p className="mb-4 type-body-r-m text-muted">1. Go to <strong>ChatGPT → Settings → Apps → Advanced settings</strong> and turn on <strong>Developer mode</strong>.</p>
        <p className="mb-4 type-body-r-m text-muted">2. Go to <strong>Settings → Apps → Add app / Add custom connector</strong> and enter:</p>
        <CopyCode>https://api.posthive.co/mcp</CopyCode>
        <p className="mb-4 type-body-r-m text-muted">3. ChatGPT opens a Posthive authorization page — log in and click <strong>Allow access</strong>.</p>
        <p className="mb-4 type-body-r-m text-muted">4. Try <em>&quot;@posthive list my connected accounts&quot;</em> to confirm it&apos;s working.</p>
        <Warn>
          Developer Mode connectors are private to your account — no app review needed.
        </Warn>
      </>
    ),
  },
  {
    id: "mcp-grok",
    label: "Grok Bot",
    content: (
      <>
        <p className="mb-4 type-body-r-m text-muted">Grok Bot (xAI) supports custom MCP connectors via OAuth — same endpoint as Claude and ChatGPT, no API key needed.</p>
        <p className="mb-4 type-body-r-m text-muted"><strong>Steps:</strong></p>
        <p className="mb-4 type-body-r-m text-muted">1. Go to <strong>grok.com → Connectors → New Connector → Custom</strong></p>
        <p className="mb-4 type-body-r-m text-muted">2. Enter the Posthive MCP URL:</p>
        <CopyCode>https://api.posthive.co/mcp</CopyCode>
        <p className="mb-4 type-body-r-m text-muted">3. Grok Bot opens a Posthive authorization page — log in and click <strong>Allow access</strong>.</p>
        <p className="mb-4 type-body-r-m text-muted">4. Try <em>&quot;list my Posthive accounts&quot;</em> to confirm it&apos;s working.</p>
        <Warn>
          Requires a Pro or Team plan on Posthive (API access required).
        </Warn>
      </>
    ),
  },
];

export function DocsMcpConnectorTabs() {
  const [selected, setSelected] = useState(0);

  return (
    <div>
      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {CONNECTORS.map((c, i) => (
          <button
            key={c.id}
            id={c.id}
            onClick={() => setSelected(i)}
            className={cn("chip px-3.5 py-1.5 type-body-sb-s", selected === i && "chip-active")}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {CONNECTORS[selected].content}
      </div>
    </div>
  );
}
