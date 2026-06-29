import { randomBytes } from "crypto";
import type { FastifyInstance } from "fastify";
import { encrypt } from "../lib/encryption.js";
import { prisma } from "../lib/prisma.js";
import { withAuth, getUser } from "../lib/auth/withAuth.js";

const APP_ID = process.env.THREADS_APP_ID!;
const APP_SECRET = process.env.THREADS_APP_SECRET!;
const REDIRECT_URI = process.env.THREADS_REDIRECT_URI!;
const WEB_URL = process.env.WEB_URL ?? "http://localhost:3000";

const IG_APP_ID = process.env.INSTAGRAM_APP_ID!;
const IG_APP_SECRET = process.env.INSTAGRAM_APP_SECRET!;
const IG_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI!;

const LI_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID!;
const LI_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET!;
const LI_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI!;

const MASTO_CLIENT_ID = process.env.MASTODON_CLIENT_ID!;
const MASTO_CLIENT_SECRET = process.env.MASTODON_CLIENT_SECRET!;
const MASTO_REDIRECT_URI = process.env.MASTODON_REDIRECT_URI!;
const MASTODON_SCOPES = "read:accounts write:statuses write:media";

const SCOPES = ["threads_basic", "threads_content_publish"].join(",");

// Build a redirect URL safely without double-? issues
function buildRedirect(base: string, params: Record<string, string>): string {
  const url = new URL(base);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.toString();
}

async function upsertThreadsAccount(userId: string, displayName: string, credentials: string, avatarUrl: string | null, expiresAt?: Date) {
  const existing = await prisma.account.findFirst({
    where: { platform: "threads", displayName, userId },
    select: { id: true },
  });
  return prisma.account.upsert({
    where: { id: existing?.id ?? "new" },
    create: { platform: "threads", displayName, credentials, avatarUrl, expiresAt: expiresAt ?? null, userId },
    update: { credentials, avatarUrl, expiresAt: expiresAt ?? null },
    select: { id: true, platform: true, displayName: true, avatarUrl: true, createdAt: true },
  });
}

