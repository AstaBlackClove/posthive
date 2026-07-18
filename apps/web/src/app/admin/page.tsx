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

interface AdminData {
  funnel: {
    totalSessions: number;
    billingViews: number;
    checkoutClicks: number;
    trialsStarted: number;
  };
  sessions: SessionRow[];
  events: EventRow[];
  stats: { totalUsers: number; newUsersToday: number };
}

function Avatar({ visitorId, name }: { visitorId: string; name?: string }) {
  const seed = name ? encodeURIComponent(name) : visitorId;
  return (
    <img
      src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${seed}`}
      alt={name ?? visitorId}
      style={{ width: 36, height: 36, borderRadius: "50%", background: "#1a1a1a", flexShrink: 0 }}
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
  if (!secs) return "—";
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function buildStory(s: SessionRow): string {
  const pages = s.pages as string[];
  const name = s.user?.name ?? "A visitor";
  const ref = s.referrer ? ` via ${new URL(s.referrer).hostname}` : "";
  const dur = s.duration ? ` in ${formatDuration(s.duration)}` : "";

  const parts: string[] = [];
  parts.push(`${name} arrived${ref}`);

  if (pages.length === 1) {
    parts.push(`and only visited ${pages[0]}`);
  } else {
    const joined = pages.slice(0, 4).map(p => p === "/" ? "home" : p.replace("/", "")).join(" → ");
    parts.push(`browsed ${joined}`);
  }

  if (s.converted) {
    parts.push("and started a trial ✓");
  } else if (pages.includes("/billing")) {
    parts.push("but left at billing without converting");
  } else {
    parts.push("and left without reaching billing");
  }

  if (dur) parts.push(`(${dur.trim()})`);
  return parts.join(" ") + ".";
}

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "#888" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#ededed", fontVariantNumeric: "tabular-nums" }}>
          {value} <span style={{ color: "#444" }}>({pct}%)</span>
        </span>
      </div>
      <div style={{ height: 6, background: "#1a1a1a", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width .6s ease" }} />
      </div>
    </div>
  );
}

const ADMIN_PIN_KEY = "ph_admin_unlocked";

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"sessions" | "events">("sessions");
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    // Check if already unlocked in this session
    if (sessionStorage.getItem(ADMIN_PIN_KEY)) setUnlocked(true);
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    const storedPin = sessionStorage.getItem(ADMIN_PIN_KEY) ?? "";
    apiFetch<AdminData>("/track/admin", { headers: { "x-admin-pin": storedPin } })
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [unlocked]);

  async function handlePin(e: React.FormEvent) {
    e.preventDefault();
    if (!pin) return;
    // Validate PIN server-side — never compared in browser
    try {
      await apiFetch("/track/admin", { headers: { "x-admin-pin": pin } });
      sessionStorage.setItem(ADMIN_PIN_KEY, pin); // store raw PIN for subsequent requests
      setUnlocked(true);
    } catch {
      setPinError(true);
      setPin("");
      setTimeout(() => setPinError(false), 2000);
    }
  }

  if (!unlocked) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0a0a" }}>
      <form onSubmit={handlePin} style={{ display: "flex", flexDirection: "column", gap: 12, width: 280 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#ededed", textAlign: "center", marginBottom: 4 }}>Admin access</div>
        <input
          type="password"
          value={pin}
          onChange={e => setPin(e.target.value)}
          placeholder="Enter PIN"
          autoFocus
          style={{
            background: pinError ? "#1a0a0a" : "#111", border: `1px solid ${pinError ? "#7f1d1d" : "#2a2a2a"}`,
            borderRadius: 10, padding: "10px 14px", color: "#ededed", fontSize: 14, outline: "none",
            textAlign: "center", letterSpacing: "0.2em",
          }}
        />
        {pinError && <p style={{ fontSize: 12, color: "#f87171", textAlign: "center", margin: 0 }}>Wrong PIN</p>}
        <button type="submit" style={{
          background: "#5b63d3", color: "#fff", border: "none", borderRadius: 10,
          padding: "10px 0", fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>Unlock</button>
      </form>
    </div>
  );;

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0a0a", color: "#444" }}>
      Loading…
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0a0a", color: "#f87171" }}>
      {error.includes("403") ? "Access denied — admin only." : error}
    </div>
  );

  if (!data) return null;

  const { funnel, sessions, events, stats } = data;

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#ededed", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #1a1a1a", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>Admin Visitor Intelligence</h1>
          <p style={{ fontSize: 12, color: "#555", marginTop: 2 }}>Last 30 days · {stats.totalUsers} total users · {stats.newUsersToday} new today</p>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {[
            { label: "Sessions", value: funnel.totalSessions, color: "#5b63d3" },
            { label: "New users today", value: stats.newUsersToday, color: "#4ade80" },
            { label: "Trials started", value: funnel.trialsStarted, color: "#fbbf24" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center", background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "10px 20px" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px" }}>
        {/* Funnel */}
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 14, padding: "20px 24px", marginBottom: 24 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "#888", letterSpacing: ".06em", textTransform: "uppercase" }}>Conversion funnel</h2>
          <FunnelBar label="Visited site" value={funnel.totalSessions} max={funnel.totalSessions} color="#5b63d3" />
          <FunnelBar label="Reached billing" value={funnel.billingViews} max={funnel.totalSessions} color="#818cf8" />
          <FunnelBar label="Clicked a plan" value={funnel.checkoutClicks} max={funnel.totalSessions} color="#fbbf24" />
          <FunnelBar label="Started trial" value={funnel.trialsStarted} max={funnel.totalSessions} color="#4ade80" />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {(["sessions", "events"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                fontSize: 12, fontWeight: 600, padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                background: tab === t ? "#5b63d3" : "#111",
                color: tab === t ? "#fff" : "#555",
              }}>
              {t === "sessions" ? `Sessions (${sessions.length})` : `Events (${events.length})`}
            </button>
          ))}
        </div>

        {/* Sessions — storytelling cards */}
        {tab === "sessions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sessions.length === 0 && (
              <div style={{ textAlign: "center", padding: 48, color: "#444" }}>No sessions yet — tracking starts once deployed.</div>
            )}
            {sessions.map(s => (
              <div key={s.id} style={{
                background: "#111", border: `1px solid ${s.converted ? "rgba(74,222,128,.2)" : "#1e1e1e"}`,
                borderRadius: 12, padding: "16px 20px",
                display: "flex", gap: 14, alignItems: "flex-start",
              }}>
                <Avatar visitorId={s.visitorId} name={s.user?.name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#ededed" }}>
                      {s.user?.name ?? `Visitor #${s.visitorId.slice(-6)}`}
                    </span>
                    {s.user?.email && (
                      <span style={{ fontSize: 11, color: "#555" }}>{s.user.email}</span>
                    )}
                    {s.converted && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: "rgba(74,222,128,.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,.25)", borderRadius: 20, padding: "2px 8px" }}>
                        CONVERTED
                      </span>
                    )}
                    {s.user?.planStatus === "trialing" && !s.converted && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: "rgba(251,191,36,.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,.25)", borderRadius: 20, padding: "2px 8px" }}>
                        TRIALING
                      </span>
                    )}
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "#444" }}>{timeSince(s.createdAt)}</span>
                  </div>

                  {/* Story */}
                  <p style={{ fontSize: 13, color: "#888", lineHeight: 1.6, marginBottom: 10 }}>
                    {buildStory(s)}
                  </p>

                  {/* Page trail */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                    {(s.pages as string[]).map((p, i) => (
                      <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{
                          fontSize: 11, fontFamily: "monospace",
                          background: p === "/billing" ? "rgba(91,99,211,.15)" : "#161616",
                          color: p === "/billing" ? "#9ba2ee" : "#555",
                          border: `1px solid ${p === "/billing" ? "rgba(91,99,211,.3)" : "#222"}`,
                          borderRadius: 5, padding: "2px 7px",
                        }}>{p}</span>
                        {i < (s.pages as string[]).length - 1 && <span style={{ color: "#333", fontSize: 10 }}>→</span>}
                      </span>
                    ))}
                    {s.duration && (
                      <span style={{ fontSize: 11, color: "#444", marginLeft: 4 }}>· {formatDuration(s.duration)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Events */}
        {tab === "events" && (
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, overflow: "hidden" }}>
            {events.length === 0 && (
              <div style={{ textAlign: "center", padding: 48, color: "#444" }}>No events yet.</div>
            )}
            {events.map((e, i) => (
              <div key={e.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 20px",
                borderBottom: i < events.length - 1 ? "1px solid #161616" : "none",
              }}>
                <Avatar visitorId={e.userId} name={e.user?.name} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#9ba2ee", fontFamily: "monospace" }}>{e.event}</span>
                    <span style={{ fontSize: 11, color: "#555" }}>{e.user?.name ?? e.userId.slice(-8)}</span>
                    {e.properties && Object.keys(e.properties).length > 0 && (
                      <span style={{ fontSize: 11, color: "#444", fontFamily: "monospace" }}>
                        {JSON.stringify(e.properties)}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: "#444", flexShrink: 0 }}>{timeSince(e.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
