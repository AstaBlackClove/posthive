"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "../../../lib/api";
import { authErrorMessage } from "../../../lib/auth";
import { useAuth } from "../../../context/AuthContext";
import { safeReturnTo } from "../../../lib/session";
import { AuthShell, AuthHeading } from "../../../components/auth/AuthShell";
import { AuthAlert } from "../../../components/auth/AuthAlert";
import { CodeInput } from "../../../components/auth/CodeInput";
import { VerifiedPanel } from "../../../components/auth/VerifiedPanel";
import { formatCountdown, useCountdown } from "../../../components/auth/useCountdown";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_S = 30;
const REDIRECT_MS = 1800;

const LINK_BTN = "type-body-sb-xs text-brand-500 hover:text-brand-300";

function errorText(err: unknown): string {
  const status = (err as { status?: number }).status;
  return authErrorMessage(status ?? 0, err instanceof Error ? err.message : null, "Something went wrong");
}

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  const next = returnTo ?? "/onboarding";
  const { user, loading: authLoading, refresh } = useAuth();

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const { remaining, start } = useCountdown();

  // The sign-up email was just sent, so resend starts on cooldown.
  useEffect(() => { start(RESEND_COOLDOWN_S); }, [start]);

  useEffect(() => {
    if (authLoading || done) return;
    if (!user) router.replace(returnTo ? `/register?returnTo=${encodeURIComponent(returnTo)}` : "/register");
    else if (user.emailVerified) router.replace(next);
  }, [authLoading, user, done, router, next, returnTo]);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => router.replace(next), REDIRECT_MS);
    return () => clearTimeout(t);
  }, [done, router, next]);

  if (authLoading || !user) {
    return <p className="type-body-r-s text-neutral-200">Loading…</p>;
  }

  async function verify(value: string) {
    if (value.length !== CODE_LENGTH || busy) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await apiFetch("/auth/verify-email/code", { method: "POST", body: JSON.stringify({ code: value }) });
      setDone(true);
      await refresh();
    } catch (err) {
      setError(errorText(err));
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError(null); setNotice(null);
    try {
      await apiFetch("/auth/resend-verification", { method: "POST" });
      setCode("");
      start(RESEND_COOLDOWN_S);
      setNotice("We sent you a new code.");
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function submitNewEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setNotice(null);
    try {
      const res = await apiFetch<{ email: string }>("/auth/change-email", {
        method: "POST",
        body: JSON.stringify({ email: newEmail }),
      });
      await refresh();
      setChanging(false);
      setCode("");
      start(RESEND_COOLDOWN_S);
      setNotice(`We sent a new code to ${res.email}.`);
    } catch (err) {
      setError(errorText(err) === "Email already in use" ? "That email already has an account." : errorText(err));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const first = user.name.trim().split(/\s+/)[0] || "there";
    return (
      <VerifiedPanel
        title={`You're in, ${first}!`}
        subtitle="Let's set up your workspace — it takes about a minute."
        caption="Taking you to setup…"
        durationMs={REDIRECT_MS}
      />
    );
  }

  if (changing) {
    return (
      <>
        <AuthHeading title="Change your email" subtitle="We'll send a new code to the address you enter." />
        <form onSubmit={submitNewEmail} className="space-y-6">
          <div>
            <label htmlFor="new-email" className="mb-1 block type-body-sb-xs text-neutral-200">Work email</label>
            <input
              id="new-email" type="email" autoComplete="email" required autoFocus
              value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
              aria-invalid={!!error} aria-describedby={error ? "code-error" : undefined}
              className="field-line"
            />
          </div>
          {error && <AuthAlert id="code-error">{error}</AuthAlert>}
          <div className="flex items-center gap-5">
            <button type="submit" disabled={busy || !newEmail} className="btn-primary h-12 min-w-45 bg-brand-500 px-8 hover:bg-brand-400">
              {busy ? "Sending…" : "Send new code"}
            </button>
            <button type="button" onClick={() => { setChanging(false); setError(null); }} className={LINK_BTN}>
              Cancel
            </button>
          </div>
        </form>
      </>
    );
  }

  return (
    <>
      <AuthHeading
        title="Check your inbox"
        subtitle={<>We sent a {CODE_LENGTH}-digit code to <strong className="font-semibold text-white">{user.email}</strong></>}
      />

      {error && <AuthAlert id="code-error">{error}</AuthAlert>}
      {notice && !error && <AuthAlert tone="info">{notice}</AuthAlert>}

      <CodeInput
        value={code} onChange={setCode} onComplete={verify}
        busy={busy} invalid={!!error} describedBy={error ? "code-error" : undefined} autoFocus
      />

      <p className="flex flex-wrap items-center gap-x-2 type-body-r-xs text-neutral-300">
        {remaining > 0 ? (
          <span>Resend code ({formatCountdown(remaining)})</span>
        ) : (
          <button type="button" onClick={() => void resend()} className={LINK_BTN}>Resend code</button>
        )}
        <span aria-hidden="true">·</span>
        <span>
          Wrong email?{" "}
          <button type="button" onClick={() => { setNewEmail(user.email); setChanging(true); setError(null); setNotice(null); }} className={LINK_BTN}>
            Change
          </button>
        </span>
      </p>

      <div className="space-y-4">
        <button
          type="button" disabled={busy || code.length !== CODE_LENGTH} onClick={() => void verify(code)}
          className="btn-primary h-12 min-w-45 bg-brand-500 px-8 hover:bg-brand-400"
        >
          {busy ? "Verifying…" : "Verify email"}
        </button>
        <p className="type-body-r-xs text-neutral-300">Tip: you can paste the whole code.</p>
      </div>
    </>
  );
}

export default function VerifyRegistrationPage() {
  return (
    <AuthShell cta="login">
      <Suspense fallback={null}>
        <VerifyContent />
      </Suspense>
    </AuthShell>
  );
}
