"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { DocsMcpConnectorTabs } from "../../components/DocsMcpConnectorTabs";
import { cn } from "../../lib/cn";

function CopyCode({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <div className="relative mt-3 mb-5">
      <code className="block overflow-x-auto whitespace-pre rounded-xl border border-border bg-surface p-4 type-mono-r-s text-fg">{children}</code>
      <button onClick={copy}
        className={cn("btn-secondary absolute top-2 right-2 px-2.5 py-1 type-body-sb-xs", copied ? "text-green-700" : "text-muted")}>
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <h2 className="mt-12 mb-1 border-t border-border pt-2 type-head-sb-6 uppercase tracking-widest text-brand-800 md:type-head-sb-5">
      {children}
    </h2>
  );
}

const CALLOUT = {
  info: { box: "border-blue-200 bg-blue-50 text-blue-700", icon: "ⓘ" },
  warn: { box: "border-brand-400 bg-brand-100 text-brand-800", icon: "⚠" },
  danger: { box: "border-red-200 bg-red-50 text-red-600", icon: "⚠" },
};

function Callout({ type = "info", children }: { type?: keyof typeof CALLOUT; children: ReactNode }) {
  const c = CALLOUT[type];
  return (
    <div className={cn("mt-4 mb-6 flex items-start gap-3 rounded-xl border px-5 py-4", c.box)}>
      <span className="shrink-0 type-body-r-m">{c.icon}</span>
      <div className="min-w-0 type-body-r-s">{children}</div>
    </div>
  );
}

