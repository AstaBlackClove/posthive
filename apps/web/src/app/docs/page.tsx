"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

function CopyCode({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <div style={{ position: "relative", margin: "12px 0 20px" }}>
      <code className="doc-code" style={{ margin: 0 }}>{children}</code>
      <button onClick={copy}
        style={{ position: "absolute", top: 8, right: 8, background: "#2a2a2a", border: "1px solid #3a3a3a", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11, color: copied ? "#4ade80" : "#888", fontFamily: "monospace", transition: "color .15s" }}>
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

// ─── Sidebar data ───────────────────────────────────────────────────────────

const NAV = [
  {
    section: "Getting Started",
    items: [
      { label: "Quick start", id: "quick-start" },
      { label: "Installation", id: "installation" },
      { label: "Environment variables", id: "environment-variables" },
    ],
  },
  {
    section: "Platforms",
    items: [
      { label: "Bluesky", id: "bluesky" },
      { label: "Threads", id: "threads" },
      { label: "Instagram", id: "instagram" },
      { label: "LinkedIn", id: "linkedin" },
      { label: "Mastodon", id: "mastodon" },
      { label: "YouTube", id: "youtube" },
      { label: "Facebook Pages", id: "facebook" },
      { label: "Pinterest", id: "pinterest" },
      { label: "Telegram", id: "telegram" },
      { label: "Nostr", id: "nostr" },
    ],
  },
  {
    section: "Features",
    items: [
      { label: "Scheduling posts", id: "scheduling-posts" },
      { label: "Post templates", id: "post-templates" },
      { label: "Bulk CSV scheduling", id: "bulk-csv" },
      { label: "Calendar view", id: "calendar-view" },
      { label: "First comment", id: "first-comment" },
      { label: "Per-platform overrides", id: "per-platform-overrides" },
      { label: "Media uploads", id: "media-uploads" },
    ],
  },
  {
    section: "Self-hosting",
    items: [
      { label: "Docker setup", id: "docker-setup" },
      { label: "Database", id: "database" },
      { label: "Redis", id: "redis" },
      { label: "Storage", id: "storage" },
    ],
  },
  {
    section: "Billing",
    items: [
      { label: "Plans & pricing", id: "plans-pricing" },
      { label: "Webhooks (billing)", id: "webhooks" },
    ],
  },
  {
    section: "Outbound Webhooks",
    items: [
      { label: "Setup & payload", id: "outbound-webhooks" },
      { label: "n8n", id: "outbound-webhook-n8n" },
      { label: "Zapier", id: "outbound-webhook-zapier" },
      { label: "Make", id: "outbound-webhook-make" },
    ],
  },
  {
    section: "MCP Server",
    items: [
      { label: "Overview", id: "mcp-overview" },
      { label: "Plan requirements", id: "mcp-plans" },
      { label: "Sign in (recommended)", id: "mcp-install" },
      { label: "Claude Code setup", id: "mcp-claude-code" },
      { label: "Cursor, VS Code, Codex, OpenClaw, Hermes", id: "mcp-cursor" },
      { label: "Claude connector", id: "mcp-claudeai" },
      { label: "ChatGPT connector", id: "mcp-chatgpt" },
      { label: "Manual API key in URL (fallback)", id: "mcp-url-key" },
      { label: "CLI for shell agents", id: "mcp-cli" },
      { label: "Available tools", id: "mcp-tools" },
      { label: "Media & formats", id: "mcp-media" },
      { label: "Example prompts", id: "mcp-examples" },
    ],
  },
  {
    section: "API Reference",
    items: [
      { label: "Authentication", id: "api-authentication" },
      { label: "GET /accounts", id: "api-accounts" },
      { label: "POST /posts", id: "api-posts-create" },
      { label: "GET /posts", id: "api-posts-list" },
      { label: "GET /posts/:id", id: "api-posts-get" },
      { label: "PATCH /posts/:id", id: "api-posts-patch" },
      { label: "DELETE /posts/:id", id: "api-posts-delete" },
      { label: "POST /upload", id: "api-upload" },
      { label: "Error codes", id: "api-errors" },
    ],
  },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("quick-start");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV.filter(g => g.section !== "Getting Started").map(g => [g.section, true]))
  );

  const filteredNav = search.trim()
    ? NAV.map(g => ({
        ...g,
        items: g.items.filter(i => i.label.toLowerCase().includes(search.toLowerCase())),
      })).filter(g => g.items.length > 0)
    : NAV;
  const mainRef = useRef<HTMLElement>(null);
  const scrollingRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Update active section based on scroll position inside <main>
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    const allIds = NAV.flatMap(g => g.items.map(i => i.id));

    function onScroll() {
      if (scrollingRef.current) return;
      const mainRect = main!.getBoundingClientRect();
      // Walk all headings bottom-up; first one whose top is above the 30% mark wins
      let active = allIds[0];
      for (const id of allIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top - mainRect.top;
        if (top <= mainRect.height * 0.3) active = id;
      }
      setActiveSection(active);
      // Auto-expand the section that contains the active item, collapse others
      setCollapsed(prev => {
        const next = { ...prev };
        for (const group of NAV) {
          const contains = group.items.some(i => i.id === active);
          if (contains) next[group.section] = false;
          else if (!next[group.section]) next[group.section] = true;
        }
        return next;
      });
    }

    main.addEventListener("scroll", onScroll, { passive: true });
    return () => main.removeEventListener("scroll", onScroll);
  }, []);

  function scrollTo(id: string) {
    setActiveSection(id);
    setSidebarOpen(false);
    const el = document.getElementById(id);
    if (!el || !mainRef.current) return;

    scrollingRef.current = true;
    const main = mainRef.current;
    const mainRect = main.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const target = main.scrollTop + (elRect.top - mainRect.top) - 24;
    main.scrollTo({ top: target, behavior: "smooth" });
    setTimeout(() => { scrollingRef.current = false; }, 800);
  }

  return (
    <>
      <style>{`
        .doc-h1 { font-size: 36px; font-weight: 700; letter-spacing: -.02em; color: #ededed; margin: 0 0 12px; }
        .doc-h2 { font-size: 22px; font-weight: 700; color: #ededed; margin: 48px 0 12px; padding-top: 48px; border-top: 1px solid rgba(255,255,255,.06); }
        .doc-h3 { font-size: 16px; font-weight: 600; color: #cfcfcf; margin: 28px 0 10px; }
        .doc-p { font-size: 15px; line-height: 1.75; color: #888; margin: 0 0 16px; }
        .doc-code { font-family: 'Geist Mono', monospace; font-size: 13px; background: #161616; border: 1px solid #2a2a2a; border-radius: 8px; padding: 16px 20px; color: #c9d1d9; overflow-x: auto; display: block; margin: 12px 0 20px; white-space: pre; }
        .doc-inline-code { font-family: monospace; font-size: 12.5px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 4px; padding: 1px 6px; color: #9ba2ee; }
        .doc-ul { padding-left: 20px; margin: 0 0 16px; }
        .doc-li { font-size: 15px; line-height: 1.75; color: #888; margin-bottom: 6px; }
        .doc-a { color: #9ba2ee; text-decoration: underline; text-underline-offset: 3px; }
        .doc-callout { background: rgba(91,99,211,.08); border: 1px solid rgba(91,99,211,.25); border-radius: 10px; padding: 14px 18px; margin: 16px 0 24px; font-size: 14px; color: #9ba2ee; line-height: 1.6; }
        .doc-warn { background: rgba(245,158,11,.08); border: 1px solid rgba(245,158,11,.25); border-radius: 10px; padding: 14px 18px; margin: 16px 0 24px; font-size: 14px; color: #fbbf24; line-height: 1.6; }
        .doc-table-wrap { width: 100%; overflow-x: auto; margin: 12px 0 24px; }
        .doc-table { width: 100%; min-width: 480px; border-collapse: collapse; font-size: 14px; margin: 0; }
        .doc-table th { text-align: left; padding: 10px 14px; color: #666; font-weight: 600; border-bottom: 1px solid #2a2a2a; }
        .doc-table td { padding: 10px 14px; color: #888; border-bottom: 1px solid #1e1e1e; vertical-align: top; }
        .doc-table tr:last-child td { border-bottom: none; }
      `}</style>

      <div style={{ background: "#0a0a0a", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Top nav */}
        <nav style={{
          height: 64,
          borderBottom: "1px solid #2a2a2a",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: "#0a0a0a",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="md:hidden"
              aria-label="Toggle sections"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "#ededed" }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </button>
            <img src="/posthivemain.png" alt="Posthive" style={{ height: 28 }} />
          </div>
          <Link href="/" style={{ fontSize: 14, color: "#888", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
            <span>←</span> <span className="hidden sm:inline">Back to home</span>
          </Link>
        </nav>

        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="md:hidden"
            style={{ position: "fixed", inset: 0, top: 64, background: "rgba(0,0,0,.6)", zIndex: 45 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Body below nav */}
        <div style={{ display: "flex", flex: 1, marginTop: 64 }}>

          {/* Sidebar */}
          <aside
            style={{
              width: 240,
              position: "fixed",
              top: 64,
              bottom: 0,
              left: 0,
              borderRight: "1px solid #2a2a2a",
              overflowY: "auto",
              padding: "16px 0 24px",
              background: "#0a0a0a",
              zIndex: 46,
              transform: isDesktop || sidebarOpen ? "translateX(0)" : "translateX(-100%)",
              transition: "transform 0.2s ease",
            }}>
            {/* Search */}
            <div style={{ padding: "0 14px 14px" }}>
              <div style={{ position: "relative" }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#555", pointerEvents: "none" }}>
                  <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
                <input
                  type="search"
                  placeholder="Search docs…"
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value);
                    if (e.target.value.trim()) {
                      setCollapsed(Object.fromEntries(NAV.map(g => [g.section, false])));
                    }
                  }}
                  style={{
                    width: "100%", paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7,
                    background: "#111", border: "1px solid #2a2a2a", borderRadius: 8,
                    fontSize: 12.5, color: "#ededed", outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
            {filteredNav.length === 0 && (
              <p style={{ padding: "0 20px", fontSize: 12, color: "#555" }}>No results for &ldquo;{search}&rdquo;</p>
            )}
            {filteredNav.map((group) => {
              const isCollapsed = search.trim() ? false : (collapsed[group.section] ?? false);
              const hasActive = group.items.some(i => i.id === activeSection);
              return (
                <div key={group.section}>
                  <button
                    onClick={() => setCollapsed(c => ({ ...c, [group.section]: !isCollapsed }))}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: hasActive ? "#9ba2ee" : "#999",
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                      padding: "16px 20px 6px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <span>{group.section}</span>
                    <svg
                      width="12" height="12" viewBox="0 0 12 12" fill="none"
                      style={{ transition: "transform 0.2s", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)", flexShrink: 0 }}
                    >
                      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {!isCollapsed && group.items.map((item) => {
                    const active = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => scrollTo(item.id)}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          fontSize: 13,
                          padding: "6px 20px",
                          cursor: "pointer",
                          color: active ? "#ededed" : "#777",
                          background: active ? "rgba(91,99,211,.06)" : "transparent",
                          borderTop: "none",
                          borderRight: "none",
                          borderBottom: "none",
                          borderLeftWidth: 2,
                          borderLeftStyle: "solid",
                          borderLeftColor: active ? "#5b63d3" : "transparent",
                          transition: "all 0.15s",
                        }}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </aside>

          {/* Main content */}
          <main ref={mainRef} style={{
            marginLeft: isDesktop ? 240 : 0,
            flex: 1,
            overflowY: "auto",
            minWidth: 0,
            height: "calc(100vh - 64px)",
          }}>
            <div style={{ maxWidth: 760, margin: "0 auto", paddingTop: 48, paddingBottom: 120 }} className="px-5 md:px-10">

              {/* Hero */}
              <h1 className="doc-h1">Posthive Documentation</h1>
              <p className="doc-p">
                Posthive is a social media scheduling platform. Write once, publish to Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, Facebook Pages, Pinterest, and Telegram — all from a single clean interface.
              </p>

              {/* ── Quick start ── */}
              <h2 className="doc-h2" id="quick-start">Quick start</h2>
              <p className="doc-p">Get Posthive running locally in under five minutes.</p>

              <h3 className="doc-h3">1. Clone the repository</h3>
              <CopyCode>{`git clone https://github.com/AstaBlackClove/posthive.git
cd posthive`}</CopyCode>

              <h3 className="doc-h3">2. Copy environment files</h3>
              <CopyCode>{`cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env and fill in the required values`}</CopyCode>

              <h3 className="doc-h3">3. Run database migrations</h3>
              <CopyCode>{`cd apps/api
pnpm db:migrate`}</CopyCode>

              <h3 className="doc-h3">4. Start the dev server</h3>
              <CopyCode>{`# From the repo root
pnpm dev`}</CopyCode>
              <p className="doc-p">
                This starts both the API on <span className="doc-inline-code">http://localhost:3001</span> and the web app on <span className="doc-inline-code">http://localhost:3000</span> in parallel.
              </p>

              {/* ── Installation ── */}
              <h2 className="doc-h2" id="installation">Installation</h2>
              <h3 className="doc-h3">Prerequisites</h3>
              <ul className="doc-ul">
                <li className="doc-li">Node.js ≥ 20</li>
                <li className="doc-li">pnpm ≥ 9 (<span className="doc-inline-code">npm i -g pnpm</span>)</li>
                <li className="doc-li">Redis Upstash free tier or Railway Redis (required for BullMQ job queue)</li>
              </ul>

              <h3 className="doc-h3">Clone and install</h3>
              <CopyCode>{`git clone https://github.com/AstaBlackClove/posthive.git
cd posthive
pnpm install`}</CopyCode>

              <p className="doc-p">
                The monorepo uses pnpm workspaces. Running <span className="doc-inline-code">pnpm install</span> at the root installs dependencies for both <span className="doc-inline-code">apps/api</span> and <span className="doc-inline-code">apps/web</span>.
              </p>

              {/* ── Environment variables ── */}
              <h2 className="doc-h2" id="environment-variables">Environment variables</h2>
              <p className="doc-p">
                All configuration lives in <span className="doc-inline-code">apps/api/.env</span>. Copy <span className="doc-inline-code">.env.example</span> and fill in the values below.
              </p>

              <div className="doc-table-wrap"><table className="doc-table">
                <thead>
                  <tr>
                    <th>Variable</th>
                    <th>Required</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td><span className="doc-inline-code">DATABASE_URL</span></td><td>Yes</td><td>SQLite path (<code>file:./dev.db</code>) for dev, or a Postgres connection string for prod.</td></tr>
                  <tr><td><span className="doc-inline-code">ENCRYPTION_KEY</span></td><td>Yes</td><td>64-char hex string. Used for AES-256-GCM encryption of stored credentials. Never change after data is written.</td></tr>
                  <tr><td><span className="doc-inline-code">REDIS_URL</span></td><td>Yes</td><td>Redis connection string (e.g. <code>rediss://...</code>) for BullMQ job queue.</td></tr>
                  <tr><td><span className="doc-inline-code">JWT_ACCESS_SECRET</span></td><td>Yes</td><td>64-char hex. Signs short-lived access tokens.</td></tr>
                  <tr><td><span className="doc-inline-code">JWT_REFRESH_SECRET</span></td><td>Yes</td><td>64-char hex. Signs long-lived refresh tokens.</td></tr>
                  <tr><td><span className="doc-inline-code">WEB_URL</span></td><td>Yes</td><td>URL of the web app. Use <code>http://localhost:3000</code> in dev so auth cookies stay stable across tunnel restarts.</td></tr>
                  <tr><td><span className="doc-inline-code">PUBLIC_API_URL</span></td><td>Meta only</td><td>Public HTTPS URL of the API. Meta fetches images from this URL, so it must be reachable from the internet.</td></tr>
                  <tr><td><span className="doc-inline-code">ENABLE_BILLING</span></td><td>No</td><td>Set to <code>true</code> to enable Dodo Payments billing. Defaults to off for self-hosters.</td></tr>
                  <tr><td><span className="doc-inline-code">AUTH_PROVIDER</span></td><td>No</td><td><code>local</code> (default) or <code>supabase</code>. Switches the auth backend.</td></tr>
                </tbody>
              </table></div>

              <div className="doc-warn">
                <strong>Warning:</strong> <span className="doc-inline-code">ENCRYPTION_KEY</span> must never be changed after connected accounts have been saved. Changing it makes all stored credentials permanently unreadable.
              </div>

              {/* ── Bluesky ── */}
              <h2 className="doc-h2" id="bluesky">Bluesky</h2>
              <p className="doc-p">
                Bluesky uses app passwords no OAuth flow required. Connection is straightforward and does not need a public callback URL.
              </p>
              <h3 className="doc-h3">How to connect</h3>
              <ol className="doc-ul" style={{ listStyle: "decimal" }}>
                <li className="doc-li">Go to <a className="doc-a" href="https://bsky.app" target="_blank" rel="noreferrer">bsky.app</a> → Settings → Privacy and Security → App Passwords.</li>
                <li className="doc-li">Create a new app password and copy it.</li>
                <li className="doc-li">Open the Accounts page in Posthive, click <strong>Connect Bluesky</strong>.</li>
                <li className="doc-li">Enter your Bluesky handle (e.g. <span className="doc-inline-code">yourname.bsky.social</span>) and the app password.</li>
              </ol>
              <p className="doc-p">
                Posthive stores the app password encrypted with AES-256-GCM. Your main account password is never used or stored.
              </p>

              {/* ── Threads ── */}
              <h2 className="doc-h2" id="threads">Threads</h2>
              <p className="doc-p">
                Threads uses Meta OAuth 2.0. You need a Meta Developer app with the Threads use case enabled.
              </p>
              <h3 className="doc-h3">Setup</h3>
              <ol className="doc-ul" style={{ listStyle: "decimal" }}>
                <li className="doc-li">Go to <a className="doc-a" href="https://developers.facebook.com" target="_blank" rel="noreferrer">developers.facebook.com</a> and create an app.</li>
                <li className="doc-li">Add the <strong>Threads API</strong> use case to your app.</li>
                <li className="doc-li">Add a redirect URI matching <span className="doc-inline-code">THREADS_REDIRECT_URI</span> in your env must be a public HTTPS URL.</li>
                <li className="doc-li">Copy your App ID and App Secret into <span className="doc-inline-code">THREADS_APP_ID</span> and <span className="doc-inline-code">THREADS_APP_SECRET</span>.</li>
                <li className="doc-li">Click <strong>Connect Threads</strong> on the Accounts page and complete the OAuth flow.</li>
              </ol>
              <p className="doc-p">
                Threads tokens expire every 60 days. Posthive automatically refreshes them before each scheduled post.
              </p>

              {/* ── Instagram ── */}
              <h2 className="doc-h2" id="instagram">Instagram</h2>
              <p className="doc-p">
                Instagram publishing requires a Professional (Business or Creator) account linked to a Facebook Page, and a Meta Developer app with the Instagram product enabled.
              </p>
              <div className="doc-callout">
                <strong>Important:</strong> <span className="doc-inline-code">PUBLIC_API_URL</span> must be a public HTTPS URL. Meta fetches your uploaded images directly from the API server when creating carousel containers a localhost URL will not work.
              </div>
              <h3 className="doc-h3">Supported media types</h3>
              <ul className="doc-ul">
                <li className="doc-li"><strong>Post</strong> - single image or carousel (up to 10 images on Pro/Team)</li>
                <li className="doc-li"><strong>Reel</strong> - short video (Pro/Team plans only)</li>
                <li className="doc-li"><strong>Story</strong> - image or video story (Pro/Team plans only)</li>
              </ul>
              <h3 className="doc-h3">Setup</h3>
              <ol className="doc-ul" style={{ listStyle: "decimal" }}>
                <li className="doc-li">Create a Meta Developer app and add the <strong>Instagram</strong> product.</li>
                <li className="doc-li">Set your redirect URI to <span className="doc-inline-code">INSTAGRAM_REDIRECT_URI</span> (must be public HTTPS).</li>
                <li className="doc-li">Fill in <span className="doc-inline-code">INSTAGRAM_APP_ID</span>, <span className="doc-inline-code">INSTAGRAM_APP_SECRET</span>, and <span className="doc-inline-code">PUBLIC_API_URL</span>.</li>
                <li className="doc-li">Click <strong>Connect Instagram</strong> on the Accounts page.</li>
              </ol>

              {/* ── LinkedIn ── */}
              <h2 className="doc-h2" id="linkedin">LinkedIn</h2>
              <p className="doc-p">
                LinkedIn uses OAuth 2.0 via the LinkedIn Developer platform.
              </p>
              <div className="doc-warn">
                <strong>Note:</strong> Image and video uploads require <strong>elevated API access</strong> (Marketing Developer Platform approval). Without it, Posthive will publish text-only posts to LinkedIn.
              </div>
              <h3 className="doc-h3">Setup</h3>
              <ol className="doc-ul" style={{ listStyle: "decimal" }}>
                <li className="doc-li">Create an app at <a className="doc-a" href="https://developer.linkedin.com" target="_blank" rel="noreferrer">developer.linkedin.com</a>.</li>
                <li className="doc-li">Add the <strong>Share on LinkedIn</strong> and <strong>Sign In with LinkedIn using OpenID Connect</strong> products.</li>
                <li className="doc-li">Add your callback URL under <strong>Auth</strong> → <strong>Authorized redirect URLs</strong>.</li>
                <li className="doc-li">Set <span className="doc-inline-code">LINKEDIN_CLIENT_ID</span> and <span className="doc-inline-code">LINKEDIN_CLIENT_SECRET</span> in your env.</li>
                <li className="doc-li">Click <strong>Connect LinkedIn</strong> on the Accounts page.</li>
              </ol>

              {/* ── Mastodon ── */}
              <h2 className="doc-h2" id="mastodon">Mastodon</h2>
              <p className="doc-p">
                Posthive works with any Mastodon instance. You register an application within your own instance and paste the credentials into Posthive.
              </p>
              <h3 className="doc-h3">How to connect</h3>
              <ol className="doc-ul" style={{ listStyle: "decimal" }}>
                <li className="doc-li">Log in to your Mastodon instance (e.g. <span className="doc-inline-code">mastodon.social</span>).</li>
                <li className="doc-li">Go to <strong>Settings → Development → New application</strong>.</li>
                <li className="doc-li">Give it a name, set the redirect URI to your Posthive callback URL, and enable the <span className="doc-inline-code">write:statuses</span> and <span className="doc-inline-code">write:media</span> scopes.</li>
                <li className="doc-li">Copy the <strong>Client key</strong> and <strong>Client secret</strong>.</li>
                <li className="doc-li">Click <strong>Connect Mastodon</strong> in Posthive, enter your instance URL and the credentials.</li>
              </ol>

              {/* ── YouTube ── */}
              <h2 className="doc-h2" id="youtube">YouTube</h2>
              <p className="doc-p">
                Posthive publishes to YouTube as <strong>Shorts</strong> (or regular videos your choice per post) using Google OAuth 2.0 and the YouTube Data API v3. Every post requires a video attached.
              </p>
              <h3 className="doc-h3">How to connect</h3>
              <ol className="doc-ul" style={{ listStyle: "decimal" }}>
                <li className="doc-li">Create a project at <a className="doc-a" href="https://console.cloud.google.com" target="_blank" rel="noreferrer">console.cloud.google.com</a> and enable the <strong>YouTube Data API v3</strong>.</li>
                <li className="doc-li">Configure the OAuth consent screen add the <span className="doc-inline-code">youtube.upload</span>, <span className="doc-inline-code">youtube.readonly</span>, and <span className="doc-inline-code">youtube.force-ssl</span> scopes, and add your own Google account under <strong>Audience → Test users</strong> while the app is unverified.</li>
                <li className="doc-li">Create an OAuth client (Web application) and copy the Client ID and Secret into <span className="doc-inline-code">YOUTUBE_CLIENT_ID</span> / <span className="doc-inline-code">YOUTUBE_CLIENT_SECRET</span>.</li>
                <li className="doc-li">Click <strong>Connect YouTube</strong> on the Accounts page and authorize.</li>
              </ol>
              <div className="doc-warn">
                <strong>Important:</strong> Google requires OAuth redirect domains to be owned and verified shared tunnel domains (devtunnels.ms, ngrok, etc.) are rejected outright with <span className="doc-inline-code">Error 403: access_denied</span>. Use <span className="doc-inline-code">http://localhost:&lt;API_PORT&gt;/auth/youtube/callback</span> for <span className="doc-inline-code">YOUTUBE_REDIRECT_URI</span> instead Google exempts localhost from domain verification. This means connecting YouTube only works from a browser on the same machine as your API server (everything else in Posthive works fine over a tunnel).
              </div>
              <h3 className="doc-h3">Shorts vs. regular video</h3>
              <p className="doc-p">
                In Compose, the YouTube section has a <strong>Short / Video</strong> toggle. YouTube classifies Shorts by the video file itself vertical (9:16) and 60 seconds or under is the reliable threshold. Posthive auto-appends <span className="doc-inline-code">#Shorts</span> to the description when "Short" is selected, but that tag alone does nothing if the video doesn't already qualify by aspect ratio and duration. Posthive checks the attached video's dimensions and warns you in the UI if it won't actually classify as a Short.
              </p>
              <p className="doc-p">
                Title and description are separate dedicated fields (not the shared Post box other platforms use) title is capped at 100 characters, description at 5,000. Selecting only YouTube accounts hides the shared Post box entirely since it isn't used.
              </p>
              <div className="doc-callout">
                While the Google app stays in "Testing" publishing status, refresh tokens expire after 7 days regardless of activity scheduled YouTube posts will start failing until you manually reconnect. Submit the app for Google verification to remove this limit and the 100-test-user cap.
              </div>

              {/* ── Facebook Pages ── */}
              <h2 className="doc-h2" id="facebook">Facebook Pages</h2>
              <p className="doc-p">
                Posthive publishes to <strong>Facebook Pages</strong> you manage via the Graph API v21.0. Text, single photo, multi-photo carousel, and video posts are all supported. The Facebook API does not allow posting to personal profiles a Page is required.
              </p>
              <h3 className="doc-h3">How to connect</h3>
              <ol className="doc-ul" style={{ listStyle: "decimal" }}>
                <li className="doc-li">At <a className="doc-a" href="https://developers.facebook.com" target="_blank" rel="noreferrer">developers.facebook.com</a>, open your Meta app and add the <strong>"Manage everything on your Page"</strong> use case this grants <span className="doc-inline-code">pages_manage_posts</span>, <span className="doc-inline-code">pages_show_list</span>, and <span className="doc-inline-code">pages_read_engagement</span>.</li>
                <li className="doc-li">Under <strong>Facebook Login for Business → Settings</strong>, add your callback URL as a valid OAuth redirect URI: <span className="doc-inline-code">https://your-domain/auth/facebook/callback</span>.</li>
                <li className="doc-li">Copy the main <strong>App ID</strong> and <strong>App secret</strong> into <span className="doc-inline-code">FACEBOOK_APP_ID</span> / <span className="doc-inline-code">FACEBOOK_APP_SECRET</span> (same values as Threads if using the same Meta app).</li>
                <li className="doc-li">Create a Facebook Page at <a className="doc-a" href="https://facebook.com/pages/create" target="_blank" rel="noreferrer">facebook.com/pages/create</a> if you don&apos;t have one.</li>
                <li className="doc-li">Click <strong>Connect Facebook Page</strong> on the Accounts page and authorise all Pages you admin will be connected automatically.</li>
              </ol>
              <div className="doc-callout">
                First comment support requires the additional <span className="doc-inline-code">pages_manage_engagement</span> permission, which needs Meta app review approval. Until approved, posts publish successfully but first comments are skipped.
              </div>

              {/* ── Pinterest ── */}
              <h2 className="doc-h2" id="pinterest">Pinterest</h2>
              <p className="doc-p">
                Posthive publishes <strong>Pins</strong> to Pinterest using the Pinterest API v5. Every Pinterest post requires an image — Pinterest is a visual platform and rejects posts without one.
              </p>
              <div className="doc-warn">
                <strong>Trial access only:</strong> Pinterest Standard access (required for production posting) requires approval from Pinterest. Until approved, Posthive connects to the Pinterest sandbox environment. The connect button on the Accounts page shows <em>Pending Approval</em> and is disabled until Standard access is granted. See below for what to do once approved.
              </div>
              <h3 className="doc-h3">How it works</h3>
              <ul className="doc-ul">
                <li className="doc-li"><strong>Title</strong> — first line of your post text (max 100 chars).</li>
                <li className="doc-li"><strong>Description</strong> — remaining lines (max 500 chars).</li>
                <li className="doc-li"><strong>Link</strong> — if your post contains a URL, it is attached as the Pin destination.</li>
                <li className="doc-li"><strong>Board</strong> — the Pin is created on the default board selected at connect time.</li>
              </ul>
              <h3 className="doc-h3">Environment variables</h3>
              <div className="doc-table-wrap"><table className="doc-table">
                <thead><tr><th>Variable</th><th>Required</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td><span className="doc-inline-code">PINTEREST_CLIENT_ID</span></td><td>Yes</td><td>OAuth app Client ID from the Pinterest developer portal.</td></tr>
                  <tr><td><span className="doc-inline-code">PINTEREST_CLIENT_SECRET</span></td><td>Yes</td><td>OAuth app Client Secret.</td></tr>
                  <tr><td><span className="doc-inline-code">PINTEREST_REDIRECT_URI</span></td><td>Yes</td><td>Must match the redirect URI registered in the Pinterest app settings.</td></tr>
                  <tr><td><span className="doc-inline-code">PINTEREST_SANDBOX</span></td><td>No</td><td>Set to <code>true</code> to use the Pinterest sandbox API. Required for Trial access apps.</td></tr>
                  <tr><td><span className="doc-inline-code">PINTEREST_SANDBOX_TOKEN</span></td><td>No</td><td>Manually generated sandbox token from the Pinterest developer dashboard. When set, bypasses the OAuth code exchange entirely (required for Trial apps whose token exchange is restricted).</td></tr>
                </tbody>
              </table></div>
              <h3 className="doc-h3">Moving to production (after Standard access approval)</h3>
              <ol className="doc-ul" style={{ listStyle: "decimal" }}>
                <li className="doc-li">Remove <span className="doc-inline-code">PINTEREST_SANDBOX=true</span> and <span className="doc-inline-code">PINTEREST_SANDBOX_TOKEN</span> from your env.</li>
                <li className="doc-li">The Pinterest connect button on the Accounts page will be re-enabled in the next release.</li>
                <li className="doc-li">Users connect via the normal OAuth flow — no manual token required.</li>
              </ol>
              <div className="doc-callout">
                <strong>Image required:</strong> The Schedule button is disabled when Pinterest is selected and no image has been attached. Add at least one image before scheduling a Pinterest post.
              </div>

              {/* ── Telegram ── */}
              <h2 className="doc-h2" id="telegram">Telegram</h2>
              <p className="doc-p">
                Posthive publishes to <strong>Telegram channels</strong> via the Telegram Bot API. No OAuth flow is required — connection uses a bot token you generate yourself. Text, images (up to 10), and video posts are supported. First comments are not available on Telegram channels.
              </p>
              <h3 className="doc-h3">How to connect</h3>
              <ol className="doc-ul" style={{ listStyle: "decimal" }}>
                <li className="doc-li">Open Telegram and message <strong>@BotFather</strong> → send <span className="doc-inline-code">/newbot</span> → follow the prompts. BotFather gives you a <strong>bot token</strong> (looks like <span className="doc-inline-code">123456789:ABCdef...</span>).</li>
                <li className="doc-li">Create a Telegram channel — public or private.</li>
                <li className="doc-li">Add your bot to the channel as an <strong>Administrator</strong>: open the channel → Administrators → Add Administrator → search your bot → enable <strong>Post Messages</strong> → Done.</li>
                <li className="doc-li">Go to <strong>Accounts</strong> in Posthive and click <strong>Connect Telegram Channel</strong>.</li>
                <li className="doc-li">Paste the bot token and your channel identifier, then click Connect.</li>
              </ol>
              <h3 className="doc-h3">Channel identifier</h3>
              <ul className="doc-ul">
                <li className="doc-li"><strong>Public channels</strong> — use the username: <span className="doc-inline-code">@mychannel</span></li>
                <li className="doc-li"><strong>Private channels</strong> — use the numeric chat ID: <span className="doc-inline-code">-1001234567890</span>. To find it, forward any message from the channel to <strong>@userinfobot</strong> on Telegram.</li>
              </ul>
              <div className="doc-callout">
                <strong>No environment variables needed.</strong> Unlike OAuth platforms, Telegram requires no server-side app credentials. Each user provides their own bot token which is stored encrypted per-user. One bot can serve multiple channels — connect each channel separately on the Accounts page.
              </div>
              <h3 className="doc-h3">What gets posted</h3>
              <ul className="doc-ul">
                <li className="doc-li"><strong>Text only</strong> — sent as a plain message.</li>
                <li className="doc-li"><strong>Single image</strong> — sent via <span className="doc-inline-code">sendPhoto</span> with caption.</li>
                <li className="doc-li"><strong>Multiple images</strong> — sent as a media group (<span className="doc-inline-code">sendMediaGroup</span>, up to 10).</li>
                <li className="doc-li"><strong>Video</strong> — sent via <span className="doc-inline-code">sendVideo</span> with caption.</li>
              </ul>

              {/* ── Nostr ── */}
              <h2 className="doc-h2" id="nostr">Nostr</h2>
              <p className="doc-p">
                Posthive publishes <strong>Kind 1 notes</strong> to Nostr relays using your keypair. No OAuth, no app approval — just paste your <span className="doc-inline-code">nsec</span> private key. Text and images are supported. Images are appended as URLs in the note content and use NIP-92 imeta tags for clients that support inline rendering.
              </p>
              <h3 className="doc-h3">Setup</h3>
              <ol className="doc-ol">
                <li className="doc-li">Go to <strong>Accounts</strong> in Posthive and click <strong>Connect Nostr</strong>.</li>
                <li className="doc-li">Paste your <span className="doc-inline-code">nsec1...</span> private key — or click <strong>Generate a new keypair</strong> to create a fresh one.</li>
                <li className="doc-li">Your public key (<span className="doc-inline-code">npub</span>) and profile photo are fetched automatically from relays.</li>
              </ol>
              <div className="doc-callout">
                <strong>No environment variables needed.</strong> Nostr uses keypairs — there is no server-side app registration or OAuth flow. Your <span className="doc-inline-code">nsec</span> is stored AES-256-GCM encrypted per-user, never logged or exposed.
              </div>
              <h3 className="doc-h3">Relays</h3>
              <p className="doc-p">Posts are published to four well-known high-uptime relays by default:</p>
              <ul className="doc-ul">
                <li className="doc-li"><span className="doc-inline-code">wss://relay.damus.io</span></li>
                <li className="doc-li"><span className="doc-inline-code">wss://relay.nostr.band</span></li>
                <li className="doc-li"><span className="doc-inline-code">wss://nos.lol</span></li>
                <li className="doc-li"><span className="doc-inline-code">wss://relay.snort.social</span></li>
              </ul>
              <h3 className="doc-h3">Images</h3>
              <p className="doc-p">
                Images must be publicly accessible URLs — they are appended to the note text so Nostr clients can fetch and render them inline. Make sure <span className="doc-inline-code">PUBLIC_API_URL</span> is set to your public API URL (not localhost) so uploaded images resolve correctly on the Nostr network.
              </p>

              {/* ── Scheduling posts ── */}
              <h2 className="doc-h2" id="scheduling-posts">Scheduling posts</h2>
              <p className="doc-p">
                The Compose page is where you write and schedule posts. Everything happens in a single panel no multi-step wizard.
              </p>
              <h3 className="doc-h3">Steps</h3>
              <ol className="doc-ul" style={{ listStyle: "decimal" }}>
                <li className="doc-li">Select one or more connected accounts from the account picker at the top.</li>
                <li className="doc-li">Write your post in the text area. The character counter updates per-platform.</li>
                <li className="doc-li">Optionally attach images or video using the media button.</li>
                <li className="doc-li">Pick a scheduled time using the date-time picker. You can also post immediately.</li>
                <li className="doc-li">Click <strong>Schedule</strong>. The post is enqueued and will fire at the chosen time.</li>
              </ol>

              {/* ── Post templates ── */}
              <h2 className="doc-h2" id="post-templates">Post templates</h2>
              <p className="doc-p">
                Templates let you save and reuse post content from the Compose page. Useful for recurring formats like weekly updates, product announcements, or thread starters.
              </p>
              <h3 className="doc-h3">Saving a template</h3>
              <ol className="doc-ul" style={{ listStyle: "decimal" }}>
                <li className="doc-li">Write your post in the Compose page.</li>
                <li className="doc-li">Click <strong>+ Save</strong> in the POST section header.</li>
                <li className="doc-li">Enter a name and press Enter or click Save. Template names must be unique.</li>
              </ol>
              <h3 className="doc-h3">Loading a template</h3>
              <ol className="doc-ul" style={{ listStyle: "decimal" }}>
                <li className="doc-li">Click <strong>Templates</strong> in the POST section header to open the dropdown.</li>
                <li className="doc-li">Click any template name — the text and first comment are instantly populated.</li>
              </ol>
              <p className="doc-p">
                Templates save: post text, first comment, and YouTube title/description (if YouTube fields were filled). Templates are not shown when only YouTube is selected.
              </p>
              <h3 className="doc-h3">Deleting a template</h3>
              <p className="doc-p">
                Hover over a template in the dropdown and click the <strong>✕</strong> that appears on the right. A confirmation dialog will ask you to confirm before deleting.
              </p>

              {/* ── Bulk CSV ── */}
              <h2 className="doc-h2" id="bulk-csv">Bulk CSV scheduling</h2>
              <p className="doc-p">
                Bulk scheduling lets you upload a CSV file to schedule tens or hundreds of posts at once. Available from both the <strong>Posts page</strong> (Bulk button in the top bar) and the <strong>Compose page</strong> (Bulk CSV button next to Schedule).
              </p>
              <h3 className="doc-h3">CSV format</h3>
              <p className="doc-p">The CSV must have a header row with these columns (in order):</p>
              <CopyCode>{`scheduled_for,text,accounts,comment,image_urls`}</CopyCode>
              <ul className="doc-ul">
                <li className="doc-li"><span className="doc-inline-code">scheduled_for</span> — date and time in <span className="doc-inline-code">YYYY-MM-DD HH:MM</span> format or ISO 8601. Must be in the future.</li>
                <li className="doc-li"><span className="doc-inline-code">text</span> — post body text (required).</li>
                <li className="doc-li"><span className="doc-inline-code">accounts</span> — which platforms to post to (see below).</li>
                <li className="doc-li"><span className="doc-inline-code">comment</span> — first comment text (optional, leave blank).</li>
                <li className="doc-li"><span className="doc-inline-code">image_urls</span> — public image URLs separated by <span className="doc-inline-code">;</span> (optional, up to 4).</li>
              </ul>
              <h3 className="doc-h3">Accounts column syntax</h3>
              <ul className="doc-ul">
                <li className="doc-li"><span className="doc-inline-code">all</span> — post to all connected accounts (excluding YouTube).</li>
                <li className="doc-li"><span className="doc-inline-code">bluesky|mastodon</span> — post to specific platforms, separated by <span className="doc-inline-code">|</span>.</li>
                <li className="doc-li"><span className="doc-inline-code">!instagram</span> — post to all platforms except Instagram (and YouTube).</li>
                <li className="doc-li"><span className="doc-inline-code">all|!instagram|!linkedin</span> — all except Instagram and LinkedIn.</li>
              </ul>
              <p className="doc-p">
                Supported platform names: <span className="doc-inline-code">bluesky</span>, <span className="doc-inline-code">threads</span>, <span className="doc-inline-code">instagram</span>, <span className="doc-inline-code">linkedin</span>, <span className="doc-inline-code">mastodon</span>, <span className="doc-inline-code">facebook</span>, <span className="doc-inline-code">telegram</span>. YouTube is not supported in bulk scheduling — it requires a video file. Use the Compose page for YouTube posts.
              </p>
              <p className="doc-p">
                Instagram rows must include at least one URL in <span className="doc-inline-code">image_urls</span>. Rows missing an image for Instagram will show an error in the preview and be skipped.
              </p>
              <h3 className="doc-h3">Example CSV</h3>
              <CopyCode>{`scheduled_for,text,accounts,comment,image_urls
2026-08-01 09:00,Good morning 🌅,all,,
2026-08-02 14:30,Check the blog post,bluesky|mastodon,Link in first comment,
2026-08-03 18:00,LinkedIn update,linkedin,,https://example.com/image.jpg
2026-08-04 10:00,Skip Instagram today,!instagram,,
2026-08-05 12:00,Two images 🖼️,bluesky|threads,,https://img1.jpg;https://img2.jpg`}</CopyCode>
              <h3 className="doc-h3">Preview and scheduling</h3>
              <ol className="doc-ul" style={{ listStyle: "decimal" }}>
                <li className="doc-li">Paste your CSV or upload a <span className="doc-inline-code">.csv</span> file.</li>
                <li className="doc-li">Click <strong>Preview</strong> — each row is validated and shown in a table with its status (✓ Ready or ✕ error).</li>
                <li className="doc-li">Review the results. Error rows are skipped automatically.</li>
                <li className="doc-li">Click <strong>Schedule N posts</strong> to enqueue all valid rows. Posts are scheduled one at a time with a progress bar.</li>
              </ol>

              {/* ── Calendar view ── */}
              <h2 className="doc-h2" id="calendar-view">Calendar view</h2>
              <p className="doc-p">
                The Posts page (<span className="doc-inline-code">/jobs</span>) has both a list view and a calendar view. Toggle between them with the view switcher in the top-right corner.
              </p>
              <p className="doc-p">
                The calendar supports month, week, and day modes. Pending posts can be <strong>dragged to a new time slot</strong> to reschedule them without opening the edit dialog.
              </p>

              {/* ── First comment ── */}
              <h2 className="doc-h2" id="first-comment">First comment</h2>
              <p className="doc-p">
                The first comment field lets you attach a reply that is posted immediately after the main post goes live. This is commonly used to add hashtags without cluttering the main post body, or to add a thread continuation.
              </p>
              <p className="doc-p">
                The comment is published per-platform each connected account gets its own first comment published to that platform.
              </p>

              {/* ── Per-platform overrides ── */}
              <h2 className="doc-h2" id="per-platform-overrides">Per-platform overrides</h2>
              <p className="doc-p">
                Available on <strong>Pro and Team plans</strong>. Per-platform overrides let you customise the post text for individual accounts without creating separate posts.
              </p>
              <p className="doc-p">
                Click the <strong>Customize</strong> button next to any selected account in the Compose page. A dialog opens where you can edit the content independently for that account. Accounts without an override use the main post body.
              </p>

              {/* ── Media uploads ── */}
              <h2 className="doc-h2" id="media-uploads">Media uploads</h2>
              <p className="doc-p">
                Posthive supports image and video attachments. Images can be attached by clicking the media button, dragging files into the compose area, or pasting from the clipboard.
              </p>
              <ul className="doc-ul">
                <li className="doc-li"><strong>Creator plan:</strong> up to 4 images per post (carousel).</li>
                <li className="doc-li"><strong>Pro / Team plans:</strong> up to 10 images per carousel.</li>
                <li className="doc-li">Alt text is supported click any thumbnail to add descriptive text for accessibility.</li>
                <li className="doc-li">In development, files are stored on local disk. In production, set <span className="doc-inline-code">STORAGE_PROVIDER=supabase</span> and configure your bucket.</li>
              </ul>

              {/* ── Docker setup ── */}
              <h2 className="doc-h2" id="docker-setup">Docker setup</h2>
              <p className="doc-p">
                Posthive can be self-hosted on any platform that runs Docker containers Railway, Render, Fly.io, or your own VPS.
              </p>
              <h3 className="doc-h3">Recommended stack</h3>
              <ul className="doc-ul">
                <li className="doc-li">Deploy the API container and point <span className="doc-inline-code">DATABASE_URL</span> to a managed Postgres instance.</li>
                <li className="doc-li">Set <span className="doc-inline-code">REDIS_URL</span> to an Upstash Redis or Railway Redis URL.</li>
                <li className="doc-li">Update the Prisma provider to <span className="doc-inline-code">postgresql</span> in <span className="doc-inline-code">apps/api/prisma/schema.prisma</span>.</li>
                <li className="doc-li">Run <span className="doc-inline-code">pnpm db:migrate</span> as part of your release command.</li>
              </ul>
              <CopyCode>{`# Example Railway / Dockerfile release command
pnpm db:migrate && node dist/index.js`}</CopyCode>

              {/* ── Database ── */}
              <h2 className="doc-h2" id="database">Database</h2>
              <p className="doc-p">
                Posthive uses <strong>Prisma 5</strong> with SQLite in development and Postgres in production. Switching is a one-line change in the schema.
              </p>
              <CopyCode>{`// apps/api/prisma/schema.prisma
datasource db {
  provider = "postgresql"   // change from "sqlite"
  url      = env("DATABASE_URL")
}`}</CopyCode>
              <p className="doc-p">Run migrations after any schema change:</p>
              <CopyCode>{`cd apps/api
pnpm db:migrate`}</CopyCode>
              <div className="doc-warn">
                <strong>Warning:</strong> <span className="doc-inline-code">ENCRYPTION_KEY</span> must never change after accounts are saved. All stored OAuth tokens and app passwords are encrypted with this key changing it renders all connected accounts permanently unusable.
              </div>

              {/* ── Redis ── */}
              <h2 className="doc-h2" id="redis">Redis</h2>
              <p className="doc-p">
                Redis is used exclusively for the BullMQ job queue that powers scheduled post delivery. No application state is stored in Redis it is safe to flush between deploys as long as no posts are currently queued.
              </p>
              <h3 className="doc-h3">Options</h3>
              <ul className="doc-ul">
                <li className="doc-li"><strong>Upstash</strong> - free tier is sufficient for most self-hosters. Use the <span className="doc-inline-code">rediss://</span> TLS URL.</li>
                <li className="doc-li"><strong>Railway Redis</strong> - add the Redis plugin to your Railway project and copy the connection string.</li>
                <li className="doc-li"><strong>Self-hosted</strong> - any Redis 6+ instance works.</li>
              </ul>
              <CopyCode>{`REDIS_URL="rediss://default:<password>@<host>:<port>"`}</CopyCode>

              {/* ── Storage ── */}
              <h2 className="doc-h2" id="storage">Storage</h2>
              <p className="doc-p">
                Uploaded media can be stored locally (dev) or in Supabase Storage (prod). Switch with the <span className="doc-inline-code">STORAGE_PROVIDER</span> env variable.
              </p>
              <h3 className="doc-h3">Local storage (default)</h3>
              <CopyCode>{`STORAGE_PROVIDER=local`}</CopyCode>
              <p className="doc-p">Files are written to <span className="doc-inline-code">apps/api/uploads/</span>. Not recommended for production files are lost on redeploy.</p>

              <h3 className="doc-h3">Supabase Storage</h3>
              <ol className="doc-ul" style={{ listStyle: "decimal" }}>
                <li className="doc-li">Create a Supabase project.</li>
                <li className="doc-li">In Storage, create a public bucket named <span className="doc-inline-code">media</span>.</li>
                <li className="doc-li">Copy your project URL and service role key.</li>
              </ol>
              <CopyCode>{`STORAGE_PROVIDER=supabase
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_KEY="eyJ..."`}</CopyCode>

              {/* ── Plans & pricing ── */}
              <h2 className="doc-h2" id="plans-pricing">Plans &amp; pricing</h2>
              <p className="doc-p">
                Posthive has four tiers. The trial is available immediately after sign-up.
              </p>
              <div className="doc-table-wrap"><table className="doc-table">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Accounts</th>
                    <th>Posts / month</th>
                    <th>Reels &amp; Stories</th>
                    <th>Overrides</th>
                    <th>Images / post</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Trialing</td>
                    <td>3</td>
                    <td>30</td>
                    <td>No</td>
                    <td>No</td>
                    <td>4</td>
                  </tr>
                  <tr>
                    <td>Creator</td>
                    <td>5</td>
                    <td>400</td>
                    <td>No</td>
                    <td>No</td>
                    <td>4</td>
                  </tr>
                  <tr>
                    <td>Pro</td>
                    <td>15</td>
                    <td>Unlimited</td>
                    <td>Yes</td>
                    <td>Yes</td>
                    <td>10</td>
                  </tr>
                  <tr>
                    <td>Team</td>
                    <td>50</td>
                    <td>Unlimited</td>
                    <td>Yes</td>
                    <td>Yes</td>
                    <td>10</td>
                  </tr>
                </tbody>
              </table></div>
              <p className="doc-p">
                Billing is handled through <strong>Dodo Payments</strong>. Set <span className="doc-inline-code">ENABLE_BILLING=true</span> and configure your Dodo API key and product IDs to activate billing.
              </p>

              {/* ── Webhooks ── */}
              <h2 className="doc-h2" id="webhooks">Webhooks</h2>
              <p className="doc-p">
                Posthive listens for Dodo Payments webhook events to update subscription status in real time. Configure the webhook endpoint in your Dodo dashboard.
              </p>
              <h3 className="doc-h3">Webhook URL</h3>
              <CopyCode>{`POST https://your-api-url/billing/webhook`}</CopyCode>

              <h3 className="doc-h3">Webhook secret</h3>
              <div className="doc-warn">
                <strong>Important:</strong> Dodo Payments webhook secrets are prefixed with <span className="doc-inline-code">whsec_</span>. Strip this prefix before setting <span className="doc-inline-code">DODO_WEBHOOK_SECRET</span> the verification code base64-decodes the raw secret and will fail if the prefix is included.
              </div>
              <CopyCode>{`# Dodo dashboard shows: whsec_abc123...
# Set in .env:
DODO_WEBHOOK_SECRET="abc123..."`}</CopyCode>

              <h3 className="doc-h3">Handled events</h3>
              <div className="doc-table-wrap"><table className="doc-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Effect</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span className="doc-inline-code">payment.succeeded</span></td>
                    <td>Sets the user&apos;s plan to active for the purchased tier.</td>
                  </tr>
                  <tr>
                    <td><span className="doc-inline-code">subscription.cancelled</span></td>
                    <td>Marks the subscription as cancelled. Access continues until the end of the billing period.</td>
                  </tr>
                </tbody>
              </table></div>

              {/* ── Outbound Webhooks ── */}
              <h2 className="doc-h2" id="outbound-webhooks">Outbound Webhooks (Zapier / n8n / Make)</h2>
              <p className="doc-p">
                Posthive fires a <span className="doc-inline-code">POST</span> request to your configured URL every time a post finishes publishing (Pro &amp; Team plans). Use this to trigger automations in Zapier, n8n, Make, or any HTTP-capable tool.
              </p>

              <h3 className="doc-h3">Setup</h3>
              <p className="doc-p">Go to <strong>Settings → Webhook</strong> and paste your endpoint URL. Posthive will send a JSON payload to that URL after every successful (or failed) publish.</p>

              <h3 className="doc-h3">Payload</h3>
              <CopyCode>{`{
  "event": "post.published",
  "postId": "clx7k2m9e0000abc123xyz",
  "status": "done",
  "scheduledFor": "2026-07-05T10:00:00.000Z",
  "platforms": ["bluesky", "mastodon", "linkedin"],
  "text": "Your post content here"
}`}</CopyCode>

              <div className="doc-table-wrap"><table className="doc-table">
                <thead>
                  <tr><th>Field</th><th>Type</th><th>Description</th></tr>
                </thead>
                <tbody>
                  <tr><td><span className="doc-inline-code">event</span></td><td>string</td><td>Always <span className="doc-inline-code">post.published</span></td></tr>
                  <tr><td><span className="doc-inline-code">postId</span></td><td>string</td><td>The Posthive job ID</td></tr>
                  <tr><td><span className="doc-inline-code">status</span></td><td>string</td><td><span className="doc-inline-code">done</span> (all platforms succeeded) or <span className="doc-inline-code">failed</span> (one or more failed)</td></tr>
                  <tr><td><span className="doc-inline-code">scheduledFor</span></td><td>ISO 8601</td><td>The originally scheduled publish time</td></tr>
                  <tr><td><span className="doc-inline-code">platforms</span></td><td>string[]</td><td>Platforms targeted (e.g. <span className="doc-inline-code">["bluesky", "mastodon"]</span>)</td></tr>
                  <tr><td><span className="doc-inline-code">text</span></td><td>string</td><td>The main post text</td></tr>
                </tbody>
              </table></div>

              <div className="doc-warn">
                Delivery is best-effort with a 10-second timeout. Posthive does not retry failed webhook deliveries — if your endpoint is down, the event is lost. Build your handler to be idempotent.
              </div>

              <h3 className="doc-h3" id="outbound-webhook-n8n">n8n — Webhook trigger</h3>
              <p className="doc-p">1. Add a <strong>Webhook</strong> node in n8n and copy the URL. 2. Paste it into Posthive Settings → Webhook. 3. Connect downstream nodes — e.g. send a Slack message, log to a Google Sheet, or notify a Notion database.</p>
              <CopyCode>{`// Example: filter for only successful posts in n8n Function node
if ($json.status !== "done") return [];
return [{ json: { text: $json.text, platforms: $json.platforms } }];`}</CopyCode>

              <h3 className="doc-h3" id="outbound-webhook-zapier">Zapier — Catch Hook</h3>
              <p className="doc-p">1. Create a new Zap → Trigger: <strong>Webhooks by Zapier → Catch Hook</strong>. 2. Copy the Zapier webhook URL and paste it into Posthive Settings → Webhook. 3. Schedule a test post in Posthive to send a sample payload. 4. Use the fields (<span className="doc-inline-code">postId</span>, <span className="doc-inline-code">platforms</span>, <span className="doc-inline-code">text</span>) in your Zap actions.</p>

              <h3 className="doc-h3" id="outbound-webhook-make">Make (Integromat) — Custom Webhook</h3>
              <p className="doc-p">1. Add a <strong>Webhooks → Custom webhook</strong> module as the trigger. 2. Copy the URL and paste it into Posthive Settings → Webhook. 3. Run a test post — Make will auto-detect the payload structure. 4. Connect downstream modules.</p>

              {/* ── MCP SERVER ── */}
              <h2 className="doc-h2" id="mcp-overview">MCP Server</h2>
              <p className="doc-p">
                Posthive ships a built-in MCP (Model Context Protocol) server that exposes your scheduling queue as tools any AI agent can call — Claude, ChatGPT, Cursor, VS Code, Claude Code, Codex, OpenClaw, Hermes Agent, or your own pipeline. No API key copy-pasting required — every client uses the same bare URL and signs in via your browser. Two ways to connect:
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, margin: "16px 0 24px" }}>
                {[
                  { label: "OAuth connector", badge: "all clients", desc: "Paste the bare MCP URL — https://api.posthive.co/mcp — into any client. It opens your browser to sign in. Zero config, no API key." },
                  { label: "stdio + login", badge: "alternative", desc: "Prefer a local process over a network connection? Run `posthive-cli login`, then use the npx posthive-mcp binary instead of the URL." },
                  { label: "Key in URL", badge: "fallback", desc: "For clients that don't support OAuth discovery. Embeds your API key directly in the connector URL." },
                ].map(t => (
                  <div key={t.label} style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 10, padding: "16px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                      <span className="doc-inline-code" style={{ fontSize: 12 }}>{t.label}</span>
                      <span style={{ fontSize: 10, color: "#5b63d3", background: "rgba(91,99,211,.12)", border: "1px solid rgba(91,99,211,.2)", borderRadius: 4, padding: "2px 6px", fontWeight: 600 }}>{t.badge}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "#777", margin: 0, lineHeight: 1.6 }}>{t.desc}</p>
                  </div>
                ))}
              </div>
              <div className="doc-warn">
                <strong>Human-in-the-loop by default.</strong> Agent-created posts are saved as <strong>drafts</strong> and require your review before anything publishes. Open Posthive → Posts to approve, edit, or schedule them. Use <span className="doc-inline-code">schedule_directly: true</span> only when you explicitly want to skip the review step.
              </div>

              <h3 className="doc-h3" id="mcp-plans">Plan requirements</h3>
              <p className="doc-p">MCP access is available on <strong>Pro</strong> and <strong>Team</strong> plans. Self-hosters with billing disabled always have full access. The <span className="doc-inline-code">/mcp</span> endpoint returns <span className="doc-inline-code">403</span> with a clear message if your plan does not include it.</p>
              <div style={{ overflowX: "auto", margin: "12px 0 24px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1e1e1e" }}>
                      {["Plan", "MCP access", "API keys"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#666", fontWeight: 600, fontSize: 11, letterSpacing: ".06em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Creator", "✗", "—"],
                      ["Pro", "✓", "Unlimited"],
                      ["Team", "✓", "Unlimited"],
                      ["Self-hosted", "✓", "Unlimited"],
                    ].map(([plan, mcp, keys]) => (
                      <tr key={plan} style={{ borderBottom: "1px solid #111" }}>
                        <td style={{ padding: "10px 12px", color: "#ededed" }}>{plan}</td>
                        <td style={{ padding: "10px 12px", color: mcp === "✓" ? "#4ade80" : "#ef4444" }}>{mcp}</td>
                        <td style={{ padding: "10px 12px", color: "#888" }}>{keys}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="doc-h3" id="mcp-install">Sign in (recommended)</h3>
              <p className="doc-p">
                Sign in once via your browser — no API key to generate, copy, or paste. This works for both the CLI and the MCP server, since they share the same stored login:
              </p>
              <CopyCode>{`npx posthive-cli login`}</CopyCode>
              <p className="doc-p">
                This opens your browser, and once you approve, saves your credentials to <span className="doc-inline-code">~/.posthive/config.json</span>. Any client running <span className="doc-inline-code">posthive-mcp</span> locally — Cursor, VS Code, Claude Code, Codex, OpenClaw, Hermes Agent — picks this up automatically. Use <span className="doc-inline-code">npx posthive-cli whoami</span> to confirm who's logged in, or <span className="doc-inline-code">npx posthive-cli logout</span> to sign out.
              </p>
              <p className="doc-p">Self-hosted Posthive: <span className="doc-inline-code">npx posthive-cli login --api-url http://localhost:3001</span></p>
              <div className="doc-warn">
                Prefer a manually generated API key instead (CI, scripts, or without installing the CLI)? Set <span className="doc-inline-code">POSTHIVE_API_KEY</span> as an env var — it always overrides the stored login when present.
              </div>
              <CopyCode>{`POSTHIVE_API_KEY=ph_...        # Settings → API Keys
POSTHIVE_API_URL=https://api.posthive.co`}</CopyCode>

              <h3 className="doc-h3" id="mcp-claude-code">Claude Code setup</h3>
              <p className="doc-p"><strong>Recommended — one command, no API key:</strong></p>
              <CopyCode>{`claude mcp add --transport http posthive https://api.posthive.co/mcp`}</CopyCode>
              <p className="doc-p">
                The first time Claude Code calls a Posthive tool, it opens your browser to sign in. Approve once and you&apos;re connected — same OAuth flow as the Claude and ChatGPT connectors below.
              </p>
              <p className="doc-p"><strong>Alternative — sign in via the CLI, then run locally:</strong></p>
              <CopyCode>{`npx posthive-cli login
claude mcp add posthive -- npx posthive-mcp`}</CopyCode>
              <p className="doc-p">
                Useful if you&apos;d rather sign in from the terminal up front, or already ran <span className="doc-inline-code">posthive-cli login</span> for other tools.
              </p>
              <div className="doc-warn">
                <strong>How to check it&apos;s connected:</strong> run <span className="doc-inline-code">/mcp</span> inside the Claude Code terminal. You should see <span className="doc-inline-code">posthive</span> listed with a connected status — select it to see all 10 available tools. Then try a prompt like <em>&quot;list my Posthive accounts&quot;</em> to confirm it actually calls the tool and returns real data.
              </div>

              <h3 className="doc-h3" id="mcp-cursor">Cursor, VS Code, Codex, OpenClaw, Hermes Agent</h3>
              <p className="doc-p">
                Same bare Streamable HTTP + OAuth URL as the Claude and ChatGPT connectors — no API key in any config file. The client opens your browser to sign in the first time it calls a tool.
              </p>
              <CopyCode>{`https://api.posthive.co/mcp`}</CopyCode>
              <p className="doc-p"><strong>Cursor</strong> — add to <span className="doc-inline-code">.cursor/mcp.json</span>:</p>
              <CopyCode>{`{
  "mcpServers": {
    "posthive": {
      "url": "https://api.posthive.co/mcp"
    }
  }
}`}</CopyCode>
              <p className="doc-p"><strong>VS Code</strong> (GitHub Copilot Chat) — add to <span className="doc-inline-code">.vscode/mcp.json</span>:</p>
              <CopyCode>{`{
  "servers": {
    "posthive": {
      "type": "http",
      "url": "https://api.posthive.co/mcp"
    }
  }
}`}</CopyCode>
              <p className="doc-p"><strong>Codex</strong> — add to <span className="doc-inline-code">~/.codex/config.toml</span>:</p>
              <CopyCode>{`[mcp_servers.posthive]
url = "https://api.posthive.co/mcp"`}</CopyCode>
              <p className="doc-p"><strong>OpenClaw</strong>:</p>
              <CopyCode>{`openclaw mcp set posthive '{"url":"https://api.posthive.co/mcp","transport":"streamable-http"}'`}</CopyCode>
              <p className="doc-p"><strong>Hermes Agent</strong> — add to <span className="doc-inline-code">~/.hermes/config.yaml</span>:</p>
              <CopyCode>{`mcp_servers:
  posthive:
    url: "https://api.posthive.co/mcp"`}</CopyCode>
              <p className="doc-p">See the <Link href="/agent" style={{ color: "#5b63d3" }}>Agent page</Link> for step-by-step setup per client.</p>
              <div className="doc-warn">
                Prefer running the MCP server locally instead of over the network? Sign in once with <span className="doc-inline-code">npx posthive-cli login</span>, then use <span className="doc-inline-code">{`{ "command": "npx", "args": ["posthive-mcp"] }`}</span> (add <span className="doc-inline-code">&quot;type&quot;: &quot;stdio&quot;</span> where the client requires it) instead of the URL above — still no API key needed, since <span className="doc-inline-code">posthive-mcp</span> reads the same stored login.
              </div>

              <h3 className="doc-h3" id="mcp-claudeai">Claude connector (no install needed)</h3>
              <p className="doc-p">The Posthive API exposes a Streamable HTTP MCP endpoint — no local binary required. Claude handles OAuth automatically.</p>
              <p className="doc-p"><strong>Steps:</strong></p>
              <p className="doc-p">1. Go to <strong>Claude.ai → Settings → Connectors → Add custom connector</strong></p>
              <p className="doc-p">2. Enter your Posthive API URL as the connector URL:</p>
              <CopyCode>{`https://api.posthive.co/mcp`}</CopyCode>
              <p className="doc-p">3. Claude.ai will open a Posthive authorization page — log in and click <strong>Allow access</strong>.</p>
              <p className="doc-p">4. Claude.ai discovers all tools automatically. You can revoke access anytime from <strong>Settings → API Keys</strong>.</p>
              <div className="doc-warn">
                Self-hosters: replace <span className="doc-inline-code">https://api.posthive.co</span> with your own API URL. The OAuth flow and <span className="doc-inline-code">/mcp</span> endpoint are included in every deployment.
              </div>

              <h3 className="doc-h3" id="mcp-chatgpt">ChatGPT connector</h3>
              <p className="doc-p">Same Streamable HTTP + OAuth endpoint as the Claude connector above — confirmed working with ChatGPT&apos;s Developer Mode apps.</p>
              <p className="doc-p"><strong>Steps:</strong></p>
              <p className="doc-p">1. Go to <strong>ChatGPT → Settings → Apps → Advanced settings</strong> and turn on <strong>Developer mode</strong> (one-time; may require your workspace admin to allow it first).</p>
              <p className="doc-p">2. Go to <strong>Settings → Apps → Add app / Add custom connector</strong> and enter the same URL:</p>
              <CopyCode>{`https://api.posthive.co/mcp`}</CopyCode>
              <p className="doc-p">3. ChatGPT opens a Posthive authorization page — log in and click <strong>Allow access</strong>.</p>
              <p className="doc-p">4. Try a prompt like <em>&quot;@posthive list my connected accounts&quot;</em> to confirm it&apos;s working.</p>
              <div className="doc-warn">
                Developer Mode custom connectors are private to your account — no app review or OpenAI approval needed. That&apos;s separate from submitting Posthive to the public ChatGPT App Directory, which does require identity verification and review.
              </div>

              <h3 className="doc-h3" id="mcp-url-key">Manual API key in URL (fallback)</h3>
              <p className="doc-p">Prefer the <Link href="/agent" style={{ color: "#5b63d3" }}>Sign in / stdio method</Link> above wherever possible. For a client that doesn&apos;t support either — embed your API key directly in the URL. No headers, no config files beyond the URL itself:</p>
              <CopyCode>{`https://api.posthive.co/mcp/ph_your_api_key_here`}</CopyCode>
              <p className="doc-p">Paste that as the MCP server URL in your agent settings. The agent discovers all 10 tools automatically.</p>
              <p className="doc-p"><strong>Cursor:</strong> Settings → MCP → Add server → Type: HTTP → URL: paste above.</p>
              <p className="doc-p"><strong>Claude Code:</strong></p>
              <CopyCode>{`claude mcp add --transport http posthive https://api.posthive.co/mcp/ph_your_api_key_here`}</CopyCode>
              <div className="doc-warn">
                Keep this URL private — it contains your API key. Revoke and regenerate from <strong>Settings → API Keys</strong> if it leaks.
              </div>

              <h3 className="doc-h3" id="mcp-cli">CLI for shell agents (OpenClaw, custom pipelines)</h3>
              <p className="doc-p">
                Not every agent speaks MCP. For agents that run shell commands — OpenClaw, custom automation, or scripts — install <span className="doc-inline-code">posthive-cli</span>, a thin command-line wrapper over the same public API:
              </p>
              <CopyCode>{`npx posthive-cli login`}</CopyCode>
              <p className="doc-p">
                Opens your browser to sign in — no API key to copy or paste. Credentials are stored in <span className="doc-inline-code">~/.posthive/config.json</span>, shared automatically with <span className="doc-inline-code">posthive-mcp</span> too. Use <span className="doc-inline-code">posthive whoami</span> to check who's logged in, or <span className="doc-inline-code">posthive logout</span> to sign out.
              </p>
              <CopyCode>{`npx posthive-cli accounts:list
npx posthive-cli posts:create --content "Hello" --accounts acc_1,acc_2
npx posthive-cli posts:list --status draft`}</CopyCode>
              <p className="doc-p">
                Every command outputs structured JSON. The package ships a bundled <span className="doc-inline-code">skills/posthive/SKILL.md</span> that teaches agents the full command set, platform character limits, and the draft-first workflow — so capable agents can self-discover usage without extra prompting.
              </p>
              <div className="doc-warn">
                Prefer env vars for CI or scripts? <span className="doc-inline-code">POSTHIVE_API_KEY</span> and <span className="doc-inline-code">POSTHIVE_API_URL</span> always override the stored login when set.
              </div>
              <div className="doc-warn">
                Same safety model as MCP: posts default to drafts. Pass <span className="doc-inline-code">--schedule</span> explicitly to schedule directly instead of saving as a draft.
              </div>

              <h3 className="doc-h3" id="mcp-tools">Available tools</h3>
              <p className="doc-p">All tools are available on both transports. The full set:</p>
              <div style={{ overflowX: "auto", margin: "16px 0 24px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1e1e1e" }}>
                      {["Tool", "Description", "Key params"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#666", fontWeight: 600, fontSize: 11, letterSpacing: ".06em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["list_accounts", "List all connected social accounts and their IDs", "—"],
                      ["create_post", "Create a post (draft by default — nothing publishes without approval)", "content, account_ids, schedule_directly, scheduled_time, per_account, first_comment"],
                      ["get_post", "Get full details + per-platform publish status for a single post", "post_id"],
                      ["list_scheduled_posts", "List queue — filter by status, limit results", "status, limit"],
                      ["approve_draft", "Promote a draft to scheduled — closes the agent → review → publish loop", "post_id, scheduled_time"],
                      ["update_post", "Update content, time, or per-account overrides on pending/draft posts", "post_id, content, scheduled_time, first_comment, per_account"],
                      ["duplicate_post", "Clone any post as a new draft", "post_id"],
                      ["delete_post", "Delete a pending or draft post", "post_id"],
                      ["list_templates", "List saved post templates", "—"],
                      ["create_from_template", "Draft or schedule a post from a saved template (with optional overrides)", "template_id, account_ids, content_override, schedule_directly, scheduled_time"],
                    ].map(([tool, desc, params]) => (
                      <tr key={tool} style={{ borderBottom: "1px solid #111" }}>
                        <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}><span className="doc-inline-code">{tool}</span></td>
                        <td style={{ padding: "10px 12px", color: "#888" }}>{desc}</td>
                        <td style={{ padding: "10px 12px", color: "#555", fontSize: 12, fontFamily: "monospace" }}>{params}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="doc-h3" id="mcp-media">Media, video types & platform formats</h3>
              <p className="doc-p">The <span className="doc-inline-code">create_post</span> tool supports images, videos, and platform-specific formats via three optional fields:</p>
              <div style={{ overflowX: "auto", margin: "12px 0 20px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1e1e1e" }}>
                      {["Field", "Values", "Platform"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#666", fontWeight: 600, fontSize: 11, letterSpacing: ".06em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["media_urls", "Array of uploaded file URLs", "All platforms"],
                      ["media_type", '"post" | "reel" | "story"', "Instagram only"],
                      ["youtube_type", '"short" | "video"', "YouTube only"],
                    ].map(([field, values, platform]) => (
                      <tr key={field} style={{ borderBottom: "1px solid #111" }}>
                        <td style={{ padding: "10px 12px" }}><span className="doc-inline-code">{field}</span></td>
                        <td style={{ padding: "10px 12px", color: "#888", fontFamily: "monospace", fontSize: 12 }}>{values}</td>
                        <td style={{ padding: "10px 12px", color: "#666" }}>{platform}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="doc-warn" style={{ borderColor: "rgba(239,68,68,.2)", background: "rgba(239,68,68,.06)" }}>
                <strong>Media upload limitation.</strong> MCP tools cannot transfer binary files — you cannot upload an image or video directly through an agent prompt. To attach media to an MCP-created post:
                <ol style={{ margin: "10px 0 0 16px", padding: 0, lineHeight: 2 }}>
                  <li>Upload the file via <span className="doc-inline-code">POST /api/v1/upload</span> (multipart, see API Reference).</li>
                  <li>Copy the <span className="doc-inline-code">url</span> from the response.</li>
                  <li>Pass it in <span className="doc-inline-code">media_urls</span> when calling <span className="doc-inline-code">create_post</span>.</li>
                </ol>
                A media library UI for uploading assets and copying URLs without writing code is on the roadmap.
              </div>

              <h3 className="doc-h3" id="mcp-examples">Example prompts</h3>
              <p className="doc-p">Once connected, use natural language — the agent picks the right tools automatically:</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, margin: "20px 0" }}>
                {[
                  {
                    label: "Draft from scratch",
                    prompt: `List my accounts, then save a draft for Bluesky, Threads, and LinkedIn with platform-native copy — punchy hook for Threads (under 280 chars), thread format for Bluesky, long-form for LinkedIn. I'll review and schedule them myself.\n\nPost topic: "We just shipped Posthive MCP — your AI agent can now manage your entire content queue."`,
                  },
                  {
                    label: "Review & approve",
                    prompt: `List my current drafts and show me what's waiting for review. For any drafts that look ready, approve them and schedule them for tomorrow at 9am IST.`,
                  },
                  {
                    label: "Template workflow",
                    prompt: `Load my "Product launch" template, customise the copy for today's announcement, and save a draft to all my accounts. Add the product URL in the first comment.`,
                  },
                  {
                    label: "Full queue management",
                    prompt: `Show me everything scheduled for this week. Reschedule any posts that land on Saturday or Sunday to the following Monday at 10am. Delete any drafts older than 7 days.`,
                  },
                ].map((item, i) => (
                  <div key={i} style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div className="mono" style={{ fontSize: 10, color: "#5b63d3", letterSpacing: ".06em" }}>EXAMPLE {i + 1}</div>
                      <span style={{ fontSize: 11, color: "#555" }}>— {item.label}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "#bbb", lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>&ldquo;{item.prompt}&rdquo;</p>
                  </div>
                ))}
              </div>

              {/* ── API REFERENCE ── */}
              <h2 className="doc-h2" id="api-authentication">Authentication</h2>
              <p className="doc-p">
                The Posthive REST API lets you schedule posts and manage accounts programmatically — useful for AI agents, automation scripts, and custom integrations. API access is available on <strong>Pro</strong> and <strong>Team</strong> plans. When self-hosting with <span className="doc-inline-code">ENABLE_BILLING</span> unset, all users have access.
              </p>

              <h3 className="doc-h3">Base URL</h3>
              <CopyCode>{`https://your-api-url/api/v1`}</CopyCode>

              <h3 className="doc-h3">Creating an API key</h3>
              <p className="doc-p">
                Go to <strong>Settings → API Keys</strong>, enter a label (e.g. &quot;My Claude agent&quot;), and click <em>Create key</em>. The full key is shown only once — copy it immediately. Keys are prefixed with <span className="doc-inline-code">ph_</span> for easy identification.
              </p>
              <div className="doc-callout">
                Pro plan: up to 3 keys · Team plan: up to 10 keys · Self-hosted: up to 10 keys
              </div>

              <h3 className="doc-h3">Sending requests</h3>
              <p className="doc-p">Pass the key in the <span className="doc-inline-code">Authorization</span> header of every request:</p>
              <CopyCode>{`Authorization: Bearer ph_<your-key>`}</CopyCode>
              <div className="doc-warn">
                <strong>Keep keys secret.</strong> Do not commit them to source control or expose them in client-side code. Revoke any compromised key from Settings → API Keys immediately — revocation takes effect within seconds.
              </div>

              <h3 className="doc-h3">Response format</h3>
              <p className="doc-p">All responses are JSON. Successful responses return the resource directly. Errors return an object with an <span className="doc-inline-code">error</span> string field.</p>
              <CopyCode>{`# Success
{ "accounts": [ ... ] }

# Error
{ "error": "One or more accountIds are invalid" }`}</CopyCode>

              {/* ── GET /accounts ── */}
              <h2 className="doc-h2" id="api-accounts">GET /accounts</h2>
              <p className="doc-p">Returns all social accounts connected to your Posthive account. Use the returned <span className="doc-inline-code">id</span> values as <span className="doc-inline-code">accountIds</span> when creating posts.</p>

              <h3 className="doc-h3">Request</h3>
              <CopyCode>{`GET /api/v1/accounts
Authorization: Bearer ph_<key>`}</CopyCode>

              <h3 className="doc-h3">Response</h3>
              <CopyCode>{`{
  "accounts": [
    {
      "id": "cmr289odh000110a5s6rdfmzn",
      "platform": "bluesky",          // bluesky | threads | instagram | linkedin
      "displayName": "you.bsky.social", //         | mastodon | youtube  | facebook | pinterest
      "avatarUrl": "https://cdn.bsky.app/...",
      "createdAt": "2026-07-01T15:25:53.956Z"
    }
  ]
}`}</CopyCode>

              <h3 className="doc-h3">Example</h3>
              <CopyCode>{`curl https://your-api-url/api/v1/accounts \\
  -H "Authorization: Bearer ph_<key>"`}</CopyCode>

              {/* ── POST /posts ── */}
              <h2 className="doc-h2" id="api-posts-create">POST /posts</h2>
              <p className="doc-p">Schedule a post to one or more connected accounts. The post is queued and published automatically at <span className="doc-inline-code">scheduledFor</span>.</p>

              <h3 className="doc-h3">Request body</h3>
              <div className="doc-table-wrap"><table className="doc-table">
                <thead><tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td><span className="doc-inline-code">content</span></td><td>string</td><td>Yes</td><td>Post text. Used for all platforms unless overridden via <span className="doc-inline-code">perAccount</span>.</td></tr>
                  <tr><td><span className="doc-inline-code">accountIds</span></td><td>string[]</td><td>Yes</td><td>One or more account IDs from <span className="doc-inline-code">GET /accounts</span>. All must belong to your account.</td></tr>
                  <tr><td><span className="doc-inline-code">scheduledFor</span></td><td>string (ISO 8601)</td><td>Yes</td><td>Future UTC datetime to publish.</td></tr>
                  <tr><td><span className="doc-inline-code">commentText</span></td><td>string</td><td>No</td><td>First comment/reply posted immediately after the main post. Override per-platform via <span className="doc-inline-code">perAccount</span>.</td></tr>
                  <tr><td><span className="doc-inline-code">images</span></td><td>string[]</td><td>No</td><td>Image URLs from <span className="doc-inline-code">POST /upload</span>. Supported on Bluesky, Mastodon, Threads, Instagram, LinkedIn, Facebook, Telegram.</td></tr>
                  <tr><td><span className="doc-inline-code">altTexts</span></td><td>string[]</td><td>No</td><td>Alt text for each image, matched by index. Improves accessibility.</td></tr>
                  <tr><td><span className="doc-inline-code">mediaType</span></td><td><span className="doc-inline-code">&quot;post&quot; | &quot;reel&quot; | &quot;story&quot;</span></td><td>No</td><td>Instagram/Facebook media format. Defaults to <span className="doc-inline-code">&quot;post&quot;</span>.</td></tr>
                  <tr><td><span className="doc-inline-code">youtubeType</span></td><td><span className="doc-inline-code">&quot;short&quot; | &quot;video&quot;</span></td><td>No</td><td>YouTube upload format. Defaults to <span className="doc-inline-code">&quot;short&quot;</span>.</td></tr>
                  <tr><td><span className="doc-inline-code">dryRun</span></td><td>boolean</td><td>No</td><td>If <span className="doc-inline-code">true</span>, runs the full scheduling pipeline without making any real platform API calls. Useful for testing.</td></tr>
                  <tr><td><span className="doc-inline-code">perAccount</span></td><td>object</td><td>No</td><td>Per-platform content overrides keyed by account ID. See below.</td></tr>
                </tbody>
              </table></div>

              <h3 className="doc-h3">Per-platform overrides</h3>
              <p className="doc-p">Use <span className="doc-inline-code">perAccount</span> to post different text or a different first comment to specific accounts. This is the recommended approach when targeting platforms with different character limits (e.g. Bluesky 300 chars vs LinkedIn 3,000 chars).</p>
              <div className="doc-table-wrap"><table className="doc-table">
                <thead><tr><th>Platform</th><th>Char limit</th></tr></thead>
                <tbody>
                  <tr><td>Bluesky</td><td>300</td></tr>
                  <tr><td>Threads</td><td>500</td></tr>
                  <tr><td>Mastodon</td><td>500</td></tr>
                  <tr><td>Instagram</td><td>2,200</td></tr>
                  <tr><td>Facebook</td><td>63,206</td></tr>
                  <tr><td>LinkedIn</td><td>3,000</td></tr>
                  <tr><td>YouTube</td><td>5,000 (description)</td></tr>
                  <tr><td>Pinterest</td><td>100 (title) / 500 (description)</td></tr>
                  <tr><td>Telegram</td><td>4,096</td></tr>
                </tbody>
              </table></div>

              <h3 className="doc-h3">Response — 201 Created</h3>
              <CopyCode>{`{
  "id": "cmr39jppf0003iiwnt643zr91",
  "scheduledFor": "2026-07-03T10:00:00.000Z",
  "status": "pending",
  "targets": [
    {
      "id": "cmr39jppf0005iiwn0gkg3mpq",
      "accountId": "cmr289odh000110a5s6rdfmzn",
      "status": "pending"
    }
  ]
}`}</CopyCode>

              <h3 className="doc-h3">Example — multi-platform with per-account overrides</h3>
              <CopyCode>{`curl -X POST https://your-api-url/api/v1/posts \\
  -H "Authorization: Bearer ph_<key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "Short version for Bluesky (under 300 chars) 🚀",
    "accountIds": ["<bluesky-id>", "<linkedin-id>"],
    "scheduledFor": "2026-07-03T10:00:00.000Z",
    "perAccount": {
      "<linkedin-id>": {
        "text": "Longer LinkedIn version with more context and hashtags. #buildinpublic #saas",
        "commentText": "Happy to answer questions below!"
      }
    }
  }'`}</CopyCode>

              <h3 className="doc-h3">Example — dry run (test without posting)</h3>
              <CopyCode>{`curl -X POST https://your-api-url/api/v1/posts \\
  -H "Authorization: Bearer ph_<key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "Test post — will not actually publish",
    "accountIds": ["<account-id>"],
    "scheduledFor": "2026-07-03T10:00:00.000Z",
    "dryRun": true
  }'`}</CopyCode>

              {/* ── GET /posts ── */}
              <h2 className="doc-h2" id="api-posts-list">GET /posts</h2>
              <p className="doc-p">Returns your scheduled and completed posts in reverse chronological order (newest first). Supports cursor-based pagination.</p>

              <h3 className="doc-h3">Query parameters</h3>
              <div className="doc-table-wrap"><table className="doc-table">
                <thead><tr><th>Param</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td><span className="doc-inline-code">status</span></td><td>string</td><td>—</td><td>Filter by status: <span className="doc-inline-code">pending</span>, <span className="doc-inline-code">running</span>, <span className="doc-inline-code">done</span>, <span className="doc-inline-code">failed</span>. Omit to return all.</td></tr>
                  <tr><td><span className="doc-inline-code">limit</span></td><td>number</td><td>20</td><td>Results per page. Maximum 100.</td></tr>
                  <tr><td><span className="doc-inline-code">cursor</span></td><td>string</td><td>—</td><td>Post <span className="doc-inline-code">id</span> of the last item from the previous page. Omit for the first page.</td></tr>
                </tbody>
              </table></div>

              <h3 className="doc-h3">Response</h3>
              <CopyCode>{`{
  "posts": [
    {
      "id": "cmr39jppf0003iiwnt643zr91",
      "scheduledFor": "2026-07-03T10:00:00.000Z",
      "status": "done",
      "content": "Hello from the Posthive API! 🚀",
      "targets": [
        { "id": "...", "accountId": "...", "status": "done", "error": null }
      ]
    }
  ],
  "nextCursor": "cmr39jppf0003iiwnt643zr91"  // null on last page
}`}</CopyCode>

              <h3 className="doc-h3">Paginating</h3>
              <CopyCode>{`# Page 1
GET /api/v1/posts?limit=20

# Page 2 — pass the last post id as cursor
GET /api/v1/posts?limit=20&cursor=cmr39jppf0003iiwnt643zr91`}</CopyCode>

              {/* ── GET /posts/:id ── */}
              <h2 className="doc-h2" id="api-posts-get">GET /posts/:id</h2>
              <p className="doc-p">Returns a single post by ID, including full per-platform target details and any error messages.</p>

              <h3 className="doc-h3">Response</h3>
              <CopyCode>{`{
  "id": "cmr39jppf0003iiwnt643zr91",
  "scheduledFor": "2026-07-03T10:00:00.000Z",
  "status": "done",
  "content": "Hello from the Posthive API! 🚀",
  "commentText": null,
  "targets": [
    {
      "id": "cmr39jppf0005iiwn0gkg3mpq",
      "accountId": "cmr289odh000110a5s6rdfmzn",
      "status": "done",
      "error": null,
      "platformPostId": "at://did:plc:abc.../app.bsky.feed.post/123"
    }
  ],
  "createdAt": "2026-07-02T08:00:00.000Z",
  "updatedAt": "2026-07-03T10:00:05.000Z"
}`}</CopyCode>

              <h3 className="doc-h3">Target statuses</h3>
              <div className="doc-table-wrap"><table className="doc-table">
                <thead><tr><th>Status</th><th>Meaning</th></tr></thead>
                <tbody>
                  <tr><td><span className="doc-inline-code">pending</span></td><td>Waiting to be published</td></tr>
                  <tr><td><span className="doc-inline-code">running</span></td><td>Currently being published</td></tr>
                  <tr><td><span className="doc-inline-code">post_done</span></td><td>Main post published, first comment pending</td></tr>
                  <tr><td><span className="doc-inline-code">done</span></td><td>Fully published (post + comment if set)</td></tr>
                  <tr><td><span className="doc-inline-code">post_failed</span></td><td>Publishing failed — see <span className="doc-inline-code">error</span> field</td></tr>
                  <tr><td><span className="doc-inline-code">comment_failed</span></td><td>Post published but first comment failed</td></tr>
                </tbody>
              </table></div>

              <h3 className="doc-h3">Example</h3>
              <CopyCode>{`curl https://your-api-url/api/v1/posts/cmr39jppf0003iiwnt643zr91 \\
  -H "Authorization: Bearer ph_<key>"`}</CopyCode>

              {/* ── PATCH /posts/:id ── */}
              <h2 className="doc-h2" id="api-posts-patch">PATCH /posts/:id</h2>
              <p className="doc-p">Update a <span className="doc-inline-code">pending</span> post — reschedule it, change the content, swap accounts, or update the first comment. All fields are optional; only send what you want to change.</p>

              <h3 className="doc-h3">Request body</h3>
              <p className="doc-p">All fields are optional — only send what you want to change.</p>
              <div className="doc-table-wrap"><table className="doc-table">
                <thead><tr><th>Field</th><th>Type</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td><span className="doc-inline-code">scheduledFor</span></td><td>string (ISO 8601)</td><td>New publish time. Must be in the future.</td></tr>
                  <tr><td><span className="doc-inline-code">content</span></td><td>string</td><td>Replacement post text (default for all platforms).</td></tr>
                  <tr><td><span className="doc-inline-code">commentText</span></td><td>string</td><td>Replacement first comment. Pass <span className="doc-inline-code">&quot;&quot;</span> to remove.</td></tr>
                  <tr><td><span className="doc-inline-code">accountIds</span></td><td>string[]</td><td>Replace target accounts entirely. Must be non-empty.</td></tr>
                  <tr><td><span className="doc-inline-code">images</span></td><td>string[]</td><td>Replace attached images with new upload URLs.</td></tr>
                  <tr><td><span className="doc-inline-code">altTexts</span></td><td>string[]</td><td>Alt text for each image, matched by index.</td></tr>
                  <tr><td><span className="doc-inline-code">mediaType</span></td><td><span className="doc-inline-code">&quot;post&quot; | &quot;reel&quot; | &quot;story&quot;</span></td><td>Instagram/Facebook media format.</td></tr>
                  <tr><td><span className="doc-inline-code">youtubeType</span></td><td><span className="doc-inline-code">&quot;short&quot; | &quot;video&quot;</span></td><td>YouTube upload format.</td></tr>
                  <tr><td><span className="doc-inline-code">perAccount</span></td><td>object</td><td>Per-platform text/comment overrides keyed by account ID.</td></tr>
                </tbody>
              </table></div>

              <h3 className="doc-h3">Response — 200 OK</h3>
              <CopyCode>{`{
  "id": "cmr39jppf...",
  "scheduledFor": "2026-07-04T10:00:00.000Z",
  "status": "pending",
  "content": "Updated post text",
  "commentText": null
}`}</CopyCode>

              <h3 className="doc-h3">Example — reschedule only</h3>
              <CopyCode>{`curl -X PATCH https://your-api-url/api/v1/posts/cmr39jppf... \\
  -H "Authorization: Bearer ph_<key>" \\
  -H "Content-Type: application/json" \\
  -d '{ "scheduledFor": "2026-07-04T10:00:00.000Z" }'`}</CopyCode>

              {/* ── DELETE /posts/:id ── */}
              <h2 className="doc-h2" id="api-posts-delete">DELETE /posts/:id</h2>
              <p className="doc-p">Cancels and permanently deletes a <span className="doc-inline-code">pending</span> post. Posts with status <span className="doc-inline-code">running</span>, <span className="doc-inline-code">done</span>, or <span className="doc-inline-code">failed</span> cannot be deleted via the API.</p>

              <h3 className="doc-h3">Response — 200 OK</h3>
              <CopyCode>{`{ "ok": true }`}</CopyCode>

              <h3 className="doc-h3">Example</h3>
              <CopyCode>{`curl -X DELETE https://your-api-url/api/v1/posts/cmr39jppf0003iiwnt643zr91 \\
  -H "Authorization: Bearer ph_<key>"`}</CopyCode>

              {/* ── POST /upload ── */}
              <h2 className="doc-h2" id="api-upload">POST /upload</h2>
              <p className="doc-p">Upload an image or video file and get back a URL you can pass in the <span className="doc-inline-code">images</span> field of <span className="doc-inline-code">POST /posts</span>. Send as <span className="doc-inline-code">multipart/form-data</span> with the file in a field named <span className="doc-inline-code">file</span>.</p>

              <h3 className="doc-h3">Supported types</h3>
              <div className="doc-table-wrap"><table className="doc-table">
                <thead><tr><th>Type</th><th>Formats</th><th>Max size</th></tr></thead>
                <tbody>
                  <tr><td>Image</td><td><span className="doc-inline-code">image/jpeg</span>, <span className="doc-inline-code">image/png</span>, <span className="doc-inline-code">image/gif</span>, <span className="doc-inline-code">image/webp</span></td><td>10 MB</td></tr>
                  <tr><td>Video</td><td><span className="doc-inline-code">video/mp4</span>, <span className="doc-inline-code">video/quicktime</span></td><td>100 MB</td></tr>
                </tbody>
              </table></div>

              <h3 className="doc-h3">Response — 201 Created</h3>
              <CopyCode>{`{
  "url": "https://your-api-url/uploads/abc123.jpg",
  "type": "image"   // "image" | "video"
}`}</CopyCode>

              <h3 className="doc-h3">Example</h3>
              <CopyCode>{`curl -X POST https://your-api-url/api/v1/upload \\
  -H "Authorization: Bearer ph_<key>" \\
  -F "file=@/path/to/photo.jpg"

# Then use the returned URL in a post
curl -X POST https://your-api-url/api/v1/posts \\
  -H "Authorization: Bearer ph_<key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "Check out this photo!",
    "accountIds": ["cmr289odh..."],
    "scheduledFor": "2026-07-04T10:00:00.000Z",
    "images": ["https://your-api-url/uploads/abc123.jpg"]
  }'`}</CopyCode>

              {/* ── Error codes ── */}
              <h2 className="doc-h2" id="api-errors">Error codes</h2>
              <p className="doc-p">All errors return a JSON body with an <span className="doc-inline-code">error</span> field describing what went wrong.</p>
              <div className="doc-table-wrap"><table className="doc-table">
                <thead><tr><th>HTTP status</th><th>Meaning</th></tr></thead>
                <tbody>
                  <tr><td><span className="doc-inline-code">400</span></td><td>Bad request — missing or invalid field. Check the <span className="doc-inline-code">error</span> message.</td></tr>
                  <tr><td><span className="doc-inline-code">401</span></td><td>Missing, invalid, or revoked API key.</td></tr>
                  <tr><td><span className="doc-inline-code">403</span></td><td>Your plan does not include API access, or you have reached your key limit.</td></tr>
                  <tr><td><span className="doc-inline-code">404</span></td><td>Resource not found or does not belong to your account.</td></tr>
                  <tr><td><span className="doc-inline-code">500</span></td><td>Unexpected server error. Try again or contact support.</td></tr>
                </tbody>
              </table></div>

            </div>
          </main>
        </div>
      </div>
    </>
  );
}
