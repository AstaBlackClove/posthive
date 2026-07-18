"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { PlatformIcon } from "../../components/PlatformIcon";
import { useToast } from "../../components/Toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Account {
  id: string;
  platform: string;
  displayName: string;
  avatarUrl?: string | null;
}

// ── Plans ──────────────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: "creator",
    name: "Creator",
    priceInr: "₹550",
    priceUsd: "$9",
    period: "/mo",
    color: "#5b63d3",
    maxAccounts: 5,
    maxPosts: "400 posts/mo",
    features: [
      "5 connected accounts",
      "400 posts / month",
      "All platforms",
      "Bulk CSV scheduling",
      "Post templates",
      "Calendar & drag-reschedule",
      "First comment automation",
      "Reels & Stories",
      "Per-platform overrides",
      "API access",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceInr: "₹1,700",
    priceUsd: "$29",
    period: "/mo",
    color: "#7c3aed",
    maxAccounts: 15,
    maxPosts: "Unlimited",
    popular: true,
    features: [
      "15 connected accounts",
      "Unlimited posts",
      "All platforms",
      "Bulk CSV scheduling",
      "Post templates",
      "Calendar & drag-reschedule",
      "First comment automation",
      "Reels & Stories",
      "Per-platform overrides",
      "API access & MCP",
    ],
  },
  {
    id: "team",
    name: "Team",
    priceInr: "₹2,600",
    priceUsd: "$49",
    period: "/mo",
    color: "#0891b2",
    maxAccounts: 50,
    maxPosts: "Unlimited",
    features: [
      "50 connected accounts",
      "Unlimited posts",
      "All platforms",
      "Bulk CSV scheduling",
      "Post templates",
      "Calendar & drag-reschedule",
      "First comment automation",
      "Reels & Stories",
      "Per-platform overrides",
      "Priority support",
    ],
  },
];

// OAuth platforms shown in the connect step.
// Instagram, Threads, Facebook require Meta app review — excluded from onboarding.
// Pinterest requires app review — excluded from onboarding.
// Users can still connect them from /accounts once approved.
const OAUTH_PLATFORMS = [
  { platform: "linkedin",  label: "LinkedIn",   sub: "LinkedIn OAuth",     path: "/auth/linkedin",  proOnly: false },
  { platform: "youtube",   label: "YouTube",    sub: "Google OAuth",       path: "/auth/youtube",   proOnly: false },
  { platform: "discord",   label: "Discord",    sub: "Webhook + OAuth",    path: "/auth/discord",   proOnly: false },
  { platform: "tumblr",    label: "Tumblr",     sub: "Tumblr OAuth",       path: "/auth/tumblr",    proOnly: false },
];


