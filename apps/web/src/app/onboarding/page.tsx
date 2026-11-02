"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { PlatformIcon } from "../../components/PlatformIcon";
import { DateTimePicker } from "../../components/DateTimePicker";
import { fromWibInput, toWibInput, wibDateKey } from "../../lib/datetime";
import { cn } from "../../lib/cn";
import confetti from "canvas-confetti";

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
    maxAccounts: 5,
    maxPosts: "400 posts/mo",
    trialAccounts: 3,
    trialPosts: 30,
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
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center type-body-sb-xs transition-all",
                s.n < current
                  ? "bg-green-500 text-white"
                  : s.n === current
                    ? "bg-accent text-accent-fg"
                    : "bg-neutral-100 text-muted",
              )}
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
              className={cn(
                "type-body-m-xxs whitespace-nowrap",
                s.n === current ? "text-fg" : s.n < current ? "text-green-700" : "text-neutral-500",
              )}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn("w-12 h-px mb-5 mx-1.5", current > s.n ? "bg-green-200" : "bg-border")}
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
        className="card flex items-center gap-3 w-full p-3.5 rounded-xl text-left transition-all hover:border-neutral-300"
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-blue-50">
          <PlatformIcon platform="bluesky" size={18} />
        </div>
        <div className="flex-1">
          <p className="type-body-sb-s text-fg">Bluesky</p>
          <p className="type-body-r-xs text-muted">App password · free</p>
        </div>
        <span className="type-body-sb-xs px-2 py-0.5 rounded-full border border-border bg-bg text-muted">
          Connect
        </span>
      </button>
    );
  }

  return (
    <div className="card rounded-xl p-4 border-brand-300">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-50">
          <PlatformIcon platform="bluesky" size={16} />
        </div>
        <p className="type-body-sb-s text-fg">Connect Bluesky</p>
        <button onClick={() => setOpen(false)} className="ml-auto type-body-r-xs text-muted hover:opacity-70">
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
          className="field rounded-lg px-3.5"
        />
        <input
          type="password"
          placeholder="App password"
          value={appPassword}
          onChange={(e) => setAppPassword(e.target.value)}
          required
          className="field rounded-lg px-3.5"
        />
        {error && (
          <p className="type-body-r-xs rounded-lg px-3 py-2 border border-red-200 bg-red-50 text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={connecting}
          className="btn-primary w-full rounded-lg"
        >
          {connecting ? "Connecting…" : "Connect Bluesky"}
        </button>
      </form>
    </div>
  );
}

// ── Main content ───────────────────────────────────────────────────────────────
function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const billingEnabled = process.env.NEXT_PUBLIC_ENABLE_BILLING === "true";

  const stepParam = parseInt(searchParams.get("step") ?? "1");
  const step = Math.min(Math.max(stepParam, 1), billingEnabled ? 4 : 3);

  const [isIndia, setIsIndia] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const [postText, setPostText] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [scheduledFor, setScheduledFor] = useState(() => toWibInput(new Date(Date.now() + 60 * 60 * 1000)));
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const connected = searchParams.get("connected");
  const oauthError = searchParams.get("error");

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setIsIndia(tz === "Asia/Kolkata");
  }, []);

  useEffect(() => {
    if (step === 4 && billingEnabled) {
      confetti({ particleCount: 180, spread: 90, origin: { y: 0.55 }, zIndex: 9999 });
      setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { y: 0.5 }, zIndex: 9999 }), 400);
    }
  }, [step, billingEnabled]);

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

  function goStep(n: number) {
    router.push(`/onboarding?step=${n}`);
  }

  async function scheduleFirstPost() {
    if (!postText.trim() || selectedIds.length === 0) return;
    setScheduling(true);
    setScheduleError(null);
    try {
      const asDraft = billingEnabled;
      await apiFetch("/jobs", {
        method: "POST",
        body: JSON.stringify({
          scheduledFor: asDraft ? undefined : fromWibInput(scheduledFor).toISOString(),
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
    <div className="min-h-screen flex flex-col items-center px-4 py-12 bg-bg">

      {/* Step indicator — skip on welcome */}
      {step > 1 && (
        <div className="mb-10 mt-5">
          <StepIndicator current={step} billingEnabled={billingEnabled} />
        </div>
      )}

      {/* ── Step 1: Welcome ───────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="w-full max-w-lg flex flex-col items-center text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-brand-300 bg-brand-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/posthivemain.png" alt="Posthive" className="w-10 h-10 rounded-xl object-cover" />
          </div>

          <h1 className="type-head-sb-3 mb-3 text-fg">
            Schedule smarter,<br />post everywhere.
          </h1>
          <p className="type-body-r-m mb-8 max-w-sm text-muted">
            Write once, publish to multiple social platforms Bluesky, Threads, Instagram, LinkedIn, YouTube, and more.
          </p>

          {/* Platform icons strip */}
          <div className="flex flex-wrap justify-center gap-2.5 mb-8">
            {WELCOME_PLATFORMS.map((p) => (
              <div
                key={p}
                className="w-10 h-10 rounded-xl flex items-center justify-center border border-border bg-surface"
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
                className="type-body-m-xs px-3 py-1.5 rounded-full border border-border bg-surface text-muted"
              >
                {f}
              </span>
            ))}
          </div>

          <button
            onClick={() => goStep(2)}
            className="btn-primary w-full max-w-xs py-3.5 transition-all active:scale-[0.98]"
          >
            Get started →
          </button>

          <p className="mt-4 type-body-r-xs text-muted">
            {billingEnabled
              ? "14-day free trial · no card required to start · cancel any time"
              : "Free to use · open source · self-hostable"}
          </p>
        </div>
      )}

      {/* ── Step 2: Connect accounts ──────────────────────────────────────────── */}
      {step === 2 && (
        <div className="w-full max-w-lg">
          {connected && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5 border border-green-200 bg-green-50">
              <svg className="w-4 h-4 shrink-0 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="type-body-r-s text-green-700">
                {connected.charAt(0).toUpperCase() + connected.slice(1)} connected!
              </p>
            </div>
          )}

          {oauthError && (
            <div className="px-4 py-3 rounded-xl mb-5 type-body-r-s border border-red-200 bg-red-50 text-red-600">
              ⚠️ {decodeURIComponent(oauthError)}
            </div>
          )}

          <div className="mb-5">
            <h1 className="type-head-sb-5 mb-1.5 text-fg">Connect your accounts</h1>
            <p className="type-body-r-s text-muted">Connect at least one platform to start scheduling.</p>
          </div>

          {/* Trial account note */}
          {billingEnabled && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-5 border border-brand-300 bg-brand-100">
              <svg className="w-4 h-4 shrink-0 text-brand-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="type-body-r-xs text-muted">
                Free trial includes <span className="type-body-sb-xs text-fg">3 connected accounts</span> connect more after upgrading.
              </p>
            </div>
          )}

          {/* Connected accounts list */}
          {accounts.length > 0 && (
            <div className="mb-5 space-y-2">
              {accounts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-green-200 bg-green-50">
                  <svg className="w-4 h-4 shrink-0 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <PlatformIcon platform={a.platform} size={16} />
                  <span className="type-body-sb-s text-fg">
                    {a.platform === "threads" ? "@" : ""}{a.displayName}
                  </span>
                  <span className="ml-auto type-body-r-xs capitalize text-green-700">{a.platform}</span>
                </div>
              ))}
            </div>
          )}

          {/* Trial limit reached — hide connect UI */}
          {billingEnabled && accounts.length >= 3 ? (
            <div className="card rounded-xl px-5 py-4 mb-6 text-center">
              <p className="type-body-sb-s mb-1 text-fg">Trial limit reached</p>
              <p className="type-body-r-xs text-muted">
                Your free trial includes 3 connected accounts. Upgrade after signing in to connect more.
              </p>
            </div>
          ) : (
            <>
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
                      className="card flex items-center gap-3 p-3.5 rounded-xl opacity-50 cursor-not-allowed"
                      title="Available on Pro and Team plans"
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-bg">
                        <PlatformIcon platform={platform} size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="type-body-sb-s text-fg">{label}</p>
                        <p className="type-body-r-xs truncate text-muted">{sub}</p>
                      </div>
                      <span className="type-body-sb-xs px-2 py-0.5 rounded-full shrink-0 border border-brand-400 bg-brand-100 text-brand-800">
                        Pro
                      </span>
                    </div>
                  ) : (
                    <a
                      key={platform}
                      href={`${API_BASE}${path}?from=onboarding`}
                      className="card flex items-center gap-3 p-3.5 rounded-xl transition-all hover:border-neutral-300"
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-bg">
                        <PlatformIcon platform={platform} size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="type-body-sb-s text-fg">{label}</p>
                        <p className="type-body-r-xs truncate text-muted">{sub}</p>
                      </div>
                      <span className="type-body-sb-xs px-2 py-0.5 rounded-full shrink-0 border border-border bg-bg text-muted">
                        Connect
                      </span>
                    </a>
                  )
                )}
              </div>

              <p className="type-body-r-xs mb-6 text-center text-muted">
                Instagram, Threads, Facebook, Pinterest, Mastodon, Telegram, Nostr & more →{" "}
                <span>available after setup in Settings</span>
              </p>
            </>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={() => goStep(3)}
              disabled={accounts.length === 0}
              className="btn-primary w-full py-3 transition-all active:scale-[0.98]"
            >
              {accounts.length === 0
                ? "Connect an account to continue"
                : `Continue with ${accounts.length} account${accounts.length > 1 ? "s" : ""} →`}
            </button>
            <button
              onClick={() => goStep(3)}
              className="type-body-r-xs text-center py-1 text-muted hover:opacity-70 transition-opacity"
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
            <h1 className="type-head-sb-5 mb-1.5 text-fg">Schedule your first post</h1>
            <p className="type-body-r-s text-muted">
              {accounts.length > 0
                ? "Write something, pick a time, and you're live."
                : "You can schedule from the compose page once you're set up."}
            </p>
          </div>

          {accounts.length === 0 && !loadingAccounts ? (
            <div className="card rounded-xl p-6 text-center mb-6">
              <p className="type-body-r-s mb-3 text-muted">No accounts connected yet.</p>
              <button onClick={() => goStep(2)} className="type-body-sb-s text-brand-800 hover:opacity-70">
                ← Connect an account first
              </button>
            </div>
          ) : (
            <div className="card rounded-xl overflow-hidden mb-6">
              {accounts.length > 0 && (
                <div className="px-5 pt-5 pb-4 border-b border-border">
                  <p className="section-label mb-3">POST TO</p>
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
                          className={cn(
                            "chip gap-2 px-3 py-1.5 rounded-full transition-all",
                            selected ? "chip-active" : "bg-bg",
                          )}
                        >
                          <PlatformIcon platform={a.platform} size={12} />
                          {a.displayName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="px-5 py-4 border-b border-border">
                <textarea
                  placeholder="What do you want to share today?"
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  rows={5}
                  className="w-full bg-transparent type-body-r-s text-fg resize-none focus:outline-hidden"
                  autoFocus
                />
                <div className="flex justify-end">
                  <span className={cn("type-body-r-xs", postText.length > 280 ? "text-brand-800" : "text-neutral-500")}>
                    {postText.length} / 300
                  </span>
                </div>
              </div>

              {!billingEnabled && (
                <div className="px-5 py-4 flex items-center gap-3">
                  <DateTimePicker value={scheduledFor} onChange={setScheduledFor} min={wibDateKey(new Date())} dropdownDirection="down" />
                </div>
              )}
              {billingEnabled && (
                <div className="px-5 py-3 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 shrink-0 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="type-body-r-xs text-muted">Saved as draft · activate after choosing a plan</span>
                </div>
              )}
            </div>
          )}

          {scheduleError && (
            <div className="px-4 py-3 rounded-xl mb-4 type-body-r-xs border border-red-200 bg-red-50 text-red-600">
              {scheduleError}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {accounts.length > 0 && (
              <button
                onClick={scheduleFirstPost}
                disabled={scheduling || !postText.trim() || selectedIds.length === 0}
                className="btn-primary w-full py-3 transition-all active:scale-[0.98]"
              >
                {scheduling ? "Saving…" : billingEnabled ? "Save draft & choose plan →" : "Schedule my first post"}
              </button>
            )}
            <button
              onClick={() => {
                if (billingEnabled) goStep(4);
                else router.replace("/compose?onboarded=1");
              }}
              className="type-body-r-xs text-center py-1 text-muted hover:opacity-70 transition-opacity"
            >
              {billingEnabled ? "Skip — choose a plan →" : "Skip — take me to the app"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Trial active + plan preview ──────────────────────────────── */}
      {step === 4 && billingEnabled && (
        <div className="w-full max-w-3xl">

          {/* Trial active banner */}
          <div className="rounded-2xl p-5 mb-7 border border-green-200 bg-green-50">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-green-200 bg-green-100">
                <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="type-body-sb-s mb-1 text-fg">
                  Your 14-day free trial is active 🎉
                </p>
                <p className="type-body-r-xs mb-3 text-muted">
                  Start scheduling right now no card needed. You get 14 days to explore everything. Pick a plan to keep access after the trial ends.
                </p>
                <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                  {[
                    { icon: "🔗", text: "3 connected accounts" },
                    { icon: "📅", text: "30 posts during trial" },
                    { icon: "🌐", text: "All 15 platforms" },
                    { icon: "📋", text: "Bulk CSV scheduling" },
                    { icon: "💬", text: "First comment automation" },
                  ].map(({ icon, text }) => (
                    <span key={text} className="flex items-center gap-1.5 type-body-r-xs text-muted">
                      <span>{icon}</span>
                      <span>{text}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={cn("card relative flex flex-col overflow-hidden", plan.popular && "border-brand-300")}
              >
                {plan.popular && <div className="h-px w-full bg-accent" />}

                <div className="p-5 flex-1 flex flex-col">
                  <div className="h-5 mb-3">
                    {plan.popular && (
                      <span
                        className="type-body-sb-xxs tracking-wide px-2 py-0.5 rounded-full bg-accent text-accent-fg"
                      >
                        MOST POPULAR
                      </span>
                    )}
                  </div>

                  <p className="type-body-sb-m mb-0.5 text-fg">{plan.name}</p>

                  <div className="flex items-baseline gap-1 mt-2 mb-1">
                    <span className="type-head-sb-4 tracking-tight text-fg">{planPrice(plan)}</span>
                    <span className="type-body-r-s text-muted">{plan.period}</span>
                  </div>
                  <p className="type-body-r-xs mb-4 text-muted">{isIndia ? "billed in INR" : "billed in USD"}</p>

                  <div className="flex gap-1.5 mb-4 flex-wrap">
                    <span
                      className="type-body-sb-xs px-2 py-0.5 rounded-lg border border-brand-300 bg-brand-100 text-brand-800"
                    >
                      {plan.maxAccounts} accounts
                    </span>
                    <span
                      className="type-body-sb-xs px-2 py-0.5 rounded-lg border border-brand-300 bg-brand-100 text-brand-800"
                    >
                      {plan.maxPosts}
                    </span>
                  </div>

                  <ul className="space-y-2 flex-1 mb-5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <svg className="w-3.5 h-3.5 shrink-0 mt-0.5 text-brand-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="type-body-r-xs text-muted">{f}</span>
                      </li>
                    ))}
                  </ul>

                </div>
              </div>
            ))}
          </div>

          {/* Primary CTA — go to app, no checkout required */}
          <button
            onClick={() => router.replace("/compose?onboarded=1")}
            className="btn-primary w-full py-3.5 transition-all active:scale-[0.98] mb-3"
          >
            Start posting →
          </button>

          <p className="text-center type-body-r-xs text-muted">
            Set up billing later in{" "}
            <button
              onClick={() => router.replace("/billing")}
              className="underline hover:opacity-70"
            >
              Settings → Billing
            </button>
            {" "}· cancel any time
          </p>
        </div>
      )}
    </div>
  );
}

// ── Page export with Suspense (required for useSearchParams in App Router) ─────
export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingContent />
    </Suspense>
  );
}
