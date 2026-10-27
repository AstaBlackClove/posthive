"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiFetch } from "../lib/api";

type AccessState = "active" | "expired" | "onboarding";
const accessCache = { state: null as AccessState | null };

export function PlanGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const checked = useRef(false);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_BILLING !== "true") { setReady(true); return; }

    const applyState = (state: AccessState) => {
      accessCache.state = state;
      if (state === "onboarding") {
        router.replace("/onboarding?step=4");
      } else if (state === "expired" && pathname !== "/billing" && pathname !== "/settings") {
        router.replace("/billing");
      } else {
        setReady(true);
      }
    };

    // Already fetched — just apply cached result (no extra API call)
    if (checked.current && accessCache.state) {
      applyState(accessCache.state);
      return;
    }

    checked.current = true;
    apiFetch<{ planStatus: string; trialEndsAt: string | null; onHoldSince: string | null }>("/billing/status")
      .then(({ planStatus, trialEndsAt, onHoldSince }) => {
        const trialExpired = planStatus === "trialing" && !!trialEndsAt && new Date(trialEndsAt) < new Date();
        const GRACE_MS = 3 * 24 * 60 * 60 * 1000;
        const inGrace = planStatus === "on_hold" && !!onHoldSince && Date.now() - new Date(onHoldSince).getTime() < GRACE_MS;
        const hasActivePlan = (planStatus === "active" || planStatus === "trialing" || planStatus === "cancelling" || inGrace) && !trialExpired;
        const isExpired = planStatus === "cancelled" || (planStatus === "on_hold" && !inGrace) || trialExpired;
        applyState(!hasActivePlan && !isExpired ? "onboarding" : isExpired ? "expired" : "active");
      })
      .catch(() => setReady(true));
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
