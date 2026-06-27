import type { FastifyRequest, FastifyReply } from "fastify";
import { authProvider } from "./index.js";
import type { AuthUser } from "./types.js";

const ACCESS_COOKIE = "ss-access-token";
const REFRESH_COOKIE = "ss-refresh-token";

export const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production" || process.env.SECURE_COOKIES === "true",
  path: "/",
};

export const ACCESS_COOKIE_NAME = ACCESS_COOKIE;
export const REFRESH_COOKIE_NAME = REFRESH_COOKIE;

async function resolveUser(
  req: FastifyRequest,
  reply: FastifyReply,
  accessToken: string | undefined,
): Promise<boolean> {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];

  if (!accessToken && !refreshToken) {
    await reply.status(401).send({ error: "Not authenticated" });
    return false;
  }

  // Try access token first
  if (accessToken) {
    const user = await authProvider.validateAccessToken(accessToken);
    if (user) {
      (req as FastifyRequest & { user: AuthUser }).user = user;
      return true;
    }
  }

  // Access token expired — try refresh
  if (refreshToken) {
    const tokens = await authProvider.refreshTokens(refreshToken);
    if (tokens) {
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
        return true;
      }
    }
  }

  // Clear bad cookies
  reply.clearCookie(ACCESS_COOKIE, { path: "/" });
  reply.clearCookie(REFRESH_COOKIE, { path: "/" });
  await reply.status(401).send({ error: "Session expired — please log in again" });
  return false;
}

// Fastify preHandler — cookies only, no query param.
// Use this on all routes except SSE.
export async function withAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const accessToken = req.cookies?.[ACCESS_COOKIE];
  await resolveUser(req, reply, accessToken);
}

// For the SSE route only — also accepts ?token= query param because EventSource
// cannot send cookies cross-origin. Do not use on any other route.
export async function withAuthOrToken(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const queryToken = (req.query as Record<string, string>)?.token;
  const accessToken = queryToken ?? req.cookies?.[ACCESS_COOKIE];
  await resolveUser(req, reply, accessToken);
}

// Type helper — use in route handlers after withAuth preHandler
export function getUser(req: FastifyRequest): AuthUser {
  return (req as FastifyRequest & { user: AuthUser }).user;
}
