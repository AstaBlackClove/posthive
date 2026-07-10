"use client";

import { useState } from "react";
import Image from "next/image";

const MCP_OAUTH_URL = "https://api.posthive.co/mcp";

const CLIENT_LOGO: Record<string, string> = {
  claude: "/mcpfavicon/claude.jpg",
  chatgpt: "/mcpfavicon/chatgpt.jpg",
  "claude-code": "/mcpfavicon/claudecode.jpg",
  cursor: "/mcpfavicon/cursor.jpg",
  vscode: "/mcpfavicon/vscode.jpg",
  codex: "/mcpfavicon/codex.jpg",
  openclaw: "/mcpfavicon/openclaw.jpg",
  hermes: "/mcpfavicon/hermes.jpg",
};

function AppIcon({ id, size = 18 }: { id: string; size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: 5, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
      <Image src={CLIENT_LOGO[id]} alt="" width={size} height={size} style={{ objectFit: "cover", width: size, height: size }} />
    </span>
  );
}

function copyText(text: string): boolean {
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(
        () => { setCopied(true); setTimeout(() => setCopied(false), 1500); },
        () => { if (copyText(text)) { setCopied(true); setTimeout(() => setCopied(false), 1500); } }
      );
    } else if (copyText(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <button
      onClick={handleClick}
      style={{
        position: "absolute", top: 10, right: 10, display: "flex", alignItems: "center", gap: 5,
        background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 7, padding: "5px 9px",
        fontSize: 11, fontWeight: 600, color: copied ? "#5cb88a" : "#999", cursor: "pointer",
      }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 14, minHeight: 200, minWidth: 0, maxWidth: "100%", boxSizing: "border-box", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {children}
    </div>
  );
}

function FileHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid #1a1a1a" }}>
      {icon}
      <span style={{ fontSize: 12, fontFamily: "monospace", color: "#777" }}>{label}</span>
    </div>
  );
}

function TerminalMock({ comment, command }: { comment: string; command: string }) {
  return (
    <CardShell>
      <FileHeader icon={<TerminalDotsIcon />} label="Terminal" />
      <div style={{ padding: "16px 16px", fontFamily: "monospace", fontSize: 11.5, lineHeight: 2, flex: 1 }}>
        <span style={{ color: "#555" }}># {comment}</span><br />
        <span style={{ color: "#5cb88a" }}>$</span> <span style={{ color: "#ccc" }}>{command}</span><span style={{ color: "#555" }}>▌</span>
      </div>
    </CardShell>
  );
}

function EditorMock({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <CardShell>
      <FileHeader icon={icon} label={label} />
      <div style={{ padding: "14px 16px", flex: 1, fontFamily: "monospace", fontSize: 11, color: "#333" }}>
        {[1, 2, 3, 4, 5].map(n => (
          <div key={n} style={{ display: "flex", gap: 10, padding: "2px 0", borderBottom: "1px solid #141414" }}>
            <span style={{ color: "#444", width: 12 }}>{n}</span>
            <span>{n === 1 ? <span style={{ color: "#666" }}>▌</span> : ""}</span>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

function CodeBlock({ code }: { code: string }) {
  const rows = code.split("\n").length;
  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 14, minHeight: 200, minWidth: 0, maxWidth: "100%", padding: 20, boxSizing: "border-box", overflow: "hidden" }}>
      <div style={{ position: "relative", minWidth: 0 }}>
        <CopyBtn text={code} />
        <textarea
          readOnly
          value={code}
          rows={rows}
          onFocus={e => e.currentTarget.select()}
          spellCheck={false}
          style={{
            width: "100%", paddingRight: 64, margin: 0, border: "none", outline: "none", resize: "none",
            background: "transparent", fontFamily: "monospace", fontSize: 12, lineHeight: 1.9, color: "#9ba2ee",
            whiteSpace: "pre", overflowX: "auto", overflowY: "hidden",
          }}
        />
      </div>
    </div>
  );
}

function InlineCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(
        () => { setCopied(true); setTimeout(() => setCopied(false), 1500); },
        () => { if (copyText(code)) { setCopied(true); setTimeout(() => setCopied(false), 1500); } }
      );
    } else if (copyText(code)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 14, minHeight: 200, minWidth: 0, maxWidth: "100%", boxSizing: "border-box", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%", minWidth: 0,
        background: "#131313", border: "1px solid #2a2a2a", borderRadius: 10, padding: "10px 10px 10px 16px",
      }}>
        <input
          readOnly
          value={code}
          onFocus={e => e.currentTarget.select()}
          spellCheck={false}
          style={{
            flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent",
            fontFamily: "monospace", fontSize: 12.5, color: "#9ba2ee",
          }}
        />
        <button
          onClick={handleClick}
          style={{
            display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
            background: "#1e1e1e", border: "1px solid #2a2a2a", borderRadius: 7, padding: "6px 10px",
            fontSize: 11, fontWeight: 700, letterSpacing: ".03em", color: copied ? "#5cb88a" : "#ccc", cursor: "pointer",
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
          {copied ? "COPIED" : "COPY"}
        </button>
      </div>
    </div>
  );
}

