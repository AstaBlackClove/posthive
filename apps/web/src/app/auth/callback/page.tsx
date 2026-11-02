"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useAuth } from "../../../context/AuthContext";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const ran = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const returnTo = searchParams.get("returnTo") ?? "/compose";

    // API already set cookies (both local and Supabase PKCE modes).
    // Just refresh the auth context and navigate.
    refresh()
      .then(() => router.replace(returnTo))
      .catch(() => setFailed(true));
  }, [refresh, router, searchParams]);

  if (failed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="text-center">
          <p className="mb-3 type-body-r-s text-red-600">Sign-in failed. Please try again.</p>
          <a href="/login" className="type-body-r-s text-brand-800 hover:underline">Back to login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="size-8 animate-spin rounded-full border-2 border-border border-t-accent" />
        <p className="type-body-r-s text-muted">Signing you in…</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackContent />
    </Suspense>
  );
}
