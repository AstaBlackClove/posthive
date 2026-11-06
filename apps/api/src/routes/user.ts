import type { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { authProvider } from "../lib/auth/index.js";
import { withAuth, getUser, getWorkspaceId, setAuthCookies, clearAuthCookies, isPersistent, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "../lib/auth/withAuth.js";
import { SESSION_EXPIRED_BODY, UNAUTHENTICATED_BODY } from "../lib/auth/authGuard.js";
import { createLocalTokens } from "../lib/auth/localAuth.js";
import { passwordProblem, RESET_LINK_TTL_MIN } from "../lib/auth/passwordPolicy.js";
import { generateCode, hashCode, isCodeFormat } from "../lib/auth/emailCode.js";
import { markEmailVerified, verifyEmailCode } from "../lib/auth/emailVerification.js";
import { claimResetAndSetPassword } from "../lib/auth/passwordReset.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../lib/mailer.js";

const registerBody = z.object({
  email: z.string().email(),
  password: z.string().superRefine((value, ctx) => {
    const problem = passwordProblem(value);
    if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem });
  }),
  name: z.string().min(1),
  // "Send me tips & product updates"
  marketing: z.boolean().optional().default(false),
});

const VERIFY_LINK_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Replace the user's pending verification with a fresh link token + 6-digit code and mail both.
 * Replacing the row also resets the wrong-guess counter, so a resend is a clean start.
 */
async function issueVerification(userId: string, email: string): Promise<void> {
  await prisma.emailVerification.deleteMany({ where: { userId, usedAt: null } });
  const token = crypto.randomBytes(32).toString("hex");
  const code = generateCode();
  await prisma.emailVerification.create({
    data: { userId, token, email, codeHash: hashCode(token, code), expiresAt: new Date(Date.now() + VERIFY_LINK_TTL_MS) },
  });
  const webUrl = process.env.WEB_URL ?? "http://localhost:3000";
  await sendVerificationEmail(email, `${webUrl}/verify-email?token=${token}`, code);
}

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  // "Keep me logged in". Unchecked = session cookies that end when the browser closes.
  remember: z.boolean().optional().default(true),
});

/** First validation message as a plain string, so the web app can show it as-is. */
function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid request";
}

