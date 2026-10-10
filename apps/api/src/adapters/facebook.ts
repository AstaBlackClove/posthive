/**
 * Facebook Pages adapter — Graph API v21.0
 *
 * Auth: OAuth 2.0 long-lived page access token (never expires while page is connected).
 * Flow:
 *   1. User authorises with pages_manage_posts + pages_show_list
 *   2. We list their pages and let them pick one
 *   3. Exchange user token for a long-lived page access token
 *   4. Store page access token + page ID in credentials
 * Publishing: POST /{pageId}/feed with message + optional photo/link
 */

import type { Account } from "@prisma/client";
import { decrypt, encrypt } from "../lib/encryption.js";
import { prisma } from "../lib/prisma.js";
import type { StorageAdapter } from "../lib/storage.js";
import type { AnalyticsResult, CommentResult, PlatformAdapter, PostResult } from "./types.js";

const GRAPH = "https://graph.facebook.com/v21.0";

// Facebook only accepts JPEG and PNG for photo posts
const FB_SUPPORTED = new Set(["image/jpeg", "image/png"]);

let storageAdapter: StorageAdapter | null = null;
export function setFacebookStorage(s: StorageAdapter): void { storageAdapter = s; }

interface FacebookCredentials {
  pageAccessToken: string;
  pageId: string;
  userId: string;
  userAccessToken: string;
}

function getCredentials(account: Account): FacebookCredentials {
  return JSON.parse(decrypt(account.credentials)) as FacebookCredentials;
}

