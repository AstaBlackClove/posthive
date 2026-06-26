import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authProvider } from "../lib/auth/index.js";
import { withAuth, getUser, COOKIE_OPTS, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "../lib/auth/withAuth.js";

const registerBody = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1),
});

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function setAuthCookies(reply: Parameters<typeof withAuth>[1], accessToken: string, refreshToken: string) {
  reply.setCookie(ACCESS_COOKIE_NAME, accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 });
  reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, { ...COOKIE_OPTS, maxAge: 30 * 24 * 60 * 60 });
}

export async function userRoutes(app: FastifyInstance): Promise<void> {

  // Register
  app.post("/auth/register", async (req, reply) => {
    const parsed = registerBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    try {
      const { user, accessToken, refreshToken } = await authProvider.register(
        parsed.data.email, parsed.data.password, parsed.data.name
      );
      setAuthCookies(reply, accessToken, refreshToken);
      return reply.status(201).send({ user });
    } catch (err) {
      return reply.status(400).send({ error: String(err instanceof Error ? err.message : err) });
    }
  });

  // Login
  app.post("/auth/login", async (req, reply) => {
    const parsed = loginBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    try {
      const { user, accessToken, refreshToken } = await authProvider.login(
        parsed.data.email, parsed.data.password
      );
      setAuthCookies(reply, accessToken, refreshToken);
      return reply.send({ user });
    } catch (err) {
      return reply.status(401).send({ error: String(err instanceof Error ? err.message : err) });
    }
  });

  // Logout
  app.post("/auth/logout", { preHandler: [withAuth] }, async (req, reply) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (refreshToken) await authProvider.logout(refreshToken);
    reply.clearCookie(ACCESS_COOKIE_NAME, { path: "/" });
    reply.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
    return reply.send({ ok: true });
  });

  // Session — returns current user + raw access token (needed for SSE cross-origin)
  app.get("/auth/session", { preHandler: [withAuth] }, async (req, reply) => {
    const token = req.cookies?.[ACCESS_COOKIE_NAME];
    return reply.send({ user: getUser(req), token });
  });

  // Refresh — explicitly refresh tokens (called by frontend if needed)
  app.post("/auth/refresh", async (req, reply) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) return reply.status(401).send({ error: "No refresh token" });

    const tokens = await authProvider.refreshTokens(refreshToken);
    if (!tokens) {
      reply.clearCookie(ACCESS_COOKIE_NAME, { path: "/" });
      reply.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
      return reply.status(401).send({ error: "Session expired" });
    }

    setAuthCookies(reply, tokens.accessToken, tokens.refreshToken);
    return reply.send({ ok: true });
  });
}
