/**
 * Google Business Profile adapter — Google Business Profile API v4
 *
 * Auth: Google OAuth 2.0 — scope: https://www.googleapis.com/auth/business.manage
 * Tokens: access (1h) + refresh (long-lived), stored encrypted.
 *
 * NOTE: This adapter requires Google Business Profile API access approval.
 * Apply at: support.google.com/business/contact/api_default
 * The API is gated — you must be approved before any API calls will succeed.
 *
 * Posting: POST /v4/{locationName}/localPosts
 *   - Text posts (STANDARD type), up to 1500 chars
 *   - Optional single image via sourceUrl (must be publicly accessible)
 *   - No video, no carousel, no comments API
 *
 * Credentials structure:
 *   { accessToken, refreshToken, locationName, displayName, expiresAt }
 *   locationName format: "accounts/{accountId}/locations/{locationId}"
 */

import type { Account } from "@prisma/client";
import { decrypt, encrypt } from "../lib/encryption.js";
import { prisma } from "../lib/prisma.js";
import type { CommentResult, PlatformAdapter, PostResult } from "./types.js";

const GBP_BASE = "https://mybusiness.googleapis.com/v4";
const ACCOUNTS_BASE = "https://mybusinessaccountmanagement.googleapis.com/v1";
const LOCATIONS_BASE = "https://mybusinessbusinessinformation.googleapis.com/v1";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

interface GBPCredentials {
  accessToken: string;
  refreshToken: string;
  locationName: string;  // "accounts/{id}/locations/{id}"
  displayName: string;
  expiresAt: number;     // epoch ms
}

function getCredentials(account: Account): GBPCredentials {
  return JSON.parse(decrypt(account.credentials)) as GBPCredentials;
}

function isVideo(url: string): boolean {
  return /\.(mp4|mov|avi|webm|mkv)(\?|$)/i.test(url);
}

export async function refreshGBPToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: number }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLEBUSINESS_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLEBUSINESS_CLIENT_SECRET ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`GBP token refresh failed: ${await res.text()}`);
  const data = await res.json() as { access_token: string; expires_in: number };
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
}

/**
 * Fetch accounts and locations after OAuth, returns the first location found.
 * If the user has multiple locations, the caller should present a picker.
 */
export async function listGBPLocations(
  accessToken: string
): Promise<{ locationName: string; displayName: string }[]> {
  const accountsRes = await fetch(`${ACCOUNTS_BASE}/accounts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!accountsRes.ok) throw new Error(`GBP list accounts failed: ${await accountsRes.text()}`);
  const accountsData = await accountsRes.json() as { accounts?: { name: string }[] };
  const accounts = accountsData.accounts ?? [];
  if (accounts.length === 0) throw new Error("No Google Business Profile accounts found");

  const locations: { locationName: string; displayName: string }[] = [];
  for (const account of accounts) {
    const locRes = await fetch(
      `${LOCATIONS_BASE}/${account.name}/locations?readMask=name,title`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!locRes.ok) continue;
    const locData = await locRes.json() as { locations?: { name: string; title?: string }[] };
    for (const loc of locData.locations ?? []) {
      locations.push({
        locationName: loc.name,
        displayName: loc.title ?? loc.name,
      });
    }
  }

  if (locations.length === 0) throw new Error("No Business Profile locations found — verify your profile first");
  return locations;
}

export const googleBusinessAdapter: PlatformAdapter = {
  name: "googlebusiness",

  async refreshTokenIfNeeded(account: Account): Promise<Account> {
    const creds = getCredentials(account);
    if (Date.now() < creds.expiresAt - 60_000) return account;

    const { accessToken, expiresAt } = await refreshGBPToken(creds.refreshToken);
    const updated: GBPCredentials = { ...creds, accessToken, expiresAt };
    const credentials = encrypt(JSON.stringify(updated));
    return prisma.account.update({
      where: { id: account.id },
      data: { credentials, expiresAt: new Date(expiresAt) },
    });
  },

  async createPost(account, content): Promise<PostResult> {
    const { accessToken, locationName } = getCredentials(account);

    const body: Record<string, unknown> = {
      languageCode: "en",
      summary: content.text,
      topicType: "STANDARD",
    };

    const imageUrl = content.mediaUrls.find((u) => !isVideo(u));
    if (imageUrl) {
      body.media = [{ mediaFormat: "PHOTO", sourceUrl: imageUrl }];
    }

    const res = await fetch(`${GBP_BASE}/${locationName}/localPosts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`GBP createPost failed: ${await res.text()}`);
    const data = await res.json() as { name: string };
    return { platformPostId: data.name, replyContext: null };
  },

  async createComment(): Promise<CommentResult> {
    // GBP local posts have no comment API
    return { platformCommentId: null };
  },
};
