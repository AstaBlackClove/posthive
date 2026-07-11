/**
 * Discord adapter — Discord Bot API v10
 *
 * Auth: OAuth 2.0 (bot + identify scopes) to add bot to a guild,
 *       then bot token (DISCORD_BOT_TOKEN env) for all API calls.
 *
 * Posting: POST /channels/{channelId}/messages
 *   - Text-only → JSON body { content }
 *   - With media → multipart/form-data with files[]
 *   - First comment → reply via message_reference
 */

import type { Account } from "@prisma/client";
import { decrypt, encrypt } from "../lib/encryption.js";
import type { StorageAdapter } from "../lib/storage.js";
import type { CommentResult, PlatformAdapter, PostResult } from "./types.js";

const DISCORD_API = "https://discord.com/api/v10";

export interface DiscordCredentials {
  guildId: string;
  guildName: string;
  channelId: string;
  channelName: string;
  webhookId?: string;
  webhookToken?: string;
}

function getCreds(account: Account): DiscordCredentials {
  return JSON.parse(decrypt(account.credentials)) as DiscordCredentials;
}

function getBotToken(): string {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error("DISCORD_BOT_TOKEN not configured");
  return token;
}

let storageAdapter: StorageAdapter | null = null;
export function setDiscordStorage(s: StorageAdapter): void {
  storageAdapter = s;
}

/** Fetch text channels for a guild the bot has access to. */
export async function getDiscordChannels(guildId: string): Promise<{ id: string; name: string }[]> {
  const token = getBotToken();
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Failed to fetch Discord channels: ${await res.text()}`);
  const channels = await res.json() as { id: string; name: string; type: number }[];
  // type 0 = GUILD_TEXT, type 5 = GUILD_ANNOUNCEMENT
  return channels
    .filter(c => c.type === 0 || c.type === 5)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(c => ({ id: c.id, name: c.name }));
}

export function encryptDiscordCredentials(creds: DiscordCredentials): string {
  return encrypt(JSON.stringify(creds));
}

export const discordAdapter: PlatformAdapter = {
  name: "discord",

  async refreshTokenIfNeeded(account: Account): Promise<Account> {
    return account; // bot tokens don't expire
  },

  async createPost(
    account: Account,
    content: { text: string; mediaUrls: string[]; altTexts?: string[] }
  ): Promise<PostResult> {
    const creds = getCreds(account);
    const { channelId, webhookId, webhookToken } = creds;

    // Use webhook if available (no "APP" badge) — fall back to bot token
    const useWebhook = !!(webhookId && webhookToken);
    const endpoint = useWebhook
      ? `${DISCORD_API}/webhooks/${webhookId}/${webhookToken}?wait=true`
      : `${DISCORD_API}/channels/${channelId}/messages`;
    const authHeader = useWebhook ? undefined : `Bot ${getBotToken()}`;

    const isVideo = (u: string) => /\.(mp4|mov|quicktime)$/i.test(u);
    const imageUrls = content.mediaUrls.filter(u => !isVideo(u));
    const videoUrl = content.mediaUrls.find(isVideo);
    const mediaUrls = videoUrl ? [videoUrl] : imageUrls.slice(0, 10);

    const payload = { content: content.text || undefined, username: "Posthive" };
    let result: { id: string };

    if (mediaUrls.length > 0 && storageAdapter) {
      const form = new FormData();
      form.append("payload_json", JSON.stringify(payload));
      for (let i = 0; i < mediaUrls.length; i++) {
        const buffer = await storageAdapter.getBuffer(mediaUrls[i]);
        const ext = mediaUrls[i].split(".").pop()?.toLowerCase() ?? "jpg";
        const mime = videoUrl
          ? "video/mp4"
          : ext === "png" ? "image/png"
          : ext === "gif" ? "image/gif"
          : ext === "webp" ? "image/webp"
          : "image/jpeg";
        const filename = videoUrl ? "video.mp4" : `image${i}.${ext}`;
        form.append(`files[${i}]`, new Blob([buffer.buffer as ArrayBuffer], { type: mime }), filename);
      }
      const headers: Record<string, string> = {};
      if (authHeader) headers["Authorization"] = authHeader;
      const res = await fetch(endpoint, { method: "POST", headers, body: form, signal: AbortSignal.timeout(60_000) });
      if (!res.ok) throw new Error(`Discord post failed: ${await res.text()}`);
      result = await res.json() as { id: string };
    } else {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authHeader) headers["Authorization"] = authHeader;
      const res = await fetch(endpoint, {
        method: "POST", headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`Discord post failed: ${await res.text()}`);
      result = await res.json() as { id: string };
    }

    return {
      platformPostId: result.id,
      replyContext: { messageId: result.id, channelId, webhookId, webhookToken },
    };
  },

  async createComment(
    account: Account,
    replyContext: unknown,
    comment: string
  ): Promise<CommentResult> {
    const ctx = replyContext as { messageId: string; channelId: string; webhookId?: string; webhookToken?: string };
    // Comments always use bot token — webhooks can't reply with message_reference
    const token = getBotToken();
    const res = await fetch(`${DISCORD_API}/channels/${ctx.channelId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        content: comment,
        message_reference: { message_id: ctx.messageId },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Discord comment failed: ${await res.text()}`);
    const data = await res.json() as { id: string };
    return { platformCommentId: data.id };
  },
};
