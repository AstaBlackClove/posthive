"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { PlatformIcon } from "../../components/PlatformIcon";
import { useToast } from "../../components/Toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const THREADS_AUTH_URL = process.env.NEXT_PUBLIC_THREADS_AUTH_URL ?? `${API_BASE}/auth/threads`;
const INSTAGRAM_AUTH_URL = `${API_BASE}/auth/instagram`;
const LINKEDIN_AUTH_URL = `${API_BASE}/auth/linkedin`;

const BG = "#0a0a0a";
const SURFACE = "#111111";
const BORDER = "#2a2a2a";
const TEXT = "#ededed";
const MUTED = "#888888";

interface Account {
  id: string;
  platform: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

const PLATFORM_META: Record<string, { label: string; brand: string }> = {
  bluesky:  { label: "Bluesky",  brand: "#0085ff" },
  threads:  { label: "Threads",  brand: "#1a1a1a" },
  linkedin: { label: "LinkedIn", brand: "#0077b5" },
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
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: BG, border: `1px solid ${BORDER}` }}>
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
        className="text-xs font-medium transition-colors disabled:opacity-50 px-2 py-1 rounded-lg hover:text-red-400"
        style={{ color: MUTED }}>
        {disconnecting === account.id ? "…" : "Disconnect"}
      </button>
    </div>
  );
}

const inputCls = "w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 transition";
const inputStyle = { border: `1px solid ${BORDER}`, backgroundColor: "#0d0d0d", color: TEXT };

