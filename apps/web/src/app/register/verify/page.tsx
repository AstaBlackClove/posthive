"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyPendingSignup, resendPendingSignup } from "../../../lib/auth";
import { useAuth } from "../../../context/AuthContext";
import { safeReturnTo } from "../../../lib/safeReturnTo";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("returnTo"), "/onboarding");
  const email = searchParams.get("email") ?? "";
  const linkToken = searchParams.get("token");
  const { refresh } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  async function finish(body: { email: string; code: string } | { token: string }) {
    setLoading(true); setError(null);
    try {
      await verifyPendingSignup(body);
      await refresh();
      router.replace(returnTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  // Clicked the link in the email — verify immediately, no code needed.
  useEffect(() => {
    if (linkToken) finish({ token: linkToken });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await finish({ email, code });
  }

  async function handleResend() {
    setResending(true); setError(null); setResent(false);
    try {
      await resendPendingSignup(email);
      setResent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#0a0a0a" }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/posthivemain.png" alt="Posthive" className="w-9 h-9 rounded-xl object-cover" />
          <div>
            <p className="font-bold text-sm leading-tight" style={{ color: "#ededed" }}>Posthive</p>
          </div>
        </div>

        <div className="rounded-2xl p-7" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
          <h1 className="text-lg font-bold mb-1" style={{ color: "#ededed" }}>Check your email</h1>
          <p className="text-sm mb-6" style={{ color: "#888" }}>
            We sent a 6-digit code to {email || "your email"}. Enter it below to activate your account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                required
                autoFocus
                maxLength={6}
                className="w-full rounded-xl px-4 py-3 text-center text-2xl font-bold tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                style={{ backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", color: "#ededed" }}
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 rounded-lg px-3 py-2"
                style={{ backgroundColor: "#1a0a0a", border: "1px solid #3a1a1a" }}>
                {error}
              </div>
            )}
            {resent && !error && (
              <div className="text-xs rounded-lg px-3 py-2" style={{ backgroundColor: "#0a1a0a", border: "1px solid #1a3a1a", color: "#8fd98f" }}>
                New code sent.
              </div>
            )}

            <button type="submit" disabled={loading || code.length !== 6 || !email}
              className="w-full py-2.5 disabled:opacity-50 font-semibold rounded-xl text-sm transition-opacity hover:bg-gray-100"
              style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
              {loading ? "Verifying…" : "Verify email"}
            </button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: "#666" }}>
            Didn&apos;t get it?{" "}
            <button type="button" onClick={handleResend} disabled={resending || !email}
              className="font-semibold hover:underline disabled:opacity-50" style={{ color: "#5b63d3" }}>
              {resending ? "Sending…" : "Resend code"}
            </button>
          </p>
          <p className="text-center text-sm mt-2" style={{ color: "#666" }}>
            Wrong email?{" "}
            <a href="/register" className="font-semibold hover:underline" style={{ color: "#5b63d3" }}>
              Start over
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyCodePage() {
  return (
    <Suspense fallback={null}>
      <VerifyContent />
    </Suspense>
  );
}
