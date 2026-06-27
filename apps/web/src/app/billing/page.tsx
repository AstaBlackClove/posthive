"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { useToast } from "../../components/Toast";

interface BillingStatus {
  plan: string;
  planStatus: string;
  planName: string;
  maxAccounts: number;
  maxSeats: number;
  maxPostsPerMonth: number | null;
  accountsUsed: number;
  postsThisMonth: number;
  trialDaysLeft: number;
  trialExpired: boolean;
  trialEndsAt: string | null;
}

const PLANS = [
  {
    id: "creator",
    name: "Creator",
    priceInr: "₹550",
    priceUsd: "$9",
    period: "/mo",
    description: "For solo creators building their audience",
    color: "#5b63d3",
    maxAccounts: 5,
    maxPostsPerMonth: 400,
    features: [
      { text: "5 connected accounts", key: true },
      { text: "400 scheduled posts / month", key: true },
      { text: "Up to 4 images per post", key: false },
      { text: "Per-platform content customization", key: false },
      { text: "Content calendar view", key: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceInr: "₹1,700",
    priceUsd: "$29",
    period: "/mo",
    description: "For power users who post without limits",
    color: "#7c3aed",
    maxAccounts: 15,
    maxPostsPerMonth: null,
    popular: true,
    features: [
      { text: "15 connected accounts", key: true },
      { text: "Unlimited scheduled posts", key: true },
      { text: "Everything in Creator", key: false },
      { text: "Priority support", key: false },
    ],
  },
  {
    id: "team",
    name: "Team",
    priceInr: "₹2,600",
    priceUsd: "$49",
    period: "/mo",
    description: "For agencies & small teams",
    color: "#0891b2",
    maxAccounts: 50,
    maxPostsPerMonth: null,
    features: [
      { text: "50 connected accounts", key: true },
      { text: "Unlimited scheduled posts", key: true },
      { text: "3 team seats", key: true },
      { text: "Everything in Pro", key: false },
    ],
  },
];

function StatusBadge({ status, trialDaysLeft }: { status: string; trialDaysLeft: number }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ backgroundColor: "#052e16", color: "#4ade80", border: "1px solid #14532d" }}>
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        Active
      </span>
    );
  }
  if (status === "trialing") {
    const urgent = trialDaysLeft <= 3;
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{
          backgroundColor: urgent ? "#1c1209" : "#1c1a10",
          color: urgent ? "#fb923c" : "#fbbf24",
          border: `1px solid ${urgent ? "#7c2d12" : "#78560a"}`,
        }}>
        <span className={`w-1.5 h-1.5 rounded-full ${urgent ? "bg-orange-400 animate-pulse" : "bg-amber-400"}`} />
        {trialDaysLeft === 0 ? "Trial ends today" : `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left`}
      </span>
    );
  }
  if (status === "on_hold") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ backgroundColor: "#1f0a0a", color: "#f87171", border: "1px solid #7f1d1d" }}>
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
        Payment failed
      </span>
    );
  }
  if (status === "cancelling") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ backgroundColor: "#1c1209", color: "#fb923c", border: "1px solid #7c2d12" }}>
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
        Cancels at period end
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ backgroundColor: "#1a1a1a", color: "#666", border: "1px solid #2a2a2a" }}>
        Cancelled
      </span>
    );
  }
  return null;
}

function UsageBar({
  label, used, max, color, warningAt = 80,
}: {
  label: string; used: number; max: number | null; color: string; warningAt?: number;
}) {
  if (max === null) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: "#aaaaaa" }}>{label}</span>
        <span className="text-xs font-semibold" style={{ color: "#ededed" }}>{used} <span style={{ color: "#444" }}>/ ∞</span></span>
      </div>
    );
  }
  const pct = max === 0 ? 100 : Math.min(100, Math.round((used / max) * 100));
  const isHigh = pct >= warningAt;
  const isFull = pct >= 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium" style={{ color: "#aaaaaa" }}>{label}</span>
        <span className="text-xs font-semibold tabular-nums"
          style={{ color: isFull ? "#ef4444" : isHigh ? "#fb923c" : "#ededed" }}>
          {used} <span style={{ color: "#666" }}>/ {max}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#1f1f1f" }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: isFull ? "#ef4444" : isHigh ? "#fb923c" : color }} />
      </div>
      {isFull && (
        <p className="mt-1.5 text-xs" style={{ color: "#fb923c" }}>
          Limit reached — upgrade to continue.
        </p>
      )}
    </div>
  );
}

const CANCEL_REASONS = [
  "Too expensive",
  "Missing features I need",
  "Found a better alternative",
  "Only needed it temporarily",
  "Technical issues",
  "Other",
];

