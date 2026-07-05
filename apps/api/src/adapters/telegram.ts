import type { Account } from "@prisma/client";
import { decrypt, encrypt } from "../lib/encryption.js";
import type { CommentResult, PlatformAdapter, PostResult } from "./types.js";
import type { StorageAdapter } from "../lib/storage.js";

interface TelegramCredentials {
  botToken: string;
  chatId: string; // channel username e.g. "@mychannel" or numeric chat ID
}

const TELEGRAM_API = "https://api.telegram.org";

function getCreds(account: Account): TelegramCredentials {
  return JSON.parse(decrypt(account.credentials)) as TelegramCredentials;
}

async function tgCall(botToken: string, method: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const json = await res.json() as { ok: boolean; result: unknown; description?: string };
  if (!json.ok) throw new Error(`Telegram ${method} failed: ${json.description ?? "unknown error"}`);
  return json.result;
}

let storageAdapter: StorageAdapter | null = null;
export function setTelegramStorage(s: StorageAdapter): void {
  storageAdapter = s;
}

export const telegramAdapter: PlatformAdapter = {
  name: "telegram",

  async refreshTokenIfNeeded(account: Account): Promise<Account> {
    return account; // bot tokens don't expire
  },

  async createPost(
    account: Account,
    content: { text: string; mediaUrls: string[]; altTexts?: string[] }
  ): Promise<PostResult> {
    const { botToken, chatId } = getCreds(account);

    const isVideo = (u: string) => /\.(mp4|mov|quicktime)$/i.test(u);
    const imageUrls = content.mediaUrls.filter(u => !isVideo(u));
    const videoUrl = content.mediaUrls.find(isVideo);

    let result: { message_id: number };

    if (videoUrl && storageAdapter) {
      // Send video
      const buffer = await storageAdapter.getBuffer(videoUrl);
      const form = new FormData();
      form.append("chat_id", chatId);
      form.append("caption", content.text);
      form.append("parse_mode", "HTML");
      form.append("video", new Blob([Buffer.from(buffer).buffer as ArrayBuffer], { type: "video/mp4" }), "video.mp4");
      const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendVideo`, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(60_000),
      });
      const json = await res.json() as { ok: boolean; result: { message_id: number }; description?: string };
      if (!json.ok) throw new Error(`Telegram sendVideo failed: ${json.description ?? "unknown error"}`);
      result = json.result;
    } else if (imageUrls.length === 1 && storageAdapter) {
      // Single image
      const buffer = await storageAdapter.getBuffer(imageUrls[0]);
      const form = new FormData();
      form.append("chat_id", chatId);
      form.append("caption", content.text);
      form.append("parse_mode", "HTML");
      form.append("photo", new Blob([Buffer.from(buffer).buffer as ArrayBuffer], { type: "image/jpeg" }), "photo.jpg");
      const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendPhoto`, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(30_000),
      });
      const json = await res.json() as { ok: boolean; result: { message_id: number }; description?: string };
      if (!json.ok) throw new Error(`Telegram sendPhoto failed: ${json.description ?? "unknown error"}`);
      result = json.result;
    } else if (imageUrls.length > 1 && storageAdapter) {
      // Media group (up to 10 images)
      const media = await Promise.all(
        imageUrls.slice(0, 10).map(async (url, i) => {
          const buffer = await storageAdapter!.getBuffer(url);
          const form = new FormData();
          const key = `photo${i}`;
          form.append(key, new Blob([Buffer.from(buffer).buffer as ArrayBuffer], { type: "image/jpeg" }), `photo${i}.jpg`);
          return { type: "photo", media: `attach://${key}`, ...(i === 0 ? { caption: content.text, parse_mode: "HTML" } : {}) };
        })
      );
      result = await tgCall(botToken, "sendMediaGroup", { chat_id: chatId, media }) as { message_id: number };
    } else {
      // Text only
      result = await tgCall(botToken, "sendMessage", {
        chat_id: chatId,
        text: content.text,
        parse_mode: "HTML",
      }) as { message_id: number };
    }

    return { platformPostId: String(result.message_id), replyContext: { messageId: result.message_id, chatId } };
  },

  async createComment(
    account: Account,
    replyContext: unknown,
    comment: string
  ): Promise<CommentResult> {
    const { botToken } = getCreds(account);
    const ctx = replyContext as { messageId: number; chatId: string };
    const result = await tgCall(botToken, "sendMessage", {
      chat_id: ctx.chatId,
      text: comment,
      reply_to_message_id: ctx.messageId,
      parse_mode: "HTML",
    }) as { message_id: number };
    return { platformCommentId: String(result.message_id) };
  },
};

export async function encryptTelegramCredentials(
  botToken: string,
  chatId: string
): Promise<{ credentials: string; displayName: string; avatarUrl: string | null }> {
  // Validate by calling getMe and getChat
  const meRes = await fetch(`${TELEGRAM_API}/bot${botToken}/getMe`, { signal: AbortSignal.timeout(10_000) });
  const me = await meRes.json() as { ok: boolean; result?: { username?: string; first_name: string }; description?: string };
  if (!me.ok) throw new Error(`Invalid bot token: ${me.description ?? "check your bot token"}`);

  const chatRes = await fetch(`${TELEGRAM_API}/bot${botToken}/getChat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId }),
    signal: AbortSignal.timeout(10_000),
  });
  const chat = await chatRes.json() as { ok: boolean; result?: { title?: string; username?: string; photo?: { small_file_id: string } }; description?: string };
  if (!chat.ok) throw new Error(`Cannot access channel: ${chat.description ?? "make sure the bot is added as an admin"}`);

  const channelName = chat.result?.title ?? chat.result?.username ?? chatId;
  const credentials = encrypt(JSON.stringify({ botToken, chatId }));

  // Fetch channel photo if available
  let avatarUrl: string | null = null;
  const smallFileId = chat.result?.photo?.small_file_id;
  if (smallFileId) {
    try {
      const fileRes = await fetch(`${TELEGRAM_API}/bot${botToken}/getFile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: smallFileId }),
        signal: AbortSignal.timeout(10_000),
      });
      const file = await fileRes.json() as { ok: boolean; result?: { file_path?: string } };
      if (file.ok && file.result?.file_path) {
        avatarUrl = `${TELEGRAM_API}/file/bot${botToken}/${file.result.file_path}`;
      }
    } catch { /* avatar is optional — ignore */ }
  }

  return { credentials, displayName: channelName, avatarUrl };
}