function ConnectCard({ toIcon, toLabel, buttonLabel }: { toIcon: React.ReactNode; toLabel: string; buttonLabel: string }) {
  return (
    <CardShell>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 40, height: 40, borderRadius: 10, background: "#131313", border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <Image src="/posthivemain.png" alt="Posthive" width={22} height={22} />
          </span>
          <span style={{ width: 40, height: 40, borderRadius: 10, background: "#131313", border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {toIcon}
          </span>
        </div>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#ededed", textAlign: "center", margin: 0 }}>
          Connect <span style={{ color: "#9ba2ee" }}>Posthive</span> to {toLabel}
        </p>
        <div style={{ fontSize: 13, fontWeight: 700, padding: "10px 22px", borderRadius: 9, background: "#5b63d3", color: "#fff" }}>
          {buttonLabel}
        </div>
      </div>
    </CardShell>
  );
}

function ComingSoonCard() {
  return (
    <div style={{ gridColumn: "1 / -1", background: "#0d0d0d", border: "1px dashed #2a2a2a", borderRadius: 14, minWidth: 0, maxWidth: "100%", boxSizing: "border-box", padding: "48px 24px", textAlign: "center" }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: "#ededed", margin: "0 0 8px" }}>ChatGPT support is coming soon</p>
      <p style={{ fontSize: 13.5, color: "#666", margin: 0, lineHeight: 1.7 }}>
        OpenAI&apos;s connector ecosystem works differently from MCP clients. We&apos;re building native support — until then, use any of the clients below.
      </p>
    </div>
  );
}

interface StepDef { title: string; desc: string }
interface ClientDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
  steps?: StepDef[];
  render?: () => React.ReactNode;
}

