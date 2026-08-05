/**
 * TikTok adapter — Content Posting API v2
 *
 * Auth: OAuth 2.0 — scopes: user.info.basic video.upload
 * Tokens: access token (~24h) + refresh token (~1 year)
 * Videos only — TikTok Content Posting API does not support text-only or image posts
 * No first comment API — add platform to NO_COMMENT_PLATFORMS
 */

import type { Account } from "@prisma/client";
import { decrypt, encrypt } from "../lib/encryption.js";
import { prisma } from "../lib/prisma.js";
import type { StorageAdapter } from "../lib/storage.js";
import type { CommentResult, PlatformAdapter, PostResult } from "./types.js";

const API_BASE = "https://open.tiktokapis.com";
const CHUNK_SIZE = 64 * 1024 * 1024; // 64 MB max per chunk

interface TikTokCredentials {
  accessToken: string;
  refreshToken: string;
  openId: string;
  expiresAt: number;
  refreshExpiresAt: number;
}

interface TikTokReplyContext {
  publishId: string;
}

function getCredentials(account: Account): TikTokCredentials {
  return JSON.parse(decrypt(account.credentials)) as TikTokCredentials;
}

async function refreshAccessToken(creds: TikTokCredentials): Promise<TikTokCredentials> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) throw new Error("TikTok credentials not configured");

  const res = await fetch(`${API_BASE}/v2/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: creds.refreshToken,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`TikTok token refresh failed: ${text}`);
  const json = JSON.parse(text) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    refresh_expires_in?: number;
    open_id?: string;
    error?: string;
    error_description?: string;
  };
  if (json.error) throw new Error(`TikTok token refresh error: ${json.error_description ?? json.error}`);
  if (!json.access_token) throw new Error(`Unexpected refresh response: ${text}`);
  return {
    ...creds,
    accessToken: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 86400) * 1000,
    refreshToken: json.refresh_token ?? creds.refreshToken,
    refreshExpiresAt: Date.now() + (json.refresh_expires_in ?? 31536000) * 1000,
    openId: json.open_id ?? creds.openId,
  };
}

let storageAdapter: StorageAdapter | null = null;
export function setTikTokStorage(s: StorageAdapter): void {
  storageAdapter = s;
}

export const tiktokAdapter: PlatformAdapter = {
  name: "tiktok",

  async refreshTokenIfNeeded(account: Account): Promise<Account> {
    const creds = getCredentials(account);
    if (Date.now() < creds.expiresAt - 5 * 60 * 1000) return account;
    console.log(`[tiktok] refreshing token for account ${account.id}`);
    const newCreds = await refreshAccessToken(creds);
    return prisma.account.update({
      where: { id: account.id },
      data: {
        credentials: encrypt(JSON.stringify(newCreds)),
        expiresAt: new Date(newCreds.expiresAt),
      },
    });
  },

  async createPost(
    account: Account,
    content: { text: string; mediaUrls: string[] }
  ): Promise<PostResult> {
    if (!storageAdapter) throw new Error("Storage adapter not configured");

    const isVideo = (u: string) => /\.(mp4|mov|quicktime)$/i.test(u);
    const videoUrl = content.mediaUrls.find(u => isVideo(u));
    if (!videoUrl) throw new Error("TikTok requires a video — attach an mp4 or mov file");

    const creds = getCredentials(account);
    const token = creds.accessToken;

    const videoBuffer = await storageAdapter.getBuffer(videoUrl);
    const videoSize = videoBuffer.length;
    const chunkSize = Math.min(CHUNK_SIZE, videoSize);
    const totalChunkCount = Math.ceil(videoSize / chunkSize);
    const caption = content.text.slice(0, 2200);

    const initRes = await fetch(`${API_BASE}/v2/post/publish/video/init/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        post_info: {
          title: caption,
          privacy_level: "SELF_ONLY",
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          video_cover_timestamp_ms: 1000,
        },
        source_info: {
          source: "FILE_UPLOAD",
          video_size: videoSize,
          chunk_size: chunkSize,
          total_chunk_count: totalChunkCount,
        },
      }),
    });
    if (!initRes.ok) throw new Error(`TikTok init upload failed: ${await initRes.text()}`);
    const initData = await initRes.json() as {
      data: { publish_id: string; upload_url: string };
      error: { code: string; message: string };
    };
    if (initData.error.code !== "ok") throw new Error(`TikTok init error: ${initData.error.message}`);
    const { publish_id: publishId, upload_url: uploadUrl } = initData.data;

    for (let i = 0; i < totalChunkCount; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, videoSize) - 1;
      const chunk = videoBuffer.subarray(start, end + 1);
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "video/mp4",
          "Content-Range": `bytes ${start}-${end}/${videoSize}`,
          "Content-Length": String(chunk.length),
        },
        body: new Uint8Array(chunk),
      });
      if (!uploadRes.ok) throw new Error(`TikTok chunk ${i + 1} upload failed: ${await uploadRes.text()}`);
    }

    return {
      platformPostId: publishId,
      replyContext: { publishId } as TikTokReplyContext,
    };
  },

  async createComment(): Promise<CommentResult> {
    throw new Error("TikTok does not support first comments via API");
  },
};

export function encryptTikTokCredentials(
  accessToken: string,
  refreshToken: string,
  openId: string,
  expiresIn: number,
  refreshExpiresIn: number
): string {
  const creds: TikTokCredentials = {
    accessToken,
    refreshToken,
    openId,
    expiresAt: Date.now() + expiresIn * 1000,
    refreshExpiresAt: Date.now() + refreshExpiresIn * 1000,
  };
  return encrypt(JSON.stringify(creds));
}
