"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";

interface InviteInfo {
  id: string;
  email: string;
  role: string;
  workspaceName: string;
  expiresAt: string;
}

function InviteContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setFetchError("No invite token provided.");
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/invites/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setFetchError(data.error ?? "Invalid or expired invite.");
        } else {
          setInvite(data.invite);
        }
      })
      .catch(() => setFetchError("Failed to load invite."));
  }, [token]);

  async function handleAccept() {
    if (!token) return;
    setAccepting(true);
    setAcceptError(null);
    try {
      await apiFetch<{ ok: boolean; workspaceId: string; workspaceName: string }>(
        `/invites/${token}/accept`,
        { method: "POST" }
      );
      setAccepted(true);
      setTimeout(() => { window.location.href = "/compose"; }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to accept invite.";
      setAcceptError(msg);
    } finally {
      setAccepting(false);
    }
  }

  function handleLoginRedirect() {
    const returnTo = `/invite?token=${token}`;
    router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      <div style={{
        background: "#111111",
        border: "1px solid #2a2a2a",
        borderRadius: "16px",
        padding: "40px",
        maxWidth: "440px",
        width: "100%",
        textAlign: "center",
      }}>
        {/* Logo */}
        <div style={{ marginBottom: "32px" }}>
          <img
            src="/posthivemain.png"
            alt="Posthive"
            style={{ width: "48px", height: "48px", borderRadius: "12px", objectFit: "cover", margin: "0 auto 12px", display: "block" }}
          />
          <span style={{ color: "#ededed", fontWeight: 700, fontSize: "18px" }}>Posthive</span>
        </div>

        {authLoading ? (
          <p style={{ color: "#888", fontSize: "14px" }}>Loading…</p>
        ) : fetchError ? (
          <>
            <h1 style={{ color: "#ededed", fontSize: "20px", fontWeight: 600, margin: "0 0 12px" }}>
              Invalid invite
            </h1>
            <p style={{ color: "#888", fontSize: "14px", margin: "0 0 24px" }}>{fetchError}</p>
            <button
              onClick={() => router.push("/")}
              style={{
                background: "#ffffff",
                color: "#0a0a0a",
                border: "none",
                borderRadius: "8px",
                padding: "10px 24px",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Go to Posthive
            </button>
          </>
        ) : !invite ? (
          <p style={{ color: "#888", fontSize: "14px" }}>Loading invite…</p>
        ) : accepted ? (
          <>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>🎉</div>
            <h1 style={{ color: "#ededed", fontSize: "20px", fontWeight: 600, margin: "0 0 8px" }}>
              Welcome to {invite.workspaceName}!
            </h1>
            <p style={{ color: "#888", fontSize: "14px" }}>Redirecting you to the app…</p>
          </>
        ) : (
          <>
            <h1 style={{ color: "#ededed", fontSize: "22px", fontWeight: 600, margin: "0 0 8px" }}>
              You&apos;re invited
            </h1>
            <p style={{ color: "#888", fontSize: "14px", margin: "0 0 24px", lineHeight: "1.5" }}>
              Join <strong style={{ color: "#ededed" }}>{invite.workspaceName}</strong> on Posthive as a{" "}
              <strong style={{ color: "#ededed" }}>{invite.role}</strong>.
            </p>

            <div style={{
              background: "#1a1a1a",
              border: "1px solid #2a2a2a",
              borderRadius: "10px",
              padding: "16px",
              marginBottom: "24px",
              textAlign: "left",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "#888", fontSize: "12px" }}>Workspace</span>
                <span style={{ color: "#ededed", fontSize: "12px", fontWeight: 500 }}>{invite.workspaceName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "#888", fontSize: "12px" }}>Invited email</span>
                <span style={{ color: "#ededed", fontSize: "12px", fontWeight: 500 }}>{invite.email}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#888", fontSize: "12px" }}>Role</span>
                <span style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "99px",
                  background: invite.role === "admin" ? "rgba(91,99,211,0.2)" : "rgba(136,136,136,0.15)",
                  color: invite.role === "admin" ? "#a5aaff" : "#888",
                  textTransform: "capitalize",
                }}>
                  {invite.role}
                </span>
              </div>
            </div>

            {!user ? (
              <>
                <p style={{ color: "#888", fontSize: "13px", marginBottom: "16px" }}>
                  Sign in to your Posthive account to accept this invite.
                </p>
                <button
                  onClick={handleLoginRedirect}
                  style={{
                    width: "100%",
                    background: "#ffffff",
                    color: "#0a0a0a",
                    border: "none",
                    borderRadius: "8px",
                    padding: "12px 24px",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Sign in to accept
                </button>
                <p style={{ color: "#555", fontSize: "12px", marginTop: "12px" }}>
                  Don&apos;t have an account?{" "}
                  <a
                    href={`/register?returnTo=${encodeURIComponent(`/invite?token=${token}`)}`}
                    style={{ color: "#5b63d3", textDecoration: "none" }}
                  >
                    Create one
                  </a>
                </p>
              </>
            ) : user.email !== invite.email ? (
              <>
                <div style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  marginBottom: "16px",
                }}>
                  <p style={{ color: "#f87171", fontSize: "13px", margin: 0 }}>
                    This invite was sent to <strong>{invite.email}</strong>, but you&apos;re signed in as{" "}
                    <strong>{user.email}</strong>.
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/login?returnTo=${encodeURIComponent(`/invite?token=${token}`)}`)}
                  style={{
                    width: "100%",
                    background: "#ffffff",
                    color: "#0a0a0a",
                    border: "none",
                    borderRadius: "8px",
                    padding: "12px 24px",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Sign in with a different account
                </button>
              </>
            ) : (
              <>
                {acceptError && (
                  <div style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    marginBottom: "16px",
                  }}>
                    <p style={{ color: "#f87171", fontSize: "13px", margin: 0 }}>{acceptError}</p>
                  </div>
                )}
                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  style={{
                    width: "100%",
                    background: accepting ? "#555" : "#ffffff",
                    color: "#0a0a0a",
                    border: "none",
                    borderRadius: "8px",
                    padding: "12px 24px",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: accepting ? "not-allowed" : "pointer",
                  }}
                >
                  {accepting ? "Joining…" : `Join ${invite.workspaceName}`}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={null}>
      <InviteContent />
    </Suspense>
  );
}
