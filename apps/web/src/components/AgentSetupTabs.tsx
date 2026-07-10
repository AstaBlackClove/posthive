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

function CodeBlock({ code }: { code: string }) {
  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 14, minHeight: 200, minWidth: 0, maxWidth: "100%", padding: 20, boxSizing: "border-box", overflow: "hidden" }}>
      <div style={{ position: "relative", minWidth: 0 }}>
        <CopyBtn text={code} />
        <div style={{ overflowX: "auto", minWidth: 0, paddingBottom: 6 }}>
          <pre style={{ margin: 0, paddingRight: 64, fontFamily: "monospace", fontSize: 12, lineHeight: 1.9, color: "#9ba2ee", whiteSpace: "pre" }}>
            {code}
          </pre>
        </div>
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
        <span style={{ flex: 1, minWidth: 0, fontFamily: "monospace", fontSize: 12.5, color: "#9ba2ee", overflowX: "auto", whiteSpace: "nowrap", display: "block" }}>
          {code}
        </span>
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
    comingSoon: true,
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
        <TerminalMock comment="register the Posthive MCP server" command="claude mcp add posthive --transport http" />
        <InlineCard code={`claude mcp add posthive --transport http --url ${MCP_OAUTH_URL}`} />
        <ConnectCard toIcon={<AppIcon id="claude-code" />} toLabel="Claude Code" buttonLabel="Sign in with Posthive" />
      </>
    ),
  },
  {
    id: "cursor",
    label: "Cursor",
    icon: <AppIcon id="cursor" />,
    steps: [
      { title: "Sign in with Posthive", desc: "Run npx posthive-cli login once to sign in via your browser. No API key needed." },
      { title: "Add Posthive to Cursor", desc: "Add this to .cursor/mcp.json — Cursor launches it locally and reuses your login." },
      { title: "Reload Cursor", desc: "Posthive's tools appear in the agent tool list immediately." },
    ],
    render: () => (
      <>
        <TerminalMock comment="sign in once, no API key needed" command="npx posthive-cli login" />
        <CodeBlock code={`{\n  "mcpServers": {\n    "posthive": {\n      "command": "npx",\n      "args": ["posthive-mcp"]\n    }\n  }\n}`} />
        <ConnectCard toIcon={<AppIcon id="cursor" />} toLabel="Cursor" buttonLabel="Reload Cursor" />
      </>
    ),
  },
  {
    id: "vscode",
    label: "VS Code",
    icon: <AppIcon id="vscode" />,
    steps: [
      { title: "Sign in with Posthive", desc: "Run npx posthive-cli login once to sign in via your browser. No API key needed." },
      { title: "Add Posthive to VS Code", desc: "Add this to .vscode/mcp.json — no API key needed, it reuses your login." },
      { title: "Reload the window", desc: "GitHub Copilot Chat picks up Posthive's tools automatically." },
    ],
    render: () => (
      <>
        <TerminalMock comment="sign in once, no API key needed" command="npx posthive-cli login" />
        <CodeBlock code={`{\n  "servers": {\n    "posthive": {\n      "type": "stdio",\n      "command": "npx",\n      "args": ["posthive-mcp"]\n    }\n  }\n}`} />
        <ConnectCard toIcon={<AppIcon id="vscode" />} toLabel="VS Code" buttonLabel="Reload window" />
      </>
    ),
  },
  {
    id: "codex",
    label: "Codex",
    icon: <AppIcon id="codex" />,
    steps: [
      { title: "Sign in with Posthive", desc: "Run npx posthive-cli login once to sign in via your browser. No API key needed." },
      { title: "Add Posthive to Codex", desc: "Add this block to ~/.codex/config.toml." },
      { title: "Restart Codex", desc: "Codex reloads MCP servers and Posthive is ready to use." },
    ],
    render: () => (
      <>
        <TerminalMock comment="sign in once, no API key needed" command="npx posthive-cli login" />
        <CodeBlock code={`[mcp_servers.posthive]\ncommand = "npx"\nargs = ["posthive-mcp"]`} />
        <ConnectCard toIcon={<AppIcon id="codex" />} toLabel="Codex" buttonLabel="Restart Codex" />
      </>
    ),
  },
  {
    id: "openclaw",
    label: "OpenClaw",
    icon: <AppIcon id="openclaw" />,
    steps: [
      { title: "Sign in with Posthive", desc: "Run npx posthive-cli login once to sign in via your browser. No API key needed." },
      { title: "Add Posthive", desc: "Register Posthive as a local MCP server. It reuses your login automatically." },
      { title: "Message your agent", desc: "Try \"Schedule a LinkedIn post for tomorrow 9am\" — OpenClaw handles the rest." },
    ],
    render: () => (
      <>
        <TerminalMock comment="sign in once, no API key needed" command="npx posthive-cli login" />
        <InlineCard code={`openclaw mcp set posthive '{"command":"npx","args":["posthive-mcp"]}'`} />
        <ConnectCard toIcon={<AppIcon id="openclaw" />} toLabel="OpenClaw" buttonLabel="Ready to use" />
      </>
    ),
  },
  {
    id: "hermes",
    label: "Hermes Agent",
    icon: <AppIcon id="hermes" />,
    steps: [
      { title: "Sign in with Posthive", desc: "Run npx posthive-cli login once to sign in via your browser. No API key needed." },
      { title: "Add Posthive", desc: "Add this to ~/.hermes/config.yaml, then run /reload-mcp." },
      { title: "Reload Hermes Agent", desc: "Run /reload-mcp and Posthive is live and ready." },
    ],
    render: () => (
      <>
        <TerminalMock comment="sign in once, no API key needed" command="npx posthive-cli login" />
        <CodeBlock code={`mcp_servers:\n  posthive:\n    command: npx\n    args: ["posthive-mcp"]`} />
        <ConnectCard toIcon={<AppIcon id="hermes" />} toLabel="Hermes Agent" buttonLabel="Reload Hermes" />
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
