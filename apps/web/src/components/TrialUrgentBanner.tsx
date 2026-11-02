"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";
import { cn } from "../lib/cn";

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

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b px-4 py-2.5 type-body-m-xs",
        expired ? "border-red-200 bg-red-50 text-red-600" : "border-brand-400 bg-brand-100 text-brand-800",
      )}
    >
      <span>{label}</span>
      <Link
        href="/billing"
        className="btn-primary shrink-0 rounded-lg px-3 py-1.5 type-body-sb-xs"
      >
        {expired ? "Upgrade now" : "Upgrade"}
      </Link>
    </div>
  );
}
