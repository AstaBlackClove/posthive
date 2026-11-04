"use client";

import { PasswordInput } from "../../components/PasswordInput";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { cn } from "../../lib/cn";
import { PlatformIcon } from "../../components/PlatformIcon";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../context/AuthContext";

// Module-level sets persist across re-mounts — prevents duplicate toasts/modals on navigation.
const _handledDiscordGuilds = new Set<string>();
const _shownConnectedToasts = new Set<string>();

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
const TIKTOK_AUTH_URL    = `${API_BASE}/auth/tiktok`;

interface Account {
  id: string;
  platform: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  expiresAt: string | null;
  npub?: string; // Nostr only — public key in bech32, safe to expose
  shortLivedFallback?: boolean; // Instagram only — long-lived exchange failed (Meta bug); token expires in ~1h
}

const PLATFORM_META: Record<string, { label: string; brand: string }> = {
  bluesky:   { label: "Bluesky",   brand: "#0085ff" },
  threads:   { label: "Threads",   brand: "#000000" },
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
  tumblr:         { label: "Tumblr",                brand: "#35465c" },
  lemmy:          { label: "Lemmy",                 brand: "#ff6314" },
  googlebusiness: { label: "Google Business",       brand: "#4285f4" },
  tiktok:         { label: "TikTok",                brand: "#010101" },
};

function NostrFallbackAvatar() {
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-surface">
      <PlatformIcon platform="nostr" size={40} />
    </div>
  );
}

function Avatar({ account }: { account: Account }) {
  const [imgError, setImgError] = useState(false);
  const meta = PLATFORM_META[account.platform];

  // Reset error state when avatarUrl changes (e.g. after profile refresh)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setImgError(false); }, [account.avatarUrl]);

  if (account.avatarUrl && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={account.avatarUrl} alt={account.displayName}
        className="w-10 h-10 rounded-full object-cover ring-2 ring-surface"
        onError={() => setImgError(true)} />
    );
  }
  if (account.platform === "nostr") return <NostrFallbackAvatar />;
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center type-body-sb-s text-white bg-(--pc)"
      style={{ "--pc": meta?.brand ?? "var(--color-neutral-500)" } as React.CSSProperties}>
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
  tiktok:    `${API_BASE}/auth/tiktok`,
};

// Platforms where the token refresh cron handles silent renewal — no user action needed
const AUTO_REFRESH_PLATFORMS = new Set(["threads", "instagram", "facebook", "youtube", "tiktok"]);

// Flip to true once TikTok app review is approved
const TIKTOK_REVIEW_PENDING = false;

function tokenStatus(platform: string, expiresAt: string | null): "ok" | "soon" | "expired" {
  if (!expiresAt || AUTO_REFRESH_PLATFORMS.has(platform)) return "ok";
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expired";
  if (ms < 7 * 24 * 60 * 60 * 1000) return "soon";
  return "ok";
}

const PROFILE_REFRESH_PLATFORMS = new Set(["bluesky", "threads", "instagram", "linkedin", "mastodon", "pixelfed", "pinterest", "facebook"]);

