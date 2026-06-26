"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { PlatformIcon } from "../../components/PlatformIcon";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const THREADS_AUTH_URL = process.env.NEXT_PUBLIC_THREADS_AUTH_URL ?? `${API_BASE}/auth/threads`;

const BG = "#0a0a0a";
const SURFACE = "#111111";
const BORDER = "#1f1f1f";
const TEXT = "#ededed";
const MUTED = "#888888";

interface Account {
  id: string;
  platform: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

const PLATFORM_META: Record<string, { label: string; icon: string; brand: string }> = {
  bluesky:  { label: "Bluesky",  icon: "🦋", brand: "#0085ff" },
  threads:  { label: "Threads",  icon: "🧵", brand: "#1a1a1a" },
  linkedin: { label: "LinkedIn", icon: "💼", brand: "#0077b5" },
};

function Avatar({ account }: { account: Account }) {
  const meta = PLATFORM_META[account.platform];
  if (account.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={account.avatarUrl} alt={account.displayName}
        className="w-10 h-10 rounded-full object-cover" style={{ boxShadow: `0 0 0 2px ${SURFACE}` }} />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
      style={{ backgroundColor: meta?.brand ?? "#6b7280" }}>
      {account.displayName[0]?.toUpperCase()}
    </div>
  );
}

function ConnectedAccountRow({ account, onDisconnect, disconnecting }: {
  account: Account;
  onDisconnect: (id: string, name: string) => void;
  disconnecting: string | null;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl group" style={{ backgroundColor: BG, border: `1px solid ${BORDER}` }}>
      <Avatar account={account} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: TEXT }}>
          {account.platform === "threads" ? "@" : ""}{account.displayName}
        </p>
        <p className="text-xs" style={{ color: MUTED }}>
          Connected {new Date(account.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>
      <button
        onClick={() => onDisconnect(account.id, account.displayName)}
        disabled={disconnecting === account.id}
        className="text-xs font-medium transition-colors disabled:opacity-50 px-2 py-1 rounded-lg hover:text-red-500 hover:bg-red-50"
        style={{ color: MUTED }}
      >
        {disconnecting === account.id ? "…" : "Disconnect"}
      </button>
    </div>
  );
}

const inputCls = "w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition";
const inputStyle = { border: `1px solid ${BORDER}`, backgroundColor: BG, color: TEXT };

export default function AccountsPage() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const [handle, setHandle] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectSuccess, setConnectSuccess] = useState(false);

  const [threadsToken, setThreadsToken] = useState("");
  const [connectingThreads, setConnectingThreads] = useState(false);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [showManualToken, setShowManualToken] = useState(false);

  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const oauthConnected = searchParams.get("connected");
  const oauthError = searchParams.get("error");

  async function fetchAccounts() {
    try { setAccounts(await apiFetch<Account[]>("/accounts")); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchAccounts(); }, []);

  async function connectBluesky(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true); setConnectError(null); setConnectSuccess(false);
    try {
      await apiFetch("/accounts/bluesky", { method: "POST", body: JSON.stringify({ handle: handle.replace(/^@/, ""), appPassword }) });
      setHandle(""); setAppPassword(""); setConnectSuccess(true);
      await fetchAccounts();
    } catch (err) { setConnectError(String(err)); }
    finally { setConnecting(false); }
  }

  async function connectThreadsManual(e: React.FormEvent) {
    e.preventDefault();
    setConnectingThreads(true); setThreadsError(null);
    try {
      await apiFetch("/auth/threads/manual", { method: "POST", body: JSON.stringify({ accessToken: threadsToken.trim() }) });
      setThreadsToken(""); setShowManualToken(false);
      await fetchAccounts();
    } catch (err) { setThreadsError(String(err)); }
    finally { setConnectingThreads(false); }
  }

  async function disconnect(id: string, displayName: string) {
    if (!confirm(`Disconnect @${displayName}? This won't affect already-scheduled jobs.`)) return;
    setDisconnecting(id);
    try { await apiFetch(`/accounts/${id}`, { method: "DELETE" }); await fetchAccounts(); }
    finally { setDisconnecting(null); }
  }

  const blueskyAccounts = accounts.filter((a) => a.platform === "bluesky");
  const threadsAccounts = accounts.filter((a) => a.platform === "threads");

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: BG }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 flex-shrink-0"
        style={{ borderBottom: `1px solid ${BORDER}`, backgroundColor: SURFACE }}>
        <div>
          <h1 className="text-lg font-bold" style={{ color: TEXT }}>Accounts</h1>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>Connect the social accounts you want to post to.</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={accounts.length > 0
            ? { backgroundColor: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" }
            : { backgroundColor: "#1a1a1a", color: MUTED, border: `1px solid ${BORDER}` }}>
          {accounts.length} connected
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">

        {oauthConnected === "threads" && (
          <div className="mb-5 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            ✓ Threads account connected successfully!
          </div>
        )}
        {oauthError && (
          <div className="mb-5 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            ⚠️ {decodeURIComponent(oauthError)}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">

          {/* Bluesky */}
          <div className="rounded-2xl shadow-sm overflow-hidden" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "#0a2040" }}>
                <PlatformIcon platform="bluesky" size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: TEXT }}>Bluesky</p>
                <p className="text-xs" style={{ color: MUTED }}>App password · no OAuth needed</p>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#dcfce7", color: "#15803d" }}>Live</span>
            </div>

            {!loading && blueskyAccounts.length > 0 && (
              <div className="px-5 pt-4 space-y-2">
                {blueskyAccounts.map((a) => (
                  <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} />
                ))}
              </div>
            )}

            <form onSubmit={connectBluesky} className="p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
                {blueskyAccounts.length > 0 ? "Add another account" : "Connect your account"}
              </p>
              <input placeholder="Handle — e.g. you.bsky.social" value={handle}
                onChange={(e) => setHandle(e.target.value)} required
                className={inputCls} style={inputStyle} />
              <input type="password" placeholder="App password — bsky.app → Settings → App Passwords"
                value={appPassword} onChange={(e) => setAppPassword(e.target.value)} required
                className={inputCls} style={inputStyle} />
              {connectError && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{connectError}</p>}
              {connectSuccess && <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">✓ Connected successfully</p>}
              <button type="submit" disabled={connecting}
                className="w-full py-2.5 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                style={{ backgroundColor: "#0085ff" }}>
                {connecting ? "Connecting…" : "Connect Bluesky"}
              </button>
            </form>
          </div>

          {/* Threads */}
          <div className="rounded-2xl shadow-sm overflow-hidden" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "#1a1a1a", color: "#ededed" }}>
                <PlatformIcon platform="threads" size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: TEXT }}>Threads</p>
                <p className="text-xs" style={{ color: MUTED }}>Meta OAuth 2.0</p>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#dcfce7", color: "#15803d" }}>Live</span>
            </div>

            {!loading && threadsAccounts.length > 0 && (
              <div className="px-5 pt-4 space-y-2">
                {threadsAccounts.map((a) => (
                  <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} />
                ))}
              </div>
            )}

            <div className="p-5 space-y-3">
              <a href={THREADS_AUTH_URL}
                className="flex items-center justify-center gap-2 w-full py-2.5 text-white text-sm font-semibold rounded-xl transition-colors hover:opacity-90"
                style={{ backgroundColor: "#1a1a1a" }}>
                <PlatformIcon platform="threads" size={16} />
                {threadsAccounts.length > 0 ? "Add another Threads account" : "Connect with Threads"}
              </a>

              <button type="button" onClick={() => setShowManualToken((v) => !v)}
                className="w-full text-xs transition-colors text-center py-1 hover:opacity-70"
                style={{ color: MUTED }}>
                {showManualToken ? "▲ Hide manual token option" : "OAuth not working? Paste an access token instead"}
              </button>

              {showManualToken && (
                <form onSubmit={connectThreadsManual} className="space-y-3 pt-1" style={{ borderTop: `1px solid ${BORDER}` }}>
                  <p className="text-xs pt-2" style={{ color: MUTED }}>
                    Get a token from the{" "}
                    <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="underline">
                      Meta developer dashboard
                    </a>
                    {" "}→ Use cases → Customize → User Token Generator.
                  </p>
                  <input type="password" placeholder="Paste Threads access token"
                    value={threadsToken} onChange={(e) => setThreadsToken(e.target.value)} required
                    className={inputCls} style={inputStyle} />
                  {threadsError && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{threadsError}</p>}
                  <button type="submit" disabled={connectingThreads || !threadsToken.trim()}
                    className="w-full py-2.5 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                    style={{ backgroundColor: "#3d3c3a" }}>
                    {connectingThreads ? "Connecting…" : "Connect via Token"}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* LinkedIn — coming soon */}
          <div className="col-span-2 rounded-2xl shadow-sm overflow-hidden opacity-50" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "#00263d" }}>
                <PlatformIcon platform="linkedin" size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: TEXT }}>LinkedIn</p>
                <p className="text-xs" style={{ color: MUTED }}>Requires LinkedIn developer app</p>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#1a1a1a", color: MUTED }}>Coming soon</span>
            </div>
            <div className="p-5">
              <button disabled className="w-full py-2.5 text-sm font-semibold rounded-xl cursor-not-allowed"
                style={{ backgroundColor: "#1a1a1a", color: MUTED }}>
                Connect LinkedIn
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
