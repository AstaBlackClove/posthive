/**
 * Pinterest adapter — Pinterest API v5
 *
 * Auth: OAuth 2.0 — scopes: boards:read pins:read pins:write
 * Tokens: access token (30 days) + refresh token (1 year), auto-refreshed.
 *
 * Posting: Creates a Pin on the user's default board.
 * - Image is required (Pinterest is a visual platform)
 * - title = first line of post text (max 100 chars)
 * - description = remaining text (max 500 chars)
 * - link = first URL found in text (optional)
 *
 * Board selection: uses the defaultBoardId stored at connect time.
 * Users can override with a board name via per-platform overrides (future).
 */

import type { Account } from "@prisma/client";
import { decrypt, encrypt } from "../lib/encryption.js";
import { prisma } from "../lib/prisma.js";
import type { CommentResult, PlatformAdapter, PostResult } from "./types.js";

// API calls use sandbox when PINTEREST_SANDBOX=true (Trial-access apps can't write to production).
// OAuth token exchange always uses the production domain regardless of sandbox mode.
const API_BASE = process.env.PINTEREST_SANDBOX === "true"
  ? "https://api-sandbox.pinterest.com/v5"
  : "https://api.pinterest.com/v5";
const OAUTH_BASE = "https://api.pinterest.com/v5";

interface PinterestCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;       // ISO string
  userId: string;
  defaultBoardId: string;  // board used when no override specified
}

function getCredentials(account: Account): PinterestCredentials {
  return JSON.parse(decrypt(account.credentials)) as PinterestCredentials;
}

async function refreshAccessToken(account: Account): Promise<PinterestCredentials> {
  const creds = getCredentials(account);
  const clientId = process.env.PINTEREST_CLIENT_ID!;
  const clientSecret = process.env.PINTEREST_CLIENT_SECRET!;

  const res = await fetch(`${OAUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: creds.refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Pinterest token refresh failed: ${await res.text()}`);

  const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number };
  return {
    ...creds,
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? creds.refreshToken,
    expiresAt: new Date(Date.now() + (data.expires_in - 300) * 1000).toISOString(),
  };
}

function extractTitle(text: string): { title: string; description: string } {
  const lines = text.split("\n").filter(Boolean);
  const title = (lines[0] ?? "").slice(0, 100);
  const description = lines.slice(1).join("\n").slice(0, 500) || text.slice(0, 500);
  return { title, description };
}

function extractFirstUrl(text: string): string | undefined {
  return text.match(/https?:\/\/[^\s]+/)?.[0];
}

export const pinterestAdapter: PlatformAdapter = {
  name: "pinterest",

  async refreshTokenIfNeeded(account: Account): Promise<Account> {
    // When a sandbox token is supplied via env, skip OAuth refresh entirely.
    if (process.env.PINTEREST_SANDBOX === "true" && process.env.PINTEREST_SANDBOX_TOKEN) return account;

    const creds = getCredentials(account);
    const expiresAt = new Date(creds.expiresAt).getTime();

    if (Date.now() < expiresAt - 5 * 60 * 1000) return account; // still valid

    const newCreds = await refreshAccessToken(account);
    const credentials = encrypt(JSON.stringify(newCreds));
    return prisma.account.update({
      where: { id: account.id },
      data: { credentials, expiresAt: new Date(newCreds.expiresAt) },
    });
  },

  async createPost(account: Account, content: {
    text: string;
    mediaUrls?: string[];
  }): Promise<PostResult> {
    const creds = getCredentials(account);
    // Override with the manually-generated sandbox token if provided.
    const accessToken = (process.env.PINTEREST_SANDBOX === "true" && process.env.PINTEREST_SANDBOX_TOKEN)
      ? process.env.PINTEREST_SANDBOX_TOKEN
      : creds.accessToken;

    if (!content.mediaUrls || content.mediaUrls.length === 0) {
      throw new Error("Pinterest requires at least one image. Add an image to post to Pinterest.");
    }

    const { title, description } = extractTitle(content.text);
    const link = extractFirstUrl(content.text);
    const PUBLIC_API_URL = process.env.PUBLIC_API_URL ?? "";
    const imageUrl = content.mediaUrls[0].startsWith("http")
      ? content.mediaUrls[0]
      : `${PUBLIC_API_URL}${content.mediaUrls[0]}`;

    const body: Record<string, unknown> = {
      board_id: creds.defaultBoardId,
      title,
      description,
      media_source: {
        source_type: "image_url",
        url: imageUrl,
      },
    };
    if (link) body.link = link;

    const res = await fetch(`${API_BASE}/pins`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Pinterest pin creation failed (${res.status}): ${err}`);
    }

    const pin = await res.json() as { id: string };
    return {
      platformPostId: pin.id,
      replyContext: { pinId: pin.id },
    };
  },

  async createComment(_account: Account, _replyContext: unknown, _commentText: string): Promise<CommentResult> {
    // Pinterest does not support programmatic comment posting via API
    return { platformCommentId: null };
  },
};
