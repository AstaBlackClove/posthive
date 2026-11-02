"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import { cn } from "../../lib/cn";

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
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="card w-full max-w-110 p-8 text-center">
        {/* Logo */}
        <div className="mb-8">
          <img
            src="/posthivemain.png"
            alt="Posthive"
            className="mx-auto mb-3 block size-12 rounded-xl object-cover"
          />
          <span className="type-body-sb-l text-fg">Posthive</span>
        </div>

        {authLoading ? (
          <p className="type-body-r-s text-muted">Loading…</p>
        ) : fetchError ? (
          <>
            <h1 className="mb-3 type-head-sb-5 text-fg">
              Invalid invite
            </h1>
            <p className="mb-6 type-body-r-s text-muted">{fetchError}</p>
            <button
              onClick={() => router.push("/")}
              className="btn-primary px-6 py-2.5"
            >
              Go to Posthive
            </button>
          </>
        ) : !invite ? (
          <p className="type-body-r-s text-muted">Loading invite…</p>
        ) : accepted ? (
          <>
            <div className="mb-4 text-4xl">🎉</div>
            <h1 className="mb-2 type-head-sb-5 text-fg">
              Welcome to {invite.workspaceName}!
            </h1>
            <p className="type-body-r-s text-muted">Redirecting you to the app…</p>
          </>
        ) : (
          <>
            <h1 className="mb-2 type-head-sb-5 text-fg">
              You&apos;re invited
            </h1>
            <p className="mb-6 type-body-r-s text-muted">
              Join <strong className="text-fg">{invite.workspaceName}</strong> on Posthive as a{" "}
              <strong className="text-fg">{invite.role}</strong>.
            </p>

            <div className="mb-6 rounded-xl border border-border bg-bg p-4 text-left">
              <div className="mb-2 flex justify-between">
                <span className="type-body-r-xs text-muted">Workspace</span>
                <span className="type-body-m-xs text-fg">{invite.workspaceName}</span>
              </div>
              <div className="mb-2 flex justify-between">
                <span className="type-body-r-xs text-muted">Invited email</span>
                <span className="type-body-m-xs text-fg">{invite.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="type-body-r-xs text-muted">Role</span>
                <span className={cn(
                  "rounded-full px-2 py-0.5 type-body-sb-xs capitalize",
                  invite.role === "admin" ? "bg-brand-100 text-brand-800" : "bg-neutral-100 text-muted",
                )}>
                  {invite.role}
                </span>
              </div>
            </div>

            {!user ? (
              <>
                <p className="mb-4 type-body-r-s text-muted">
                  Sign in to your Posthive account to accept this invite.
                </p>
                <button
                  onClick={handleLoginRedirect}
                  className="btn-primary w-full py-2.5"
                >
                  Sign in to accept
                </button>
                <p className="mt-3 type-body-r-xs text-muted">
                  Don&apos;t have an account?{" "}
                  <a
                    href={`/register?returnTo=${encodeURIComponent(`/invite?token=${token}`)}`}
                    className="type-body-sb-xs text-brand-800 hover:underline"
                  >
                    Create one
                  </a>
                </p>
              </>
            ) : user.email !== invite.email ? (
              <>
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <p className="type-body-r-s text-red-600">
                    This invite was sent to <strong>{invite.email}</strong>, but you&apos;re signed in as{" "}
                    <strong>{user.email}</strong>.
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/login?returnTo=${encodeURIComponent(`/invite?token=${token}`)}`)}
                  className="btn-primary w-full py-2.5"
                >
                  Sign in with a different account
                </button>
              </>
            ) : (
              <>
                {acceptError && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5">
                    <p className="type-body-r-s text-red-600">{acceptError}</p>
                  </div>
                )}
                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="btn-primary w-full py-2.5"
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
