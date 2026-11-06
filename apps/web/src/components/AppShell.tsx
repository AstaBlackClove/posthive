"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { AuthGuard } from "./AuthGuard";
import { PlanGuard } from "./PlanGuard";
import { OnboardingChecklist } from "./OnboardingChecklist";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { canAccessPage } from "../lib/permissions";

// No auth, no sidebar — public pages (exact) or prefixes
const PUBLIC_EXACT = ["/", "/login", "/register", "/register/verify", "/forgot-password", "/reset-password", "/privacy", "/terms", "/features", "/docs", "/verify-email", "/pricing", "/blog", "/for-developers", "/agent", "/invite"];
const PUBLIC_PREFIXES = ["/features/", "/platforms/", "/docs/", "/blog/", "/tools/"];

// Redirects users to /jobs when they open a page their role cannot access
// (e.g. member typing /billing in the URL). Must render inside AuthGuard.
export function RoleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { activeWorkspace, loading } = useWorkspace();

  const role = activeWorkspace?.role ?? user?.role;
  const allowed = canAccessPage(pathname, role);

  useEffect(() => {
    if (!loading && !allowed) router.replace("/jobs");
  }, [loading, allowed, pathname, router]);

  // Wait for the workspace role before deciding — avoids bouncing admins on hard refresh
  if (loading || !allowed) return null;
  return <>{children}</>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (PUBLIC_EXACT.includes(pathname) || PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return <>{children}</>;
  }

  // Auth-only pages — no sidebar, no plan guard
  if (pathname === "/onboarding" || pathname === "/mcp-connect" || pathname === "/admin") {
    return <AuthGuard>{children}</AuthGuard>;
  }

  // Main app: needs auth + plan guard + role guard + sidebar
  return (
    <AuthGuard>
      <PlanGuard>
        <RoleGuard>
          <div className="flex h-full">
            <Sidebar />
            <main className="flex-1 overflow-hidden flex flex-col">
              {children}
            </main>
            <OnboardingChecklist />
          </div>
        </RoleGuard>
      </PlanGuard>
    </AuthGuard>
  );
}
