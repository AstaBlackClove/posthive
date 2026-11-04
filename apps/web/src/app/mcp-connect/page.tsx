"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import Image from "next/image";

export default function McpConnectPage() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();

  const redirectUri       = searchParams.get("redirect_uri") ?? "";
  const state             = searchParams.get("state") ?? "";
  const codeChallenge     = searchParams.get("code_challenge") ?? "";
  const codeChallengeMethod = searchParams.get("code_challenge_method") ?? "S256";
  const clientId          = searchParams.get("client_id") ?? "Claude.ai";

  const [approving, setApproving] = useState(false);
  const [error, setError]         = useState("");

  // Not logged in: AuthGuard (in AppShell) sends the user to /login?returnTo=<this page> and back.

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
          client_id: clientId,
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
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="size-6 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  if (!paramsValid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-6">
        <div className="card max-w-100 p-8 text-center">
          <p className="type-body-r-s text-red-600">Invalid authorization request — missing required parameters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="card w-full max-w-105 p-8">

        {/* Logos */}
        <div className="mb-8 flex items-center justify-center gap-5">
          <div className="flex size-13 items-center justify-center rounded-xl border border-brand-300 bg-brand-100">
            <Image src="/posthivemain.png" alt="Posthive" width={32} height={32} className="rounded-md" />
          </div>
          <div className="flex gap-1">
            {[0,1,2].map(i => <div key={i} className="size-1 rounded-full bg-neutral-300" />)}
          </div>
          {/* Claude.ai / MCP client icon */}
          <div className="flex size-13 items-center justify-center rounded-xl border border-brand-300 bg-brand-100">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-brand-800">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-2 text-center type-head-sb-5 text-fg">
          Authorize MCP access
        </h1>
        <p className="mb-7 text-center type-body-r-s text-muted">
          <strong className="text-brand-800">{clientId}</strong> wants to access your Posthive workspace as <strong className="text-fg">{user.email}</strong>
        </p>

        {/* Permissions */}
        <div className="mb-6 rounded-xl border border-border bg-bg px-5 py-4">
          <p className="section-label mb-3">THIS CONNECTOR CAN</p>
          {[
            "List your connected social accounts",
            "Create posts as drafts (require your approval)",
            "View and manage your scheduled queue",
            "Schedule posts when you explicitly allow it",
          ].map(item => (
            <div key={item} className="mb-2 flex items-start gap-2.5">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0 text-green-700">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M5 8l2.5 2.5 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="type-body-r-s text-fg">{item}</span>
            </div>
          ))}
          <div className="mt-3 flex items-start gap-2.5 border-t border-border pt-3">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0 text-red-600">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M5 8h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <span className="type-body-r-s text-muted">Cannot publish anything without your review</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 type-body-r-s text-red-600">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2.5">
          <button
            onClick={handleDeny}
            disabled={approving}
            className="btn-secondary flex-1 py-2.5 text-muted"
          >
            Deny
          </button>
          <button
            onClick={handleAllow}
            disabled={approving}
            className="btn-primary flex-2 py-2.5"
          >
            {approving && <div className="size-3.5 animate-spin rounded-full border-2 border-accent-fg/30 border-t-accent-fg" />}
            {approving ? "Authorizing…" : "Allow access"}
          </button>
        </div>

        <p className="mt-4 text-center type-body-r-xs text-muted">
          You can revoke this access anytime from <strong className="text-fg">Settings → API Keys</strong>
        </p>
      </div>
    </div>
  );
}
