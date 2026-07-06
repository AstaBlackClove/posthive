"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import Image from "next/image";

export default function McpConnectPage() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const redirectUri       = searchParams.get("redirect_uri") ?? "";
  const state             = searchParams.get("state") ?? "";
  const codeChallenge     = searchParams.get("code_challenge") ?? "";
  const codeChallengeMethod = searchParams.get("code_challenge_method") ?? "S256";
  const clientId          = searchParams.get("client_id") ?? "Claude.ai";

  const [approving, setApproving] = useState(false);
  const [error, setError]         = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      const returnTo = encodeURIComponent(window.location.href);
      router.push(`/login?next=${returnTo}`);
    }
  }, [loading, user, router]);

  // Validate required params
  const paramsValid = redirectUri && codeChallenge;

  async function handleAllow() {
    setApproving(true);
    setError("");
    try {
      const res = await apiFetch<{ redirect: string }>("/oauth/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redirect_uri: redirectUri,
          state,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
        }),
      });
      window.location.href = res.redirect;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setApproving(false);
    }
  }

  function handleDeny() {
    if (!redirectUri) return;
    const url = new URL(redirectUri);
    url.searchParams.set("error", "access_denied");
    url.searchParams.set("error_description", "User denied access");
    if (state) url.searchParams.set("state", state);
    window.location.href = url.toString();
  }

  if (loading || !user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a" }}>
        <div style={{ width: 24, height: 24, border: "2px solid #2a2a2a", borderTopColor: "#5b63d3", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (!paramsValid) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", padding: 24 }}>
        <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 16, padding: 32, maxWidth: 400, textAlign: "center" }}>
          <p style={{ color: "#ef4444", fontSize: 14 }}>Invalid authorization request — missing required parameters.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", padding: 24 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ background: "#111111", border: "1px solid #2a2a2a", borderRadius: 20, padding: "40px 36px", maxWidth: 420, width: "100%" }}>

        {/* Logos */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 13, background: "#17172a", border: "1px solid #26264a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Image src="/posthivemain.png" alt="Posthive" width={32} height={32} style={{ borderRadius: 6 }} />
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "#333" }} />)}
          </div>
          {/* Claude.ai / MCP client icon */}
          <div style={{ width: 52, height: 52, borderRadius: 13, background: "#1a1a2e", border: "1px solid #2a2a4a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#8b91e8" strokeWidth="1.5"/>
              <path d="M8 12h8M12 8v8" stroke="#8b91e8" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#ededed", textAlign: "center", margin: "0 0 8px" }}>
          Authorize MCP access
        </h1>
        <p style={{ fontSize: 14, color: "#666", textAlign: "center", margin: "0 0 28px", lineHeight: 1.6 }}>
          <strong style={{ color: "#9ba2ee" }}>{clientId}</strong> wants to access your Posthive workspace as <strong style={{ color: "#ededed" }}>{user.email}</strong>
        </p>

        {/* Permissions */}
        <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 12, padding: "16px 20px", marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#555", letterSpacing: ".06em", margin: "0 0 12px", fontFamily: "monospace" }}>THIS CONNECTOR CAN</p>
          {[
            "List your connected social accounts",
            "Create posts as drafts (require your approval)",
            "View and manage your scheduled queue",
            "Schedule posts when you explicitly allow it",
          ].map(item => (
            <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ marginTop: 1, flexShrink: 0 }}>
                <circle cx="8" cy="8" r="7" stroke="#5b63d3" strokeWidth="1.2"/>
                <path d="M5 8l2.5 2.5 4-4" stroke="#5b63d3" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize: 13, color: "#bbb", lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid #1e1e1e", marginTop: 12, paddingTop: 12, display: "flex", alignItems: "flex-start", gap: 10 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ marginTop: 1, flexShrink: 0 }}>
              <circle cx="8" cy="8" r="7" stroke="#ef4444" strokeWidth="1.2"/>
              <path d="M5 8h6" stroke="#ef4444" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: 13, color: "#777", lineHeight: 1.5 }}>Cannot publish anything without your review</span>
          </div>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#ef4444" }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleDeny}
            disabled={approving}
            style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #2a2a2a", background: "transparent", color: "#888", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
          >
            Deny
          </button>
          <button
            onClick={handleAllow}
            disabled={approving}
            style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none", background: "#5b63d3", color: "#fff", fontSize: 14, fontWeight: 600, cursor: approving ? "not-allowed" : "pointer", opacity: approving ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            {approving && <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
            {approving ? "Authorizing…" : "Allow access"}
          </button>
        </div>

        <p style={{ fontSize: 12, color: "#444", textAlign: "center", margin: "16px 0 0", lineHeight: 1.6 }}>
          You can revoke this access anytime from <strong style={{ color: "#666" }}>Settings → API Keys</strong>
        </p>
      </div>
    </div>
  );
}
