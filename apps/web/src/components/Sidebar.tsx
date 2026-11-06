"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { apiFetch } from "../lib/api";
import { cn } from "../lib/cn";
import { TrialBanner } from "./TrialBanner";
import { Wordmark } from "./Wordmark";
import { useToast } from "./Toast";
import { usePermissions } from "../lib/usePermissions";

function WhatsNewCard() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("ph:dismissed:repeat-posts") === "1") setDismissed(true);
    } catch { /* ignore */ }
  }, []);

  if (dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try { localStorage.setItem("ph:dismissed:repeat-posts", "1"); } catch { /* ignore */ }
  }

  return (
    <div className="relative mx-2 mb-2 rounded-xl border border-brand-300 bg-brand-100 px-3 py-2.5">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-2 right-2 cursor-pointer p-0.5 leading-none text-neutral-500"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
      <p className="mb-1 type-body-sb-xxs uppercase tracking-widest text-brand-800">New</p>
      <p className="mb-0.5 type-body-sb-xs text-fg">Repeat post scheduling</p>
      <p className="mb-2 type-body-r-xs text-muted">
        Schedule posts to repeat daily, weekly, or monthly. Set an end date and let it run.
      </p>
      <a
        href="/compose"
        className="type-body-sb-xs text-brand-800 transition-opacity hover:opacity-80"
      >
        Try it →
      </a>
    </div>
  );
}

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
  const [fbTab, setFbTab] = useState<"send" | "mine">("send");
  const [fbType, setFbType] = useState<"bug" | "feature" | "general">("general");
  const [fbMessage, setFbMessage] = useState("");
  const [fbLoading, setFbLoading] = useState(false);
  const [myFeedback, setMyFeedback] = useState<{
    id: string; type: string; message: string;
    unreadByUser: number; createdAt: string;
    replies: { id: string; sender: string; message: string; createdAt: string }[];
  }[]>([]);
  const [myFeedbackLoading, setMyFeedbackLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [threadDraft, setThreadDraft] = useState("");
  const [threadSending, setThreadSending] = useState(false);

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

  async function loadMyFeedback() {
    setMyFeedbackLoading(true);
    try {
      const data = await apiFetch<typeof myFeedback>("/feedback/mine");
      setMyFeedback(data);
      setUnreadCount(data.reduce((s, f) => s + f.unreadByUser, 0));
    } catch { /* silent */ }
    finally { setMyFeedbackLoading(false); }
  }

  async function markRead(id: string) {
    await apiFetch(`/feedback/${id}/read`, { method: "POST" }).catch(() => {});
    setMyFeedback(prev => prev.map(f => f.id === id ? { ...f, unreadByUser: 0 } : f));
    setUnreadCount(prev => {
      const item = myFeedback.find(f => f.id === id);
      return Math.max(0, prev - (item?.unreadByUser ?? 0));
    });
  }

  async function sendThreadReply(feedbackId: string) {
    const text = threadDraft.trim();
    if (!text) return;
    setThreadSending(true);
    try {
      const r = await apiFetch<{ id: string; sender: string; message: string; createdAt: string }>(
        `/feedback/${feedbackId}/replies`,
        { method: "POST", body: JSON.stringify({ message: text }) }
      );
      setMyFeedback(prev => prev.map(f => f.id === feedbackId ? { ...f, replies: [...f.replies, r] } : f));
      setThreadDraft("");
    } catch { /* silent */ }
    finally { setThreadSending(false); }
  }

  useEffect(() => {
    apiFetch<{ unread: number }>("/feedback/unread")
      .then(d => setUnreadCount(d.unread))
      .catch(() => {});
  }, []);

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
      setFbTab("send");
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

  const { navGroups, canEditContent: showNewPost } = usePermissions();

  return (
    <>
      {/* Mobile hamburger trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="md:hidden fixed top-3.5 left-3.5 z-40 flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-fg"
      >
        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed md:relative inset-y-0 left-0 z-50 flex flex-col shrink-0 h-full w-60 border-r border-border bg-bg transition-transform duration-200 md:transition-all md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "md:w-15" : "md:w-60",
        )}
      >
        {/* Logo */}
        <div className="relative flex h-16 shrink-0 items-center gap-2 border-b border-border px-3">
          <Link href="/" className="flex items-center gap-2.5 text-fg">
            {showCollapsed ? <Wordmark variant="mark" size="sm" /> : <Wordmark size="md" />}
          </Link>
        </div>

        {/* Toggle button */}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden md:flex absolute top-1/2 -right-3 z-10 size-6 -translate-y-1/2 items-center justify-center rounded-full border border-brand-300 bg-brand-100 text-brand-800 transition-colors hover:bg-brand-200"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={showCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
          </svg>
        </button>

        {/* ── Workspace switcher ── */}
        {activeWorkspace && (
          <div className="relative px-2 pt-2" ref={wsRef}>
            <button
              onClick={() => setWsOpen((o) => !o)}
              title={showCollapsed ? activeWorkspace.name : undefined}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded-lg border py-1.5",
                showCollapsed ? "justify-center" : "justify-start px-2.5",
                wsOpen ? "border-brand-300 bg-brand-100" : "border-transparent",
              )}
            >
              {/* Workspace avatar */}
              <div className="flex size-6.5 shrink-0 items-center justify-center rounded-md bg-accent type-body-sb-xs text-accent-fg">
                {wsInitial}
              </div>
              {!showCollapsed && (
                <>
                  <span className="flex-1 truncate text-left type-body-m-s text-fg">
                    {activeWorkspace.name}
                  </span>
                  <svg className={cn("size-3 shrink-0 text-neutral-500 transition-transform duration-150", wsOpen && "rotate-180")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </button>

            {/* Dropdown */}
            {wsOpen && (
              <div className="absolute inset-x-2 top-full z-100 mt-1 rounded-xl border border-border bg-surface p-1 shadow-lg">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => handleSwitch(ws.id)}
                    disabled={switchingId === ws.id}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md p-2 text-left",
                      ws.isActive && "bg-brand-100",
                      switchingId === ws.id ? "cursor-wait" : "cursor-pointer",
                    )}
                  >
                    <div className={cn(
                      "flex size-5.5 shrink-0 items-center justify-center rounded-md type-body-sb-xxs",
                      ws.isActive ? "bg-accent text-accent-fg" : "bg-neutral-100 text-fg",
                    )}>
                      {ws.name[0]?.toUpperCase()}
                    </div>
                    <span className={cn("flex-1 truncate", ws.isActive ? "type-body-sb-xs text-fg" : "type-body-r-xs text-muted")}>
                      {ws.name}
                    </span>
                    {ws.isActive && (
                      <svg className="size-3 shrink-0 text-brand-800" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}

                {/* Divider + New workspace */}
                <div className="my-1 border-t border-border" />
                <button
                  onClick={() => { setWsOpen(false); setNewWsOpen(true); }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md p-2 text-left"
                >
                  <div className="flex size-5.5 shrink-0 items-center justify-center rounded-md border border-dashed border-neutral-300 bg-bg type-body-r-s text-neutral-500">
                    +
                  </div>
                  <span className="type-body-r-xs text-neutral-500">New workspace</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* New post button — hidden for review-only roles (e.g. Tim Desain) */}
        {showNewPost && (
          <div className="px-2 pt-2 pb-1">
          <Link
            href="/compose"
            title={showCollapsed ? "New post" : undefined}
            className={cn("btn-primary flex rounded-lg py-2", showCollapsed ? "px-0" : "justify-start px-3.5")}
          >
            <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            {!showCollapsed && "New post"}
          </Link>
        </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              {!showCollapsed && (
                <p className="mb-1 px-2.5 type-body-sb-xxs uppercase tracking-widest">
                  {group.label}
                </p>
              )}
              {showCollapsed && <div className="mx-1 my-1.5 h-px bg-border" />}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      title={showCollapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-2 rounded-lg type-body-m-s transition-colors",
                        active ? "bg-brand-100 text-brand-800" : "text-muted hover:bg-neutral-100 hover:text-fg",
                        showCollapsed && "justify-center",
                      )}
                    >
                      <span>{item.icon}</span>
                      {!showCollapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Email verification banner */}
        {!showCollapsed && user && !user.emailVerified && (
          <div className="mx-2 mb-2 rounded-xl border border-brand-400 bg-brand-100 px-3 py-2.5">
            <p className="mb-0.5 type-body-sb-xs text-brand-800">Verify your email</p>
            <p className="mb-2 type-body-r-xs text-muted">Check your inbox for a verification link.</p>
            <button
              onClick={async () => {
                try {
                  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/auth/resend-verification`, { method: "POST", credentials: "include" });
                  if (res.ok) { success("Verification email sent — check your inbox."); }
                  else { const d = await res.json().catch(() => ({})); error(d.error ?? "Failed to send email. Try again."); }
                } catch { error("Failed to send email. Try again."); }
              }}
              className="type-body-sb-xs text-brand-800 transition-opacity hover:opacity-80">
              Resend email
            </button>
          </div>
        )}

        {/* Trial banner */}
        {!showCollapsed && <TrialBanner />}

        {/* What's new card */}
        {!showCollapsed && <WhatsNewCard />}

        {/* Feedback button */}
        <div className="px-2 pb-1">
          <button
            onClick={() => setFbOpen(true)}
            title={showCollapsed ? "Send feedback" : undefined}
            className={cn(
              "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg type-body-r-s transition-colors hover:bg-neutral-100",
              showCollapsed ? "justify-center" : "justify-start",
            )}
          >
            <div className="relative">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h6m-9 8l4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 type-body-sb-xxs text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            {!showCollapsed && <span>Feedback</span>}
          </button>
        </div>

        {/* User footer */}
        <div className="border-t border-border px-2 py-3">
          <div className={`flex items-center gap-3 px-2 py-2 rounded-lg ${showCollapsed ? "justify-center" : ""}`}>
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
            ) : (
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent type-body-sb-xs text-accent-fg">
                {initial}
              </div>
            )}
            {!showCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="truncate type-body-sb-s text-fg">{user?.name}</p>
                  <p className="truncate type-body-r-xs text-muted">{user?.email}</p>
                </div>
                <button onClick={handleLogout} title="Sign out" className="shrink-0 text-muted transition-colors hover:text-red-600">
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
        <div className="modal-backdrop fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="card w-full max-w-sm p-6">
            {/* Tabs */}
            <div className="mb-4 flex gap-1 rounded-xl bg-neutral-100 p-1">
              <button
                onClick={() => setFbTab("send")}
                className={cn(
                  "flex-1 rounded-lg py-1.5 type-body-sb-xs transition-colors",
                  fbTab === "send" ? "bg-surface text-fg shadow-sm" : "text-muted",
                )}>
                Send feedback
              </button>
              <button
                onClick={() => { setFbTab("mine"); loadMyFeedback(); }}
                className={cn(
                  "flex-1 rounded-lg py-1.5 type-body-sb-xs transition-colors",
                  fbTab === "mine" ? "bg-surface text-fg shadow-sm" : "text-muted",
                )}>
                My feedback
              </button>
            </div>

            {/* My feedback tab */}
            {fbTab === "mine" && (
              <div>
                {myFeedbackLoading ? (
                  <p className="py-8 text-center type-body-r-xs text-muted">Loading…</p>
                ) : myFeedback.length === 0 ? (
                  <p className="py-8 text-center type-body-r-xs text-muted">No feedback submitted yet.</p>
                ) : openThread ? (() => {
                  const f = myFeedback.find(x => x.id === openThread);
                  if (!f) return null;
                  return (
                    <div>
                      <button onClick={() => setOpenThread(null)} className="mb-3 flex items-center gap-1 type-body-r-xs text-muted">
                        ← Back
                      </button>
                      <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
                        {f.replies.map(r => (
                          <div key={r.id} className={cn("flex", r.sender === "user" ? "justify-end" : "justify-start")}>
                            <div className={cn(
                              "max-w-[85%] rounded-xl border px-3 py-2",
                              r.sender === "user"
                                ? "rounded-br-xs border-border bg-neutral-100"
                                : "rounded-bl-xs border-green-200 bg-green-50",
                            )}>
                              {r.sender === "admin" && <p className="mb-0.5 type-body-sb-xxs text-green-700">Posthive</p>}
                              <p className="whitespace-pre-wrap type-body-r-xs text-fg">{r.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={threadDraft}
                          onChange={e => setThreadDraft(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendThreadReply(f.id); } }}
                          placeholder="Reply…"
                          className="field flex-1 rounded-lg px-2.5 py-1.5 type-body-r-xs"
                        />
                        <button
                          onClick={() => sendThreadReply(f.id)}
                          disabled={threadSending || !threadDraft.trim()}
                          className="btn-primary rounded-lg px-3 py-1.5 type-body-sb-xs">
                          {threadSending ? "…" : "Send"}
                        </button>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {myFeedback.map(f => {
                      const typeLabel = f.type === "bug" ? "🐛 Bug" : f.type === "feature" ? "✨ Feature" : "💬 General";
                      const hasUnread = f.unreadByUser > 0;
                      return (
                        <button
                          key={f.id}
                          onClick={() => { setOpenThread(f.id); if (hasUnread) markRead(f.id); }}
                          className={cn(
                            "w-full text-left rounded-xl border bg-bg p-3 space-y-1.5 transition-colors hover:bg-neutral-100",
                            hasUnread ? "border-green-200" : "border-border",
                          )}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="type-body-sb-xs text-muted">{typeLabel}</span>
                            <div className="flex items-center gap-2">
                              {hasUnread && (
                                <span className="rounded-full bg-green-100 px-1.5 py-0.5 type-body-sb-xxs text-green-700">
                                  {f.unreadByUser} new
                                </span>
                              )}
                              <span className="type-body-r-xs text-neutral-500">{f.replies.length} msg{f.replies.length !== 1 ? "s" : ""}</span>
                            </div>
                          </div>
                          <p className="truncate type-body-r-xs text-fg">{f.message}</p>
                          {f.replies.length > 1 && (
                            <p className="type-body-r-xs text-neutral-500">
                              Last: {f.replies[f.replies.length - 1].message.slice(0, 50)}…
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                {!openThread && (
                  <button
                    onClick={() => { setFbOpen(false); setFbTab("send"); }}
                    className="btn-secondary mt-3 w-full text-muted">
                    Close
                  </button>
                )}
              </div>
            )}

            {/* Send feedback tab */}
            {fbTab === "send" && <>
            <h2 className="mb-1 type-body-sb-m text-fg">Send feedback</h2>
            <p className="mb-4 type-body-r-xs text-muted">Report a bug or suggest a feature — we read every message.</p>
            <form onSubmit={submitFeedback} className="space-y-4">
              {/* Type selector */}
              <div className="flex gap-2">
                {(["bug", "feature", "general"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFbType(t)}
                    className={cn(
                      "flex-1 cursor-pointer rounded-lg border py-1.5 type-body-sb-xs",
                      fbType !== t
                        ? "border-border bg-bg text-neutral-500"
                        : t === "bug"
                        ? "border-red-200 bg-red-50 text-red-600"
                        : t === "feature"
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-brand-300 bg-brand-100 text-brand-800",
                    )}
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
                  className="field resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setFbOpen(false); setFbMessage(""); setFbType("general"); setFbTab("send"); }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={fbLoading || !fbMessage.trim()}
                  className="btn-primary flex-1"
                >
                  {fbLoading ? "Sending…" : "Send feedback"}
                </button>
              </div>
            </form>
            </>}
          </div>
        </div>
      )}

      {/* New workspace modal */}
      {newWsOpen && (
        <div className="modal-backdrop fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="card w-full max-w-sm p-6">
            <h2 className="mb-1 type-body-sb-m text-fg">New workspace</h2>
            <p className="mb-5 type-body-r-xs text-muted">Create a separate workspace for a team or project. You can upgrade it to a paid plan later.</p>
            <form onSubmit={createWorkspace} className="space-y-4">
              <div>
                <label className="mb-1.5 block type-body-m-xs text-muted">Workspace name</label>
                <input
                  autoFocus
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  placeholder="e.g. Marketing Team"
                  className="field"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setNewWsOpen(false); setNewWsName(""); }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newWsLoading || !newWsName.trim()}
                  className="btn-primary flex-1"
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
