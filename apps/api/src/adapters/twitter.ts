/**
 * Twitter/X adapter — Twitter API v2 + v1.1 media upload
 *
 * Auth: OAuth 1.0a (3-legged) — per-user access token + secret.
 * Tokens do not expire, so refreshTokenIfNeeded is a no-op.
 *
 * Plan gate: Pro & Team only. Enforced per-post with a 100-tweet/month cap.
 * When ENABLE_BILLING is false (self-hosted), all users can post.
 *
 * Posting: v2 tweets API for text/thread; v1.1 media/upload for images.
 */

import type { Account } from "@prisma/client";
import { TwitterApi, EUploadMimeType } from "twitter-api-v2";
import { decrypt } from "../lib/encryption.js";
import { prisma } from "../lib/prisma.js";
import { getPlan } from "../lib/plans.js";
import type { CommentResult, PlatformAdapter, PostResult } from "./types.js";

const X_API_KEY    = process.env.X_API_KEY!;
const X_API_SECRET = process.env.X_API_SECRET!;

interface TwitterCredentials {
  accessToken: string;
  accessSecret: string;
  twitterUserId: string;
}

function getCredentials(account: Account): TwitterCredentials {
  return JSON.parse(decrypt(account.credentials)) as TwitterCredentials;
}

function getUserClient(account: Account): TwitterApi {
  const { accessToken, accessSecret } = getCredentials(account);
  return new TwitterApi({
    appKey: X_API_KEY,
    appSecret: X_API_SECRET,
    accessToken,
    accessSecret,
  });
}

async function enforcePlanGate(account: Account): Promise<void> {
  if (process.env.ENABLE_BILLING !== "true") return;

  const user = await prisma.user.findUnique({
    where: { id: account.userId },
    select: { plan: true },
  });
  const plan = getPlan(user?.plan ?? "cancelled");

  if (!plan.allowTwitter) {
    throw new Error("X/Twitter posting is available on Pro and Team plans. Upgrade to post to X.");
  }

  if (plan.maxTwitterPostsPerMonth !== null && plan.maxTwitterPostsPerMonth > 0) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const count = await prisma.postJobTarget.count({
      where: {
        account: { userId: account.userId, platform: "twitter" },
        status: { in: ["post_done", "comment_done"] },
        createdAt: { gte: startOfMonth },
      },
    });

    if (count >= plan.maxTwitterPostsPerMonth) {
      throw new Error(
        `Monthly X/Twitter limit of ${plan.maxTwitterPostsPerMonth} tweets reached. Resets on the 1st.`
      );
    }
  }
}

async function uploadImages(client: TwitterApi, mediaUrls: string[]): Promise<string[]> {
  const mediaIds: string[] = [];

  const port = process.env.PORT ?? "3001";
  for (const rawUrl of mediaUrls.slice(0, 4)) {
    const url = rawUrl.startsWith("http") ? rawUrl : `http://localhost:${port}${rawUrl}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch media: ${url}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "image/jpeg";

    let mimeType: EUploadMimeType;
    if (contentType.includes("png"))  mimeType = EUploadMimeType.Png;
    else if (contentType.includes("gif")) mimeType = EUploadMimeType.Gif;
    else if (contentType.includes("webp")) mimeType = EUploadMimeType.Webp;
    else mimeType = EUploadMimeType.Jpeg;

    const mediaId = await client.v1.uploadMedia(buffer, { mimeType });
    mediaIds.push(mediaId);
  }

  return mediaIds;
}

export const twitterAdapter: PlatformAdapter = {
  name: "twitter",

  async refreshTokenIfNeeded(account: Account): Promise<Account> {
    // OAuth 1.0a tokens do not expire
    return account;
  },

  async createPost(account: Account, content: {
    text: string;
    mediaUrls?: string[];
  }): Promise<PostResult> {
    await enforcePlanGate(account);

    const client = getUserClient(account);
    const payload: Parameters<typeof client.v2.tweet>[0] = { text: content.text };

    if (content.mediaUrls && content.mediaUrls.length > 0) {
      const mediaIds = await uploadImages(client, content.mediaUrls);
      if (mediaIds.length > 0) {
        const ids = mediaIds.slice(0, 4) as [string] | [string, string] | [string, string, string] | [string, string, string, string];
        payload.media = { media_ids: ids };
      }
    }

    const { data } = await client.v2.tweet(payload);

    return {
      platformPostId: data.id,
      replyContext: { tweetId: data.id },
    };
  },

  async createComment(account: Account, replyContext: { tweetId: string }, commentText: string): Promise<CommentResult> {
    const client = getUserClient(account);
    const { data } = await client.v2.reply(commentText, replyContext.tweetId);
    return { platformCommentId: data.id };
  },
};