function CancelModal({ onConfirm, onClose, loading }: {
  onConfirm: (reason: string, feedback: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
        <h2 className="text-base font-bold mb-1" style={{ color: "#ededed" }}>Cancel subscription</h2>
        <p className="text-xs mb-5" style={{ color: "#777" }}>
          You&apos;ll keep access until the end of the current billing period.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-2">
              Why are you cancelling? <span style={{ color: "#999" }}>(optional)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CANCEL_REASONS.map((r) => (
                <button key={r} onClick={() => setReason(reason === r ? "" : r)}
                  className="text-left text-xs px-3 py-2 rounded-xl transition-all"
                  style={reason === r
                    ? { backgroundColor: "#1a1a3a", color: "#ededed", border: "1px solid #5b63d350" }
                    : { backgroundColor: "#0a0a0a", color: "#999", border: "1px solid #4d4d4d" }}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2">
              Anything else we should know? <span style={{ color: "#999" }}>(optional)</span>
            </label>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              rows={3}
              placeholder="Help us improve Posthive…"
              className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-white/10"
              style={{ backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", color: "#ededed" }}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:bg-gray-100"
            style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
            Keep subscription
          </button>
          <button onClick={() => onConfirm(reason, feedback)} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "#1a0a0a", color: "#f87171", border: "1px solid #3a1a1a" }}>
            {loading ? "Cancelling…" : "Confirm cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelDone, setCancelDone] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isIndia, setIsIndia] = useState(true);
  const { success: toastSuccess, error: toastError } = useToast();
  const success = searchParams.get("success");

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setIsIndia(tz === "Asia/Kolkata");
  }, []);

  useEffect(() => {
    apiFetch<BillingStatus>("/billing/status")
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

  async function checkout(planId: string) {
    setCheckingOut(planId);
    try {
      // Existing subscribers (trialing or active) — change plan in place, no new checkout
      if (isTrialing || isActive) {
        await apiFetch("/billing/change-plan", {
          method: "POST",
          body: JSON.stringify({ planId }),
        });
        setStatus((s) => s ? { ...s, plan: planId } : s);
        toastSuccess("Plan updated successfully!");
        return;
      }
      // New users — open Dodo checkout
      const { url } = await apiFetch<{ url: string }>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ planId }),
      });
      window.location.href = url;
    } catch (err) {
      toastError(String(err));
    } finally {
      setCheckingOut(null);
    }
  }

  async function cancelSubscription(reason: string, feedback: string) {
    setCancelling(true);
    try {
      await apiFetch("/billing/cancel", {
        method: "POST",
        body: JSON.stringify({ reason: reason || undefined, feedback: feedback || undefined }),
      });
      setCancelDone(true);
      setShowCancelModal(false);
      setStatus((s) => s ? { ...s, planStatus: "cancelling" } : s);
      toastSuccess("Subscription cancelled — you'll keep access until the billing period ends.");
    } catch (err) {
      toastError(String(err));
    } finally {
      setCancelling(false);
    }
  }

  const currentPlanDef = PLANS.find((p) => p.id === status?.plan);
  const isInactive = status?.planStatus === "inactive";
  const isTrialing = status?.planStatus === "trialing";
  const isCancelled = status?.planStatus === "cancelled";
  const isCancelling = status?.planStatus === "cancelling";
  const isOnHold = status?.planStatus === "on_hold";
  const isActive = status?.planStatus === "active";

  const now = new Date();
  const monthName = now.toLocaleString("default", { month: "long" });
  const planPrice = (plan: typeof PLANS[number]) => isIndia ? plan.priceInr : plan.priceUsd;

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ backgroundColor: "#0a0a0a" }}>
      {showCancelModal && (
        <CancelModal
          onConfirm={cancelSubscription}
          onClose={() => setShowCancelModal(false)}
          loading={cancelling}
        />
      )}

      {/* Header */}
      <div className="px-8 flex-shrink-0 flex items-center" style={{ height: 65, borderBottom: "1px solid #2a2a2a" }}>
        <div>
          <h1 className="text-lg font-bold" style={{ color: "#ededed" }}>
            {isInactive ? "Start your free trial" : "Billing & Plans"}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "#aaaaaa" }}>
            {isInactive
              ? "Choose a plan and enter your card — you won't be charged for 14 days."
              : "Manage your subscription and usage"}
          </p>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">

        {/* Inactive welcome banner */}
        {isInactive && !success && (
          <div className="rounded-2xl p-6 flex items-start gap-5"
            style={{ backgroundColor: "#0d0d1a", border: "1px solid #2a2a5a" }}>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#5b63d318", border: "1px solid #5b63d335" }}>
              <svg className="w-5 h-5" fill="none" stroke="#5b63d3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-sm mb-1" style={{ color: "#ededed" }}>Card required to start your trial</p>
              <p className="text-xs leading-relaxed" style={{ color: "#666" }}>
                We use Dodo Payments to securely store your card. You won&apos;t be charged anything during the
                14-day trial — cancel any time before it ends and you pay nothing.
              </p>
              <div className="flex items-center gap-4 mt-3">
                {["No charge for 14 days", "Cancel any time", "Secure via Dodo"].map((t) => (
                  <div key={t} className="flex items-center gap-1.5 text-xs" style={{ color: "#555" }}>
                    <svg className="w-3 h-3" fill="none" stroke="#5b63d3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Success banner */}
        {success && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl"
            style={{ backgroundColor: "#052e16", border: "1px solid #14532d" }}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="#4ade80" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#4ade80" }}>Trial started — you&apos;re all set!</p>
              <p className="text-xs mt-0.5" style={{ color: "#86efac" }}>Your 14-day free trial is now active. No charge until it ends.</p>
            </div>
          </div>
        )}

        {/* Status banners */}
        {isOnHold && (
          <div className="flex items-start gap-3 px-5 py-4 rounded-2xl"
            style={{ backgroundColor: "#1f0a0a", border: "1px solid #7f1d1d" }}>
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="#f87171" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#f87171" }}>Payment failed</p>
              <p className="text-xs mt-1" style={{ color: "#888" }}>
                We couldn&apos;t process your last payment. Update your payment method via the Dodo customer portal to restore full access.
              </p>
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="flex items-start gap-3 px-5 py-4 rounded-2xl"
            style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="#555" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#888" }}>Subscription cancelled</p>
              <p className="text-xs mt-1" style={{ color: "#555" }}>
                Your access has ended. Subscribe to a plan below to continue scheduling posts.
              </p>
            </div>
          </div>
        )}

        {/* Current plan card — hidden for new users who haven't started a trial */}
        {!loading && status && !isCancelled && !isInactive && !loading && (
          <div className="rounded-2xl p-6" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-3">
                  Current plan
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-bold" style={{ color: "#ededed" }}>{status.planName}</h2>
                  <StatusBadge status={status.planStatus} trialDaysLeft={status.trialDaysLeft} />
                </div>
                {isTrialing && status.trialEndsAt && (
                  <p className="text-xs mt-2">
                    Trial expires{" "}
                    <span style={{ color: "#888" }}>
                      {new Date(status.trialEndsAt).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}
                    </span>
                    {status.trialDaysLeft <= 3
                      ? " — subscribe now to avoid losing access."
                      : "."}
                  </p>
                )}
                {(isActive || isCancelling) && (
                  <p className="text-xs mt-1.5" style={{ color: "#555" }}>
                    {status.maxAccounts} accounts · {status.maxPostsPerMonth === null ? "unlimited posts" : `${status.maxPostsPerMonth} posts/month`}
                  </p>
                )}
              </div>
              {(isActive || isTrialing) && !isCancelling && (
                <a href="https://app.dodopayments.com" target="_blank" rel="noreferrer"
                  className="flex-shrink-0 text-xs font-medium px-4 py-2 rounded-xl transition-opacity hover:opacity-70"
                  style={{ backgroundColor: "#161616", color: "#999", border: "1px solid #555" }}>
                  Manage ↗
                </a>
              )}
            </div>

            {/* Cancelling notice */}
            {(isCancelling || cancelDone) && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl mb-4"
                style={{ backgroundColor: "#1c1209", border: "1px solid #7c2d1230" }}>
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="#fb923c" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs" style={{ color: "#888" }}>
                  Your subscription will be cancelled at the end of the current billing period. You keep full access until then.
                </p>
              </div>
            )}

            {/* Usage bars */}
            <div className="pt-5 space-y-4" style={{ borderTop: "1px solid #2a2a2a" }}>
              <UsageBar
                label="Connected accounts"
                used={status.accountsUsed}
                max={status.maxAccounts}
                color={currentPlanDef?.color ?? "#5b63d3"}
              />
              <UsageBar
                label={`Scheduled posts - ${monthName}`}
                used={status.postsThisMonth}
                max={status.maxPostsPerMonth}
                color={currentPlanDef?.color ?? "#5b63d3"}
                warningAt={85}
              />
            </div>

            {/* Cancel link */}
            {(isActive || isTrialing) && !isCancelling && !cancelDone && (
              <div className="mt-5 pt-4 flex justify-end" style={{ borderTop: "1px solid #2a2a2a" }}>
                <button onClick={() => setShowCancelModal(true)}
                  className="text-xs underline transition-opacity hover:opacity-70"
                  style={{ color: "#ef4444" }}>
                  Cancel subscription
                </button>
              </div>
            )}
          </div>
        )}

        {/* Skeleton */}
        {loading && (
          <div className="rounded-2xl p-6 animate-pulse" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
            <div className="h-3 w-20 rounded mb-3" style={{ backgroundColor: "#2a2a2a" }} />
            <div className="h-7 w-36 rounded mb-2" style={{ backgroundColor: "#2a2a2a" }} />
            <div className="mt-5 pt-5 space-y-3" style={{ borderTop: "1px solid #2a2a2a" }}>
              <div className="h-2 w-full rounded" style={{ backgroundColor: "#2a2a2a" }} />
              <div className="h-2 w-full rounded" style={{ backgroundColor: "#2a2a2a" }} />
            </div>
          </div>
        )}

        {/* Plan cards */}
        <div>
          {!isInactive && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold" style={{ color: "#ededed" }}>
                {isActive ? "Switch plan" : isTrialing ? "Upgrade your plan" : "Choose a plan"}
              </h3>
              <p className="text-xs mt-1" style={{ color: "#444" }}>
                {isTrialing
                  ? "Upgrade now your card is already on file, charged immediately"
                  : "14-day trial on every plan · credit card required · cancel anytime"}
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            {PLANS.map((plan) => {
              const isCurrent = status?.plan === plan.id && (isActive || isTrialing);
              const planOrder = ["creator", "pro", "team"];
              const currentIdx = planOrder.indexOf(status?.plan ?? "");
              const thisIdx = planOrder.indexOf(plan.id);
              const isUpgrade = thisIdx > currentIdx;
              const changeLabel = isUpgrade ? `Upgrade to ${plan.name} →` : `Downgrade to ${plan.name}`;

              return (
                <div key={plan.id} className="relative rounded-2xl flex flex-col overflow-hidden"
                  style={{
                    backgroundColor: "#111111",
                    border: isCurrent
                      ? `1px solid ${plan.color}60`
                      : plan.popular
                      ? `1px solid ${plan.color}35`
                      : "1px solid #2a2a2a",
                  }}>

                  {plan.popular && <div className="h-px w-full" style={{ backgroundColor: plan.color }} />}

                  <div className="p-6 flex-1 flex flex-col">
                    <div className="mb-4 h-5 flex items-center gap-2">
                      {plan.popular && (
                        <span className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${plan.color}18`, color: plan.color, border: `1px solid ${plan.color}35` }}>
                          MOST POPULAR
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: "#1a1a1a", color: "#555", border: "1px solid #2a2a2a" }}>
                          CURRENT PLAN
                        </span>
                      )}
                    </div>

                    <p className="font-bold text-base" style={{ color: "#ededed" }}>{plan.name}</p>
                    <p className="text-xs mt-1 mb-4" style={{ color: "#555" }}>{plan.description}</p>

                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-3xl font-bold tracking-tight" style={{ color: "#ededed" }}>{planPrice(plan)}</span>
                      <span className="text-sm">{plan.period}</span>
                    </div>
                    <p className="text-[11px] mb-4">{isIndia ? "billed in INR" : "billed in USD"}</p>

                    <div className="flex gap-2 mb-5 flex-wrap">
                      <span className="text-[11px] font-semibold px-2 py-1 rounded-lg"
                        style={{ backgroundColor: plan.color + "15", color: plan.color, border: `1px solid ${plan.color}30` }}>
                        {plan.maxAccounts} accounts
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-1 rounded-lg"
                        style={{ backgroundColor: plan.color + "15", color: plan.color, border: `1px solid ${plan.color}30` }}>
                        {plan.maxPostsPerMonth === null ? "∞ posts/mo" : `${plan.maxPostsPerMonth} posts/mo`}
                      </span>
                    </div>

                    <ul className="space-y-2.5 flex-1 mb-6">
                      {plan.features.map((f) => (
                        <li key={f.text} className="flex items-start gap-2.5">
                          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            style={{ color: f.key ? plan.color : "#666" }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm leading-snug" style={{ color: f.key ? "#ccc" : "#999" }}>{f.text}</span>
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                        style={{ backgroundColor: "#161616", color: "#555", border: "1px solid #222" }}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Current plan
                      </div>
                    ) : (
                      <button onClick={() => checkout(plan.id)} disabled={!!checkingOut}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 active:scale-[0.98]"
                        style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
                        {checkingOut === plan.id ? ((isTrialing || isActive) ? "Switching plan…" : "Opening checkout…") : (isTrialing || isActive) ? changeLabel : "Start free trial →"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-center text-xs">
            {isIndia ? "Prices in Indian Rupees (INR)" : "Prices in US Dollars (USD)"} · billed monthly · all plans include a 14-day trial
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-8 pb-4">
          {[
            { path: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", text: "Secure checkout via Dodo" },
            { path: "M6 18L18 6M6 6l12 12", text: "Cancel anytime" },
            { path: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4", text: "Self-hostable & open source" },
          ].map(({ path, text }) => (
            <div key={text} className="flex items-center gap-2 text-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
              </svg>
              {text}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
