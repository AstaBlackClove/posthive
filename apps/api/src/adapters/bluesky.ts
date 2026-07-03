import { BskyAgent } from "@atproto/api";
import type { AppBskyEmbedImages, AppBskyEmbedExternal, AppBskyEmbedVideo } from "@atproto/api";
import type { Account } from "@prisma/client";
import { decrypt, encrypt } from "../lib/encryption.js";
import { compressForPlatform } from "../lib/compress.js";
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
  storage: StorageAdapter,
  altTexts?: string[]
): Promise<AppBskyEmbedImages.Main | undefined> {
  if (mediaUrls.length === 0) return undefined;

  const images: AppBskyEmbedImages.Image[] = await Promise.all(
    mediaUrls.slice(0, 4).map(async (url, i) => {
      const buffer = await storage.getBuffer(url);

      const ext = url.split(".").pop()?.toLowerCase() ?? "jpg";
      const mimeMap: Record<string, string> = {
        jpg: "image/jpeg", jpeg: "image/jpeg",
        png: "image/png", gif: "image/gif", webp: "image/webp",
      };
      const mimeType = mimeMap[ext] ?? "image/jpeg";

      const { buffer: compressed, mimeType: outMime } = await compressForPlatform(buffer, mimeType, "bluesky");
      const { data } = await agent.uploadBlob(compressed, { encoding: outMime });
      return { image: data.blob, alt: altTexts?.[i] ?? "" };
    })
  );

  return { $type: "app.bsky.embed.images", images };
}

/** Extract the first URL from text, if any */
function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}

/** Fetch OG/meta tags from a URL and build a link card embed */
async function buildLinkCard(
  agent: BskyAgent,
  url: string
): Promise<AppBskyEmbedExternal.Main | undefined> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Posthive/1.0 (+https://posthive.co)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return undefined;
    const html = await res.text();

    const getTag = (prop: string) => {
      const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"))
        ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i"));
      return m?.[1] ?? null;
    };
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);

    const title = getTag("og:title") ?? getTag("twitter:title") ?? titleTag?.[1] ?? url;
    const description = getTag("og:description") ?? getTag("twitter:description") ?? getTag("description") ?? "";
    const imageUrl = getTag("og:image") ?? getTag("twitter:image") ?? null;

    let thumb: AppBskyEmbedExternal.Main["external"]["thumb"] | undefined;
    if (imageUrl) {
      try {
        const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(5000) });
        if (imgRes.ok) {
          const buf = Buffer.from(await imgRes.arrayBuffer());
          const ext = imageUrl.split(".").pop()?.split("?")[0]?.toLowerCase() ?? "jpg";
          const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
          const { data } = await agent.uploadBlob(buf, { encoding: mime });
          thumb = data.blob;
        }
      } catch { /* thumbnail is optional */ }
    }

    return {
      $type: "app.bsky.embed.external",
      external: { uri: url, title: title.trim(), description: description.trim(), ...(thumb ? { thumb } : {}) },
    };
  } catch { return undefined; }
}

/** Upload a video to Bluesky's blob store */
async function buildVideoEmbed(
  agent: BskyAgent,
  videoUrl: string,
  storage: StorageAdapter
): Promise<AppBskyEmbedVideo.Main | undefined> {
  try {
    const buffer = await storage.getBuffer(videoUrl);
    const { data } = await agent.uploadBlob(buffer, { encoding: "video/mp4" });
    return { $type: "app.bsky.embed.video", video: data.blob };
  } catch (err) {
    console.error("[bluesky] video upload failed:", err);
    return undefined;
  }
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
    content: { text: string; mediaUrls: string[]; altTexts?: string[] }
  ): Promise<PostResult> {
    const agent = await buildAgent(account);

    const isVideo = (u: string) => /\.(mp4|mov|quicktime)$/i.test(u);
    const videoUrl = content.mediaUrls.find(isVideo);
    const imageUrls = content.mediaUrls.filter(u => !isVideo(u));

    let embed: AppBskyEmbedImages.Main | AppBskyEmbedExternal.Main | AppBskyEmbedVideo.Main | undefined;

    if (storageAdapter && videoUrl) {
      // Video post
      embed = await buildVideoEmbed(agent, videoUrl, storageAdapter);
    } else if (storageAdapter && imageUrls.length > 0) {
      // Image post — pass alt texts through
      embed = await buildImageEmbed(agent, imageUrls, storageAdapter, content.altTexts);
    } else if (imageUrls.length === 0 && !videoUrl) {
      // Text-only — try to build a link card from any URL in the text
      const url = extractUrl(content.text);
      if (url) embed = await buildLinkCard(agent, url);
    }

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
