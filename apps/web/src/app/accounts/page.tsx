"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "../../lib/api";

// Module-level sets persist across re-mounts — prevents duplicate toasts/modals on navigation.
const _handledDiscordGuilds = new Set<string>();
const _shownConnectedToasts = new Set<string>();
import { PlatformIcon } from "../../components/PlatformIcon";
import { useToast } from "../../components/Toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const THREADS_AUTH_URL = `${API_BASE}/auth/threads`;
const INSTAGRAM_AUTH_URL = `${API_BASE}/auth/instagram`;
const LINKEDIN_AUTH_URL = `${API_BASE}/auth/linkedin`;
const MASTODON_AUTH_URL = `${API_BASE}/auth/mastodon`;
const PIXELFED_AUTH_URL = `${API_BASE}/auth/pixelfed`;
const YOUTUBE_AUTH_URL = `${API_BASE}/auth/youtube`;
const FACEBOOK_AUTH_URL = `${API_BASE}/auth/facebook`;
const TWITTER_AUTH_URL  = `${API_BASE}/auth/twitter`;
const PINTEREST_AUTH_URL = `${API_BASE}/auth/pinterest`;
const DISCORD_AUTH_URL   = `${API_BASE}/auth/discord`;
const TUMBLR_AUTH_URL    = `${API_BASE}/auth/tumblr`;

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
  expiresAt: string | null;
  npub?: string; // Nostr only — public key in bech32, safe to expose
}

const PLATFORM_META: Record<string, { label: string; brand: string }> = {
  bluesky:   { label: "Bluesky",   brand: "#0085ff" },
  threads:   { label: "Threads",   brand: "#1a1a1a" },
  linkedin:  { label: "LinkedIn",  brand: "#0077b5" },
  mastodon:  { label: "Mastodon",  brand: "#6364ff" },
  pixelfed:  { label: "Pixelfed",  brand: "#ff8c00" },
  youtube:   { label: "YouTube",   brand: "#ff0000" },
  facebook:  { label: "Facebook",  brand: "#1877f2" },
  pinterest: { label: "Pinterest", brand: "#e60023" },
  telegram:  { label: "Telegram",  brand: "#229ED9" },
  nostr:     { label: "Nostr",     brand: "#8B5CF6" },
  twitter:   { label: "X",         brand: "#000000" },
  instagram: { label: "Instagram", brand: "#e1306c" },
  tumblr:    { label: "Tumblr",    brand: "#35465c" },
  lemmy:     { label: "Lemmy",     brand: "#ff6314" },
};

function NostrFallbackAvatar() {
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
      style={{ boxShadow: `0 0 0 2px ${SURFACE}` }}>
      <PlatformIcon platform="nostr" size={40} />
    </div>
  );
}

function Avatar({ account }: { account: Account }) {
  const [imgError, setImgError] = useState(false);
  const meta = PLATFORM_META[account.platform];

  if (account.avatarUrl && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={account.avatarUrl} alt={account.displayName}
        className="w-10 h-10 rounded-full object-cover"
        style={{ boxShadow: `0 0 0 2px ${SURFACE}` }}
        onError={() => setImgError(true)} />
    );
  }
  if (account.platform === "nostr") return <NostrFallbackAvatar />;
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
      style={{ backgroundColor: meta?.brand ?? "#6b7280" }}>
      {account.displayName[0]?.toUpperCase()}
    </div>
  );
}

const RECONNECT_URLS: Record<string, string> = {
  threads:   `${API_BASE}/auth/threads`,
  instagram: `${API_BASE}/auth/instagram`,
  linkedin:  `${API_BASE}/auth/linkedin`,
  youtube:   `${API_BASE}/auth/youtube`,
  facebook:  `${API_BASE}/auth/facebook`,
  mastodon:  `${API_BASE}/auth/mastodon`,
  pixelfed:  `${API_BASE}/auth/pixelfed`,
  pinterest: `${API_BASE}/auth/pinterest`,
  tumblr:    `${API_BASE}/auth/tumblr`,
};

// Platforms where the token refresh cron handles silent renewal — no user action needed
const AUTO_REFRESH_PLATFORMS = new Set(["threads", "instagram", "facebook", "youtube"]);

function tokenStatus(platform: string, expiresAt: string | null): "ok" | "soon" | "expired" {
  if (!expiresAt || AUTO_REFRESH_PLATFORMS.has(platform)) return "ok";
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expired";
  if (ms < 7 * 24 * 60 * 60 * 1000) return "soon";
  return "ok";
}

