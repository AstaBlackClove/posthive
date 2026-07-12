/**
 * Tumblr adapter — Tumblr API v2 (NPF format)
 *
 * Auth: OAuth 1.0a (3-legged, HMAC-SHA1). Tokens do not expire.
 * Posting: NPF content blocks — text + images.
 * Comments: Tumblr has no third-party reply API; createComment is a no-op.
 */

import crypto from "crypto";
import type { Account } from "@prisma/client";
import { decrypt, encrypt } from "../lib/encryption.js";
import type { CommentResult, PlatformAdapter, PostResult } from "./types.js";

const TUMBLR_API = "https://api.tumblr.com/v2";
const pct = encodeURIComponent;

interface TumblrCredentials {
  accessToken: string;
  accessSecret: string;
  blogName: string;
}

export function encryptTumblrCredentials(creds: TumblrCredentials): string {
  return encrypt(JSON.stringify(creds));
}

// ── OAuth 1.0a helpers ────────────────────────────────────────────────────────

function baseOAuthParams(token = ""): Record<string, string> {
  const p: Record<string, string> = {
    oauth_consumer_key: process.env.TUMBLR_CONSUMER_KEY!,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: "1.0",
  };
  if (token) p.oauth_token = token;
  return p;
}

function hmacSign(
  method: string,
  url: string,
  params: Record<string, string>,
  tokenSecret = ""
): string {
  const sorted = Object.keys(params)
    .sort()
    .map(k => `${pct(k)}=${pct(params[k])}`)
    .join("&");
  const base = `${method.toUpperCase()}&${pct(url)}&${pct(sorted)}`;
  const key = `${pct(process.env.TUMBLR_CONSUMER_SECRET!)}&${pct(tokenSecret)}`;
  return crypto.createHmac("sha1", key).update(base).digest("base64");
}

function buildAuthHeader(params: Record<string, string>): string {
  return (
    "OAuth " +
    Object.entries(params)
      .map(([k, v]) => `${pct(k)}="${pct(v)}"`)
      .join(", ")
  );
}

/** Build Authorization header for a signed API call (GET or JSON POST). */
export function tumblrApiAuthHeader(method: string, url: string, accessToken: string, accessSecret: string): string {
  const params = baseOAuthParams(accessToken);
  params.oauth_signature = hmacSign(method, url, params, accessSecret);
  return buildAuthHeader(params);
}

/** Build Authorization header + params for requesting a temp token. */
export function tumblrRequestTokenAuth(callbackUrl: string): { header: string } {
  const url = "https://www.tumblr.com/oauth/request_token";
  const params: Record<string, string> = { ...baseOAuthParams(), oauth_callback: callbackUrl };
  params.oauth_signature = hmacSign("POST", url, params);
  return { header: buildAuthHeader(params) };
}

/** Build Authorization header for exchanging a verifier for access tokens. */
export function tumblrAccessTokenAuth(requestToken: string, requestSecret: string, verifier: string): string {
  const url = "https://www.tumblr.com/oauth/access_token";
  const params: Record<string, string> = { ...baseOAuthParams(requestToken), oauth_verifier: verifier };
  params.oauth_signature = hmacSign("POST", url, params, requestSecret);
  return buildAuthHeader(params);
}

// ── Adapter ───────────────────────────────────────────────────────────────────

export const tumblrAdapter: PlatformAdapter = {
  name: "tumblr",

  async refreshTokenIfNeeded(account: Account): Promise<Account> {
    return account; // OAuth 1.0a tokens do not expire
  },

  async createPost(account: Account, content): Promise<PostResult> {
    const { accessToken, accessSecret, blogName } = JSON.parse(
      decrypt(account.credentials)
    ) as TumblrCredentials;

    const apiBase = process.env.PUBLIC_API_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
    const imageUrls = (content.mediaUrls ?? []).filter(u => !/\.(mp4|mov)$/i.test(u));

    // Build NPF content blocks
    const blocks: unknown[] = [];
    if (content.text) blocks.push({ type: "text", text: content.text });
    for (const u of imageUrls) {
      const fullUrl = u.startsWith("http") ? u : `${apiBase}${u}`;
      blocks.push({ type: "image", media: [{ url: fullUrl }] });
    }

    const url = `${TUMBLR_API}/blog/${blogName}/posts`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: tumblrApiAuthHeader("POST", url, accessToken, accessSecret),
        "Content-Type": "application/json",
        "User-Agent": "Posthive/1.0",
      },
      body: JSON.stringify({ content: blocks, state: "published" }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { meta?: { msg?: string } };
      throw new Error(`Tumblr post failed: ${err.meta?.msg ?? res.status}`);
    }

    const data = await res.json() as { response?: { id_string?: string } };
    const postId = data.response?.id_string ?? null;

    return {
      platformPostId: postId ?? "",
      replyContext: null,
      url: postId ? `https://${blogName}.tumblr.com/post/${postId}` : null,
    } as unknown as PostResult;
  },

  async createComment(_account: Account, _replyContext: unknown, _comment: string): Promise<CommentResult> {
    // Tumblr has no public reply/comment API for third-party apps
    return { platformCommentId: null };
  },
};
