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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#0a0a0a" }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#5b63d3" }}>
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </div>
          <span className="font-bold text-sm" style={{ color: "#ededed" }}>Posthive</span>
        </div>

        <div className="rounded-2xl p-8" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
          {!token ? (
            <div className="text-center">
              <p className="text-sm mb-4" style={{ color: "#f87171" }}>Invalid or missing reset token.</p>
              <Link href="/forgot-password" className="text-sm font-semibold" style={{ color: "#5b63d3" }}>
                Request a new link
              </Link>
            </div>
          ) : done ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: "#052e16", border: "1px solid #14532d" }}>
                <svg className="w-6 h-6" fill="none" stroke="#4ade80" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-lg font-bold mb-2" style={{ color: "#ededed" }}>Password updated!</h1>
              <p className="text-sm" style={{ color: "#888" }}>Redirecting you to login…</p>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-bold mb-1" style={{ color: "#ededed" }}>Set new password</h1>
              <p className="text-sm mb-6" style={{ color: "#888" }}>Choose a strong password at least 8 characters.</p>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#aaa" }}>New password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoFocus
                    placeholder="••••••••"
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/10"
                    style={{ backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", color: "#ededed" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#aaa" }}>Confirm password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/10"
                    style={{ backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", color: "#ededed" }}
                  />
                </div>

                {error && (
                  <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: "#1a0a0a", border: "1px solid #3a1a1a", color: "#f87171" }}>
                    {error}
                  </p>
                )}

                <button type="submit" disabled={loading || !password || !confirm}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 hover:bg-gray-100"
                  style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
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
