import { useEffect } from "react";

export type ExpiryReason = "expired" | "idle";

/** Only same-site absolute paths. Blocks open redirects and login loops. */
export function safeReturnTo(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  if (/^\/(login|register)(\/|\?|#|$)/.test(value)) return null;
  return value;
}

export function loginUrl(returnTo?: string | null, reason?: ExpiryReason): string {
  const params = new URLSearchParams();
  if (reason) params.set("reason", reason === "idle" ? "expired" : reason);
  const safe = safeReturnTo(returnTo);
  if (safe) params.set("returnTo", safe);
  const qs = params.toString();
  return qs ? `/login?${qs}` : "/login";
}

// ── Unsaved-changes registry ────────────────────────────────────────────────
// Pages with in-progress forms register here so a session expiry can warn
// instead of silently throwing the user to /login.

const dirtyKeys = new Set<string>();

export function setDirty(key: string, dirty: boolean): void {
  if (dirty) dirtyKeys.add(key);
  else dirtyKeys.delete(key);
}

export function hasUnsavedChanges(): boolean {
  return dirtyKeys.size > 0;
}

export function resetDirtyForTests(): void {
  dirtyKeys.clear();
}

export function useUnsavedChanges(key: string, dirty: boolean): void {
  useEffect(() => {
    setDirty(key, dirty);
    return () => setDirty(key, false);
  }, [key, dirty]);
}

// ── Expiry events ───────────────────────────────────────────────────────────

type Listener = (reason: ExpiryReason) => void;
const listeners = new Set<Listener>();

export function onSessionExpired(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function notifySessionExpired(reason: ExpiryReason): void {
  listeners.forEach((fn) => fn(reason));
}
