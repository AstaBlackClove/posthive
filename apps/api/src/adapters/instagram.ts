import type { Account } from "@prisma/client";
import { decrypt, encrypt } from "../lib/encryption.js";
import type { CommentResult, PlatformAdapter, PostResult } from "./types.js";
import { prisma } from "../lib/prisma.js";

const API = "https://graph.instagram.com/v21.0";

interface InstagramCredentials {
  accessToken: string;
  userId: string;
  expiresAt?: string;
}

function getCredentials(account: Account): InstagramCredentials {
  return JSON.parse(decrypt(account.credentials)) as InstagramCredentials;
}

async function apiGet<T>(path: string, token: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${API}${path}`);
  url.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  const json = await res.json() as T & { error?: { message: string } };
  if (!res.ok) throw new Error((json as { error?: { message: string } }).error?.message ?? `Instagram API error: ${res.status}`);
  return json;
}

async function apiPost<T>(path: string, token: string, body: Record<string, string>): Promise<T> {
  const url = new URL(`${API}${path}`);
  url.searchParams.set("access_token", token);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json() as T & { error?: { message: string } };
  if (!res.ok) throw new Error((json as { error?: { message: string } }).error?.message ?? `Instagram API error: ${res.status}`);
  return json;
}

async function refreshIfNeeded(account: Account): Promise<Account> {
  const creds = getCredentials(account);
  if (!creds.expiresAt) return account;

  const expiresAt = new Date(creds.expiresAt);
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (expiresAt.getTime() - Date.now() > sevenDays) return account;

  try {
    const res = await fetch(
      `https://graph.instagram.com/refresh_access_token?` +
      new URLSearchParams({ grant_type: "ig_refresh_token", access_token: creds.accessToken })
    );
    if (!res.ok) return account;
    const data = await res.json() as { access_token: string; expires_in: number };
    const newCreds: InstagramCredentials = {
      ...creds,
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + (data.expires_in - 86400) * 1000).toISOString(),
    };
    return await prisma.account.update({
      where: { id: account.id },
      data: { credentials: encrypt(JSON.stringify(newCreds)), expiresAt: new Date(newCreds.expiresAt!) },
    });
  } catch {
    return account;
  }
}

// Poll until container is ready — videos need up to 5 min, images ~2s
async function waitForContainer(userId: string, token: string, containerId: string, maxWait = 300_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const res = await apiGet<{ status_code: string }>(
      `/${containerId}`, token, { fields: "status_code" }
    );
    if (res.status_code === "FINISHED") return;
    if (res.status_code === "ERROR") throw new Error("Instagram media container processing failed");
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("Instagram media container timed out");
}

async function publishContainer(userId: string, token: string, containerId: string): Promise<string> {
  const res = await apiPost<{ id: string }>(
    `/${userId}/media_publish`, token, { creation_id: containerId }
  );
  return res.id;
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|quicktime)(\?|$)/i.test(url);
}

