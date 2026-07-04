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

function humanizeTwitterError(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  const data = (err as { data?: { detail?: string; errors?: { message?: string }[] } }).data;
  const detail = data?.detail ?? data?.errors?.[0]?.message ?? msg;

  if (/not permitted to perform this action/i.test(detail))
    throw new Error("Post failed — check character count (280 for free X accounts, 25,000 for X Premium) and media attachments.");
  if (/not allowed to create a tweet|duplicate/i.test(detail))
    throw new Error("X rejected the post — duplicate content. Wait before reposting the same text.");
  if (/usage.capped/i.test(detail))
    throw new Error("X API usage cap reached. Please try again later.");
  if (/user.suspended/i.test(detail))
    throw new Error("Your X account has been suspended. Reconnect with a different account.");
  if (/unsupported authentication/i.test(detail))
    throw new Error("X authentication expired. Please reconnect your X account.");
  if (/not permitted to access this feature/i.test(detail))
    throw new Error("X blocked this request — your account may not have access to this feature.");
  if (/invalid url/i.test(detail))
    throw new Error("The post contains a URL that X does not allow.");
  if (/video longer than 2 minutes/i.test(detail))
    throw new Error("Video exceeds X's 2-minute limit for this account type.");
  if (/maximum of one cashtag/i.test(detail))
    throw new Error("X allows a maximum of one cashtag ($SYMBOL) per post.");
  if (/maximum of 4 items/i.test(detail))
    throw new Error("X allows a maximum of 4 media items per post.");
  if (/service unavailable/i.test(detail))
    throw new Error("X is currently unavailable. Please try again later.");

  throw new Error(`X post failed: ${detail}`);
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

    let data: { id: string };
    try {
      ({ data } = await client.v2.tweet(payload));
    } catch (err) {
      humanizeTwitterError(err);
    }

    return {
      platformPostId: data!.id,
      replyContext: { tweetId: data!.id },
    };
  },

  async createComment(account: Account, replyContext: { tweetId: string }, commentText: string): Promise<CommentResult> {
    const client = getUserClient(account);
    let data: { id: string };
    try {
      ({ data } = await client.v2.reply(commentText, replyContext.tweetId));
    } catch (err) {
      humanizeTwitterError(err);
    }
    return { platformCommentId: data!.id };
  },
};
