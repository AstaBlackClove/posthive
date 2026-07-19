"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

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

interface FeedbackRow {
  id: string;
  userId: string | null;
  type: string;
  message: string;
  url: string | null;
  createdAt: string;
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

const N = {
  bg:     "#191919",
  s1:     "#1f1f1f",
  s2:     "#252525",
  border: "#2e2e2e",
  text:   "#e6e6e6",
  sec:    "#9b9b9b",
  muted:  "#686868",
  green:  "#4dab5a",
  amber:  "#f5a623",
  blue:   "#4d9cf6",
  red:    "#e9534f",
  purple: "#9d74d8",
};

function Avatar({ visitorId, name }: { visitorId: string; name?: string }) {
  const seed = name ? encodeURIComponent(name) : visitorId;
  return (
    <img
      src={`https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${seed}`}
      alt={name ?? visitorId}
      style={{ width: 28, height: 28, borderRadius: 4, background: N.s2, flexShrink: 0 }}
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

  const base: React.CSSProperties = { background: N.bg, minHeight: "100vh", color: N.text, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 14 };

  if (!unlocked) return (
    <div style={{ ...base, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%,75%{transform:translateX(-5px)}50%{transform:translateX(5px)}}`}</style>
      <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <div style={{ fontSize: 28, marginBottom: 4 }}>🔒</div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 4px", color: N.text }}>Admin access</h1>
          <p style={{ fontSize: 13, color: N.sec, margin: 0 }}>Enter your PIN to view visitor intelligence.</p>
        </div>
        <form onSubmit={handlePin} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            type="password" value={pin} onChange={e => setPin(e.target.value)}
            placeholder="PIN" autoFocus
            style={{
              background: N.s1, border: `1px solid ${pinError ? N.red : N.border}`,
              borderRadius: 6, padding: "9px 12px", color: N.text, fontSize: 14,
              outline: "none", letterSpacing: "0.2em", fontFamily: "monospace", width: "100%",
              boxSizing: "border-box", animation: pinError ? "shake .3s ease" : "none",
            }}
          />
          {pinError && <p style={{ fontSize: 12, color: N.red, margin: 0 }}>Incorrect PIN</p>}
          <button type="submit" style={{
            background: N.text, color: N.bg, border: "none", borderRadius: 6,
            padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Continue</button>
        </form>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{ ...base, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 18, height: 18, border: `2px solid ${N.border}`, borderTopColor: N.sec, borderRadius: "50%", animation: "spin .7s linear infinite" }} />
    </div>
  );

  if (error) return (
    <div style={{ ...base, display: "flex", alignItems: "center", justifyContent: "center", color: N.red, fontSize: 13 }}>
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
    <div className="vi-wrap" style={{ ...base, display: "flex", minHeight: "100vh" }}>
      <style>{`
        .n-row:hover { background: ${N.s2} !important; }
        .n-tab { cursor: pointer; background: none; border: none; font-family: inherit; font-size: 14px; padding: 8px 0; margin-right: 24px; color: ${N.muted}; border-bottom: 2px solid transparent; transition: color .15s, border-color .15s; }
        .n-tab.active { color: ${N.text}; border-bottom-color: ${N.text}; }
        .n-tab:hover { color: ${N.sec}; }
        .n-pg:hover:not(:disabled) { background: ${N.s2} !important; }
        .vi-wrap { flex-direction: row; }
        .vi-left { width: 300px; flex-shrink: 0; border-right: 1px solid ${N.border}; border-bottom: none; padding: 48px 32px 48px 40px; position: sticky; top: 0; height: 100vh; overflow-y: auto; box-sizing: border-box; }
        .vi-right { flex: 1; padding: 48px 40px; min-width: 0; overflow-y: auto; box-sizing: border-box; }
        @media (max-width: 768px) {
          .vi-wrap { flex-direction: column !important; }
          .vi-left { width: 100% !important; position: static !important; height: auto !important; border-right: none !important; border-bottom: 1px solid ${N.border} !important; padding: 32px 20px 24px !important; }
          .vi-right { padding: 24px 20px !important; }
          .vi-pg { flex-direction: column; align-items: flex-start; gap: 10px; }
        }
      `}</style>

      {/* LEFT — title, properties, funnel */}
      <div className="vi-left">
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 24px", color: N.text, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
          Visitor Intelligence
        </h1>

        {/* Properties */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 28 }}>
          {[
            { label: "Period",      value: "Last 30 days" },
            { label: "Total users", value: String(stats.totalUsers) },
            { label: "New today",   value: String(stats.newUsersToday) },
            { label: "Sessions",    value: String(funnel.totalSessions) },
            { label: "Conversion",  value: convRate > 0 ? `${convRate}%` : "—" },
          ].map(p => (
            <div key={p.label} className="n-row" style={{
              display: "flex", alignItems: "center", borderRadius: 4,
              padding: "5px 6px", margin: "0 -6px",
            }}>
              <span style={{ fontSize: 12, color: N.muted, width: 110, flexShrink: 0, fontWeight: 500 }}>{p.label}</span>
              <span style={{ fontSize: 12, color: N.sec }}>{p.value}</span>
            </div>
          ))}
        </div>

        <div style={{ borderTop: `1px solid ${N.border}`, marginBottom: 24 }} />

        {/* Funnel */}
        <p style={{ fontSize: 11, fontWeight: 600, color: N.muted, letterSpacing: ".05em", textTransform: "uppercase", margin: "0 0 12px" }}>
          Conversion funnel
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { label: "Visited site",    value: funnel.totalSessions,  color: N.blue },
            { label: "Reached billing", value: funnel.billingViews,   color: N.purple },
            { label: "Clicked a plan",  value: funnel.checkoutClicks, color: N.amber },
            { label: "Started trial",   value: funnel.trialsStarted,  color: N.green },
          ].map(f => {
            const pct = funnel.totalSessions > 0 ? Math.round((f.value / funnel.totalSessions) * 100) : 0;
            return (
              <div key={f.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: N.muted }}>{f.label}</span>
                  <span style={{ fontSize: 12, color: N.sec, fontVariantNumeric: "tabular-nums" }}>{f.value} <span style={{ color: N.muted }}>{pct}%</span></span>
                </div>
                <div style={{ height: 3, background: N.s2, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: f.color, borderRadius: 2, transition: "width .6s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT — tabs + session list */}
      <div className="vi-right">

        {/* Tabs */}
        <div style={{ display: "flex", marginBottom: 0 }}>
          {(["sessions", "events", "feedback"] as const).map(t => (
            <button key={t} className={`n-tab${tab === t ? " active" : ""}`}
              onClick={() => { setTab(t); setPage(0); }}>
              {t === "sessions" ? `Sessions (${sessions.length})` : t === "events" ? `Events (${events.length})` : `Feedback (${feedbacks.length})`}
            </button>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${N.border}`, marginBottom: 8 }} />

      {/* Sessions */}
      {tab === "sessions" && (
        <div>
          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "28px 1fr auto", gap: 12, alignItems: "center", padding: "6px 8px", margin: "0 -8px 2px" }}>
            <div />
            <span style={{ fontSize: 11, fontWeight: 600, color: N.muted, letterSpacing: ".04em", textTransform: "uppercase" }}>Session</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: N.muted, letterSpacing: ".04em", textTransform: "uppercase" }}>Time</span>
          </div>

