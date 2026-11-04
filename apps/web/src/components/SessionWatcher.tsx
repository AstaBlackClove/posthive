"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Modal } from "./Modal";
import { hasUnsavedChanges, loginUrl, notifySessionExpired, onSessionExpired, type ExpiryReason } from "../lib/session";
import { useAuth } from "../context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Must stay below the server idle timeout (1h, src/lib/auth/sessionPolicy.ts).
const IDLE_LIMIT_MS = 60 * 60 * 1000;
const PING_EVERY_MS = 5 * 60 * 1000;
const CHECK_EVERY_MS = 30 * 1000;
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"] as const;

/**
 * Mounted once inside AuthGuard. Does three things:
 *  1. Tracks user activity and pings the API so typing in a long form does not idle the session out.
 *  2. Logs out after 1h without any input.
 *  3. On session expiry: redirects to /login (with returnTo), or, if a form has unsaved changes,
 *     asks first so nothing is lost silently.
 */
export function SessionWatcher() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [pending, setPending] = useState<ExpiryReason | null>(null);

  const lastInput = useRef(Date.now());
  const lastPing = useRef(Date.now());
  const redirected = useRef(false);

  const goToLogin = useCallback((reason: ExpiryReason) => {
    if (redirected.current) return;
    redirected.current = true;
    router.replace(loginUrl(pathname + window.location.search, reason));
  }, [router, pathname]);

  const handleExpired = useCallback((reason: ExpiryReason) => {
    if (hasUnsavedChanges()) setPending(reason);
    else goToLogin(reason);
  }, [goToLogin]);

  useEffect(() => onSessionExpired(handleExpired), [handleExpired]);

  useEffect(() => {
    if (!user) return;
    redirected.current = false;
    lastInput.current = Date.now();

    const mark = () => { lastInput.current = Date.now(); };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, mark, { passive: true }));

    const timer = window.setInterval(() => {
      const now = Date.now();
      if (now - lastInput.current >= IDLE_LIMIT_MS) {
        // Kill the server session too, then show the expired message
        fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" })
          .catch(() => {})
          .finally(() => notifySessionExpired("idle"));
        lastInput.current = now; // do not fire again while the dialog is open
        return;
      }
      // User is active but may not be making API calls (e.g. writing a caption)
      const activeSincePing = lastInput.current > lastPing.current;
      if (activeSincePing && now - lastPing.current >= PING_EVERY_MS) {
        lastPing.current = now;
        fetch(`${API_BASE}/auth/ping`, { method: "POST", credentials: "include" })
          .then((r) => { if (r.status === 401) notifySessionExpired("expired"); })
          .catch(() => {});
      }
    }, CHECK_EVERY_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, mark));
      window.clearInterval(timer);
    };
  }, [user]);

  function openLoginInNewTab() {
    window.open(loginUrl(null, pending ?? "expired"), "_blank");
  }

  // Cookies are shared between tabs: once the user logged in elsewhere, close the dialog
  // and let them save here.
  useEffect(() => {
    if (!pending) return;
    const check = async () => {
      try {
        const r = await fetch(`${API_BASE}/auth/session`, { credentials: "include" });
        if (r.ok) { lastInput.current = Date.now(); setPending(null); }
      } catch { /* still offline/expired: keep the dialog */ }
    };
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, [pending]);

  return (
    <Modal open={pending !== null} onClose={() => {}} maxWidth={440}>
      <div className="p-6" role="alertdialog" aria-labelledby="session-expired-title" aria-describedby="session-expired-desc">
        <h2 id="session-expired-title" className="mb-1 type-head-sb-5 text-fg">Session ended</h2>
        <p id="session-expired-desc" className="mb-5 type-body-r-s text-muted">
          You were signed out, but you have unsaved changes on this page. Log in again in a new tab, then come back here and save.
          Choosing &quot;Log in now&quot; discards them.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={() => pending && goToLogin(pending)}>
            Log in now
          </button>
          <button type="button" className="btn-primary" onClick={openLoginInNewTab}>
            Log in in a new tab
          </button>
        </div>
      </div>
    </Modal>
  );
}
