import type { FastifyRequest, FastifyReply } from "fastify";
import { authProvider } from "./index.js";
import type { AuthUser } from "./types.js";

const ACCESS_COOKIE = "ss-access-token";
const REFRESH_COOKIE = "ss-refresh-token";

export const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export const ACCESS_COOKIE_NAME = ACCESS_COOKIE;
export const REFRESH_COOKIE_NAME = REFRESH_COOKIE;

// Fastify preHandler — attach to any route that requires auth.
// Sets req.user or returns 401.
// Also accepts ?token= query param for endpoints (like SSE) where cookies can't be sent cross-origin.
export async function withAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const queryToken = (req.query as Record<string, string>)?.token;
  const accessToken = queryToken ?? req.cookies?.[ACCESS_COOKIE];
  const refreshToken = req.cookies?.[REFRESH_COOKIE];

  if (!accessToken && !refreshToken) {
    return reply.status(401).send({ error: "Not authenticated" });
  }

  // Try access token first
  if (accessToken) {
    const user = await authProvider.validateAccessToken(accessToken);
    if (user) {
      (req as FastifyRequest & { user: AuthUser }).user = user;
      return;
    }
  }

  // Access token expired — try refresh
  if (refreshToken) {
    const tokens = await authProvider.refreshTokens(refreshToken);
    if (tokens) {
      // Rotate cookies
      reply.setCookie(ACCESS_COOKIE, tokens.accessToken, {
        ...COOKIE_OPTS,
        maxAge: 15 * 60, // 15 min
      });
      reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, {
        ...COOKIE_OPTS,
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });

      const user = await authProvider.validateAccessToken(tokens.accessToken);
      if (user) {
        (req as FastifyRequest & { user: AuthUser }).user = user;
        return;
      }
    }
  }

  // Clear bad cookies
  reply.clearCookie(ACCESS_COOKIE, { path: "/" });
  reply.clearCookie(REFRESH_COOKIE, { path: "/" });
  return reply.status(401).send({ error: "Session expired — please log in again" });
}

// Type helper — use in route handlers after withAuth preHandler
export function getUser(req: FastifyRequest): AuthUser {
  return (req as FastifyRequest & { user: AuthUser }).user;
}