const WELCOME_PLATFORMS = [
  "bluesky", "threads", "instagram", "linkedin", "youtube",
  "facebook", "pinterest", "mastodon", "twitter", "discord",
  "telegram", "nostr", "tumblr", "lemmy", "pixelfed",
];

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepIndicator({ current, billingEnabled }: { current: number; billingEnabled: boolean }) {
  const steps = billingEnabled
    ? [
        { n: 1, label: "Welcome" },
        { n: 2, label: "Connect" },
        { n: 3, label: "First post" },
        { n: 4, label: "Choose plan" },
      ]
    : [
        { n: 1, label: "Welcome" },
        { n: 2, label: "Connect" },
        { n: 3, label: "First post" },
      ];

  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={
                s.n < current
                  ? { backgroundColor: "#22c55e", color: "#fff" }
                  : s.n === current
                    ? { backgroundColor: "#5b63d3", color: "#fff" }
                    : { backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#444" }
              }
            >
              {s.n < current ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                s.n
              )}
            </div>
            <span
              className="text-[10px] font-medium whitespace-nowrap"
              style={{ color: s.n === current ? "#ededed" : s.n < current ? "#22c55e" : "#333" }}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className="w-12 h-px mb-5 mx-1.5"
              style={{ backgroundColor: current > s.n ? "#22c55e30" : "#1e1e1e" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Bluesky inline form ────────────────────────────────────────────────────────
function BlueskyConnect({ onConnected }: { onConnected: () => void }) {
  const [open, setOpen] = useState(false);
  const [handle, setHandle] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true);
    setError(null);
    try {
      await apiFetch("/accounts/bluesky", {
        method: "POST",
        body: JSON.stringify({ handle: handle.replace(/^@/, ""), appPassword }),
      });
      setOpen(false);
      setHandle("");
      setAppPassword("");
      onConnected();
    } catch (err) {
      setError(String(err));
    } finally {
      setConnecting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 w-full p-3.5 rounded-xl text-left transition-all hover:border-blue-500/30"
        style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#0a1830" }}>
          <PlatformIcon platform="bluesky" size={18} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: "#ededed" }}>Bluesky</p>
          <p className="text-xs" style={{ color: "#555" }}>App password · free</p>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#1a1a1a", color: "#666", border: "1px solid #2a2a2a" }}>
          Connect
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: "#111111", border: "1px solid #5b63d340" }}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#0a1830" }}>
          <PlatformIcon platform="bluesky" size={16} />
        </div>
        <p className="text-sm font-semibold" style={{ color: "#ededed" }}>Connect Bluesky</p>
        <button onClick={() => setOpen(false)} className="ml-auto text-xs hover:opacity-70" style={{ color: "#444" }}>
          Cancel
        </button>
      </div>
      <form onSubmit={submit} className="space-y-2.5">
        <input
          placeholder="Handle — e.g. you.bsky.social"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          required
          autoFocus
          className="w-full rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/10"
          style={{ backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", color: "#ededed" }}
        />
        <input
          type="password"
          placeholder="App password"
          value={appPassword}
          onChange={(e) => setAppPassword(e.target.value)}
          required
          className="w-full rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/10"
          style={{ backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", color: "#ededed" }}
        />
        {error && (
          <p className="text-xs rounded-lg px-3 py-2" style={{ backgroundColor: "#1a0a0a", border: "1px solid #3a1a1a", color: "#f87171" }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={connecting}
          className="w-full py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 hover:bg-gray-100"
          style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}
        >
          {connecting ? "Connecting…" : "Connect Bluesky"}
        </button>
      </form>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { error: toastError } = useToast();
  const billingEnabled = process.env.NEXT_PUBLIC_ENABLE_BILLING === "true";

  const stepParam = parseInt(searchParams.get("step") ?? "1");
  const step = Math.min(Math.max(stepParam, 1), billingEnabled ? 4 : 3);

  const [isIndia, setIsIndia] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [waitingForPlan, setWaitingForPlan] = useState(false);
  const [planReady, setPlanReady] = useState(false);

  const [postText, setPostText] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [scheduledFor, setScheduledFor] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const connected = searchParams.get("connected");
  const oauthError = searchParams.get("error");

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setIsIndia(tz === "Asia/Kolkata");
  }, []);

  async function fetchAccounts() {
    try {
      const accs = await apiFetch<Account[]>("/accounts");
      setAccounts(accs);
      if (accs.length > 0 && selectedIds.length === 0) {
        setSelectedIds([accs[0].id]);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingAccounts(false);
    }
  }

  useEffect(() => {
    if (step >= 2) fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Poll for plan activation after checkout
  useEffect(() => {
    if (!billingEnabled || step !== 4 || searchParams.get("trialStarted") !== "1") return;
    setWaitingForPlan(true);
    let attempts = 0;
    async function check() {
      try {
        const { planStatus, trialEndsAt } = await apiFetch<{ planStatus: string; trialEndsAt: string | null }>("/billing/status");
        if (planStatus === "active" || (planStatus === "trialing" && trialEndsAt !== null)) {
          setPlanReady(true);
          setWaitingForPlan(false);
          setTimeout(() => router.replace("/compose?onboarded=1"), 1200);
        } else if (attempts < 8) {
          attempts++;
          setTimeout(check, 1000);
        } else {
          setWaitingForPlan(false);
        }
      } catch {
        setWaitingForPlan(false);
      }
    }
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function checkout(planId: string) {
    setCheckingOut(planId);
    try {
      const { url } = await apiFetch<{ url: string }>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ planId, successUrl: "/onboarding?step=4&trialStarted=1" }),
      });
      window.location.href = url;
    } catch (err) {
      toastError(String(err));
    } finally {
      setCheckingOut(null);
    }
  }

  function goStep(n: number) {
    router.push(`/onboarding?step=${n}`);
  }

  async function scheduleFirstPost() {
    if (!postText.trim() || selectedIds.length === 0) return;
    setScheduling(true);
    setScheduleError(null);
    try {
      // When billing is enabled the user hasn't paid yet — save as draft so it
      // won't fire without an active plan. They can activate it from /jobs after billing.
      const asDraft = billingEnabled;
      await apiFetch("/jobs", {
        method: "POST",
        body: JSON.stringify({
          scheduledFor: asDraft ? undefined : new Date(scheduledFor).toISOString(),
          draft: asDraft,
          content: { text: postText.trim(), mediaUrls: [] },
          accountIds: selectedIds,
        }),
      });
      if (billingEnabled) goStep(4);
      else router.replace("/compose?onboarded=1");
    } catch (err) {
      setScheduleError(String(err));
      setScheduling(false);
    }
  }

  const planPrice = (p: (typeof PLANS)[number]) => (isIndia ? p.priceInr : p.priceUsd);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8" style={{ backgroundColor: "#0a0a0a" }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10 self-start w-full max-w-3xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/posthivemain.png" alt="Posthive" className="w-8 h-8 rounded-xl object-cover" />
        <span className="font-bold text-sm" style={{ color: "#ededed" }}>Posthive</span>
      </div>

      {/* Step indicator — skip on welcome */}
      {step > 1 && (
        <div className="mb-10">
          <StepIndicator current={step} billingEnabled={billingEnabled} />
        </div>
      )}

      {/* ── Step 1: Welcome ───────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="w-full max-w-lg flex flex-col items-center text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            style={{ backgroundColor: "#5b63d315", border: "1px solid #5b63d330" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/posthivemain.png" alt="Posthive" className="w-10 h-10 rounded-xl object-cover" />
          </div>

          <h1 className="text-3xl font-bold mb-3 leading-tight" style={{ color: "#ededed" }}>
            Schedule smarter,<br />post everywhere.
          </h1>
          <p className="text-base mb-8 max-w-sm" style={{ color: "#666" }}>
            Write once, publish to multiple social platforms Bluesky, Threads, Instagram, LinkedIn, YouTube, and more.
          </p>

          {/* Platform icons strip */}
          <div className="flex flex-wrap justify-center gap-2.5 mb-8">
            {WELCOME_PLATFORMS.map((p) => (
              <div
                key={p}
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "#111111", border: "1px solid #1e1e1e" }}
              >
                <PlatformIcon platform={p} size={20} />
              </div>
            ))}
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {[
              "First comment automation",
              "Drag-to-reschedule calendar",
              "Bulk CSV scheduling",
              "Self-hostable (AGPL-3.0)",
            ].map((f) => (
              <span
                key={f}
                className="text-xs font-medium px-3 py-1.5 rounded-full"
                style={{ backgroundColor: "#111111", border: "1px solid #1e1e1e", color: "#666" }}
              >
                {f}
              </span>
            ))}
          </div>

          <button
            onClick={() => goStep(2)}
            className="w-full max-w-xs py-3.5 rounded-xl text-sm font-semibold transition-all hover:bg-gray-100 active:scale-[0.98]"
            style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}
          >
            Get started →
          </button>

          <p className="mt-4 text-xs" style={{ color: "#999" }}>
            {billingEnabled
              ? "14-day free trial · card only at checkout · cancel any time"
              : "Free to use · open source · self-hostable"}
          </p>
        </div>
      )}

      {/* ── Step 2: Connect accounts ──────────────────────────────────────────── */}
      {step === 2 && (
        <div className="w-full max-w-lg">
          {connected && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5" style={{ backgroundColor: "#052e16", border: "1px solid #14532d" }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#4ade80" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm" style={{ color: "#4ade80" }}>
                {connected.charAt(0).toUpperCase() + connected.slice(1)} connected!
              </p>
            </div>
          )}

          {oauthError && (
            <div className="px-4 py-3 rounded-xl mb-5 text-sm" style={{ backgroundColor: "#1a0a0a", border: "1px solid #3a1a1a", color: "#f87171" }}>
              ⚠️ {decodeURIComponent(oauthError)}
            </div>
          )}

          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1.5" style={{ color: "#ededed" }}>Connect your accounts</h1>
            <p className="text-sm" style={{ color: "#555" }}>Connect at least one platform to start scheduling.</p>
          </div>

          {/* Connected accounts list */}
          {accounts.length > 0 && (
            <div className="mb-5 space-y-2">
              {accounts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ backgroundColor: "#0a1a0a", border: "1px solid #14532d" }}>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#4ade80" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <PlatformIcon platform={a.platform} size={16} />
                  <span className="text-sm font-semibold" style={{ color: "#ededed" }}>
                    {a.platform === "threads" ? "@" : ""}{a.displayName}
                  </span>
                  <span className="ml-auto text-xs capitalize" style={{ color: "#4ade80" }}>{a.platform}</span>
                </div>
              ))}
            </div>
          )}

          {/* Bluesky inline form */}
          <div className="mb-3">
            <BlueskyConnect onConnected={fetchAccounts} />
          </div>

          {/* OAuth platforms 2-column grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
            {OAUTH_PLATFORMS.map(({ platform, label, sub, path, proOnly }) =>
              proOnly && billingEnabled ? (
                <div
                  key={platform}
                  className="flex items-center gap-3 p-3.5 rounded-xl opacity-50 cursor-not-allowed"
                  style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}
                  title="Available on Pro and Team plans"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#1a1a1a" }}>
                    <PlatformIcon platform={platform} size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "#ededed" }}>{label}</p>
                    <p className="text-xs truncate" style={{ color: "#555" }}>{sub}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#1c1209", color: "#fbbf24", border: "1px solid #78560a" }}>
                    Pro
                  </span>
                </div>
              ) : (
                <a
                  key={platform}
                  href={`${API_BASE}${path}?from=onboarding`}
                  className="flex items-center gap-3 p-3.5 rounded-xl transition-all hover:border-gray-600/50"
                  style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#1a1a1a" }}>
                    <PlatformIcon platform={platform} size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "#ededed" }}>{label}</p>
                    <p className="text-xs truncate" style={{ color: "#555" }}>{sub}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#1a1a1a", color: "#666", border: "1px solid #2a2a2a" }}>
                    Connect
                  </span>
                </a>
              )
            )}
          </div>

          <p className="text-xs mb-6 text-center" style={{ color: "#999" }}>
            Instagram, Threads, Facebook, Pinterest, Mastodon, Telegram, Nostr & more →{" "}
            <span>available after setup in Settings</span>
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => goStep(3)}
              disabled={accounts.length === 0}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 active:scale-[0.98]"
              style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}
            >
              {accounts.length === 0
                ? "Connect an account to continue"
                : `Continue with ${accounts.length} account${accounts.length > 1 ? "s" : ""} →`}
            </button>
            <button
              onClick={() => goStep(3)}
              className="text-xs text-center py-1 hover:opacity-70 transition-opacity"
              style={{ color: "#555" }}
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Schedule first post ───────────────────────────────────────── */}
      {step === 3 && (
        <div className="w-full max-w-lg">
          <div className="mb-7">
            <h1 className="text-2xl font-bold mb-1.5" style={{ color: "#ededed" }}>Schedule your first post</h1>
            <p className="text-sm" style={{ color: "#555" }}>
              {accounts.length > 0
                ? "Write something, pick a time, and you're live."
                : "You can schedule from the compose page once you're set up."}
            </p>
          </div>

          {accounts.length === 0 && !loadingAccounts ? (
            <div className="rounded-xl p-6 text-center mb-6" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
              <p className="text-sm mb-3" style={{ color: "#666" }}>No accounts connected yet.</p>
              <button onClick={() => goStep(2)} className="text-sm font-semibold hover:opacity-70" style={{ color: "#5b63d3" }}>
                ← Connect an account first
              </button>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden mb-6" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
              {accounts.length > 0 && (
                <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid #1a1a1a" }}>
                  <p className="text-xs font-semibold mb-3" style={{ color: "#555" }}>POST TO</p>
                  <div className="flex flex-wrap gap-2">
                    {accounts.map((a) => {
                      const selected = selectedIds.includes(a.id);
                      return (
                        <button
                          key={a.id}
                          onClick={() =>
                            setSelectedIds((prev) =>
                              prev.includes(a.id) ? prev.filter((id) => id !== a.id) : [...prev, a.id],
                            )
                          }
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                          style={
                            selected
                              ? { backgroundColor: "#5b63d320", color: "#ededed", border: "1px solid #5b63d360" }
                              : { backgroundColor: "#1a1a1a", color: "#555", border: "1px solid #2a2a2a" }
                          }
                        >
                          <PlatformIcon platform={a.platform} size={12} />
                          {a.displayName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a1a1a" }}>
                <textarea
                  placeholder="What do you want to share today?"
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  rows={5}
                  className="w-full bg-transparent text-sm resize-none focus:outline-none"
                  style={{ color: "#ededed" }}
                  autoFocus
                />
                <div className="flex justify-end">
                  <span className="text-xs" style={{ color: postText.length > 280 ? "#fb923c" : "#444" }}>
                    {postText.length} / 300
                  </span>
                </div>
              </div>

              {!billingEnabled && (
                <div className="px-5 py-4 flex items-center gap-3">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#555" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <input
                    type="datetime-local"
                    value={scheduledFor}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                    style={{ color: "#ededed", colorScheme: "dark" }}
                  />
                </div>
              )}
              {billingEnabled && (
                <div className="px-5 py-3 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="#444" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-xs" style={{ color: "#444" }}>Saved as draft · activate after choosing a plan</span>
                </div>
              )}
            </div>
          )}

          {scheduleError && (
            <div className="px-4 py-3 rounded-xl mb-4 text-xs" style={{ backgroundColor: "#1a0a0a", border: "1px solid #3a1a1a", color: "#f87171" }}>
              {scheduleError}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {accounts.length > 0 && (
              <button
                onClick={scheduleFirstPost}
                disabled={scheduling || !postText.trim() || selectedIds.length === 0}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 active:scale-[0.98]"
                style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}
              >
                {scheduling ? "Saving…" : billingEnabled ? "Save draft & choose plan →" : "Schedule my first post"}
              </button>
            )}
            <button
              onClick={() => {
                if (billingEnabled) goStep(4);
                else router.replace("/compose?onboarded=1");
              }}
              className="text-xs text-center py-1 hover:opacity-70 transition-opacity"
              style={{ color: "#444" }}
            >
              {billingEnabled ? "Skip — choose a plan →" : "Skip — take me to the app"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Choose plan (billing enabled, shown last) ─────────────────── */}
      {step === 4 && billingEnabled && (
        <div className="w-full max-w-3xl">
          {waitingForPlan && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6" style={{ backgroundColor: "#052e16", border: "1px solid #14532d" }}>
              <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0" style={{ borderColor: "#4ade80", borderTopColor: "transparent" }} />
              <p className="text-sm" style={{ color: "#4ade80" }}>Activating your trial, just a moment…</p>
            </div>
          )}

          {planReady && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6" style={{ backgroundColor: "#052e16", border: "1px solid #14532d" }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#4ade80" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm" style={{ color: "#4ade80" }}>Trial started! Taking you in…</p>
            </div>
          )}

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2" style={{ color: "#ededed" }}>
              You&apos;re almost in — choose a plan.
            </h1>
            <p className="text-sm" style={{ color: "#555" }}>
              14-day free trial · your card won&apos;t be charged until the trial ends.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className="relative rounded-2xl flex flex-col overflow-hidden"
                style={{
                  backgroundColor: "#111111",
                  border: plan.popular ? `1px solid ${plan.color}40` : "1px solid #2a2a2a",
                }}
              >
                {plan.popular && <div className="h-px w-full" style={{ backgroundColor: plan.color }} />}

                <div className="p-5 flex-1 flex flex-col">
                  <div className="h-5 mb-3">
                    {plan.popular && (
                      <span
                        className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${plan.color}18`,
                          color: plan.color,
                          border: `1px solid ${plan.color}35`,
                        }}
                      >
                        MOST POPULAR
                      </span>
                    )}
                  </div>

                  <p className="font-bold text-base mb-0.5" style={{ color: "#ededed" }}>{plan.name}</p>

                  <div className="flex items-baseline gap-1 mt-2 mb-1">
                    <span className="text-3xl font-bold tracking-tight" style={{ color: "#ededed" }}>{planPrice(plan)}</span>
                    <span className="text-sm" style={{ color: "#444" }}>{plan.period}</span>
                  </div>
                  <p className="text-[11px] mb-4" style={{ color: "#333" }}>{isIndia ? "billed in INR" : "billed in USD"}</p>

                  <div className="flex gap-1.5 mb-4 flex-wrap">
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-lg"
                      style={{ backgroundColor: plan.color + "15", color: plan.color, border: `1px solid ${plan.color}30` }}
                    >
                      {plan.maxAccounts} accounts
                    </span>
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-lg"
                      style={{ backgroundColor: plan.color + "15", color: plan.color, border: `1px solid ${plan.color}30` }}
                    >
                      {plan.maxPosts}
                    </span>
                  </div>

                  <ul className="space-y-2 flex-1 mb-5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke={plan.color} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-xs leading-snug" style={{ color: "#666" }}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => checkout(plan.id)}
                    disabled={!!checkingOut || waitingForPlan}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 active:scale-[0.98]"
                    style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}
                  >
                    {checkingOut === plan.id ? "Opening checkout…" : "Start free trial"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs" style={{ color: "#333" }}>
            14 days free · cancel any time · {isIndia ? "billed in INR" : "billed in USD"}
          </p>
        </div>
      )}
    </div>
  );
}
