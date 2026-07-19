"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { apiFetch } from "../lib/api";
import { TrialBanner } from "./TrialBanner";
import { useToast } from "./Toast";

const NAV_GROUPS = [
  {
    label: "Posts",
    items: [
      {
        href: "/jobs",
        label: "Posts",
        icon: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
      },
      {
        href: "/analytics",
        label: "Analytics",
        icon: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
      },
    ],
  },
  {
    label: "Workspace",
    items: [
      {
        href: "/accounts",
        label: "Accounts",
        icon: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
      },
      {
        href: "/team",
        label: "Team",
        icon: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
      },
    ],
  },
  {
    label: "Configuration",
    items: [
      {
        href: "/settings",
        label: "Settings",
        icon: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
      },
      {
        href: "/integrations",
        label: "Integrations",
        icon: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
      },
      {
        href: "/billing",
        label: "Billing",
        icon: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { workspaces, activeWorkspace, switchWorkspace } = useWorkspace();
  const { success, error } = useToast();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  // Workspace switcher
  const [wsOpen, setWsOpen] = useState(false);
  const wsRef = useRef<HTMLDivElement>(null);

  // New workspace modal
  const [newWsOpen, setNewWsOpen] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [newWsLoading, setNewWsLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  // Feedback modal
  const [fbOpen, setFbOpen] = useState(false);
  const [fbType, setFbType] = useState<"bug" | "feature" | "general">("general");
  const [fbMessage, setFbMessage] = useState("");
  const [fbLoading, setFbLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Close workspace dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wsRef.current && !wsRef.current.contains(e.target as Node)) {
        setWsOpen(false);
      }
    }
    if (wsOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [wsOpen]);

  const showCollapsed = collapsed && isDesktop;

  function toggleCollapsed() {
    setCollapsed((prev) => {
      localStorage.setItem("sidebar-collapsed", String(!prev));
      return !prev;
    });
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  async function handleSwitch(id: string) {
    if (id === activeWorkspace?.id) { setWsOpen(false); return; }
    setSwitchingId(id);
    try {
      await switchWorkspace(id);
    } catch {
      error("Failed to switch workspace");
      setSwitchingId(null);
    }
  }

  async function submitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!fbMessage.trim()) return;
    setFbLoading(true);
    try {
      await apiFetch("/feedback", {
        method: "POST",
        body: JSON.stringify({ type: fbType, message: fbMessage.trim(), url: window.location.pathname }),
      });
      success("Thanks for your feedback!");
      setFbOpen(false);
      setFbMessage("");
      setFbType("general");
    } catch {
      error("Failed to send feedback. Try again.");
    } finally {
      setFbLoading(false);
    }
  }

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!newWsName.trim()) return;
    setNewWsLoading(true);
    try {
      await apiFetch("/workspaces", { method: "POST", body: JSON.stringify({ name: newWsName.trim() }) });
      setNewWsOpen(false);
      setNewWsName("");
      // Switch to new workspace — reload will happen inside switchWorkspace
      // But we don't know the new ID yet; just reload to show it in the list
      window.location.href = "/compose";
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setNewWsLoading(false);
    }
  }

  const initial = user?.name?.[0]?.toUpperCase() ?? "?";
  const wsInitial = activeWorkspace?.name?.[0]?.toUpperCase() ?? "W";

  return (
    <>
      {/* Mobile hamburger trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="md:hidden fixed z-40 flex items-center justify-center"
        style={{ top: 14, left: 14, width: 36, height: 36, borderRadius: 9, backgroundColor: "#161616", border: "1px solid #2a2a2a", color: "#ededed" }}
      >
        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40" style={{ backgroundColor: "rgba(0,0,0,.6)" }} onClick={() => setMobileOpen(false)} />
      )}

      <aside
        style={{ backgroundColor: "var(--color-bg)", borderRight: "1px solid #2a2a2a" }}
        className={`fixed md:relative inset-y-0 left-0 z-50 flex flex-col shrink-0 h-full w-60 transition-transform duration-200 md:transition-all md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} ${collapsed ? "md:w-[60px]" : "md:w-60"}`}
      >
        {/* Logo */}
        <div className="flex items-center shrink-0 px-3 gap-2 relative" style={{ height: 65, borderBottom: "1px solid #2a2a2a" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/posthivemain.png" alt="Posthive" width={28} height={28} style={{ objectFit: "contain" }} />
            {!showCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-tight text-white">Posthive</p>
              </div>
            )}
          </Link>
        </div>

        {/* Toggle button */}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden md:flex absolute z-10 items-center justify-center transition-colors hover:bg-white/10"
          style={{ top: "50%", right: -12, transform: "translateY(-50%)", width: 24, height: 24, borderRadius: "50%", backgroundColor: "#1f1f2e", border: "1px solid #3a3a5a", color: "#818cf8" }}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={showCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
          </svg>
        </button>

        {/* ── Workspace switcher ── */}
        {activeWorkspace && (
          <div className="px-2 pt-2" ref={wsRef} style={{ position: "relative" }}>
            <button
              onClick={() => setWsOpen((o) => !o)}
              title={showCollapsed ? activeWorkspace.name : undefined}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: showCollapsed ? "6px 0" : "6px 10px",
                borderRadius: 8,
                background: wsOpen ? "#1a1a2e" : "transparent",
                border: "1px solid",
                borderColor: wsOpen ? "#3a3a5a" : "transparent",
                cursor: "pointer",
                justifyContent: showCollapsed ? "center" : "flex-start",
              }}
            >
              {/* Workspace avatar */}
              <div style={{
                width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                background: "#5b63d3",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, color: "#fff",
              }}>
                {wsInitial}
              </div>
              {!showCollapsed && (
                <>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#ededed", textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {activeWorkspace.name}
                  </span>
                  <svg style={{ width: 12, height: 12, color: "#555", flexShrink: 0, transform: wsOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </button>

            {/* Dropdown */}
            {wsOpen && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 8, right: 8,
                background: "#161616",
                border: "1px solid #2a2a2a",
                borderRadius: 10,
                padding: "4px",
                zIndex: 100,
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              }}>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => handleSwitch(ws.id)}
                    disabled={switchingId === ws.id}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 8px",
                      borderRadius: 7,
                      background: ws.isActive ? "#1a1a2e" : "transparent",
                      border: "none",
                      cursor: switchingId === ws.id ? "wait" : "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: 5, flexShrink: 0,
                      background: ws.isActive ? "#5b63d3" : "#2a2a2a",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700, color: "#fff",
                    }}>
                      {ws.name[0]?.toUpperCase()}
                    </div>
                    <span style={{ flex: 1, fontSize: 12, color: ws.isActive ? "#ededed" : "#aaa", fontWeight: ws.isActive ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ws.name}
                    </span>
                    {ws.isActive && (
                      <svg style={{ width: 12, height: 12, color: "#5b63d3", flexShrink: 0 }} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}

                {/* Divider + New workspace */}
                <div style={{ borderTop: "1px solid #2a2a2a", margin: "4px 0" }} />
                <button
                  onClick={() => { setWsOpen(false); setNewWsOpen(true); }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 8px",
                    borderRadius: 7,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: 5, flexShrink: 0,
                    background: "#1a1a1a", border: "1px dashed #3a3a3a",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, color: "#555",
                  }}>
                    +
                  </div>
                  <span style={{ fontSize: 12, color: "#666" }}>New workspace</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* New post button */}
        <div className="px-2 pt-2 pb-1">
          <Link
            href="/compose"
            title={showCollapsed ? "New post" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: showCollapsed ? "center" : "flex-start",
              gap: 8,
              padding: showCollapsed ? "8px 0" : "8px 14px",
              borderRadius: 9,
              backgroundColor: "#5b63d3",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              transition: "opacity 0.15s",
            }}
            className="hover:opacity-90"
          >
            <svg style={{ width: 15, height: 15, flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            {!showCollapsed && "New post"}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              {!showCollapsed && (
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "0 10px", marginBottom: 4 }}>
                  {group.label}
                </p>
              )}
              {showCollapsed && <div style={{ height: 1, backgroundColor: "#1e1e1e", margin: "6px 4px 6px" }} />}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      title={showCollapsed ? item.label : undefined}
                      style={active
                        ? { backgroundColor: "#18183a", color: "#818cf8" }
                        : { color: "#999" }
                      }
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${!active ? "hover:bg-white/5 hover:text-white" : ""} ${showCollapsed ? "justify-center" : ""}`}
                    >
                      <span style={{ color: active ? "#818cf8" : "inherit" }}>{item.icon}</span>
                      {!showCollapsed && <span style={{ fontSize: 13 }}>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Email verification banner */}
        {!showCollapsed && user && !user.emailVerified && (
          <div className="mx-2 mb-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: "#1c1209", border: "1px solid #78560a" }}>
            <p className="text-xs font-semibold mb-0.5" style={{ color: "#fbbf24" }}>Verify your email</p>
            <p className="text-xs mb-2" style={{ color: "#888" }}>Check your inbox for a verification link.</p>
            <button
              onClick={async () => {
                try {
                  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/auth/resend-verification`, { method: "POST", credentials: "include" });
                  if (res.ok) { success("Verification email sent — check your inbox."); }
                  else { const d = await res.json().catch(() => ({})); error(d.error ?? "Failed to send email. Try again."); }
                } catch { error("Failed to send email. Try again."); }
              }}
              className="text-xs font-semibold hover:opacity-80 transition-opacity"
              style={{ color: "#fbbf24" }}>
              Resend email
            </button>
          </div>
        )}

        {/* Trial banner */}
        {!showCollapsed && <TrialBanner />}

        {/* Feedback button */}
        <div className="px-2 pb-1">
          <button
            onClick={() => setFbOpen(true)}
            title={showCollapsed ? "Send feedback" : undefined}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
            style={{justifyContent: showCollapsed ? "center" : "flex-start" }}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h6m-9 8l4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            {!showCollapsed && <span style={{ fontSize: 13 }}>Feedback</span>}
          </button>
        </div>

        {/* User footer */}
        <div className="px-2 py-3" style={{ borderTop: "1px solid #2a2a2a" }}>
          <div className={`flex items-center gap-3 px-2 py-2 rounded-lg ${showCollapsed ? "justify-center" : ""}`}>
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white" style={{ backgroundColor: "var(--color-accent)" }}>
                {initial}
              </div>
            )}
            {!showCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                  <p className="text-xs truncate" style={{ color: "var(--color-muted)" }}>{user?.email}</p>
                </div>
                <button onClick={handleLogout} title="Sign out" className="transition-colors shrink-0 hover:text-red-400" style={{ color: "var(--color-muted)" }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Feedback modal */}
      {fbOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
            <h2 className="text-base font-bold mb-1" style={{ color: "#ededed" }}>Send feedback</h2>
            <p className="text-xs mb-4" style={{ color: "#888" }}>Report a bug or suggest a feature we read every message.</p>
            <form onSubmit={submitFeedback} className="space-y-4">
              {/* Type selector */}
              <div className="flex gap-2">
                {(["bug", "feature", "general"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFbType(t)}
                    style={{
                      flex: 1,
                      padding: "6px 0",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      border: "1px solid",
                      cursor: "pointer",
                      backgroundColor: fbType === t ? (t === "bug" ? "#1f0a0a" : t === "feature" ? "#0a1a0a" : "#0d0d1f") : "#1a1a1a",
                      borderColor: fbType === t ? (t === "bug" ? "#7f1d1d" : t === "feature" ? "#14532d" : "#3a3a5a") : "#2a2a2a",
                      color: fbType === t ? (t === "bug" ? "#f87171" : t === "feature" ? "#4ade80" : "#818cf8") : "#555",
                    }}
                  >
                    {t === "bug" ? "🐛 Bug" : t === "feature" ? "✨ Feature" : "💬 General"}
                  </button>
                ))}
              </div>
              <div>
                <textarea
                  autoFocus
                  value={fbMessage}
                  onChange={(e) => setFbMessage(e.target.value)}
                  placeholder={fbType === "bug" ? "What happened? What did you expect?" : fbType === "feature" ? "What would you like to see?" : "What's on your mind?"}
                  rows={4}
                  required
                  style={{ width: "100%", backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "#ededed", outline: "none", resize: "none" }}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setFbOpen(false); setFbMessage(""); setFbType("general"); }}
                  style={{ flex: 1, padding: "8px", borderRadius: 10, fontSize: 13, fontWeight: 600, backgroundColor: "#1a1a1a", color: "#ededed", border: "1px solid #2a2a2a", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={fbLoading || !fbMessage.trim()}
                  style={{ flex: 1, padding: "8px", borderRadius: 10, fontSize: 13, fontWeight: 600, backgroundColor: "#ffffff", color: "#0a0a0a", border: "none", cursor: (fbLoading || !fbMessage.trim()) ? "not-allowed" : "pointer", opacity: (fbLoading || !fbMessage.trim()) ? 0.5 : 1 }}
                >
                  {fbLoading ? "Sending…" : "Send feedback"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New workspace modal */}
      {newWsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
            <h2 className="text-base font-bold mb-1" style={{ color: "#ededed" }}>New workspace</h2>
            <p className="text-xs mb-5" style={{ color: "#888" }}>Create a separate workspace for a team or project. You can upgrade it to a paid plan later.</p>
            <form onSubmit={createWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#aaa" }}>Workspace name</label>
                <input
                  autoFocus
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  placeholder="e.g. Marketing Team"
                  style={{ width: "100%", backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "#ededed", outline: "none" }}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setNewWsOpen(false); setNewWsName(""); }}
                  style={{ flex: 1, padding: "8px", borderRadius: 10, fontSize: 13, fontWeight: 600, backgroundColor: "#1a1a1a", color: "#ededed", border: "1px solid #2a2a2a", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newWsLoading || !newWsName.trim()}
                  style={{ flex: 1, padding: "8px", borderRadius: 10, fontSize: 13, fontWeight: 600, backgroundColor: "#ffffff", color: "#0a0a0a", border: "none", cursor: (newWsLoading || !newWsName.trim()) ? "not-allowed" : "pointer", opacity: (newWsLoading || !newWsName.trim()) ? 0.5 : 1 }}
                >
                  {newWsLoading ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
