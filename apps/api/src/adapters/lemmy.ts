import type { Account } from "@prisma/client";
import { decrypt } from "../lib/encryption.js";
import type { StorageAdapter } from "../lib/storage.js";
import type { CommentResult, PlatformAdapter, PostResult } from "./types.js";

let storageAdapter: StorageAdapter | null = null;
export function setStorageAdapter(s: StorageAdapter) { storageAdapter = s; }

interface LemmyCredentials {
  instanceUrl: string;
  username: string;
  password: string;
  community: string; // e.g. "selfhosted@lemmy.world"
}

function getCredentials(account: Account): LemmyCredentials {
  return JSON.parse(decrypt(account.credentials)) as LemmyCredentials;
}

const TIMEOUT_MS = 30_000;

async function login(instanceUrl: string, username: string, password: string): Promise<string> {
  const res = await fetch(`${instanceUrl}/api/v3/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username_or_email: username, password }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = await res.json() as { jwt?: string; error?: string };
  if (!res.ok || !json.jwt) throw new Error(json.error ?? `Lemmy login failed: ${res.status}`);
  return json.jwt;
}

async function resolveCommunity(instanceUrl: string, jwt: string, communityRef: string): Promise<number> {
  // Strip leading ! if user typed it
  const ref = communityRef.replace(/^!/, "");
  const instanceHost = new URL(instanceUrl).hostname;
  // Treat as local if no @ or if the community's instance matches our instance
  const communityInstance = ref.includes("@") ? ref.split("@")[1] : null;
  const isRemote = communityInstance !== null && communityInstance !== instanceHost;

  // For local communities use /community?name= — faster and works for newly created communities
  if (!isRemote) {
    const localName = ref.includes("@") ? ref.split("@")[0] : ref;
    const res = await fetch(`${instanceUrl}/api/v3/community?name=${encodeURIComponent(localName)}`, {
      headers: { Authorization: `Bearer ${jwt}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const json = await res.json() as { community_view?: { community: { id: number } }; error?: string };
    if (!res.ok || !json.community_view) throw new Error(json.error ?? `Lemmy community not found: ${ref}`);
    return json.community_view.community.id;
  }

  // For remote (federated) communities use resolve_object
  const res = await fetch(`${instanceUrl}/api/v3/resolve_object?q=${encodeURIComponent(`!${ref}`)}`, {
    headers: { Authorization: `Bearer ${jwt}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = await res.json() as { community?: { community: { id: number } }; error?: string };
  if (!res.ok || !json.community) throw new Error(json.error ?? `Lemmy community not found: ${ref}`);
  return json.community.community.id;
}

async function uploadImage(instanceUrl: string, jwt: string, buffer: Buffer, mimeType: string): Promise<string> {
  const form = new FormData();
  form.append("images[]", new Blob([new Uint8Array(buffer)], { type: mimeType }), "image");
  const res = await fetch(`${instanceUrl}/pictrs/image`, {
    method: "POST",
    headers: { Cookie: `jwt=${jwt}` },
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  const json = await res.json() as { files?: { file: string }[]; error?: string; message?: string };
  if (!res.ok || !json.files?.[0]) throw new Error(json.error ?? json.message ?? "Lemmy image upload failed");
  return `${instanceUrl}/pictrs/image/${json.files[0].file}`;
}

export const lemmyAdapter: PlatformAdapter = {
  name: "lemmy",

  async refreshTokenIfNeeded(account) {
    // Lemmy JWTs expire — we re-login on every post using stored credentials
    return account;
  },

  async createPost(account, { text, mediaUrls }) {
    const { instanceUrl, username, password, community } = getCredentials(account);
    const jwt = await login(instanceUrl, username, password);
    const communityId = await resolveCommunity(instanceUrl, jwt, community);

    // Upload first image if present
    let url: string | undefined;
    if (mediaUrls && mediaUrls.length > 0 && storageAdapter) {
      const buffer = await storageAdapter.getBuffer(mediaUrls[0]);
      const ext = mediaUrls[0].split(".").pop()?.toLowerCase() ?? "jpg";
      const mimeMap: Record<string, string> = {
        jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
        gif: "image/gif", webp: "image/webp",
      };
      url = await uploadImage(instanceUrl, jwt, buffer, mimeMap[ext] ?? "image/jpeg");
    }

    // Split first line as title, rest as body
    const lines = text.trim().split("\n");
    const title = lines[0].slice(0, 200);
    const body = lines.slice(1).join("\n").trim() || undefined;

    const res = await fetch(`${instanceUrl}/api/v3/post`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ community_id: communityId, name: title, body, url, nsfw: false }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const json = await res.json() as { post_view?: { post: { id: number } }; error?: string };
    if (!res.ok || !json.post_view) throw new Error(json.error ?? `Lemmy post failed: ${res.status}`);

    const postId = String(json.post_view.post.id);
    return { platformPostId: postId, replyContext: { postId, instanceUrl } };
  },

  async createComment(account, replyContext, comment) {
    const { instanceUrl, username, password } = getCredentials(account);
    const { postId } = replyContext as { postId: string; instanceUrl: string };
    const jwt = await login(instanceUrl, username, password);

    const res = await fetch(`${instanceUrl}/api/v3/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ post_id: Number(postId), content: comment }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const json = await res.json() as { comment_view?: { comment: { id: number } }; error?: string };
    if (!res.ok || !json.comment_view) throw new Error(json.error ?? "Lemmy comment failed");
    return { platformCommentId: String(json.comment_view.comment.id) };
  },
};
