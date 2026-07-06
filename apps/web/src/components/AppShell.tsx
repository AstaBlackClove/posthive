"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { AuthGuard } from "./AuthGuard";
import { PlanGuard } from "./PlanGuard";

// No auth, no sidebar — public pages (exact) or prefixes
const PUBLIC_EXACT = ["/", "/login", "/register", "/forgot-password", "/reset-password", "/privacy", "/terms", "/features", "/docs", "/verify-email", "/pricing", "/blog"];
const PUBLIC_PREFIXES = ["/features/", "/platforms/", "/docs/", "/blog/"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (PUBLIC_EXACT.includes(pathname) || PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return <>{children}</>;
  }

  // Auth-only pages — no sidebar, no plan guard
  if (pathname === "/onboarding" || pathname === "/mcp-connect") {
    return <AuthGuard>{children}</AuthGuard>;
  }

  // Main app: needs auth + plan guard + sidebar
  return (
    <AuthGuard>
      <PlanGuard>
        <div className="flex h-full">
          <Sidebar />
          <main className="flex-1 overflow-hidden flex flex-col">
            {children}
          </main>
        </div>
      </PlanGuard>
    </AuthGuard>
  );
}
