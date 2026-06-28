"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { AuthGuard } from "./AuthGuard";
import { PlanGuard } from "./PlanGuard";

// No auth, no sidebar — public pages
const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (PUBLIC_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  // Onboarding: needs auth but no sidebar, no plan guard (user IS inactive here)
  if (pathname === "/onboarding") {
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
