"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

type State = "verifying" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refresh } = useAuth();
  const [state, setState] = useState<State>("verifying");
  const [error, setError] = useState<string | null>(null);
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const token = searchParams.get("token");
    if (!token) { setState("error"); setError("No token provided."); return; }

    apiFetch("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) })
      .then(async () => {
        setState("success");
        await refresh();
        setTimeout(() => router.replace("/compose"), 2500);
      })
      .catch((err) => {
        setState("error");
        setError(err instanceof Error ? err.message : "Verification failed.");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="card p-8">
      {state === "verifying" && (
        <>
          <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-2 border-border border-t-accent" />
          <p className="type-body-m-s text-fg">Verifying your email…</p>
        </>
      )}

      {state === "success" && (
        <>
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-green-200 bg-green-50">
            <svg className="size-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="mb-1 type-head-sb-5 text-fg">Email verified!</p>
          <p className="type-body-r-s text-muted">Redirecting you to the app…</p>
        </>
      )}

      {state === "error" && (
        <>
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-red-200 bg-red-50">
            <svg className="size-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="mb-1 type-head-sb-5 text-fg">Verification failed</p>
          <p className="mb-4 type-body-r-s text-muted">{error}</p>
          <a href="/" className="type-body-sb-s text-brand-800 hover:underline">
            Back to app
          </a>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/posthivemain.png" alt="Posthive" className="w-9 h-9 rounded-xl object-cover" />
        </div>
        <Suspense fallback={
          <div className="card p-8">
            <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-2 border-border border-t-accent" />
            <p className="type-body-m-s text-fg">Verifying your email…</p>
          </div>
        }>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
