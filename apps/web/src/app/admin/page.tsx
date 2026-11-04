"use client";

import { PasswordInput } from "../../components/PasswordInput";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { cn } from "../../lib/cn";

interface SessionRow {
  id: string;
  visitorId: string;
  userId: string | null;
  entry: string;
  exit: string | null;
  pages: string[];
  referrer: string | null;
  converted: boolean;
  duration: number | null;
  createdAt: string;
  user?: { name: string; email: string; plan: string; planStatus: string } | null;
}

interface EventRow {
  id: string;
  userId: string;
  event: string;
  properties: Record<string, unknown> | null;
  createdAt: string;
  user?: { name: string; email: string } | null;
}

interface FeedbackReply {
  id: string;
  sender: string;
  message: string;
  createdAt: string;
}

interface FeedbackRow {
  id: string;
  userId: string | null;
  type: string;
  message: string;
  url: string | null;
  createdAt: string;
  replies: FeedbackReply[];
  user?: { name: string; email: string } | null;
}

interface AdminData {
  funnel: { totalSessions: number; billingViews: number; checkoutClicks: number; trialsStarted: number };
  sessions: SessionRow[];
  events: EventRow[];
  feedbacks: FeedbackRow[];
  stats: { totalUsers: number; newUsersToday: number };
}

const PAGE_SIZE = 15;

function Avatar({ visitorId, name }: { visitorId: string; name?: string }) {
  const seed = name ? encodeURIComponent(name) : visitorId;
  return (
    <img
      src={`https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${seed}`}
      alt={name ?? visitorId}
      className="size-7 shrink-0 rounded-sm bg-neutral-100"
    />
  );
}

