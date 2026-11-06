"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/api";
import { AuthShell, AuthHeading } from "../../components/auth/AuthShell";
import { AuthAlert } from "../../components/auth/AuthAlert";
import { formatCountdown, useCountdown } from "../../components/auth/useCountdown";

const RESEND_COOLDOWN_S = 30;
/** Keep in sync with RESET_LINK_TTL_MIN in apps/api/src/lib/auth/passwordPolicy.ts. */
const LINK_TTL_MIN = 30;

const BACK_LINK = "inline-flex items-center gap-1.5 type-body-sb-xs text-brand-500 hover:text-brand-300";

function BackToLogin() {
  return (
    <Link href="/login" className={BACK_LINK}>
      <span aria-hidden="true">←</span> Back to log in
    </Link>
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { remaining: cooldown, start: startCooldown } = useCountdown();
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
      startCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      const status = (err as { status?: number }).status;
      setError(
        status === 429
          ? "Too many requests. Try again in a few minutes."
          : err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    void send();
  }

  if (sent) {
    return (
      <AuthShell cta="signup">
        <span className="flex size-22 items-center justify-center rounded-full bg-brand-500 text-neutral-700">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2.5" />
            <path d="m3.5 7 8.5 6 8.5-6" />
          </svg>
        </span>
        <AuthHeading
          title="Check your inbox"
          subtitle={<>We sent a reset link to <strong className="font-semibold text-white">{email}</strong>. It expires in {LINK_TTL_MIN} minutes.</>}
        />

        {error && <AuthAlert>{error}</AuthAlert>}

        <p className="type-body-r-xs text-neutral-300">
          Didn&apos;t get it? Check spam or{" "}
          <button
            type="button"
            onClick={() => void send()}
            disabled={cooldown > 0 || loading}
            className="type-body-sb-xs text-brand-500 hover:text-brand-300 disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:text-neutral-300"
          >
            Resend link{cooldown > 0 && ` (${formatCountdown(cooldown)})`}
          </button>
        </p>

        <BackToLogin />
      </AuthShell>
    );
  }

  return (
    <AuthShell cta="signup">
      <AuthHeading
        title="Forgot your password?"
        subtitle="Enter your work email and we'll send you a link to reset it."
      />

      <form onSubmit={submit} className="space-y-6">
        <label htmlFor="email" className="mb-1 block type-body-sb-xs text-neutral-200">Email</label>
        <input
          id="email" name="email" type="email" autoComplete="email" required autoFocus
          value={email} onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!error} aria-describedby={error ? "forgot-error" : undefined}
          className="field-line"
        />

        {error && <AuthAlert id="forgot-error">{error}</AuthAlert>}

        <button type="submit" disabled={loading || !email} className="btn-primary h-12 min-w-45 bg-brand-500 px-8 hover:bg-brand-400">
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <BackToLogin />
    </AuthShell>
  );
}
