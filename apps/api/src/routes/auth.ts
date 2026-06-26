import type { FastifyInstance } from "fastify";
import { encrypt } from "../lib/encryption.js";
import { prisma } from "../lib/prisma.js";
import { withAuth, getUser, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "../lib/auth/withAuth.js";
import { authProvider } from "../lib/auth/index.js";

const APP_ID = process.env.THREADS_APP_ID!;
const APP_SECRET = process.env.THREADS_APP_SECRET!;
const REDIRECT_URI = process.env.THREADS_REDIRECT_URI!;
const WEB_URL = process.env.WEB_URL ?? "http://localhost:3000";

const SCOPES = ["threads_basic", "threads_content_publish"].join(",");

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

  // Step 1 — redirect to Meta OAuth, encode userId in state param
  app.get("/auth/threads", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const state = Buffer.from(JSON.stringify({ userId })).toString("base64url");

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
      return reply.redirect(`${WEB_URL}/accounts?error=${encodeURIComponent(error_description ?? error)}`);
    }
    if (!code || !state) {
      return reply.redirect(`${WEB_URL}/accounts?error=missing_code_or_state`);
    }

    // Decode userId from state
    let userId: string;
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString()) as { userId: string };
      userId = decoded.userId;
    } catch {
      return reply.redirect(`${WEB_URL}/accounts?error=invalid_state`);
    }

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
    } catch (err) {
      return reply.redirect(`${WEB_URL}/accounts?error=${encodeURIComponent(String(err))}`);
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
    } catch (err) {
      return reply.redirect(`${WEB_URL}/accounts?error=${encodeURIComponent(String(err))}`);
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
    return reply.redirect(`${WEB_URL}/accounts?connected=threads`);
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
}
