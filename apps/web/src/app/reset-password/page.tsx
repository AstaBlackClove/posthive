"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "../../lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="flex size-8 items-center justify-center rounded-xl bg-accent">
            <svg className="size-4 text-accent-fg" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </div>
          <span className="type-body-sb-s text-fg">Posthive</span>
        </div>

        <div className="card p-8">
          {!token ? (
            <div className="text-center">
              <p className="mb-4 type-body-r-s text-red-600">Invalid or missing reset token.</p>
              <Link href="/forgot-password" className="type-body-sb-s text-brand-800 hover:underline">
                Request a new link
              </Link>
            </div>
          ) : done ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-green-200 bg-green-50">
                <svg className="size-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="mb-2 type-head-sb-5 text-fg">Password updated!</h1>
              <p className="type-body-r-s text-muted">Redirecting you to login…</p>
            </div>
          ) : (
            <>
              <h1 className="mb-1 type-head-sb-5 text-fg">Set new password</h1>
              <p className="mb-6 type-body-r-s text-muted">Choose a strong password at least 8 characters.</p>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block type-body-sb-xs text-muted">New password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoFocus
                    placeholder="••••••••"
                    className="field px-4 py-2.5"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block type-body-sb-xs text-muted">Confirm password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="field px-4 py-2.5"
                  />
                </div>

                {error && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 type-body-r-xs text-red-600">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={loading || !password || !confirm}
                  className="btn-primary w-full py-2.5">
                  {loading ? "Updating…" : "Update password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