export const instagramAdapter: PlatformAdapter = {
  name: "instagram",

  async refreshTokenIfNeeded(account) {
    return refreshIfNeeded(account);
  },

  async createPost(account, { text, mediaUrls, altTexts, mediaType, locationId, userTags, collaborators }) {
    const { accessToken, userId } = getCredentials(account);

    const PUBLIC_API_URL = process.env.PUBLIC_API_URL ?? "";
    const absoluteUrls = (mediaUrls ?? []).map((url) =>
      url.startsWith("http") ? url : `${PUBLIC_API_URL}${url}`
    );

    const hasVideo = absoluteUrls.some(isVideoUrl);
    const hasMixed = absoluteUrls.length > 1 && absoluteUrls.some(isVideoUrl) && absoluteUrls.some(u => !isVideoUrl(u));
    const type = mediaType ?? (hasVideo && !hasMixed ? "reel" : "post");

    // ── Story ──────────────────────────────────────────────────────────────
    if (type === "story") {
      if (absoluteUrls.length === 0) throw new Error("Instagram Stories require at least one image.");
      const body: Record<string, string> = {
        media_type: "STORIES",
        image_url: absoluteUrls[0],
      };
      const { id: containerId } = await apiPost<{ id: string }>(`/${userId}/media`, accessToken, body);
      await waitForContainer(userId, accessToken, containerId);
      const postId = await publishContainer(userId, accessToken, containerId);
      return { platformPostId: postId, replyContext: { postId, userId } };
    }

    // ── Reel ───────────────────────────────────────────────────────────────
    if (type === "reel") {
      if (absoluteUrls.length === 0) throw new Error("Instagram Reels require a video file.");
      const videoUrl = absoluteUrls.find(isVideoUrl) ?? absoluteUrls[0];
      const body: Record<string, string> = {
        media_type: "REELS",
        video_url: videoUrl,
      };
      if (text) body.caption = text;
      const { id: containerId } = await apiPost<{ id: string }>(`/${userId}/media`, accessToken, body);
      await waitForContainer(userId, accessToken, containerId, 300_000); // 5 min for video processing
      const postId = await publishContainer(userId, accessToken, containerId);
      return { platformPostId: postId, replyContext: { postId, userId } };
    }

    // ── Regular post (image / carousel / mixed video+image carousel) ──────
    if (absoluteUrls.length === 0) {
      throw new Error("Instagram requires at least one image. Text-only posts are not supported.");
    }

    let containerId: string;

    if (absoluteUrls.length === 1) {
      const isVid = isVideoUrl(absoluteUrls[0]);
      const body: Record<string, string> = isVid
        ? { media_type: "VIDEO", video_url: absoluteUrls[0] }
        : { image_url: absoluteUrls[0] };
      if (text) body.caption = text;
      if (!isVid && altTexts?.[0]) body.accessibility_caption = altTexts[0];
      if (locationId) body.location_id = locationId;
      if (collaborators?.length) body.collaborators = collaborators.join(",");
      if (userTags?.length) body.user_tags = JSON.stringify(userTags.map(username => ({ username })));
      const res = await apiPost<{ id: string }>(`/${userId}/media`, accessToken, body);
      containerId = res.id;
    } else {
      // Carousel — supports mixed image + video items
      const items = await Promise.all(
        absoluteUrls.map(async (url, i) => {
          const isVid = isVideoUrl(url);
          const body: Record<string, string> = isVid
            ? { media_type: "VIDEO", video_url: url, is_carousel_item: "true" }
            : { image_url: url, is_carousel_item: "true" };
          if (!isVid && altTexts?.[i]) body.accessibility_caption = altTexts[i];
          const res = await apiPost<{ id: string }>(`/${userId}/media`, accessToken, body);
          // Video items in carousels also need processing time
          if (isVid) await waitForContainer(userId, accessToken, res.id, 300_000);
          return res.id;
        })
      );
      const carouselBody: Record<string, string> = {
        media_type: "CAROUSEL",
        children: items.join(","),
      };
      if (text) carouselBody.caption = text;
      if (locationId) carouselBody.location_id = locationId;
      if (collaborators?.length) carouselBody.collaborators = collaborators.join(",");
      const res = await apiPost<{ id: string }>(`/${userId}/media`, accessToken, carouselBody);
      containerId = res.id;
    }

    await waitForContainer(userId, accessToken, containerId);
    const postId = await publishContainer(userId, accessToken, containerId);
    return { platformPostId: postId, replyContext: { postId, userId } };
  },

  async createComment(account, replyContext, comment) {
    const { accessToken } = getCredentials(account);
    const { postId } = replyContext as { postId: string; userId: string };
    const res = await apiPost<{ id: string }>(`/${postId}/comments`, accessToken, { message: comment });
    return { platformCommentId: res.id };
  },
};
