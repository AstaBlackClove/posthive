/**
 * LinkedIn adapter — LinkedIn REST API
 *
 * Auth: OAuth 2.0 — scopes: openid profile email w_member_social
 * Tokens: access token (~60 days) + refresh token (~1 year), stored encrypted.
 *
 * Posting uses the newer Posts API (LinkedIn-Version: 202306):
 *   POST https://api.linkedin.com/rest/posts
 *
 * Images require a 3-step flow:
 *   1. POST /rest/images?action=initializeUpload  → uploadUrl + image URN
 *   2. PUT uploadUrl with binary image data
 *   3. Include image URN in post payload
 */

import type { Account } from "@prisma/client";
import { decrypt, encrypt } from "../lib/encryption.js";
import { prisma } from "../lib/prisma.js";
import type { StorageAdapter } from "../lib/storage.js";
import type { CommentResult, PlatformAdapter, PostResult } from "./types.js";

const API_BASE = "https://api.linkedin.com";
const LI_VERSION = "202606";

interface LinkedInCredentials {
  accessToken: string;
  refreshToken: string;
  personUrn: string;       // urn:li:person:{id}
  expiresAt: number;       // epoch ms
  refreshExpiresAt: number;
}

interface LinkedInReplyContext {
  postUrn: string;
}

function getCredentials(account: Account): LinkedInCredentials {
  return JSON.parse(decrypt(account.credentials)) as LinkedInCredentials;
}