export async function userRoutes(app: FastifyInstance): Promise<void> {

  // Register
  app.post("/auth/register", {
    config: { rateLimit: { max: 10, timeWindow: "15 minutes" } },
  }, async (req, reply) => {
    const parsed = registerBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: firstIssue(parsed.error) });

    try {
      const { user, accessToken, refreshToken } = await authProvider.register(
        parsed.data.email, parsed.data.password, parsed.data.name
      );
      setAuthCookies(reply, accessToken, refreshToken);

      // The account already exists and the user is logged in, so a failure here must not turn
      // the sign-up into a 400 (a retry would say "Email already in use"). Log it and go on.
      if (parsed.data.marketing) {
        try {
          await prisma.user.update({ where: { id: user.id }, data: { marketingOptIn: true } });
        } catch (err) {
          console.error("[register] marketing opt-in not saved:", err);
        }
      }

      // Verification email (link + 6-digit code). Mail failures must not fail the sign-up:
      // the user can ask for a new one from the verify screen.
      try {
        await issueVerification(user.id, parsed.data.email);
      } catch (err) {
        console.error("[register] verification email failed:", err);
      }

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
    if (!parsed.success) return reply.status(400).send({ error: firstIssue(parsed.error) });

    try {
      const { user, accessToken, refreshToken } = await authProvider.login(
        parsed.data.email, parsed.data.password
      );
      setAuthCookies(reply, accessToken, refreshToken, { persistent: parsed.data.remember });
      return reply.send({ user });
    } catch (err) {
      return reply.status(401).send({ error: String(err instanceof Error ? err.message : err) });
    }
  });

  // Logout
  app.post("/auth/logout", { preHandler: [withAuth] }, async (req, reply) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    await authProvider.logout(refreshToken ?? "", req.sessionId);
    clearAuthCookies(reply);
    return reply.send({ ok: true });
  });

  // Session — returns current user + raw access token (needed for SSE cross-origin)
  app.get("/auth/session", { preHandler: [withAuth] }, async (req, reply) => {
    const token = req.cookies?.[ACCESS_COOKIE_NAME];
    const u = getUser(req);
    const workspaceId = req.workspaceId;
    const [dbUser, membership] = await Promise.all([
      prisma.user.findUnique({ where: { id: u.id }, select: { emailVerified: true, passwordHash: true } }),
      workspaceId
        ? prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId: u.id } }, select: { role: true } })
        : null,
    ]);
    return reply.send({ user: { ...u, emailVerified: dbUser?.emailVerified ?? false, hasPassword: !!dbUser?.passwordHash, role: membership?.role ?? "owner" }, token });
  });

  // Refresh — explicitly refresh tokens (called by frontend if needed)
  app.post("/auth/refresh", { config: { rateLimit: { max: 20, timeWindow: "15 minutes" } } }, async (req, reply) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) return reply.status(401).send(UNAUTHENTICATED_BODY);

    const tokens = await authProvider.refreshTokens(refreshToken);
    if (!tokens) {
      clearAuthCookies(reply);
      return reply.status(401).send(SESSION_EXPIRED_BODY);
    }

    setAuthCookies(reply, tokens.accessToken, tokens.refreshToken, { persistent: isPersistent(req) });
    return reply.send({ ok: true });
  });

  // Heartbeat — the web app calls this while the user is active (typing in compose
  // sends no API requests) so the 1h idle timeout does not fire mid-work.
  app.post("/auth/ping", { preHandler: [withAuth] }, async (_req, reply) => reply.status(204).send());

  // ── Email verification ────────────────────────────────────────────────────

  // Consume verification token
  app.post("/auth/verify-email", async (req, reply) => {
    const { token } = req.body as { token?: string };
    if (!token) return reply.status(400).send({ error: "Token required" });

    const record = await prisma.emailVerification.findUnique({ where: { token } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return reply.status(400).send({ error: "This verification link is invalid or has expired." });
    }

    // Only counts while the user's email is still the address this link was mailed to.
    const verified = await markEmailVerified(record.userId, record.email);
    await prisma.emailVerification.delete({ where: { id: record.id } });
    if (!verified) {
      return reply.status(400).send({ error: "This verification link is invalid or has expired." });
    }

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

    await issueVerification(userId, user.email);
    return reply.send({ ok: true });
  });

  // Verify with the 6-digit code from the email. The user is already logged in (sign-up logs in first).
  app.post("/auth/verify-email/code", {
    preHandler: [withAuth],
    config: { rateLimit: { max: 10, timeWindow: "15 minutes" } },
  }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { code } = (req.body ?? {}) as { code?: unknown };
    if (!isCodeFormat(code)) return reply.status(400).send({ error: "Enter the 6-digit code." });

    const problem = await verifyEmailCode(userId, code);
    if (problem) return reply.status(400).send({ error: problem });
    return reply.send({ ok: true });
  });

  // "Wrong email? Change": fix a typo in the sign-up email while it is still unverified.
  // Safe because the new address must be verified with a fresh code before it counts.
  app.post("/auth/change-email", {
    preHandler: [withAuth],
    config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
  }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: "Enter a valid email address." });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, emailVerified: true, passwordHash: true },
    });
    if (!user) return reply.status(404).send({ error: "User not found" });
    if (user.emailVerified) return reply.status(400).send({ error: "Your email is already verified." });
    // Supabase accounts keep their email in Supabase; changing only our copy would split them.
    if (!user.passwordHash) return reply.status(400).send({ error: "Email change isn't available for this account." });

    const email = parsed.data.email;
    if (email !== user.email) {
      try {
        // Conditional on "still unverified" so a code verified in parallel cannot end up
        // attached to an address nobody checked.
        const changed = await prisma.user.updateMany({
          where: { id: userId, emailVerified: false },
          data: { email },
        });
        if (changed.count === 0) {
          return reply.status(400).send({ error: "Your email is already verified." });
        }
      } catch (err) {
        if ((err as { code?: string }).code === "P2002") {
          return reply.status(400).send({ error: "Email already in use" });
        }
        throw err;
      }
    }

    await issueVerification(userId, email);
    return reply.send({ ok: true, email });
  });

  // ── Password reset ────────────────────────────────────────────────────────

  // Request reset — always returns 200 to avoid email enumeration
  app.post("/auth/forgot-password", {
    config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
  }, async (req, reply) => {
    const { email } = req.body as { email?: string };
    if (!email) return reply.status(400).send({ error: "Email required" });

    // Supabase: generate the magic link via admin API, send it through Resend
    // so the user gets our branded email instead of Supabase's default.
    if (process.env.AUTH_PROVIDER === "supabase") {
      const { createClient } = await import("@supabase/supabase-js");
      const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const webUrl = process.env.WEB_URL ?? "http://localhost:3000";
      const { data, error } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: `${webUrl}/reset-password` },
      });
      // Always return 200 to avoid email enumeration
      if (!error && data?.properties?.action_link) {
        await sendPasswordResetEmail(email, data.properties.action_link);
      }
      return reply.send({ ok: true });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.passwordReset.deleteMany({ where: { userId: user.id, usedAt: null } });

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + RESET_LINK_TTL_MIN * 60 * 1000);
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
    const problem = passwordProblem(password);
    if (problem) return reply.status(400).send({ error: problem });

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
      // Supabase sessions come from Supabase, not us: the web app sends the user to /login.
      return reply.send({ ok: true, loggedIn: false });
    }

    const reset = await prisma.passwordReset.findUnique({ where: { token } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      return reply.status(400).send({ error: "This reset link is invalid or has expired." });
    }

    // Hash first (slow), so the transaction inside the helper stays short.
    const passwordHash = await bcrypt.hash(password, 12);
    // Claim the link and set the password together: parallel requests with the same link
    // cannot both succeed, and a failed save does not burn the link.
    if (!(await claimResetAndSetPassword(reset.id, reset.userId, passwordHash))) {
      return reply.status(400).send({ error: "This reset link is invalid or has expired." });
    }
    // Everything signed in with the old password is out; this request gets a fresh session.
    await authProvider.revokeOtherSessions?.(reset.userId);
    const { accessToken, refreshToken } = await createLocalTokens(reset.userId);
    setAuthCookies(reply, accessToken, refreshToken);

    return reply.send({ ok: true, loggedIn: true });
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
    const problem = passwordProblem(newPassword);
    if (problem) return reply.status(400).send({ error: problem });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) return reply.status(400).send({ error: "Password change not supported for this account" });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return reply.status(400).send({ error: "Current password is incorrect" });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    // Sign out every other device; this one stays logged in.
    await authProvider.revokeOtherSessions?.(userId, req.sessionId);
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
    const workspaceId = getWorkspaceId(req);
    const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { webhookUrl: true, plan: true, planStatus: true } });
    if (!canUseWebhook(ws?.plan ?? "", ws?.planStatus ?? "")) {
      return reply.send({ webhookUrl: null, locked: true });
    }
    return reply.send({ webhookUrl: ws?.webhookUrl ?? null, locked: false });
  });

  // Set / clear webhook URL
  app.patch("/user/webhook", { preHandler: [withAuth] }, async (req, reply) => {
    const workspaceId = getWorkspaceId(req);
    const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { plan: true, planStatus: true } });
    if (!canUseWebhook(ws?.plan ?? "", ws?.planStatus ?? "")) {
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
    await prisma.workspace.update({ where: { id: workspaceId }, data: { webhookUrl: url } });
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

    // Find all workspaces this user owns — those must be deleted in full
    const ownedMemberships = await prisma.workspaceMember.findMany({
      where: { userId, role: "owner" },
      select: { workspaceId: true },
    });
    const ownedWorkspaceIds = ownedMemberships.map((m) => m.workspaceId);

    // Collect all PostJob IDs we need to clean up: user's own jobs + jobs in owned workspaces
    const allJobs = await prisma.postJob.findMany({
      where: {
        OR: [
          { userId },
          ...(ownedWorkspaceIds.length > 0 ? [{ workspaceId: { in: ownedWorkspaceIds } }] : []),
        ],
      },
      select: { id: true },
    });
    const allJobIds = allJobs.map((j) => j.id);

    // Collect all Account IDs in owned workspaces — PostJobTargets reference them without cascade
    const workspaceAccountIds = ownedWorkspaceIds.length > 0
      ? (await prisma.account.findMany({
          where: { workspaceId: { in: ownedWorkspaceIds } },
          select: { id: true },
        })).map((a) => a.id)
      : [];

    // 1. Delete PostJobTargets first (no FK cascade on Account → PostJobTarget)
    if (allJobIds.length > 0 || workspaceAccountIds.length > 0) {
      await prisma.postJobTarget.deleteMany({
        where: {
          OR: [
            ...(allJobIds.length > 0 ? [{ postJobId: { in: allJobIds } }] : []),
            ...(workspaceAccountIds.length > 0 ? [{ accountId: { in: workspaceAccountIds } }] : []),
          ],
        },
      });
    }

    // 2. Delete PostJobs
    if (allJobIds.length > 0) {
      await prisma.postJob.deleteMany({ where: { id: { in: allJobIds } } });
    }

    // 3. Delete Accounts (user-owned + workspace-owned)
    await prisma.account.deleteMany({
      where: {
        OR: [
          { userId },
          ...(ownedWorkspaceIds.length > 0 ? [{ workspaceId: { in: ownedWorkspaceIds } }] : []),
        ],
      },
    });

    // 4. For each owned workspace, switch affected members' activeWorkspaceId away
    if (ownedWorkspaceIds.length > 0) {
      const affectedUsers = await prisma.user.findMany({
        where: { activeWorkspaceId: { in: ownedWorkspaceIds }, id: { not: userId } },
        select: { id: true },
      });
      await Promise.all(affectedUsers.map(async (u) => {
        const next = await prisma.workspaceMember.findFirst({
          where: { userId: u.id, workspaceId: { notIn: ownedWorkspaceIds } },
          orderBy: { joinedAt: "asc" },
        });
        await prisma.user.update({
          where: { id: u.id },
          data: { activeWorkspaceId: next?.workspaceId ?? null },
        });
      }));

      // 5. Delete owned workspaces (cascades: WorkspaceMember, WorkspaceInvite, Template, ApiKey)
      await prisma.workspace.deleteMany({ where: { id: { in: ownedWorkspaceIds } } });
    }

    // 6. Clear user's activeWorkspaceId to avoid FK violation on user delete
    await prisma.user.update({ where: { id: userId }, data: { activeWorkspaceId: null } });

    // 7. Delete remaining user data (cascade handles WorkspaceMember, AuthSession, ApiKey, Template, etc.)
    await authProvider.revokeOtherSessions?.(userId);
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

  // Public stats — no auth, cached 6h in memory.
  // TTL is long because this is a vanity counter — staleness is fine.
  // A single in-flight promise prevents concurrent requests from all hitting DB.
  let statsCache: { accounts: number; published: number; cachedAt: number } | null = null;
  const STATS_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
  let statsFlight: Promise<void> | null = null;

  async function refreshStats(): Promise<void> {
    const [accounts, published] = await Promise.all([
      prisma.account.count(),
      prisma.postJobTarget.count({
        where: { status: { in: ["post_done", "comment_done"] } },
      }),
    ]);
    statsCache = { accounts, published, cachedAt: Date.now() };
  }

  app.get("/stats/public", async (_req, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    if (statsCache && Date.now() - statsCache.cachedAt < STATS_TTL_MS) {
      return reply.send(statsCache);
    }
    // Coalesce concurrent misses into one DB query
    if (!statsFlight) {
      statsFlight = refreshStats().finally(() => { statsFlight = null; });
    }
    await statsFlight;
    return reply.send(statsCache);
  });
}