// Plain <th>/<td> inside are styled from here; a cell's own text color class still wins
function DocTable({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 mb-6 w-full overflow-x-auto">
      <table className="w-full min-w-120 border-collapse type-body-r-s text-muted [&_td]:border-b [&_td]:border-border [&_td]:px-3.5 [&_td]:py-2.5 [&_td]:align-top [&_th]:border-b [&_th]:border-border [&_th]:px-3.5 [&_th]:py-2.5 [&_th]:text-left [&_th]:type-body-sb-xs [&_th]:uppercase [&_th]:tracking-wide [&_tr:last-child_td]:border-b-0">
        {children}
      </table>
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
      { label: "Google Sign-In", id: "google-signin" },
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
      { label: "Pixelfed", id: "pixelfed" },
      { label: "YouTube", id: "youtube" },
      { label: "Facebook Pages", id: "facebook" },
      { label: "Pinterest", id: "pinterest" },
      { label: "Telegram", id: "telegram" },
      { label: "Nostr", id: "nostr" },
      { label: "Discord", id: "discord" },
      { label: "Tumblr", id: "tumblr" },
      { label: "Lemmy", id: "lemmy" },
      { label: "TikTok", id: "tiktok" },
    ],
  },
  {
    section: "Features",
    items: [
      { label: "AI caption assist", id: "ai-caption" },
      { label: "Scheduling posts", id: "scheduling-posts" },
      { label: "Repeat posts", id: "repeat-posts" },
      { label: "Design templates", id: "post-templates" },
      { label: "Import Plan", id: "import-plan" },
      { label: "Calendar view", id: "calendar-view" },
      { label: "First comment", id: "first-comment" },
      { label: "Per-platform overrides", id: "per-platform-overrides" },
      { label: "Media uploads", id: "media-uploads" },
      { label: "Content Library", id: "content-library" },
    ],
  },
  {
    section: "Self-hosting",
    items: [
      { label: "Docker setup", id: "docker-setup" },
      { label: "Custom domain", id: "custom-domain" },
      { label: "Persistent uploads", id: "persistent-uploads" },
      { label: "Updating", id: "updating" },
      { label: "Database", id: "database" },
      { label: "Redis", id: "redis" },
      { label: "Storage", id: "storage" },
    ],
  },
  {
    section: "Workspaces & Teams",
    items: [
      { label: "Overview", id: "workspaces-overview" },
      { label: "Inviting members", id: "workspaces-invites" },
      { label: "Roles", id: "workspaces-roles" },
      { label: "Switching workspaces", id: "workspaces-switching" },
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
    section: "Make.com Integration",
    items: [
      { label: "Overview", id: "make-overview" },
      { label: "Connect your account", id: "make-connect" },
      { label: "Available modules", id: "make-modules" },
      { label: "Example scenarios", id: "make-examples" },
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
      { label: "Hosted app connectors", id: "mcp-claudeai" },
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
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

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

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    setIsLargeScreen(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsLargeScreen(e.matches);
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
      <div className="flex h-screen flex-col overflow-hidden bg-bg">

        {/* Top nav */}
        <nav className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-bg px-5">
          {/* Left: hamburger + logo */}
          <div className="flex shrink-0 items-center gap-3.5">
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="cursor-pointer p-1.5 text-fg md:hidden"
              aria-label="Toggle sections"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </button>
            <img src="/posthivemain.png" alt="Posthive" className="h-6.5 w-auto" />
          </div>

          {/* Centre: section tabs */}
          <div className="hidden items-center gap-0.5 overflow-x-auto md:flex">
            {[
              { label: "Getting Started", id: "quick-start" },
              { label: "Platforms", id: "bluesky" },
              { label: "Self-hosting", id: "docker-setup" },
              { label: "MCP Server", id: "mcp-overview" },
              { label: "API Reference", id: "api-authentication" },
            ].map(tab => {
              const activeGroup = NAV.find(g => g.items.some(i => i.id === activeSection));
              const tabGroup = NAV.find(g => g.items.some(i => i.id === tab.id));
              const isActive = activeGroup?.section === tabGroup?.section;
              return (
                <button key={tab.id} onClick={() => scrollTo(tab.id)} className={cn(
                  "h-10 cursor-pointer whitespace-nowrap border-b-2 px-3 type-body-m-s transition-colors",
                  isActive ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg",
                )}>
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Right: back link */}
          <Link href="/" className="flex shrink-0 items-center gap-1.5 type-body-r-s text-muted transition-colors hover:text-fg">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="hidden sm:inline">Home</span>
          </Link>
        </nav>

        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 top-14 z-45 bg-black/60 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Body below nav */}
        <div className="mt-14 flex flex-1">

          {/* Sidebar */}
          <aside
            className={cn(
              "fixed top-14 bottom-0 left-0 z-46 w-62 overflow-y-auto border-r border-border bg-bg pt-5 pb-10 transition-transform duration-200",
              isDesktop || sidebarOpen ? "translate-x-0" : "-translate-x-full",
            )}>

            {/* Discord link */}
            <div className="px-4 pb-2">
              <a
                href="https://discord.gg/UEdnAtHxgN"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-2 type-body-r-s text-fg transition-colors hover:border-[#5865F2] hover:text-[#5865F2]"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                Discord
              </a>
            </div>

            {/* GitHub link */}
            <div className="px-4 pb-4">
              <a
                href="https://github.com/AstaBlackClove/posthive"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-2 type-body-r-s text-fg transition-colors hover:border-neutral-300"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                GitHub
              </a>
            </div>

            {/* Search */}
            <div className="px-4 pb-4">
              <div className="relative">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted">
                  <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
                <input
                  type="search"
                  placeholder="Search docs…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="field rounded-lg bg-surface pr-2.5 pl-8"
                />
              </div>
            </div>

            {filteredNav.length === 0 && (
              <p className="px-5 type-body-r-xs text-muted">No results for &ldquo;{search}&rdquo;</p>
            )}

            {filteredNav.map((group) => {
              const isCollapsed = search.trim() ? false : (collapsed[group.section] ?? false);
              const hasActive = group.items.some(i => i.id === activeSection);
              return (
                <div key={group.section} className="mb-1 px-2">
                  {/* Section header — click to toggle */}
                  <button
                    onClick={() => setCollapsed(c => ({ ...c, [group.section]: !isCollapsed }))}
                    className={cn(
                      "block w-full cursor-pointer px-3 pt-4.5 pb-1.5 text-left type-body-sb-s transition-colors",
                      hasActive ? "text-fg" : "text-muted hover:text-fg",
                    )}
                  >
                    {group.section}
                  </button>

                  {/* Items */}
                  {!isCollapsed && group.items.map((item) => {
                    const active = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => scrollTo(item.id)}
                        className={cn(
                          "block w-full cursor-pointer rounded-lg py-1 pr-3 pl-6 text-left transition-colors",
                          active ? "bg-brand-100 type-body-m-s text-brand-800" : "type-body-r-s text-muted hover:text-fg",
                        )}
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
          <main ref={mainRef} className={cn(
            "h-[calc(100vh-3.5rem)] min-w-0 flex-1 overflow-y-auto",
            isDesktop && "ml-62",
            isLargeScreen && "mr-55",
          )}>
            <div className="mx-auto max-w-3xl px-5 pt-13 pb-30 break-words md:px-12">

              {/* Hero */}
              <SectionLabel>Getting Started</SectionLabel>
              <h1 className="mb-2.5 type-head-sb-4 tracking-tight text-fg md:type-head-sb-3">Posthive Documentation</h1>
              <p className="mb-10 type-body-r-m text-muted">
                Schedule posts to multiple platforms from one interface with built-in MCP support for AI agents.
              </p>

              {/* Hosted version nudge — for GitHub/self-host evaluators */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3.5 py-2.5">
                <span className="type-body-r-s text-muted">
                  Don&apos;t want to manage infrastructure?
                </span>
                <Link href="/register" className="whitespace-nowrap type-body-m-s text-brand-800 hover:text-brand-900">
                  Try posthive.co free no setup needed →
                </Link>
              </div>
              <p className="mb-6 type-body-r-xs text-muted">
                New to open-source schedulers?{" "}
                <Link href="/blog/open-source-social-media-scheduler" className="text-brand-800 hover:underline">
                  Read our guide to the best open-source social media schedulers in 2026 →
                </Link>
              </p>

              {/* Quick-start cards */}
              <div className="mb-12 grid grid-cols-2 gap-3">
                {[
                  { icon: "⚡", title: "Quick start", desc: "Up and running in 5 minutes", id: "quick-start" },
                  { icon: "🐳", title: "Self-hosting", desc: "Docker setup on your own VPS", id: "docker-setup" },
                  { icon: "🤖", title: "MCP Server", desc: "Connect Claude, ChatGPT & agents", id: "mcp-overview" },
                  { icon: "🔌", title: "API Reference", desc: "Schedule posts programmatically", id: "api-authentication" },
                ].map(card => (
                  <button key={card.id} onClick={() => scrollTo(card.id)}
                    className="cursor-pointer rounded-xl border border-border bg-surface px-4.5 py-4 text-left transition-colors hover:border-neutral-300"
                  >
                    <div className="mb-2 type-body-r-xl">{card.icon}</div>
                    <div className="mb-1 type-body-sb-s text-fg">{card.title}</div>
                    <div className="type-body-r-s text-muted">{card.desc}</div>
                  </button>
                ))}
              </div>

              {/* ── Quick start ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="quick-start">Quick start</h3>
              <p className="mb-4 type-body-r-m text-muted">Get Posthive running locally in under five minutes.</p>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">1. Clone the repository</h4>
              <CopyCode>{`git clone https://github.com/AstaBlackClove/posthive.git
cd posthive`}</CopyCode>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">2. Copy environment files</h4>
              <CopyCode>{`cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env and fill in the required values`}</CopyCode>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">3. Run database migrations</h4>
              <CopyCode>{`cd apps/api
pnpm db:migrate`}</CopyCode>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">4. Start the dev server</h4>
              <CopyCode>{`# From the repo root
pnpm dev`}</CopyCode>
              <p className="mb-4 type-body-r-m text-muted">
                This starts both the API on <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">http://localhost:3001</span> and the web app on <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">http://localhost:3000</span> in parallel.
              </p>

              {/* ── Installation ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="installation">Installation</h3>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Prerequisites</h4>
              <ul className="mb-4 list-disc space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>Node.js ≥ 20</li>
                <li>pnpm ≥ 9 (<span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">npm i -g pnpm</span>)</li>
                <li>Redis Upstash free tier or Railway Redis (required for BullMQ job queue)</li>
              </ul>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Clone and install</h4>
              <CopyCode>{`git clone https://github.com/AstaBlackClove/posthive.git
cd posthive
pnpm install`}</CopyCode>

              <p className="mb-4 type-body-r-m text-muted">
                The monorepo uses pnpm workspaces. Running <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">pnpm install</span> at the root installs dependencies for both <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">apps/api</span> and <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">apps/web</span>.
              </p>

              {/* ── Environment variables ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="environment-variables">Environment variables</h3>
              <p className="mb-4 type-body-r-m text-muted">
                All configuration lives in <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">apps/api/.env</span>. Copy <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">.env.example</span> and fill in the values below.
              </p>

              <DocTable>
                <thead>
                  <tr>
                    <th>Variable</th>
                    <th>Required</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">DATABASE_URL</span></td><td>Yes</td><td>SQLite path (<code className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">file:./dev.db</code>) for dev, or a Postgres connection string for prod.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">ENCRYPTION_KEY</span></td><td>Yes</td><td>64-char hex string. Used for AES-256-GCM encryption of stored credentials. Never change after data is written.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">REDIS_URL</span></td><td>Yes</td><td>Redis connection string (e.g. <code className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">rediss://...</code>) for BullMQ job queue.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">JWT_ACCESS_SECRET</span></td><td>Yes</td><td>64-char hex. Signs short-lived access tokens.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">JWT_REFRESH_SECRET</span></td><td>Yes</td><td>64-char hex. Signs long-lived refresh tokens.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">WEB_URL</span></td><td>Yes</td><td>URL of the web app. Use <code className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">http://localhost:3000</code> in dev so auth cookies stay stable across tunnel restarts.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">PUBLIC_API_URL</span></td><td>Meta only</td><td>Public HTTPS URL of the API. Meta fetches images from this URL, so it must be reachable from the internet.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">ENABLE_BILLING</span></td><td>No</td><td>Set to <code className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">true</code> to enable Dodo Payments billing. Defaults to off for self-hosters.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">AUTH_PROVIDER</span></td><td>No</td><td><code className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">local</code> (default) or <code className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">supabase</code>. Switches the auth backend.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">GOOGLE_CLIENT_ID</span></td><td>No</td><td>Google OAuth client ID. Enables "Sign in with Google" on the login and register pages.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">GOOGLE_CLIENT_SECRET</span></td><td>No</td><td>Google OAuth client secret. Required alongside <code className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">GOOGLE_CLIENT_ID</code>.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">GOOGLE_REDIRECT_URI</span></td><td>No</td><td>Callback URL registered in Google Cloud Console. Defaults to <code className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">http://localhost:3001/auth/google/callback</code>.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">ENABLE_ANALYTICS</span></td><td>No</td><td>Set to <code className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">true</code> to enable visitor session + event tracking. Off by default self-hosters collect no data.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">ADMIN_EMAIL</span></td><td>No</td><td>Your email address. Only this account can access <code className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">/admin</code>.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">ADMIN_PIN</span></td><td>No</td><td>Second-factor PIN for <code className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">/admin</code>. Validated server-side never exposed to the browser. Set in API env only.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">ANTHROPIC_API_KEY</span></td><td>No</td><td>Anthropic API key for AI caption features (Fix Grammar, Expand, Polish, etc.). Get one at <code className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">console.anthropic.com</code>. Self-hosters supply their own key.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">TIKTOK_CLIENT_KEY</span></td><td>TikTok only</td><td>TikTok app client key from developers.tiktok.com.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">TIKTOK_CLIENT_SECRET</span></td><td>TikTok only</td><td>TikTok app client secret.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">TIKTOK_REDIRECT_URI</span></td><td>TikTok only</td><td>OAuth callback URL. Must match exactly what is registered in the TikTok developer portal.</td></tr>
                </tbody>
              </DocTable>

              <Callout type="warn">
                <strong>Warning:</strong> <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">ENCRYPTION_KEY</span> must never be changed after connected accounts have been saved. Changing it makes all stored credentials permanently unreadable.
              </Callout>

              {/* ── Google Sign-In ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="google-signin">Google Sign-In</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Adds a <strong>Continue with Google</strong> button to the login and register pages. When a user signs in with Google using an email that already has a password-based account, Posthive merges them automatically — no duplicate account is created.
              </p>
              <Callout type="info">
                Google Sign-In is optional. If you skip this, users can only register and log in with email + password.
              </Callout>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">1. Create a Google OAuth client</h4>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>Go to <a className="text-brand-800 underline underline-offset-3 hover:text-brand-900" href="https://console.cloud.google.com" target="_blank" rel="noreferrer">console.cloud.google.com</a> and open (or create) a project.</li>
                <li>Navigate to <strong>APIs &amp; Services → OAuth consent screen</strong>. Set User Type to <strong>External</strong>, fill in the app name and your email, then save.</li>
                <li>Go to <strong>APIs &amp; Services → Credentials → Create Credentials → OAuth client ID</strong>.</li>
                <li>Choose <strong>Web application</strong>. Under <strong>Authorized redirect URIs</strong> add your callback URL (e.g. <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">https://your-domain.com/auth/google/callback</span> for prod, <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">http://localhost:3001/auth/google/callback</span> for dev).</li>
                <li>Copy the <strong>Client ID</strong> and <strong>Client Secret</strong>.</li>
              </ol>

              <Callout type="info">
                If you already have a Google Cloud project for YouTube, you can reuse the same OAuth client — just add the Google Sign-In redirect URI alongside the existing YouTube one.
              </Callout>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">2. Add env vars</h4>
              <p className="mb-4 type-body-r-m text-muted">Add to <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">apps/api/.env</span>:</p>
              <CopyCode>{`GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="https://your-domain.com/auth/google/callback"`}</CopyCode>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">How account merging works</h4>
              <p className="mb-4 type-body-r-m text-muted">
                When a user clicks <strong>Continue with Google</strong>, Posthive looks up the Google account&apos;s email in the database:
              </p>
              <ul className="mb-4 list-disc space-y-1.5 pl-5 type-body-r-m text-muted">
                <li><strong>Email not found</strong> — new account created, 14-day trial started, user lands on onboarding.</li>
                <li><strong>Email matches an existing account</strong> — user is logged in to that account. The original password remains valid. Both sign-in methods work going forward.</li>
              </ul>

              {/* ── Bluesky ── */}
              <SectionLabel>Platforms</SectionLabel>
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="bluesky">Bluesky</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Bluesky uses app passwords no OAuth flow required. Connection is straightforward and does not need a public callback URL.
              </p>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">How to connect</h4>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>Go to <a className="text-brand-800 underline underline-offset-3 hover:text-brand-900" href="https://bsky.app" target="_blank" rel="noreferrer">bsky.app</a> → Settings → Privacy and Security → App Passwords.</li>
                <li>Create a new app password and copy it.</li>
                <li>Open the Accounts page in Posthive, click <strong>Connect Bluesky</strong>.</li>
                <li>Enter your Bluesky handle (e.g. <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">yourname.bsky.social</span>) and the app password.</li>
              </ol>
              <p className="mb-4 type-body-r-m text-muted">
                Posthive stores the app password encrypted with AES-256-GCM. Your main account password is never used or stored.
              </p>

              {/* ── Threads ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="threads">Threads</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Threads uses Meta OAuth 2.0. You need a Meta Developer app with the Threads use case enabled.
              </p>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Setup</h4>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>Go to <a className="text-brand-800 underline underline-offset-3 hover:text-brand-900" href="https://developers.facebook.com" target="_blank" rel="noreferrer">developers.facebook.com</a> and create an app.</li>
                <li>Add the <strong>Threads API</strong> use case to your app.</li>
                <li>Add a redirect URI matching <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">THREADS_REDIRECT_URI</span> in your env must be a public HTTPS URL.</li>
                <li>Copy your App ID and App Secret into <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">THREADS_APP_ID</span> and <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">THREADS_APP_SECRET</span>.</li>
                <li>Click <strong>Connect Threads</strong> on the Accounts page and complete the OAuth flow.</li>
              </ol>
              <p className="mb-4 type-body-r-m text-muted">
                Threads tokens expire every 60 days. Posthive automatically refreshes them before each scheduled post.
              </p>

              {/* ── Instagram ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="instagram">Instagram</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Instagram publishing requires a Professional (Business or Creator) account linked to a Facebook Page, and a Meta Developer app with the Instagram product enabled.
              </p>
              <Callout type="info">
                <strong>Important:</strong> <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">PUBLIC_API_URL</span> must be a public HTTPS URL. Meta fetches your uploaded images directly from the API server when creating carousel containers a localhost URL will not work.
              </Callout>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Supported media types</h4>
              <ul className="mb-4 list-disc space-y-1.5 pl-5 type-body-r-m text-muted">
                <li><strong>Post</strong> - single image or carousel (up to 10 images on Pro/Team)</li>
                <li><strong>Reel</strong> - short video (Pro/Team plans only)</li>
                <li><strong>Story</strong> - image or video story (Pro/Team plans only)</li>
              </ul>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Setup</h4>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>Create a Meta Developer app and add the <strong>Instagram</strong> product.</li>
                <li>Set your redirect URI to <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">INSTAGRAM_REDIRECT_URI</span> (must be public HTTPS).</li>
                <li>Fill in <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">INSTAGRAM_APP_ID</span>, <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">INSTAGRAM_APP_SECRET</span>, and <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">PUBLIC_API_URL</span>.</li>
                <li>Click <strong>Connect Instagram</strong> on the Accounts page.</li>
              </ol>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Token lifetimes</h4>
              <p className="mb-4 type-body-r-m text-muted">
                On a successful connection, Posthive exchanges your short-lived token (1 hour) for a <strong>long-lived token (60 days)</strong> that is automatically refreshed in the background — you should never need to reconnect.
              </p>

              {/* ── LinkedIn ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="linkedin">LinkedIn</h3>
              <p className="mb-4 type-body-r-m text-muted">
                LinkedIn uses OAuth 2.0 via the LinkedIn Developer platform.
              </p>
              <Callout type="warn">
                <strong>Note:</strong> Image and video uploads require <strong>elevated API access</strong> (Marketing Developer Platform approval). Without it, Posthive will publish text-only posts to LinkedIn.
              </Callout>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Setup</h4>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>Create an app at <a className="text-brand-800 underline underline-offset-3 hover:text-brand-900" href="https://developer.linkedin.com" target="_blank" rel="noreferrer">developer.linkedin.com</a>.</li>
                <li>Add the <strong>Share on LinkedIn</strong> and <strong>Sign In with LinkedIn using OpenID Connect</strong> products.</li>
                <li>Add your callback URL under <strong>Auth</strong> → <strong>Authorized redirect URLs</strong>.</li>
                <li>Set <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">LINKEDIN_CLIENT_ID</span> and <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">LINKEDIN_CLIENT_SECRET</span> in your env.</li>
                <li>Click <strong>Connect LinkedIn</strong> on the Accounts page.</li>
              </ol>

              {/* ── Mastodon ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="mastodon">Mastodon</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Posthive works with any Mastodon instance. You register an application within your own instance and paste the credentials into Posthive.
              </p>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">How to connect</h4>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>Log in to your Mastodon instance (e.g. <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">mastodon.social</span>).</li>
                <li>Go to <strong>Settings → Development → New application</strong>.</li>
                <li>Give it a name, set the redirect URI to your Posthive callback URL, and enable the <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">write:statuses</span> and <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">write:media</span> scopes.</li>
                <li>Copy the <strong>Client key</strong> and <strong>Client secret</strong>.</li>
                <li>Click <strong>Connect Mastodon</strong> in Posthive, enter your instance URL and the credentials.</li>
              </ol>

              {/* ── Pixelfed ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="pixelfed">Pixelfed</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Pixelfed is a federated, open-source photo-sharing platform built on ActivityPub — an Instagram alternative for the fediverse. Posthive connects via OAuth 2.0 and works with <strong>any Pixelfed instance</strong> (pixelfed.social, pixelfed.uno, gram.social, or your own self-hosted server).
              </p>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">How to connect</h4>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>Create a free account on any Pixelfed instance (e.g. <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">pixelfed.social</span> or <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">pixelfed.uno</span>).</li>
                <li>Set <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">PIXELFED_REDIRECT_URI</span> in your env to <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">https://your-domain.com/auth/pixelfed/callback</span>. No client ID/secret needed — Posthive registers an OAuth app dynamically on each instance.</li>
                <li>Go to <strong>Accounts</strong>, click <strong>Connect Pixelfed</strong>, enter your instance URL (e.g. <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">pixelfed.social</span>), and approve access.</li>
              </ol>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Notes</h4>
              <ul className="mb-4 list-disc space-y-1.5 pl-5 type-body-r-m text-muted">
                <li><strong>Image required</strong> — every Pixelfed post must have at least one image. The composer warns you if you try to schedule without one.</li>
                <li>Caption up to 2,001 chars, up to 4 images per post, alt text supported.</li>
                <li>Audience controls: <strong>Public</strong>, <strong>Unlisted</strong>, or <strong>Followers Only</strong> — set per post in the composer.</li>
                <li>NSFW / Sensitive toggle — blurs media behind a content warning on the instance.</li>
                <li>First comment scheduling is supported.</li>
                <li>You can connect multiple accounts from different instances simultaneously.</li>
              </ul>

              {/* ── YouTube ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="youtube">YouTube</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Posthive publishes to YouTube as <strong>Shorts</strong> (or regular videos your choice per post) using Google OAuth 2.0 and the YouTube Data API v3. Every post requires a video attached.
              </p>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">How to connect</h4>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>Create a project at <a className="text-brand-800 underline underline-offset-3 hover:text-brand-900" href="https://console.cloud.google.com" target="_blank" rel="noreferrer">console.cloud.google.com</a> and enable the <strong>YouTube Data API v3</strong>.</li>
                <li>Configure the OAuth consent screen add the <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">youtube.upload</span>, <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">youtube.readonly</span>, and <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">youtube.force-ssl</span> scopes, and add your own Google account under <strong>Audience → Test users</strong> while the app is unverified.</li>
                <li>Create an OAuth client (Web application) and copy the Client ID and Secret into <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">YOUTUBE_CLIENT_ID</span> / <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">YOUTUBE_CLIENT_SECRET</span>.</li>
                <li>Click <strong>Connect YouTube</strong> on the Accounts page and authorize.</li>
              </ol>
              <Callout type="warn">
                <strong>Important:</strong> Google requires OAuth redirect domains to be owned and verified shared tunnel domains (devtunnels.ms, ngrok, etc.) are rejected outright with <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">Error 403: access_denied</span>. Use <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">http://localhost:&lt;API_PORT&gt;/auth/youtube/callback</span> for <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">YOUTUBE_REDIRECT_URI</span> instead Google exempts localhost from domain verification. This means connecting YouTube only works from a browser on the same machine as your API server (everything else in Posthive works fine over a tunnel).
              </Callout>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Shorts vs. regular video</h4>
              <p className="mb-4 type-body-r-m text-muted">
                In Compose, the YouTube section has a <strong>Short / Video</strong> toggle. YouTube classifies Shorts by the video file itself vertical (9:16) and 60 seconds or under is the reliable threshold. Posthive auto-appends <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">#Shorts</span> to the description when "Short" is selected, but that tag alone does nothing if the video doesn't already qualify by aspect ratio and duration. Posthive checks the attached video's dimensions and warns you in the UI if it won't actually classify as a Short.
              </p>
              <p className="mb-4 type-body-r-m text-muted">
                Title and description are separate dedicated fields (not the shared Post box other platforms use) title is capped at 100 characters, description at 5,000. Selecting only YouTube accounts hides the shared Post box entirely since it isn't used.
              </p>
              <Callout type="info">
                While the Google app stays in "Testing" publishing status, refresh tokens expire after 7 days regardless of activity scheduled YouTube posts will start failing until you manually reconnect. Submit the app for Google verification to remove this limit and the 100-test-user cap.
              </Callout>

              {/* ── Facebook Pages ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="facebook">Facebook Pages</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Posthive publishes to <strong>Facebook Pages</strong> you manage via the Graph API v21.0. Text, single photo, multi-photo carousel, and video posts are all supported. The Facebook API does not allow posting to personal profiles a Page is required.
              </p>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">How to connect</h4>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>At <a className="text-brand-800 underline underline-offset-3 hover:text-brand-900" href="https://developers.facebook.com" target="_blank" rel="noreferrer">developers.facebook.com</a>, open your Meta app and add the <strong>"Manage everything on your Page"</strong> use case this grants <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">pages_manage_posts</span>, <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">pages_show_list</span>, and <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">pages_read_engagement</span>.</li>
                <li>Under <strong>Facebook Login for Business → Settings</strong>, add your callback URL as a valid OAuth redirect URI: <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">https://your-domain/auth/facebook/callback</span>.</li>
                <li>Copy the main <strong>App ID</strong> and <strong>App secret</strong> into <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">FACEBOOK_APP_ID</span> / <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">FACEBOOK_APP_SECRET</span> (same values as Threads if using the same Meta app).</li>
                <li>Create a Facebook Page at <a className="text-brand-800 underline underline-offset-3 hover:text-brand-900" href="https://facebook.com/pages/create" target="_blank" rel="noreferrer">facebook.com/pages/create</a> if you don&apos;t have one.</li>
                <li>Click <strong>Connect Facebook Page</strong> on the Accounts page and authorise all Pages you admin will be connected automatically.</li>
              </ol>
              <Callout type="info">
                First comment support requires the additional <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">pages_manage_engagement</span> permission, which needs Meta app review approval. Until approved, posts publish successfully but first comments are skipped.
              </Callout>

              {/* ── Pinterest ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="pinterest">Pinterest</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Posthive publishes <strong>Pins</strong> to Pinterest using the Pinterest API v5. Every Pinterest post requires an image — Pinterest is a visual platform and rejects posts without one.
              </p>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">How it works</h4>
              <ul className="mb-4 list-disc space-y-1.5 pl-5 type-body-r-m text-muted">
                <li><strong>Title</strong> — first line of your post text (max 100 chars).</li>
                <li><strong>Description</strong> — remaining lines (max 500 chars).</li>
                <li><strong>Link</strong> — if your post contains a URL, it is attached as the Pin destination.</li>
                <li><strong>Board</strong> — the Pin is created on the default board selected at connect time.</li>
              </ul>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Environment variables</h4>
              <DocTable>
                <thead><tr><th>Variable</th><th>Required</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">PINTEREST_CLIENT_ID</span></td><td>Yes</td><td>OAuth app Client ID from the Pinterest developer portal.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">PINTEREST_CLIENT_SECRET</span></td><td>Yes</td><td>OAuth app Client Secret.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">PINTEREST_REDIRECT_URI</span></td><td>Yes</td><td>Must match the redirect URI registered in the Pinterest app settings.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">PINTEREST_SANDBOX</span></td><td>No</td><td>Set to <code className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">true</code> to use the Pinterest sandbox API. Required for Trial access apps.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">PINTEREST_SANDBOX_TOKEN</span></td><td>No</td><td>Manually generated sandbox token from the Pinterest developer dashboard. When set, bypasses the OAuth code exchange entirely (required for Trial apps whose token exchange is restricted).</td></tr>
                </tbody>
              </DocTable>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Moving to production (after Standard access approval)</h4>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>Remove <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">PINTEREST_SANDBOX=true</span> and <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">PINTEREST_SANDBOX_TOKEN</span> from your env.</li>
                <li>The Pinterest connect button on the Accounts page will be re-enabled in the next release.</li>
                <li>Users connect via the normal OAuth flow — no manual token required.</li>
              </ol>
              <Callout type="info">
                <strong>Image required:</strong> The Schedule button is disabled when Pinterest is selected and no image has been attached. Add at least one image before scheduling a Pinterest post.
              </Callout>

              {/* ── Telegram ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="telegram">Telegram</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Posthive publishes to <strong>Telegram channels</strong> via the Telegram Bot API. No OAuth flow is required — connection uses a bot token you generate yourself. Text, images (up to 10), and video posts are supported. First comments are not available on Telegram channels.
              </p>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">How to connect</h4>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>Open Telegram and message <strong>@BotFather</strong> → send <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">/newbot</span> → follow the prompts. BotFather gives you a <strong>bot token</strong> (looks like <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">123456789:ABCdef...</span>).</li>
                <li>Create a Telegram channel — public or private.</li>
                <li>Add your bot to the channel as an <strong>Administrator</strong>: open the channel → Administrators → Add Administrator → search your bot → enable <strong>Post Messages</strong> → Done.</li>
                <li>Go to <strong>Accounts</strong> in Posthive and click <strong>Connect Telegram Channel</strong>.</li>
                <li>Paste the bot token and your channel identifier, then click Connect.</li>
              </ol>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Channel identifier</h4>
              <ul className="mb-4 list-disc space-y-1.5 pl-5 type-body-r-m text-muted">
                <li><strong>Public channels</strong> — use the username: <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">@mychannel</span></li>
                <li><strong>Private channels</strong> — use the numeric chat ID: <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">-1001234567890</span>. To find it, forward any message from the channel to <strong>@userinfobot</strong> on Telegram.</li>
              </ul>
              <Callout type="info">
                <strong>No environment variables needed.</strong> Unlike OAuth platforms, Telegram requires no server-side app credentials. Each user provides their own bot token which is stored encrypted per-user. One bot can serve multiple channels — connect each channel separately on the Accounts page.
              </Callout>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">What gets posted</h4>
              <ul className="mb-4 list-disc space-y-1.5 pl-5 type-body-r-m text-muted">
                <li><strong>Text only</strong> — sent as a plain message.</li>
                <li><strong>Single image</strong> — sent via <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">sendPhoto</span> with caption.</li>
                <li><strong>Multiple images</strong> — sent as a media group (<span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">sendMediaGroup</span>, up to 10).</li>
                <li><strong>Video</strong> — sent via <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">sendVideo</span> with caption.</li>
              </ul>

              {/* ── Nostr ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="nostr">Nostr</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Posthive publishes <strong>Kind 1 notes</strong> to Nostr relays using your keypair. No OAuth, no app approval — just paste your <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">nsec</span> private key. Text and images are supported. Images are appended as URLs in the note content and use NIP-92 imeta tags for clients that support inline rendering.
              </p>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Setup</h4>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>Go to <strong>Accounts</strong> in Posthive and click <strong>Connect Nostr</strong>.</li>
                <li>Paste your <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">nsec1...</span> private key — or click <strong>Generate a new keypair</strong> to create a fresh one.</li>
                <li>Your public key (<span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">npub</span>) and profile photo are fetched automatically from relays.</li>
              </ol>
              <Callout type="info">
                <strong>No environment variables needed.</strong> Nostr uses keypairs — there is no server-side app registration or OAuth flow. Your <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">nsec</span> is stored AES-256-GCM encrypted per-user, never logged or exposed.
              </Callout>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Relays</h4>
              <p className="mb-4 type-body-r-m text-muted">Posts are published to four well-known high-uptime relays by default:</p>
              <ul className="mb-4 list-disc space-y-1.5 pl-5 type-body-r-m text-muted">
                <li><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">wss://relay.damus.io</span></li>
                <li><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">wss://relay.nostr.band</span></li>
                <li><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">wss://nos.lol</span></li>
                <li><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">wss://relay.snort.social</span></li>
              </ul>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Images</h4>
              <p className="mb-4 type-body-r-m text-muted">
                Images must be publicly accessible URLs — they are appended to the note text so Nostr clients can fetch and render them inline. Make sure <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">PUBLIC_API_URL</span> is set to your public API URL (not localhost) so uploaded images resolve correctly on the Nostr network.
              </p>

              {/* ── Discord ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="discord">Discord</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Posthive posts to <strong>Discord channels</strong> via a webhook created automatically when you connect a channel. Text, images (up to 10), and video are supported. First comments post as replies to the original message.
              </p>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Setup</h4>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>Go to <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-brand-800 underline underline-offset-3 hover:text-brand-900">discord.com/developers</a> → <strong>New Application</strong> → name it Posthive.</li>
                <li>Go to the <strong>Bot</strong> tab → click <strong>Add Bot</strong> → copy the <strong>bot token</strong>.</li>
                <li>Go to <strong>OAuth2 → General</strong> → copy <strong>Client ID</strong> and <strong>Client Secret</strong>. Add your redirect URI.</li>
                <li>Add the following to your <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">.env</span>:</li>
              </ol>
              <pre className="mt-3 mb-5 overflow-x-auto rounded-xl border border-border bg-surface p-4 type-mono-r-s text-fg">{`DISCORD_CLIENT_ID="your-client-id"
DISCORD_CLIENT_SECRET="your-client-secret"
DISCORD_BOT_TOKEN="your-bot-token"
DISCORD_REDIRECT_URI="https://your-domain.com/auth/discord/callback"`}</pre>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted" start={5}>
                <li>Go to <strong>Accounts</strong> in Posthive → click <strong>Connect Discord</strong>.</li>
                <li>Authorise the bot on your Discord server, then pick a channel in the Posthive channel picker.</li>
              </ol>
              <Callout type="info">
                Posthive auto-creates a webhook for the selected channel. Messages post under the <strong>Posthive</strong> name. Discord shows an <strong>APP</strong> label on all programmatic posts — this is a Discord platform requirement that applies to all scheduling tools.
              </Callout>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Bot permissions required</h4>
              <ul className="mb-4 list-disc space-y-1.5 pl-5 type-body-r-m text-muted">
                <li><strong>View Channels</strong> — to access the channel</li>
                <li><strong>Send Messages</strong> — to post</li>
                <li><strong>Attach Files</strong> — for images and video</li>
                <li><strong>Read Message History</strong> — for replies</li>
                <li><strong>Manage Webhooks</strong> — to auto-create the posting webhook</li>
              </ul>

              {/* ── Tumblr ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="tumblr">Tumblr</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Posthive posts to your <strong>primary Tumblr blog</strong> using the NPF (Neue Post Format) API. Text and images are supported. Tumblr uses <strong>OAuth 1.0a</strong> — tokens never expire so you only connect once.
              </p>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>Go to <a href="https://www.tumblr.com/oauth/apps" target="_blank" rel="noopener noreferrer" className="text-brand-800 underline underline-offset-3 hover:text-brand-900">tumblr.com/oauth/apps</a> → <strong>Register application</strong>. No review required.</li>
                <li>Set <strong>Default callback URL</strong> to your production API domain + <code className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">/auth/tumblr/callback</code>.</li>
                <li>Add to your <code className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">.env</code>:</li>
              </ol>
              <pre className="mt-3 mb-5 overflow-x-auto rounded-xl border border-border bg-surface p-4 type-mono-r-s text-fg">{`TUMBLR_CONSUMER_KEY="your-consumer-key"
TUMBLR_CONSUMER_SECRET="your-consumer-secret"
TUMBLR_REDIRECT_URI="https://your-domain.com/auth/tumblr/callback"`}</pre>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted" start={4}>
                <li>Go to <strong>Accounts</strong> in Posthive → click <strong>Connect Tumblr</strong> → approve the OAuth prompt.</li>
              </ol>
              <Callout type="info">
                Tumblr app registration is instant — no business verification, no waitlist. Your consumer key is available immediately after registering.
              </Callout>

              {/* ── Lemmy ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="lemmy">Lemmy</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Posthive posts to a <strong>Lemmy community</strong> on any public instance. Lemmy uses username/password authentication — a fresh JWT is obtained per post so no token expiry issues exist.
              </p>
              <Callout type="info">
                No app registration required. You just need a Lemmy account on any instance and a community to post to.
              </Callout>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Connect</h4>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>Go to <strong>Accounts</strong> in Posthive → click <strong>Connect Lemmy</strong>.</li>
                <li>Enter your <strong>instance URL</strong> (e.g. <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">https://lemmy.world</span>), <strong>username</strong>, <strong>password</strong>, and the <strong>community name</strong> (e.g. <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">technology</span> — no <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">!</span> prefix needed).</li>
                <li>Click Connect. Posthive verifies credentials immediately.</li>
              </ol>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Supported content</h4>
              <ul className="mb-4 list-disc space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>Post text becomes the <strong>link post body</strong> or a <strong>text post</strong> if no URL is present.</li>
                <li>The first image (if any) is used as the post URL so it appears as a link preview in Lemmy.</li>
                <li>First comment automation is not supported on Lemmy.</li>
              </ul>
              <Callout type="warn">
                Lemmy credentials are stored encrypted. If you change your Lemmy password, reconnect the account in Posthive.
              </Callout>

              {/* ── TikTok ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="tiktok">TikTok</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Posthive posts <strong>videos</strong> to TikTok via the Content Posting API v2. Text-only and image posts are not supported by TikTok's API — a video file (mp4 or mov) is required.
              </p>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>Go to <a href="https://developers.tiktok.com" target="_blank" rel="noopener noreferrer" className="text-brand-800 underline underline-offset-3 hover:text-brand-900">developers.tiktok.com</a> → create an app.</li>
                <li>Add products: <strong>Login Kit</strong> and <strong>Content Posting API</strong>. Enable <strong>Direct Post</strong> under Content Posting API.</li>
                <li>Set the redirect URI to <code className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">https://your-domain.com/auth/tiktok/callback</code>.</li>
                <li>Copy your client key and secret into your API env:</li>
              </ol>
              <pre className="mt-3 mb-5 overflow-x-auto rounded-xl border border-border bg-surface p-4 type-mono-r-s text-fg">{`TIKTOK_CLIENT_KEY="your-client-key"
TIKTOK_CLIENT_SECRET="your-client-secret"
TIKTOK_REDIRECT_URI="https://your-domain.com/auth/tiktok/callback"`}</pre>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted" start={5}>
                <li>Go to <strong>Accounts</strong> in Posthive → click <strong>Connect TikTok</strong>.</li>
              </ol>
              <Callout type="warn">
                TikTok requires app review before posts can be made to public accounts. During review, your TikTok account must be set to <strong>Private</strong> and posts will be visible only to you. Once TikTok approves the app, posts go public and the account can be set back to public.
              </Callout>

              {/* ── Scheduling posts ── */}
              <SectionLabel>Features</SectionLabel>
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="ai-caption">AI caption assist</h3>
              <p className="mb-4 type-body-r-m text-muted">
                The composer and post editor include an <strong>AI</strong> button that rewrites your caption using Claude. Seven actions are available:
              </p>
              <ul className="mb-4 list-disc space-y-1.5 pl-5 type-body-r-m text-muted">
                <li><strong>Fix Grammar</strong> — corrects spelling, grammar, and punctuation.</li>
                <li><strong>Make it Concise</strong> — shortens while keeping the core message.</li>
                <li><strong>Expand</strong> — adds detail and makes the caption more engaging.</li>
                <li><strong>Rephrase</strong> — rewrites with the same meaning in a fresh voice.</li>
                <li><strong>Improve Structure</strong> — improves readability and flow.</li>
                <li><strong>Simplify Language</strong> — makes the caption easy to understand.</li>
                <li><strong>Polish my Caption</strong> — makes it compelling and professional.</li>
              </ul>
              <p className="mb-4 type-body-r-m text-muted">
                Self-hosters must set <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">ANTHROPIC_API_KEY</span> in their API env. Get a key at <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-brand-800 underline underline-offset-3 hover:text-brand-900">console.anthropic.com</a>.
              </p>
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="scheduling-posts">Scheduling posts</h3>
              <p className="mb-4 type-body-r-m text-muted">
                The Compose page is where you write and schedule posts. Everything happens in a single panel no multi-step wizard.
              </p>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Steps</h4>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>Select one or more connected accounts from the account picker at the top.</li>
                <li>Write your post in the text area. The character counter updates per-platform.</li>
                <li>Optionally attach images or video using the media button.</li>
                <li>Pick a scheduled time using the date-time picker. You can also post immediately.</li>
                <li>Click <strong>Schedule</strong>. The post is enqueued and will fire at the chosen time.</li>
              </ol>

              {/* ── Repeat posts ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="repeat-posts">Repeat posts</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Repeat scheduling automatically creates the next occurrence of a post every time the current one publishes. The chain continues indefinitely until an optional end date is reached — no manual re-scheduling needed.
              </p>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">How to set it up</h4>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>Open the <strong>Compose</strong> page and write your post.</li>
                <li>In the bottom toolbar, click <strong>Repeat Post…</strong> and choose <strong>Every Day</strong>, <strong>Every Week</strong>, or <strong>Every Month</strong>.</li>
                <li>Optionally set an <strong>until</strong> end date. Leave it blank for an indefinite repeating post.</li>
                <li>Schedule as normal. The first post fires at your chosen time; each subsequent post fires exactly +1 day / +7 days / +1 month later.</li>
              </ol>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">How it works</h4>
              <p className="mb-4 type-body-r-m text-muted">
                When a repeat post publishes successfully, the worker automatically creates the next job in the DB and enqueues it in BullMQ. The new job has a <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">repeatParentId</span> pointing back to the original post so the full chain is traceable. If a post fails, the chain does <strong>not</strong> advance — the failed job stays failed and no child is created.
              </p>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Stopping a repeat chain</h4>
              <p className="mb-4 type-body-r-m text-muted">
                Delete the upcoming scheduled post from the Posts page. Because only one future job exists at a time, deleting it stops the chain completely.
              </p>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Via API / MCP</h4>
              <p className="mb-4 type-body-r-m text-muted">
                Pass <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">repeat_interval</span> (<span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">"daily"</span> | <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">"weekly"</span> | <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">"monthly"</span>) and optionally <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">repeat_ends_at</span> (ISO 8601) to <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">create_post</span>.
              </p>

              {/* ── Design templates (anchor kept for old links) ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="post-templates">Design templates</h3>
              <p className="mb-4 type-body-r-m text-muted">
                A template is the design team&apos;s reference design for one content type: a <strong>content pillar</strong> plus a <strong>content category</strong> (for example Promotional, Case Study). There is one template per category. It holds an editable Figma file (<span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">.fig</span>, up to 50 MB) and/or a link to the design, plus an optional preview image.
              </p>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Managing templates (design team)</h4>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>Open <strong>Templates</strong>. Each pillar lists its categories; empty ones show <strong>+ Upload</strong>.</li>
                <li>Pick the pillar and category, then upload the <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">.fig</span> file (in Figma: File → Save local copy) and/or paste the Figma link.</li>
                <li>Optionally add a preview image so others recognise the layout. Replacing or deleting a template removes its old design file.</li>
              </ol>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Using a template in Compose</h4>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>In the <strong>Content type</strong> section, choose the pillar and category, or click <strong>Pick from templates</strong>. <strong>Use template</strong> in the library does the same.</li>
                <li>Only the pillar and category are filled in. Your media, caption and schedule are not touched.</li>
                <li>The design reference card shows <strong>Open in Figma</strong> and <strong>Download file</strong>. Build the final design from it, then upload the finished images to the post.</li>
              </ol>
              <p className="mb-4 type-body-r-m text-muted">
                Template files are never attached to a post. Only the design team can upload, replace or delete templates; Admin and Marketing view and use them.
              </p>

              {/* ── Import Plan ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="import-plan">Import Plan</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Import Plan turns a content planning spreadsheet into planned posts in Posthive. Open it from the <strong>Posts page</strong> (Import Plan button in the top bar).
              </p>
              <Callout type="warn">
                Import Plan creates <strong>drafts</strong>, not scheduled posts. Every row lands in the Posts page as a draft with a title and date
                — publish time defaults to 09:00 WIB. Media is still attached manually before scheduling.
              </Callout>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Supported files</h4>
              <p className="mb-4 type-body-r-m text-muted">
                CSV (UTF-8) or <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">.xlsx</span>, up to 5 MB and 1.000 data rows. For XLSX the header row is detected automatically, so extra
                title rows above the data are fine. Download a ready-made template from the <strong>Format Guide</strong> tab on the Import Plan page.
              </p>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Required columns</h4>
              <ul className="mb-4 list-disc space-y-1.5 pl-5 type-body-r-m text-muted">
                <li><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">Content Title</span> — the post title, used in the calendar.</li>
                <li><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">Post Date</span> — publish date. DD-MM-YYYY is preferred; YYYY-MM-DD, DD/MM/YYYY and YYYY/MM/DD are also accepted. Time defaults to 09:00 WIB.</li>
                <li><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">Platform</span> — LinkedIn, Instagram, Website, or Mirroring (LI&amp;Ig).</li>
              </ul>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Platform values</h4>
              <ul className="mb-4 list-disc space-y-1.5 pl-5 type-body-r-m text-muted">
                <li><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">LinkedIn</span> or <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">LI</span> — LinkedIn.</li>
                <li><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">Instagram</span> or <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">IG</span> — Instagram.</li>
                <li><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">Mirroring (LI&amp;Ig)</span> — LinkedIn and Instagram together.</li>
                <li><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">Website</span> — saved as a draft without a social target.</li>
              </ul>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Optional columns</h4>
              <p className="mb-4 type-body-r-m text-muted">
                All optional, and all can be left empty: <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">Content Pillar</span>, <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">Content Category</span>,
                <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">Link Copywrite</span> (design copy), <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">Caption</span> (final caption),
                <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">Aset Pendukung</span>, <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">PIC Content</span>,
                <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">Content Review / Acc by</span>, <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">PIC Design</span>,
                <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">Progress Content</span>, <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">Link Output</span>, and <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">Status</span>.
              </p>
              <p className="mb-4 type-body-r-m text-muted">
                <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">Link Copywrite</span> is stored raw as the design copy and <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">Caption</span> as the caption.
                Keep them separate from the start rather than reusing one column for both.
              </p>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Two-row headers</h4>
              <p className="mb-4 type-body-r-m text-muted">
                Client workbooks often repeat the required labels on a second row, for example <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">Category</span> above
                <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">Content Pillar</span> and <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">Content Category</span>. Both rows are read together,
                so that layout is supported without editing the file.
              </p>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Example CSV</h4>
              <CopyCode>{`Content Title,Post Date,Platform
Slope Stability Before the Rain Peaks,22-10-2026,Mirroring (LI&Ig)
Q4 Marketing Campaign Highlights,30-10-2026,LinkedIn / LI
Summer Vacation Photos,25-10-2026,Instagram / IG
Website Refresh Announcement,12-11-2026,Website`}</CopyCode>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Preview and importing</h4>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>Drop a CSV or XLSX file, or paste CSV into the editor on the left.</li>
                <li>Click <strong>Preview CSV</strong> — every row is validated against columns, dates, platforms, and duplicates.</li>
                <li>Review the table. Rows are marked ready, invalid, or duplicate; duplicates inside the same file are caught automatically.</li>
                <li>Select the rows you want and click <strong>Import</strong>. Selected valid rows become drafts on the Posts page.</li>
              </ol>
              <p className="mb-4 type-body-r-m text-muted">
                Dates already in the past are kept as archived drafts, and rows marked <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">Published</span> in the source file are still
                imported as drafts — nothing is published automatically.
              </p>


              {/* ── Calendar view ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="calendar-view">Calendar view</h3>
              <p className="mb-4 type-body-r-m text-muted">
                The Posts page (<span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">/jobs</span>) has both a list view and a calendar view. Toggle between them with the view switcher in the top-right corner.
              </p>
              <p className="mb-4 type-body-r-m text-muted">
                The calendar supports month, week, and day modes. Pending posts can be <strong>dragged to a new time slot</strong> to reschedule them without opening the edit dialog.
              </p>

              {/* ── First comment ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="first-comment">First comment</h3>
              <p className="mb-4 type-body-r-m text-muted">
                The first comment field lets you attach a reply that is posted immediately after the main post goes live. This is commonly used to add hashtags without cluttering the main post body, or to add a thread continuation.
              </p>
              <p className="mb-4 type-body-r-m text-muted">
                The comment is published per-platform each connected account gets its own first comment published to that platform.
              </p>

              {/* ── Per-platform overrides ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="per-platform-overrides">Per-platform overrides</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Available on <strong>Pro and Team plans</strong>. Per-platform overrides let you customise the post text for individual accounts without creating separate posts.
              </p>
              <p className="mb-4 type-body-r-m text-muted">
                Click the <strong>Customize</strong> button next to any selected account in the Compose page. A dialog opens where you can edit the content independently for that account. Accounts without an override use the main post body.
              </p>

              {/* ── Media uploads ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="media-uploads">Media uploads</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Posthive supports image and video attachments. Images can be attached by clicking the media button, dragging files into the compose area, or pasting from the clipboard.
              </p>
              <ul className="mb-4 list-disc space-y-1.5 pl-5 type-body-r-m text-muted">
                <li><strong>Creator plan:</strong> up to 4 images per post (carousel).</li>
                <li><strong>Pro / Team plans:</strong> up to 10 images per carousel.</li>
                <li>Alt text is supported click any thumbnail to add descriptive text for accessibility.</li>
                <li>In development, files are stored on local disk. In production, set <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">STORAGE_PROVIDER=r2</span> (Cloudflare R2, recommended) or <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">STORAGE_PROVIDER=supabase</span> and configure the relevant env vars.</li>
              </ul>

              {/* ── Content Library ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="content-library">Content Library</h3>
              <p className="mb-4 type-body-r-m text-muted">
                The Content Library lets you build an evergreen queue of posts that drip out automatically at your configured time slots — no manual scheduling needed. Upload a CSV once and posts go out on autopilot for weeks or months.
              </p>
              <p className="mb-4 type-body-r-m text-muted">Available on Creator, Pro, and Team plans (not available during trial).</p>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">How it works</h4>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>Go to <strong>Library</strong> in the sidebar and create a new library.</li>
                <li>Choose the social accounts to post to, your timezone, posts per day, and time slots.</li>
                <li>Upload a CSV of content items.</li>
                <li>The drip engine fires every 5 minutes and schedules one post per matching time slot — automatically.</li>
                <li>When all items are posted the library is marked <strong>Exhausted</strong>. Upload more content to reactivate it.</li>
              </ol>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">CSV format</h4>
              <p className="mb-4 type-body-r-m text-muted">Each row is one post. Supported columns:</p>
              <CopyCode>{`text,commentText
"Your post content here","Optional first comment"`}</CopyCode>
              <ul className="mb-4 list-disc space-y-1.5 pl-5 type-body-r-m text-muted">
                <li><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">text</span> — required. The post body.</li>
                <li><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">commentText</span> — optional. Auto-posted as first comment after the post publishes.</li>
              </ul>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Plan limits</h4>
              <ul className="mb-4 list-disc space-y-1.5 pl-5 type-body-r-m text-muted">
                <li><strong>Creator:</strong> 1,000 items across all libraries.</li>
                <li><strong>Pro:</strong> 20,000 items.</li>
                <li><strong>Team:</strong> 100,000 items.</li>
              </ul>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Tips</h4>
              <ul className="mb-4 list-disc space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>Create multiple libraries for different content themes or languages.</li>
                <li>Uploading new content to an exhausted library automatically reactivates it.</li>
                <li>Delete and recreate a library to start fresh with a new content set.</li>
                <li>The library respects your timezone — time slots are in local time.</li>
              </ul>

              {/* ── Docker setup ── */}
              <SectionLabel>Self-hosting</SectionLabel>
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="docker-setup">Docker setup</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Self-host Posthive on any Linux VPS, Raspberry Pi, or cloud VM — no Node.js or pnpm needed. Docker Compose starts Postgres, Redis, the API, and the web app with one command. All configuration lives in a single <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">.env</span> file at the project root.
              </p>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Prerequisites</h4>
              <ul className="mb-4 list-disc space-y-1.5 pl-5 type-body-r-m text-muted">
                <li><a href="https://docs.docker.com/engine/install/" target="_blank" rel="noopener noreferrer" className="text-brand-800 underline underline-offset-3 hover:text-brand-900">Docker Engine 24+</a> with the Compose v2 plugin (<span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">docker compose</span>, not <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">docker-compose</span>)</li>
                <li>A domain with two A records pointing at your server: <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">yourdomain.com</span> → web, <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">api.yourdomain.com</span> → API</li>
                <li>A reverse proxy (Caddy or nginx) for HTTPS termination</li>
              </ul>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Step 1 — Clone</h4>
              <CopyCode>{`git clone https://github.com/AstaBlackClove/posthive.git
cd posthive`}</CopyCode>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Step 2 — Create your <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">.env</span></h4>
              <p className="mb-4 type-body-r-m text-muted"><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">.env.docker</span> is a ready-made template with only the vars you need for Docker. Copy it to <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">.env</span> at the project root — this single file configures all four containers.</p>
              <CopyCode>{`cp .env.docker .env`}</CopyCode>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Step 3 — Generate secrets</h4>
              <p className="mb-4 type-body-r-m text-muted">Run this command three times and paste each output into <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">ENCRYPTION_KEY</span>, <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">JWT_ACCESS_SECRET</span>, and <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">JWT_REFRESH_SECRET</span>:</p>
              <CopyCode>{`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`}</CopyCode>
              <Callout type="warn">
                <strong>Critical:</strong> <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">ENCRYPTION_KEY</span> encrypts all stored OAuth tokens. Changing it after accounts are connected makes every connected account permanently unusable. Back it up somewhere safe.
              </Callout>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Step 4 — Set your URLs</h4>
              <p className="mb-4 type-body-r-m text-muted">Edit <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">.env</span> and fill in your domain. These two vars are baked into the Next.js build — set them correctly before the first build.</p>
              <CopyCode>{`POSTGRES_PASSWORD=strong_random_password

ENCRYPTION_KEY=<64-char hex>
JWT_ACCESS_SECRET=<64-char hex>
JWT_REFRESH_SECRET=<64-char hex>

WEB_URL=https://yourdomain.com
PUBLIC_API_URL=https://api.yourdomain.com`}</CopyCode>
              <p className="mb-4 type-body-r-m text-muted">Everything else in <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">.env.docker</span> is optional — uncomment only the platforms you want to enable. Redis and Postgres connection strings are set automatically by Docker Compose; you do not need to set them manually.</p>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Step 5 — Add platform OAuth vars</h4>
              <p className="mb-4 type-body-r-m text-muted">For each social platform you want to enable, uncomment its block in <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">.env</span> and set the redirect URI to <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">https://api.yourdomain.com/auth/&lt;platform&gt;/callback</span>. For example:</p>
              <CopyCode>{`THREADS_APP_ID=your-app-id
THREADS_APP_SECRET=your-app-secret
THREADS_REDIRECT_URI=https://api.yourdomain.com/auth/threads/callback`}</CopyCode>
              <p className="mb-4 type-body-r-m text-muted">Bluesky, Telegram, Nostr, Mastodon, Pixelfed, Lemmy, and Discord need no app registration — they work out of the box.</p>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Step 6 — Build and start</h4>
              <CopyCode>{`docker compose up -d --build`}</CopyCode>
              <p className="mb-4 type-body-r-m text-muted">First build takes 2–5 minutes. Once done, open your domain and register your account. Billing is disabled by default — all features are unlocked.</p>
              <DocTable>
                <thead><tr>
                  <th>Container</th>
                  <th>Default port</th>
                  <th>Purpose</th>
                </tr></thead>
                <tbody>
                  <tr>
                    <td className="text-fg">web</td>
                    <td className="text-fg">3000</td>
                    <td>Next.js frontend</td>
                  </tr>
                  <tr>
                    <td className="text-fg">api</td>
                    <td className="text-fg">3001</td>
                    <td>Fastify backend + BullMQ worker</td>
                  </tr>
                  <tr>
                    <td className="text-fg">db</td>
                    <td className="text-fg">5432 (internal)</td>
                    <td>Postgres 16</td>
                  </tr>
                  <tr>
                    <td className="text-fg">redis</td>
                    <td className="text-fg">6379 (internal)</td>
                    <td>BullMQ job queue</td>
                  </tr>
                </tbody>
              </DocTable>

              {/* ── Custom domain ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="custom-domain">Custom domain</h3>
              <p className="mb-4 type-body-r-m text-muted">Set your public URLs in <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">.env</span> before building, then point a reverse proxy at the containers.</p>
              <CopyCode>{`WEB_URL=https://yourdomain.com
PUBLIC_API_URL=https://api.yourdomain.com`}</CopyCode>
              <p className="mb-4 type-body-r-m text-muted">Rebuild after changing URLs:</p>
              <CopyCode>{`docker compose up -d --build`}</CopyCode>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Caddy (recommended — auto HTTPS)</h4>
              <CopyCode>{`yourdomain.com {
    reverse_proxy localhost:3000
}

api.yourdomain.com {
    reverse_proxy localhost:3001
}`}</CopyCode>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">nginx</h4>
              <CopyCode>{`server {
    listen 80;
    server_name yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

server {
    listen 80;
    server_name api.yourdomain.com;
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}`}</CopyCode>

              {/* ── Persistent uploads ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="persistent-uploads">Persistent uploads</h3>
              <p className="mb-4 type-body-r-m text-muted">By default, uploaded images live inside the container and are lost on rebuild. Add a named volume in <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">docker-compose.yml</span> to persist them:</p>
              <CopyCode>{`services:
  api:
    ...
    volumes:
      - uploads:/app/apps/api/uploads

volumes:
  postgres_data:
  redis_data:
  uploads:       # add this`}</CopyCode>
              <p className="mb-4 type-body-r-m text-muted">For production, use <strong>Cloudflare R2</strong> (recommended, zero egress fees) or <strong>Supabase Storage</strong> — set <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">STORAGE_PROVIDER=r2</span> or <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">STORAGE_PROVIDER=supabase</span> with the relevant env vars. Files are stored off-server and survive rebuilds automatically.</p>

              {/* ── Updating ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="updating">Updating</h3>
              <CopyCode>{`git pull
docker compose up -d --build`}</CopyCode>
              <p className="mb-4 type-body-r-m text-muted">Database migrations run automatically on API startup — no manual step needed.</p>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Railway / Render / Fly.io</h4>
              <p className="mb-4 type-body-r-m text-muted">If you prefer a managed platform over a VPS, deploy the source repo and set these commands:</p>
              <CopyCode>{`# Build command
pnpm install --frozen-lockfile --filter api... && pnpm --filter api exec prisma generate && pnpm --filter api build

# Start command
cd apps/api && node_modules/.bin/prisma migrate deploy && node dist/index.js`}</CopyCode>

              {/* ── Database ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="database">Database</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Posthive uses <strong>Prisma 5</strong> with SQLite in development and Postgres in production. Switching is a one-line change in the schema.
              </p>
              <CopyCode>{`// apps/api/prisma/schema.prisma
datasource db {
  provider = "postgresql"   // change from "sqlite"
  url      = env("DATABASE_URL")
}`}</CopyCode>
              <p className="mb-4 type-body-r-m text-muted">Run migrations after any schema change:</p>
              <CopyCode>{`cd apps/api
pnpm db:migrate`}</CopyCode>
              <Callout type="warn">
                <strong>Warning:</strong> <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">ENCRYPTION_KEY</span> must never change after accounts are saved. All stored OAuth tokens and app passwords are encrypted with this key changing it renders all connected accounts permanently unusable.
              </Callout>

              {/* ── Redis ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="redis">Redis</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Redis is used exclusively for the BullMQ job queue that powers scheduled post delivery. No application state is stored in Redis it is safe to flush between deploys as long as no posts are currently queued.
              </p>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Options</h4>
              <ul className="mb-4 list-disc space-y-1.5 pl-5 type-body-r-m text-muted">
                <li><strong>Upstash</strong> - free tier is sufficient for most self-hosters. Use the <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">rediss://</span> TLS URL.</li>
                <li><strong>Railway Redis</strong> - add the Redis plugin to your Railway project and copy the connection string.</li>
                <li><strong>Self-hosted</strong> - any Redis 6+ instance works.</li>
              </ul>
              <CopyCode>{`REDIS_URL="rediss://default:<password>@<host>:<port>"`}</CopyCode>

              {/* ── Storage ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="storage">Storage</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Uploaded media can be stored locally (dev), in Cloudflare R2 (recommended for production), or in Supabase Storage. Switch with the <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">STORAGE_PROVIDER</span> env variable.
              </p>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Local storage (default)</h4>
              <CopyCode>{`STORAGE_PROVIDER=local`}</CopyCode>
              <p className="mb-4 type-body-r-m text-muted">Files are written to <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">apps/api/uploads/</span>. Not recommended for production — files are lost on redeploy.</p>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Cloudflare R2 (recommended)</h4>
              <p className="mb-4 type-body-r-m text-muted">Zero egress fees. Files survive redeploys. Works with any S3-compatible client.</p>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>Create a Cloudflare account and open <strong>R2</strong> in the dashboard.</li>
                <li>Create a bucket (e.g. <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">posthive-uploads</span>).</li>
                <li>Under <strong>Settings → Public access</strong>, enable the public bucket URL (or connect a custom domain).</li>
                <li>Go to <strong>Manage R2 API tokens</strong> and create a token with <em>Object Read &amp; Write</em> on your bucket. Copy the Account ID, Access Key ID, and Secret Access Key.</li>
              </ol>
              <CopyCode>{`STORAGE_PROVIDER=r2
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
R2_BUCKET="posthive-uploads"
R2_PUBLIC_URL="https://pub-xxxx.r2.dev"   # your bucket's public URL`}</CopyCode>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Supabase Storage</h4>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>Create a Supabase project.</li>
                <li>In Storage, create a public bucket named <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">media</span>.</li>
                <li>Copy your project URL and service role key.</li>
              </ol>
              <CopyCode>{`STORAGE_PROVIDER=supabase
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_KEY="eyJ..."`}</CopyCode>

              {/* ── Workspaces & Teams ── */}
              <SectionLabel>Workspaces &amp; Teams</SectionLabel>
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="workspaces-overview">Overview</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Every account belongs to one or more <strong>workspaces</strong>. A workspace is the billing and collaboration unit — it owns connected accounts, scheduled posts, templates, and API keys. You get a personal workspace on sign-up, and you can create additional workspaces for separate teams or projects.
              </p>
              <p className="mb-4 type-body-r-m text-muted">
                Switch between workspaces using the workspace picker at the top of the sidebar. Each workspace has its own plan and subscription.
              </p>

              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="workspaces-invites">Inviting members</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Workspace owners and admins can invite team members from <strong>Sidebar → Team</strong>.
              </p>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>Click <strong>Invite member</strong> in the Team page header.</li>
                <li>Enter the email address and choose a role (Member or Admin).</li>
                <li>The invitee receives an email with a link to <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">/invite?token=…</span>.</li>
                <li>If they don&apos;t have an account yet, the invite link guides them through registration and auto-accepts on completion.</li>
                <li>Accepted invites are deleted from the database — they cannot be reused.</li>
              </ol>
              <Callout type="info">
                Invite links expire after 7 days. Resend from the pending invites list if needed.
              </Callout>

              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="workspaces-roles">Roles</h3>
              <DocTable>
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Can post &amp; schedule</th>
                    <th>Can manage accounts</th>
                    <th>Can invite members</th>
                    <th>Can delete workspace</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Owner</strong></td>
                    <td>Yes</td>
                    <td>Yes</td>
                    <td>Yes</td>
                    <td>Yes (if not last workspace)</td>
                  </tr>
                  <tr>
                    <td><strong>Admin</strong></td>
                    <td>Yes</td>
                    <td>Yes</td>
                    <td>Yes</td>
                    <td>No</td>
                  </tr>
                  <tr>
                    <td><strong>Member</strong></td>
                    <td>Yes</td>
                    <td>No</td>
                    <td>No</td>
                    <td>No</td>
                  </tr>
                </tbody>
              </DocTable>
              <p className="mb-4 type-body-r-m text-muted">
                Non-owners can leave a workspace from <strong>Settings → Danger zone → Leave workspace</strong>.
              </p>

              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="workspaces-switching">Switching workspaces</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Click the workspace name at the top of the sidebar to open the workspace picker. Select any workspace you belong to — all pages (posts, accounts, billing) immediately reflect that workspace&apos;s data. You can also create a new workspace from the picker.
              </p>
              <Callout type="warn">
                Each workspace has its own billing plan. Creating a second workspace starts a new trial for that workspace. Upgrade each workspace independently.
              </Callout>

              {/* ── Plans & pricing ── */}
              <SectionLabel>Billing</SectionLabel>
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="plans-pricing">Plans &amp; pricing</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Posthive has four tiers. The trial is available immediately after sign-up.
              </p>
              <DocTable>
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Accounts</th>
                    <th>Posts / month</th>
                    <th>Team members</th>
                    <th>Reels &amp; Stories</th>
                    <th>API &amp; MCP</th>
                    <th>Overrides</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Trial</td>
                    <td>3</td>
                    <td>30</td>
                    <td>1</td>
                    <td>No</td>
                    <td>No</td>
                    <td>No</td>
                  </tr>
                  <tr>
                    <td>Creator</td>
                    <td>5</td>
                    <td>400</td>
                    <td>1</td>
                    <td>No</td>
                    <td>No</td>
                    <td>No</td>
                  </tr>
                  <tr>
                    <td>Pro</td>
                    <td>15</td>
                    <td>Unlimited</td>
                    <td>2</td>
                    <td>Yes</td>
                    <td>Yes</td>
                    <td>Yes</td>
                  </tr>
                  <tr>
                    <td>Team</td>
                    <td>50</td>
                    <td>Unlimited</td>
                    <td>4</td>
                    <td>Yes</td>
                    <td>Yes</td>
                    <td>Yes</td>
                  </tr>
                </tbody>
              </DocTable>
              <p className="mb-4 type-body-r-m text-muted">
                Billing is handled through <strong>Dodo Payments</strong>. Set <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">ENABLE_BILLING=true</span> and configure your Dodo API key and product IDs to activate billing.
              </p>

              {/* ── Webhooks ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="webhooks">Webhooks</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Posthive listens for Dodo Payments webhook events to update subscription status in real time. Configure the webhook endpoint in your Dodo dashboard.
              </p>
              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Webhook URL</h4>
              <CopyCode>{`POST https://your-api-url/billing/webhook`}</CopyCode>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Webhook secret</h4>
              <Callout type="warn">
                <strong>Important:</strong> Dodo Payments webhook secrets are prefixed with <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">whsec_</span>. Strip this prefix before setting <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">DODO_WEBHOOK_SECRET</span> the verification code base64-decodes the raw secret and will fail if the prefix is included.
              </Callout>
              <CopyCode>{`# Dodo dashboard shows: whsec_abc123...
# Set in .env:
DODO_WEBHOOK_SECRET="abc123..."`}</CopyCode>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Handled events</h4>
              <DocTable>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Effect</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">payment.succeeded</span></td>
                    <td>Sets the user&apos;s plan to active for the purchased tier.</td>
                  </tr>
                  <tr>
                    <td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">subscription.cancelled</span></td>
                    <td>Marks the subscription as cancelled. Access continues until the end of the billing period.</td>
                  </tr>
                </tbody>
              </DocTable>

              {/* ── Outbound Webhooks ── */}
              <SectionLabel>Outbound Webhooks</SectionLabel>
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="outbound-webhooks">Outbound Webhooks (Zapier / n8n / Make)</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Posthive fires a <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">POST</span> request to your configured URL every time a post finishes publishing (Pro &amp; Team plans). Use this to trigger automations in Zapier, n8n, Make, or any HTTP-capable tool.
              </p>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Setup</h4>
              <p className="mb-4 type-body-r-m text-muted">Go to <strong>Settings → Webhook</strong> and paste your endpoint URL. Posthive will send a JSON payload to that URL after every successful (or failed) publish.</p>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Payload</h4>
              <CopyCode>{`{
  "event": "post.published",
  "postId": "clx7k2m9e0000abc123xyz",
  "status": "done",
  "scheduledFor": "2026-07-05T10:00:00.000Z",
  "platforms": ["bluesky", "mastodon", "linkedin"],
  "text": "Your post content here"
}`}</CopyCode>

              <DocTable>
                <thead>
                  <tr><th>Field</th><th>Type</th><th>Description</th></tr>
                </thead>
                <tbody>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">event</span></td><td>string</td><td>Always <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">post.published</span></td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">postId</span></td><td>string</td><td>The Posthive job ID</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">status</span></td><td>string</td><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">done</span> (all platforms succeeded) or <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">failed</span> (one or more failed)</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">scheduledFor</span></td><td>ISO 8601</td><td>The originally scheduled publish time</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">platforms</span></td><td>string[]</td><td>Platforms targeted (e.g. <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">["bluesky", "mastodon"]</span>)</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">text</span></td><td>string</td><td>The main post text</td></tr>
                </tbody>
              </DocTable>

              <Callout type="warn">
                Delivery is best-effort with a 10-second timeout. Posthive does not retry failed webhook deliveries — if your endpoint is down, the event is lost. Build your handler to be idempotent.
              </Callout>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg" id="outbound-webhook-n8n">n8n — Webhook trigger</h4>
              <p className="mb-4 type-body-r-m text-muted">1. Add a <strong>Webhook</strong> node in n8n and copy the URL. 2. Paste it into Posthive Settings → Webhook. 3. Connect downstream nodes — e.g. send a Slack message, log to a Google Sheet, or notify a Notion database.</p>
              <CopyCode>{`// Example: filter for only successful posts in n8n Function node
if ($json.status !== "done") return [];
return [{ json: { text: $json.text, platforms: $json.platforms } }];`}</CopyCode>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg" id="outbound-webhook-zapier">Zapier — Catch Hook</h4>
              <p className="mb-4 type-body-r-m text-muted">1. Create a new Zap → Trigger: <strong>Webhooks by Zapier → Catch Hook</strong>. 2. Copy the Zapier webhook URL and paste it into Posthive Settings → Webhook. 3. Schedule a test post in Posthive to send a sample payload. 4. Use the fields (<span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">postId</span>, <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">platforms</span>, <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">text</span>) in your Zap actions.</p>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg" id="outbound-webhook-make">Make (Integromat) — Custom Webhook</h4>
              <p className="mb-4 type-body-r-m text-muted">1. Add a <strong>Webhooks → Custom webhook</strong> module as the trigger. 2. Copy the URL and paste it into Posthive Settings → Webhook. 3. Run a test post — Make will auto-detect the payload structure. 4. Connect downstream modules.</p>

              {/* ── MAKE.COM INTEGRATION ── */}
              <SectionLabel>Make.com Integration</SectionLabel>
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="make-overview">Make.com Integration</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Posthive has a native Make.com app. Schedule and manage social media posts directly from your Make scenarios with no webhooks or custom HTTP modules needed. Connect once with your API key and use ready-made modules for every action.
              </p>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg" id="make-connect">Connect your account</h4>
              <ol className="mb-4 list-decimal space-y-1.5 pl-5 type-body-r-m text-muted">
                <li>Open <strong>Make.com</strong> and create a new scenario.</li>
                <li>Search for <strong>Posthive</strong> in the app search.</li>
                <li>Select any module and click <strong>Create a connection</strong>.</li>
                <li>In Posthive, go to <strong>Settings / API Keys</strong> and create a new API key.</li>
                <li>Paste the key (starts with <code className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">ph_</code>) into Make and click Save.</li>
              </ol>
              <p className="mb-4 type-body-r-m text-muted">API keys require a <strong>Pro or Team plan</strong>.</p>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg" id="make-modules">Available modules</h4>
              <DocTable>
                <thead><tr><th>Module</th><th>Type</th><th>Description</th></tr></thead>
                <tbody>
                  {[
                    ["List Social Accounts", "Search", "Returns all connected social accounts in your workspace"],
                    ["Create Post", "Action", "Schedule or draft a post to one or more social accounts"],
                    ["Get Post", "Action", "Retrieve a post by ID including per-platform status"],
                    ["List Posts", "Search", "Filter posts by status: pending, done, failed, or draft"],
                    ["Update Post", "Action", "Update content, schedule time, or images of a pending post"],
                    ["Delete Post", "Action", "Permanently delete a pending or draft post"],
                    ["Approve Draft", "Action", "Approve a draft and schedule it for publishing"],
                    ["Duplicate Post", "Action", "Clone an existing post as a new draft"],
                    ["List Templates", "Search", "Returns the design templates (pillar, category, Figma file/link)"],
                    ["Create Post from Template", "Action", "Create a draft for a template's pillar + category; returns the design reference"],
                  ].map(([mod, type, desc]) => (
                    <tr key={mod}><td>{mod}</td><td>{type}</td><td>{desc}</td></tr>
                  ))}
                </tbody>
              </DocTable>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg" id="make-examples">Example scenarios</h4>
              <div className="my-4 grid gap-3">
                {[
                  { title: "Content calendar", desc: "Trigger from Google Sheets or Notion and use Create Post to publish each row on a schedule." },
                  { title: "Repurpose content", desc: "Use Duplicate Post to clone top-performing content and reschedule it for a new audience." },
                  { title: "Draft approval workflow", desc: "Create Post as a draft, send a Slack notification, then Approve Draft after team review." },
                  { title: "Content-type drafts", desc: "Run Create Post from Template with a caption to open a draft per content category, then attach the finished design in Posthive." },
                ].map(s => (
                  <div key={s.title} className="rounded-xl border border-border bg-surface px-4 py-3.5">
                    <p className="mb-1 type-body-sb-s text-fg">{s.title}</p>
                    <p className="type-body-r-s text-muted">{s.desc}</p>
                  </div>
                ))}
              </div>

              {/* ── MCP SERVER ── */}
              <SectionLabel>MCP Server</SectionLabel>
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="mcp-overview">MCP Server</h3>
              <p className="mb-4 type-body-r-m text-muted">
                Posthive ships a built-in MCP (Model Context Protocol) server that exposes your scheduling queue as tools any AI agent can call — Claude, ChatGPT, Cursor, VS Code, Claude Code, Codex, OpenClaw, Hermes Agent, or your own pipeline. No API key copy-pasting required — every client uses the same bare URL and signs in via your browser. Two ways to connect:
              </p>
              <div className="mt-4 mb-6 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
                {[
                  { label: "OAuth connector", badge: "all clients", desc: "Paste the bare MCP URL — https://api.posthive.co/mcp — into any client. It opens your browser to sign in. Zero config, no API key." },
                  { label: "stdio + login", badge: "alternative", desc: "Prefer a local process over a network connection? Run `posthive-cli login`, then use the npx posthive-mcp binary instead of the URL." },
                  { label: "Key in URL", badge: "fallback", desc: "For clients that don't support OAuth discovery. Embeds your API key directly in the connector URL." },
                ].map(t => (
                  <div key={t.label} className="rounded-xl border border-border bg-surface px-4.5 py-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-border bg-bg px-1 type-mono-r-xs text-fg">{t.label}</span>
                      <span className="rounded-sm border border-brand-300 bg-brand-100 px-1.5 py-0.5 type-body-sb-xxs text-brand-800">{t.badge}</span>
                    </div>
                    <p className="type-body-r-s text-muted">{t.desc}</p>
                  </div>
                ))}
              </div>
              <Callout type="warn">
                <strong>Human-in-the-loop by default.</strong> Agent-created posts are saved as <strong>drafts</strong> and require your review before anything publishes. Open Posthive → Posts to approve, edit, or schedule them. Use <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">schedule_directly: true</span> only when you explicitly want to skip the review step.
              </Callout>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg" id="mcp-plans">Plan requirements</h4>
              <p className="mb-4 type-body-r-m text-muted">MCP access is available on <strong>Pro</strong> and <strong>Team</strong> plans. Self-hosters with billing disabled always have full access. The <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">/mcp</span> endpoint returns <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">403</span> with a clear message if your plan does not include it.</p>
              <DocTable>
                <thead>
                  <tr>
                    {["Plan", "MCP access", "API keys"].map(h => (
                      <th key={h}>{h}</th>
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
                    <tr key={plan}>
                      <td className="text-fg">{plan}</td>
                      <td className={mcp === "✓" ? "text-green-700" : "text-red-600"}>{mcp}</td>
                      <td>{keys}</td>
                    </tr>
                  ))}
                </tbody>
              </DocTable>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg" id="mcp-rate-limits">Rate limits</h4>
              <p className="mb-4 type-body-r-m text-muted">The MCP endpoints are rate-limited to protect the service:</p>
              <DocTable>
                <thead>
                  <tr>
                    {["Endpoint", "Limit"].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["POST /mcp (Bearer auth)", "60 requests / minute"],
                    ["POST /mcp/:apiKey (key in URL)", "60 requests / minute"],
                    ["POST /oauth/register", "10 registrations / minute per IP"],
                  ].map(([endpoint, limit]) => (
                    <tr key={endpoint}>
                      <td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">{endpoint}</span></td>
                      <td>{limit}</td>
                    </tr>
                  ))}
                </tbody>
              </DocTable>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg" id="mcp-install">Sign in (recommended)</h4>
              <p className="mb-4 type-body-r-m text-muted">
                Sign in once via your browser — no API key to generate, copy, or paste. This works for both the CLI and the MCP server, since they share the same stored login:
              </p>
              <CopyCode>{`npx posthive-cli login`}</CopyCode>
              <p className="mb-4 type-body-r-m text-muted">
                This opens your browser, and once you approve, saves your credentials to <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">~/.posthive/config.json</span>. Any client running <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">posthive-mcp</span> locally — Cursor, VS Code, Claude Code, Codex, OpenClaw, Hermes Agent — picks this up automatically. Use <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">npx posthive-cli whoami</span> to confirm who's logged in, or <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">npx posthive-cli logout</span> to sign out.
              </p>
              <p className="mb-4 type-body-r-m text-muted">Self-hosted Posthive: <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">npx posthive-cli login --api-url http://localhost:3001</span></p>
              <Callout type="warn">
                Prefer a manually generated API key instead (CI, scripts, or without installing the CLI)? Set <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">POSTHIVE_API_KEY</span> as an env var — it always overrides the stored login when present.
              </Callout>
              <CopyCode>{`POSTHIVE_API_KEY=ph_...        # Settings → API Keys
POSTHIVE_API_URL=https://api.posthive.co`}</CopyCode>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg" id="mcp-claude-code">Claude Code setup</h4>
              <p className="mb-4 type-body-r-m text-muted"><strong>Recommended — one command, no API key:</strong></p>
              <CopyCode>{`claude mcp add --transport http posthive https://api.posthive.co/mcp`}</CopyCode>
              <p className="mb-4 type-body-r-m text-muted">
                The first time Claude Code calls a Posthive tool, it opens your browser to sign in. Approve once and you&apos;re connected — same OAuth flow as the Claude and ChatGPT connectors below.
              </p>
              <p className="mb-4 type-body-r-m text-muted"><strong>Alternative — sign in via the CLI, then run locally:</strong></p>
              <CopyCode>{`npx posthive-cli login
claude mcp add posthive -- npx posthive-mcp`}</CopyCode>
              <p className="mb-4 type-body-r-m text-muted">
                Useful if you&apos;d rather sign in from the terminal up front, or already ran <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">posthive-cli login</span> for other tools.
              </p>
              <Callout type="warn">
                <strong>How to check it&apos;s connected:</strong> run <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">/mcp</span> inside the Claude Code terminal. You should see <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">posthive</span> listed with a connected status — select it to see all 10 available tools. Then try a prompt like <em>&quot;list my Posthive accounts&quot;</em> to confirm it actually calls the tool and returns real data.
              </Callout>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg" id="mcp-cursor">Cursor, VS Code, Codex, OpenClaw, Hermes Agent</h4>
              <p className="mb-4 type-body-r-m text-muted">
                Same bare Streamable HTTP + OAuth URL as the Claude and ChatGPT connectors — no API key in any config file. The client opens your browser to sign in the first time it calls a tool.
              </p>
              <CopyCode>{`https://api.posthive.co/mcp`}</CopyCode>
              <p className="mb-4 type-body-r-m text-muted"><strong>Cursor</strong> — add to <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">.cursor/mcp.json</span>:</p>
              <CopyCode>{`{
  "mcpServers": {
    "posthive": {
      "url": "https://api.posthive.co/mcp"
    }
  }
}`}</CopyCode>
              <p className="mb-4 type-body-r-m text-muted"><strong>VS Code</strong> (GitHub Copilot Chat) — add to <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">.vscode/mcp.json</span>:</p>
              <CopyCode>{`{
  "servers": {
    "posthive": {
      "type": "http",
      "url": "https://api.posthive.co/mcp"
    }
  }
}`}</CopyCode>
              <p className="mb-4 type-body-r-m text-muted"><strong>Codex</strong> — add to <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">~/.codex/config.toml</span>:</p>
              <CopyCode>{`[mcp_servers.posthive]
url = "https://api.posthive.co/mcp"`}</CopyCode>
              <p className="mb-4 type-body-r-m text-muted"><strong>OpenClaw</strong> — connect via MCP URL:</p>
              <CopyCode>{`openclaw mcp set posthive '{"url":"https://api.posthive.co/mcp","transport":"streamable-http"}'`}</CopyCode>
              <p className="mb-4 type-body-r-m text-muted">Or install the Posthive skill directly from ClawHub (teaches OpenClaw the full CLI command set automatically):</p>
              <CopyCode>{`openclaw skills install @astablackclove/posthive-mcp`}</CopyCode>
              <p className="mb-4 type-body-r-m text-muted"><strong>Hermes Agent</strong> — add to <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">~/.hermes/config.yaml</span>:</p>
              <CopyCode>{`mcp_servers:
  posthive:
    url: "https://api.posthive.co/mcp"`}</CopyCode>
              <p className="mb-4 type-body-r-m text-muted">See the <Link href="/agent" className="text-brand-800 underline underline-offset-3 hover:text-brand-900">Agent page</Link> for step-by-step setup per client.</p>
              <Callout type="warn">
                Prefer running the MCP server locally instead of over the network? Sign in once with <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">npx posthive-cli login</span>, then use <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">{`{ "command": "npx", "args": ["posthive-mcp"] }`}</span> (add <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">&quot;type&quot;: &quot;stdio&quot;</span> where the client requires it) instead of the URL above — still no API key needed, since <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">posthive-mcp</span> reads the same stored login.
              </Callout>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg" id="mcp-claudeai">Hosted app connectors</h4>
              <p className="mb-4 type-body-r-m text-muted">
                Claude.ai, ChatGPT, and other hosted AI clients connect via the full OAuth 2.0 + PKCE flow. These clients are auto-registered on first use — you do not need to pre-register them via <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">/oauth/register</span>. Specifically, redirect URIs from <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">claude.ai</span>, <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">chatgpt.com</span>, and <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">chat.openai.com</span> are trusted automatically.
              </p>
              <p className="mb-4 type-body-r-m text-muted">
                To disconnect, revoke the connector from the AI client&apos;s settings. This calls <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">POST /oauth/revoke</span> with your token, which immediately invalidates the API key that was issued for that session.
              </p>
              <DocsMcpConnectorTabs />

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg" id="mcp-url-key">Manual API key in URL (fallback)</h4>
              <p className="mb-4 type-body-r-m text-muted">Prefer the <Link href="/agent" className="text-brand-800 underline underline-offset-3 hover:text-brand-900">Sign in / stdio method</Link> above wherever possible. For a client that doesn&apos;t support either — embed your API key directly in the URL. No headers, no config files beyond the URL itself:</p>
              <CopyCode>{`https://api.posthive.co/mcp/ph_your_api_key_here`}</CopyCode>
              <p className="mb-4 type-body-r-m text-muted">Paste that as the MCP server URL in your agent settings. The agent discovers all 10 tools automatically.</p>
              <p className="mb-4 type-body-r-m text-muted"><strong>Cursor:</strong> Settings → MCP → Add server → Type: HTTP → URL: paste above.</p>
              <p className="mb-4 type-body-r-m text-muted"><strong>Claude Code:</strong></p>
              <CopyCode>{`claude mcp add --transport http posthive https://api.posthive.co/mcp/ph_your_api_key_here`}</CopyCode>
              <Callout type="warn">
                Keep this URL private — it contains your API key. Revoke and regenerate from <strong>Settings → API Keys</strong> if it leaks.
              </Callout>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg" id="mcp-cli">CLI for shell agents (OpenClaw, custom pipelines)</h4>
              <p className="mb-4 type-body-r-m text-muted">
                Not every agent speaks MCP. For agents that run shell commands — OpenClaw, custom automation, or scripts — install <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">posthive-cli</span>, a thin command-line wrapper over the same public API:
              </p>
              <CopyCode>{`npx posthive-cli login`}</CopyCode>
              <p className="mb-4 type-body-r-m text-muted">
                Opens your browser to sign in — no API key to copy or paste. Credentials are stored in <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">~/.posthive/config.json</span>, shared automatically with <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">posthive-mcp</span> too. Use <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">posthive whoami</span> to check who's logged in, or <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">posthive logout</span> to sign out.
              </p>
              <CopyCode>{`npx posthive-cli accounts:list
npx posthive-cli posts:create --content "Hello" --accounts acc_1,acc_2
npx posthive-cli posts:list --status draft`}</CopyCode>
              <p className="mb-4 type-body-r-m text-muted">
                Every command outputs structured JSON. The package ships a bundled <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">skills/posthive/SKILL.md</span> that teaches agents the full command set, platform character limits, and the draft-first workflow — so capable agents can self-discover usage without extra prompting.
              </p>
              <Callout type="warn">
                Prefer env vars for CI or scripts? <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">POSTHIVE_API_KEY</span> and <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">POSTHIVE_API_URL</span> always override the stored login when set.
              </Callout>
              <Callout type="warn">
                Same safety model as MCP: posts default to drafts. Pass <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">--schedule</span> explicitly to schedule directly instead of saving as a draft.
              </Callout>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg" id="mcp-tools">Available tools</h4>
              <p className="mb-4 type-body-r-m text-muted">All tools are available on both transports. The full set:</p>
              <DocTable>
                <thead>
                  <tr>
                    {["Tool", "Description", "Key params"].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["list_accounts", "List all connected social accounts and their IDs", "—"],
                    ["create_post", "Create a post (draft by default — nothing publishes without approval)", "content, account_ids, schedule_directly, scheduled_time, per_account, first_comment, dry_run"],
                    ["get_post", "Get full details + per-platform publish status for a single post", "post_id"],
                    ["list_scheduled_posts", "List queue — filter by status, limit results", "status, limit"],
                    ["approve_draft", "Promote a draft to scheduled — closes the agent → review → publish loop", "post_id, scheduled_time"],
                    ["update_post", "Update content, time, or per-account overrides on pending/draft posts", "post_id, content, scheduled_time, first_comment, per_account"],
                    ["duplicate_post", "Clone any post as a new draft", "post_id"],
                    ["delete_post", "Delete a pending or draft post", "post_id"],
                    ["list_templates", "List design templates (one reference design per content category)", "—"],
                    ["create_from_template", "Draft a post for a template's pillar + category; returns the design file/link as a reference (scheduling needs content_override)", "template_id, account_ids, content_override, first_comment_override, schedule_directly, scheduled_time"],
                  ].map(([tool, desc, params]) => (
                    <tr key={tool}>
                      <td className="whitespace-nowrap"><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">{tool}</span></td>
                      <td>{desc}</td>
                      <td className="type-mono-r-xs text-muted">{params}</td>
                    </tr>
                  ))}
                </tbody>
              </DocTable>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg" id="mcp-dry-run">Testing without publishing</h4>
              <p className="mb-4 type-body-r-m text-muted">Pass <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">dry_run: true</span> to <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">create_post</span> to run the full pipeline — validation, target resolution, content parsing — without making any real API calls to social platforms. Useful for verifying your agent&apos;s post logic before going live.</p>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg" id="mcp-media">Media, video types & platform formats</h4>
              <p className="mb-4 type-body-r-m text-muted">The <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">create_post</span> tool supports images, videos, and platform-specific formats via three optional fields:</p>
              <DocTable>
                <thead>
                  <tr>
                    {["Field", "Values", "Platform"].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["media_urls", "Array of uploaded file URLs", "All platforms"],
                    ["media_type", '"post" | "reel" | "story"', "Instagram only"],
                    ["youtube_type", '"short" | "video"', "YouTube only"],
                  ].map(([field, values, platform]) => (
                    <tr key={field}>
                      <td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">{field}</span></td>
                      <td className="type-mono-r-xs">{values}</td>
                      <td>{platform}</td>
                    </tr>
                  ))}
                </tbody>
              </DocTable>
              <Callout type="danger">
                <strong>Media upload limitation.</strong> MCP tools cannot transfer binary files — you cannot upload an image or video directly through an agent prompt. To attach media to an MCP-created post:
                <ol className="my-2.5 list-decimal space-y-1 pl-5">
                  <li>Upload the file via <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">POST /api/v1/upload</span> (multipart, see API Reference).</li>
                  <li>Copy the <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">url</span> from the response.</li>
                  <li>Pass it in <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">media_urls</span> when calling <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">create_post</span>.</li>
                </ol>
                A media library UI for uploading assets and copying URLs without writing code is on the roadmap.
              </Callout>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg" id="mcp-examples">Example prompts</h4>
              <p className="mb-4 type-body-r-m text-muted">Once connected, use natural language — the agent picks the right tools automatically:</p>
              <div className="my-5 flex flex-col gap-3">
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
                    prompt: `Find the Case Study design template, draft a post for it to all my accounts with a caption for today's client story, and send me the Figma link so I can finish the design.`,
                  },
                  {
                    label: "Full queue management",
                    prompt: `Show me everything scheduled for this week. Reschedule any posts that land on Saturday or Sunday to the following Monday at 10am. Delete any drafts older than 7 days.`,
                  },
                ].map((item, i) => (
                  <div key={i} className="rounded-xl border border-border bg-surface px-4 py-3.5">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="type-body-sb-xxs tracking-wider text-brand-800">EXAMPLE {i + 1}</div>
                      <span className="type-body-r-xs text-muted">— {item.label}</span>
                    </div>
                    <p className="whitespace-pre-wrap type-body-r-s text-fg">&ldquo;{item.prompt}&rdquo;</p>
                  </div>
                ))}
              </div>

              {/* ── API REFERENCE ── */}
              <SectionLabel>API Reference</SectionLabel>
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="api-authentication">Authentication</h3>
              <p className="mb-4 type-body-r-m text-muted">
                The Posthive REST API lets you schedule posts and manage accounts programmatically — useful for AI agents, automation scripts, and custom integrations. API access is available on <strong>Pro</strong> and <strong>Team</strong> plans. When self-hosting with <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">ENABLE_BILLING</span> unset, all users have access.
              </p>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Base URL</h4>
              <CopyCode>{`https://your-api-url/api/v1`}</CopyCode>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Creating an API key</h4>
              <p className="mb-4 type-body-r-m text-muted">
                Go to <strong>Settings → API Keys</strong>, enter a label (e.g. &quot;My Claude agent&quot;), and click <em>Create key</em>. The full key is shown only once — copy it immediately. Keys are prefixed with <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">ph_</span> for easy identification.
              </p>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Sending requests</h4>
              <p className="mb-4 type-body-r-m text-muted">Pass the key in the <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">Authorization</span> header of every request:</p>
              <CopyCode>{`Authorization: Bearer ph_<your-key>`}</CopyCode>
              <Callout type="warn">
                <strong>Keep keys secret.</strong> Do not commit them to source control or expose them in client-side code. Revoke any compromised key from Settings → API Keys immediately — revocation takes effect within seconds.
              </Callout>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Response format</h4>
              <p className="mb-4 type-body-r-m text-muted">All responses are JSON. Successful responses return the resource directly. Errors return an object with an <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">error</span> string field.</p>
              <CopyCode>{`# Success
{ "accounts": [ ... ] }

# Error
{ "error": "One or more accountIds are invalid" }`}</CopyCode>

              {/* ── GET /accounts ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="api-accounts">GET /accounts</h3>
              <p className="mb-4 type-body-r-m text-muted">Returns all social accounts connected to your Posthive account. Use the returned <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">id</span> values as <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">accountIds</span> when creating posts.</p>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Request</h4>
              <CopyCode>{`GET /api/v1/accounts
Authorization: Bearer ph_<key>`}</CopyCode>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Response</h4>
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

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Example</h4>
              <CopyCode>{`curl https://your-api-url/api/v1/accounts \\
  -H "Authorization: Bearer ph_<key>"`}</CopyCode>

              {/* ── POST /posts ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="api-posts-create">POST /posts</h3>
              <p className="mb-4 type-body-r-m text-muted">Schedule a post to one or more connected accounts. The post is queued and published automatically at <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">scheduledFor</span>.</p>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Request body</h4>
              <DocTable>
                <thead><tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">content</span></td><td>string</td><td>Yes</td><td>Post text. Used for all platforms unless overridden via <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">perAccount</span>.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">accountIds</span></td><td>string[]</td><td>Yes</td><td>One or more account IDs from <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">GET /accounts</span>. All must belong to your account.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">scheduledFor</span></td><td>string (ISO 8601)</td><td>Yes</td><td>Future UTC datetime to publish.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">commentText</span></td><td>string</td><td>No</td><td>First comment/reply posted immediately after the main post. Override per-platform via <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">perAccount</span>.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">images</span></td><td>string[]</td><td>No</td><td>Image URLs from <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">POST /upload</span>. Supported on Bluesky, Mastodon, Threads, Instagram, LinkedIn, Facebook, Telegram.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">altTexts</span></td><td>string[]</td><td>No</td><td>Alt text for each image, matched by index. Improves accessibility.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">mediaType</span></td><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">&quot;post&quot; | &quot;reel&quot; | &quot;story&quot;</span></td><td>No</td><td>Instagram/Facebook media format. Defaults to <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">&quot;post&quot;</span>.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">youtubeType</span></td><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">&quot;short&quot; | &quot;video&quot;</span></td><td>No</td><td>YouTube upload format. Defaults to <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">&quot;short&quot;</span>.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">dryRun</span></td><td>boolean</td><td>No</td><td>If <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">true</span>, runs the full scheduling pipeline without making any real platform API calls. Useful for testing.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">perAccount</span></td><td>object</td><td>No</td><td>Per-platform content overrides keyed by account ID. See below.</td></tr>
                </tbody>
              </DocTable>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Per-platform overrides</h4>
              <p className="mb-4 type-body-r-m text-muted">Use <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">perAccount</span> to post different text or a different first comment to specific accounts. This is the recommended approach when targeting platforms with different character limits (e.g. Bluesky 300 chars vs LinkedIn 3,000 chars).</p>
              <DocTable>
                <thead><tr><th>Platform</th><th>Char limit</th></tr></thead>
                <tbody>
                  <tr><td>Bluesky</td><td>300</td></tr>
                  <tr><td>Threads</td><td>500</td></tr>
                  <tr><td>Mastodon</td><td>500</td></tr>
                  <tr><td>Pixelfed</td><td>2,200</td></tr>
                  <tr><td>Instagram</td><td>2,200</td></tr>
                  <tr><td>Facebook</td><td>63,206</td></tr>
                  <tr><td>LinkedIn</td><td>3,000</td></tr>
                  <tr><td>YouTube</td><td>5,000 (description)</td></tr>
                  <tr><td>Pinterest</td><td>100 (title) / 500 (description)</td></tr>
                  <tr><td>Telegram</td><td>4,096</td></tr>
                </tbody>
              </DocTable>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Response — 201 Created</h4>
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

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Example — multi-platform with per-account overrides</h4>
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

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Example — dry run (test without posting)</h4>
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
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="api-posts-list">GET /posts</h3>
              <p className="mb-4 type-body-r-m text-muted">Returns your scheduled and completed posts in reverse chronological order (newest first). Supports cursor-based pagination.</p>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Query parameters</h4>
              <DocTable>
                <thead><tr><th>Param</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">status</span></td><td>string</td><td>—</td><td>Filter by status: <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">pending</span>, <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">running</span>, <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">done</span>, <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">failed</span>. Omit to return all.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">limit</span></td><td>number</td><td>20</td><td>Results per page. Maximum 100.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">cursor</span></td><td>string</td><td>—</td><td>Post <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">id</span> of the last item from the previous page. Omit for the first page.</td></tr>
                </tbody>
              </DocTable>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Response</h4>
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

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Paginating</h4>
              <CopyCode>{`# Page 1
GET /api/v1/posts?limit=20

# Page 2 — pass the last post id as cursor
GET /api/v1/posts?limit=20&cursor=cmr39jppf0003iiwnt643zr91`}</CopyCode>

              {/* ── GET /posts/:id ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="api-posts-get">GET /posts/:id</h3>
              <p className="mb-4 type-body-r-m text-muted">Returns a single post by ID, including full per-platform target details and any error messages.</p>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Response</h4>
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

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Target statuses</h4>
              <DocTable>
                <thead><tr><th>Status</th><th>Meaning</th></tr></thead>
                <tbody>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">pending</span></td><td>Waiting to be published</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">running</span></td><td>Currently being published</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">post_done</span></td><td>Main post published, first comment pending</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">done</span></td><td>Fully published (post + comment if set)</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">post_failed</span></td><td>Publishing failed — see <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">error</span> field</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">comment_failed</span></td><td>Post published but first comment failed</td></tr>
                </tbody>
              </DocTable>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Example</h4>
              <CopyCode>{`curl https://your-api-url/api/v1/posts/cmr39jppf0003iiwnt643zr91 \\
  -H "Authorization: Bearer ph_<key>"`}</CopyCode>

              {/* ── PATCH /posts/:id ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="api-posts-patch">PATCH /posts/:id</h3>
              <p className="mb-4 type-body-r-m text-muted">Update a <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">pending</span> post — reschedule it, change the content, swap accounts, or update the first comment. All fields are optional; only send what you want to change.</p>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Request body</h4>
              <p className="mb-4 type-body-r-m text-muted">All fields are optional — only send what you want to change.</p>
              <DocTable>
                <thead><tr><th>Field</th><th>Type</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">scheduledFor</span></td><td>string (ISO 8601)</td><td>New publish time. Must be in the future.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">content</span></td><td>string</td><td>Replacement post text (default for all platforms).</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">commentText</span></td><td>string</td><td>Replacement first comment. Pass <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">&quot;&quot;</span> to remove.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">accountIds</span></td><td>string[]</td><td>Replace target accounts entirely. Must be non-empty.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">images</span></td><td>string[]</td><td>Replace attached images with new upload URLs.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">altTexts</span></td><td>string[]</td><td>Alt text for each image, matched by index.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">mediaType</span></td><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">&quot;post&quot; | &quot;reel&quot; | &quot;story&quot;</span></td><td>Instagram/Facebook media format.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">youtubeType</span></td><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">&quot;short&quot; | &quot;video&quot;</span></td><td>YouTube upload format.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">perAccount</span></td><td>object</td><td>Per-platform text/comment overrides keyed by account ID.</td></tr>
                </tbody>
              </DocTable>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Response — 200 OK</h4>
              <CopyCode>{`{
  "id": "cmr39jppf...",
  "scheduledFor": "2026-07-04T10:00:00.000Z",
  "status": "pending",
  "content": "Updated post text",
  "commentText": null
}`}</CopyCode>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Example — reschedule only</h4>
              <CopyCode>{`curl -X PATCH https://your-api-url/api/v1/posts/cmr39jppf... \\
  -H "Authorization: Bearer ph_<key>" \\
  -H "Content-Type: application/json" \\
  -d '{ "scheduledFor": "2026-07-04T10:00:00.000Z" }'`}</CopyCode>

              {/* ── DELETE /posts/:id ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="api-posts-delete">DELETE /posts/:id</h3>
              <p className="mb-4 type-body-r-m text-muted">Cancels and permanently deletes a <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">pending</span> post. Posts with status <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">running</span>, <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">done</span>, or <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">failed</span> cannot be deleted via the API.</p>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Response — 200 OK</h4>
              <CopyCode>{`{ "ok": true }`}</CopyCode>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Example</h4>
              <CopyCode>{`curl -X DELETE https://your-api-url/api/v1/posts/cmr39jppf0003iiwnt643zr91 \\
  -H "Authorization: Bearer ph_<key>"`}</CopyCode>

              {/* ── POST /upload ── */}
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="api-upload">POST /upload</h3>
              <p className="mb-4 type-body-r-m text-muted">Upload an image or video file and get back a URL you can pass in the <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">images</span> field of <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">POST /posts</span>. Send as <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">multipart/form-data</span> with the file in a field named <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">file</span>.</p>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Supported types</h4>
              <DocTable>
                <thead><tr><th>Type</th><th>Formats</th><th>Max size</th></tr></thead>
                <tbody>
                  <tr><td>Image</td><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">image/jpeg</span>, <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">image/png</span>, <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">image/gif</span>, <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">image/webp</span></td><td>10 MB</td></tr>
                  <tr><td>Video</td><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">video/mp4</span>, <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">video/quicktime</span></td><td>100 MB</td></tr>
                </tbody>
              </DocTable>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Response — 201 Created</h4>
              <CopyCode>{`{
  "url": "https://your-api-url/uploads/abc123.jpg",
  "type": "image"   // "image" | "video"
}`}</CopyCode>

              <h4 className="mt-7 mb-2.5 type-body-sb-m text-fg">Example</h4>
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
              <h3 className="mt-6 mb-2.5 type-head-sb-5 text-fg" id="api-errors">Error codes</h3>
              <p className="mb-4 type-body-r-m text-muted">All errors return a JSON body with an <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">error</span> field describing what went wrong.</p>
              <DocTable>
                <thead><tr><th>HTTP status</th><th>Meaning</th></tr></thead>
                <tbody>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">400</span></td><td>Bad request — missing or invalid field. Check the <span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">error</span> message.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">401</span></td><td>Missing, invalid, or revoked API key.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">403</span></td><td>Your plan does not include API access, or you have reached your key limit.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">404</span></td><td>Resource not found or does not belong to your account.</td></tr>
                  <tr><td><span className="rounded-md border border-border bg-surface px-1 type-mono-r-s text-fg">500</span></td><td>Unexpected server error. Try again or contact support.</td></tr>
                </tbody>
              </DocTable>

            </div>
          </main>

          {/* ── On this page (right panel) ── */}
          {isLargeScreen && (() => {
            const activeGroup = NAV.find(g => g.items.some(i => i.id === activeSection));
            return (
              <aside className="fixed top-14 right-0 bottom-0 w-55 overflow-y-auto border-l border-border bg-bg px-5 pt-8 pb-10">
                <p className="mb-3.5 type-body-sb-xs uppercase tracking-wider text-muted">
                  On this page
                </p>
                {activeGroup?.items.map(item => {
                  const active = item.id === activeSection;
                  return (
                    <button
                      key={item.id}
                      onClick={() => scrollTo(item.id)}
                      className={cn(
                        "mb-0.5 block w-full cursor-pointer border-l-2 py-1 pl-2.5 text-left transition-colors",
                        active ? "border-accent type-body-m-xs text-brand-800" : "border-border type-body-r-xs text-muted hover:text-fg",
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </aside>
            );
          })()}

        </div>
      </div>
    </>
  );
}
