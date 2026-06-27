"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiFetch } from "../lib/api";

export function PlanGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    apiFetch<{ planStatus: string }>("/billing/status")
      .then(({ planStatus }) => {
        if (planStatus === "inactive") {
          router.replace("/onboarding");
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
