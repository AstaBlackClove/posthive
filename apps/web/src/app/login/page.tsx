"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { login } from "../../lib/auth";
import { useAuth } from "../../context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleGoogle() {
    const dest = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
    window.location.href = `${API_BASE}/auth/google${dest}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      await login(email, password);
      await refresh();
      router.replace(returnTo ?? "/compose");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
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
          <h1 className="text-lg font-bold mb-1" style={{ color: "#ededed" }}>Welcome back</h1>
          <p className="text-sm mb-6" style={{ color: "#888" }}>Sign in to your account</p>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl py-2.5 text-sm font-semibold transition-colors hover:bg-[#1a1a1a]"
            style={{ border: "1px solid #2a2a2a", color: "#ededed", background: "transparent", cursor: "pointer", marginBottom: 16 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: "#1e1e1e" }} />
            <span style={{ fontSize: 11, color: "#444" }}>or</span>
            <div style={{ flex: 1, height: 1, background: "#1e1e1e" }} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "#888" }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" required autoFocus
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                style={{ backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", color: "#ededed" }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "#888" }}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                style={{ backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", color: "#ededed" }} />
            </div>

            {error && (
              <div className="text-xs text-red-400 rounded-lg px-3 py-2"
                style={{ backgroundColor: "#1a0a0a", border: "1px solid #3a1a1a" }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 disabled:opacity-50 font-semibold rounded-xl text-sm transition-opacity hover:bg-gray-100"
              style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-5" style={{ color: "#666" }}>
          Don&apos;t have an account?{" "}
          <Link href={returnTo ? `/register?returnTo=${encodeURIComponent(returnTo)}` : "/register"} className="font-semibold hover:underline" style={{ color: "#5b63d3" }}>
            Create one
          </Link>
        </p>
        <p className="text-center text-xs mt-2">
          <Link href="/forgot-password" className="hover:opacity-80" style={{ color: "#555" }}>
            Forgot your password?
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
