import type { Account } from "@prisma/client";
import { decrypt } from "../lib/encryption.js";
import type { StorageAdapter } from "../lib/storage.js";
import type { CommentResult, PlatformAdapter, PostResult } from "./types.js";

let storageAdapter: StorageAdapter | null = null;
export function setStorageAdapter(s: StorageAdapter) { storageAdapter = s; }

interface MastodonCredentials {
  accessToken: string;
  instanceUrl: string;
  accountId: string;
}

function getCredentials(account: Account): MastodonCredentials {
  return JSON.parse(decrypt(account.credentials)) as MastodonCredentials;
}

const TIMEOUT_MS = 30_000;

async function apiPost<T>(instanceUrl: string, token: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${instanceUrl}/api/v1${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = await res.json() as T & { error?: string };
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Mastodon API error: ${res.status}`);
  return json;
}

async function uploadMedia(instanceUrl: string, token: string, buffer: Buffer, mimeType: string, altText?: string): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), "media");
  if (altText) form.append("description", altText);

  const res = await fetch(`${instanceUrl}/api/v2/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = await res.json() as { id?: string; error?: string };
  if (!res.ok) throw new Error(json.error ?? `Mastodon media upload failed: ${res.status}`);
  return json.id!;
}

export const mastodonAdapter: PlatformAdapter = {
  name: "mastodon",

  async refreshTokenIfNeeded(account) {
    // Mastodon tokens don't expire
    return account;
  },

  async createPost(account, { text, mediaUrls, altTexts }) {
    const { accessToken, instanceUrl } = getCredentials(account);

    const mediaIds: string[] = [];

    if (mediaUrls && mediaUrls.length > 0 && storageAdapter) {
      for (let i = 0; i < Math.min(mediaUrls.length, 4); i++) {
        const url = mediaUrls[i];
        const buffer = await storageAdapter.getBuffer(url);
        const ext = url.split(".").pop()?.toLowerCase() ?? "jpg";
        const mimeMap: Record<string, string> = {
          jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
          gif: "image/gif", webp: "image/webp", mp4: "video/mp4", mov: "video/mp4",
        };
        const mimeType = mimeMap[ext] ?? "image/jpeg";
        const mediaId = await uploadMedia(instanceUrl, accessToken, buffer, mimeType, altTexts?.[i]);
        mediaIds.push(mediaId);
      }
    }

    const body: Record<string, unknown> = { status: text, visibility: "public" };
    if (mediaIds.length > 0) body.media_ids = mediaIds;

    const res = await apiPost<{ id: string }>(instanceUrl, accessToken, "/statuses", body);
    return { platformPostId: res.id, replyContext: { postId: res.id, instanceUrl } };
  },

  async createComment(account, replyContext, comment) {
    const { accessToken, instanceUrl } = getCredentials(account);
    const { postId } = replyContext as { postId: string; instanceUrl: string };

    const res = await apiPost<{ id: string }>(instanceUrl, accessToken, "/statuses", {
      status: comment,
      in_reply_to_id: postId,
      visibility: "public",
    });
    return { platformCommentId: res.id };
  },
};