async function graphPost(path: string, params: Record<string, string>): Promise<Response> {
  return fetch(`${GRAPH}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
}

async function graphGet(path: string, params: Record<string, string>): Promise<Response> {
  const url = new URL(`${GRAPH}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return fetch(url.toString());
}

/**
 * Upload a photo to Facebook as multipart/form-data.
 * Avoids FB's URL-fetcher (which rejects WebP, GIF, and private CDN URLs).
 * Converts unsupported formats to JPEG via sharp.
 * Returns the photo's Facebook ID (or post_id for published single photos).
 */
async function uploadPhotoBuffer(
  pageId: string,
  pageAccessToken: string,
  imageUrl: string,
  published: string | null,  // null = default published true
  caption: string | null,
): Promise<string> {
  if (!storageAdapter) {
    // Fallback to URL-based upload if storage not wired up
    const params: Record<string, string> = { url: imageUrl, access_token: pageAccessToken };
    if (published !== null) params.published = published;
    if (caption) params.caption = caption;
    const res = await graphPost(`/${pageId}/photos`, params);
    if (!res.ok) throw new Error(`Facebook photo post failed: ${await res.text()}`);
    const data = await res.json() as { post_id?: string; id: string };
    return data.post_id ?? data.id;
  }

  // Use storageAdapter only for URLs it owns (Supabase/R2/local uploads).
  // External URLs (Google Images, CDNs, etc.) are fetched directly.
  let buffer: Buffer;
  if (storageAdapter.ownsUrl(imageUrl)) {
    buffer = await storageAdapter.getBuffer(imageUrl);
  } else {
    const fetched = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
    if (!fetched.ok) throw new Error(`Facebook: could not fetch image ${imageUrl}: ${fetched.status}`);
    buffer = Buffer.from(await fetched.arrayBuffer());
  }
  let mimeType = "image/jpeg";

  // Detect format from magic bytes
  if (buffer[0] === 0x89 && buffer[1] === 0x50) mimeType = "image/png";
  else if (buffer[0] === 0xff && buffer[1] === 0xd8) mimeType = "image/jpeg";
  else if (buffer.slice(0, 4).toString() === "RIFF" || buffer.slice(0, 4).toString("hex") === "52494646") {
    mimeType = "image/webp"; // WebP starts with RIFF....WEBP
  } else if (buffer.slice(0, 3).toString() === "GIF") mimeType = "image/gif";

  // Convert WebP/GIF to JPEG — Facebook rejects both
  if (!FB_SUPPORTED.has(mimeType)) {
    const sharp = (await import("sharp")).default;
    buffer = await sharp(buffer).jpeg({ quality: 92 }).toBuffer();
    mimeType = "image/jpeg";
  }

  const form = new FormData();
  form.append("source", new Blob([new Uint8Array(buffer)], { type: mimeType }), "photo.jpg");
  form.append("access_token", pageAccessToken);
  if (published !== null) form.append("published", published);
  if (caption) form.append("caption", caption);

  const res = await fetch(`${GRAPH}/${pageId}/photos`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Facebook photo post failed: ${await res.text()}`);
  const data = await res.json() as { post_id?: string; id: string };
  return data.post_id ?? data.id;
}

export const facebookAdapter: PlatformAdapter = {
  name: "facebook",

  async refreshTokenIfNeeded(account: Account): Promise<Account> {
    // Page access tokens don't expire as long as the user token is valid.
    // Refresh the user long-lived token if it expires within 7 days.
    const creds = getCredentials(account);
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (account.expiresAt && account.expiresAt.getTime() - Date.now() > sevenDaysMs) {
      return account;
    }

    const appId = process.env.FACEBOOK_APP_ID!;
    const appSecret = process.env.FACEBOOK_APP_SECRET!;

    const res = await graphGet("/oauth/access_token", {
      grant_type: "fb_exchange_token",
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: creds.userAccessToken,
    });

    if (!res.ok) {
      console.error("[facebook] token refresh failed:", await res.text());
      return account;
    }

    const data = await res.json() as { access_token: string; expires_in?: number };
    const newExpiresAt = data.expires_in
      ? new Date(Date.now() + (data.expires_in - 86400) * 1000)
      : new Date(Date.now() + 59 * 24 * 60 * 60 * 1000);

    // Re-fetch page access token with new user token
    const pageRes = await graphGet(`/${creds.pageId}`, {
      fields: "access_token",
      access_token: data.access_token,
    });

    let newPageToken = creds.pageAccessToken;
    if (pageRes.ok) {
      const pageData = await pageRes.json() as { access_token?: string };
      if (pageData.access_token) newPageToken = pageData.access_token;
    }

    const updatedCreds = encrypt(JSON.stringify({
      ...creds,
      userAccessToken: data.access_token,
      pageAccessToken: newPageToken,
    }));

    return prisma.account.update({
      where: { id: account.id },
      data: { credentials: updatedCreds, expiresAt: newExpiresAt },
    });
  },

  async createPost(
    account: Account,
    content: { text: string; mediaUrls: string[] }
  ): Promise<PostResult> {
    const { pageAccessToken, pageId } = getCredentials(account);

    const publicBase = process.env.PUBLIC_API_URL ?? "";
    const resolvedUrls = content.mediaUrls.map(u =>
      u.startsWith("http") ? u : `${publicBase}${u}`
    );
    const isVideo = (u: string) => /\.(mp4|mov|quicktime)$/i.test(u);
    const images = resolvedUrls.filter(u => !isVideo(u));
    const video = resolvedUrls.find(isVideo);

    let postId: string;

    if (video) {
      // Video post
      const res = await graphPost(`/${pageId}/videos`, {
        file_url: video,
        description: content.text,
        access_token: pageAccessToken,
      });
      if (!res.ok) throw new Error(`Facebook video post failed: ${await res.text()}`);
      const data = await res.json() as { id: string };
      postId = data.id;
    } else if (images.length === 1) {
      // Buffer upload avoids Facebook's crawler (rejects WebP, GIF, and Supabase CDN URLs)
      postId = await uploadPhotoBuffer(pageId, pageAccessToken, images[0], null, content.text);
    } else if (images.length > 1) {
      // Multi-photo post via staged upload
      const photoIds: string[] = [];
      for (const url of images) {
        const id = await uploadPhotoBuffer(pageId, pageAccessToken, url, "false", null);
        photoIds.push(id);
      }
      const params: Record<string, string> = {
        message: content.text,
        access_token: pageAccessToken,
      };
      photoIds.forEach((id, i) => { params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id }); });
      const res = await graphPost(`/${pageId}/feed`, params);
      if (!res.ok) throw new Error(`Facebook multi-photo post failed: ${await res.text()}`);
      const data = await res.json() as { id: string };
      postId = data.id;
    } else {
      // Text-only post
      const res = await graphPost(`/${pageId}/feed`, {
        message: content.text,
        access_token: pageAccessToken,
      });
      if (!res.ok) throw new Error(`Facebook text post failed: ${await res.text()}`);
      const data = await res.json() as { id: string };
      postId = data.id;
    }

    return {
      platformPostId: postId,
      replyContext: { postId, pageId, pageAccessToken },
    };
  },

  async createComment(
    _account: Account,
    replyContext: unknown,
    comment: string,
  ): Promise<CommentResult> {
    const { postId, pageAccessToken } = replyContext as { postId: string; pageId: string; pageAccessToken: string };
    const res = await graphPost(`/${postId}/comments`, {
      message: comment,
      access_token: pageAccessToken,
    });
    if (!res.ok) throw new Error(`Facebook comment failed: ${await res.text()}`);
    const data = await res.json() as { id: string };
    return { platformCommentId: data.id };
  },

  async getAnalytics(account: Account, platformPostId: string): Promise<AnalyticsResult> {
    const { pageAccessToken } = getCredentials(account);

    const [reactionsRes, postRes, insightsRes] = await Promise.all([
      fetch(
        `${GRAPH}/${platformPostId}/reactions?summary=true&access_token=${pageAccessToken}`,
      ).then((r) => r.json()) as Promise<{ summary?: { total_count?: number } }>,
      fetch(
        `${GRAPH}/${platformPostId}?fields=comments.summary(true)&access_token=${pageAccessToken}`,
      ).then((r) => r.json()) as Promise<{ comments?: { summary?: { total_count?: number } } }>,
      fetch(
        `${GRAPH}/${platformPostId}/insights?metric=post_impressions_unique&access_token=${pageAccessToken}`,
      ).then((r) => r.json()).catch(() => null) as Promise<{ data?: Array<{ values?: Array<{ value?: number }> }> } | null>,
    ]);

    const rawViews = insightsRes?.data?.[0]?.values?.[0]?.value;

    return {
      likes:   reactionsRes.summary?.total_count ?? 0,
      replies: postRes.comments?.summary?.total_count ?? 0,
      views:   typeof rawViews === "number" ? rawViews : undefined,
      fetchedAt: new Date().toISOString(),
    };
  },
};
