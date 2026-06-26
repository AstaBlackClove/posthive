/**
 * Threads adapter — Meta Threads API v1.0
 *
 * Auth: OAuth 2.0 long-lived token (60 days), stored encrypted in Account.credentials.
 * Publishing is a two-step process:
 *   1. POST /{userId}/threads        — create a media container → container_id
 *   2. POST /{userId}/threads_publish — publish the container  → thread_id
 * Replies use the same two steps with reply_to_id set to the parent thread_id.
 */

import type { Account } from "@prisma/client";
import { decrypt, encrypt } from "../lib/encryption.js";
import { prisma } from "../lib/prisma.js";
import type { CommentResult, PlatformAdapter, PostResult } from "./types.js";

const BASE = "https://graph.threads.net/v1.0";

interface ThreadsCredentials {
  accessToken: string;
  userId: string;
}

interface ThreadsReplyContext {
  threadId: string; // the published thread_id to reply to
}

function getCredentials(account: Account): ThreadsCredentials {
  return JSON.parse(decrypt(account.credentials)) as ThreadsCredentials;
}

async function threadsPost(path: string, params: Record<string, string>): Promise<Response> {
  const url = new URL(`${BASE}${path}`);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  return res;
}

async function createContainer(
  userId: string,
  accessToken: string,
  params: Record<string, string>
): Promise<string> {
  const res = await threadsPost(`/${userId}/threads`, {
    ...params,
    access_token: accessToken,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Threads container creation failed: ${body}`);
  }

  const data = await res.json() as { id: string };
  return data.id;
}

async function publishContainer(
  userId: string,
  accessToken: string,
  containerId: string
): Promise<string> {
  const res = await threadsPost(`/${userId}/threads_publish`, {
    creation_id: containerId,
    access_token: accessToken,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Threads publish failed: ${body}`);
  }

  const data = await res.json() as { id: string };
  return data.id;
}

export const threadsAdapter: PlatformAdapter = {
  name: "threads",

  async refreshTokenIfNeeded(account: Account): Promise<Account> {
    // Refresh if token expires within 7 days
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (account.expiresAt && account.expiresAt.getTime() - Date.now() > sevenDaysMs) {
      return account; // still fresh
    }

    const creds = getCredentials(account);

    const res = await fetch(
      `${BASE}/refresh_access_token?` +
      new URLSearchParams({
        grant_type: "th_refresh_token",
        access_token: creds.accessToken,
      })
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Threads token refresh failed: ${body}`);
    }

    const data = await res.json() as { access_token: string; expires_in: number };
    const newExpiresAt = new Date(Date.now() + (data.expires_in - 86400) * 1000);

    const updatedCredentials = encrypt(JSON.stringify({
      ...creds,
      accessToken: data.access_token,
    }));

    return prisma.account.update({
      where: { id: account.id },
      data: { credentials: updatedCredentials, expiresAt: newExpiresAt },
    });
  },

  async createPost(
    account: Account,
    content: { text: string; mediaUrls: string[] }
  ): Promise<PostResult> {
    const { accessToken, userId } = getCredentials(account);

    // Resolve relative /uploads/ paths to a publicly accessible URL.
    // Threads fetches images itself — localhost won't work.
    const publicBase = process.env.PUBLIC_API_URL ?? process.env.THREADS_REDIRECT_URI?.replace("/auth/threads/callback", "") ?? "";
    const resolvedUrls = content.mediaUrls.map((u) =>
      u.startsWith("http") ? u : `${publicBase}${u}`
    );

    let containerId: string;

    if (resolvedUrls.length === 0) {
      // Text-only post
      containerId = await createContainer(userId, accessToken, {
        media_type: "TEXT",
        text: content.text,
      });
    } else if (resolvedUrls.length === 1) {
      // Single image post
      containerId = await createContainer(userId, accessToken, {
        media_type: "IMAGE",
        image_url: resolvedUrls[0],
        text: content.text,
      });
    } else {
      // Carousel post — create one container per image, then a carousel container
      const itemIds: string[] = [];
      for (const url of resolvedUrls) {
        const itemId = await createContainer(userId, accessToken, {
          media_type: "IMAGE",
          image_url: url,
          is_carousel_item: "true",
        });
        itemIds.push(itemId);
      }
      containerId = await createContainer(userId, accessToken, {
        media_type: "CAROUSEL",
        children: itemIds.join(","),
        text: content.text,
      });
    }

    // Meta recommends a short delay between container creation and publish
    await new Promise((r) => setTimeout(r, 1000));

    const threadId = await publishContainer(userId, accessToken, containerId);

    return {
      platformPostId: threadId,
      replyContext: { threadId } satisfies ThreadsReplyContext,
    };
  },

  async createComment(
    account: Account,
    replyContext: unknown,
    comment: string
  ): Promise<CommentResult> {
    const { accessToken, userId } = getCredentials(account);
    const { threadId } = replyContext as ThreadsReplyContext;

    // Step 1: create reply container
    const containerId = await createContainer(userId, accessToken, {
      media_type: "TEXT",
      text: comment,
      reply_to_id: threadId,
    });

    await new Promise((r) => setTimeout(r, 1000));

    // Step 2: publish reply
    const commentId = await publishContainer(userId, accessToken, containerId);

    return { platformCommentId: commentId };
  },
};
