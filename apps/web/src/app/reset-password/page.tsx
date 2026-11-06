"use client";

import { useState, Suspense, useEffect } from "react";
import { PasswordInput } from "../../components/PasswordInput";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { AuthShell, AuthHeading } from "../../components/auth/AuthShell";
import { AuthAlert } from "../../components/auth/AuthAlert";
import { PASSWORD_HINT, passwordProblem } from "../../lib/passwordRule";

const LABEL = "mb-1 block type-body-sb-xs text-neutral-200";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();

  // Local auth: token comes as ?token= query param.
  // Supabase auth: token comes in URL hash as #access_token=xxx&type=recovery.
  const [token, setToken] = useState(searchParams.get("token") ?? "");

  useEffect(() => {
    if (token) return; // already have a local-auth token
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const type = params.get("type");
    if (accessToken && type === "recovery") {
      setToken(accessToken);
      // Clean hash from URL so it doesn't leak in browser history
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [token]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = passwordProblem(password);
    if (problem) { setError(problem); return; }
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ ok: boolean; loggedIn?: boolean }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      if (res.loggedIn) {
        // The API signed the user in with a fresh session: go straight to the app.
        await refresh();
        router.replace("/compose");
      } else {
        router.replace("/login?reset=1");
      }
    } catch (err) {
      const status = (err as { status?: number }).status;
      setError(
        status === 429
          ? "Too many attempts. Try again in a few minutes."
          : err instanceof Error ? err.message : "Something went wrong",
      );
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthShell cta="signup">
        <AuthHeading
          title="This link doesn't work"
          subtitle="The reset link is missing or incomplete. Request a new one and try again."
        />
        <Link
          href="/forgot-password"
          className="btn-primary h-12 min-w-45 bg-brand-500 px-8 hover:bg-brand-400"
        >
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  const mismatch = !!confirm && confirm !== password;

  return (
    <AuthShell cta="signup">
      <AuthHeading title="Set a new password" subtitle="Choose something you haven't used before." />

      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-6 short:space-y-4">
          <div>
            <label htmlFor="new-password" className={LABEL}>New password</label>
            <PasswordInput
              id="new-password" name="new-password" autoComplete="new-password" required autoFocus variant="line"
              value={password} onChange={(e) => setPassword(e.target.value)}
              aria-describedby="password-hint"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className={LABEL}>Confirm password</label>
            <PasswordInput
              id="confirm-password" name="confirm-password" autoComplete="new-password" required variant="line"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={mismatch} aria-describedby="password-hint"
            />
          </div>
        </div>

        <p id="password-hint" className="type-body-r-xs text-neutral-300">{PASSWORD_HINT}</p>

        {error && <AuthAlert>{error}</AuthAlert>}

        <button
          type="submit" disabled={loading || !password || !confirm}
          className="btn-primary h-12 min-w-45 bg-brand-500 px-8 hover:bg-brand-400"
        >
          {loading ? "Saving…" : "Save & log in"}
        </button>
        <p className="type-body-r-xs text-neutral-300">You&apos;ll go straight to your dashboard.</p>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
