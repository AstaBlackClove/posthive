"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { login } from "../../lib/auth";
import { useAuth } from "../../context/AuthContext";
import { PasswordInput } from "../../components/PasswordInput";
import { AuthShell, AuthHeading } from "../../components/auth/AuthShell";
import { AuthAlert } from "../../components/auth/AuthAlert";
import { OAuthButtons, OrDivider } from "../../components/auth/OAuthButtons";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import { safeReturnTo } from "../../lib/session";

// `?error=` codes the API redirects back with after Google / LinkedIn sign-in.
const OAUTH_ERRORS: Record<string, string> = {
  google_oauth_failed: "Google sign-in didn't work. Please try again.",
  google_email_unverified: "Google says this email isn't verified. Verify it with Google, or log in another way.",
  linkedin_oauth_failed: "LinkedIn sign-in didn't work. Please try again.",
  linkedin_not_configured: "LinkedIn sign-in isn't available yet.",
  linkedin_email_unverified: "LinkedIn says this email isn't verified. Verify it on LinkedIn, or log in another way.",
};

const LABEL = "mb-1 block type-body-sb-xs text-neutral-200";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  const expired = searchParams.get("reason") === "expired";
  const passwordReset = searchParams.get("reset") === "1";
  const oauthError = OAUTH_ERRORS[searchParams.get("error") ?? ""] ?? null;
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      await login(email, password, remember);
      await refresh();
      router.replace(returnTo ?? "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const shownError = error ?? oauthError;
  const info = expired
    ? "Your session has ended. Please log in again."
    : passwordReset
      ? "Password updated. Log in with your new password."
      : null;

  return (
    <AuthShell cta="signup" returnTo={returnTo}>
      <AuthHeading
        title={<>Log in to plan<br className="short:hidden" /> your next post.</>}
        subtitle="Your calendar, drafts and approvals are right where your team left them."
      />

      <OAuthButtons returnTo={returnTo} />
      <OrDivider>or log in with email</OrDivider>

      <div className="space-y-3 empty:hidden">
        {info && <AuthAlert tone="info">{info}</AuthAlert>}
        {shownError && <AuthAlert id="login-error">{shownError}</AuthAlert>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 short:space-y-4">
        <div className="space-y-6 short:space-y-4">
          <div>
            <label htmlFor="email" className={LABEL}>Email</label>
            <Input
              id="email" name="email" type="email" autoComplete="email" required autoFocus
              variant="line"
              value={email} onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!error} aria-describedby={error ? "login-error" : undefined}
            />
          </div>
          <div>
            <label htmlFor="password" className={LABEL}>Password</label>
            <PasswordInput
              id="password" name="password" autoComplete="current-password" required variant="line"
              value={password} onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!error} aria-describedby={error ? "login-error" : undefined}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <label className="flex cursor-pointer items-center gap-2 type-body-r-xs text-neutral-200">
            <Checkbox
              checked={remember}
              onCheckedChange={(v) => setRemember(v === true)}
              aria-label="Keep me logged in"
            />
            Keep me logged in
          </label>
          <Link href="/forgot-password" className="type-body-sb-xs text-brand-500 hover:text-brand-300">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" disabled={loading} variant="auth">
          {loading ? "Logging in…" : "Log in"}
        </Button>

        <p className="type-body-r-xs text-neutral-300">
          By logging in, you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-white">Terms</Link>
          {" & "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-white">Privacy Policy</Link>.
        </p>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