function ConnectedAccountRow({ account, onDisconnect, disconnecting, postsThisMonth, onAvatarRefreshed }: {
  account: Account;
  onDisconnect: (id: string, name: string, platform?: string) => void;
  disconnecting: string | null;
  postsThisMonth?: number;
  onAvatarRefreshed?: (id: string, avatarUrl: string | null) => void;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const status = tokenStatus(account.platform, account.expiresAt);
  const reconnectUrl = RECONNECT_URLS[account.platform];

  async function refreshNostrAvatar() {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/accounts/nostr/${account.id}/refresh-avatar`, {
        method: "POST", credentials: "include",
      });
      if (res.ok) {
        const updated = await res.json() as Account;
        onAvatarRefreshed?.(account.id, updated.avatarUrl);
      }
    } finally { setRefreshing(false); }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: BG, border: `1px solid ${status === "expired" ? "#7f1d1d" : status === "soon" ? "#78560a" : BORDER}` }}>
      <div className="flex items-center gap-3 p-3">
        <Avatar account={account} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: TEXT }}>
            {account.platform === "threads" ? "@" : ""}{account.displayName}
          </p>
          <p className="text-xs flex items-center gap-1.5 flex-wrap" style={{ color: MUTED }}>
            Connected {new Date(account.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
            {postsThisMonth !== undefined && postsThisMonth > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ backgroundColor: "#0a1f12", color: "#4ade80", border: "1px solid #14532d" }}>
                {postsThisMonth} post{postsThisMonth !== 1 ? "s" : ""} this month
              </span>
            )}
            {account.platform === "nostr" && (
              <>
                <a
                  href={`https://primal.net/p/${account.npub ?? account.displayName}`}
                  target="_blank" rel="noopener noreferrer"
                  className="transition-opacity hover:opacity-80"
                  style={{ color: "#7B5EA7" }}>
                  View on Primal ↗
                </a>
                <button
                  onClick={refreshNostrAvatar}
                  disabled={refreshing}
                  className="transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ color: "#888888" }}>
                  {refreshing ? "Refreshing…" : "Refresh photo"}
                </button>
              </>
            )}
          </p>
        </div>
        <button
          onClick={() => onDisconnect(account.id, account.displayName, account.platform)}
          disabled={disconnecting === account.id}
          className="text-xs font-medium transition-colors disabled:opacity-50 px-2 py-1 rounded-lg hover:text-red-400"
          style={{ color: MUTED }}>
          {disconnecting === account.id ? "…" : "Disconnect"}
        </button>
      </div>
      {status !== "ok" && reconnectUrl && (
        <div className="flex items-center justify-between gap-2 px-3 py-2"
          style={{ backgroundColor: status === "expired" ? "#1f0a0a" : "#1c1209", borderTop: `1px solid ${status === "expired" ? "#7f1d1d" : "#78560a"}` }}>
          <p className="text-xs" style={{ color: status === "expired" ? "#f87171" : "#fbbf24" }}>
            {status === "expired" ? "Token expired — posts will fail" : "Token expires soon — reconnect to avoid interruption"}
          </p>
          <a href={reconnectUrl}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg flex-shrink-0 transition-opacity hover:opacity-80"
            style={{ backgroundColor: status === "expired" ? "#7f1d1d" : "#78350f", color: status === "expired" ? "#fca5a5" : "#fde68a" }}>
            Reconnect
          </a>
        </div>
      )}
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

// ── Telegram connect dialog ───────────────────────────────────────────────────
function TelegramDialog({ onClose, onConnected }: { onClose: () => void; onConnected: () => void }) {
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true); setError(null);
    try {
      await apiFetch("/auth/telegram", {
        method: "POST",
        body: JSON.stringify({ botToken: botToken.trim(), chatId: chatId.trim() }),
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

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center">
              <PlatformIcon platform="telegram" size={18} />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: TEXT }}>Connect Telegram Channel</p>
              <p className="text-xs" style={{ color: MUTED }}>Bot token · no OAuth needed</p>
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
          <div>
            <input
              placeholder="Bot token — e.g. 123456789:ABC-DEF..."
              value={botToken} onChange={(e) => setBotToken(e.target.value)}
              required autoFocus
              className={inputCls} style={inputStyle} />
            <p className="text-xs mt-1.5" style={{ color: "#555" }}>
              Create a bot via @BotFather on Telegram, then add it as admin to your channel
            </p>
          </div>
          <div>
            <input
              placeholder="Channel — e.g. @mychannel or -100123456789"
              value={chatId} onChange={(e) => setChatId(e.target.value)}
              required
              className={inputCls} style={inputStyle} />
            <p className="text-xs mt-1.5" style={{ color: "#555" }}>
              Use the channel username (@mychannel) or numeric chat ID
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

// ── Lemmy connect dialog ──────────────────────────────────────────────────────
function LemmyDialog({ onClose, onConnected }: { onClose: () => void; onConnected: () => void }) {
  const [instanceUrl, setInstanceUrl] = useState("https://lemmy.world");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [community, setCommunity] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true); setError(null);
    try {
      await apiFetch("/auth/lemmy", {
        method: "POST",
        body: JSON.stringify({ instanceUrl: instanceUrl.trim(), username: username.trim(), password: password.trim(), community: community.trim() }),
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

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center">
              <PlatformIcon platform="lemmy" size={18} />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: TEXT }}>Connect Lemmy</p>
              <p className="text-xs" style={{ color: MUTED }}>Username + password · any instance</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:bg-white/5" style={{ color: MUTED }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#aaa" }}>Instance URL</label>
            <input
              placeholder="https://lemmy.world"
              value={instanceUrl} onChange={(e) => setInstanceUrl(e.target.value)}
              required autoFocus
              className={inputCls} style={inputStyle} />
            <p className="text-xs mt-1.5" style={{ color: "#555" }}>Any Lemmy instance - lemmy.world, lemmy.ml, beehaw.org, etc.</p>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#aaa" }}>Username</label>
            <input
              placeholder="your_username"
              value={username} onChange={(e) => setUsername(e.target.value)}
              required
              className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#aaa" }}>Password</label>
            <input
              type="password"
              placeholder="your password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              required
              className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#aaa" }}>Community to post to</label>
            <input
              placeholder="selfhosted@lemmy.world"
              value={community} onChange={(e) => setCommunity(e.target.value)}
              required
              className={inputCls} style={inputStyle} />
            <p className="text-xs mt-1.5" style={{ color: "#555" }}>Format: communityname@instance.url</p>
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

// ── Pixelfed connect dialog ───────────────────────────────────────────────────
function PixelfedDialog({ onClose }: { onClose: () => void }) {
  const [instance, setInstance] = useState("pixelfed.social");

  function connect() {
    const url = `${PIXELFED_AUTH_URL}?instance=${encodeURIComponent(instance.trim())}`;
    window.location.href = url;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center">
              <PlatformIcon platform="pixelfed" size={18} />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: TEXT }}>Connect Pixelfed</p>
              <p className="text-xs" style={{ color: MUTED }}>Any instance supported</p>
            </div>
          </div>
          <button onClick={onClose} className="text-lg" style={{ color: MUTED }}>✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#aaa" }}>Your Pixelfed instance</label>
            <input
              value={instance}
              onChange={e => setInstance(e.target.value)}
              onKeyDown={e => e.key === "Enter" && instance.trim() && connect()}
              placeholder="pixelfed.social"
              autoFocus
              className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/10"
              style={{ backgroundColor: "#0a0a0a", border: `1px solid ${BORDER}`, color: TEXT }}
            />
            <p className="text-xs mt-1.5" style={{ color: "#555" }}>
              e.g. pixelfed.social · gram.social · pixelfed.au
            </p>
          </div>
          <button onClick={connect} disabled={!instance.trim()}
            className="w-full py-2.5 text-sm font-semibold rounded-xl disabled:opacity-40 hover:bg-gray-100 transition-colors"
            style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mastodon connect dialog ───────────────────────────────────────────────────
function MastodonDialog({ onClose }: { onClose: () => void }) {
  const [instance, setInstance] = useState("mastodon.social");

  function connect() {
    const url = `${MASTODON_AUTH_URL}?instance=${encodeURIComponent(instance.trim())}`;
    window.location.href = url;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: "#161616", border: `1px solid ${BORDER}` }}>

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center">
              <PlatformIcon platform="mastodon" size={18} />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: TEXT }}>Connect Mastodon</p>
              <p className="text-xs" style={{ color: MUTED }}>Any instance supported</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:bg-white/5" style={{ color: MUTED }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#aaa" }}>Your Mastodon instance</label>
            <input
              value={instance}
              onChange={e => setInstance(e.target.value)}
              onKeyDown={e => e.key === "Enter" && instance.trim() && connect()}
              placeholder="mastodon.social"
              autoFocus
              className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/10"
              style={{ backgroundColor: "#0a0a0a", border: `1px solid ${BORDER}`, color: TEXT }}
            />
            <p className="text-xs mt-1.5" style={{ color: "#555" }}>
              e.g. mastodon.social · fosstodon.org · hachyderm.io
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ backgroundColor: "#1a1a1a", color: MUTED, border: `1px solid ${BORDER}` }}>
              Cancel
            </button>
            <button onClick={connect} disabled={!instance.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 hover:bg-gray-100"
              style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NostrDialog({ onClose, onConnected }: { onClose: () => void; onConnected: () => void }) {
  const [nsec, setNsec] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ nsecBech32: string; npubBech32: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true); setError(null);
    try {
      const data = await apiFetch("/accounts/nostr/generate", { method: "POST" }) as { nsecBech32: string; npubBech32: string };
      setGenerated(data);
      setNsec(data.nsecBech32);
    } catch (err) { setError(String(err)); }
    finally { setGenerating(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true); setError(null);
    try {
      await apiFetch("/accounts/nostr", { method: "POST", body: JSON.stringify({ nsec: nsec.trim() }) });
      onConnected();
      onClose();
    } catch (err) { setError(String(err)); }
    finally { setConnecting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: "#161616", border: `1px solid ${BORDER}` }}>

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center">
              <PlatformIcon platform="nostr" size={18} />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: TEXT }}>Connect Nostr</p>
              <p className="text-xs" style={{ color: MUTED }}>Keypair · no OAuth, no approval</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:bg-white/5" style={{ color: MUTED }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#aaa" }}>Private key (nsec)</label>
            <input
              placeholder="nsec1… or 64-char hex"
              value={nsec} onChange={(e) => setNsec(e.target.value)}
              required autoFocus
              className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/10 font-mono"
              style={{ backgroundColor: "#0a0a0a", border: `1px solid ${BORDER}`, color: TEXT }} />
            <p className="text-xs mt-1.5" style={{ color: "#555" }}>
              Stored encrypted. Never shared or logged.
            </p>
          </div>

          {generated && (
            <div className="rounded-xl p-3 space-y-1" style={{ backgroundColor: "#0a1a0a", border: "1px solid #14532d" }}>
              <p className="text-xs font-semibold" style={{ color: "#4ade80" }}>Keypair generated — save your nsec!</p>
              <p className="text-[11px] font-mono break-all" style={{ color: "#888" }}>npub: {generated.npubBech32}</p>
              <p className="text-xs mt-1" style={{ color: "#555" }}>Copy your nsec above and store it somewhere safe before connecting.</p>
            </div>
          )}

          {error && (
            <p className="text-xs rounded-lg px-3 py-2" style={{ backgroundColor: "#1a0a0a", border: "1px solid #3a1a1a", color: "#f87171" }}>
              {error}
            </p>
          )}

          <button type="button" onClick={handleGenerate} disabled={generating}
            className="w-full py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            style={{ backgroundColor: "#1a1a1a", color: "#aaa", border: `1px solid ${BORDER}` }}>
            {generating ? "Generating…" : "Generate a new keypair for me"}
          </button>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ backgroundColor: "#1a1a1a", color: MUTED, border: `1px solid ${BORDER}` }}>
              Cancel
            </button>
            <button type="submit" disabled={connecting || !nsec.trim()}
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
  plan: string;
  maxAccounts: number;
  accountsUsed: number;
  planStatus: string;
  twitterPostsThisMonth: number;
  maxTwitterPostsPerMonth: number | null;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AccountsPage() {
  const { success, error: toastError } = useToast();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [showBlueskyDialog, setShowBlueskyDialog] = useState(false);
  const [showTelegramDialog, setShowTelegramDialog] = useState(false);
  const [showNostrDialog, setShowNostrDialog] = useState(false);
  const [showLemmyDialog, setShowLemmyDialog] = useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState<{ id: string; displayName: string; platform: string } | null>(null);

  // Discord channel picker state
  const [discordGuildId, setDiscordGuildId] = useState<string | null>(null);
  const [discordGuildName, setDiscordGuildName] = useState<string>("");
  const [discordChannels, setDiscordChannels] = useState<{ id: string; name: string }[]>([]);
  const [discordChannelId, setDiscordChannelId] = useState("");
  const [discordConnecting, setDiscordConnecting] = useState(false);

  const [threadsToken, setThreadsToken] = useState("");
  const [connectingThreads, setConnectingThreads] = useState(false);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [showManualToken, setShowManualToken] = useState(false);

  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [platformSearch, setPlatformSearch] = useState("");

  const show = (platform: string) => {
    const q = platformSearch.trim().toLowerCase();
    if (!q) return {};
    const label = (PLATFORM_META[platform]?.label ?? platform).toLowerCase();
    return (platform.includes(q) || label.includes(q)) ? {} : { display: "none" as const };
  };

  const oauthConnected = searchParams.get("connected");
  const oauthError = searchParams.get("error");

  async function fetchAccounts() {
    try {
      const billingEnabled = process.env.NEXT_PUBLIC_ENABLE_BILLING === "true";
      const [accs, status, accountStats] = await Promise.all([
        apiFetch<Account[]>("/accounts"),
        billingEnabled ? apiFetch<PlanStatus>("/billing/status") : Promise.resolve(null),
        apiFetch<Record<string, number>>("/accounts/stats"),
      ]);
      setAccounts(accs);
      setPlanStatus(status);
      setStats(accountStats);
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchAccounts(); }, []);

  // Show OAuth result as toast once (clear param from URL after)
  useEffect(() => {
    if (oauthConnected && !_shownConnectedToasts.has(oauthConnected)) {
      _shownConnectedToasts.add(oauthConnected);
      success(`${oauthConnected.charAt(0).toUpperCase() + oauthConnected.slice(1)} connected successfully!`);
      window.history.replaceState({}, "", "/accounts");
    }
    if (oauthError) {
      toastError(decodeURIComponent(oauthError));
      window.history.replaceState({}, "", "/accounts");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Discord: pick up guild from callback redirect and fetch channels
  useEffect(() => {
    const guildId = searchParams.get("discord_guild_id");
    const guildName = searchParams.get("discord_guild_name") ?? "";
    if (!guildId) return;
    // Always clear the URL params from the address bar immediately.
    window.history.replaceState({}, "", "/accounts");
    // Skip if we've already handled this guild in this browser session
    // (guards against re-appearing when the user navigates away and back).
    if (_handledDiscordGuilds.has(guildId)) return;
    _handledDiscordGuilds.add(guildId);
    setDiscordGuildId(guildId);
    setDiscordGuildName(guildName);
    apiFetch<{ channels: { id: string; name: string }[] }>(`/auth/discord/channels?guild_id=${guildId}`)
      .then(data => setDiscordChannels(data.channels))
      .catch(() => toastError("Failed to load Discord channels"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connectDiscordChannel(e: React.FormEvent) {
    e.preventDefault();
    if (!discordGuildId || !discordChannelId) return;
    const channel = discordChannels.find(c => c.id === discordChannelId);
    if (!channel) return;
    setDiscordConnecting(true);
    try {
      await apiFetch("/auth/discord/connect", {
        method: "POST",
        body: JSON.stringify({ guildId: discordGuildId, guildName: discordGuildName, channelId: channel.id, channelName: channel.name }),
      });
      setDiscordGuildId(null); setDiscordChannels([]); setDiscordChannelId("");
      await fetchAccounts();
      success(`Discord #${channel.name} connected!`);
    } catch (err) { toastError(String(err)); }
    finally { setDiscordConnecting(false); }
  }

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

  async function disconnect(id: string, displayName: string, platform?: string) {
    setDisconnectTarget({ id, displayName, platform: platform ?? "" });
  }

  async function confirmDisconnect() {
    if (!disconnectTarget) return;
    const { id, displayName } = disconnectTarget;
    setDisconnectTarget(null);
    setDisconnecting(id);
    try {
      await apiFetch(`/accounts/${id}`, { method: "DELETE" });
      await fetchAccounts();
      success(`${disconnectTarget?.platform === "nostr" ? displayName : "@" + displayName} disconnected.`);
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
  const mastodonAccounts = accounts.filter((a) => a.platform === "mastodon");
  const pixelfedAccounts = accounts.filter((a) => a.platform === "pixelfed");
  const youtubeAccounts = accounts.filter((a) => a.platform === "youtube");
  const facebookAccounts = accounts.filter((a) => a.platform === "facebook");
  const twitterAccounts   = accounts.filter((a) => a.platform === "twitter");
  const pinterestAccounts = accounts.filter((a) => a.platform === "pinterest");

  // Twitter is Pro & Team only (when billing is enabled)
  const billingEnabled = process.env.NEXT_PUBLIC_ENABLE_BILLING === "true";
  const allowTwitter = !billingEnabled || !planStatus || planStatus.plan === "pro" || planStatus.plan === "team";

  const [showMastodonDialog, setShowMastodonDialog] = useState(false);
  const [showPixelfedDialog, setShowPixelfedDialog] = useState(false);

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
      <div className="flex items-center justify-between pl-16 pr-4 md:px-8 flex-shrink-0"
        style={{ height: 65, borderBottom: `1px solid ${BORDER}`, backgroundColor: SURFACE }}>
        <div className="min-w-0">
          <h1 className="text-lg font-bold" style={{ color: TEXT }}>Accounts</h1>
          <p className="text-xs mt-0.5 truncate hidden sm:block" style={{ color: MUTED }}>Connect the social accounts you want to post to.</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
          style={accounts.length > 0
            ? { backgroundColor: "#052e16", color: "#4ade80", border: "1px solid #14532d" }
            : { backgroundColor: "#1a1a1a", color: MUTED, border: `1px solid ${BORDER}` }}>
          {accounts.length} connected
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">


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

        {/* Platform search */}
        <div className="relative mb-4">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" fill="none" stroke="#666" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Filter platforms…"
            value={platformSearch}
            onChange={(e) => setPlatformSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 transition"
            style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, color: TEXT }}
          />
          {platformSearch && (
            <button onClick={() => setPlatformSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: MUTED }}>✕</button>
          )}
        </div>

        {/* Skeleton grid while loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl overflow-hidden" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}>
                <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <div className="w-9 h-9 rounded-xl" style={{ backgroundColor: "#1e1e1e" }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-20 rounded" style={{ backgroundColor: "#1e1e1e" }} />
                    <div className="h-2.5 w-32 rounded" style={{ backgroundColor: "#1a1a1a" }} />
                  </div>
                  <div className="h-5 w-10 rounded-full" style={{ backgroundColor: "#1e1e1e" }} />
                </div>
                <div className="p-5">
                  <div className="h-9 w-full rounded-xl" style={{ backgroundColor: "#1e1e1e" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* ── Bluesky ── */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, ...show("bluesky") }}>
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
                    <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} postsThisMonth={stats[a.id]} />
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
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, ...show("threads") }}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
                <PlatformIcon platform="threads" size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: TEXT }}>Threads</p>
                <p className="text-xs" style={{ color: MUTED }}>Meta OAuth 2.0</p>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#1c1008", color: "#fb923c", border: "1px solid #7c2d12" }}>Pending Approval</span>
            </div>

            <div className="p-5 space-y-3">
              {!loading && threadsAccounts.length > 0 && (
                <div className="space-y-2">
                  {threadsAccounts.map((a) => (
                    <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} postsThisMonth={stats[a.id]} />
                  ))}
                </div>
              )}
              <button disabled
                className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-xl opacity-40 cursor-not-allowed"
                style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                <PlatformIcon platform="threads" size={16} />
                Connect with Threads
              </button>
              <p className="text-xs" style={{ color: MUTED }}>
                Pending Meta app review · new connections temporarily disabled
              </p>
            </div>
          </div>

          {/* ── Instagram ── */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, ...show("instagram") }}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
                <PlatformIcon platform="instagram" size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: TEXT }}>Instagram</p>
                <p className="text-xs" style={{ color: MUTED }}>Instagram Login · images required</p>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#1c1008", color: "#fb923c", border: "1px solid #7c2d12" }}>Pending Approval</span>
            </div>
            <div className="p-5 space-y-3">
              {!loading && instagramAccounts.length > 0 && (
                <div className="space-y-2">
                  {instagramAccounts.map((a) => (
                    <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} postsThisMonth={stats[a.id]} />
                  ))}
                </div>
              )}
              <button disabled
                className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-xl opacity-40 cursor-not-allowed"
                style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                <PlatformIcon platform="instagram" size={16} />
                Connect Instagram
              </button>
              <p className="text-xs" style={{ color: MUTED }}>
                Pending Meta app review · new connections temporarily disabled
              </p>
            </div>
          </div>

          {/* ── LinkedIn ── */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, ...show("linkedin") }}>
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
                    <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} postsThisMonth={stats[a.id]} />
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
              <p className="text-xs">
                Requires a LinkedIn developer app with w_member_social permission
              </p>
            </div>
          </div>

          {/* ── YouTube ── */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, ...show("youtube") }}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
                <PlatformIcon platform="youtube" size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: TEXT }}>YouTube</p>
                <p className="text-xs" style={{ color: MUTED }}>Google OAuth 2.0 · Videos & Shorts</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {!loading && youtubeAccounts.length > 0 && (
                <div className="space-y-2">
                  {youtubeAccounts.map((a) => (
                    <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} postsThisMonth={stats[a.id]} />
                  ))}
                </div>
              )}
              {connectDisabled ? (
                <button disabled title={limitMsg ?? undefined}
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-xl opacity-40 cursor-not-allowed"
                  style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                  <PlatformIcon platform="youtube" size={16} />
                  {youtubeAccounts.length > 0 ? "Add another YouTube channel" : "Connect YouTube"}
                </button>
              ) : (
                <a href={YOUTUBE_AUTH_URL}
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-xl transition-colors hover:bg-gray-100"
                  style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                  <PlatformIcon platform="youtube" size={16} />
                  {youtubeAccounts.length > 0 ? "Add another YouTube channel" : "Connect YouTube"}
                </a>
              )}
            </div>
          </div>

          {/* ── Facebook Pages ── */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, ...show("facebook") }}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
                <PlatformIcon platform="facebook" size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: TEXT }}>Facebook Pages</p>
                <p className="text-xs" style={{ color: MUTED }}>Post to Facebook Pages you manage</p>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#1c1008", color: "#fb923c", border: "1px solid #7c2d12" }}>Pending Approval</span>
            </div>
            <div className="p-5 space-y-3">
              {!loading && facebookAccounts.length > 0 && (
                <div className="space-y-2">
                  {facebookAccounts.map((a) => (
                    <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} postsThisMonth={stats[a.id]} />
                  ))}
                </div>
              )}
              <button disabled
                className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-xl opacity-40 cursor-not-allowed"
                style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                <PlatformIcon platform="facebook" size={16} />
                Connect Facebook Page
              </button>
              <p className="text-xs" style={{ color: MUTED }}>
                Pending Meta app review · new connections temporarily disabled
              </p>
            </div>
          </div>

          {/* ── Mastodon ── */}
          <div className="rounded-2xl p-5" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, ...show("mastodon") }}>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <PlatformIcon platform="mastodon" size={20} />
                <div>
                  <p className="font-semibold text-sm" style={{ color: TEXT }}>Mastodon</p>
                  <p className="text-xs" style={{ color: MUTED }}>Free & open source, any instance</p>
                </div>
              </div>

              {!loading && mastodonAccounts.length > 0 && (
                <div className="flex flex-col gap-2">
                  {mastodonAccounts.map((a) => (
                    <ConnectedAccountRow key={a.id} account={a}
                      onDisconnect={() => setDisconnectTarget(a)}
                      disconnecting={disconnecting}
                      postsThisMonth={stats[a.id]} />
                  ))}
                </div>
              )}

              <button onClick={() => setShowMastodonDialog(true)} disabled={connectDisabled}
                className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 hover:bg-gray-100"
                style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                <PlatformIcon platform="mastodon" size={16} />
                {mastodonAccounts.length > 0 ? "Add another Mastodon account" : "Connect Mastodon"}
              </button>

              <p className="text-xs">
                Works with any Mastodon instance mastodon.social, fosstodon.org, hachyderm.io, and more
              </p>
            </div>
          </div>

          {/* ── Pixelfed ── */}
          <div className="rounded-2xl p-5" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, ...show("pixelfed") }}>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <PlatformIcon platform="pixelfed" size={20} />
                <div>
                  <p className="font-semibold text-sm" style={{ color: TEXT }}>Pixelfed</p>
                  <p className="text-xs" style={{ color: MUTED }}>Federated photo sharing · ActivityPub</p>
                </div>
              </div>

              {!loading && pixelfedAccounts.length > 0 && (
                <div className="flex flex-col gap-2">
                  {pixelfedAccounts.map((a) => (
                    <ConnectedAccountRow key={a.id} account={a}
                      onDisconnect={() => setDisconnectTarget(a)}
                      disconnecting={disconnecting}
                      postsThisMonth={stats[a.id]} />
                  ))}
                </div>
              )}

              <button onClick={() => setShowPixelfedDialog(true)} disabled={connectDisabled}
                className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 hover:bg-gray-100"
                style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                <PlatformIcon platform="pixelfed" size={16} />
                {pixelfedAccounts.length > 0 ? "Add another Pixelfed account" : "Connect Pixelfed"}
              </button>

              <p className="text-xs" style={{ color: MUTED }}>
                Works with any Pixelfed instance pixelfed.social, gram.social, and more.
              </p>
            </div>
          </div>

          {/* ── Pinterest ── */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, ...show("pinterest") }}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
                <PlatformIcon platform="pinterest" size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: TEXT }}>Pinterest</p>
                <p className="text-xs" style={{ color: MUTED }}>OAuth 2.0 · image required</p>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#1c1008", color: "#fb923c", border: "1px solid #7c2d12" }}>Pending Approval</span>
            </div>
            <div className="p-5 space-y-3">
              {!loading && pinterestAccounts.length > 0 && (
                <div className="space-y-2">
                  {pinterestAccounts.map((a) => (
                    <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} postsThisMonth={stats[a.id]} />
                  ))}
                </div>
              )}
              <button disabled
                className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-xl opacity-40 cursor-not-allowed"
                style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                <PlatformIcon platform="pinterest" size={16} />
                Connect Pinterest
              </button>
              <p className="text-xs" style={{ color: MUTED }}>
                Awaiting Pinterest Standard access approval · coming soon
              </p>
            </div>
          </div>

          {/* ── Telegram ── */}
          {(() => {
            const telegramAccounts = accounts.filter(a => a.platform === "telegram");
            return (
              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, ...show("telegram") }}>
                <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
                    <PlatformIcon platform="telegram" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm" style={{ color: TEXT }}>Telegram</p>
                    <p className="text-xs" style={{ color: MUTED }}>Bot API · channel broadcasting</p>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "#052e16", color: "#4ade80", border: "1px solid #14532d" }}>Live</span>
                </div>
                <div className="p-5 space-y-3">
                  {!loading && telegramAccounts.length > 0 && (
                    <div className="space-y-2">
                      {telegramAccounts.map((a) => (
                        <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} postsThisMonth={stats[a.id]} />
                      ))}
                    </div>
                  )}
                  {connectDisabled ? (
                    <button disabled title={limitMsg ?? undefined}
                      className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-xl opacity-40 cursor-not-allowed"
                      style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                      <PlatformIcon platform="telegram" size={16} />
                      {telegramAccounts.length > 0 ? "Add another channel" : "Connect Telegram Channel"}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowTelegramDialog(true)}
                      className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-xl transition-colors hover:bg-gray-100"
                      style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                      <PlatformIcon platform="telegram" size={16} />
                      {telegramAccounts.length > 0 ? "Add another channel" : "Connect Telegram Channel"}
                    </button>
                  )}
                  <p className="text-xs" style={{ color: MUTED }}>
                    Post to Telegram channels · text, images, and video
                  </p>
                </div>
              </div>
            );
          })()}

          {/* ── Nostr ── */}
          {(() => {
            const nostrAccounts = accounts.filter(a => a.platform === "nostr");
            return (
              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, ...show("nostr") }}>
                <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
                    <PlatformIcon platform="nostr" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm" style={{ color: TEXT }}>Nostr</p>
                    <p className="text-xs" style={{ color: MUTED }}>Keypair · decentralized · no approval</p>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "#052e16", color: "#4ade80", border: "1px solid #14532d" }}>Live</span>
                </div>
                <div className="p-5 space-y-3">
                  {!loading && nostrAccounts.length > 0 && (
                    <div className="space-y-2">
                      {nostrAccounts.map((a) => (
                        <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} postsThisMonth={stats[a.id]}
                          onAvatarRefreshed={(id, avatarUrl) => setAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, avatarUrl } : acc))} />
                      ))}
                    </div>
                  )}
                  {connectDisabled ? (
                    <button disabled title={limitMsg ?? undefined}
                      className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-xl opacity-40 cursor-not-allowed"
                      style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                      <PlatformIcon platform="nostr" size={16} />
                      {nostrAccounts.length > 0 ? "Add another Nostr key" : "Connect Nostr"}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowNostrDialog(true)}
                      className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-xl transition-colors hover:bg-gray-100"
                      style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                      <PlatformIcon platform="nostr" size={16} />
                      {nostrAccounts.length > 0 ? "Add another Nostr key" : "Connect Nostr"}
                    </button>
                  )}
                  <p className="text-xs" style={{ color: MUTED }}>
                    Post to Nostr relays · text and images · no app review needed
                  </p>
                </div>
              </div>
            );
          })()}

          {/* ── X / Twitter ── */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, ...show("twitter") }}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
                <PlatformIcon platform="twitter" size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: TEXT }}>X (Twitter)</p>
                <p className="text-xs" style={{ color: MUTED }}>OAuth 1.0a · up to 4 images</p>
              </div>
              {!allowTwitter ? (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#1c1209", color: "#fbbf24", border: "1px solid #78560a" }}>Pro</span>
              ) : (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#052e16", color: "#4ade80", border: "1px solid #14532d" }}>Live</span>
              )}
            </div>
            <div className="p-5 space-y-3">
              {!loading && twitterAccounts.length > 0 && (
                <div className="space-y-2">
                  {twitterAccounts.map((a) => (
                    <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} postsThisMonth={stats[a.id]} />
                  ))}
                </div>
              )}
              {!allowTwitter ? (
                <div>
                  <div className="w-full py-2.5 text-sm font-semibold rounded-xl text-center opacity-50 cursor-not-allowed"
                    style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                    Connect X (Twitter)
                  </div>
                  <p className="text-xs mt-2 text-center" style={{ color: MUTED }}>
                    X/Twitter posting is available on{" "}
                    <a href="/billing" className="underline hover:opacity-80" style={{ color: "#fbbf24" }}>Pro and Team plans</a>.
                  </p>
                </div>
              ) : connectDisabled ? (
                <button disabled title={limitMsg ?? undefined}
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-xl opacity-40 cursor-not-allowed"
                  style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                  <PlatformIcon platform="twitter" size={16} />
                  {twitterAccounts.length > 0 ? "Add another X account" : "Connect X (Twitter)"}
                </button>
              ) : (
                <a href={TWITTER_AUTH_URL}
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-xl transition-colors hover:bg-gray-100"
                  style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                  <PlatformIcon platform="twitter" size={16} />
                  {twitterAccounts.length > 0 ? "Add another X account" : "Connect X (Twitter)"}
                </a>
              )}
              {allowTwitter && planStatus && planStatus.maxTwitterPostsPerMonth && planStatus.maxTwitterPostsPerMonth > 0 ? (() => {
                const used = planStatus.twitterPostsThisMonth;
                const max = planStatus.maxTwitterPostsPerMonth;
                const remaining = Math.max(0, max - used);
                const pct = Math.min(100, (used / max) * 100);
                const color = remaining === 0 ? "#ef4444" : remaining <= 20 ? "#f59e0b" : "#4ade80";
                return (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs" style={{ color: MUTED }}>X quota this month</span>
                      <span className="text-xs font-semibold" style={{ color }}>{remaining} / {max} remaining</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 999, background: "#1e1e1e" }}>
                      <div style={{ height: 4, borderRadius: 999, background: color, width: `${pct}%`, transition: "width .3s" }} />
                    </div>
                    <p className="text-xs mt-1" style={{ color: MUTED }}>Resets on the 1st of each month</p>
                  </div>
                );
              })() : (
                <p className="text-xs" style={{ color: MUTED }}>
                  100 tweets/month per account on Pro and Team plans
                </p>
              )}
            </div>
          </div>

          {/* ── Discord ── */}
          {(() => {
            const discordAccounts = accounts.filter(a => a.platform === "discord");
            return (
              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, ...show("discord") }}>
                <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
                    <PlatformIcon platform="discord" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm" style={{ color: TEXT }}>Discord</p>
                    <p className="text-xs" style={{ color: MUTED }}>OAuth + Bot · server channels</p>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "#052e16", color: "#4ade80", border: "1px solid #14532d" }}>Live</span>
                </div>
                <div className="p-5 space-y-3">
                  {!loading && discordAccounts.length > 0 && (
                    <div className="space-y-2">
                      {discordAccounts.map((a) => (
                        <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} postsThisMonth={stats[a.id]} />
                      ))}
                    </div>
                  )}
                  {connectDisabled ? (
                    <button disabled title={limitMsg ?? undefined}
                      className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-xl opacity-40 cursor-not-allowed"
                      style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                      <PlatformIcon platform="discord" size={16} />
                      {discordAccounts.length > 0 ? "Add another channel" : "Connect Discord"}
                    </button>
                  ) : (
                    <a href={DISCORD_AUTH_URL}
                      className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-xl transition-colors hover:bg-gray-100"
                      style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                      <PlatformIcon platform="discord" size={16} />
                      {discordAccounts.length > 0 ? "Add another channel" : "Connect Discord"}
                    </a>
                  )}
                  <p className="text-xs" style={{ color: MUTED }}>
                    Post to Discord channels · text, images, and video
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Tumblr */}
          {(() => {
            const tumblrAccounts = accounts.filter(a => a.platform === "tumblr");
            return (
              <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, ...show("tumblr") }}>
                <div className="flex items-center gap-3">
                  <PlatformIcon platform="tumblr" size={28} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: TEXT }}>Tumblr</p>
                    <p className="text-xs" style={{ color: MUTED }}>Blog posts · text and images</p>
                  </div>
                </div>
                {tumblrAccounts.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {tumblrAccounts.map(a => (
                      <div key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: "#0d0d0d", border: `1px solid ${BORDER}` }}>
                        {a.avatarUrl
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={a.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                          : <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: "#35465c", color: "#fff" }}>{a.displayName[0]?.toUpperCase()}</div>}
                        <span className="text-xs flex-1 truncate" style={{ color: TEXT }}>{a.displayName}</span>
                        <button onClick={() => setDisconnectTarget({ id: a.id, displayName: a.displayName, platform: "tumblr" })}
                          className="text-xs font-medium px-2 py-1 rounded-lg transition-colors hover:text-red-400"
                          style={{ color: MUTED }}>Disconnect</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <a href={TUMBLR_AUTH_URL}
                    className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-xl transition-colors hover:bg-gray-100"
                    style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                    <PlatformIcon platform="tumblr" size={16} />
                    {tumblrAccounts.length > 0 ? "Add another blog" : "Connect Tumblr"}
                  </a>
                  <p className="text-xs" style={{ color: MUTED }}>
                    Posts to your primary Tumblr blog · text and images
                  </p>
                </div>
              </div>
            );
          })()}

          {/* ── Lemmy ── */}
          {(() => {
            const lemmyAccounts = accounts.filter(a => a.platform === "lemmy");
            return (
              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, ...show("lemmy") }}>
                <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
                    <PlatformIcon platform="lemmy" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm" style={{ color: TEXT }}>Lemmy</p>
                    <p className="text-xs" style={{ color: MUTED }}>Federated · any instance · community posts</p>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  {!loading && lemmyAccounts.length > 0 && (
                    <div className="space-y-2">
                      {lemmyAccounts.map((a) => (
                        <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} postsThisMonth={stats[a.id]} />
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setShowLemmyDialog(true)}
                    className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-xl transition-colors hover:bg-gray-100"
                    style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                    <PlatformIcon platform="lemmy" size={16} />
                    {lemmyAccounts.length > 0 ? "Add another community" : "Connect Lemmy"}
                  </button>
                  <p className="text-xs" style={{ color: MUTED }}>
                    Post title from first line · body from remaining text · image support
                  </p>
                </div>
              </div>
            );
          })()}

        </div>}
      </div>

      {showTelegramDialog && <TelegramDialog onClose={() => setShowTelegramDialog(false)} onConnected={() => { fetchAccounts(); success("Telegram channel connected!"); }} />}
      {showPixelfedDialog && <PixelfedDialog onClose={() => setShowPixelfedDialog(false)} />}
      {showMastodonDialog && <MastodonDialog onClose={() => setShowMastodonDialog(false)} />}
      {showNostrDialog && <NostrDialog onClose={() => setShowNostrDialog(false)} onConnected={() => { fetchAccounts(); success("Nostr account connected!"); }} />}
      {showLemmyDialog && <LemmyDialog onClose={() => setShowLemmyDialog(false)} onConnected={() => { fetchAccounts(); success("Lemmy community connected!"); }} />}

      {/* Discord channel picker — shown after OAuth redirect */}
      {discordGuildId && discordChannels.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onMouseDown={e => e.stopPropagation()}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
            <div className="flex items-center gap-2 mb-4">
              <PlatformIcon platform="discord" size={20} />
              <h2 className="text-base font-bold" style={{ color: "#ededed" }}>Pick a channel</h2>
            </div>
            <p className="text-sm mb-4" style={{ color: "#888" }}>
              Bot added to <span style={{ color: "#ededed" }}>{discordGuildName}</span>. Choose which channel to post to.
            </p>
            <form onSubmit={connectDiscordChannel} className="space-y-4">
              <select
                value={discordChannelId}
                onChange={e => setDiscordChannelId(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl text-sm"
                style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#ededed" }}>
                <option value="">Select a channel…</option>
                {discordChannels.map(c => (
                  <option key={c.id} value={c.id}>#{c.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button type="submit" disabled={!discordChannelId || discordConnecting}
                  className="w-full py-2.5 text-sm font-semibold rounded-xl disabled:opacity-50"
                  style={{ backgroundColor: "#5865F2", color: "#fff" }}>
                  {discordConnecting ? "Connecting…" : "Connect"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disconnect confirm dialog */}
      {disconnectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={e => { if (e.target === e.currentTarget) setDisconnectTarget(null); }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
            <h2 className="text-base font-bold mb-1" style={{ color: "#ededed" }}>Disconnect account?</h2>
            <p className="text-sm mb-5" style={{ color: "#888" }}>
              <span style={{ color: "#ededed" }}>
                {disconnectTarget.platform === "nostr"
                  ? disconnectTarget.displayName
                  : `@${disconnectTarget.displayName}`}
              </span>{" "}will be removed.
              Already-scheduled posts won&apos;t be affected.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDisconnectTarget(null)}
                className="flex-1 text-sm font-semibold py-2 rounded-xl"
                style={{ backgroundColor: "#1a1a1a", color: "#ededed", border: "1px solid #2a2a2a" }}>
                Cancel
              </button>
              <button onClick={confirmDisconnect}
                className="flex-1 text-sm font-semibold py-2 rounded-xl transition-opacity hover:opacity-80"
                style={{ backgroundColor: "#7f1d1d", color: "#fca5a5" }}>
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
