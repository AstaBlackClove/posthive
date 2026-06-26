"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "../../lib/api";

interface BillingStatus {
  plan: string;
  planStatus: string;
  planName: string;
  maxAccounts: number;
  trialDaysLeft: number;
  trialExpired: boolean;
  trialEndsAt: string | null;
}

const PLANS = [
  {
    id: "creator",
    name: "Creator",
    price: "$9",
    period: "/month",
    description: "For solo creators posting consistently",
    features: ["5 connected accounts", "Unlimited scheduled posts", "Media uploads", "Content calendar", "14-day free trial"],
    color: "#5b63d3",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19",
    period: "/month",
    description: "For marketers managing multiple brands",
    features: ["15 connected accounts", "Everything in Creator", "Content recycling", "Priority support"],
    color: "#7c3aed",
    popular: true,
  },
  {
    id: "team",
    name: "Team",
    price: "$49",
    period: "/month",
    description: "For small teams with a shared calendar",
    features: ["Unlimited accounts", "3 team seats", "Approval workflow", "Everything in Pro"],
    color: "#0891b2",
  },
];

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const success = searchParams.get("success");

  useEffect(() => {
    apiFetch<BillingStatus>("/billing/status")
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

  async function checkout(planId: string) {
    setCheckingOut(planId);
    try {
      const { url } = await apiFetch<{ url: string }>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ planId }),
      });
      window.location.href = url;
    } catch (err) {
      alert(String(err));
    } finally {
      setCheckingOut(null);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ backgroundColor: "#0a0a0a" }}>
      {/* Header */}
      <div className="px-8 py-6 flex-shrink-0" style={{ borderBottom: "1px solid #1f1f1f" }}>
        <h1 className="text-xl font-bold" style={{ color: "#ededed" }}>Billing</h1>
        <p className="text-sm mt-0.5" style={{ color: "#888" }}>Manage your subscription</p>
      </div>

      <div className="px-8 py-6 max-w-4xl">

        {/* Success banner */}
        {success && (
          <div className="mb-6 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium"
            style={{ backgroundColor: "#0a1f12", border: "1px solid #14532d", color: "#4ade80" }}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Subscription activated — welcome aboard!
          </div>
        )}

        {/* Current plan card */}
        {!loading && status && (
          <div className="mb-8 p-5 rounded-2xl" style={{ backgroundColor: "#111111", border: "1px solid #1f1f1f" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#555" }}>Current plan</p>
                <div className="flex items-center gap-2.5">
                  <span className="text-lg font-bold" style={{ color: "#ededed" }}>{status.planName}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={status.planStatus === "active"
                      ? { backgroundColor: "#0a1f12", color: "#4ade80", border: "1px solid #14532d" }
                      : status.planStatus === "trialing"
                      ? { backgroundColor: "#1c1a10", color: "#fbbf24", border: "1px solid #78560a" }
                      : status.planStatus === "on_hold"
                      ? { backgroundColor: "#1f0a0a", color: "#f87171", border: "1px solid #7f1d1d" }
                      : { backgroundColor: "#1a1a1a", color: "#888", border: "1px solid #2a2a2a" }}>
                    {status.planStatus === "trialing"
                      ? `${status.trialDaysLeft} days left in trial`
                      : status.planStatus === "on_hold"
                      ? "Payment failed — update card"
                      : status.planStatus}
                  </span>
                </div>
              </div>
              {status.planStatus === "active" && (
                <a href="#" className="text-xs font-semibold transition-opacity hover:opacity-70"
                  style={{ color: "#5b63d3" }}>
                  Manage subscription →
                </a>
              )}
            </div>

            {status.planStatus === "trialing" && (
              <p className="mt-2 text-xs" style={{ color: "#666" }}>
                Your trial ends {status.trialEndsAt ? new Date(status.trialEndsAt).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" }) : "soon"}.
                Subscribe before then to keep access.
              </p>
            )}
          </div>
        )}

        {/* Plan cards */}
        <p className="text-sm font-semibold mb-4" style={{ color: "#888" }}>
          {status?.planStatus === "active" ? "Switch plan" : "Choose a plan"}
        </p>

        <div className="grid grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = status?.plan === plan.id && status?.planStatus === "active";
            return (
              <div key={plan.id}
                className="rounded-2xl p-5 flex flex-col relative"
                style={{
                  backgroundColor: "#111111",
                  border: plan.popular ? `1px solid ${plan.color}40` : "1px solid #1f1f1f",
                }}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: plan.color, color: "#fff" }}>
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <p className="font-bold text-sm mb-0.5" style={{ color: "#ededed" }}>{plan.name}</p>
                  <p className="text-xs mb-3" style={{ color: "#666" }}>{plan.description}</p>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-2xl font-bold" style={{ color: "#ededed" }}>{plan.price}</span>
                    <span className="text-xs" style={{ color: "#555" }}>{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-2 flex-1 mb-5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs" style={{ color: "#888" }}>
                      <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        style={{ color: plan.color }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => !isCurrent && checkout(plan.id)}
                  disabled={isCurrent || checkingOut === plan.id}
                  className="w-full py-2 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50 disabled:cursor-default"
                  style={isCurrent
                    ? { backgroundColor: "#1a1a1a", color: "#555" }
                    : { backgroundColor: plan.color, color: "#fff" }}>
                  {isCurrent ? "Current plan" : checkingOut === plan.id ? "Redirecting…" : "Start 14-day trial"}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-5 text-xs text-center" style={{ color: "#444" }}>
          No credit card required to start trial · Cancel anytime · Self-host free forever
        </p>
      </div>
    </div>
  );
}
