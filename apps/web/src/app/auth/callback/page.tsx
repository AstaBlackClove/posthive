"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useAuth } from "../../../context/AuthContext";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const ran = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const returnTo = searchParams.get("returnTo") ?? "/compose";

    // API already set cookies (both local and Supabase PKCE modes).
    // Just refresh the auth context and navigate.
    refresh()
      .then(() => router.replace(returnTo))
      .catch(() => setFailed(true));
  }, [refresh, router, searchParams]);

  if (failed) {
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