export async function authRoutes(app: FastifyInstance): Promise<void> {

  // Step 1 — redirect to Meta OAuth, embed CSRF nonce in state param
  app.get("/auth/threads", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { from } = req.query as Record<string, string>;

    const nonce = randomBytes(32).toString("hex");
    await prisma.oAuthState.create({
      data: { userId, nonce, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });
    const state = Buffer.from(JSON.stringify({ userId, from, nonce })).toString("base64url");

    const url = new URL("https://threads.net/oauth/authorize");
    url.searchParams.set("client_id", APP_ID);
    url.searchParams.set("redirect_uri", REDIRECT_URI);
    url.searchParams.set("scope", SCOPES);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);

    return reply.redirect(url.toString());
  });

  // Step 2 — Meta redirects back with ?code= and ?state=
  app.get("/auth/threads/callback", async (req, reply) => {
    const { code, state, error, error_description } = req.query as Record<string, string>;

    if (error) {
      return reply.redirect(buildRedirect(`${WEB_URL}/accounts`, { error: error_description ?? error }));
    }
    if (!code || !state) {
      return reply.redirect(buildRedirect(`${WEB_URL}/accounts`, { error: "missing_code_or_state" }));
    }

    // Decode and verify CSRF nonce
    let userId: string;
    let from: string | undefined;
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString()) as { userId: string; from?: string; nonce?: string };
      userId = decoded.userId;
      from = decoded.from;
      const nonce = decoded.nonce;
      if (!nonce) throw new Error("missing nonce");
      const storedState = await prisma.oAuthState.findUnique({ where: { nonce } });
      if (!storedState || storedState.userId !== userId || storedState.expiresAt < new Date()) {
        return reply.redirect(buildRedirect(`${WEB_URL}/accounts`, { error: "invalid_or_expired_state" }));
      }
      await prisma.oAuthState.delete({ where: { nonce } });
    } catch {
      return reply.redirect(buildRedirect(`${WEB_URL}/accounts`, { error: "invalid_state" }));
    }

    const redirectBase = from === "onboarding" ? `${WEB_URL}/onboarding?step=2` : `${WEB_URL}/accounts`;

    // Exchange code for short-lived token
    let shortLivedToken: string;
    let threadsUserId: string;
    try {
      const tokenRes = await fetch("https://graph.threads.net/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: APP_ID, client_secret: APP_SECRET,
          grant_type: "authorization_code", redirect_uri: REDIRECT_URI, code,
        }),
      });
      if (!tokenRes.ok) throw new Error(`Token exchange failed: ${await tokenRes.text()}`);
      const tokenData = await tokenRes.json() as { access_token: string; user_id: number };
      shortLivedToken = tokenData.access_token;
      threadsUserId = String(tokenData.user_id);
    } catch {
      return reply.redirect(buildRedirect(redirectBase, { error: "token_exchange_failed" }));
    }

    // Exchange for long-lived token (60 days)
    let longLivedToken: string;
    let expiresAt: Date;
    try {
      const llRes = await fetch(`https://graph.threads.net/access_token?` +
        new URLSearchParams({ grant_type: "th_exchange_token", client_secret: APP_SECRET, access_token: shortLivedToken })
      );
      if (!llRes.ok) throw new Error(`Long-lived token exchange failed: ${await llRes.text()}`);
      const llData = await llRes.json() as { access_token: string; expires_in: number };
      longLivedToken = llData.access_token;
      expiresAt = new Date(Date.now() + (llData.expires_in - 86400) * 1000);
    } catch {
      return reply.redirect(buildRedirect(redirectBase, { error: "token_exchange_failed" }));
    }

    // Fetch username + avatar
    let displayName = threadsUserId;
    let avatarUrl: string | null = null;
    try {
      const profileRes = await fetch(
        `https://graph.threads.net/v1.0/me?fields=username,threads_profile_picture_url&access_token=${longLivedToken}`
      );
      const profile = await profileRes.json() as { username?: string; threads_profile_picture_url?: string };
      displayName = profile.username ?? threadsUserId;
      avatarUrl = profile.threads_profile_picture_url ?? null;
    } catch { /* optional */ }

    const credentials = encrypt(JSON.stringify({ accessToken: longLivedToken, userId: threadsUserId }));
    await upsertThreadsAccount(userId, displayName, credentials, avatarUrl, expiresAt);

    console.log(`[threads oauth] connected @${displayName} → user ${userId}`);
    return reply.redirect(buildRedirect(redirectBase, { connected: "threads" }));
  });

  // ── Instagram OAuth ──────────────────────────────────────────────────────────

  app.get("/auth/instagram", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { from } = req.query as Record<string, string>;
    const nonce = randomBytes(32).toString("hex");
    await prisma.oAuthState.create({ data: { userId, nonce, expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
    const state = Buffer.from(JSON.stringify({ userId, from, nonce })).toString("base64url");
    const url = new URL("https://api.instagram.com/oauth/authorize");
    url.searchParams.set("client_id", IG_APP_ID);
    url.searchParams.set("redirect_uri", IG_REDIRECT_URI);
    url.searchParams.set("scope", "instagram_business_basic,instagram_business_content_publish");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    return reply.redirect(url.toString());
  });

  app.get("/auth/instagram/callback", async (req, reply) => {
    const { code, state, error, error_description } = req.query as Record<string, string>;
    if (error) return reply.redirect(buildRedirect(`${WEB_URL}/accounts`, { error: error_description ?? error }));
    if (!code || !state) return reply.redirect(buildRedirect(`${WEB_URL}/accounts`, { error: "missing_code_or_state" }));

    let userId: string;
    let from: string | undefined;
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString()) as { userId: string; from?: string; nonce?: string };
      userId = decoded.userId;
      from = decoded.from;
      const nonce = decoded.nonce;
      if (!nonce) throw new Error("missing nonce");
      const storedState = await prisma.oAuthState.findUnique({ where: { nonce } });
      if (!storedState || storedState.userId !== userId || storedState.expiresAt < new Date()) {
        return reply.redirect(buildRedirect(`${WEB_URL}/accounts`, { error: "invalid_or_expired_state" }));
      }
      await prisma.oAuthState.delete({ where: { nonce } });
    } catch {
      return reply.redirect(buildRedirect(`${WEB_URL}/accounts`, { error: "invalid_state" }));
    }

    const redirectBase = from === "onboarding" ? `${WEB_URL}/onboarding?step=2` : `${WEB_URL}/accounts`;

    // Exchange code for short-lived token
    let shortToken: string;
    let igUserId: string;
    try {
      const form = new URLSearchParams({
        client_id: IG_APP_ID,
        client_secret: IG_APP_SECRET,
        grant_type: "authorization_code",
        redirect_uri: IG_REDIRECT_URI,
        code,
      });
      const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
      });
      if (!tokenRes.ok) throw new Error(await tokenRes.text());
      const tokenData = await tokenRes.json() as { access_token: string; user_id: number };
      shortToken = tokenData.access_token;
      igUserId = String(tokenData.user_id);
    } catch (err) {
      console.error("[instagram oauth] token exchange error:", err);
      return reply.redirect(buildRedirect(redirectBase, { error: "token_exchange_failed" }));
    }

    // Exchange for long-lived token (~60 days)
    let longToken: string;
    let expiresAt: Date;
    try {
      const llRes = await fetch(
        `https://graph.instagram.com/access_token?` +
        new URLSearchParams({ grant_type: "ig_exchange_token", client_secret: IG_APP_SECRET, access_token: shortToken })
      );
      if (!llRes.ok) throw new Error(await llRes.text());
      const llData = await llRes.json() as { access_token: string; expires_in: number };
      longToken = llData.access_token;
      expiresAt = new Date(Date.now() + (llData.expires_in - 86400) * 1000);
    } catch (err) {
      console.error("[instagram oauth] long-lived token error:", err);
      return reply.redirect(buildRedirect(redirectBase, { error: "token_exchange_failed" }));
    }

    // Fetch profile
    let displayName = igUserId;
    let avatarUrl: string | null = null;
    try {
      const profileRes = await fetch(
        `https://graph.instagram.com/v21.0/me?fields=id,username,profile_picture_url&access_token=${longToken}`
      );
      const profile = await profileRes.json() as { id?: string; username?: string; profile_picture_url?: string };
      if (profile.id) igUserId = profile.id;
      displayName = profile.username ?? igUserId;
      avatarUrl = profile.profile_picture_url ?? null;
    } catch { /* optional */ }

    const credentials = encrypt(JSON.stringify({ accessToken: longToken, userId: igUserId, expiresAt: expiresAt.toISOString() }));
    const existing = await prisma.account.findFirst({ where: { platform: "instagram", displayName, userId } });
    await prisma.account.upsert({
      where: { id: existing?.id ?? "new" },
      create: { platform: "instagram", displayName, credentials, avatarUrl, expiresAt, userId },
      update: { credentials, avatarUrl, expiresAt },
    });

    console.log(`[instagram oauth] connected @${displayName} → user ${userId}`);
    return reply.redirect(buildRedirect(redirectBase, { connected: "instagram" }));
  });

  // ── LinkedIn OAuth ───────────────────────────────────────────────────────────

  app.get("/auth/linkedin", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { from } = req.query as Record<string, string>;
    const nonce = randomBytes(32).toString("hex");
    await prisma.oAuthState.create({ data: { userId, nonce, expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
    const state = Buffer.from(JSON.stringify({ userId, from, nonce })).toString("base64url");
    const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", LI_CLIENT_ID);
    url.searchParams.set("redirect_uri", LI_REDIRECT_URI);
    url.searchParams.set("scope", "openid profile email w_member_social");
    url.searchParams.set("state", state);
    return reply.redirect(url.toString());
  });

  app.get("/auth/linkedin/callback", async (req, reply) => {
    const { code, state, error, error_description } = req.query as Record<string, string>;
    if (error) return reply.redirect(buildRedirect(`${WEB_URL}/accounts`, { error: error_description ?? error }));
    if (!code || !state) return reply.redirect(buildRedirect(`${WEB_URL}/accounts`, { error: "missing_code_or_state" }));

    let userId: string;
    let from: string | undefined;
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString()) as { userId: string; from?: string; nonce?: string };
      userId = decoded.userId;
      from = decoded.from;
      const nonce = decoded.nonce;
      if (!nonce) throw new Error("missing nonce");
      const storedState = await prisma.oAuthState.findUnique({ where: { nonce } });
      if (!storedState || storedState.userId !== userId || storedState.expiresAt < new Date()) {
        return reply.redirect(buildRedirect(`${WEB_URL}/accounts`, { error: "invalid_or_expired_state" }));
      }
      await prisma.oAuthState.delete({ where: { nonce } });
    } catch {
      return reply.redirect(buildRedirect(`${WEB_URL}/accounts`, { error: "invalid_state" }));
    }

    const redirectBase = from === "onboarding" ? `${WEB_URL}/onboarding?step=2` : `${WEB_URL}/accounts`;

    // Exchange code for tokens
    let accessToken: string;
    let refreshToken: string;
    let expiresIn: number;
    let refreshExpiresIn: number;
    try {
      const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: LI_REDIRECT_URI,
          client_id: LI_CLIENT_ID,
          client_secret: LI_CLIENT_SECRET,
        }),
      });
      if (!tokenRes.ok) throw new Error(await tokenRes.text());
      const tokenData = await tokenRes.json() as {
        access_token: string;
        expires_in: number;
        refresh_token?: string;
        refresh_token_expires_in?: number;
      };
      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token ?? "";
      expiresIn = tokenData.expires_in;
      refreshExpiresIn = tokenData.refresh_token_expires_in ?? 31536000;
    } catch (err) {
      console.error("[linkedin oauth] token exchange error:", err);
      return reply.redirect(buildRedirect(redirectBase, { error: "token_exchange_failed" }));
    }

    // Fetch profile via OpenID userinfo
    let displayName = "linkedin-user";
    let avatarUrl: string | null = null;
    let personUrn = "";
    try {
      const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = await profileRes.json() as { sub?: string; name?: string; picture?: string };
      personUrn = `urn:li:person:${profile.sub ?? ""}`;
      displayName = profile.name ?? displayName;
      avatarUrl = profile.picture ?? null;
    } catch { /* optional */ }

    const credentials = encrypt(JSON.stringify({
      accessToken,
      refreshToken,
      personUrn,
      expiresAt: Date.now() + expiresIn * 1000,
      refreshExpiresAt: Date.now() + refreshExpiresIn * 1000,
    }));

    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const existing = await prisma.account.findFirst({ where: { platform: "linkedin", displayName, userId } });
    await prisma.account.upsert({
      where: { id: existing?.id ?? "new" },
      create: { platform: "linkedin", displayName, credentials, avatarUrl, expiresAt, userId },
      update: { credentials, avatarUrl, expiresAt },
    });

    console.log(`[linkedin oauth] connected ${displayName} → user ${userId}`);
    return reply.redirect(buildRedirect(redirectBase, { connected: "linkedin" }));
  });

  // Manual token — requires auth cookie
  app.post("/auth/threads/manual", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { accessToken } = req.body as { accessToken: string };
    if (!accessToken) return reply.status(400).send({ error: "accessToken required" });

    const profileRes = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url&access_token=${accessToken}`
    );
    if (!profileRes.ok) return reply.status(400).send({ error: "Invalid token — could not fetch Threads profile" });

    const profile = await profileRes.json() as { id: string; username: string; threads_profile_picture_url?: string };
    const credentials = encrypt(JSON.stringify({ accessToken, userId: profile.id }));
    const account = await upsertThreadsAccount(userId, profile.username, credentials, profile.threads_profile_picture_url ?? null);

    console.log(`[threads] manually connected @${profile.username} → user ${userId}`);
    return reply.status(201).send(account);
  });


  // ── Mastodon OAuth ────────────────────────────────────────────────────────

  // Step 1 — redirect to the user's Mastodon instance
  app.get("/auth/mastodon", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { instance } = req.query as { instance?: string };

    if (!instance) return reply.status(400).send({ error: "instance required" });

    const instanceUrl = instance.startsWith("http") ? instance.replace(/\/$/, "") : `https://${instance.replace(/\/$/, "")}`;

    const nonce = randomBytes(32).toString("hex");
    await prisma.oAuthState.create({
      data: { userId, nonce, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });
    const state = Buffer.from(JSON.stringify({ userId, nonce, instanceUrl })).toString("base64url");

    const url = new URL(`${instanceUrl}/oauth/authorize`);
    url.searchParams.set("client_id", MASTO_CLIENT_ID);
    url.searchParams.set("redirect_uri", MASTO_REDIRECT_URI);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", MASTODON_SCOPES);
    url.searchParams.set("state", state);

    return reply.redirect(url.toString());
  });

  // Step 2 — exchange code for token
  app.get("/auth/mastodon/callback", async (req, reply) => {
    const { code, state: stateRaw, error } = req.query as Record<string, string>;

    if (error) return reply.redirect(`${WEB_URL}/accounts?error=${encodeURIComponent(error)}`);
    if (!code || !stateRaw) return reply.redirect(`${WEB_URL}/accounts?error=missing_params`);

    let userId: string, nonce: string, instanceUrl: string;
    try {
      ({ userId, nonce, instanceUrl } = JSON.parse(Buffer.from(stateRaw, "base64url").toString()));
    } catch {
      return reply.redirect(`${WEB_URL}/accounts?error=invalid_state`);
    }

    const storedState = await prisma.oAuthState.findFirst({ where: { userId, nonce } });
    if (!storedState || storedState.expiresAt < new Date()) {
      return reply.redirect(`${WEB_URL}/accounts?error=state_expired`);
    }
    await prisma.oAuthState.delete({ where: { id: storedState.id } });

    const tokenRes = await fetch(`${instanceUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: MASTO_CLIENT_ID,
        client_secret: MASTO_CLIENT_SECRET,
        redirect_uri: MASTO_REDIRECT_URI,
        grant_type: "authorization_code",
        code,
        scope: MASTODON_SCOPES,
      }),
    });
    if (!tokenRes.ok) return reply.redirect(`${WEB_URL}/accounts?error=token_exchange_failed`);
    const { access_token: accessToken } = await tokenRes.json() as { access_token: string };

    const profileRes = await fetch(`${instanceUrl}/api/v1/accounts/verify_credentials`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) return reply.redirect(`${WEB_URL}/accounts?error=profile_fetch_failed`);
    const profile = await profileRes.json() as { id: string; username: string; avatar?: string };

    const credentials = encrypt(JSON.stringify({ accessToken, instanceUrl, accountId: profile.id }));

    const existing = await prisma.account.findFirst({
      where: { platform: "mastodon", displayName: profile.username, userId },
      select: { id: true },
    });
    await prisma.account.upsert({
      where: { id: existing?.id ?? "new" },
      create: { platform: "mastodon", displayName: profile.username, credentials, avatarUrl: profile.avatar ?? null, userId },
      update: { credentials, avatarUrl: profile.avatar ?? null },
    });

    console.log("[mastodon] connected @" + profile.username + " -> user " + userId);
    return reply.redirect(`${WEB_URL}/accounts?connected=mastodon`);
  });
}