function ConnectedAccountRow({ account, onDisconnect, disconnecting, postsThisMonth, onAvatarRefreshed, onRefreshed, isAdmin }: {
  account: Account;
  onDisconnect: (id: string, name: string, platform?: string) => void;
  disconnecting: string | null;
  postsThisMonth?: number;
  onAvatarRefreshed?: (id: string, avatarUrl: string | null) => void;
  onRefreshed?: (id: string, displayName: string, avatarUrl: string | null) => void;
  isAdmin?: boolean;
}) {
  const [refreshing, setRefreshing] = useState(false);
  // Short-lived fallback tokens bypass the normal auto-refresh path
  const isShortLived = account.shortLivedFallback === true;
  const shortLivedExpired = isShortLived && account.expiresAt != null && new Date(account.expiresAt).getTime() < Date.now();
  const status = isShortLived
    ? (shortLivedExpired ? "expired" : "soon")
    : tokenStatus(account.platform, account.expiresAt);
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

  async function refreshProfile() {
    setRefreshing(true);
    try {
      const updated = await apiFetch<Account>(`/accounts/${account.id}/refresh`, { method: "POST" });
      onRefreshed?.(account.id, updated.displayName, updated.avatarUrl);
    } catch { /* silent */ }
    finally { setRefreshing(false); }
  }

  return (
    <div className={cn(
      "rounded-xl overflow-hidden border bg-bg",
      status === "expired" ? "border-red-200" : status === "soon" ? "border-brand-400" : "border-border",
    )}>
      <div className="flex items-center gap-3 p-3">
        <Avatar account={account} />
        <div className="flex-1 min-w-0">
          <p className="type-body-sb-s truncate text-fg">
            {account.platform === "threads" ? "@" : ""}{account.displayName}
          </p>
          <p className="type-body-r-xs flex items-center gap-1.5 flex-wrap text-muted">
            Connected {new Date(account.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
            {postsThisMonth !== undefined && postsThisMonth > 0 && (
              <span className="px-1.5 py-0.5 rounded-full border border-green-200 bg-green-50 type-body-sb-xxs text-green-700">
                {postsThisMonth} post{postsThisMonth !== 1 ? "s" : ""} this month
              </span>
            )}
            {account.platform === "nostr" && (
              <>
                <a
                  href={`https://primal.net/p/${account.npub ?? account.displayName}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-[#7B5EA7] transition-opacity hover:opacity-80">
                  View on Primal ↗
                </a>
                <button
                  onClick={refreshNostrAvatar}
                  disabled={refreshing}
                  className="text-muted transition-opacity hover:opacity-80 disabled:opacity-40">
                  {refreshing ? "Refreshing…" : "Refresh photo"}
                </button>
              </>
            )}
          </p>
        </div>
        {PROFILE_REFRESH_PLATFORMS.has(account.platform) && (
          <button
            onClick={refreshProfile}
            disabled={refreshing}
            title="Refresh profile name and photo"
            className="type-body-m-s text-muted transition-colors disabled:opacity-50 px-2.5 py-1.5 rounded-lg hover:opacity-80">
            {refreshing ? "…" : "↻"}
          </button>
        )}
        <button
          onClick={() => onDisconnect(account.id, account.displayName, account.platform)}
          disabled={disconnecting === account.id || isAdmin === false}
          title={isAdmin === false ? "Only workspace admins can disconnect accounts" : undefined}
          className="type-body-m-xs text-muted transition-colors disabled:opacity-50 px-2 py-1 rounded-lg hover:text-red-600">
          {disconnecting === account.id ? "…" : "Disconnect"}
        </button>
      </div>
      {status !== "ok" && reconnectUrl && (
        <div className={cn(
          "flex items-center justify-between gap-2 px-3 py-2 border-t",
          status === "expired" ? "border-red-200 bg-red-50" : "border-brand-400 bg-brand-100",
        )}>
          <p className={cn("type-body-r-xs", status === "expired" ? "text-red-600" : "text-brand-800")}>
            {status === "expired"
              ? (isShortLived ? "Instagram token expired — please reconnect to continue posting" : "Token expired — posts will fail")
              : (isShortLived ? "Instagram token expires in ~1 hour (Meta limitation) — reconnect to get a long-lived token" : "Token expires soon — reconnect to avoid interruption")}
          </p>
          <a href={reconnectUrl}
            className={cn(
              "type-body-sb-xs px-2.5 py-1 rounded-lg shrink-0 transition-opacity hover:opacity-80",
              status === "expired" ? "bg-red-500 text-white" : "bg-accent text-accent-fg",
            )}>
            Reconnect
          </a>
        </div>
      )}
    </div>
  );
}

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
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card w-full max-w-md p-6 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center">
              <PlatformIcon platform="bluesky" size={18} />
            </div>
            <div>
              <p className="type-body-sb-s text-fg">Connect Bluesky</p>
              <p className="type-body-r-xs text-muted">App password · no OAuth needed</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-neutral-100 hover:text-fg">
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
            className="field" />
          <div>
            <PasswordInput
              autoComplete="off"
              aria-label="App password"
              placeholder="App password"
              value={appPassword} onChange={(e) => setAppPassword(e.target.value)}
              required />
            <p className="type-body-r-xs mt-1.5 text-muted">
              bsky.app → Settings → App Passwords → Add App Password
            </p>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 type-body-r-xs text-red-600">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={connecting}
              className="btn-primary flex-1">
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
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card w-full max-w-md p-6 shadow-2xl">

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center">
              <PlatformIcon platform="telegram" size={18} />
            </div>
            <div>
              <p className="type-body-sb-s text-fg">Connect Telegram Channel</p>
              <p className="type-body-r-xs text-muted">Bot token · no OAuth needed</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-neutral-100 hover:text-fg">
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
              className="field" />
            <p className="type-body-r-xs mt-1.5 text-muted">
              Create a bot via @BotFather on Telegram, then add it as admin to your channel
            </p>
          </div>
          <div>
            <input
              placeholder="Channel — e.g. @mychannel or -100123456789"
              value={chatId} onChange={(e) => setChatId(e.target.value)}
              required
              className="field" />
            <p className="type-body-r-xs mt-1.5 text-muted">
              Use the channel username (@mychannel) or numeric chat ID
            </p>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 type-body-r-xs text-red-600">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={connecting}
              className="btn-primary flex-1">
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
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card w-full max-w-md p-6 shadow-2xl">

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center">
              <PlatformIcon platform="lemmy" size={18} />
            </div>
            <div>
              <p className="type-body-sb-s text-fg">Connect Lemmy</p>
              <p className="type-body-r-xs text-muted">Username + password · any instance</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-neutral-100 hover:text-fg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1.5 block type-body-m-xs text-muted">Instance URL</label>
            <input
              placeholder="https://lemmy.world"
              value={instanceUrl} onChange={(e) => setInstanceUrl(e.target.value)}
              required autoFocus
              className="field" />
            <p className="type-body-r-xs mt-1.5 text-neutral-500">Any Lemmy instance - lemmy.world, lemmy.ml, beehaw.org, etc.</p>
          </div>
          <div>
            <label className="mb-1.5 block type-body-m-xs text-muted">Username</label>
            <input
              placeholder="your_username"
              value={username} onChange={(e) => setUsername(e.target.value)}
              required
              className="field" />
          </div>
          <div>
            <label htmlFor="lemmy-password" className="mb-1.5 block type-body-m-xs text-muted">Password</label>
            <PasswordInput
              id="lemmy-password"
              autoComplete="off"
              placeholder="your password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              required />
          </div>
          <div>
            <label className="mb-1.5 block type-body-m-xs text-muted">Community to post to</label>
            <input
              placeholder="selfhosted@lemmy.world"
              value={community} onChange={(e) => setCommunity(e.target.value)}
              required
              className="field" />
            <p className="type-body-r-xs mt-1.5 text-muted">Format: communityname@instance.url</p>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 type-body-r-xs text-red-600">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={connecting}
              className="btn-primary flex-1">
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
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center">
              <PlatformIcon platform="pixelfed" size={18} />
            </div>
            <div>
              <p className="type-body-sb-s text-fg">Connect Pixelfed</p>
              <p className="type-body-r-xs text-muted">Any instance supported</p>
            </div>
          </div>
          <button onClick={onClose} className="type-body-r-l text-muted">✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block type-body-m-xs text-muted">Your Pixelfed instance</label>
            <input
              value={instance}
              onChange={e => setInstance(e.target.value)}
              onKeyDown={e => e.key === "Enter" && instance.trim() && connect()}
              placeholder="pixelfed.social"
              autoFocus
              className="field"
            />
            <p className="type-body-r-xs mt-1.5 text-neutral-500">
              e.g. pixelfed.social · gram.social · pixelfed.au
            </p>
          </div>
          <button onClick={connect} disabled={!instance.trim()}
            className="btn-primary w-full">
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
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card w-full max-w-md p-6 shadow-2xl">

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center">
              <PlatformIcon platform="mastodon" size={18} />
            </div>
            <div>
              <p className="type-body-sb-s text-fg">Connect Mastodon</p>
              <p className="type-body-r-xs text-muted">Any instance supported</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-neutral-100 hover:text-fg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block type-body-m-xs text-muted">Your Mastodon instance</label>
            <input
              value={instance}
              onChange={e => setInstance(e.target.value)}
              onKeyDown={e => e.key === "Enter" && instance.trim() && connect()}
              placeholder="mastodon.social"
              autoFocus
              className="field"
            />
            <p className="type-body-r-xs mt-1.5 text-neutral-500">
              e.g. mastodon.social · fosstodon.org · hachyderm.io
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="btn-secondary flex-1">
              Cancel
            </button>
            <button onClick={connect} disabled={!instance.trim()}
              className="btn-primary flex-1">
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
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card w-full max-w-md p-6 shadow-2xl">

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center">
              <PlatformIcon platform="nostr" size={18} />
            </div>
            <div>
              <p className="type-body-sb-s text-fg">Connect Nostr</p>
              <p className="type-body-r-xs text-muted">Keypair · no OAuth, no approval</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-neutral-100 hover:text-fg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1.5 block type-body-m-xs text-muted">Private key (nsec)</label>
            <input
              placeholder="nsec1… or 64-char hex"
              value={nsec} onChange={(e) => setNsec(e.target.value)}
              required autoFocus
              className="field font-mono" />
            <p className="type-body-r-xs mt-1.5 text-neutral-500">
              Stored encrypted. Never shared or logged.
            </p>
          </div>

          {generated && (
            <div className="rounded-xl p-3 space-y-1 border border-green-200 bg-green-50">
              <p className="type-body-sb-xs text-green-700">Keypair generated — save your nsec!</p>
              <p className="type-mono-r-xs break-all text-muted">npub: {generated.npubBech32}</p>
              <p className="type-body-r-xs mt-1 text-muted">Copy your nsec above and store it somewhere safe before connecting.</p>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 type-body-r-xs text-red-600">
              {error}
            </p>
          )}

          <button type="button" onClick={handleGenerate} disabled={generating}
            className="btn-secondary w-full type-body-sb-xs text-muted">
            {generating ? "Generating…" : "Generate a new keypair for me"}
          </button>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={connecting || !nsec.trim()}
              className="btn-primary flex-1">
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
  const { user } = useAuth();
  const isAdmin = !user || user.role === "owner" || user.role === "admin";
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

  // Class that hides a platform card when it does not match the search
  const show = (platform: string) => {
    const q = platformSearch.trim().toLowerCase();
    if (!q) return "";
    const label = (PLATFORM_META[platform]?.label ?? platform).toLowerCase();
    return (platform.includes(q) || label.includes(q)) ? "" : "hidden";
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
      window.dispatchEvent(new CustomEvent("ph:account-connected"));
      window.history.replaceState({}, "", "/accounts");
    }
    if (oauthError) {
      const raw = decodeURIComponent(oauthError);
      const FRIENDLY: Record<string, string> = {
        instagram_personal_account: "Instagram personal accounts are not supported. Go to Instagram → Settings → Account → Switch to Professional Account (Creator or Business), then try again.",
        token_exchange_failed: "Connection failed. Please try again.",
        "User is not an Instagram Business Account": "Instagram requires a Creator or Professional account. Go to Instagram → Settings → Account → Switch to Professional Account, then try again.",
        "Invalid OAuth access token": "Connection expired or was revoked. Please try connecting again.",
      };
      const msg = FRIENDLY[raw] ?? (
        raw.toLowerCase().includes("business") || raw.toLowerCase().includes("professional") || raw.toLowerCase().includes("creator")
          ? `Instagram requires a Creator or Professional account. ${raw}`
          : raw
      );
      toastError(msg);
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

  function handleRefreshed(id: string, displayName: string, avatarUrl: string | null) {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, displayName, avatarUrl } : a));
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
  const tiktokAccounts    = accounts.filter((a) => a.platform === "tiktok");

  // Twitter is Pro & Team only (when billing is enabled)
  const billingEnabled = process.env.NEXT_PUBLIC_ENABLE_BILLING === "true";
  const allowTwitter = !billingEnabled || !planStatus || planStatus.plan === "pro" || planStatus.plan === "team";

  const [showMastodonDialog, setShowMastodonDialog] = useState(false);
  const [showPixelfedDialog, setShowPixelfedDialog] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  const isCancelled = planStatus?.planStatus === "cancelled";
  const atLimit = planStatus !== null && !isCancelled && accounts.length >= planStatus.maxAccounts;
  const connectDisabled = !isAdmin || isCancelled || atLimit;
  const limitMsg = !isAdmin
    ? "Only workspace admins can connect accounts."
    : isCancelled
    ? "Your subscription is cancelled. Resubscribe to connect new accounts."
    : atLimit
    ? `You've reached your ${planStatus!.maxAccounts}-account limit. Disconnect an account or upgrade your plan.`
    : null;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg">

      {showBlueskyDialog && (
        <BlueskyDialog
          onClose={() => setShowBlueskyDialog(false)}
          onConnected={onBlueskyConnected}
        />
      )}

      {/* Top bar */}
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="type-body-sb-l text-fg">Accounts</h1>
          <p className="type-body-r-xs mt-0.5 truncate hidden sm:block text-muted">Connect the social accounts you want to post to.</p>
        </div>
        <span className={cn(
          "type-body-sb-xs px-2.5 py-1 rounded-full shrink-0 border",
          accounts.length > 0 ? "border-green-200 bg-green-50 text-green-700" : "border-border bg-bg text-muted",
        )}>
          {accounts.length} connected
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">


        {isCancelled && (
          <div className="mb-5 flex items-center gap-3 type-body-r-s rounded-xl px-4 py-3 border border-red-200 bg-red-50">
            <svg className="w-4 h-4 shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <span className="text-red-600">
              Subscription cancelled — connecting new accounts is disabled.{" "}
              <a href="/billing" className="underline font-semibold hover:opacity-80">Resubscribe</a> to continue.
            </span>
          </div>
        )}

        {!isCancelled && atLimit && (
          <div className="mb-5 flex items-center justify-between gap-4 type-body-r-s rounded-xl px-4 py-3 border border-brand-400 bg-brand-100">
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 shrink-0 text-brand-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-brand-800">
                Account limit reached ({accounts.length}/{planStatus!.maxAccounts}). Disconnect one or{" "}
                <a href="/billing" className="underline font-semibold hover:opacity-80">upgrade your plan</a>.
              </span>
            </div>
          </div>
        )}

        {/* Platform search */}
        <div className="relative mb-4">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Filter platforms…"
            value={platformSearch}
            onChange={(e) => setPlatformSearch(e.target.value)}
            className="field bg-surface pl-9 pr-4"
          />
          {platformSearch && (
            <button onClick={() => setPlatformSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 type-body-r-s text-muted">✕</button>
          )}
        </div>

        {/* Skeleton grid while loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                  <div className="w-9 h-9 rounded-xl bg-neutral-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-20 rounded-sm bg-neutral-100" />
                    <div className="h-2.5 w-32 rounded-sm bg-neutral-100/60" />
                  </div>
                  <div className="h-5 w-10 rounded-full bg-neutral-100" />
                </div>
                <div className="p-5">
                  <div className="h-9 w-full rounded-xl bg-neutral-100" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && <div className="masonry-accounts">

          {/* ── Bluesky ── */}
          <div className={cn("card overflow-hidden", show("bluesky"))}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                <PlatformIcon platform="bluesky" size={20} />
              </div>
              <div className="flex-1">
                <p className="type-body-sb-s text-fg">Bluesky</p>
                <p className="type-body-r-xs text-muted">App password · no OAuth needed</p>
              </div>
              <span className="type-body-sb-xs px-2 py-0.5 rounded-full border border-green-200 bg-green-50 text-green-700">Live</span>
            </div>

            <div className="p-5 space-y-3">
              {!loading && blueskyAccounts.length > 0 && (
                <div className="space-y-2">
                  {blueskyAccounts.map((a) => (
                    <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} postsThisMonth={stats[a.id]} onRefreshed={handleRefreshed} isAdmin={isAdmin} />
                  ))}
                </div>
              )}
              <button
                onClick={() => setShowBlueskyDialog(true)}
                disabled={connectDisabled}
                title={connectDisabled ? (limitMsg ?? undefined) : undefined}
                className="btn-primary w-full py-2.5">
                <PlatformIcon platform="bluesky" size={16} />
                {blueskyAccounts.length > 0 ? "Add another Bluesky account" : "Connect Bluesky"}
              </button>
            </div>
          </div>

          {/* ── Threads ── */}
          <div className={cn("card overflow-hidden", show("threads"))}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                <PlatformIcon platform="threads" size={20} />
              </div>
              <div className="flex-1">
                <p className="type-body-sb-s text-fg">Threads</p>
                <p className="type-body-r-xs text-muted">Meta OAuth 2.0</p>
              </div>
              <span className="type-body-sb-xs px-2 py-0.5 rounded-full border border-green-200 bg-green-50 text-green-700">Live</span>
            </div>

            <div className="p-5 space-y-3">
              {!loading && threadsAccounts.length > 0 && (
                <div className="space-y-2">
                  {threadsAccounts.map((a) => (
                    <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} postsThisMonth={stats[a.id]} onRefreshed={handleRefreshed} isAdmin={isAdmin} />
                  ))}
                </div>
              )}
              {connectDisabled ? (
                <button disabled title={limitMsg ?? undefined}
                  className="btn-primary w-full py-2.5">
                  <PlatformIcon platform="threads" size={16} />
                  {threadsAccounts.length > 0 ? "Add another Threads account" : "Connect with Threads"}
                </button>
              ) : (
                <button
                  onClick={() => { setConnectingPlatform("threads"); window.location.href = THREADS_AUTH_URL; }}
                  disabled={connectingPlatform === "threads"}
                  className="btn-primary w-full py-2.5">
                  {connectingPlatform === "threads" ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <PlatformIcon platform="threads" size={16} />}
                  {connectingPlatform === "threads" ? "Connecting…" : threadsAccounts.length > 0 ? "Add another Threads account" : "Connect with Threads"}
                </button>
              )}
            </div>
          </div>

          {/* ── Instagram ── */}
          <div className={cn("card overflow-hidden", show("instagram"))}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                <PlatformIcon platform="instagram" size={20} />
              </div>
              <div className="flex-1">
                <p className="type-body-sb-s text-fg">Instagram</p>
                <p className="type-body-r-xs text-muted">Requires a Creator or Professional account · images required</p>
              </div>
              <span className="type-body-sb-xs px-2 py-0.5 rounded-full border border-green-200 bg-green-50 text-green-700">Live</span>
            </div>
            <div className="p-5 space-y-3">
              {!loading && instagramAccounts.length > 0 && (
                <div className="space-y-2">
                  {instagramAccounts.map((a) => (
                    <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} postsThisMonth={stats[a.id]} onRefreshed={handleRefreshed} isAdmin={isAdmin} />
                  ))}
                </div>
              )}
              {connectDisabled ? (
                <button disabled title={limitMsg ?? undefined}
                  className="btn-primary w-full py-2.5">
                  <PlatformIcon platform="instagram" size={16} />
                  {instagramAccounts.length > 0 ? "Add another Instagram account" : "Connect Instagram"}
                </button>
              ) : (
                <button
                  onClick={() => { setConnectingPlatform("instagram"); window.location.href = INSTAGRAM_AUTH_URL; }}
                  disabled={connectingPlatform === "instagram"}
                  className="btn-primary w-full py-2.5">
                  {connectingPlatform === "instagram" ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <PlatformIcon platform="instagram" size={16} />}
                  {connectingPlatform === "instagram" ? "Connecting…" : instagramAccounts.length > 0 ? "Add another Instagram account" : "Connect Instagram"}
                </button>
              )}
            </div>
          </div>

          {/* ── LinkedIn ── */}
          <div className={cn("card overflow-hidden", show("linkedin"))}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                <PlatformIcon platform="linkedin" size={20} />
              </div>
              <div className="flex-1">
                <p className="type-body-sb-s text-fg">LinkedIn</p>
                <p className="type-body-r-xs text-muted">LinkedIn OAuth 2.0</p>
              </div>
              <span className="type-body-sb-xs px-2 py-0.5 rounded-full border border-green-200 bg-green-50 text-green-700">Live</span>
            </div>
            <div className="p-5 space-y-3">
              {!loading && linkedinAccounts.length > 0 && (
                <div className="space-y-2">
                  {linkedinAccounts.map((a) => (
                    <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} postsThisMonth={stats[a.id]} onRefreshed={handleRefreshed} isAdmin={isAdmin} />
                  ))}
                </div>
              )}
              {connectDisabled ? (
                <button disabled title={connectDisabled ? (limitMsg ?? undefined) : undefined}
                  className="btn-primary w-full py-2.5">
                  <PlatformIcon platform="linkedin" size={16} />
                  {linkedinAccounts.length > 0 ? "Add another LinkedIn account" : "Connect LinkedIn"}
                </button>
              ) : (
                <button
                  onClick={() => { setConnectingPlatform("linkedin"); window.location.href = LINKEDIN_AUTH_URL; }}
                  disabled={connectingPlatform === "linkedin"}
                  className="btn-primary w-full py-2.5">
                  {connectingPlatform === "linkedin" ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <PlatformIcon platform="linkedin" size={16} />}
                  {connectingPlatform === "linkedin" ? "Connecting…" : linkedinAccounts.length > 0 ? "Add another LinkedIn account" : "Connect LinkedIn"}
                </button>
              )}
              <p className="type-body-r-xs text-muted">
                Requires a LinkedIn developer app with w_member_social permission
              </p>
            </div>
          </div>

          {/* ── YouTube ── */}
          <div className={cn("card overflow-hidden", show("youtube"))}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                <PlatformIcon platform="youtube" size={20} />
              </div>
              <div className="flex-1">
                <p className="type-body-sb-s text-fg">YouTube</p>
                <p className="type-body-r-xs text-muted">Google OAuth 2.0 · Videos & Shorts</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {!loading && youtubeAccounts.length > 0 && (
                <div className="space-y-2">
                  {youtubeAccounts.map((a) => (
                    <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} postsThisMonth={stats[a.id]} onRefreshed={handleRefreshed} isAdmin={isAdmin} />
                  ))}
                </div>
              )}
              {connectDisabled ? (
                <button disabled title={limitMsg ?? undefined}
                  className="btn-primary w-full py-2.5">
                  <PlatformIcon platform="youtube" size={16} />
                  {youtubeAccounts.length > 0 ? "Add another YouTube channel" : "Connect YouTube"}
                </button>
              ) : (
                <button
                  onClick={() => { setConnectingPlatform("youtube"); window.location.href = YOUTUBE_AUTH_URL; }}
                  disabled={connectingPlatform === "youtube"}
                  className="btn-primary w-full py-2.5">
                  {connectingPlatform === "youtube" ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <PlatformIcon platform="youtube" size={16} />}
                  {connectingPlatform === "youtube" ? "Connecting…" : youtubeAccounts.length > 0 ? "Add another YouTube channel" : "Connect YouTube"}
                </button>
              )}
            </div>
          </div>

          {/* ── Facebook Pages ── */}
          <div className={cn("card overflow-hidden", show("facebook"))}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                <PlatformIcon platform="facebook" size={20} />
              </div>
              <div className="flex-1">
                <p className="type-body-sb-s text-fg">Facebook Pages</p>
                <p className="type-body-r-xs text-muted">Requires a Facebook Page personal profiles not supported</p>
              </div>
              <span className="type-body-sb-xs px-2 py-0.5 rounded-full border border-green-200 bg-green-50 text-green-700">Live</span>
            </div>
            <div className="p-5 space-y-3">
              {!loading && facebookAccounts.length > 0 && (
                <div className="space-y-2 overflow-y-auto max-h-80">
                  {facebookAccounts.map((a) => (
                    <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} postsThisMonth={stats[a.id]} onRefreshed={handleRefreshed} isAdmin={isAdmin} />
                  ))}
                </div>
              )}
              {connectDisabled ? (
                <button disabled title={limitMsg ?? undefined}
                  className="btn-primary w-full py-2.5">
                  <PlatformIcon platform="facebook" size={16} />
                  {facebookAccounts.length > 0 ? "Add another Facebook Page" : "Connect Facebook Page"}
                </button>
              ) : (
                <button
                  onClick={() => { setConnectingPlatform("facebook"); window.location.href = FACEBOOK_AUTH_URL; }}
                  disabled={connectingPlatform === "facebook"}
                  className="btn-primary w-full py-2.5">
                  {connectingPlatform === "facebook" ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <PlatformIcon platform="facebook" size={16} />}
                  {connectingPlatform === "facebook" ? "Connecting…" : facebookAccounts.length > 0 ? "Add another Facebook Page" : "Connect Facebook Page"}
                </button>
              )}
            </div>
          </div>

          {/* ── Mastodon ── */}
          <div className={cn("card p-5", show("mastodon"))}>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <PlatformIcon platform="mastodon" size={20} />
                <div>
                  <p className="type-body-sb-s text-fg">Mastodon</p>
                  <p className="type-body-r-xs text-muted">Free & open source, any instance</p>
                </div>
              </div>

              {!loading && mastodonAccounts.length > 0 && (
                <div className="flex flex-col gap-2">
                  {mastodonAccounts.map((a) => (
                    <ConnectedAccountRow key={a.id} account={a}
                      onDisconnect={() => setDisconnectTarget(a)}
                      disconnecting={disconnecting}
                      postsThisMonth={stats[a.id]} onRefreshed={handleRefreshed} isAdmin={isAdmin} />
                  ))}
                </div>
              )}

              <button onClick={() => setShowMastodonDialog(true)} disabled={connectDisabled}
                className="btn-primary w-full py-2.5">
                <PlatformIcon platform="mastodon" size={16} />
                {mastodonAccounts.length > 0 ? "Add another Mastodon account" : "Connect Mastodon"}
              </button>

              <p className="type-body-r-xs text-muted">
                Works with any Mastodon instance mastodon.social, fosstodon.org, hachyderm.io, and more
              </p>
            </div>
          </div>

          {/* ── Pixelfed ── */}
          <div className={cn("card p-5", show("pixelfed"))}>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <PlatformIcon platform="pixelfed" size={20} />
                <div>
                  <p className="type-body-sb-s text-fg">Pixelfed</p>
                  <p className="type-body-r-xs text-muted">Federated photo sharing · ActivityPub</p>
                </div>
              </div>

              {!loading && pixelfedAccounts.length > 0 && (
                <div className="flex flex-col gap-2">
                  {pixelfedAccounts.map((a) => (
                    <ConnectedAccountRow key={a.id} account={a}
                      onDisconnect={() => setDisconnectTarget(a)}
                      disconnecting={disconnecting}
                      postsThisMonth={stats[a.id]} onRefreshed={handleRefreshed} isAdmin={isAdmin} />
                  ))}
                </div>
              )}

              <button onClick={() => setShowPixelfedDialog(true)} disabled={connectDisabled}
                className="btn-primary w-full py-2.5">
                <PlatformIcon platform="pixelfed" size={16} />
                {pixelfedAccounts.length > 0 ? "Add another Pixelfed account" : "Connect Pixelfed"}
              </button>

              <p className="type-body-r-xs text-muted">
                Works with any Pixelfed instance pixelfed.social, gram.social, and more.
              </p>
            </div>
          </div>

          {/* ── Pinterest ── */}
          <div className={cn("card overflow-hidden", show("pinterest"))}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                <PlatformIcon platform="pinterest" size={20} />
              </div>
              <div className="flex-1">
                <p className="type-body-sb-s text-fg">Pinterest</p>
                <p className="type-body-r-xs text-muted">OAuth 2.0 · image required</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {!loading && pinterestAccounts.length > 0 && (
                <div className="space-y-2">
                  {pinterestAccounts.map((a) => (
                    <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} postsThisMonth={stats[a.id]} onRefreshed={handleRefreshed} isAdmin={isAdmin} />
                  ))}
                </div>
              )}
              {connectDisabled ? (
                <button disabled title={limitMsg ?? undefined}
                  className="btn-primary w-full py-2.5">
                  <PlatformIcon platform="pinterest" size={16} />
                  {pinterestAccounts.length > 0 ? "Add another Pinterest account" : "Connect Pinterest"}
                </button>
              ) : (
                <button
                  onClick={() => { setConnectingPlatform("pinterest"); window.location.href = RECONNECT_URLS.pinterest; }}
                  disabled={connectingPlatform === "pinterest"}
                  className="btn-primary w-full py-2.5">
                  {connectingPlatform === "pinterest" ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <PlatformIcon platform="pinterest" size={16} />}
                  {connectingPlatform === "pinterest" ? "Connecting…" : pinterestAccounts.length > 0 ? "Add another Pinterest account" : "Connect Pinterest"}
                </button>
              )}
            </div>
          </div>

          {/* ── Telegram ── */}
          {(() => {
            const telegramAccounts = accounts.filter(a => a.platform === "telegram");
            return (
              <div className={cn("card overflow-hidden", show("telegram"))}>
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                    <PlatformIcon platform="telegram" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="type-body-sb-s text-fg">Telegram</p>
                    <p className="type-body-r-xs text-muted">Bot API · channel broadcasting</p>
                  </div>
                  <span className="type-body-sb-xs px-2 py-0.5 rounded-full border border-green-200 bg-green-50 text-green-700">Live</span>
                </div>
                <div className="p-5 space-y-3">
                  {!loading && telegramAccounts.length > 0 && (
                    <div className="space-y-2">
                      {telegramAccounts.map((a) => (
                        <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} postsThisMonth={stats[a.id]} onRefreshed={handleRefreshed} isAdmin={isAdmin} />
                      ))}
                    </div>
                  )}
                  {connectDisabled ? (
                    <button disabled title={limitMsg ?? undefined}
                      className="btn-primary w-full py-2.5">
                      <PlatformIcon platform="telegram" size={16} />
                      {telegramAccounts.length > 0 ? "Add another channel" : "Connect Telegram Channel"}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowTelegramDialog(true)}
                      className="btn-primary w-full py-2.5">
                      <PlatformIcon platform="telegram" size={16} />
                      {telegramAccounts.length > 0 ? "Add another channel" : "Connect Telegram Channel"}
                    </button>
                  )}
                  <p className="type-body-r-xs text-muted">
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
              <div className={cn("card overflow-hidden", show("nostr"))}>
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                    <PlatformIcon platform="nostr" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="type-body-sb-s text-fg">Nostr</p>
                    <p className="type-body-r-xs text-muted">Keypair · decentralized · no approval</p>
                  </div>
                  <span className="type-body-sb-xs px-2 py-0.5 rounded-full border border-green-200 bg-green-50 text-green-700">Live</span>
                </div>
                <div className="p-5 space-y-3">
                  {!loading && nostrAccounts.length > 0 && (
                    <div className="space-y-2">
                      {nostrAccounts.map((a) => (
                        <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} postsThisMonth={stats[a.id]}
                          onAvatarRefreshed={(id, avatarUrl) => setAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, avatarUrl } : acc))} isAdmin={isAdmin} />
                      ))}
                    </div>
                  )}
                  {connectDisabled ? (
                    <button disabled title={limitMsg ?? undefined}
                      className="btn-primary w-full py-2.5">
                      <PlatformIcon platform="nostr" size={16} />
                      {nostrAccounts.length > 0 ? "Add another Nostr key" : "Connect Nostr"}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowNostrDialog(true)}
                      className="btn-primary w-full py-2.5">
                      <PlatformIcon platform="nostr" size={16} />
                      {nostrAccounts.length > 0 ? "Add another Nostr key" : "Connect Nostr"}
                    </button>
                  )}
                  <p className="type-body-r-xs text-muted">
                    Post to Nostr relays · text and images · no app review needed
                  </p>
                </div>
              </div>
            );
          })()}

          {/* ── X / Twitter ── */}
          <div className={cn("card overflow-hidden", show("twitter"))}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                <PlatformIcon platform="twitter" size={20} />
              </div>
              <div className="flex-1">
                <p className="type-body-sb-s text-fg">X (Twitter)</p>
                <p className="type-body-r-xs text-muted">OAuth 1.0a · up to 4 images</p>
              </div>
              {!allowTwitter ? (
                <span className="type-body-sb-xs px-2 py-0.5 rounded-full border border-brand-400 bg-brand-100 text-brand-800">Pro</span>
              ) : (
                <span className="type-body-sb-xs px-2 py-0.5 rounded-full border border-green-200 bg-green-50 text-green-700">Live</span>
              )}
            </div>
            <div className="p-5 space-y-3">
              {!loading && twitterAccounts.length > 0 && (
                <div className="space-y-2">
                  {twitterAccounts.map((a) => (
                    <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} postsThisMonth={stats[a.id]} onRefreshed={handleRefreshed} isAdmin={isAdmin} />
                  ))}
                </div>
              )}
              {!allowTwitter ? (
                <div>
                  <div className="w-full rounded-xl bg-accent py-2.5 text-center type-body-sb-s text-accent-fg opacity-50 cursor-not-allowed">
                    Connect X (Twitter)
                  </div>
                  <p className="type-body-r-xs mt-2 text-center text-muted">
                    X/Twitter posting is available on{" "}
                    <a href="/billing" className="underline text-brand-800 hover:opacity-80">Pro and Team plans</a>.
                  </p>
                </div>
              ) : connectDisabled ? (
                <button disabled title={limitMsg ?? undefined}
                  className="btn-primary w-full py-2.5">
                  <PlatformIcon platform="twitter" size={16} />
                  {twitterAccounts.length > 0 ? "Add another X account" : "Connect X (Twitter)"}
                </button>
              ) : (
                <button
                  onClick={() => { setConnectingPlatform("twitter"); window.location.href = TWITTER_AUTH_URL; }}
                  disabled={connectingPlatform === "twitter"}
                  className="btn-primary w-full py-2.5">
                  {connectingPlatform === "twitter" ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <PlatformIcon platform="twitter" size={16} />}
                  {connectingPlatform === "twitter" ? "Connecting…" : twitterAccounts.length > 0 ? "Add another X account" : "Connect X (Twitter)"}
                </button>
              )}
              {allowTwitter && planStatus && planStatus.maxTwitterPostsPerMonth && planStatus.maxTwitterPostsPerMonth > 0 ? (() => {
                const used = planStatus.twitterPostsThisMonth;
                const max = planStatus.maxTwitterPostsPerMonth;
                const remaining = Math.max(0, max - used);
                const pct = Math.min(100, (used / max) * 100);
                const tone = remaining === 0
                  ? { text: "text-red-600", bar: "bg-red-500" }
                  : remaining <= 20
                  ? { text: "text-brand-800", bar: "bg-accent" }
                  : { text: "text-green-700", bar: "bg-green-500" };
                return (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="type-body-r-xs text-muted">X quota this month</span>
                      <span className={cn("type-body-sb-xs", tone.text)}>{remaining} / {max} remaining</span>
                    </div>
                    <div className="h-1 rounded-full bg-neutral-100">
                      <div className={cn("h-1 w-(--w) rounded-full transition-[width] duration-300", tone.bar)}
                        style={{ "--w": `${pct}%` } as React.CSSProperties} />
                    </div>
                    <p className="type-body-r-xs mt-1 text-muted">Resets on the 1st of each month</p>
                  </div>
                );
              })() : (
                <p className="type-body-r-xs text-muted">
                  100 tweets/month per account on Pro and Team plans
                </p>
              )}
            </div>
          </div>

          {/* ── Discord ── */}
          {(() => {
            const discordAccounts = accounts.filter(a => a.platform === "discord");
            return (
              <div className={cn("card overflow-hidden", show("discord"))}>
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                    <PlatformIcon platform="discord" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="type-body-sb-s text-fg">Discord</p>
                    <p className="type-body-r-xs text-muted">OAuth + Bot · server channels</p>
                  </div>
                  <span className="type-body-sb-xs px-2 py-0.5 rounded-full border border-green-200 bg-green-50 text-green-700">Live</span>
                </div>
                <div className="p-5 space-y-3">
                  {!loading && discordAccounts.length > 0 && (
                    <div className="space-y-2">
                      {discordAccounts.map((a) => (
                        <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} postsThisMonth={stats[a.id]} onRefreshed={handleRefreshed} isAdmin={isAdmin} />
                      ))}
                    </div>
                  )}
                  {connectDisabled ? (
                    <button disabled title={limitMsg ?? undefined}
                      className="btn-primary w-full py-2.5">
                      <PlatformIcon platform="discord" size={16} />
                      {discordAccounts.length > 0 ? "Add another channel" : "Connect Discord"}
                    </button>
                  ) : (
                    <button
                      onClick={() => { setConnectingPlatform("discord"); window.location.href = DISCORD_AUTH_URL; }}
                      disabled={connectingPlatform === "discord"}
                      className="btn-primary w-full py-2.5">
                      {connectingPlatform === "discord" ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <PlatformIcon platform="discord" size={16} />}
                      {connectingPlatform === "discord" ? "Connecting…" : discordAccounts.length > 0 ? "Add another channel" : "Connect Discord"}
                    </button>
                  )}
                  <p className="type-body-r-xs text-muted">
                    Post to Discord channels · text, images, and video
                  </p>
                </div>
              </div>
            );
          })()}

          {/* ── Tumblr ── */}
          {(() => {
            const tumblrAccounts = accounts.filter(a => a.platform === "tumblr");
            return (
              <div className={cn("card overflow-hidden", show("tumblr"))}>
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                    <PlatformIcon platform="tumblr" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="type-body-sb-s text-fg">Tumblr</p>
                    <p className="type-body-r-xs text-muted">Blog posts · text and images</p>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  {!loading && tumblrAccounts.length > 0 && (
                    <div className="space-y-2">
                      {tumblrAccounts.map(a => (
                        <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} postsThisMonth={stats[a.id]} onRefreshed={handleRefreshed} isAdmin={isAdmin} />
                      ))}
                    </div>
                  )}
                  {connectDisabled ? (
                    <button disabled title={limitMsg ?? undefined}
                      className="btn-primary w-full py-2.5">
                      <PlatformIcon platform="tumblr" size={16} />
                      {tumblrAccounts.length > 0 ? "Add another blog" : "Connect Tumblr"}
                    </button>
                  ) : (
                    <button
                      onClick={() => { setConnectingPlatform("tumblr"); window.location.href = TUMBLR_AUTH_URL; }}
                      disabled={connectingPlatform === "tumblr"}
                      className="btn-primary w-full py-2.5">
                      {connectingPlatform === "tumblr" ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <PlatformIcon platform="tumblr" size={16} />}
                      {connectingPlatform === "tumblr" ? "Connecting…" : tumblrAccounts.length > 0 ? "Add another blog" : "Connect Tumblr"}
                    </button>
                  )}
                  <p className="type-body-r-xs text-muted">
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
              <div className={cn("card overflow-hidden", show("lemmy"))}>
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                    <PlatformIcon platform="lemmy" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="type-body-sb-s text-fg">Lemmy</p>
                    <p className="type-body-r-xs text-muted">Federated · any instance · community posts</p>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  {!loading && lemmyAccounts.length > 0 && (
                    <div className="space-y-2">
                      {lemmyAccounts.map((a) => (
                        <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} postsThisMonth={stats[a.id]} onRefreshed={handleRefreshed} isAdmin={isAdmin} />
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setShowLemmyDialog(true)}
                    disabled={connectDisabled}
                    title={connectDisabled ? (limitMsg ?? undefined) : undefined}
                    className="btn-primary w-full py-2.5">
                    <PlatformIcon platform="lemmy" size={16} />
                    {lemmyAccounts.length > 0 ? "Add another community" : "Connect Lemmy"}
                  </button>
                  <p className="type-body-r-xs text-muted">
                    Post title from first line · body from remaining text · image support
                  </p>
                </div>
              </div>
            );
          })()}

          {/* ── Google Business Profile ── */}
          <div className={cn("card overflow-hidden", show("googlebusiness"))}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                <PlatformIcon platform="googlebusiness" size={20} />
              </div>
              <div className="flex-1">
                <p className="type-body-sb-s text-fg">Google Business Profile</p>
                <p className="type-body-r-xs text-muted">Google OAuth 2.0 · post updates to your listing</p>
              </div>
              <span className="type-body-sb-xs px-2 py-0.5 rounded-full border border-brand-400 bg-brand-100 text-brand-800">⚠ Unavailable</span>
            </div>
            <div className="p-5 space-y-3">
              <button disabled
                className="btn-primary w-full py-2.5">
                <PlatformIcon platform="googlebusiness" size={16} />
                Connect Google Business Profile
              </button>
              <p className="type-body-m-xs text-brand-800">
                ⚠ Cannot connect awaiting Google Business Profile API approval.
              </p>
            </div>
          </div>

          {/* ── TikTok ── */}
          <div className={cn("card overflow-hidden", show("tiktok"))}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                <PlatformIcon platform="tiktok" size={20} />
              </div>
              <div className="flex-1">
                <p className="type-body-sb-s text-fg">TikTok</p>
                <p className="type-body-r-xs text-muted">Content Posting API · videos only</p>
              </div>
              {TIKTOK_REVIEW_PENDING && (
                <span className="type-body-sb-xs px-2 py-0.5 rounded-full flex items-center gap-1 border border-brand-400 bg-brand-100 text-brand-800">
                  ⚠ Unavailable
                </span>
              )}
            </div>
            <div className="p-5 space-y-3">
              {!loading && tiktokAccounts.length > 0 && (
                <div className="space-y-2">
                  {tiktokAccounts.map((a) => (
                    <ConnectedAccountRow key={a.id} account={a} onDisconnect={disconnect} disconnecting={disconnecting} postsThisMonth={stats[a.id]} onRefreshed={handleRefreshed} isAdmin={isAdmin} />
                  ))}
                </div>
              )}
              {(connectDisabled || TIKTOK_REVIEW_PENDING) ? (
                <button disabled title={TIKTOK_REVIEW_PENDING ? "Available once TikTok app review is approved" : (limitMsg ?? undefined)}
                  className="btn-primary w-full py-2.5">
                  <PlatformIcon platform="tiktok" size={16} />
                  {tiktokAccounts.length > 0 ? "Add another TikTok account" : "Connect TikTok"}
                </button>
              ) : (
                <button
                  onClick={() => { setConnectingPlatform("tiktok"); window.location.href = TIKTOK_AUTH_URL; }}
                  disabled={connectingPlatform === "tiktok"}
                  className="btn-primary w-full py-2.5">
                  {connectingPlatform === "tiktok" ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <PlatformIcon platform="tiktok" size={16} />}
                  {connectingPlatform === "tiktok" ? "Connecting…" : tiktokAccounts.length > 0 ? "Add another TikTok account" : "Connect TikTok"}
                </button>
              )}
              {TIKTOK_REVIEW_PENDING && (
                <p className="type-body-m-xs text-brand-800">
                  ⚠ Cannot connect — awaiting TikTok app review approval.
                </p>
              )}
            </div>
          </div>

        </div>}

      </div>

      {showTelegramDialog && <TelegramDialog onClose={() => setShowTelegramDialog(false)} onConnected={() => { fetchAccounts(); success("Telegram channel connected!"); }} />}
      {showPixelfedDialog && <PixelfedDialog onClose={() => setShowPixelfedDialog(false)} />}
      {showMastodonDialog && <MastodonDialog onClose={() => setShowMastodonDialog(false)} />}
      {showNostrDialog && <NostrDialog onClose={() => setShowNostrDialog(false)} onConnected={() => { fetchAccounts(); success("Nostr account connected!"); }} />}
      {showLemmyDialog && <LemmyDialog onClose={() => setShowLemmyDialog(false)} onConnected={() => { fetchAccounts(); success("Lemmy community connected!"); }} />}

      {/* Discord channel picker — shown after OAuth redirect */}
      {discordGuildId && discordChannels.length > 0 && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
          onMouseDown={e => e.stopPropagation()}>
          <div className="card w-full max-w-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <PlatformIcon platform="discord" size={20} />
              <h2 className="type-body-sb-m text-fg">Pick a channel</h2>
            </div>
            <p className="type-body-r-s mb-4 text-muted">
              Bot added to <span className="text-fg">{discordGuildName}</span>. Choose which channel to post to.
            </p>
            <form onSubmit={connectDiscordChannel} className="space-y-4">
              <select
                value={discordChannelId}
                onChange={e => setDiscordChannelId(e.target.value)}
                required
                className="field">
                <option value="">Select a channel…</option>
                {discordChannels.map(c => (
                  <option key={c.id} value={c.id}>#{c.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button type="submit" disabled={!discordChannelId || discordConnecting}
                  className="w-full py-2.5 type-body-sb-s rounded-xl bg-[#5865F2] text-white disabled:opacity-50">
                  {discordConnecting ? "Connecting…" : "Connect"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disconnect confirm dialog */}
      {disconnectTarget && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setDisconnectTarget(null); }}>
          <div className="card w-full max-w-sm p-6">
            <h2 className="type-body-sb-m mb-1 text-fg">Disconnect account?</h2>
            <p className="type-body-r-s mb-5 text-muted">
              <span className="text-fg">
                {disconnectTarget.platform === "nostr"
                  ? disconnectTarget.displayName
                  : `@${disconnectTarget.displayName}`}
              </span>{" "}will be removed.
              Already-scheduled posts won&apos;t be affected.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDisconnectTarget(null)}
                className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={confirmDisconnect}
                className="btn-danger flex-1">
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
