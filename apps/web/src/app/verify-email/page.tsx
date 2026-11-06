"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { AuthShell, AuthHeading } from "../../components/auth/AuthShell";
import { VerifiedPanel } from "../../components/auth/VerifiedPanel";

type State = "verifying" | "success" | "error";

const REDIRECT_MS = 1800;

// Landing page for the one-click link in the verification email.
// (Typing the 6-digit code happens on /register/verify.)
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
    if (!token) { setState("error"); setError("This link is missing its token."); return; }

    apiFetch("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) })
      .then(async () => {
        setState("success");
        await refresh();
        setTimeout(() => router.replace("/compose"), REDIRECT_MS);
      })
      .catch((err) => {
        setState("error");
        setError(err instanceof Error ? err.message : "Verification failed.");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "success") {
    return (
      <VerifiedPanel
        title="Email verified"
        subtitle="Thanks for confirming. Your account is ready."
        caption="Taking you to your dashboard…"
        durationMs={REDIRECT_MS}
      />
    );
  }

  if (state === "error") {
    return (
      <>
        <AuthHeading title="Verification failed" subtitle={error} />
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 type-body-sb-xs text-brand-500 hover:text-brand-300"
        >
          <span aria-hidden="true">←</span> Back to log in
        </Link>
      </>
    );
  }

  return <AuthHeading title="Verifying your email…" subtitle="This takes a moment." />;
}

export default function VerifyEmailPage() {
  return (
    <AuthShell cta="login">
      <Suspense fallback={<AuthHeading title="Verifying your email…" />}>
        <VerifyEmailContent />
      </Suspense>
    </AuthShell>
  );
}
