"use client";

import { useState } from "react";

function CopyCode({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{
      margin: "10px 0 14px",
      padding: "10px 14px",
      background: "#0d0d0d",
      border: "1px solid #2a2a2a",
      borderRadius: 8,
      fontFamily: "ui-monospace,monospace",
      fontSize: 12.5,
      color: "#9ba2ee",
      display: "flex",
      alignItems: "flex-start",
      gap: 8,
      whiteSpace: "pre-wrap",
      wordBreak: "break-all",
    }}>
      <span style={{ flex: 1 }}>{children}</span>
      <button
        onClick={() => { navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        style={{ background: "none", border: "none", cursor: "pointer", color: copied ? "#5b63d3" : "rgba(237,237,237,0.3)", padding: "2px 4px", flexShrink: 0 }}
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

const CONNECTORS = [
  {
    id: "mcp-claudeai",
    label: "Claude",
    content: (
      <>
        <p className="doc-p">Streamable HTTP MCP endpoint — no local binary required. Claude handles OAuth automatically.</p>
        <p className="doc-p"><strong>Steps:</strong></p>
        <p className="doc-p">1. Go to <strong>Claude.ai → Settings → Connectors → Add custom connector</strong></p>
        <p className="doc-p">2. Enter the Posthive MCP URL:</p>
        <CopyCode>https://api.posthive.co/mcp</CopyCode>
        <p className="doc-p">3. Claude.ai opens a Posthive authorization page — log in and click <strong>Allow access</strong>.</p>
        <p className="doc-p">4. Claude.ai discovers all tools automatically. Revoke access anytime from <strong>Settings → API Keys</strong>.</p>
        <div className="doc-warn">
          Self-hosters: replace <span className="doc-inline-code">https://api.posthive.co</span> with your own API URL.
        </div>
      </>
    ),
  },
  {
    id: "mcp-chatgpt",
    label: "ChatGPT",
    content: (
      <>
        <p className="doc-p">Same Streamable HTTP + OAuth endpoint as Claude — confirmed working with ChatGPT&apos;s Developer Mode.</p>
        <p className="doc-p"><strong>Steps:</strong></p>
        <p className="doc-p">1. Go to <strong>ChatGPT → Settings → Apps → Advanced settings</strong> and turn on <strong>Developer mode</strong>.</p>
        <p className="doc-p">2. Go to <strong>Settings → Apps → Add app / Add custom connector</strong> and enter:</p>
        <CopyCode>https://api.posthive.co/mcp</CopyCode>
        <p className="doc-p">3. ChatGPT opens a Posthive authorization page — log in and click <strong>Allow access</strong>.</p>
        <p className="doc-p">4. Try <em>&quot;@posthive list my connected accounts&quot;</em> to confirm it&apos;s working.</p>
        <div className="doc-warn">
          Developer Mode connectors are private to your account — no app review needed.
        </div>
      </>
    ),
  },
  {
    id: "mcp-grok",
    label: "Grok Bot",
    content: (
      <>
        <p className="doc-p">Grok Bot (xAI) supports custom MCP connectors via OAuth — same endpoint as Claude and ChatGPT, no API key needed.</p>
        <p className="doc-p"><strong>Steps:</strong></p>
        <p className="doc-p">1. Go to <strong>grok.com → Connectors → New Connector → Custom</strong></p>
        <p className="doc-p">2. Enter the Posthive MCP URL:</p>
        <CopyCode>https://api.posthive.co/mcp</CopyCode>
        <p className="doc-p">3. Grok Bot opens a Posthive authorization page — log in and click <strong>Allow access</strong>.</p>
        <p className="doc-p">4. Try <em>&quot;list my Posthive accounts&quot;</em> to confirm it&apos;s working.</p>
        <div className="doc-warn">
          Requires a Pro or Team plan on Posthive (API access required).
        </div>
      </>
    ),
  },
];

export function DocsMcpConnectorTabs() {
  const [selected, setSelected] = useState(0);

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {CONNECTORS.map((c, i) => (
          <button
            key={c.id}
            id={c.id}
            onClick={() => setSelected(i)}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: selected === i ? "1px solid #5b63d3" : "1px solid #2a2a2a",
              background: selected === i ? "rgba(91,99,211,0.12)" : "transparent",
              color: selected === i ? "#9ba2ee" : "#888",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
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
