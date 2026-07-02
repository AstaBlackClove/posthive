"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

type State = "verifying" | "success" | "error";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refresh } = useAuth();
  const [state, setState] = useState<State>("verifying");
  const [error, setError] = useState<string | null>(null);
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const token = searchParams.get("token");
    if (!token) { setState("error"); setError("No token provided."); return; }

    apiFetch("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) })
      .then(async () => {
        setState("success");
        await refresh();
        setTimeout(() => router.replace("/"), 2500);
      })
      .catch((err) => {
        setState("error");
        setError(err instanceof Error ? err.message : "Verification failed.");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#0a0a0a" }}>
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/posthivemain.png" alt="Posthive" className="w-9 h-9 rounded-xl object-cover" />
        </div>

        <div className="rounded-2xl p-8" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
          {state === "verifying" && (
            <>
              <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
                style={{ borderColor: "#5b63d3", borderTopColor: "transparent" }} />
              <p className="text-sm font-medium" style={{ color: "#ededed" }}>Verifying your email…</p>
            </>
          )}

          {state === "success" && (
            <>
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: "#052e16" }}>
                <svg className="w-6 h-6" fill="none" stroke="#4ade80" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-base font-bold mb-1" style={{ color: "#ededed" }}>Email verified!</p>
              <p className="text-sm" style={{ color: "#888" }}>Redirecting you to the app…</p>
            </>
          )}

          {state === "error" && (
            <>
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: "#1f0a0a" }}>
                <svg className="w-6 h-6" fill="none" stroke="#f87171" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-base font-bold mb-1" style={{ color: "#ededed" }}>Verification failed</p>
              <p className="text-sm mb-4" style={{ color: "#888" }}>{error}</p>
              <a href="/" className="text-sm font-semibold hover:underline" style={{ color: "#5b63d3" }}>
                Back to app
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
