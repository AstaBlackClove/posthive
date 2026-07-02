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
import type { CommentResult, PlatformAdapter, PostResult } from "./types.js";

const GRAPH = "https://graph.facebook.com/v21.0";

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
      // Single photo post
      const res = await graphPost(`/${pageId}/photos`, {
        url: images[0],
        caption: content.text,
        access_token: pageAccessToken,
      });
      if (!res.ok) throw new Error(`Facebook photo post failed: ${await res.text()}`);
      const data = await res.json() as { post_id?: string; id: string };
      postId = data.post_id ?? data.id;
    } else if (images.length > 1) {
      // Multi-photo post via staged upload
      const photoIds: string[] = [];
      for (const url of images) {
        const res = await graphPost(`/${pageId}/photos`, {
          url,
          published: "false",
          access_token: pageAccessToken,
        });
        if (!res.ok) throw new Error(`Facebook staged photo upload failed: ${await res.text()}`);
        const data = await res.json() as { id: string };
        photoIds.push(data.id);
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
    _replyContext: unknown,
    _comment: string
  ): Promise<CommentResult> {
    // Commenting on page posts requires pages_manage_engagement (restricted permission).
    // Skip silently — the post itself succeeds.
    return { platformCommentId: null };
  },
};
