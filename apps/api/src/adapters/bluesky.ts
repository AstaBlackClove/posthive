import { BskyAgent } from "@atproto/api";
import type { AppBskyEmbedImages } from "@atproto/api";
import type { Account } from "@prisma/client";
import { decrypt, encrypt } from "../lib/encryption.js";
import type { StorageAdapter } from "../lib/storage.js";
import type { CommentResult, PlatformAdapter, PostResult } from "./types.js";

interface BlueskyCredentials {
  handle: string;
  appPassword: string;
}

interface BlueskyReplyContext {
  uri: string;
  cid: string;
}

async function buildAgent(account: Account): Promise<BskyAgent> {
  const raw = decrypt(account.credentials);
  const creds: BlueskyCredentials = JSON.parse(raw);
  const agent = new BskyAgent({ service: "https://bsky.social" });
  await agent.login({ identifier: creds.handle, password: creds.appPassword });
  return agent;
}

/**
 * Upload image files to Bluesky's blob store and return embed.images payload.
 * Each mediaUrl is read from storage, uploaded as a blob, and attached.
 * Bluesky supports up to 4 images per post.
 */
async function buildImageEmbed(
  agent: BskyAgent,
  mediaUrls: string[],
  storage: StorageAdapter
): Promise<AppBskyEmbedImages.Main | undefined> {
  if (mediaUrls.length === 0) return undefined;

  const images: AppBskyEmbedImages.Image[] = await Promise.all(
    mediaUrls.slice(0, 4).map(async (url) => {
      const buffer = await storage.getBuffer(url);

      // Detect mime type from the URL extension
      const ext = url.split(".").pop()?.toLowerCase() ?? "jpg";
      const mimeMap: Record<string, string> = {
        jpg: "image/jpeg", jpeg: "image/jpeg",
        png: "image/png", gif: "image/gif", webp: "image/webp",
      };
      const mimeType = mimeMap[ext] ?? "image/jpeg";

      const { data } = await agent.uploadBlob(buffer, { encoding: mimeType });
      return {
        image: data.blob,
        alt: "", // TODO: accept alt text in the compose UI for accessibility
      };
    })
  );

  return { $type: "app.bsky.embed.images", images };
}

// Storage adapter injected at startup — allows swapping local disk → S3/R2
let storageAdapter: StorageAdapter | null = null;

export function setBlueskyStorage(s: StorageAdapter): void {
  storageAdapter = s;
}

export const blueskyAdapter: PlatformAdapter = {
  name: "bluesky",

  async refreshTokenIfNeeded(account: Account): Promise<Account> {
    return account;
  },

  async createPost(
    account: Account,
    content: { text: string; mediaUrls: string[] }
  ): Promise<PostResult> {
    const agent = await buildAgent(account);

    const embed =
      storageAdapter && content.mediaUrls.length > 0
        ? await buildImageEmbed(agent, content.mediaUrls, storageAdapter)
        : undefined;

    const response = await agent.post({
      text: content.text,
      ...(embed ? { embed } : {}),
    });

    const replyContext: BlueskyReplyContext = { uri: response.uri, cid: response.cid };
    return { platformPostId: response.uri, replyContext };
  },

  async createComment(
    account: Account,
    replyContext: unknown,
    comment: string
  ): Promise<CommentResult> {
    const agent = await buildAgent(account);
    const ctx = replyContext as BlueskyReplyContext;

    const response = await agent.post({
      text: comment,
      reply: {
        root: { uri: ctx.uri, cid: ctx.cid },
        parent: { uri: ctx.uri, cid: ctx.cid },
      },
    });

    return { platformCommentId: response.uri };
  },
};

export async function encryptBlueskyCredentials(
  handle: string,
  appPassword: string
): Promise<string> {
  const agent = new BskyAgent({ service: "https://bsky.social" });
  await agent.login({ identifier: handle, password: appPassword });
  const creds: BlueskyCredentials = { handle, appPassword };
  return encrypt(JSON.stringify(creds));
}
