"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiFetch } from "../lib/api";

export function PlanGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_BILLING !== "true") { setReady(true); return; }
    apiFetch<{ planStatus: string; trialEndsAt: string | null }>("/billing/status")
      .then(({ planStatus, trialEndsAt }) => {
        const trialExpired = planStatus === "trialing" && !!trialEndsAt && new Date(trialEndsAt) < new Date();
        // cancelling = still has access until period ends; trialing = always has access
        const hasActivePlan = (planStatus === "active" || planStatus === "trialing" || planStatus === "cancelling") && !trialExpired;
        const isExpired = planStatus === "cancelled" || planStatus === "on_hold" || trialExpired;
        if (!hasActivePlan && !isExpired) {
          router.replace("/onboarding?step=4");
        } else if (isExpired && pathname !== "/billing" && pathname !== "/settings") {
          router.replace("/billing");
        } else {
          setReady(true);
        }
      })
      .catch(() => setReady(true)); // billing check failure → let through
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center" style={{ backgroundColor: "#0a0a0a" }}>
        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "#5b63d3", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return <>{children}</>;
}