          {sessions.length === 0 && (
            <div style={{ textAlign: "center", padding: "64px 0", color: N.muted, fontSize: 14 }}>
              No sessions yet.
            </div>
          )}

          {pagedSessions.map(s => {
            const dur = formatDuration(s.duration);
            const hitBilling = (s.pages as string[]).includes("/billing");
            const statusColor = s.converted ? N.green : hitBilling ? N.amber : "transparent";
            const statusLabel = s.converted ? "Trial" : hitBilling ? "Billing" : null;

            return (
              <div key={s.id} className="n-row" style={{
                display: "grid", gridTemplateColumns: "28px 1fr auto",
                gap: 12, alignItems: "flex-start",
                padding: "8px 8px", margin: "0 -8px",
                borderRadius: 4, cursor: "default",
              }}>
                <Avatar visitorId={s.visitorId} name={s.user?.name} />

                <div style={{ minWidth: 0 }}>
                  {/* Name row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: N.text }}>
                      {s.user?.name ?? `Visitor #${s.visitorId.slice(-6)}`}
                    </span>
                    {s.user?.email && (
                      <span style={{ fontSize: 12, color: N.muted }}>{s.user.email}</span>
                    )}
                    {statusLabel && (
                      <span style={{
                        fontSize: 11, fontWeight: 500, padding: "1px 6px", borderRadius: 3,
                        background: `${statusColor}22`, color: statusColor,
                        border: `1px solid ${statusColor}44`,
                      }}>{statusLabel}</span>
                    )}
                    {s.user?.planStatus === "trialing" && !s.converted && (
                      <span style={{
                        fontSize: 11, fontWeight: 500, padding: "1px 6px", borderRadius: 3,
                        background: `${N.blue}22`, color: N.blue, border: `1px solid ${N.blue}44`,
                      }}>Trialing</span>
                    )}
                  </div>

                  {/* Story */}
                  <p style={{ fontSize: 12, color: N.sec, margin: "0 0 6px", lineHeight: 1.5 }}>
                    {buildStory(s)}
                    {dur && <span style={{ color: N.muted }}> · {dur}</span>}
                  </p>

                  {/* Page trail */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                    {(s.pages as string[]).map((p, i) => (
                      <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{
                          fontSize: 11, fontFamily: "ui-monospace, monospace",
                          background: p === "/billing" ? `${N.amber}18` : N.s2,
                          color: p === "/billing" ? N.amber : N.muted,
                          border: `1px solid ${p === "/billing" ? `${N.amber}40` : N.border}`,
                          borderRadius: 3, padding: "1px 6px",
                        }}>{p}</span>
                        {i < (s.pages as string[]).length - 1 && (
                          <span style={{ color: N.border, fontSize: 10 }}>›</span>
                        )}
                      </span>
                    ))}
                    {s.referrer && (() => {
                      try {
                        const host = new URL(s.referrer).hostname.replace("www.", "");
                        return (
                          <span style={{ fontSize: 11, color: N.muted, background: N.s2, border: `1px solid ${N.border}`, borderRadius: 3, padding: "1px 6px", fontFamily: "ui-monospace, monospace" }}>
                            ← {host}
                          </span>
                        );
                      } catch { return null; }
                    })()}
                  </div>
                </div>

                <span style={{ fontSize: 12, color: N.muted, whiteSpace: "nowrap", paddingTop: 2 }}>
                  {timeSince(s.createdAt)}
                </span>
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="vi-pg" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24, paddingTop: 16, borderTop: `1px solid ${N.border}` }}>
              <span style={{ fontSize: 12, color: N.muted }}>
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sessions.length)} of {sessions.length}
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="n-pg" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  style={{
                    fontSize: 12, padding: "5px 12px", borderRadius: 4, border: `1px solid ${N.border}`,
                    background: "transparent", color: page === 0 ? N.muted : N.sec, cursor: page === 0 ? "not-allowed" : "pointer",
                    opacity: page === 0 ? 0.4 : 1, fontFamily: "inherit",
                  }}>← Prev</button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i} className="n-pg" onClick={() => setPage(i)}
                    style={{
                      fontSize: 12, padding: "5px 10px", borderRadius: 4,
                      border: `1px solid ${page === i ? N.sec : N.border}`,
                      background: page === i ? N.s2 : "transparent",
                      color: page === i ? N.text : N.muted,
                      cursor: "pointer", fontFamily: "inherit", minWidth: 32,
                    }}>{i + 1}</button>
                ))}
                <button className="n-pg" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                  style={{
                    fontSize: 12, padding: "5px 12px", borderRadius: 4, border: `1px solid ${N.border}`,
                    background: "transparent", color: page === totalPages - 1 ? N.muted : N.sec,
                    cursor: page === totalPages - 1 ? "not-allowed" : "pointer",
                    opacity: page === totalPages - 1 ? 0.4 : 1, fontFamily: "inherit",
                  }}>Next →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Events */}
      {tab === "events" && (
        <div>
          {events.length === 0 && (
            <div style={{ textAlign: "center", padding: "64px 0", color: N.muted, fontSize: 14 }}>
              No events yet.
            </div>
          )}
          {events.map(e => (
            <div key={e.id} className="n-row" style={{
              display: "grid", gridTemplateColumns: "28px 1fr auto",
              gap: 12, alignItems: "center", padding: "7px 8px", margin: "0 -8px", borderRadius: 4,
            }}>
              <Avatar visitorId={e.userId} name={e.user?.name} />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontSize: 11, fontFamily: "ui-monospace, monospace", fontWeight: 500,
                    background: `${N.purple}18`, color: N.purple,
                    border: `1px solid ${N.purple}40`, borderRadius: 3, padding: "1px 7px",
                  }}>{e.event}</span>
                  <span style={{ fontSize: 12, color: N.muted }}>{e.user?.name ?? e.userId.slice(-8)}</span>
                  {e.properties && Object.keys(e.properties).length > 0 && (
                    <span style={{ fontSize: 11, color: N.muted, fontFamily: "ui-monospace, monospace" }}>
                      {JSON.stringify(e.properties)}
                    </span>
                  )}
                </div>
              </div>
              <span style={{ fontSize: 12, color: N.muted }}>{timeSince(e.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
      {/* Feedback */}
      {tab === "feedback" && (
        <div>
          {feedbacks.length === 0 && (
            <div style={{ textAlign: "center", padding: "64px 0", color: N.muted, fontSize: 14 }}>
              No feedback yet.
            </div>
          )}
          {feedbacks.map(f => {
            const typeColor = f.type === "bug" ? N.red : f.type === "feature" ? N.green : N.blue;
            const typeLabel = f.type === "bug" ? "🐛 Bug" : f.type === "feature" ? "✨ Feature" : "💬 General";
            return (
              <div key={f.id} className="n-row" style={{
                display: "grid", gridTemplateColumns: "28px 1fr auto",
                gap: 12, alignItems: "flex-start",
                padding: "10px 8px", margin: "0 -8px",
                borderRadius: 4, cursor: "default",
              }}>
                <Avatar visitorId={f.userId ?? f.id} name={f.user?.name} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "1px 7px", borderRadius: 3,
                      background: `${typeColor}18`, color: typeColor, border: `1px solid ${typeColor}40`,
                    }}>{typeLabel}</span>
                    <span style={{ fontSize: 12, color: N.muted }}>
                      {f.user?.name ?? "Anonymous"}
                      {f.user?.email && <span style={{ color: N.muted }}> · {f.user.email}</span>}
                    </span>
                    {f.url && (
                      <span style={{ fontSize: 11, fontFamily: "ui-monospace, monospace", background: N.s2, border: `1px solid ${N.border}`, borderRadius: 3, padding: "1px 6px", color: N.muted }}>
                        {f.url}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: N.text, margin: 0, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {f.message}
                  </p>
                </div>
                <span style={{ fontSize: 12, color: N.muted, whiteSpace: "nowrap", paddingTop: 2 }}>
                  {timeSince(f.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      </div>{/* end right column */}
    </div>
  );
}