const CLIENTS: ClientDef[] = [
  {
    id: "claude",
    label: "Claude",
    icon: <AppIcon id="claude" />,
    steps: [
      { title: "Open Claude", desc: "Go to Settings → Connectors and choose \"Add custom connector\"." },
      { title: "Add the Posthive URL", desc: "Paste the connector URL. Claude will prompt you to sign in." },
      { title: "Sign in with Posthive", desc: "Authorize once in your browser. Claude can now schedule posts." },
    ],
    render: () => (
      <>
        <div style={{ position: "relative", background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 14, minHeight: 200, minWidth: 0, maxWidth: "100%", boxSizing: "border-box", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#ededed" }}>Connectors</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#777" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" /></svg>
              <span style={{ width: 20, height: 20, borderRadius: 6, background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", color: "#ededed" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
              </span>
            </div>
          </div>

          <div style={{ position: "absolute", top: 48, right: 16, zIndex: 10, width: 176, borderRadius: 10, background: "#161616", border: "1px solid #2a2a2a", boxShadow: "0 8px 24px rgba(0,0,0,.5)", padding: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 7, background: "#1e1e1e", padding: "7px 8px", fontSize: 12, fontWeight: 600, color: "#ededed" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
              Add custom connector
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#777" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              Web
            </div>
            {[1, 2].map(n => (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px" }}>
                <span style={{ width: 24, height: 24, borderRadius: 6, background: "#1e1e1e", flexShrink: 0 }} />
                <span style={{ height: 8, width: n === 1 ? 96 : 64, borderRadius: 99, background: "#1e1e1e" }} />
              </div>
            ))}
          </div>

          <div style={{ height: 1, background: "#1e1e1e" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#777" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            Not connected
          </div>
        </div>
        <InlineCard code={MCP_OAUTH_URL} />
        <ConnectCard toIcon={<AppIcon id="claude" />} toLabel="Claude" buttonLabel="Approve & connect" />
      </>
    ),
  },
  {
    id: "chatgpt",
    label: "ChatGPT",
    icon: <AppIcon id="chatgpt" />,
    steps: [
      { title: "Enable Developer Mode", desc: "Go to Settings → Apps → Advanced settings and turn on Developer mode (one-time)." },
      { title: "Add the Posthive URL", desc: "Add an app and paste the URL below. ChatGPT will prompt you to sign in." },
      { title: "Sign in with Posthive", desc: "Authorize once in your browser. ChatGPT can now schedule posts." },
    ],
    render: () => (
      <>
        <div style={{ position: "relative", background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 14, minHeight: 200, minWidth: 0, maxWidth: "100%", boxSizing: "border-box", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#ededed" }}>Apps</span>
            <span style={{ width: 20, height: 20, borderRadius: 6, background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", color: "#ededed" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#131313", border: "1px solid #1e1e1e", borderRadius: 9 }}>
            <span style={{ width: 22, height: 22, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
              <Image src="/posthivemain.png" alt="Posthive" width={22} height={22} />
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#ededed" }}>posthive</span>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: "#e86b6b", background: "rgba(232,107,107,.12)", border: "1px solid rgba(232,107,107,.3)", borderRadius: 4, padding: "1px 5px" }}>DEV</span>
          </div>

          <div style={{ position: "absolute", top: 48, right: 16, zIndex: 10, width: 176, borderRadius: 10, background: "#161616", border: "1px solid #2a2a2a", boxShadow: "0 8px 24px rgba(0,0,0,.5)", padding: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 7, background: "#1e1e1e", padding: "7px 8px", fontSize: 12, fontWeight: 600, color: "#ededed" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
              Add app
            </div>
          </div>

          <div style={{ marginTop: "auto", fontSize: 10.5, color: "#555" }}>Developer mode: On</div>
        </div>
        <InlineCard code={MCP_OAUTH_URL} />
        <ConnectCard toIcon={<AppIcon id="chatgpt" />} toLabel="ChatGPT" buttonLabel="Approve & connect" />
      </>
    ),
  },
  {
    id: "claude-code",
    label: "Claude Code",
    icon: <AppIcon id="claude-code" />,
    steps: [
      { title: "Open your terminal", desc: "Run the command below — no API key needed." },
      { title: "Add Posthive", desc: "Claude Code registers Posthive and prompts you to sign in." },
      { title: "Sign in with Posthive", desc: "Authorize once in your browser. Claude Code can now schedule posts." },
    ],
    render: () => (
      <>
        <TerminalMock comment="register the Posthive MCP server" command="claude mcp add --transport http posthive" />
        <InlineCard code={`claude mcp add --transport http posthive ${MCP_OAUTH_URL}`} />
        <ConnectCard toIcon={<AppIcon id="claude-code" />} toLabel="Claude Code" buttonLabel="Sign in with Posthive" />
      </>
    ),
  },
  {
    id: "cursor",
    label: "Cursor",
    icon: <AppIcon id="cursor" />,
    steps: [
      { title: "Open MCP settings", desc: "Go to Cursor Settings → MCP → Add new server." },
      { title: "Add the Posthive URL", desc: "Paste the URL below. No API key needed." },
      { title: "Sign in with Posthive", desc: "Authorize once in your browser. Cursor can now schedule posts." },
    ],
    render: () => (
      <>
        <EditorMock icon={<AppIcon id="cursor" size={16} />} label=".cursor/mcp.json" />
        <CodeBlock code={`{\n  "mcpServers": {\n    "posthive": {\n      "url": "${MCP_OAUTH_URL}"\n    }\n  }\n}`} />
        <ConnectCard toIcon={<AppIcon id="cursor" />} toLabel="Cursor" buttonLabel="Approve & connect" />
      </>
    ),
  },
  {
    id: "vscode",
    label: "VS Code",
    icon: <AppIcon id="vscode" />,
    steps: [
      { title: "Open your MCP config", desc: "Edit .vscode/mcp.json in your project." },
      { title: "Add the Posthive URL", desc: "Paste the URL below. No API key needed." },
      { title: "Sign in with Posthive", desc: "Authorize once in your browser. Copilot Chat can now schedule posts." },
    ],
    render: () => (
      <>
        <EditorMock icon={<AppIcon id="vscode" size={16} />} label=".vscode/mcp.json" />
        <CodeBlock code={`{\n  "servers": {\n    "posthive": {\n      "type": "http",\n      "url": "${MCP_OAUTH_URL}"\n    }\n  }\n}`} />
        <ConnectCard toIcon={<AppIcon id="vscode" />} toLabel="VS Code" buttonLabel="Approve & connect" />
      </>
    ),
  },
  {
    id: "codex",
    label: "Codex",
    icon: <AppIcon id="codex" />,
    steps: [
      { title: "Open your terminal", desc: "Edit ~/.codex/config.toml, or .codex/config.toml per project." },
      { title: "Add the Posthive URL", desc: "Add this block. No API key needed." },
      { title: "Sign in with Posthive", desc: "Authorize once in your browser. Codex can now schedule posts." },
    ],
    render: () => (
      <>
        <TerminalMock comment="edit the Codex config" command="vim ~/.codex/config.toml" />
        <CodeBlock code={`[mcp_servers.posthive]\nurl = "${MCP_OAUTH_URL}"`} />
        <ConnectCard toIcon={<AppIcon id="codex" />} toLabel="Codex" buttonLabel="Approve & connect" />
      </>
    ),
  },
  {
    id: "openclaw",
    label: "OpenClaw",
    icon: <AppIcon id="openclaw" />,
    steps: [
      { title: "Open your terminal", desc: "Register Posthive as a remote MCP server with one command." },
      { title: "Add the Posthive URL", desc: "Run the command below. No API key needed." },
      { title: "Sign in with Posthive", desc: "Authorize once in your browser. OpenClaw can now schedule posts." },
    ],
    render: () => (
      <>
        <TerminalMock comment="register the Posthive MCP server" command="openclaw mcp set posthive" />
        <InlineCard code={`openclaw mcp set posthive '{"url":"${MCP_OAUTH_URL}","transport":"streamable-http"}'`} />
        <ConnectCard toIcon={<AppIcon id="openclaw" />} toLabel="OpenClaw" buttonLabel="Approve & connect" />
      </>
    ),
  },
  {
    id: "hermes",
    label: "Hermes Agent",
    icon: <AppIcon id="hermes" />,
    steps: [
      { title: "Open your terminal", desc: "Edit ~/.hermes/config.yaml." },
      { title: "Add the Posthive URL", desc: "Add this block. No API key needed." },
      { title: "Sign in with Posthive", desc: "Authorize once in your browser. Hermes can now schedule posts." },
    ],
    render: () => (
      <>
        <TerminalMock comment="edit the Hermes config" command="vim ~/.hermes/config.yaml" />
        <CodeBlock code={`mcp_servers:\n  posthive:\n    url: "${MCP_OAUTH_URL}"`} />
        <ConnectCard toIcon={<AppIcon id="hermes" />} toLabel="Hermes Agent" buttonLabel="Approve & connect" />
      </>
    ),
  },
];

export function AgentSetupTabs() {
  const [active, setActive] = useState(CLIENTS[0].id);
  const client = CLIENTS.find(c => c.id === active) ?? CLIENTS[0];

  return (
    <div className="ph-setup">
      <style>{`
        .ph-setup-tabs-row { display: inline-flex; gap: 4px; justify-content: center; flex-wrap: wrap; margin-bottom: 40px; background: #111; border: 1px solid #2a2a2a; border-radius: 999px; padding: 5px; max-width: 100%; }
        .ph-setup-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .ph-setup-steps { margin-top: 32px; }
        @media (max-width: 768px) {
          .ph-setup-tabs-row { display: flex; width: 100%; }
          .ph-setup-grid { grid-template-columns: 1fr !important; }
          .ph-setup-steps { margin-top: 24px !important; }
        }
        @media (max-width: 480px) {
          .ph-setup-tabs-row button { padding: 8px !important; font-size: 12px !important; }
        }
      `}</style>

      <div className="ph-setup-tabs-row">
        {CLIENTS.map(c => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            title={c.label}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: active === c.id ? "9px 14px" : "9px 10px", borderRadius: 999,
              background: active === c.id ? "#5b63d3" : "transparent",
              border: "none",
              color: active === c.id ? "#fff" : "#888",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              transition: "background 150ms, color 150ms",
            }}
          >
            {c.icon}
            {active === c.id && c.label}
          </button>
        ))}
      </div>

      <div className="ph-setup-grid" style={{ marginBottom: client.steps ? 32 : 0 }}>
        {client.comingSoon ? <ComingSoonCard /> : client.render?.()}
      </div>

      {client.steps && (
        <div className="ph-setup-grid ph-setup-steps" style={{ textAlign: "left" }}>
          {client.steps.map((step, i) => (
            <div key={i} style={{ minWidth: 0 }}>
              <span style={{ fontFamily: "monospace", fontSize: 11, color: "#5b63d3", fontWeight: 700, letterSpacing: ".08em" }}>0{i + 1}</span>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#ededed", margin: "6px 0 6px" }}>{step.title}</p>
              <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TerminalDotsIcon() {
  return (
    <span style={{ display: "inline-flex", gap: 5 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#e86b6b" }} />
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#d4a83c" }} />
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#5cb88a" }} />
    </span>
  );
}
