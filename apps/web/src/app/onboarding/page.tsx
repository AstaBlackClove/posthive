"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { PlatformIcon } from "../../components/PlatformIcon";
import { useToast } from "../../components/Toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Account { id: string; platform: string; displayName: string; avatarUrl?: string | null; }

// ── Plans ──────────────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: "creator", name: "Creator", priceInr: "₹550", priceUsd: "$9", period: "/mo",
    color: "#5b63d3", maxAccounts: 5, maxPosts: "400 posts/mo",
    features: ["5 connected accounts", "400 scheduled posts/month", "Bluesky, Threads & Instagram", "Per-platform content customization", "Content calendar"],
  },
  {
    id: "pro", name: "Pro", priceInr: "₹1,700", priceUsd: "$29", period: "/mo",
    color: "#7c3aed", maxAccounts: 15, maxPosts: "Unlimited", popular: true,
    features: ["15 connected accounts", "Unlimited scheduled posts", "Everything in Creator", "Priority support"],
  },
  {
    id: "team", name: "Team", priceInr: "₹2,600", priceUsd: "$49", period: "/mo",
    color: "#0891b2", maxAccounts: 50, maxPosts: "Unlimited",
    features: ["50 connected accounts", "Unlimited scheduled posts", "3 team seats", "Everything in Pro"],
  },
];

