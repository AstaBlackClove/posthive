// Session policy: pure functions + constants, no I/O. Time is always passed in.

const MIN = 60 * 1000;

/** Access JWT / cookie lifetime. Short so a leaked cookie dies fast. */
export const ACCESS_TTL_MS = 15 * MIN;
/** No request for this long = logged out. */
export const IDLE_TIMEOUT_MS = 60 * MIN;
/** Hard cap from login. Never extended by activity or rotation. */
export const ABSOLUTE_TTL_MS = 7 * 24 * 60 * MIN;
/** Old refresh token still accepted this long after rotation (parallel requests). */
export const ROTATION_GRACE_MS = 30 * 1000;
/** lastActiveAt is written at most this often, to avoid a DB write per request. */
export const TOUCH_THROTTLE_MS = 5 * MIN;

export interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  prevTokenHash: string | null;
  rotatedAt: Date | null;
  lastActiveAt: Date;
  expiresAt: Date;
  createdAt: Date;
}

export type SessionState = "active" | "idle_expired" | "absolute_expired";

export function sessionState(s: Pick<SessionRecord, "lastActiveAt" | "expiresAt">, now: Date): SessionState {
  if (now.getTime() >= s.expiresAt.getTime()) return "absolute_expired";
  if (now.getTime() - s.lastActiveAt.getTime() >= IDLE_TIMEOUT_MS) return "idle_expired";
  return "active";
}

export type RefreshDecision = "rotate" | "grace" | "reuse" | "expired" | "invalid";

/** Decide what to do with a presented refresh token hash. `session` was found by current OR previous hash. */
export function classifyRefresh(session: SessionRecord | null, tokenHash: string, now: Date): RefreshDecision {
  if (!session) return "invalid";
  if (sessionState(session, now) !== "active") return "expired";
  if (session.tokenHash === tokenHash) return "rotate";
  if (session.prevTokenHash === tokenHash) {
    const rotatedAt = session.rotatedAt?.getTime() ?? 0;
    return now.getTime() - rotatedAt <= ROTATION_GRACE_MS ? "grace" : "reuse";
  }
  return "invalid";
}
