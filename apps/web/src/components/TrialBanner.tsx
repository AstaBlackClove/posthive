"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";

interface BillingStatus {
  planStatus: string;
  trialDaysLeft: number;
  trialExpired: boolean;
}

export function TrialBanner() {
  const [status, setStatus] = useState<BillingStatus | null>(null);

  useEffect(() => {
    apiFetch<BillingStatus>("/billing/status").then(setStatus).catch(() => {});
  }, []);

  if (!status) return null;
  if (status.planStatus === "active") return null;

  // New user — registered but hasn't entered card / started Dodo trial yet
  if (status.planStatus === "inactive") {
    return (
      <div className="mx-3 mb-2 px-3 py-2.5 rounded-xl"
        style={{ backgroundColor: "#0d0d1a", border: "1px solid #2a2a5a" }}>
        <p className="text-xs font-semibold mb-1.5" style={{ color: "#ededed" }}>Start your free trial</p>
        <p className="text-xs mb-2 leading-relaxed" style={{ color: "#555" }}>
          Enter your card to activate 14 days free. No charge until it ends.
        </p>
        <Link href="/billing"
          className="flex items-center justify-center gap-1 w-full font-semibold text-xs px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
          Start free trial →
        </Link>
      </div>
    );
  }

  if (status.planStatus === "cancelled") {
    return (
      <div className="mx-3 mb-2 px-3 py-2.5 rounded-xl text-xs"
        style={{ backgroundColor: "#1f0a0a", border: "1px solid #7f1d1d" }}>
        <p className="font-semibold mb-1" style={{ color: "#f87171" }}>Subscription cancelled</p>
        <Link href="/billing" className="font-semibold underline" style={{ color: "#f87171" }}>
          Resubscribe →
        </Link>
      </div>
    );
  }

  if (status.trialExpired) {
    return (
      <div className="mx-3 mb-2 px-3 py-2.5 rounded-xl text-xs"
        style={{ backgroundColor: "#1f0a0a", border: "1px solid #7f1d1d" }}>
        <p className="font-semibold mb-1" style={{ color: "#f87171" }}>Trial expired</p>
        <p className="mb-1.5" style={{ color: "#888" }}>Upgrade to keep posting.</p>
        <Link href="/billing"
          className="inline-flex items-center gap-1 font-semibold px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors"
          style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
          Upgrade now →
        </Link>
      </div>
    );
  }

  if (status.planStatus === "trialing") {
    const urgent = status.trialDaysLeft <= 3;
    return (
      <div className="mx-3 mb-2 px-3 py-2.5 rounded-xl text-xs"
        style={{
          backgroundColor: urgent ? "#1c1a10" : "#111111",
          border: `1px solid ${urgent ? "#78560a" : "#2a2a2a"}`,
        }}>
        <div className="flex items-center justify-between mb-1">
          <p className="font-semibold" style={{ color: urgent ? "#fbbf24" : "#ededed" }}>
            {status.trialDaysLeft === 0 ? "Trial ends today" : `${status.trialDaysLeft} days left`}
          </p>
          <Link href="/billing" className="font-semibold hover:opacity-80" style={{ color: "#5b63d3" }}>
            Upgrade
          </Link>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "#1a1a1a" }}>
          <div className="h-full rounded-full transition-all"
            style={{
              width: `${Math.max(5, (status.trialDaysLeft / 14) * 100)}%`,
              backgroundColor: urgent ? "#f59e0b" : "#5b63d3",
            }} />
        </div>
      </div>
    );
  }

  return null;
}
