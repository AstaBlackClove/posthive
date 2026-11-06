"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { cn } from "../../lib/cn";
import { useToast } from "../../components/Toast";
import { isOwnerRole } from "../../lib/permissions";
import { trackEvent } from "../../lib/track";
import { useAuth } from "../../context/AuthContext";

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
  hasDodoSub: boolean;
  workspaceId: string;
  workspaceName: string;
}

const PLANS = [
  {
    id: "creator",
    name: "Creator",
    priceInr: "₹550",
    priceUsd: "$9",
    period: "/mo",
    description: "For solo creators building their audience",
    maxAccounts: 5,
    maxPostsPerMonth: 400,
    features: [
      { text: "5 connected accounts", included: true },
      { text: "400 posts / month", included: true },
      { text: "Multi platforms", included: true },
      { text: "Bulk CSV scheduling", included: true },
      { text: "Post templates", included: true },
      { text: "Calendar & drag-reschedule", included: true },
      { text: "First comment automation", included: true },
      { text: "1 team member", included: true },
      { text: "Reels & Stories", included: true },
      { text: "Per-platform overrides", included: true },
      { text: "Content Library (1,000 items)", included: true },
      { text: "X/Twitter posting", included: false },
      { text: "API access & MCP", included: false },
      { text: "Webhook outbound", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceInr: "₹1,700",
    priceUsd: "$29",
    period: "/mo",
    description: "For power users who post without limits",
    maxAccounts: 15,
    maxPostsPerMonth: null,
    popular: true,
    features: [
      { text: "15 connected accounts", included: true },
      { text: "Unlimited posts", included: true },
      { text: "Multi platforms", included: true },
      { text: "Bulk CSV scheduling", included: true },
      { text: "Post templates", included: true },
      { text: "Calendar & drag-reschedule", included: true },
      { text: "First comment automation", included: true },
      { text: "2 team members", included: true },
      { text: "Reels & Stories", included: true },
      { text: "Per-platform overrides", included: true },
      { text: "Content Library (20,000 items)", included: true },
      { text: "X/Twitter posting (100/mo)", included: true },
      { text: "API access & MCP", included: true },
      { text: "Webhook outbound", included: true },
    ],
  },
  {
    id: "team",
    name: "Team",
    priceInr: "₹2,600",
    priceUsd: "$49",
    period: "/mo",
    description: "For agencies & small teams",
    maxAccounts: 50,
    maxPostsPerMonth: null,
    features: [
      { text: "50 connected accounts", included: true },
      { text: "Unlimited posts", included: true },
      { text: "Multi platforms", included: true },
      { text: "Bulk CSV scheduling", included: true },
      { text: "Post templates", included: true },
      { text: "Calendar & drag-reschedule", included: true },
      { text: "First comment automation", included: true },
      { text: "4 team members", included: true },
      { text: "Reels & Stories", included: true },
      { text: "Per-platform overrides", included: true },
      { text: "Content Library (100,000 items)", included: true },
      { text: "X/Twitter posting (100/mo)", included: true },
      { text: "API access & MCP", included: true },
      { text: "Webhook outbound", included: true },
    ],
  },
];

function StatusBadge({ status, trialDaysLeft, trialEndsAt }: { status: string; trialDaysLeft: number; trialEndsAt?: string | null }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 type-body-sb-xs px-2.5 py-1 rounded-full border border-green-200 bg-green-50 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        Active
      </span>
    );
  }
  if (status === "trialing") {
    const expired = trialEndsAt ? new Date(trialEndsAt) < new Date() : false;
    if (expired) {
      return (
        <span className="inline-flex items-center gap-1.5 type-body-sb-xs px-2.5 py-1 rounded-full border border-red-200 bg-red-50 text-red-600">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          Trial ended
        </span>
      );
    }
    const urgent = trialDaysLeft <= 3;
    return (
      <span className={cn(
        "inline-flex items-center gap-1.5 type-body-sb-xs px-2.5 py-1 rounded-full border",
        urgent ? "border-brand-400 bg-brand-100 text-brand-800" : "border-border bg-bg text-fg",
      )}>
        <span className={cn("w-1.5 h-1.5 rounded-full", urgent ? "bg-brand-700 animate-pulse" : "bg-accent")} />
        {trialDaysLeft === 0 ? "Trial ends today" : `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left`}
      </span>
    );
  }
  if (status === "on_hold") {
    return (
      <span className="inline-flex items-center gap-1.5 type-body-sb-xs px-2.5 py-1 rounded-full border border-red-200 bg-red-50 text-red-600">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        Payment failed
      </span>
    );
  }
  if (status === "cancelling") {
    return (
      <span className="inline-flex items-center gap-1.5 type-body-sb-xs px-2.5 py-1 rounded-full border border-brand-400 bg-brand-100 text-brand-800">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-700" />
        Cancels at period end
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1.5 type-body-sb-xs px-2.5 py-1 rounded-full border border-border bg-surface text-muted">
        Cancelled
      </span>
    );
  }
  return null;
}