function timeSince(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function formatDuration(secs: number | null): string {
  if (!secs) return "";
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function buildStory(s: SessionRow): string {
  const pages = s.pages as string[];
  const ref = s.referrer ? ` via ${new URL(s.referrer).hostname.replace("www.", "")}` : "";
  let action = pages.length === 1
    ? `visited ${pages[0]}`
    : `browsed ${pages.slice(0, 4).map(p => p === "/" ? "home" : p.replace(/^\//, "")).join(" → ")}`;
  let outcome = s.converted
    ? "started a trial"
    : pages.includes("/billing")
    ? "left at billing without converting"
    : "left without reaching billing";
  return `Arrived${ref} · ${action} · ${outcome}`;
}

const ADMIN_PIN_KEY = "ph_admin_unlocked";

function FeedbackThread({ f, onReplyAdded }: { f: FeedbackRow; onReplyAdded: (id: string, reply: FeedbackReply) => void }) {
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function send() {
    const text = draft.trim();
    if (!text) return;
    setLoading(true);
    try {
      const r = await apiFetch<FeedbackReply>(`/feedback/${f.id}/replies`, {
        method: "POST",
        body: JSON.stringify({ message: text }),
      });
      onReplyAdded(f.id, r);
      setDraft("");
    } finally { setLoading(false); }
  }

  const typeClass = f.type === "bug"
    ? "border-red-200 bg-red-50 text-red-600"
    : f.type === "feature"
    ? "border-green-200 bg-green-50 text-green-700"
    : "border-blue-200 bg-blue-50 text-blue-700";
  const typeLabel = f.type === "bug" ? "🐛 Bug" : f.type === "feature" ? "✨ Feature" : "💬 General";

  return (
    <div className="border-b border-border py-2.5">
      {/* Header row */}
      <div className="flex cursor-pointer items-start gap-2.5" onClick={() => setExpanded(p => !p)}>
        <Avatar visitorId={f.userId ?? f.id} name={f.user?.name} />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className={cn("rounded-sm border px-2 py-px type-body-sb-xs", typeClass)}>{typeLabel}</span>
            <span className="type-body-r-xs text-muted">{f.user?.name ?? "Anonymous"}{f.user?.email && ` · ${f.user.email}`}</span>
            {f.url && <span className="rounded-sm border border-border bg-surface px-1.5 py-px type-mono-r-xs text-muted">{f.url}</span>}
          </div>
          <p className="whitespace-pre-wrap wrap-break-word type-body-r-s text-fg">{f.message}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="type-body-r-xs text-muted">{timeSince(f.createdAt)}</span>
          <span className="type-body-r-xs text-muted">{f.replies.length} msg{f.replies.length !== 1 ? "s" : ""}</span>
          <span className="type-body-r-xs text-neutral-500">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Thread */}
      {expanded && (
        <div className="mt-2.5 pl-9.5">
          <div className="mb-2.5 flex flex-col gap-2">
            {f.replies.map(r => (
              <div key={r.id} className={cn(
                "max-w-[85%] rounded-xl border px-3 py-2",
                r.sender === "admin"
                  ? "self-end rounded-br-xs border-green-200 bg-green-50"
                  : "self-start rounded-bl-xs border-border bg-neutral-100",
              )}>
                <p className={cn("mb-0.5 type-body-sb-xs", r.sender === "admin" ? "text-green-700" : "text-muted")}>
                  {r.sender === "admin" ? "You (admin)" : f.user?.name ?? "User"}
                </p>
                <p className="whitespace-pre-wrap type-body-r-s text-fg">{r.message}</p>
                <p className="mt-1 text-right type-body-r-xs text-muted">{timeSince(r.createdAt)}</p>
              </div>
            ))}
          </div>
          {/* Reply input */}
          <div className="flex gap-1.5">
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Reply…"
              className="field flex-1 rounded-lg px-2.5 py-1.5 type-body-r-xs"
            />
            <button
              onClick={send}
              disabled={loading || !draft.trim()}
              className="btn-primary rounded-lg px-3.5 py-1.5 type-body-sb-xs"
            >
              {loading ? "…" : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FeedbackPanel({ feedbacks: initial }: { feedbacks: FeedbackRow[] }) {
  const [feedbacks, setFeedbacks] = useState(initial);

  function onReplyAdded(id: string, reply: FeedbackReply) {
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, replies: [...f.replies, reply] } : f));
  }

  if (feedbacks.length === 0) {
    return <div className="py-16 text-center type-body-r-s text-muted">No feedback yet.</div>;
  }

  return (
    <div>
      {feedbacks.map(f => <FeedbackThread key={f.id} f={f} onReplyAdded={onReplyAdded} />)}
    </div>
  );
}

export default function AdminPage() {
  const [data, setData]       = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [tab, setTab]         = useState<"sessions" | "events" | "feedback">("sessions");
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin]         = useState("");
  const [pinError, setPinError] = useState(false);
  const [page, setPage]       = useState(0);

  useEffect(() => { if (sessionStorage.getItem(ADMIN_PIN_KEY)) setUnlocked(true); }, []);

  useEffect(() => {
    if (!unlocked) return;
    const storedPin = sessionStorage.getItem(ADMIN_PIN_KEY) ?? "";
    apiFetch<AdminData>("/track/admin", { headers: { "x-admin-pin": storedPin } })
      .then(setData).catch(e => setError(String(e))).finally(() => setLoading(false));
  }, [unlocked]);

  async function handlePin(e: React.FormEvent) {
    e.preventDefault();
    if (!pin) return;
    try {
      await apiFetch("/track/admin", { headers: { "x-admin-pin": pin } });
      sessionStorage.setItem(ADMIN_PIN_KEY, pin);
      setUnlocked(true);
    } catch {
      setPinError(true); setPin("");
      setTimeout(() => setPinError(false), 2000);
    }
  }

  const base = "min-h-screen bg-bg type-body-r-s text-fg";

  if (!unlocked) return (
    <div className={cn(base, "flex items-center justify-center")}>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%,75%{transform:translateX(-5px)}50%{transform:translateX(5px)}}`}</style>
      <div className="flex w-80 flex-col gap-6">
        <div>
          <div className="mb-1 text-3xl">🔒</div>
          <h1 className="mb-1 type-body-sb-xl text-fg">Admin access</h1>
          <p className="type-body-r-s text-muted">Enter your PIN to view visitor intelligence.</p>
        </div>
        <form onSubmit={handlePin} className="flex flex-col gap-2">
          <PasswordInput
            autoComplete="off" aria-label="PIN" aria-invalid={pinError || undefined}
            value={pin} onChange={e => setPin(e.target.value)}
            placeholder="PIN" autoFocus
            className={cn("rounded-md tracking-[0.2em]", pinError && "border-red-500 animate-[shake_.3s_ease]")}
          />
          {pinError && <p className="type-body-r-xs text-red-600">Incorrect PIN</p>}
          <button type="submit" className="btn-primary rounded-md">Continue</button>
        </form>
      </div>
    </div>
  );

  if (loading) return (
    <div className={cn(base, "flex items-center justify-center")}>
      <div className="size-4.5 animate-spin rounded-full border-2 border-border border-t-muted" />
    </div>
  );

  if (error) return (
    <div className={cn(base, "flex items-center justify-center text-red-600")}>
      {error.includes("403") ? "Access denied." : error}
    </div>
  );

  if (!data) return null;

  const { funnel, sessions, events, feedbacks, stats } = data;
  const totalPages   = Math.ceil(sessions.length / PAGE_SIZE);
  const pagedSessions = sessions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const convRate = funnel.totalSessions > 0
    ? Math.round((funnel.trialsStarted / funnel.totalSessions) * 100)
    : 0;

  return (
    <div className={cn(base, "flex flex-col md:flex-row")}>
      {/* LEFT — title, properties, funnel */}
      <div className="w-full border-b border-border px-5 pt-8 pb-6 md:sticky md:top-0 md:h-screen md:w-75 md:shrink-0 md:overflow-y-auto md:border-r md:border-b-0 md:py-12 md:pr-8 md:pl-10">
        <h1 className="mb-6 type-head-sb-6 tracking-tight text-fg">
          Visitor Intelligence
        </h1>

        {/* Properties */}
        <div className="mb-7 flex flex-col">
          {[
            { label: "Period",      value: "Last 30 days" },
            { label: "Total users", value: String(stats.totalUsers) },
            { label: "New today",   value: String(stats.newUsersToday) },
            { label: "Sessions",    value: String(funnel.totalSessions) },
            { label: "Conversion",  value: convRate > 0 ? `${convRate}%` : "—" },
          ].map(p => (
            <div key={p.label} className="-mx-1.5 flex items-center rounded-sm px-1.5 py-1 hover:bg-surface">
              <span className="w-27.5 shrink-0 type-body-m-xs text-muted">{p.label}</span>
              <span className="type-body-r-xs text-fg">{p.value}</span>
            </div>
          ))}
        </div>

        <div className="mb-6 border-t border-border" />

        {/* Funnel */}
        <p className="section-label mb-3">
          Conversion funnel
        </p>
        <div className="flex flex-col gap-2">
          {[
            { label: "Visited site",    value: funnel.totalSessions,  color: "bg-blue-500" },
            { label: "Reached billing", value: funnel.billingViews,   color: "bg-blue-800" },
            { label: "Clicked a plan",  value: funnel.checkoutClicks, color: "bg-accent" },
            { label: "Started trial",   value: funnel.trialsStarted,  color: "bg-green-500" },
          ].map(f => {
            const pct = funnel.totalSessions > 0 ? Math.round((f.value / funnel.totalSessions) * 100) : 0;
            return (
              <div key={f.label}>
                <div className="mb-1 flex justify-between">
                  <span className="type-body-r-xs text-muted">{f.label}</span>
                  <span className="type-body-r-xs tabular-nums text-fg">{f.value} <span className="text-muted">{pct}%</span></span>
                </div>
                <div className="h-1 overflow-hidden rounded-xs bg-neutral-100">
                  <div className={cn("h-full w-(--w) rounded-xs transition-[width] duration-600", f.color)}
                    style={{ "--w": `${pct}%` } as React.CSSProperties} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT — tabs + session list */}
      <div className="min-w-0 flex-1 overflow-y-auto px-5 py-6 md:px-10 md:py-12">

        {/* Tabs */}
        <div className="flex flex-wrap gap-1.5 pb-3">
          {(["sessions", "events", "feedback"] as const).map(t => (
            <button key={t} className={cn("chip", tab === t && "chip-active")}
              onClick={() => { setTab(t); setPage(0); }}>
              {t === "sessions" ? `Sessions (${sessions.length})` : t === "events" ? `Events (${events.length})` : `Feedback (${feedbacks.length})`}
            </button>
          ))}
        </div>
        <div className="mb-2 border-t border-border" />

      {/* Sessions */}
      {tab === "sessions" && (
        <div>
          {/* Column headers */}
          <div className="-mx-2 mb-0.5 grid grid-cols-[28px_1fr_auto] items-center gap-3 rounded-lg bg-surface px-2 py-1.5">
            <div />
            <span className="section-label">Session</span>
            <span className="section-label">Time</span>
          </div>

          {sessions.length === 0 && (
            <div className="py-16 text-center type-body-r-s text-muted">
              No sessions yet.
            </div>
          )}

          {pagedSessions.map(s => {
            const dur = formatDuration(s.duration);
            const hitBilling = (s.pages as string[]).includes("/billing");
            const statusClass = s.converted
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-brand-400 bg-brand-100 text-brand-800";
            const statusLabel = s.converted ? "Trial" : hitBilling ? "Billing" : null;

            return (
              <div key={s.id} className="-mx-2 grid cursor-default grid-cols-[28px_1fr_auto] items-start gap-3 border-b border-border p-2 hover:bg-surface">
                <Avatar visitorId={s.visitorId} name={s.user?.name} />

                <div className="min-w-0">
                  {/* Name row */}
                  <div className="mb-1 flex items-center gap-2">
                    <span className="type-body-sb-s text-fg">
                      {s.user?.name ?? `Visitor #${s.visitorId.slice(-6)}`}
                    </span>
                    {s.user?.email && (
                      <span className="type-body-r-xs text-muted">{s.user.email}</span>
                    )}
                    {statusLabel && (
                      <span className={cn("rounded-sm border px-1.5 py-px type-body-m-xs", statusClass)}>{statusLabel}</span>
                    )}
                    {s.user?.planStatus === "trialing" && !s.converted && (
                      <span className="rounded-sm border border-blue-200 bg-blue-50 px-1.5 py-px type-body-m-xs text-blue-700">Trialing</span>
                    )}
                  </div>

                  {/* Story */}
                  <p className="mb-1.5 type-body-r-xs text-muted">
                    {buildStory(s)}
                    {dur && <span className="text-neutral-500"> · {dur}</span>}
                  </p>

                  {/* Page trail */}
                  <div className="flex flex-wrap items-center gap-1">
                    {(s.pages as string[]).map((p, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className={cn(
                          "rounded-sm border px-1.5 py-px type-mono-r-xs",
                          p === "/billing" ? "border-brand-400 bg-brand-100 text-brand-800" : "border-border bg-surface text-muted",
                        )}>{p}</span>
                        {i < (s.pages as string[]).length - 1 && (
                          <span className="type-body-r-xxs text-neutral-300">›</span>
                        )}
                      </span>
                    ))}
                    {s.referrer && (() => {
                      try {
                        const host = new URL(s.referrer).hostname.replace("www.", "");
                        return (
                          <span className="rounded-sm border border-border bg-surface px-1.5 py-px type-mono-r-xs text-muted">
                            ← {host}
                          </span>
                        );
                      } catch { return null; }
                    })()}
                  </div>
                </div>

                <span className="whitespace-nowrap pt-0.5 type-body-r-xs text-muted">
                  {timeSince(s.createdAt)}
                </span>
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex flex-col items-start justify-between gap-2.5 border-t border-border pt-4 md:flex-row md:items-center md:gap-0">
              <span className="type-body-r-xs text-muted">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sessions.length)} of {sessions.length}
              </span>
              <div className="flex gap-1">
                <button className="chip" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Prev</button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i} className={cn("chip min-w-8 justify-center", page === i && "chip-active")} onClick={() => setPage(i)}>{i + 1}</button>
                ))}
                <button className="chip" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>Next →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Events */}
      {tab === "events" && (
        <div>
          {events.length === 0 && (
            <div className="py-16 text-center type-body-r-s text-muted">
              No events yet.
            </div>
          )}
          {events.map(e => (
            <div key={e.id} className="-mx-2 grid grid-cols-[28px_1fr_auto] items-center gap-3 border-b border-border px-2 py-2 hover:bg-surface">
              <Avatar visitorId={e.userId} name={e.user?.name} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-sm border border-blue-200 bg-blue-50 px-2 py-px type-mono-r-xs text-blue-700">{e.event}</span>
                  <span className="type-body-r-xs text-muted">{e.user?.name ?? e.userId.slice(-8)}</span>
                  {e.properties && Object.keys(e.properties).length > 0 && (
                    <span className="type-mono-r-xs text-muted">
                      {JSON.stringify(e.properties)}
                    </span>
                  )}
                </div>
              </div>
              <span className="type-body-r-xs text-muted">{timeSince(e.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
      {/* Feedback */}
      {tab === "feedback" && (
        <FeedbackPanel feedbacks={feedbacks} />
      )}

      </div>{/* end right column */}
    </div>
  );
}
