"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { loginUrl } from "../lib/session";
import { SessionWatcher } from "./SessionWatcher";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      // Keep where the user was, but not for the plain /login case
      router.replace(loginUrl(pathname + window.location.search));
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <SessionWatcher />
      {children}
    </>
  );
}
