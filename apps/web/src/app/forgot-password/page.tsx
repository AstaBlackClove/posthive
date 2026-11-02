"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
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
          <img
            src="/posthivemain.png"
            alt="Posthive"
            className="w-9 h-9 rounded-xl object-cover"
          />
          <span className="type-body-sb-s text-fg">
            Posthive
          </span>
        </div>

        <div className="card p-8">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-green-200 bg-green-50">
                <svg
                  className="size-6 text-green-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="mb-2 type-head-sb-5 text-fg">
                Check your email
              </h1>
              <p className="mb-6 type-body-r-s text-muted">
                If <strong className="text-fg">{email}</strong> has an
                account, we&apos;ve sent a reset link. It expires in 1 hour.
              </p>
              <Link
                href="/login"
                className="type-body-sb-s text-brand-800 hover:underline"
              >
                ← Back to login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="mb-1 type-head-sb-5 text-fg">
                Forgot password?
              </h1>
              <p className="mb-6 type-body-r-s text-muted">
                Enter your email and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block type-body-sb-xs text-muted">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="you@example.com"
                    className="field px-4 py-2.5"
                  />
                </div>

                {error && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 type-body-r-xs text-red-600">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="btn-primary w-full py-2.5"
                >
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>

              <p className="mt-5 text-center type-body-r-xs text-muted">
                Remembered it?{" "}
                <Link
                  href="/login"
                  className="type-body-sb-xs text-brand-800 hover:underline"
                >
                  Log in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