// ── Step indicator ──────────────────────────────────────────────────────────────
function StepIndicator({ current, billingEnabled }: { current: number; billingEnabled: boolean }) {
  const steps = [
    ...(billingEnabled ? [{ n: 1, label: "Choose plan" }] : []),
    { n: billingEnabled ? 2 : 1, label: "Connect account" },
    { n: billingEnabled ? 3 : 2, label: "First post" },
  ];
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              s.n < current ? "bg-green-500 text-white" :
              s.n === current ? "text-white" : "text-gray-600"
            }`}
              style={s.n === current ? { backgroundColor: "#5b63d3" } :
                     s.n < current ? {} :
                     { backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
              {s.n < current ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : s.n}
            </div>
            <span className="text-[11px] font-medium whitespace-nowrap"
              style={{ color: s.n === current ? "#ededed" : s.n < current ? "#4ade80" : "#444" }}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="w-16 h-px mb-5 mx-2" style={{ backgroundColor: current > s.n ? "#4ade8040" : "#2a2a2a" }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Bluesky dialog (inline, no portal needed here) ─────────────────────────────
function BlueskyConnect({ onConnected }: { onConnected: () => void }) {
  const [open, setOpen] = useState(false);
  const [handle, setHandle] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true); setError(null);
    try {
      await apiFetch("/accounts/bluesky", {
        method: "POST",
        body: JSON.stringify({ handle: handle.replace(/^@/, ""), appPassword }),
      });
      setOpen(false); setHandle(""); setAppPassword("");
      onConnected();
    } catch (err) { setError(String(err)); }
    finally { setConnecting(false); }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-3 w-full p-4 rounded-2xl text-left transition-all hover:border-blue-500/40"
        style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
          <PlatformIcon platform="bluesky" size={22} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: "#ededed" }}>Bluesky</p>
          <p className="text-xs" style={{ color: "#555" }}>App password · no OAuth needed</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: "#1a1a1a", color: "#888", border: "1px solid #2a2a2a" }}>Connect →</span>
      </button>
    );
  }

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "#111111", border: "1px solid #5b63d340" }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#0a2040" }}>
          <PlatformIcon platform="bluesky" size={18} />
        </div>
        <p className="text-sm font-semibold" style={{ color: "#ededed" }}>Connect Bluesky</p>
        <button onClick={() => setOpen(false)} className="ml-auto text-xs hover:opacity-70" style={{ color: "#555" }}>Cancel</button>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <input placeholder="Handle — e.g. you.bsky.social" value={handle} onChange={e => setHandle(e.target.value)}
          required autoFocus
          className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/10 transition"
          style={{ backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", color: "#ededed" }} />
        <input type="password" placeholder="App password" value={appPassword} onChange={e => setAppPassword(e.target.value)}
          required
          className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/10 transition"
          style={{ backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", color: "#ededed" }} />
        {error && <p className="text-xs rounded-lg px-3 py-2" style={{ backgroundColor: "#1a0a0a", border: "1px solid #3a1a1a", color: "#f87171" }}>{error}</p>}
        <button type="submit" disabled={connecting}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 hover:bg-gray-100"
          style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
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
  const { success, error: toastError } = useToast();
  const billingEnabled = process.env.NEXT_PUBLIC_ENABLE_BILLING === "true";
  const stepParam = parseInt(searchParams.get("step") ?? (billingEnabled ? "1" : "2"));
  const step = Math.min(Math.max(stepParam, billingEnabled ? 1 : 2), 3);

  const [isIndia, setIsIndia] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Compose state (step 3)
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
    } catch { /* ignore */ }
    finally { setLoadingAccounts(false); }
  }

  useEffect(() => {
    if (step >= 2) {
      fetchAccounts();
      // Poll while on connect step so UI updates after OAuth redirect
      if (step === 2) {
        pollRef.current = setInterval(fetchAccounts, 3000);
      }
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function checkout(planId: string) {
    setCheckingOut(planId);
    try {
      const { url } = await apiFetch<{ url: string }>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ planId, successUrl: "/onboarding?step=2&trialStarted=1" }),
      });
      window.location.href = url;
    } catch (err) { toastError(String(err)); }
    finally { setCheckingOut(null); }
  }

  function goStep(n: number) {
    router.push(`/onboarding?step=${n}`);
  }

  async function scheduleFirstPost() {
    if (!postText.trim() || selectedIds.length === 0) return;
    setScheduling(true); setScheduleError(null);
    try {
      await apiFetch("/jobs", {
        method: "POST",
        body: JSON.stringify({
          scheduledFor: new Date(scheduledFor).toISOString(),
          content: { text: postText.trim(), mediaUrls: [] },
          accountIds: selectedIds,
        }),
      });
      router.replace("/?onboarded=1");
    } catch (err) { setScheduleError(String(err)); setScheduling(false); }
  }

  const planPrice = (p: typeof PLANS[number]) => isIndia ? p.priceInr : p.priceUsd;

  // ── Layout wrapper ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8" style={{ backgroundColor: "#0a0a0a" }}>

      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10 self-start w-full max-w-3xl">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#5b63d3" }}>
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>
        <span className="font-bold text-sm" style={{ color: "#ededed" }}>Posthive</span>
      </div>

      {/* Step indicator */}
      <div className="mb-10">
        <StepIndicator current={step} billingEnabled={billingEnabled} />
      </div>

      {/* ── Step 1: Choose plan ─────────────────────────────────────────────── */}
      {step === 1 && billingEnabled && (
        <div className="w-full max-w-3xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2" style={{ color: "#ededed" }}>Start your 14-day free trial</h1>
            <p className="text-sm" style={{ color: "#555" }}>
              Choose a plan and enter your card — you won&apos;t be charged until the trial ends.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {PLANS.map((plan) => (
              <div key={plan.id} className="relative rounded-2xl flex flex-col overflow-hidden"
                style={{
                  backgroundColor: "#111111",
                  border: plan.popular ? `1px solid ${plan.color}40` : "1px solid #2a2a2a",
                }}>
                {plan.popular && <div className="h-px w-full" style={{ backgroundColor: plan.color }} />}

                <div className="p-5 flex-1 flex flex-col">
                  <div className="h-5 mb-3">
                    {plan.popular && (
                      <span className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${plan.color}18`, color: plan.color, border: `1px solid ${plan.color}35` }}>
                        MOST POPULAR
                      </span>
                    )}
                  </div>

                  <p className="font-bold text-base mb-0.5" style={{ color: "#ededed" }}>{plan.name}</p>

                  <div className="flex items-baseline gap-1 mt-2 mb-1">
                    <span className="text-3xl font-bold tracking-tight" style={{ color: "#ededed" }}>
                      {planPrice(plan)}
                    </span>
                    <span className="text-sm" style={{ color: "#444" }}>{plan.period}</span>
                  </div>
                  <p className="text-[11px] mb-4" style={{ color: "#333" }}>
                    {isIndia ? "billed in INR" : "billed in USD"}
                  </p>

                  {/* Key chips */}
                  <div className="flex gap-1.5 mb-4 flex-wrap">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg"
                      style={{ backgroundColor: plan.color + "15", color: plan.color, border: `1px solid ${plan.color}30` }}>
                      {plan.maxAccounts} accounts
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg"
                      style={{ backgroundColor: plan.color + "15", color: plan.color, border: `1px solid ${plan.color}30` }}>
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

                  <button onClick={() => checkout(plan.id)} disabled={!!checkingOut}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 active:scale-[0.98]"
                    style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                    {checkingOut === plan.id ? "Opening checkout…" : "Start free trial →"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs" style={{ color: "#333" }}>
            14 days free · card required · cancel any time · {isIndia ? "billed in INR" : "billed in USD"}
          </p>
        </div>
      )}

      {/* ── Step 2: Connect account ─────────────────────────────────────────── */}
      {step === 2 && (
        <div className="w-full max-w-lg">
          {searchParams.get("trialStarted") && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-6"
              style={{ backgroundColor: "#052e16", border: "1px solid #14532d" }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#4ade80" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm" style={{ color: "#4ade80" }}>
                Trial started! Your card won&apos;t be charged for 14 days.
              </p>
            </div>
          )}

          {connected && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-6"
              style={{ backgroundColor: "#052e16", border: "1px solid #14532d" }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#4ade80" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm" style={{ color: "#4ade80" }}>
                {connected.charAt(0).toUpperCase() + connected.slice(1)} connected successfully!
              </p>
            </div>
          )}

          {oauthError && (
            <div className="px-4 py-3 rounded-2xl mb-6 text-sm"
              style={{ backgroundColor: "#1a0a0a", border: "1px solid #3a1a1a", color: "#f87171" }}>
              ⚠️ {decodeURIComponent(oauthError)}
            </div>
          )}

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2" style={{ color: "#ededed" }}>Connect a social account</h1>
            <p className="text-sm" style={{ color: "#555" }}>
              Connect at least one account so you can start scheduling posts.
            </p>
          </div>

          {/* Connected accounts */}
          {accounts.length > 0 && (
            <div className="mb-4 space-y-2">
              {accounts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ backgroundColor: "#0a1a0a", border: "1px solid #14532d" }}>
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

          {/* Platform connect cards */}
          <div className="space-y-3 mb-6">
            <BlueskyConnect onConnected={fetchAccounts} />

            <a href={`${API_BASE}/auth/threads?from=onboarding`}
              className="flex items-center gap-3 w-full p-4 rounded-2xl text-left transition-all hover:border-gray-500/40"
              style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#1a1a1a" }}>
                <PlatformIcon platform="threads" size={22} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: "#ededed" }}>Threads</p>
                <p className="text-xs" style={{ color: "#555" }}>Meta OAuth 2.0</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: "#1a1a1a", color: "#888", border: "1px solid #2a2a2a" }}>Connect →</span>
            </a>

            <a href={`${API_BASE}/auth/instagram?from=onboarding`}
              className="flex items-center gap-3 w-full p-4 rounded-2xl text-left transition-all hover:border-pink-500/20"
              style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)" }}>
                <PlatformIcon platform="instagram" size={22} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: "#ededed" }}>Instagram</p>
                <p className="text-xs" style={{ color: "#555" }}>Business / Creator account required</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: "#1a1a1a", color: "#888", border: "1px solid #2a2a2a" }}>Connect →</span>
            </a>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={() => goStep(3)}
              disabled={accounts.length === 0}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 active:scale-[0.98]"
              style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
              {accounts.length === 0 ? "Connect an account to continue" : `Continue with ${accounts.length} account${accounts.length > 1 ? "s" : ""} →`}
            </button>
            <button onClick={() => goStep(3)}
              className="text-xs text-center py-1 hover:opacity-70 transition-opacity"
              style={{ color: "#444" }}>
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Schedule first post ─────────────────────────────────────── */}
      {step === 3 && (
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2" style={{ color: "#ededed" }}>Schedule your first post</h1>
            <p className="text-sm" style={{ color: "#555" }}>
              {accounts.length > 0
                ? "Write something, pick a time, and you're live."
                : "You can also schedule from the compose page once you're in."}
            </p>
          </div>

          {accounts.length === 0 && !loadingAccounts ? (
            <div className="rounded-2xl p-6 text-center mb-6"
              style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
              <p className="text-sm mb-3" style={{ color: "#666" }}>No accounts connected yet.</p>
              <button onClick={() => goStep(2)}
                className="text-sm font-semibold hover:opacity-70" style={{ color: "#5b63d3" }}>
                ← Connect an account first
              </button>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden mb-6"
              style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>

              {/* Account selector */}
              {accounts.length > 0 && (
                <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid #1a1a1a" }}>
                  <p className="text-xs font-semibold mb-3" style={{ color: "#555" }}>POST TO</p>
                  <div className="flex flex-wrap gap-2">
                    {accounts.map((a) => {
                      const selected = selectedIds.includes(a.id);
                      return (
                        <button key={a.id} onClick={() => {
                          setSelectedIds(prev =>
                            prev.includes(a.id) ? prev.filter(id => id !== a.id) : [...prev, a.id]
                          );
                        }}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                          style={selected
                            ? { backgroundColor: "#5b63d320", color: "#ededed", border: "1px solid #5b63d360" }
                            : { backgroundColor: "#1a1a1a", color: "#555", border: "1px solid #2a2a2a" }}>
                          <PlatformIcon platform={a.platform} size={12} />
                          {a.displayName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Caption */}
              <div className="px-5 py-4" style={{ borderBottom: "1px solid #1a1a1a" }}>
                <textarea
                  placeholder="What do you want to share today?"
                  value={postText}
                  onChange={e => setPostText(e.target.value)}
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

              {/* Scheduled time */}
              <div className="px-5 py-4 flex items-center gap-3">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#555" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={e => setScheduledFor(e.target.value)}
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                  style={{ color: "#ededed", colorScheme: "dark" }}
                />
              </div>
            </div>
          )}

          {scheduleError && (
            <div className="px-4 py-3 rounded-xl mb-4 text-xs"
              style={{ backgroundColor: "#1a0a0a", border: "1px solid #3a1a1a", color: "#f87171" }}>
              {scheduleError}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {accounts.length > 0 && (
              <button
                onClick={scheduleFirstPost}
                disabled={scheduling || !postText.trim() || selectedIds.length === 0}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 active:scale-[0.98]"
                style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                {scheduling ? "Scheduling…" : "Schedule my first post →"}
              </button>
            )}
            <button
              onClick={() => router.replace("/?onboarded=1")}
              className="text-xs text-center py-1 hover:opacity-70 transition-opacity"
              style={{ color: "#444" }}>
              Skip — take me to the app
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
