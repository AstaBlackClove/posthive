import type { FastifyRequest, FastifyReply } from "fastify";
import type { AuthProvider, AuthUser } from "./types.js";
import { ACCESS_TTL_MS, ABSOLUTE_TTL_MS } from "./sessionPolicy.js";

// No prisma import here on purpose: keeps the guard unit-testable.

export const ACCESS_COOKIE_NAME = "ss-access-token";
export const REFRESH_COOKIE_NAME = "ss-refresh-token";

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

/** Set auth cookies. Pass `refreshToken: null` to leave the refresh cookie unchanged. */
export function setAuthCookies(reply: FastifyReply, accessToken: string, refreshToken: string | null): void {
  reply.setCookie(ACCESS_COOKIE_NAME, accessToken, { ...COOKIE_OPTS, maxAge: Math.floor(ACCESS_TTL_MS / 1000) });
  if (refreshToken) {
    reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, { ...COOKIE_OPTS, maxAge: Math.floor(ABSOLUTE_TTL_MS / 1000) });
  }
}

export function clearAuthCookies(reply: FastifyReply): void {
  reply.clearCookie(ACCESS_COOKIE_NAME, { path: "/" });
  reply.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
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
          setAuthCookies(reply, tokens.accessToken, tokens.refreshToken);
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