async function liRequest(
  method: string,
  path: string,
  token: string,
  body?: unknown,
  useV2 = false
): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
  };
  if (!useV2) {
    headers["LinkedIn-Version"] = LI_VERSION;
  }
  return fetch(`${API_BASE}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

async function refreshAccessToken(creds: LinkedInCredentials): Promise<LinkedInCredentials> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("LinkedIn OAuth credentials not configured");

  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: creds.refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`LinkedIn token refresh failed: ${await res.text()}`);
  const data = await res.json() as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    refresh_token_expires_in?: number;
  };
  return {
    ...creds,
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    ...(data.refresh_token ? {
      refreshToken: data.refresh_token,
      refreshExpiresAt: Date.now() + (data.refresh_token_expires_in ?? 31536000) * 1000,
    } : {}),
  };
}

async function uploadImage(
  token: string,
  personUrn: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const initRes = await liRequest("POST", "/rest/images?action=initializeUpload", token, {
    initializeUploadRequest: { owner: personUrn },
  });
  if (!initRes.ok) throw new Error(`LinkedIn image init failed: ${await initRes.text()}`);
  const initData = await initRes.json() as { value: { uploadUrl: string; image: string } };
  const { uploadUrl, image: imageUrn } = initData.value;

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": mimeType, Authorization: `Bearer ${token}` },
    body: new Uint8Array(buffer),
  });
  if (!uploadRes.ok) throw new Error(`LinkedIn image upload failed: ${await uploadRes.text()}`);
  return imageUrn;
}

async function uploadVideo(
  token: string,
  personUrn: string,
  buffer: Buffer,
): Promise<string> {
  const initRes = await liRequest("POST", "/rest/videos?action=initializeUpload", token, {
    initializeUploadRequest: {
      owner: personUrn,
      fileSizeBytes: buffer.length,
      uploadCaptions: false,
      uploadThumbnail: false,
    },
  });
  if (!initRes.ok) throw new Error(`LinkedIn video init failed: ${await initRes.text()}`);
  const initData = await initRes.json() as {
    value: {
      uploadInstructions: Array<{ uploadUrl: string; firstByte: number; lastByte: number }>;
      video: string;
      uploadToken: string;
    };
  };
  const { uploadInstructions, video: videoUrn, uploadToken } = initData.value;

  const uploadedPartIds: string[] = [];
  for (const instruction of uploadInstructions) {
    const chunk = buffer.subarray(instruction.firstByte, instruction.lastByte + 1);
    const uploadRes = await fetch(instruction.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream", Authorization: `Bearer ${token}` },
      body: new Uint8Array(chunk),
    });
    if (!uploadRes.ok) throw new Error(`LinkedIn video chunk upload failed: ${await uploadRes.text()}`);
    uploadedPartIds.push(uploadRes.headers.get("etag") ?? "");
  }

  const finalRes = await liRequest("POST", "/rest/videos?action=finalizeUpload", token, {
    finalizeUploadRequest: { video: videoUrn, uploadToken, uploadedPartIds },
  });
  if (!finalRes.ok) throw new Error(`LinkedIn video finalize failed: ${await finalRes.text()}`);

  return videoUrn;
}

let storageAdapter: StorageAdapter | null = null;
export function setLinkedInStorage(s: StorageAdapter): void {
  storageAdapter = s;
}

export const linkedinAdapter: PlatformAdapter = {
  name: "linkedin",

  async refreshTokenIfNeeded(account: Account): Promise<Account> {
    const creds = getCredentials(account);
    if (Date.now() < creds.expiresAt - 5 * 60 * 1000) return account;

    console.log(`[linkedin] refreshing token for account ${account.id}`);
    const newCreds = await refreshAccessToken(creds);
    const updated = await prisma.account.update({
      where: { id: account.id },
      data: {
        credentials: encrypt(JSON.stringify(newCreds)),
        expiresAt: new Date(newCreds.expiresAt),
      },
    });
    return updated;
  },

  async createPost(
    account: Account,
    content: { text: string; mediaUrls: string[]; altTexts?: string[] }
  ): Promise<PostResult> {
    const creds = getCredentials(account);
    const { accessToken: token, personUrn: author } = creds;

    const isVideo = (u: string) => /\.(mp4|mov|quicktime)$/i.test(u);
    const videoUrls = content.mediaUrls.filter(u => isVideo(u));
    const imageUrls = content.mediaUrls.filter(u => !isVideo(u));

    let mediaContent: Record<string, unknown> | undefined;

    if (storageAdapter && videoUrls.length > 0) {
      try {
        const buffer = await storageAdapter.getBuffer(videoUrls[0]);
        const videoUrn = await uploadVideo(token, author, buffer);
        mediaContent = { media: { id: videoUrn } };
      } catch (err) {
        console.warn("[linkedin] video upload failed:", err);
      }
    } else if (storageAdapter && imageUrls.length > 0) {
      try {
        const imageUrns = await Promise.all(
          imageUrls.slice(0, 9).map(async (url) => {
            const buffer = await storageAdapter!.getBuffer(url);
            const ext = url.split(".").pop()?.toLowerCase() ?? "jpg";
            const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
            return uploadImage(token, author, buffer, mime);
          })
        );
        mediaContent = imageUrns.length === 1
          ? { media: { id: imageUrns[0] } }
          : { multiImage: { images: imageUrns.map(id => ({ id, altText: "" })) } };
      } catch (err) {
        console.warn("[linkedin] image upload skipped (API tier does not support media):", err);
      }
    }

    // Posts API (/rest/posts) — available on Default Tier "Share on LinkedIn"
    const postBody: Record<string, unknown> = {
      author,
      lifecycleState: "PUBLISHED",
      visibility: "PUBLIC",
      commentary: content.text,
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      ...(mediaContent ? { content: mediaContent } : {}),
    };

    const res = await liRequest("POST", "/rest/posts", token, postBody);
    if (!res.ok) throw new Error(`LinkedIn post failed: ${await res.text()}`);

    // /rest/posts returns 201 with no body; URN is in X-RestLi-Id header
    const postUrn = res.headers.get("x-restli-id") ?? res.headers.get("X-RestLi-Id") ?? "unknown";
    return { platformPostId: postUrn, replyContext: { postUrn } as LinkedInReplyContext };
  },

  async createComment(
    account: Account,
    replyContext: unknown,
    comment: string
  ): Promise<CommentResult> {
    const creds = getCredentials(account);
    const ctx = replyContext as LinkedInReplyContext;
    const res = await liRequest(
      "POST",
      `/v2/socialActions/${encodeURIComponent(ctx.postUrn)}/comments`,
      creds.accessToken,
      { actor: creds.personUrn, message: { text: comment } },
      true
    );
    if (!res.ok) throw new Error(`LinkedIn comment failed: ${await res.text()}`);
    const data = await res.json() as { id?: string };
    return { platformCommentId: data.id ?? "unknown" };
  },
};

export async function encryptLinkedInCredentials(
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  refreshExpiresIn: number,
  personUrn: string
): Promise<string> {
  const creds: LinkedInCredentials = {
    accessToken,
    refreshToken,
    personUrn,
    expiresAt: Date.now() + expiresIn * 1000,
    refreshExpiresAt: Date.now() + refreshExpiresIn * 1000,
  };
  return encrypt(JSON.stringify(creds));
}
