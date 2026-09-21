"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";

interface BillingStatus {
  planStatus: string;
  trialDaysLeft: number;
  trialExpired: boolean;
}

export function TrialUrgentBanner() {
  const [status, setStatus] = useState<BillingStatus | null>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_BILLING !== "true") return;
    apiFetch<BillingStatus>("/billing/status").then(setStatus).catch(() => {});
  }, []);

  if (!status) return null;
  if (status.planStatus === "active") return null;
  if (status.planStatus !== "trialing" && !status.trialExpired) return null;
  if (status.planStatus === "trialing" && status.trialDaysLeft > 5) return null;

  const expired = status.trialExpired;
  const days = status.trialDaysLeft;

  const label = expired
    ? "Your trial has expired — scheduled posts are paused."
    : days === 0
    ? "Your trial ends today."
    : `${days} day${days === 1 ? "" : "s"} left in your trial.`;

  const bg = expired ? "#1f0a0a" : "#1c1500";
  const border = expired ? "#7f1d1d" : "#78560a";
  const textColor = expired ? "#f87171" : "#fbbf24";

  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-2.5 text-xs font-medium"
      style={{ backgroundColor: bg, borderBottom: `1px solid ${border}` }}
    >
      <span style={{ color: textColor }}>{label}</span>
      <Link
        href="/billing"
        className="shrink-0 px-3 py-1.5 rounded-lg font-semibold text-xs transition-opacity hover:opacity-80"
        style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}
      >
        {expired ? "Upgrade now" : "Upgrade"}
      </Link>
    </div>
  );
}
