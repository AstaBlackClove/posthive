"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useAuth } from "../../../context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const ran = useRef(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const returnTo = searchParams.get("returnTo") ?? "/compose";

    async function handle() {
      // Supabase mode: API redirected to Supabase OAuth which returns tokens in the URL hash
      const hash = window.location.hash.slice(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        try {
          const res = await fetch(`${API_BASE}/auth/google/session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ accessToken, refreshToken }),
          });
          if (res.ok) {
            const data = await res.json() as { isNew?: boolean };
            await refresh();
            router.replace(data.isNew ? "/onboarding" : returnTo);
          } else {
            setError(true);
          }
        } catch {
          setError(true);
        }
        return;
      }

      // Local auth mode: API already set cookies, just refresh context
      await refresh();
      router.replace(returnTo);
    }

    handle();
  }, [refresh, router, searchParams]);

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#f87171", marginBottom: 12 }}>Sign-in failed. Please try again.</p>
          <a href="/login" style={{ fontSize: 13, color: "#5b63d3" }}>Back to login</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{
          width: 32, height: 32, border: "2px solid #2a2a2a", borderTopColor: "#5b63d3",
          borderRadius: "50%", animation: "spin 0.7s linear infinite",
        }} />
        <p style={{ fontSize: 13, color: "#555" }}>Signing you in…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackContent />
    </Suspense>
  );
}
