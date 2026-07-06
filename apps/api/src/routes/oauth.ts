/**
 * OAuth 2.0 Authorization Code + PKCE server for the Posthive MCP connector.
 *
 * Claude.ai (and other MCP clients) discover this via:
 *   GET /.well-known/oauth-authorization-server
 *
 * Flow:
 *   1. Claude.ai → GET /oauth/authorize  → redirect to frontend /mcp-connect
 *   2. User approves in browser          → frontend POST /oauth/approve
 *   3. API stores code, redirects back   → Claude.ai lands on callback URL
 *   4. Claude.ai → POST /oauth/token     → receives a Posthive API key as access_token
 *   5. All /mcp calls use that token     → existing withApiKey middleware handles it
 */

import crypto from "crypto";
import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { generateApiKey } from "../lib/auth/withApiKey.js";
import { withAuth, getUser } from "../lib/auth/withAuth.js";

// ─── In-memory code store (5-min TTL) ────────────────────────────────────────

interface PendingCode {
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  expiresAt: number;
}

const codeStore = new Map<string, PendingCode>();

// In-memory client registry (populated on dynamic client registration)
const clientStore = new Map<string, { redirectUris: string[] }>();

setInterval(() => {
  const now = Date.now();
  for (const [code, data] of codeStore.entries()) {
    if (data.expiresAt < now) codeStore.delete(code);
  }
}, 60_000).unref();

function verifyPkce(verifier: string, challenge: string, method: string): boolean {
  if (method !== "S256") return false; // only S256 accepted
  const hash = crypto.createHash("sha256").update(verifier).digest("base64url");
  return hash === challenge;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function oauthRoutes(app: FastifyInstance): Promise<void> {
  const API_URL = (process.env.PUBLIC_API_URL ?? process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 3001}`).replace(/\/$/, "");
  const WEB_URL = (process.env.WEB_URL ?? "http://localhost:3000").replace(/\/$/, "");

  // Parse application/x-www-form-urlencoded for /oauth/token and /oauth/revoke
  app.addContentTypeParser("application/x-www-form-urlencoded", { parseAs: "string" }, (_req, body, done) => {
    try {
      const parsed = Object.fromEntries(new URLSearchParams(body as string));
      done(null, parsed);
    } catch (e) {
      done(e as Error, undefined);
    }
  });

  // ── Discovery ──────────────────────────────────────────────────────────────
  app.get("/.well-known/oauth-authorization-server", async (_req, reply) => {
    return reply.send({
      issuer: API_URL,
      authorization_endpoint: `${API_URL}/oauth/authorize`,
      token_endpoint: `${API_URL}/oauth/token`,
      revocation_endpoint: `${API_URL}/oauth/revoke`,
      registration_endpoint: `${API_URL}/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
    });
  });

  // ── Dynamic client registration (RFC 7591) — Claude.ai calls this first ───
  app.post("/oauth/register", async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>;

    const redirectUris = Array.isArray(body.redirect_uris)
      ? (body.redirect_uris as string[]).filter((u) => {
          try { const p = new URL(u); return p.protocol === "https:" || p.hostname === "localhost"; }
          catch { return false; }
        })
      : [];

    const clientId = `posthive_${crypto.randomBytes(16).toString("hex")}`;
    clientStore.set(clientId, { redirectUris });

    return reply.status(201).send({
      client_id: clientId,
      client_secret_expires_at: 0,  // never expires
      redirect_uris: redirectUris,
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      client_name: body.client_name ?? "MCP Client",
    });
  });

  // ── Authorization — redirect to frontend approve page ──────────────────────
  app.get("/oauth/authorize", async (req, reply) => {
    const q = req.query as Record<string, string>;
    const { redirect_uri, state, code_challenge, code_challenge_method, client_id } = q;

    if (!redirect_uri) return reply.status(400).send({ error: "redirect_uri is required" });
    if (!code_challenge) return reply.status(400).send({ error: "PKCE code_challenge is required" });

    // Validate redirect_uri against registered client (if client_id was registered)
    if (client_id) {
      const client = clientStore.get(client_id);
      if (client && client.redirectUris.length > 0 && !client.redirectUris.includes(redirect_uri)) {
        return reply.status(400).send({ error: "redirect_uri not registered for this client" });
      }
    }

    const params = new URLSearchParams({
      redirect_uri,
      code_challenge,
      code_challenge_method: code_challenge_method ?? "S256",
      ...(state ? { state } : {}),
      ...(client_id ? { client_id } : {}),
    });

    return reply.redirect(`${WEB_URL}/mcp-connect?${params}`);
  });

  // ── Approve — called by frontend after user clicks Allow ───────────────────
  app.post("/oauth/approve", { preHandler: [withAuth] }, async (req, reply) => {
    const { id: userId } = getUser(req);
    const body = req.body as Record<string, string>;
    const { redirect_uri, state, code_challenge, code_challenge_method } = body;

    if (!redirect_uri || !code_challenge) {
      return reply.status(400).send({ error: "redirect_uri and code_challenge are required" });
    }

    const code = crypto.randomBytes(32).toString("base64url");
    codeStore.set(code, {
      userId,
      redirectUri: redirect_uri,
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method ?? "S256",
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    const callbackUrl = new URL(redirect_uri);
    callbackUrl.searchParams.set("code", code);
    if (state) callbackUrl.searchParams.set("state", state);

    return reply.send({ redirect: callbackUrl.toString() });
  });

  // ── Token — exchange code + PKCE verifier for an API key ──────────────────
  app.post("/oauth/token", async (req, reply) => {
    // Claude.ai may send as form-encoded or JSON
    const body = req.body as Record<string, string>;
    const { grant_type, code, code_verifier, redirect_uri } = body;

    if (grant_type !== "authorization_code") {
      return reply.status(400).send({ error: "unsupported_grant_type" });
    }
    if (!code || !code_verifier || !redirect_uri) {
      return reply.status(400).send({ error: "invalid_request", error_description: "code, code_verifier, and redirect_uri are required" });
    }

    const stored = codeStore.get(code);
    if (!stored || stored.expiresAt < Date.now()) {
      return reply.status(400).send({ error: "invalid_grant", error_description: "Authorization code expired or invalid" });
    }
    if (stored.redirectUri !== redirect_uri) {
      return reply.status(400).send({ error: "invalid_grant", error_description: "redirect_uri does not match" });
    }
    if (!verifyPkce(code_verifier, stored.codeChallenge, stored.codeChallengeMethod)) {
      return reply.status(400).send({ error: "invalid_grant", error_description: "PKCE verification failed" });
    }

    codeStore.delete(code);

    // Issue a new API key scoped to this user (labelled so they can revoke it)
    const { raw, hash, prefix } = generateApiKey();
    await prisma.apiKey.create({
      data: {
        userId: stored.userId,
        keyHash: hash,
        prefix,
        name: "Claude.ai MCP connector",
      },
    });

    return reply.send({
      access_token: raw,
      token_type: "bearer",
      scope: "mcp",
    });
  });

  // ── Revoke — called when user disconnects in Claude.ai ────────────────────
  app.post("/oauth/revoke", async (req, reply) => {
    const body = req.body as Record<string, string>;
    const token = body.token;
    if (!token) return reply.send({ ok: true }); // RFC 7009 — always 200

    const keyHash = crypto.createHash("sha256").update(token).digest("hex");
    await prisma.apiKey.updateMany({
      where: { keyHash },
      data: { revokedAt: new Date() },
    }).catch(() => {});

    return reply.send({ ok: true });
  });
}
