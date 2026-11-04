import crypto from "crypto";
import {
  ABSOLUTE_TTL_MS,
  TOUCH_THROTTLE_MS,
  classifyRefresh,
  sessionState,
  type SessionRecord,
} from "./sessionPolicy.js";

export interface SessionStore {
  create(data: Omit<SessionRecord, "id" | "createdAt">): Promise<SessionRecord>;
  findById(id: string): Promise<SessionRecord | null>;
  /** Matches the current OR the previous token hash. */
  findByAnyTokenHash(hash: string): Promise<SessionRecord | null>;
  update(id: string, patch: Partial<Omit<SessionRecord, "id" | "userId" | "createdAt">>): Promise<void>;
  delete(id: string): Promise<void>;
  deleteAllForUser(userId: string, exceptId?: string): Promise<void>;
}

export interface SessionServiceDeps {
  store: SessionStore;
  now?: () => Date;
  randomToken?: () => string;
}

export interface CreatedSession {
  sessionId: string;
  refreshToken: string;
}

export interface RefreshedSession {
  sessionId: string;
  userId: string;
  /** null = cookie already rotated by a parallel request, leave it alone. */
  refreshToken: string | null;
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function createSessionService(deps: SessionServiceDeps) {
  const { store } = deps;
  const now = deps.now ?? (() => new Date());
  const randomToken = deps.randomToken ?? (() => crypto.randomBytes(32).toString("base64url"));

  return {
    async create(userId: string): Promise<CreatedSession> {
      const t = now();
      const refreshToken = randomToken();
      const row = await store.create({
        userId,
        tokenHash: hashToken(refreshToken),
        prevTokenHash: null,
        rotatedAt: null,
        lastActiveAt: t,
        expiresAt: new Date(t.getTime() + ABSOLUTE_TTL_MS),
      });
      return { sessionId: row.id, refreshToken };
    },

    /** Validates a session id from the access JWT. Slides the idle window (throttled). */
    async authenticate(sessionId: string): Promise<{ userId: string } | null> {
      const row = await store.findById(sessionId);
      if (!row) return null;
      const t = now();
      if (sessionState(row, t) !== "active") {
        await store.delete(row.id);
        return null;
      }
      if (t.getTime() - row.lastActiveAt.getTime() >= TOUCH_THROTTLE_MS) {
        await store.update(row.id, { lastActiveAt: t });
      }
      return { userId: row.userId };
    },

    async refresh(rawToken: string): Promise<RefreshedSession | null> {
      const hash = hashToken(rawToken);
      const row = await store.findByAnyTokenHash(hash);
      const t = now();
      const decision = classifyRefresh(row, hash, t);

      switch (decision) {
        case "rotate": {
          const next = randomToken();
          await store.update(row!.id, {
            tokenHash: hashToken(next),
            prevTokenHash: hash,
            rotatedAt: t,
            lastActiveAt: t,
          });
          return { sessionId: row!.id, userId: row!.userId, refreshToken: next };
        }
        case "grace":
          return { sessionId: row!.id, userId: row!.userId, refreshToken: null };
        case "reuse":
        case "expired":
          await store.delete(row!.id);
          return null;
        default:
          return null;
      }
    },

    async revoke(sessionId: string): Promise<void> {
      await store.delete(sessionId);
    },

    async revokeByToken(rawToken: string): Promise<void> {
      const row = await store.findByAnyTokenHash(hashToken(rawToken));
      if (row) await store.delete(row.id);
    },

    async revokeAllForUser(userId: string, exceptSessionId?: string): Promise<void> {
      await store.deleteAllForUser(userId, exceptSessionId);
    },
  };
}

export type SessionService = ReturnType<typeof createSessionService>;
