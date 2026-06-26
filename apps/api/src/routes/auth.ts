/**
 * OAuth routes for Threads (Meta).
 *
 * GET  /auth/threads          — redirects user to Meta's OAuth consent screen
 * GET  /auth/threads/callback — Meta redirects back here with a code;
 *                               we exchange it for a long-lived token and
 *                               persist the account.
 *
 * After the callback the user is redirected to the web app's /accounts page.
 */

import type { FastifyInstance } from "fastify";
import { encrypt } from "../lib/encryption.js";
import { prisma } from "../lib/prisma.js";

const APP_ID = process.env.THREADS_APP_ID!;
const APP_SECRET = process.env.THREADS_APP_SECRET!;
const REDIRECT_URI = process.env.THREADS_REDIRECT_URI!;
const WEB_URL = process.env.NEXT_PUBLIC_API_URL?.replace(":3001", ":3000") ?? "http://localhost:3000";

// Threads OAuth scopes we need
const SCOPES = [
  "threads_basic",
  "threads_content_publish",
].join(",");

export async function authRoutes(app: FastifyInstance): Promise<void> {

  // Temporary debug routes — remove before going to production
  app.get("/auth/threads/debug", async (_req, reply) => {
    return reply.send({
      APP_ID: APP_ID ?? "MISSING",
      APP_SECRET: APP_SECRET ? "SET" : "MISSING",
      REDIRECT_URI: REDIRECT_URI ?? "MISSING",
    });
  });

  app.get("/auth/threads/debug-url", async (_req, reply) => {
    const url = new URL("https://threads.net/oauth/authorize");
    url.searchParams.set("client_id", APP_ID);
    url.searchParams.set("redirect_uri", REDIRECT_URI);
    url.searchParams.set("scope", SCOPES);
    url.searchParams.set("response_type", "code");
    return reply.send({ url: url.toString() });
  });

  // Step 1 — redirect user to Meta OAuth
  app.get("/auth/threads", async (_req, reply) => {
    const url = new URL("https://threads.net/oauth/authorize");
    url.searchParams.set("client_id", APP_ID);
    url.searchParams.set("redirect_uri", REDIRECT_URI);
    url.searchParams.set("scope", SCOPES);
    url.searchParams.set("response_type", "code");

    return reply.redirect(url.toString());
  });

  // Manual token entry — used when OAuth redirect isn't available (dev workaround)
  app.post("/auth/threads/manual", async (req, reply) => {
    const { accessToken } = req.body as { accessToken: string };
    if (!accessToken) return reply.status(400).send({ error: "accessToken required" });

    // Fetch profile to get userId and username
    const profileRes = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url&access_token=${accessToken}`
    );
    if (!profileRes.ok) {
      return reply.status(400).send({ error: "Invalid token — could not fetch Threads profile" });
    }
    const profile = await profileRes.json() as { id: string; username: string; threads_profile_picture_url?: string };

    const credentials = encrypt(JSON.stringify({
      accessToken,
      userId: profile.id,
    }));

    const existing = await prisma.account.findFirst({
      where: { platform: "threads", displayName: profile.username },
      select: { id: true },
    });

    const account = await prisma.account.upsert({
      where: { id: existing?.id ?? "new" },
      create: {
        platform: "threads",
        displayName: profile.username,
        credentials,
        avatarUrl: profile.threads_profile_picture_url ?? null,
      },
      update: {
        credentials,
        avatarUrl: profile.threads_profile_picture_url ?? null,
      },
      select: { id: true, platform: true, displayName: true, avatarUrl: true, createdAt: true },
    });

    console.log(`[threads] manually connected @${profile.username}`);
    return reply.status(201).send(account);
  });

  // Step 2 — Meta redirects back with ?code=...
  app.get("/auth/threads/callback", async (req, reply) => {
    const { code, error, error_description } = req.query as Record<string, string>;

    if (error) {
      console.error("[threads oauth] error:", error, error_description);
      return reply.redirect(`${WEB_URL}/accounts?error=${encodeURIComponent(error_description ?? error)}`);
    }

    if (!code) {
      return reply.redirect(`${WEB_URL}/accounts?error=missing_code`);
    }

    // Exchange code for short-lived token
    let shortLivedToken: string;
    let threadsUserId: string;
    try {
      const tokenRes = await fetch("https://graph.threads.net/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: APP_ID,
          client_secret: APP_SECRET,
          grant_type: "authorization_code",
          redirect_uri: REDIRECT_URI,
          code,
        }),
      });

      if (!tokenRes.ok) {
        const body = await tokenRes.text();
        throw new Error(`Token exchange failed: ${body}`);
      }

      const tokenData = await tokenRes.json() as { access_token: string; user_id: number };
      shortLivedToken = tokenData.access_token;
      threadsUserId = String(tokenData.user_id);
    } catch (err) {
      console.error("[threads oauth] token exchange failed:", err);
      return reply.redirect(`${WEB_URL}/accounts?error=${encodeURIComponent(String(err))}`);
    }

    // Exchange short-lived (1h) for long-lived token (60 days)
    let longLivedToken: string;
    let expiresAt: Date;
    try {
      const llRes = await fetch(
        `https://graph.threads.net/access_token?` +
        new URLSearchParams({
          grant_type: "th_exchange_token",
          client_secret: APP_SECRET,
          access_token: shortLivedToken,
        })
      );

      if (!llRes.ok) {
        const body = await llRes.text();
        throw new Error(`Long-lived token exchange failed: ${body}`);
      }

      const llData = await llRes.json() as { access_token: string; expires_in: number };
      longLivedToken = llData.access_token;
      // expires_in is seconds — subtract 1 day as buffer
      expiresAt = new Date(Date.now() + (llData.expires_in - 86400) * 1000);
    } catch (err) {
      console.error("[threads oauth] long-lived token failed:", err);
      return reply.redirect(`${WEB_URL}/accounts?error=${encodeURIComponent(String(err))}`);
    }

    // Fetch the user's Threads username + avatar for display
    let displayName: string = threadsUserId;
    let avatarUrl: string | null = null;
    try {
      const profileRes = await fetch(
        `https://graph.threads.net/v1.0/me?fields=username,threads_profile_picture_url&access_token=${longLivedToken}`
      );
      const profile = await profileRes.json() as { username?: string; threads_profile_picture_url?: string };
      displayName = profile.username ?? threadsUserId;
      avatarUrl = profile.threads_profile_picture_url ?? null;
    } catch { /* avatar is optional */ }

    const credentials = encrypt(JSON.stringify({
      accessToken: longLivedToken,
      userId: threadsUserId,
    }));

    await prisma.account.upsert({
      where: {
        id: (await prisma.account.findFirst({
          where: { platform: "threads", displayName },
          select: { id: true },
        }))?.id ?? "new",
      },
      create: { platform: "threads", displayName, credentials, expiresAt, avatarUrl },
      update: { credentials, expiresAt, avatarUrl },
    });

    console.log(`[threads oauth] connected @${displayName}`);
    return reply.redirect(`${WEB_URL}/accounts?connected=threads`);
  });
}
