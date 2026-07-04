import { randomBytes } from "crypto";
import type { FastifyInstance } from "fastify";
import { TwitterApi } from "twitter-api-v2";
import { encrypt } from "../lib/encryption.js";
import { prisma } from "../lib/prisma.js";
import { getPlan } from "../lib/plans.js";
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

const YT_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID!;
const YT_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET!;
const YT_REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI!;

const FB_APP_ID = process.env.FACEBOOK_APP_ID!;
const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET!;
const FB_REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI!;
const FB_SCOPES = "pages_manage_posts,pages_show_list,pages_read_engagement";

const X_API_KEY     = process.env.X_API_KEY!;
const X_API_SECRET  = process.env.X_API_SECRET!;
const X_CALLBACK_URL = process.env.X_CALLBACK_URL!;

const PIN_CLIENT_ID     = process.env.PINTEREST_CLIENT_ID!;
const PIN_CLIENT_SECRET = process.env.PINTEREST_CLIENT_SECRET!;
const PIN_REDIRECT_URI  = process.env.PINTEREST_REDIRECT_URI!;
const PIN_SCOPES        = "boards:read,pins:read,pins:write,user_accounts:read";
const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.force-ssl",
].join(" ");
const TOKEN_URL_GOOGLE = "https://oauth2.googleapis.com/token";

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
      const tokenText = await tokenRes.text();
      if (!tokenRes.ok) {
        console.error(`[threads oauth] short-lived token exchange failed (${tokenRes.status}): ${tokenText}`);
        throw new Error(tokenText);
      }
      const tokenData = JSON.parse(tokenText) as { access_token: string; user_id: number };
      shortLivedToken = tokenData.access_token;
      threadsUserId = String(tokenData.user_id);
    } catch (err) {
      console.error("[threads oauth] token_exchange_failed:", err);
      return reply.redirect(buildRedirect(redirectBase, { error: "token_exchange_failed" }));
    }

    // Exchange for long-lived token (60 days)
    let longLivedToken: string;
    let expiresAt: Date;
    try {
      const llRes = await fetch(`https://graph.threads.net/access_token?` +
        new URLSearchParams({ grant_type: "th_exchange_token", client_secret: APP_SECRET, access_token: shortLivedToken })
      );
      const llText = await llRes.text();
      if (!llRes.ok) {
        console.error(`[threads oauth] long-lived token exchange failed (${llRes.status}): ${llText}`);
        throw new Error(llText);
      }
      const llData = JSON.parse(llText) as { access_token: string; expires_in: number };
      longLivedToken = llData.access_token;
      expiresAt = new Date(Date.now() + (llData.expires_in - 86400) * 1000);
    } catch (err) {
      console.error("[threads oauth] long_lived_token_exchange_failed:", err);
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

  // ── YouTube OAuth ────────────────────────────────────────────────────────

  app.get("/auth/youtube", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { from } = req.query as Record<string, string>;
    const nonce = randomBytes(32).toString("hex");
    await prisma.oAuthState.create({ data: { userId, nonce, expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
    const state = Buffer.from(JSON.stringify({ userId, from, nonce })).toString("base64url");
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", YT_CLIENT_ID);
    url.searchParams.set("redirect_uri", YT_REDIRECT_URI);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", YOUTUBE_SCOPES);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent"); // force refresh_token on every connect
    url.searchParams.set("state", state);
    return reply.redirect(url.toString());
  });

  app.get("/auth/youtube/callback", async (req, reply) => {
    const { code, state, error } = req.query as Record<string, string>;
    if (error) return reply.redirect(buildRedirect(`${WEB_URL}/accounts`, { error }));
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

    let accessToken: string;
    let refreshToken: string;
    let expiresIn: number;
    try {
      const tokenRes = await fetch(TOKEN_URL_GOOGLE, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: YT_CLIENT_ID,
          client_secret: YT_CLIENT_SECRET,
          code,
          redirect_uri: YT_REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      });
      if (!tokenRes.ok) throw new Error(await tokenRes.text());
      const tokenData = await tokenRes.json() as { access_token: string; refresh_token?: string; expires_in: number };
      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token ?? "";
      expiresIn = tokenData.expires_in;
    } catch (err) {
      console.error("[youtube oauth] token exchange error:", err);
      return reply.redirect(buildRedirect(redirectBase, { error: "token_exchange_failed" }));
    }

    if (!refreshToken) {
      // Google only issues a refresh_token on first consent — if the user already
      // granted access previously without prompt=consent, this can come back empty.
      console.error("[youtube oauth] no refresh_token returned — user must revoke app access and reconnect");
      return reply.redirect(buildRedirect(redirectBase, { error: "no_refresh_token" }));
    }

    let displayName = "youtube-channel";
    let avatarUrl: string | null = null;
    let channelId = "";
    try {
      const channelRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const channelData = await channelRes.json() as {
        items?: { id: string; snippet: { title: string; thumbnails?: { default?: { url: string } } } }[];
      };
      const channel = channelData.items?.[0];
      if (channel) {
        channelId = channel.id;
        displayName = channel.snippet.title;
        avatarUrl = channel.snippet.thumbnails?.default?.url ?? null;
      }
    } catch { /* optional */ }

    const credentials = encrypt(JSON.stringify({
      accessToken,
      refreshToken,
      channelId,
      expiresAt: new Date(Date.now() + (expiresIn - 60) * 1000).toISOString(),
    }));

    const expiresAt = new Date(Date.now() + (expiresIn - 60) * 1000);
    const existing = await prisma.account.findFirst({ where: { platform: "youtube", displayName, userId } });
    await prisma.account.upsert({
      where: { id: existing?.id ?? "new" },
      create: { platform: "youtube", displayName, credentials, avatarUrl, expiresAt, userId },
      update: { credentials, avatarUrl, expiresAt },
    });

    console.log(`[youtube oauth] connected ${displayName} → user ${userId}`);
    return reply.redirect(buildRedirect(redirectBase, { connected: "youtube" }));
  });

  // ── X / Twitter OAuth 1.0a ────────────────────────────────────────────────

  app.get("/auth/twitter", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { from } = req.query as Record<string, string>;

    // Plan gate — only Pro & Team when billing is enabled
    if (process.env.ENABLE_BILLING === "true") {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
      const plan = getPlan(user?.plan ?? "cancelled");
      if (!plan.allowTwitter) {
        return reply.redirect(buildRedirect(`${WEB_URL}/accounts`, { error: "twitter_pro_required" }));
      }
    }

    const appClient = new TwitterApi({ appKey: X_API_KEY, appSecret: X_API_SECRET });
    const { url, oauth_token, oauth_token_secret } = await appClient.generateAuthLink(X_CALLBACK_URL, { linkMode: "authorize" });

    // Store request token secret alongside userId and `from` in the nonce field.
    // Pattern: "<oauthToken>~~<secret>~~<userId>~~<from>"
    const nonce = `${oauth_token}~~${oauth_token_secret}~~${userId}~~${from ?? ""}`;
    await prisma.oAuthState.create({
      data: { userId, nonce, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });

    return reply.redirect(url);
  });

  app.get("/auth/twitter/callback", async (req, reply) => {
    const { oauth_token, oauth_verifier, denied } = req.query as Record<string, string>;
    const redirectBase = `${WEB_URL}/accounts`;

    if (denied || !oauth_token || !oauth_verifier) {
      return reply.redirect(buildRedirect(redirectBase, { error: denied ? "access_denied" : "missing_oauth_params" }));
    }

    // Retrieve stored request token secret
    const stored = await prisma.oAuthState.findFirst({
      where: { nonce: { startsWith: `${oauth_token}~~` } },
    });
    if (!stored || stored.expiresAt < new Date()) {
      return reply.redirect(buildRedirect(redirectBase, { error: "invalid_or_expired_state" }));
    }
    await prisma.oAuthState.delete({ where: { id: stored.id } });

    const parts = stored.nonce.split("~~");
    const oauthTokenSecret = parts[1] ?? "";
    const userId = parts[2] ?? stored.userId;
    const from = parts[3] ?? "";

    const redirectTo = from === "onboarding" ? `${WEB_URL}/onboarding?step=2` : redirectBase;

    let accessToken: string;
    let accessSecret: string;
    try {
      const tempClient = new TwitterApi({
        appKey: X_API_KEY,
        appSecret: X_API_SECRET,
        accessToken: oauth_token,
        accessSecret: oauthTokenSecret,
      });
      const result = await tempClient.login(oauth_verifier);
      accessToken = result.accessToken;
      accessSecret = result.accessSecret;
    } catch (err) {
      console.error("[twitter oauth] token exchange failed:", err);
      return reply.redirect(buildRedirect(redirectTo, { error: "token_exchange_failed" }));
    }

    // Fetch Twitter user profile
    let displayName = "twitter-user";
    let twitterUserId = "";
    let avatarUrl: string | null = null;
    try {
      const userClient = new TwitterApi({
        appKey: X_API_KEY,
        appSecret: X_API_SECRET,
        accessToken,
        accessSecret,
      });
      const me = await userClient.v1.verifyCredentials({ include_email: false, skip_status: true });
      twitterUserId = me.id_str;
      displayName = me.screen_name ?? me.name ?? "twitter-user";
      avatarUrl = me.profile_image_url_https?.replace("_normal", "") ?? null;
    } catch (err) {
      console.error("[twitter oauth] profile fetch failed:", err);
    }

    const credentials = encrypt(JSON.stringify({ accessToken, accessSecret, twitterUserId }));
    const existing = await prisma.account.findFirst({ where: { platform: "twitter", displayName, userId } });
    await prisma.account.upsert({
      where: { id: existing?.id ?? "new" },
      create: { platform: "twitter", displayName, credentials, avatarUrl, userId },
      update: { credentials, avatarUrl },
    });

    console.log(`[twitter oauth] connected @${displayName} → user ${userId}`);
    return reply.redirect(buildRedirect(redirectTo, { connected: "twitter" }));
  });

  // ── Pinterest OAuth ───────────────────────────────────────────────────────

  app.get("/auth/pinterest", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const { from } = req.query as Record<string, string>;

    const nonce = randomBytes(32).toString("hex");
    await prisma.oAuthState.create({
      data: { userId, nonce, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });
    const state = Buffer.from(JSON.stringify({ userId, from, nonce })).toString("base64url");

    const url = new URL("https://www.pinterest.com/oauth/");
    url.searchParams.set("client_id", PIN_CLIENT_ID);
    url.searchParams.set("redirect_uri", PIN_REDIRECT_URI);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", PIN_SCOPES);
    url.searchParams.set("state", state);
    return reply.redirect(url.toString());
  });

  app.get("/auth/pinterest/callback", async (req, reply) => {
    const { code, state, error } = req.query as Record<string, string>;
    if (error || !code || !state) {
      return reply.redirect(buildRedirect(`${WEB_URL}/accounts`, { error: error ?? "missing_code_or_state" }));
    }

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

    const sandboxToken = process.env.PINTEREST_SANDBOX === "true" ? process.env.PINTEREST_SANDBOX_TOKEN : undefined;
    const PIN_API = sandboxToken
      ? "https://api-sandbox.pinterest.com/v5"
      : "https://api.pinterest.com/v5";

    // When a sandbox token is available, skip the OAuth code exchange entirely
    let accessToken: string;
    let refreshToken = "";
    let _expiresIn: number | undefined;
    if (sandboxToken) {
      accessToken = sandboxToken;
      console.log("[pinterest oauth] sandbox mode — using PINTEREST_SANDBOX_TOKEN, skipping code exchange");
    } else {
      let expiresInVal: number;
      try {
        const tokenRes = await fetch("https://api.pinterest.com/v5/oauth/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${PIN_CLIENT_ID}:${PIN_CLIENT_SECRET}`).toString("base64")}`,
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: PIN_REDIRECT_URI,
          }),
        });
        if (!tokenRes.ok) throw new Error(await tokenRes.text());
        const tokenData = await tokenRes.json() as {
          access_token: string;
          refresh_token: string;
          expires_in: number;
        };
        accessToken = tokenData.access_token;
        refreshToken = tokenData.refresh_token;
        expiresInVal = tokenData.expires_in;
      } catch (err) {
        console.error("[pinterest oauth] token exchange error:", err);
        return reply.redirect(buildRedirect(redirectBase, { error: "token_exchange_failed" }));
      }
      _expiresIn = expiresInVal;
    }

    // Fetch Pinterest user profile
    let pinterestUserId = "";
    let displayName = "pinterest-user";
    let avatarUrl: string | null = null;
    try {
      const meRes = await fetch(`${PIN_API}/user_account`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const me = await meRes.json() as { username?: string; profile_image?: string; id?: string };
      pinterestUserId = me.id ?? me.username ?? "";
      displayName = me.username ?? pinterestUserId;
      avatarUrl = me.profile_image ?? null;
    } catch { /* optional */ }

    // Fetch boards and pick the first as the default
    let defaultBoardId = "";
    try {
      const boardsRes = await fetch(`${PIN_API}/boards?page_size=1`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const boardsData = await boardsRes.json() as { items?: { id: string }[] };
      defaultBoardId = boardsData.items?.[0]?.id ?? "";
    } catch { /* optional */ }

    // Sandbox starts with no boards — create one automatically
    if (!defaultBoardId && sandboxToken) {
      try {
        const createRes = await fetch(`${PIN_API}/boards`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: "Posthive Test Board", privacy: "PUBLIC" }),
        });
        const created = await createRes.json() as { id?: string };
        defaultBoardId = created.id ?? "";
        console.log("[pinterest oauth] created sandbox board:", defaultBoardId);
      } catch (err) {
        console.warn("[pinterest oauth] could not create sandbox board:", err);
      }
    }

    if (!defaultBoardId) {
      console.warn(`[pinterest oauth] no boards found for user ${pinterestUserId}`);
      return reply.redirect(buildRedirect(redirectBase, { error: "no_boards_found" }));
    }

    // Sandbox tokens don't expire; set a far-future date
    const expiresAt = sandboxToken
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + ((_expiresIn ?? 2592000) - 300) * 1000);
    const credentials = encrypt(JSON.stringify({
      accessToken,
      refreshToken,
      expiresAt: expiresAt.toISOString(),
      userId: pinterestUserId,
      defaultBoardId,
    }));

    const existing = await prisma.account.findFirst({ where: { platform: "pinterest", displayName, userId } });
    await prisma.account.upsert({
      where: { id: existing?.id ?? "new" },
      create: { platform: "pinterest", displayName, credentials, avatarUrl, expiresAt, userId },
      update: { credentials, avatarUrl, expiresAt },
    });

    console.log(`[pinterest oauth] connected @${displayName} → user ${userId}`);
    return reply.redirect(buildRedirect(redirectBase, { connected: "pinterest" }));
  });

  // ── Facebook Pages OAuth ───────────────────────────────────────────────────

  app.get("/auth/facebook", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const nonce = randomBytes(32).toString("hex");
    await prisma.oAuthState.create({
      data: { userId, nonce, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });
    const state = Buffer.from(JSON.stringify({ userId, nonce })).toString("base64url");
    const params = new URLSearchParams({
      client_id: FB_APP_ID,
      redirect_uri: FB_REDIRECT_URI,
      scope: FB_SCOPES,
      response_type: "code",
      state,
    });
    return reply.redirect(`https://www.facebook.com/v21.0/dialog/oauth?${params}`);
  });

  app.get("/auth/facebook/callback", async (req, reply) => {
    const { code, error, state } = req.query as Record<string, string>;
    const redirectBase = `${WEB_URL}/accounts`;

    if (error || !code) {
      console.error("[facebook oauth] callback error:", error);
      return reply.redirect(buildRedirect(redirectBase, { error: error ?? "no_code" }));
    }

    let userId: string;
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString()) as { userId: string; nonce: string };
      userId = decoded.userId;
      const storedState = await prisma.oAuthState.findUnique({ where: { nonce: decoded.nonce } });
      if (!storedState || storedState.userId !== userId || storedState.expiresAt < new Date()) {
        return reply.redirect(buildRedirect(redirectBase, { error: "invalid_or_expired_state" }));
      }
      await prisma.oAuthState.delete({ where: { nonce: decoded.nonce } });
    } catch {
      return reply.redirect(buildRedirect(redirectBase, { error: "invalid_state" }));
    }

    // Exchange code for short-lived user access token
    const tokenParams = new URLSearchParams({
      client_id: FB_APP_ID,
      client_secret: FB_APP_SECRET,
      redirect_uri: FB_REDIRECT_URI,
      code,
    });

    let shortLivedToken: string;
    try {
      const tokenRes = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?${tokenParams}`);
      const tokenText = await tokenRes.text();
      if (!tokenRes.ok) {
        console.error(`[facebook oauth] short-lived token exchange failed (${tokenRes.status}): ${tokenText}`);
        throw new Error(tokenText);
      }
      const tokenData = JSON.parse(tokenText) as { access_token: string };
      shortLivedToken = tokenData.access_token;
    } catch (err) {
      console.error("[facebook oauth] token_exchange_failed:", err);
      return reply.redirect(buildRedirect(redirectBase, { error: "token_exchange_failed" }));
    }

    // Exchange for long-lived user token (~60 days)
    let longLivedToken: string;
    let userTokenExpiresAt: Date;
    try {
      const llParams = new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: FB_APP_ID,
        client_secret: FB_APP_SECRET,
        fb_exchange_token: shortLivedToken,
      });
      const llRes = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?${llParams}`);
      const llText = await llRes.text();
      if (!llRes.ok) {
        console.error(`[facebook oauth] long-lived token exchange failed: ${llText}`);
        throw new Error(llText);
      }
      const llData = JSON.parse(llText) as { access_token: string; expires_in?: number };
      longLivedToken = llData.access_token;
      userTokenExpiresAt = new Date(Date.now() + ((llData.expires_in ?? 5184000) - 86400) * 1000);
    } catch (err) {
      console.error("[facebook oauth] long_lived_token_failed:", err);
      return reply.redirect(buildRedirect(redirectBase, { error: "token_exchange_failed" }));
    }

    // Get user ID
    let fbUserId: string;
    try {
      const meRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${longLivedToken}`);
      const meData = await meRes.json() as { id: string; name?: string };
      fbUserId = meData.id;
    } catch (err) {
      console.error("[facebook oauth] /me fetch failed:", err);
      return reply.redirect(buildRedirect(redirectBase, { error: "profile_fetch_failed" }));
    }

    // List pages the user manages
    let pages: { id: string; name: string; access_token: string; picture?: { data?: { url?: string } } }[];
    try {
      const pagesRes = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,picture&access_token=${longLivedToken}`
      );
      const pagesData = await pagesRes.json() as { data?: typeof pages };
      pages = pagesData.data ?? [];
    } catch (err) {
      console.error("[facebook oauth] /me/accounts fetch failed:", err);
      return reply.redirect(buildRedirect(redirectBase, { error: "pages_fetch_failed" }));
    }

    if (pages.length === 0) {
      return reply.redirect(buildRedirect(redirectBase, { error: "no_pages" }));
    }

    // Connect all pages the user manages (or just the first one if many)
    for (const page of pages) {
      const credentials = encrypt(JSON.stringify({
        pageAccessToken: page.access_token,
        pageId: page.id,
        userId: fbUserId,
        userAccessToken: longLivedToken,
      }));
      const avatarUrl = page.picture?.data?.url ?? null;
      const existing = await prisma.account.findFirst({
        where: { platform: "facebook", displayName: page.name, userId },
      });
      await prisma.account.upsert({
        where: { id: existing?.id ?? "new" },
        create: { platform: "facebook", displayName: page.name, credentials, avatarUrl, expiresAt: userTokenExpiresAt, userId },
        update: { credentials, avatarUrl, expiresAt: userTokenExpiresAt },
      });
      console.log(`[facebook oauth] connected page "${page.name}" → user ${userId}`);
    }

    return reply.redirect(buildRedirect(redirectBase, { connected: "facebook" }));
  });
}
