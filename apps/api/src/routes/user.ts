import type { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
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
  app.post("/auth/register", {
    config: { rateLimit: { max: 10, timeWindow: "15 minutes" } },
  }, async (req, reply) => {
    const parsed = registerBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    try {
      const { user, accessToken, refreshToken } = await authProvider.register(
        parsed.data.email, parsed.data.password, parsed.data.name
      );
      setAuthCookies(reply, accessToken, refreshToken);
      return reply.status(201).send({ user });
    } catch (err) {
      console.error("[register] error:", err);
      return reply.status(400).send({ error: err instanceof Error ? err.message : "Registration failed" });
    }
  });

  // Login
  app.post("/auth/login", {
    config: { rateLimit: { max: 10, timeWindow: "15 minutes" } },
  }, async (req, reply) => {
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

  // ── Settings ──────────────────────────────────────────────────────────────

  // Update profile (name + email)
  app.patch("/user/profile", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { name, email } = req.body as { name?: string; email?: string };
    if (!name && !email) return reply.status(400).send({ error: "Nothing to update" });

    if (email) {
      const existing = await prisma.user.findFirst({ where: { email, NOT: { id: userId } } });
      if (existing) return reply.status(400).send({ error: "Email already in use" });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { ...(name ? { name } : {}), ...(email ? { email } : {}) },
    });
    return reply.send({ user: { id: updated.id, email: updated.email, name: updated.name, avatarUrl: updated.avatarUrl } });
  });

  // Change password
  app.patch("/user/password", {
    preHandler: [withAuth],
    config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
  }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
    if (!currentPassword || !newPassword) return reply.status(400).send({ error: "Both fields required" });
    if (newPassword.length < 8) return reply.status(400).send({ error: "Password must be at least 8 characters" });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) return reply.status(400).send({ error: "Password change not supported for this account" });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return reply.status(400).send({ error: "Current password is incorrect" });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return reply.send({ ok: true });
  });

  // Delete account
  app.delete("/user", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { password } = req.body as { password: string };
    if (!password) return reply.status(400).send({ error: "Password required" });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) return reply.status(400).send({ error: "Cannot verify identity" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return reply.status(400).send({ error: "Incorrect password" });

    // Delete in dependency order to avoid FK violations
    const jobs = await prisma.postJob.findMany({ where: { userId }, select: { id: true } });
    const jobIds = jobs.map(j => j.id);
    await prisma.postJobTarget.deleteMany({ where: { postJobId: { in: jobIds } } });
    await prisma.postJob.deleteMany({ where: { userId } });
    await prisma.account.deleteMany({ where: { userId } });
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });

    reply.clearCookie(ACCESS_COOKIE_NAME, { path: "/" });
    reply.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
    return reply.send({ ok: true });
  });
}