// ── Bluesky connect dialog ────────────────────────────────────────────────────
function BlueskyDialog({ onClose, onConnected }: { onClose: () => void; onConnected: () => void }) {
  const [handle, setHandle] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true); setError(null);
    try {
      await apiFetch("/accounts/bluesky", {
        method: "POST",
        body: JSON.stringify({ handle: handle.replace(/^@/, ""), appPassword }),
      });
      onConnected();
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: "#161616", border: `1px solid ${BORDER}` }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center">
              <PlatformIcon platform="bluesky" size={18} />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: TEXT }}>Connect Bluesky</p>
              <p className="text-xs" style={{ color: MUTED }}>App password · no OAuth needed</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:bg-white/5"
            style={{ color: MUTED }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            placeholder="Handle — e.g. you.bsky.social"
            value={handle} onChange={(e) => setHandle(e.target.value)}
            required autoFocus
            className={inputCls} style={inputStyle} />
          <div>
            <input
              type="password"
              placeholder="App password"
              value={appPassword} onChange={(e) => setAppPassword(e.target.value)}
              required
              className={inputCls} style={inputStyle} />
            <p className="text-xs mt-1.5" style={{ color: "#555" }}>
              bsky.app → Settings → App Passwords → Add App Password
            </p>
          </div>

          {error && (
            <p className="text-xs rounded-lg px-3 py-2" style={{ backgroundColor: "#1a0a0a", border: "1px solid #3a1a1a", color: "#f87171" }}>
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ backgroundColor: "#1a1a1a", color: MUTED, border: `1px solid ${BORDER}` }}>
              Cancel
            </button>
            <button type="submit" disabled={connecting}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 hover:bg-gray-100"
              style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
              {connecting ? "Connecting…" : "Connect"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface PlanStatus {
  maxAccounts: number;
  accountsUsed: number;
  planStatus: string;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AccountsPage() {
  const { success, error: toastError } = useToast();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null);
  const [showBlueskyDialog, setShowBlueskyDialog] = useState(false);

  const [threadsToken, setThreadsToken] = useState("");
  const [connectingThreads, setConnectingThreads] = useState(false);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [showManualToken, setShowManualToken] = useState(false);

  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const oauthConnected = searchParams.get("connected");
  const oauthError = searchParams.get("error");

  async function fetchAccounts() {
    try {
      const [accs, status] = await Promise.all([
        apiFetch<Account[]>("/accounts"),
        apiFetch<PlanStatus>("/billing/status"),
      ]);
      setAccounts(accs);
      setPlanStatus(status);
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchAccounts(); }, []);

  // Show OAuth result as toast once (clear param from URL after)
  useEffect(() => {
    if (oauthConnected) {
      success(`${oauthConnected.charAt(0).toUpperCase() + oauthConnected.slice(1)} connected successfully!`);
      window.history.replaceState({}, "", "/accounts");
    }
    if (oauthError) {
      toastError(decodeURIComponent(oauthError));
      window.history.replaceState({}, "", "/accounts");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connectThreadsManual(e: React.FormEvent) {
    e.preventDefault();
    setConnectingThreads(true); setThreadsError(null);
    try {
      await apiFetch("/auth/threads/manual", { method: "POST", body: JSON.stringify({ accessToken: threadsToken.trim() }) });
      setThreadsToken(""); setShowManualToken(false);
      await fetchAccounts();
      success("Threads account connected!");
    } catch (err) { setThreadsError(String(err)); toastError(String(err)); }
    finally { setConnectingThreads(false); }
  }

  async function disconnect(id: string, displayName: string) {
    if (!confirm(`Disconnect @${displayName}? This won't affect already-scheduled jobs.`)) return;
    setDisconnecting(id);
    try {
      await apiFetch(`/accounts/${id}`, { method: "DELETE" });
      await fetchAccounts();
      success(`@${displayName} disconnected.`);
    } catch (err) { toastError(String(err)); }
    finally { setDisconnecting(null); }
  }

  // Bluesky connected via dialog
  function onBlueskyConnected() {
    fetchAccounts();
    success("Bluesky account connected!");
  }

  const blueskyAccounts = accounts.filter((a) => a.platform === "bluesky");
  const threadsAccounts = accounts.filter((a) => a.platform === "threads");
  const instagramAccounts = accounts.filter((a) => a.platform === "instagram");
  const linkedinAccounts = accounts.filter((a) => a.platform === "linkedin");

  const isCancelled = planStatus?.planStatus === "cancelled";
  const atLimit = planStatus !== null && !isCancelled && accounts.length >= planStatus.maxAccounts;
  const connectDisabled = isCancelled || atLimit;
  const limitMsg = isCancelled
    ? "Your subscription is cancelled. Resubscribe to connect new accounts."
    : atLimit
    ? `You've reached your ${planStatus!.maxAccounts}-account limit. Disconnect an account or upgrade your plan.`
    : null;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: BG }}>

      {showBlueskyDialog && (
        <BlueskyDialog
          onClose={() => setShowBlueskyDialog(false)}
          onConnected={onBlueskyConnected}
        />
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-8 flex-shrink-0"
        style={{ height: 65, borderBottom: `1px solid ${BORDER}`, backgroundColor: SURFACE }}>
        <div>
          <h1 className="text-lg font-bold" style={{ color: TEXT }}>Accounts</h1>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>Connect the social accounts you want to post to.</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={accounts.length > 0
            ? { backgroundColor: "#052e16", color: "#4ade80", border: "1px solid #14532d" }
            : { backgroundColor: "#1a1a1a", color: MUTED, border: `1px solid ${BORDER}` }}>
          {accounts.length} connected
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">


        {isCancelled && (
          <div className="mb-5 flex items-center gap-3 text-sm rounded-xl px-4 py-3"
            style={{ backgroundColor: "#1f0a0a", border: "1px solid #7f1d1d" }}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#f87171" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <span style={{ color: "#f87171" }}>
              Subscription cancelled — connecting new accounts is disabled.{" "}
              <a href="/billing" className="underline font-semibold hover:opacity-80">Resubscribe</a> to continue.
            </span>
          </div>
        )}

        {!isCancelled && atLimit && (
          <div className="mb-5 flex items-center justify-between gap-4 text-sm rounded-xl px-4 py-3"
            style={{ backgroundColor: "#1c1209", border: "1px solid #78560a" }}>
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#fbbf24" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span style={{ color: "#fbbf24" }}>
                Account limit reached ({accounts.length}/{planStatus!.maxAccounts}). Disconnect one or{" "}
                <a href="/billing" className="underline font-semibold hover:opacity-80">upgrade your plan</a>.
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">

          {/* ── Bluesky ── */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
                <PlatformIcon platform="bluesky" size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: TEXT }}>Bluesky</p>
                <p className="text-xs" style={{ color: MUTED }}>App password · no OAuth needed</p>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#052e16", color: "#4ade80", border: "1px solid #14532d" }}>Live</span>
            </div>

            <div className="p-5 space-y-3">
              {!loading && blueskyAccounts.length > 0 && (
                <div className="space-y-2">
                  {blueskyAccounts.map((a) => (
                    <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} />
                  ))}
                </div>
              )}
              <button
                onClick={() => setShowBlueskyDialog(true)}
                disabled={connectDisabled}
                title={connectDisabled ? (limitMsg ?? undefined) : undefined}
                className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-xl transition-colors hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                <PlatformIcon platform="bluesky" size={16} />
                {blueskyAccounts.length > 0 ? "Add another Bluesky account" : "Connect Bluesky"}
              </button>
            </div>
          </div>

          {/* ── Threads ── */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
                <PlatformIcon platform="threads" size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: TEXT }}>Threads</p>
                <p className="text-xs" style={{ color: MUTED }}>Meta OAuth 2.0</p>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#052e16", color: "#4ade80", border: "1px solid #14532d" }}>Live</span>
            </div>

            <div className="p-5 space-y-3">
              {!loading && threadsAccounts.length > 0 && (
                <div className="space-y-2">
                  {threadsAccounts.map((a) => (
                    <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} />
                  ))}
                </div>
              )}

              {connectDisabled ? (
                <button disabled
                  title={connectDisabled ? (limitMsg ?? undefined) : undefined}
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-xl opacity-40 cursor-not-allowed"
                  style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                  <PlatformIcon platform="threads" size={16} />
                  {threadsAccounts.length > 0 ? "Add another Threads account" : "Connect with Threads"}
                </button>
              ) : (
                <a href={THREADS_AUTH_URL}
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-xl transition-colors hover:bg-gray-100"
                  style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                  <PlatformIcon platform="threads" size={16} />
                  {threadsAccounts.length > 0 ? "Add another Threads account" : "Connect with Threads"}
                </a>
              )}

              {!connectDisabled && (
                <button type="button" onClick={() => setShowManualToken((v) => !v)}
                  className="w-full text-xs transition-colors text-center py-1 hover:opacity-70"
                  >
                  {showManualToken ? "▲ Hide" : "OAuth not working? Paste an access token instead"}
                </button>
              )}

              {showManualToken && (
                <form onSubmit={connectThreadsManual} className="space-y-3 pt-2" style={{ borderTop: `1px solid ${BORDER}` }}>
                  <p className="text-xs" style={{ color: MUTED }}>
                    Get a token from the{" "}
                    <a href="https://developers.facebook.com" target="_blank" rel="noreferrer"
                      className="underline hover:opacity-70">Meta developer dashboard</a>
                    {" "}→ Use cases → Customize → User Token Generator.
                  </p>
                  <input type="password" placeholder="Paste Threads access token"
                    value={threadsToken} onChange={(e) => setThreadsToken(e.target.value)} required
                    className={inputCls} style={inputStyle} />
                  {threadsError && (
                    <p className="text-xs rounded-lg px-3 py-2"
                      style={{ backgroundColor: "#1a0a0a", border: "1px solid #3a1a1a", color: "#f87171" }}>
                      {threadsError}
                    </p>
                  )}
                  <button type="submit" disabled={connectingThreads || !threadsToken.trim()}
                    className="w-full py-2.5 disabled:opacity-50 text-sm font-semibold rounded-xl transition-colors hover:bg-gray-100"
                    style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                    {connectingThreads ? "Connecting…" : "Connect via Token"}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* ── Instagram ── */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
                <PlatformIcon platform="instagram" size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: TEXT }}>Instagram</p>
                <p className="text-xs" style={{ color: MUTED }}>Instagram Login · images required</p>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#052e16", color: "#4ade80", border: "1px solid #14532d" }}>Live</span>
            </div>
            <div className="p-5 space-y-3">
              {!loading && instagramAccounts.length > 0 && (
                <div className="space-y-2">
                  {instagramAccounts.map((a) => (
                    <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} />
                  ))}
                </div>
              )}
              {connectDisabled ? (
                <button disabled
                  title={connectDisabled ? (limitMsg ?? undefined) : undefined}
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-xl opacity-40 cursor-not-allowed"
                  style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                  <PlatformIcon platform="instagram" size={16} />
                  {instagramAccounts.length > 0 ? "Add another Instagram account" : "Connect Instagram"}
                </button>
              ) : (
                <a href={INSTAGRAM_AUTH_URL}
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-xl transition-colors hover:bg-gray-100"
                  style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                  <PlatformIcon platform="instagram" size={16} />
                  {instagramAccounts.length > 0 ? "Add another Instagram account" : "Connect Instagram"}
                </a>
              )}
              <p className="text-xs text-center">
                Requires a Professional (Business or Creator) Instagram account
              </p>
            </div>
          </div>

          {/* ── LinkedIn ── */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
                <PlatformIcon platform="linkedin" size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: TEXT }}>LinkedIn</p>
                <p className="text-xs" style={{ color: MUTED }}>LinkedIn OAuth 2.0</p>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#052e16", color: "#4ade80", border: "1px solid #14532d" }}>Live</span>
            </div>
            <div className="p-5 space-y-3">
              {!loading && linkedinAccounts.length > 0 && (
                <div className="space-y-2">
                  {linkedinAccounts.map((a) => (
                    <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} />
                  ))}
                </div>
              )}
              {connectDisabled ? (
                <button disabled title={connectDisabled ? (limitMsg ?? undefined) : undefined}
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-xl opacity-40 cursor-not-allowed"
                  style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                  <PlatformIcon platform="linkedin" size={16} />
                  {linkedinAccounts.length > 0 ? "Add another LinkedIn account" : "Connect LinkedIn"}
                </button>
              ) : (
                <a href={LINKEDIN_AUTH_URL}
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-xl transition-colors hover:bg-gray-100"
                  style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                  <PlatformIcon platform="linkedin" size={16} />
                  {linkedinAccounts.length > 0 ? "Add another LinkedIn account" : "Connect LinkedIn"}
                </a>
              )}
              <p className="text-xs text-center">
                Requires a LinkedIn developer app with w_member_social permission
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
