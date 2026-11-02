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

export function TrialBanner() {
  const [status, setStatus] = useState<BillingStatus | null>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_BILLING !== "true") return;
    apiFetch<BillingStatus>("/billing/status").then(setStatus).catch(() => {});
  }, []);

  if (!status) return null;
  if (status.planStatus === "active") return null;

  if (status.planStatus === "cancelled") {
    return (
      <div className="mx-3 mb-2 px-3 py-2.5 rounded-xl border border-red-200 bg-red-50 type-body-r-xs">
        <p className="mb-1 type-body-sb-xs text-red-600">Subscription cancelled</p>
        <Link href="/billing" className="type-body-sb-xs text-red-600 underline">
          Resubscribe
        </Link>
      </div>
    );
  }

  if (status.trialExpired) {
    return (
      <div className="mx-3 mb-2 px-3 py-2.5 rounded-xl border border-red-200 bg-red-50 type-body-r-xs">
        <p className="mb-1 type-body-sb-xs text-red-600">Trial expired</p>
        <p className="mb-1.5 text-muted">Upgrade to keep posting.</p>
        <Link href="/billing"
          className="btn-primary gap-1 px-2.5 py-1 rounded-lg type-body-sb-xs">
          Upgrade now
        </Link>
      </div>
    );
  }

  if (status.planStatus === "trialing") {
    const urgent = status.trialDaysLeft <= 3;
    return (
      <div className={cn(
        "mx-3 mb-2 px-3 py-2.5 rounded-xl border type-body-r-xs",
        urgent ? "border-brand-400 bg-brand-100" : "border-border bg-surface",
      )}>
        <div className="flex items-center justify-between mb-1">
          <p className={cn("type-body-sb-xs", urgent ? "text-brand-800" : "text-fg")}>
            {status.trialDaysLeft === 0 ? "Trial ends today" : `${status.trialDaysLeft} days left`}
          </p>
          <Link href="/billing" className="type-body-sb-xs text-brand-800 hover:opacity-80">
            Upgrade
          </Link>
        </div>
        <div className="h-1 rounded-full overflow-hidden bg-neutral-100">
          <div className={cn("h-full w-(--w) rounded-full transition-all", urgent ? "bg-brand-700" : "bg-accent")}
            style={{ "--w": `${Math.max(5, (status.trialDaysLeft / 14) * 100)}%` } as React.CSSProperties} />
        </div>
      </div>
    );
  }

  return null;
}