function UsageBar({
  label, used, max, warningAt = 80,
}: {
  label: string; used: number; max: number | null; warningAt?: number;
}) {
  if (max === null) {
    return (
      <div className="flex items-center justify-between">
        <span className="type-body-m-xs text-muted">{label}</span>
        <span className="type-body-sb-xs text-fg">{used} <span className="text-neutral-500">/ ∞</span></span>
      </div>
    );
  }
  const pct = max === 0 ? 100 : Math.min(100, Math.round((used / max) * 100));
  const isHigh = pct >= warningAt;
  const isFull = pct >= 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="type-body-m-xs text-muted">{label}</span>
        <span className={cn("type-body-sb-xs tabular-nums", isFull ? "text-red-600" : isHigh ? "text-brand-800" : "text-fg")}>
          {used} <span className="text-neutral-500">/ {max}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden bg-neutral-100">
        <div className={cn("h-full w-(--w) rounded-full transition-all duration-700", isFull ? "bg-red-500" : isHigh ? "bg-brand-700" : "bg-accent")}
          style={{ "--w": `${pct}%` } as React.CSSProperties} />
      </div>
      {isFull && (
        <p className="mt-1.5 type-body-r-xs text-brand-800">
          Limit reached - upgrade to continue.
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
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-6">
        <h2 className="type-body-sb-m mb-1 text-fg">Cancel subscription</h2>
        <p className="type-body-r-xs mb-5 text-muted">
          You&apos;ll keep access until the end of the current billing period.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block type-body-sb-xs mb-2">
              Why are you cancelling? <span className="text-muted">(optional)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CANCEL_REASONS.map((r) => (
                <button key={r} onClick={() => setReason(reason === r ? "" : r)}
                  className={cn(
                    "text-left type-body-r-xs px-3 py-2 rounded-xl border transition-all",
                    reason === r
                      ? "border-brand-300 bg-brand-100 text-brand-800"
                      : "border-border bg-bg text-muted hover:text-fg",
                  )}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block type-body-sb-xs mb-2">
              Anything else we should know? <span className="text-muted">(optional)</span>
            </label>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              rows={3}
              placeholder="Help us improve Posthive…"
              className="field px-4 py-3 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose}
            className="btn-primary flex-1 py-2.5">
            Keep subscription
          </button>
          <button onClick={() => onConfirm(reason, feedback)} disabled={loading}
            className="btn-secondary flex-1 py-2.5 border-red-200 text-red-600 hover:bg-red-50">
            {loading ? "Cancelling…" : "Confirm cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BillingContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  // Session role; shown while the session loads (the API still refuses a non-owner)
  const isOwner = !user || isOwnerRole(user.role);
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
    const tz = user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    setIsIndia(tz === "Asia/Kolkata");
  }, [user?.timezone]);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_BILLING !== "true") { setLoading(false); return; }
    apiFetch<BillingStatus>("/billing/status")
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

  async function checkout(planId: string) {
    setCheckingOut(planId);
    trackEvent("checkout_clicked", { planId, isTrialing, isActive });
    try {
      // Existing subscribers (trialing, active, or cancelling) — change plan in place, no new checkout
      if (isTrialing || isActive || isCancelling) {
        const result = await apiFetch<{ ok?: boolean; url?: string }>("/billing/change-plan", {
          method: "POST",
          body: JSON.stringify({ planId }),
        });
        if (result.url) {
          window.location.href = result.url;
          return;
        }
        // Refetch full status so planStatus, plan, and all fields are in sync
        apiFetch<BillingStatus>("/billing/status").then(setStatus).catch(() => {});
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
      toastSuccess("Subscription cancelled you'll keep access until the billing period ends.");
    } catch (err) {
      toastError(String(err));
    } finally {
      setCancelling(false);
    }
  }

  const isTrialing = status?.planStatus === "trialing";
  const isCancelled = status?.planStatus === "cancelled";
  const isCancelling = status?.planStatus === "cancelling";
  const isOnHold = status?.planStatus === "on_hold";
  const isActive = status?.planStatus === "active";
  const hasDodoSub = status?.hasDodoSub ?? false;

  const billingEnabled = process.env.NEXT_PUBLIC_ENABLE_BILLING === "true";

  const now = new Date();
  const monthName = now.toLocaleString("default", { month: "long" });
  const planPrice = (plan: typeof PLANS[number]) => isIndia ? plan.priceInr : plan.priceUsd;

  if (!billingEnabled) {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-bg">
        <div className="page-header">
          <div>
            <h1 className="type-body-sb-l text-fg">Billing</h1>
            <p className="type-body-r-xs mt-0.5 text-muted">Self-hosted instance</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="card w-14 h-14 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-brand-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            <h2 className="type-body-sb-l mb-2 text-fg">Self-hosted mode</h2>
            <p className="type-body-r-s text-muted">
              Billing is disabled on this instance. All features are unlocked with no limits.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg">
      {showCancelModal && (
        <CancelModal
          onConfirm={cancelSubscription}
          onClose={() => setShowCancelModal(false)}
          loading={cancelling}
        />
      )}

      {/* Header */}
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="type-body-sb-l text-fg">Billing & Plans</h1>
          <p className="type-body-r-xs mt-0.5 truncate hidden sm:block text-muted">
            {status?.workspaceName ?? "Manage your subscription and usage"}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">

        {/* Success banner */}
        {success && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-green-200 bg-green-50">
            <svg className="w-5 h-5 shrink-0 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              {isActive ? (
                <>
                  <p className="type-body-sb-s text-green-700">
                    {`${status?.planName} plan activated `} you&apos;re all set!
                  </p>
                  <p className="type-body-r-xs mt-0.5 text-muted">
                    Your subscription is now active. Start scheduling posts across all your accounts.
                  </p>
                </>
              ) : (
                <>
                  <p className="type-body-sb-s text-green-700">Trial started — you&apos;re all set!</p>
                  <p className="type-body-r-xs mt-0.5 text-muted">Your 14-day free trial is now active. No charge until it ends.</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Status banners */}
        {isOnHold && (
          <div className="flex items-start gap-3 px-5 py-4 rounded-2xl border border-red-200 bg-red-50">
            <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="type-body-sb-s text-red-600">Payment failed</p>
              <p className="type-body-r-xs mt-1 text-muted">
                We couldn&apos;t process your last payment. Update your payment method via the Dodo customer portal to restore full access.
              </p>
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="flex items-start gap-3 px-5 py-4 rounded-2xl border border-border bg-surface">
            <svg className="w-5 h-5 shrink-0 mt-0.5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="type-body-sb-s text-muted">Subscription cancelled</p>
              <p className="type-body-r-xs mt-1 text-muted">
                Your access has ended. Subscribe to a plan below to continue scheduling posts.
              </p>
            </div>
          </div>
        )}

        {/* Current plan card */}
        {!loading && status && !isCancelled && (
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex-1">
                <p className="section-label tracking-widest mb-3">
                  Current plan
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="type-head-sb-5 text-fg">{status.planName}</h2>
                  <StatusBadge status={status.planStatus} trialDaysLeft={status.trialDaysLeft} trialEndsAt={status.trialEndsAt} />
                </div>
                {isTrialing && status.trialEndsAt && (() => {
                  const trialExpired = new Date(status.trialEndsAt) < new Date();
                  return (
                    <p className={cn("type-body-r-xs mt-2", trialExpired && "text-red-600")}>
                      {trialExpired ? (
                        <>Trial ended on{" "}
                          <span className="font-semibold text-red-600">
                            {new Date(status.trialEndsAt).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}
                          </span>
                          {" "}— subscribe to restore access.
                        </>
                      ) : (
                        <>Trial expires{" "}
                          <span className="text-muted">
                            {new Date(status.trialEndsAt).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}
                          </span>
                          {status.trialDaysLeft <= 3 ? " subscribe now to avoid losing access." : "."}
                        </>
                      )}
                    </p>
                  );
                })()}
                {(isActive || isCancelling) && (
                  <p className="type-body-r-xs mt-1.5 text-muted">
                    {status.maxAccounts} accounts · {status.maxPostsPerMonth === null ? "unlimited posts" : `${status.maxPostsPerMonth} posts/month`}
                  </p>
                )}
              </div>
              {isActive && hasDodoSub && !isCancelling && isOwner && (
                <a href="https://app.dodopayments.com" target="_blank" rel="noreferrer"
                  className="btn-secondary shrink-0 type-body-m-xs text-muted hover:text-fg">
                  Manage ↗
                </a>
              )}
            </div>

            {/* Cancelling notice */}
            {(isCancelling || cancelDone) && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl mb-4 border border-brand-400 bg-brand-100">
                <svg className="w-4 h-4 shrink-0 mt-0.5 text-brand-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="type-body-r-xs text-muted">
                  Your subscription will be cancelled at the end of the current billing period. You keep full access until then.
                </p>
              </div>
            )}

            {/* Usage bars */}
            <div className="pt-5 space-y-4 border-t border-border">
              <UsageBar
                label="Connected accounts"
                used={status.accountsUsed}
                max={status.maxAccounts}
              />
              <UsageBar
                label={`Scheduled posts - ${monthName}`}
                used={status.postsThisMonth}
                max={status.maxPostsPerMonth}
                warningAt={85}
              />
            </div>

            {/* Cancel link */}
            {isActive && hasDodoSub && !isCancelling && !cancelDone && isOwner && (
              <div className="mt-5 pt-4 flex justify-end border-t border-border">
                <button onClick={() => setShowCancelModal(true)}
                  className="type-body-r-xs underline transition-opacity hover:opacity-70 text-red-600">
                  Cancel subscription
                </button>
              </div>
            )}
          </div>
        )}

        {/* Skeleton */}
        {loading && (
          <div className="card p-6 animate-pulse">
            <div className="h-3 w-20 rounded-sm mb-3 bg-neutral-100" />
            <div className="h-7 w-36 rounded-sm mb-2 bg-neutral-100" />
            <div className="mt-5 pt-5 space-y-3 border-t border-border">
              <div className="h-2 w-full rounded-sm bg-neutral-100" />
              <div className="h-2 w-full rounded-sm bg-neutral-100" />
            </div>
          </div>
        )}

        {/* Plan cards */}
        <div>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 className="type-body-sb-s text-fg">
                {isActive ? "Switch plan" : isTrialing ? "Upgrade your plan" : isCancelling ? "Resubscribe" : "Choose a plan"}
              </h3>
              <p className="type-body-r-xs mt-1 text-muted">
                {isActive
                  ? "Switch plans changes take effect immediately"
                  : isCancelling
                  ? "Pick a plan to continue your current access stays until the billing period ends"
                  : "Subscribe to keep access after your trial ends"}
              </p>
            </div>
            {/* Currency toggle */}
            <div className="flex shrink-0 p-0.5 rounded-lg border border-border bg-surface">
              {([{ label: "INR ₹", india: true }, { label: "USD $", india: false }] as const).map(({ label, india }) => (
                <button
                  key={label}
                  onClick={() => setIsIndia(india)}
                  className={cn(
                    "px-3 py-1 rounded-md type-body-m-xs cursor-pointer transition-all duration-150",
                    isIndia === india ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PLANS.map((plan) => {
              const isCurrent = status?.plan === plan.id && (isActive || isTrialing);
              const planOrder = ["creator", "pro", "team"];
              const currentIdx = planOrder.indexOf(status?.plan ?? "");
              const thisIdx = planOrder.indexOf(plan.id);
              const isUpgrade = thisIdx > currentIdx;
              const changeLabel = isUpgrade ? `Upgrade to ${plan.name}` : `Downgrade to ${plan.name}`;

              return (
                <div key={plan.id}
                  className={cn(
                    "card relative flex flex-col overflow-hidden",
                    isCurrent ? "border-brand-300 bg-brand-100" : plan.popular && "border-brand-300",
                  )}>

                  {plan.popular && <div className="h-px w-full bg-accent" />}

                  <div className="p-6 flex-1 flex flex-col">
                    <div className="mb-4 h-5 flex items-center gap-2">
                      {plan.popular && (
                        <span className="type-body-sb-xxs tracking-wide px-2 py-0.5 rounded-full bg-accent text-accent-fg">
                          MOST POPULAR
                        </span>
                      )}
                      {isCurrent && (
                        <span className="type-body-sb-xxs tracking-wide px-2 py-0.5 rounded-full border border-border bg-bg text-muted">
                          CURRENT PLAN
                        </span>
                      )}
                    </div>

                    <p className="type-body-sb-m text-fg">{plan.name}</p>
                    <p className="type-body-r-xs mt-1 mb-4 text-muted">{plan.description}</p>

                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="type-head-sb-4 tracking-tight text-fg">{planPrice(plan)}</span>
                      <span className="type-body-r-s text-muted">{plan.period}</span>
                    </div>
                    <p className="type-body-r-xs mb-4 text-muted">{isIndia ? "billed in INR" : "billed in USD"}</p>

                    <div className="flex gap-2 mb-5 flex-wrap">
                      <span className="type-body-sb-xs px-2 py-1 rounded-lg border border-brand-300 bg-brand-100 text-brand-800">
                        {plan.maxAccounts} accounts
                      </span>
                      <span className="type-body-sb-xs px-2 py-1 rounded-lg border border-brand-300 bg-brand-100 text-brand-800">
                        {plan.maxPostsPerMonth === null ? "∞ posts/mo" : `${plan.maxPostsPerMonth} posts/mo`}
                      </span>
                    </div>

                    <ul className="space-y-2.5 flex-1 mb-6">
                      {plan.features.map((f) => (
                        <li key={f.text} className="flex items-start gap-2.5">
                          {f.included ? (
                            <svg className="w-4 h-4 shrink-0 mt-0.5 text-brand-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 shrink-0 mt-0.5 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                          <span className={cn("type-body-r-s", f.included ? "text-fg" : "text-neutral-500")}>{f.text}</span>
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl type-body-sb-s border border-border bg-bg text-muted">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Current plan
                      </div>
                    ) : (() => {
                      const cancellingOtherPlan = isCancelling && status?.plan !== plan.id;
                      const btnDisabled = !!checkingOut || !isOwner || cancellingOtherPlan;
                      const btnTitle = !isOwner
                        ? "Only the workspace owner can manage billing"
                        : cancellingOtherPlan
                        ? "Resubscribe to your current plan first, then switch"
                        : undefined;
                      return (
                        <button onClick={() => !btnDisabled && checkout(plan.id)} disabled={btnDisabled}
                          title={btnTitle}
                          className={cn(
                            "w-full py-2.5 transition-all active:scale-[0.98]",
                            (isTrialing || isActive) && !isUpgrade ? "btn-secondary" : "btn-primary",
                          )}>
                          {checkingOut === plan.id
                            ? ((isTrialing || isActive || isCancelling) ? "Switching plan…" : "Opening checkout…")
                            : (isTrialing || isActive)
                            ? changeLabel
                            : isCancelling
                            ? `Resubscribe to ${plan.name}`
                            : isCancelled
                            ? `Subscribe to ${plan.name}`
                            : "Start free trial"}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-center type-body-r-xs text-muted">
            {isIndia ? "Prices in Indian Rupees (INR)" : "Prices in US Dollars (USD)"} · billed monthly
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-8 pb-4">
          {[
            { path: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", text: "Secure checkout via Dodo" },
            { path: "M6 18L18 6M6 6l12 12", text: "Cancel anytime" },
          ].map(({ path, text }) => (
            <div key={text} className="flex items-center gap-2 type-body-r-xs text-muted">
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

export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingContent />
    </Suspense>
  );
}
