"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "../../lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const THREADS_AUTH_URL = process.env.NEXT_PUBLIC_THREADS_AUTH_URL ?? `${API_BASE}/auth/threads`;

interface Account {
  id: string;
  platform: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

const PLATFORM_META: Record<string, { label: string; icon: string; color: string; bg: string; brand: string }> = {
  bluesky:  { label: "Bluesky",  icon: "🦋", color: "text-blue-600",  bg: "bg-blue-50",  brand: "#0085ff" },
  threads:  { label: "Threads",  icon: "🧵", color: "text-gray-900",  bg: "bg-gray-100", brand: "#000000" },
  linkedin: { label: "LinkedIn", icon: "💼", color: "text-blue-700",  bg: "bg-blue-50",  brand: "#0077b5" },
};

function Avatar({ account }: { account: Account }) {
  const meta = PLATFORM_META[account.platform];
  if (account.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={account.avatarUrl} alt={account.displayName}
        className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm" />
    );
  }
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${meta?.bg} ${meta?.color}`}>
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
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 group">
      <Avatar account={account} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {account.platform === "threads" ? "@" : ""}{account.displayName}
        </p>
        <p className="text-xs text-gray-400">
          Connected {new Date(account.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>
      <button
        onClick={() => onDisconnect(account.id, account.displayName)}
        disabled={disconnecting === account.id}
        className="text-xs text-gray-300 group-hover:text-red-400 font-medium transition-colors disabled:opacity-50 px-2 py-1 rounded-lg group-hover:bg-red-50"
      >
        {disconnecting === account.id ? "…" : "Disconnect"}
      </button>
    </div>
  );
}

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
      await apiFetch("/accounts/bluesky", {
        method: "POST",
        body: JSON.stringify({ handle: handle.replace(/^@/, ""), appPassword }),
      });
      setHandle(""); setAppPassword(""); setConnectSuccess(true);
      await fetchAccounts();
    } catch (err) { setConnectError(String(err)); }
    finally { setConnecting(false); }
  }

  async function connectThreadsManual(e: React.FormEvent) {
    e.preventDefault();
    setConnectingThreads(true); setThreadsError(null);
    try {
      await apiFetch("/auth/threads/manual", {
        method: "POST",
        body: JSON.stringify({ accessToken: threadsToken.trim() }),
      });
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
    <div className="flex flex-col h-full overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Accounts</h1>
          <p className="text-xs text-gray-400 mt-0.5">Connect the social accounts you want to post to.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            accounts.length > 0 ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500"
          }`}>
            {accounts.length} connected
          </span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">

        {/* OAuth banners */}
        {oauthConnected === "threads" && (
          <div className="mb-5 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <span>✓</span> Threads account connected successfully!
          </div>
        )}
        {oauthError && (
          <div className="mb-5 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <span>⚠️</span> {decodeURIComponent(oauthError)}
          </div>
        )}

        <div className="max-w-2xl space-y-4">

          {/* ── Bluesky ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-lg flex-shrink-0">🦋</div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">Bluesky</p>
                <p className="text-xs text-gray-400">App password · no OAuth needed</p>
              </div>
              <span className="text-[11px] bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">Live</span>
            </div>

            {!loading && blueskyAccounts.length > 0 && (
              <div className="px-5 pt-4 space-y-2">
                {blueskyAccounts.map((a) => (
                  <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} />
                ))}
              </div>
            )}

            <form onSubmit={connectBluesky} className="p-5 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {blueskyAccounts.length > 0 ? "Add another account" : "Connect your account"}
              </p>
              <input
                placeholder="Handle — e.g. you.bsky.social"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <input
                type="password"
                placeholder="App password — bsky.app → Settings → App Passwords"
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              {connectError && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{connectError}</p>}
              {connectSuccess && <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">✓ Connected successfully</p>}
              <button
                type="submit"
                disabled={connecting}
                className="w-full py-2.5 bg-[#0085ff] hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {connecting ? "Connecting…" : "Connect Bluesky"}
              </button>
            </form>
          </div>

          {/* ── Threads ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">🧵</div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">Threads</p>
                <p className="text-xs text-gray-400">Meta OAuth 2.0</p>
              </div>
              <span className="text-[11px] bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">Live</span>
            </div>

            {!loading && threadsAccounts.length > 0 && (
              <div className="px-5 pt-4 space-y-2">
                {threadsAccounts.map((a) => (
                  <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} />
                ))}
              </div>
            )}

            <div className="p-5 space-y-3">
              <a
                href={THREADS_AUTH_URL}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <span>🧵</span>
                {threadsAccounts.length > 0 ? "Add another Threads account" : "Connect with Threads"}
              </a>

              <button
                type="button"
                onClick={() => setShowManualToken((v) => !v)}
                className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors text-center py-1"
              >
                {showManualToken ? "▲ Hide manual token option" : "OAuth not working? Paste an access token instead"}
              </button>

              {showManualToken && (
                <form onSubmit={connectThreadsManual} className="space-y-3 pt-1 border-t border-gray-100">
                  <p className="text-xs text-gray-400 pt-2">
                    Get a token from the{" "}
                    <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="underline text-gray-600">
                      Meta developer dashboard
                    </a>
                    {" "}→ Use cases → Customize → User Token Generator.
                  </p>
                  <input
                    type="password"
                    placeholder="Paste Threads access token"
                    value={threadsToken}
                    onChange={(e) => setThreadsToken(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
                  />
                  {threadsError && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{threadsError}</p>}
                  <button
                    type="submit"
                    disabled={connectingThreads || !threadsToken.trim()}
                    className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    {connectingThreads ? "Connecting…" : "Connect via Token"}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* ── LinkedIn ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden opacity-50">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-lg flex-shrink-0">💼</div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">LinkedIn</p>
                <p className="text-xs text-gray-400">Requires LinkedIn developer app</p>
              </div>
              <span className="text-[11px] bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">Coming soon</span>
            </div>
            <div className="p-5">
              <button disabled
                className="w-full py-2.5 bg-gray-100 text-gray-400 text-sm font-semibold rounded-xl cursor-not-allowed">
                Connect LinkedIn
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
