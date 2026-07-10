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
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <img
            src="/posthivemain.png"
            alt="Posthive"
            className="w-9 h-9 rounded-xl object-cover"
          />
          <span className="font-bold text-sm" style={{ color: "#ededed" }}>
            Posthive
          </span>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}
        >
          {sent ? (
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{
                  backgroundColor: "#052e16",
                  border: "1px solid #14532d",
                }}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="#4ade80"
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
              <h1
                className="text-lg font-bold mb-2"
                style={{ color: "#ededed" }}
              >
                Check your email
              </h1>
              <p className="text-sm mb-6" style={{ color: "#888" }}>
                If <strong style={{ color: "#ededed" }}>{email}</strong> has an
                account, we&apos;ve sent a reset link. It expires in 1 hour.
              </p>
              <Link
                href="/login"
                className="text-sm font-semibold hover:opacity-80"
                style={{ color: "#5b63d3" }}
              >
                ← Back to login
              </Link>
            </div>
          ) : (
            <>
              <h1
                className="text-lg font-bold mb-1"
                style={{ color: "#ededed" }}
              >
                Forgot password?
              </h1>
              <p className="text-sm mb-6" style={{ color: "#888" }}>
                Enter your email and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: "#aaa" }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="you@example.com"
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/10"
                    style={{
                      backgroundColor: "#0a0a0a",
                      border: "1px solid #2a2a2a",
                      color: "#ededed",
                    }}
                  />
                </div>

                {error && (
                  <p
                    className="text-xs px-3 py-2 rounded-lg"
                    style={{
                      backgroundColor: "#1a0a0a",
                      border: "1px solid #3a1a1a",
                      color: "#f87171",
                    }}
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 hover:bg-gray-100"
                  style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}
                >
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>

              <p className="text-center text-xs mt-5" style={{ color: "#555" }}>
                Remembered it?{" "}
                <Link
                  href="/login"
                  className="font-semibold hover:opacity-80"
                  style={{ color: "#5b63d3" }}
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
