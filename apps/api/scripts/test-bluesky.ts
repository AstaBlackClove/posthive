/**
 * One-shot test script for the Bluesky adapter (Step 2).
 *
 * Usage:
 *   1. Copy .env.example to .env and fill in ENCRYPTION_KEY.
 *   2. Set BLUESKY_HANDLE and BLUESKY_APP_PASSWORD in your environment or .env.
 *   3. Run: pnpm --filter api tsx scripts/test-bluesky.ts
 *
 * This will:
 *   - Authenticate against Bluesky using your handle + app-password
 *   - Post a test post to your timeline
 *   - Immediately reply to it with a test comment
 *   - Print the AT-URIs of both
 *
 * Safe to run — the post and comment will be live on your account.
 * Delete them manually from Bluesky afterwards if you don't want them.
 */

import "dotenv/config";
import { blueskyAdapter } from "../src/adapters/bluesky.js";
import { encrypt } from "../src/lib/encryption.js";
import type { Account } from "@prisma/client";

const handle = process.env.BLUESKY_HANDLE;
const appPassword = process.env.BLUESKY_APP_PASSWORD;

if (!handle || !appPassword) {
  console.error("Set BLUESKY_HANDLE and BLUESKY_APP_PASSWORD in your .env");
  process.exit(1);
}

// Build a fake Account row — we don't need a real DB row for this test
const fakeAccount: Account = {
  id: "test",
  platform: "bluesky",
  displayName: handle,
  credentials: encrypt(JSON.stringify({ handle, appPassword })),
  refreshToken: null,
  expiresAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

console.log("Authenticating with Bluesky...");
const account = await blueskyAdapter.refreshTokenIfNeeded(fakeAccount);

console.log("Creating post...");
const postResult = await blueskyAdapter.createPost(account, {
  text: `[social-scheduler test] Post created at ${new Date().toISOString()}`,
  mediaUrls: [],
});
console.log("Post created:", postResult.platformPostId);

console.log("Creating reply comment...");
const commentResult = await blueskyAdapter.createComment(
  account,
  postResult.replyContext,
  `[social-scheduler test] First comment created at ${new Date().toISOString()}`
);
console.log("Comment created:", commentResult.platformCommentId);

console.log("\nAll done! Both the post and reply are live on your Bluesky account.");
console.log("Delete them manually if you don't want them to stay.");
