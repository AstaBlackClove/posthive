"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

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
    ],
  },
  {
    section: "Features",
    items: [
      { label: "Scheduling posts", id: "scheduling-posts" },
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
      { label: "Webhooks", id: "webhooks" },
    ],
  },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("quick-start");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
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
              padding: "24px 0",
              background: "#0a0a0a",
              zIndex: 46,
              transform: isDesktop || sidebarOpen ? "translateX(0)" : "translateX(-100%)",
              transition: "transform 0.2s ease",
            }}>
            {NAV.map((group) => (
              <div key={group.section}>
                <div style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: "#444",
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  padding: "16px 20px 6px",
                }}>
                  {group.section}
                </div>
                {group.items.map((item) => {
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
                        color: active ? "#ededed" : "#666",
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
            ))}
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
                Posthive is a social media scheduling platform. Write once, publish to Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, and Facebook Pages — all from a single clean interface.
              </p>

              {/* ── Quick start ── */}
              <h2 className="doc-h2" id="quick-start">Quick start</h2>
              <p className="doc-p">Get Posthive running locally in under five minutes.</p>

              <h3 className="doc-h3">1. Clone the repository</h3>
              <code className="doc-code">{`git clone https://github.com/AstaBlackClove/posthive.git
cd posthive`}</code>

              <h3 className="doc-h3">2. Copy environment files</h3>
              <code className="doc-code">{`cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env and fill in the required values`}</code>

              <h3 className="doc-h3">3. Run database migrations</h3>
              <code className="doc-code">{`cd apps/api
pnpm db:migrate`}</code>

              <h3 className="doc-h3">4. Start the dev server</h3>
              <code className="doc-code">{`# From the repo root
pnpm dev`}</code>
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
              <code className="doc-code">{`git clone https://github.com/AstaBlackClove/posthive.git
cd posthive
pnpm install`}</code>

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
              <code className="doc-code">{`# Example Railway / Dockerfile release command
pnpm db:migrate && node dist/index.js`}</code>

              {/* ── Database ── */}
              <h2 className="doc-h2" id="database">Database</h2>
              <p className="doc-p">
                Posthive uses <strong>Prisma 5</strong> with SQLite in development and Postgres in production. Switching is a one-line change in the schema.
              </p>
              <code className="doc-code">{`// apps/api/prisma/schema.prisma
datasource db {
  provider = "postgresql"   // change from "sqlite"
  url      = env("DATABASE_URL")
}`}</code>
              <p className="doc-p">Run migrations after any schema change:</p>
              <code className="doc-code">{`cd apps/api
pnpm db:migrate`}</code>
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
              <code className="doc-code">{`REDIS_URL="rediss://default:<password>@<host>:<port>"`}</code>

              {/* ── Storage ── */}
              <h2 className="doc-h2" id="storage">Storage</h2>
              <p className="doc-p">
                Uploaded media can be stored locally (dev) or in Supabase Storage (prod). Switch with the <span className="doc-inline-code">STORAGE_PROVIDER</span> env variable.
              </p>
              <h3 className="doc-h3">Local storage (default)</h3>
              <code className="doc-code">{`STORAGE_PROVIDER=local`}</code>
              <p className="doc-p">Files are written to <span className="doc-inline-code">apps/api/uploads/</span>. Not recommended for production files are lost on redeploy.</p>

              <h3 className="doc-h3">Supabase Storage</h3>
              <ol className="doc-ul" style={{ listStyle: "decimal" }}>
                <li className="doc-li">Create a Supabase project.</li>
                <li className="doc-li">In Storage, create a public bucket named <span className="doc-inline-code">media</span>.</li>
                <li className="doc-li">Copy your project URL and service role key.</li>
              </ol>
              <code className="doc-code">{`STORAGE_PROVIDER=supabase
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_KEY="eyJ..."`}</code>

              {/* ── Plans & pricing ── */}
              <h2 className="doc-h2" id="plans-pricing">Plans &amp; pricing</h2>
              <p className="doc-p">
                Posthive has four tiers. The trial is available immediately after sign-up with no card required.
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
              <code className="doc-code">{`POST https://your-api-url/billing/webhook`}</code>

              <h3 className="doc-h3">Webhook secret</h3>
              <div className="doc-warn">
                <strong>Important:</strong> Dodo Payments webhook secrets are prefixed with <span className="doc-inline-code">whsec_</span>. Strip this prefix before setting <span className="doc-inline-code">DODO_WEBHOOK_SECRET</span> the verification code base64-decodes the raw secret and will fail if the prefix is included.
              </div>
              <code className="doc-code">{`# Dodo dashboard shows: whsec_abc123...
# Set in .env:
DODO_WEBHOOK_SECRET="abc123..."`}</code>

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

            </div>
          </main>
        </div>
      </div>
    </>
  );
}
