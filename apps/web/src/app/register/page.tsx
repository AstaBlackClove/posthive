"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { register, EMAIL_TAKEN } from "../../lib/auth";
import { useAuth } from "../../context/AuthContext";
import { PasswordInput } from "../../components/PasswordInput";
import { AuthShell, AuthHeading } from "../../components/auth/AuthShell";
import { AuthAlert } from "../../components/auth/AuthAlert";
import { OAuthButtons, OrDivider } from "../../components/auth/OAuthButtons";
import { BRAND } from "../../lib/brand";
import { safeReturnTo } from "../../lib/session";
import { PASSWORD_HINT, passwordProblem } from "../../lib/passwordRule";

const LABEL = "mb-1 block type-body-sb-xs text-neutral-200";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  const { refresh } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [marketing, setMarketing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailTaken = error === EMAIL_TAKEN;
  const loginHref = returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login";
  const verifyHref = returnTo ? `/register/verify?returnTo=${encodeURIComponent(returnTo)}` : "/register/verify";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const problem = passwordProblem(password);
    if (problem) { setError(problem); return; }
    setLoading(true); setError(null);
    try {
      await register(email, password, name, marketing);
      await refresh();
      // The API mailed a 6-digit code: confirm the email before onboarding.
      router.replace(verifyHref);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  }

  return (
    <AuthShell cta="login" returnTo={returnTo}>
      <AuthHeading
        title={<>Create your<br className="short:hidden" /> {BRAND.name} account</>}
        subtitle="Then start your 14-day free trial."
      />

      <OAuthButtons returnTo={returnTo} />
      <OrDivider>or sign up with email</OrDivider>

      {error && !emailTaken && <AuthAlert id="register-error">{error}</AuthAlert>}

      <form onSubmit={handleSubmit} className="space-y-5 short:space-y-4">
        <div className="space-y-5 short:space-y-3">
          <div>
            <label htmlFor="name" className={LABEL}>Full name</label>
            <input
              id="name" name="name" type="text" autoComplete="name" required autoFocus
              value={name} onChange={(e) => setName(e.target.value)}
              className="field-line"
            />
          </div>
          <div>
            <label htmlFor="email" className={LABEL}>Work email</label>
            <input
              id="email" name="email" type="email" autoComplete="email" required
              value={email} onChange={(e) => { setEmail(e.target.value); if (emailTaken) setError(null); }}
              aria-invalid={emailTaken} aria-describedby={emailTaken ? "email-taken" : undefined}
              className="field-line"
            />
            {emailTaken && (
              <p id="email-taken" role="alert" className="mt-2 type-body-r-xs text-red-300">
                This email already has an account.{" "}
                <Link href={loginHref} className="type-body-sb-xs text-brand-500 hover:text-brand-300">Log in instead?</Link>
              </p>
            )}
          </div>
          <div>
            <label htmlFor="password" className={LABEL}>Password</label>
            <PasswordInput
              id="password" name="password" autoComplete="new-password" required variant="line"
              value={password} onChange={(e) => setPassword(e.target.value)}
              aria-describedby="password-hint"
            />
            <p id="password-hint" className="mt-2 type-body-r-xs text-neutral-300">{PASSWORD_HINT}</p>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 type-body-r-xs text-neutral-200">
          <input
            type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)}
            className="size-4 cursor-pointer rounded-sm accent-brand-500"
          />
          Send me tips &amp; product updates
        </label>

        <button type="submit" disabled={loading} className="btn-primary h-12 min-w-45 bg-brand-500 px-8 hover:bg-brand-400">
          {loading ? "Creating account…" : "Create account"}
        </button>

        <p className="type-body-r-xs text-neutral-300">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-white">Terms &amp; Conditions</Link>
          {" and "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-white">Privacy Policy</Link>.
          <br className="max-sm:hidden" />
          {" "}Worth a quick read, so you know what you&apos;re signing up for.
        </p>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterContent />
    </Suspense>
  );
}
