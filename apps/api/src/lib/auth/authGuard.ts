import type { FastifyRequest, FastifyReply } from "fastify";
import type { AuthProvider, AuthUser } from "./types.js";
import { ACCESS_TTL_MS, ABSOLUTE_TTL_MS } from "./sessionPolicy.js";

// No prisma import here on purpose: keeps the guard unit-testable.

export const ACCESS_COOKIE_NAME = "ss-access-token";
export const REFRESH_COOKIE_NAME = "ss-refresh-token";
/**
 * Present ("1") when the user logged in WITHOUT "Keep me logged in": the auth cookies are
 * then session cookies (gone when the browser closes) and rotation must keep them that way.
 * Server-side limits (1h idle, 7d cap) apply either way, so tampering with this cookie
 * only changes how long the browser keeps the user's own cookies.
 */
export const SESSION_ONLY_COOKIE_NAME = "ss-session-only";

export const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production" || process.env.SECURE_COOKIES === "true",
  path: "/",
};

export const SESSION_EXPIRED_BODY = {
  error: "Session expired — please log in again",
  code: "SESSION_EXPIRED",
} as const;

export const UNAUTHENTICATED_BODY = {
  error: "Not authenticated",
  code: "UNAUTHENTICATED",
} as const;

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
    sessionId?: string;
    workspaceId?: string | null;
  }
}

/** False when the request carries the session-only marker (login without "Keep me logged in"). */
export function isPersistent(req: FastifyRequest): boolean {
  return req.cookies?.[SESSION_ONLY_COOKIE_NAME] !== "1";
}

/**
 * Set auth cookies. Pass `refreshToken: null` to leave the refresh cookie unchanged.
 * `persistent: false` omits `maxAge` (session cookies) and sets the session-only marker.
 */
export function setAuthCookies(
  reply: FastifyReply,
  accessToken: string,
  refreshToken: string | null,
  opts: { persistent?: boolean } = {},
): void {
  const persistent = opts.persistent ?? true;
  const lifetime = (ms: number) => (persistent ? { maxAge: Math.floor(ms / 1000) } : {});

  reply.setCookie(ACCESS_COOKIE_NAME, accessToken, { ...COOKIE_OPTS, ...lifetime(ACCESS_TTL_MS) });
  if (refreshToken) {
    reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, { ...COOKIE_OPTS, ...lifetime(ABSOLUTE_TTL_MS) });
  }
  if (persistent) reply.clearCookie(SESSION_ONLY_COOKIE_NAME, { path: "/" });
  else reply.setCookie(SESSION_ONLY_COOKIE_NAME, "1", COOKIE_OPTS);
}

export function clearAuthCookies(reply: FastifyReply): void {
  reply.clearCookie(ACCESS_COOKIE_NAME, { path: "/" });
  reply.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
  reply.clearCookie(SESSION_ONLY_COOKIE_NAME, { path: "/" });
}

export interface AuthGuardDeps {
  provider: AuthProvider;
  resolveWorkspace(req: FastifyRequest, userId: string): Promise<void>;
}

export function createAuthGuard(deps: AuthGuardDeps) {
  const { provider, resolveWorkspace } = deps;

  async function accept(req: FastifyRequest, result: AuthUser & { sessionId?: string }): Promise<void> {
    const { sessionId, ...user } = result;
    req.user = user;
    req.sessionId = sessionId;
    await resolveWorkspace(req, user.id);
  }

  async function resolveUser(
    req: FastifyRequest,
    reply: FastifyReply,
    accessToken: string | undefined,
  ): Promise<boolean> {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!accessToken && !refreshToken) {
      await reply.status(401).send(UNAUTHENTICATED_BODY);
      return false;
    }

    if (accessToken) {
      const result = await provider.validateAccessToken(accessToken);
      if (result) {
        await accept(req, result);
        return true;
      }
    }

    // Access token missing/expired — try a rotating refresh.
    if (refreshToken) {
      const tokens = await provider.refreshTokens(refreshToken);
      if (tokens) {
        const result = await provider.validateAccessToken(tokens.accessToken);
        if (result) {
          setAuthCookies(reply, tokens.accessToken, tokens.refreshToken, { persistent: isPersistent(req) });
          await accept(req, result);
          return true;
        }
      }
    }

    clearAuthCookies(reply);
    await reply.status(401).send(SESSION_EXPIRED_BODY);
    return false;
  }

  return {
    /** Cookies only. Use on every route except SSE. */
    async withAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
      await resolveUser(req, reply, req.cookies?.[ACCESS_COOKIE_NAME]);
    },
    /** SSE only: EventSource cannot send cookies cross-origin, so also accept ?token=. */
    async withAuthOrToken(req: FastifyRequest, reply: FastifyReply): Promise<void> {
      const queryToken = (req.query as Record<string, string>)?.token;
      await resolveUser(req, reply, queryToken ?? req.cookies?.[ACCESS_COOKIE_NAME]);
    },
  };
}
