import type { Account } from "@prisma/client";
import { decrypt, encrypt } from "../lib/encryption.js";
import type { PlatformAdapter } from "./types.js";
import { prisma } from "../lib/prisma.js";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos";
const API_URL = "https://www.googleapis.com/youtube/v3";

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID!;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET!;

interface YouTubeCredentials {
  accessToken: string;
  refreshToken: string;
  channelId: string;
  expiresAt: string; // ISO — access token expiry, ~1h
}

function getCredentials(account: Account): YouTubeCredentials {
  return JSON.parse(decrypt(account.credentials)) as YouTubeCredentials;
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|quicktime|webm|m4v)(\?|$)/i.test(url);
}

// Title = first line of the post text, description = the rest.
// YouTube titles are capped at 100 chars; truncate safely rather than reject.
function splitTitleDescription(text: string, asShort: boolean): { title: string; description: string } {
  const trimmed = text.trim();
  const newlineIdx = trimmed.indexOf("\n");
  const firstLine = newlineIdx === -1 ? trimmed : trimmed.slice(0, newlineIdx);
  const rest = newlineIdx === -1 ? "" : trimmed.slice(newlineIdx + 1).trim();
  const title = (firstLine || "Untitled").slice(0, 100);

  // YouTube classifies Shorts by the video file itself — vertical (9:16) and ≤60s
  // is the reliable threshold (the 3-min Shorts shelf expansion in 2024 is looser
  // and not guaranteed across all surfaces). #Shorts in the description is only a
  // supplementary signal on top of that — it does nothing for a video that doesn't
  // already qualify by aspect ratio/duration. Only added
  // when the user explicitly chose "Short" (not for regular video uploads).
  let description = rest;
  if (asShort && !/#shorts\b/i.test(description)) {
    description = description ? `${description}\n\n#Shorts` : "#Shorts";
  }

  return { title, description: description.slice(0, 5000) };
}

async function refreshIfNeeded(account: Account): Promise<Account> {
  const creds = getCredentials(account);
  const expiresAt = new Date(creds.expiresAt);
  const fiveMinutes = 5 * 60 * 1000;
  if (expiresAt.getTime() - Date.now() > fiveMinutes) return account;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: creds.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    console.error("[youtube] token refresh failed:", await res.text());
    return account;
  }
  const data = await res.json() as { access_token: string; expires_in: number };
  const newCreds: YouTubeCredentials = {
    ...creds,
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + (data.expires_in - 60) * 1000).toISOString(),
  };
  return prisma.account.update({
    where: { id: account.id },
    data: { credentials: encrypt(JSON.stringify(newCreds)) },
  });
}

export const youtubeAdapter: PlatformAdapter = {
  name: "youtube",

  async refreshTokenIfNeeded(account) {
    return refreshIfNeeded(account);
  },

  async createPost(account, { text, mediaUrls, youtubeType }) {
    const { accessToken } = getCredentials(account);

    const PUBLIC_API_URL = process.env.PUBLIC_API_URL ?? "";
    const absoluteUrls = (mediaUrls ?? []).map((url) =>
      url.startsWith("http") ? url : `${PUBLIC_API_URL}${url}`
    );
    const videoUrl = absoluteUrls.find(isVideoUrl);
    if (!videoUrl) throw new Error("YouTube requires a video file to upload.");

    const asShort = youtubeType !== "video"; // defaults to Short unless explicitly "video"
    const { title, description } = splitTitleDescription(text, asShort);

    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok || !videoRes.body) {
      throw new Error(`Failed to fetch video for upload: ${videoRes.status}`);
    }
    const contentType = videoRes.headers.get("content-type") ?? "video/mp4";
    const contentLengthHeader = videoRes.headers.get("content-length");

    // Stream the bytes straight through to Google instead of buffering the whole
    // file in memory — our own /upload route already caps videos at 100MB, but
    // streaming keeps peak memory flat regardless, and matters more once multiple
    // posts upload concurrently.
    let uploadBody: BodyInit;
    let contentLength: string;
    if (contentLengthHeader) {
      contentLength = contentLengthHeader;
      uploadBody = videoRes.body;
    } else {
      // Storage didn't report a size (e.g. chunked transfer) — fall back to buffering
      // so we can still tell Google the exact length the resumable protocol requires.
      const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
      contentLength = String(videoBuffer.byteLength);
      uploadBody = videoBuffer;
    }

    const metadata = {
      snippet: { title, description },
      status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
    };

    // Step 1 — initiate resumable upload session
    const initRes = await fetch(`${UPLOAD_URL}?uploadType=resumable&part=snippet,status`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": contentType,
        "X-Upload-Content-Length": contentLength,
      },
      body: JSON.stringify(metadata),
    });
    if (!initRes.ok) {
      throw new Error(`YouTube upload init failed: ${initRes.status} ${await initRes.text()}`);
    }
    const uploadSessionUrl = initRes.headers.get("location");
    if (!uploadSessionUrl) throw new Error("YouTube did not return a resumable upload session URL.");

    // Step 2 — upload the video bytes
    const uploadRes = await fetch(uploadSessionUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType, "Content-Length": contentLength },
      body: uploadBody,
      // Required by undici/Node fetch when streaming a ReadableStream as the request body
      ...(uploadBody instanceof ReadableStream ? { duplex: "half" } : {}),
    } as RequestInit);
    if (!uploadRes.ok) {
      throw new Error(`YouTube video upload failed: ${uploadRes.status} ${await uploadRes.text()}`);
    }
    const video = await uploadRes.json() as { id: string };

    return { platformPostId: video.id, replyContext: { videoId: video.id } };
  },

  async createComment(account, replyContext, comment) {
    const { accessToken } = getCredentials(account);
    const { videoId } = replyContext as { videoId: string };

    const res = await fetch(`${API_URL}/commentThreads?part=snippet`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        snippet: {
          videoId,
          topLevelComment: { snippet: { textOriginal: comment } },
        },
      }),
    });
    if (!res.ok) throw new Error(`YouTube comment failed: ${res.status} ${await res.text()}`);
    const data = await res.json() as { id: string };
    return { platformCommentId: data.id };
  },
};
