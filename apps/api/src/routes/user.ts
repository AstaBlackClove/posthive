import type { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { authProvider } from "../lib/auth/index.js";
import { withAuth, getUser, COOKIE_OPTS, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "../lib/auth/withAuth.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../lib/mailer.js";

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

      // Send verification email (fire-and-forget — don't block registration)
      const verifyToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await prisma.emailVerification.create({ data: { userId: user.id, token: verifyToken, expiresAt } });
      const webUrl = process.env.WEB_URL ?? "http://localhost:3000";
      sendVerificationEmail(parsed.data.email, `${webUrl}/verify-email?token=${verifyToken}`).catch(() => {});

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
    const u = getUser(req);
    const dbUser = await prisma.user.findUnique({ where: { id: u.id }, select: { emailVerified: true, passwordHash: true } });
    return reply.send({ user: { ...u, emailVerified: dbUser?.emailVerified ?? false, hasPassword: !!dbUser?.passwordHash }, token });
  });

  // Refresh — explicitly refresh tokens (called by frontend if needed)
  app.post("/auth/refresh", { config: { rateLimit: { max: 20, timeWindow: "15 minutes" } } }, async (req, reply) => {
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

  // ── Email verification ────────────────────────────────────────────────────

  // Consume verification token
  app.post("/auth/verify-email", async (req, reply) => {
    const { token } = req.body as { token?: string };
    if (!token) return reply.status(400).send({ error: "Token required" });

    const record = await prisma.emailVerification.findUnique({ where: { token } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return reply.status(400).send({ error: "This verification link is invalid or has expired." });
    }

    await prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } });
    await prisma.emailVerification.delete({ where: { id: record.id } });

    return reply.send({ ok: true });
  });

  // Resend verification email
  app.post("/auth/resend-verification", {
    preHandler: [withAuth],
    config: { rateLimit: { max: 3, timeWindow: "15 minutes" } },
  }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailVerified: true } });
    if (!user) return reply.status(404).send({ error: "User not found" });
    if (user.emailVerified) return reply.status(400).send({ error: "Email already verified" });

    // Invalidate previous unused tokens
    await prisma.emailVerification.deleteMany({ where: { userId, usedAt: null } });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.emailVerification.create({ data: { userId, token, expiresAt } });

    const webUrl = process.env.WEB_URL ?? "http://localhost:3000";
    await sendVerificationEmail(user.email, `${webUrl}/verify-email?token=${token}`);

    return reply.send({ ok: true });
  });

  // ── Password reset ────────────────────────────────────────────────────────

  // Request reset — always returns 200 to avoid email enumeration
  app.post("/auth/forgot-password", {
    config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
  }, async (req, reply) => {
    const { email } = req.body as { email?: string };
    if (!email) return reply.status(400).send({ error: "Email required" });

    // Supabase handles its own password reset emails
    if (process.env.AUTH_PROVIDER === "supabase") {
      const { createClient } = await import("@supabase/supabase-js");
      const anon = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const webUrl = process.env.WEB_URL ?? "http://localhost:3000";
      await anon.auth.resetPasswordForEmail(email, { redirectTo: `${webUrl}/reset-password` });
      return reply.send({ ok: true });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.passwordReset.deleteMany({ where: { userId: user.id, usedAt: null } });

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await prisma.passwordReset.create({ data: { userId: user.id, token, expiresAt } });

      const webUrl = process.env.WEB_URL ?? "http://localhost:3000";
      await sendPasswordResetEmail(email, `${webUrl}/reset-password?token=${token}`);
    }

    return reply.send({ ok: true });
  });

  // Consume reset token + set new password
  app.post("/auth/reset-password", {
    config: { rateLimit: { max: 10, timeWindow: "15 minutes" } },
  }, async (req, reply) => {
    const { token, password } = req.body as { token?: string; password?: string };
    if (!token || !password) return reply.status(400).send({ error: "Token and password required" });
    if (password.length < 8) return reply.status(400).send({ error: "Password must be at least 8 characters" });

    // Supabase reset: token is the access_token from the recovery magic-link hash.
    // Validate it to get the Supabase user ID, then use admin API to set the password.
    if (process.env.AUTH_PROVIDER === "supabase") {
      const { createClient } = await import("@supabase/supabase-js");
      const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      // Validate the recovery token and get the user
      const { data: userData, error: userError } = await admin.auth.getUser(token);
      if (userError || !userData.user) {
        return reply.status(400).send({ error: "This reset link is invalid or has expired." });
      }
      const { error } = await admin.auth.admin.updateUserById(userData.user.id, { password });
      if (error) return reply.status(400).send({ error: error.message });
      return reply.send({ ok: true });
    }

    const reset = await prisma.passwordReset.findUnique({ where: { token } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      return reply.status(400).send({ error: "This reset link is invalid or has expired." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } });
    await prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } });
    await prisma.refreshToken.deleteMany({ where: { userId: reset.userId } });

    return reply.send({ ok: true });
  });

  // ── Settings ──────────────────────────────────────────────────────────────

  // Update profile (name + timezone)
  app.patch("/user/profile", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { name, timezone } = req.body as { name?: string; timezone?: string };
    if (!name && !timezone) return reply.status(400).send({ error: "Nothing to update" });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name ? { name } : {}),
        ...(timezone ? { timezone } : {}),
      },
    });
    return reply.send({ user: { id: updated.id, email: updated.email, name: updated.name, avatarUrl: updated.avatarUrl, timezone: updated.timezone } });
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

  // ── Webhook ───────────────────────────────────────────────────────────────

  function canUseWebhook(plan: string, planStatus: string): boolean {
    if (process.env.ENABLE_BILLING !== "true") return true;
    if (planStatus !== "active") return false;
    return plan === "pro" || plan === "team";
  }

  // Get webhook URL
  app.get("/user/webhook", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { webhookUrl: true, plan: true, planStatus: true } });
    if (!canUseWebhook(user?.plan ?? "", user?.planStatus ?? "")) {
      return reply.send({ webhookUrl: null, locked: true });
    }
    return reply.send({ webhookUrl: user?.webhookUrl ?? null, locked: false });
  });

  // Set / clear webhook URL
  app.patch("/user/webhook", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true, planStatus: true } });
    if (!canUseWebhook(user?.plan ?? "", user?.planStatus ?? "")) {
      return reply.status(403).send({ error: "Webhook requires a Pro or Team plan.", upgrade: true });
    }
    const { webhookUrl } = req.body as { webhookUrl?: string };
    const url = webhookUrl?.trim() || null;
    if (url) {
      let parsed: URL;
      try { parsed = new URL(url); } catch {
        return reply.status(400).send({ error: "Invalid webhook URL" });
      }
      if (parsed.protocol !== "https:") {
        return reply.status(400).send({ error: "Webhook URL must use HTTPS" });
      }
      const h = parsed.hostname;
      const blocked =
        h === "localhost" ||
        /^127\./.test(h) ||
        /^10\./.test(h) ||
        /^192\.168\./.test(h) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
        h === "169.254.169.254" ||
        h.endsWith(".local") ||
        h.endsWith(".internal") ||
        h === "0.0.0.0";
      if (blocked) {
        return reply.status(400).send({ error: "Invalid webhook URL" });
      }
    }
    await prisma.user.update({ where: { id: userId }, data: { webhookUrl: url } });
    return reply.send({ ok: true });
  });

  // Delete account
  app.delete("/user", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { password } = req.body as { password?: string };

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return reply.status(404).send({ error: "User not found" });

    // Accounts with a password require confirmation; accounts without (e.g. Supabase auth
    // or directly-seeded rows) are already verified by the JWT session alone.
    if (user.passwordHash) {
      if (!password) return reply.status(400).send({ error: "Password required" });
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return reply.status(400).send({ error: "Incorrect password" });
    }

    // Delete in dependency order to avoid FK violations
    const jobs = await prisma.postJob.findMany({ where: { userId }, select: { id: true } });
    const jobIds = jobs.map(j => j.id);
    await prisma.postJobTarget.deleteMany({ where: { postJobId: { in: jobIds } } });
    await prisma.postJob.deleteMany({ where: { userId } });
    await prisma.account.deleteMany({ where: { userId } });
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });

    // Also remove from Supabase auth so the row doesn't linger in auth.users
    if (process.env.AUTH_PROVIDER === "supabase" && user.supabaseId) {
      const { createClient } = await import("@supabase/supabase-js");
      const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      await admin.auth.admin.deleteUser(user.supabaseId);
    }

    reply.clearCookie(ACCESS_COOKIE_NAME, { path: "/" });
    reply.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
    return reply.send({ ok: true });
  });
}
