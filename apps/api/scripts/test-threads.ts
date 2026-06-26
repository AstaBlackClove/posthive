/**
 * Quick test for the Threads adapter using a pre-generated token.
 * Run with: pnpm exec tsx scripts/test-threads.ts
 */

import "dotenv/config";
import { encrypt } from "../src/lib/encryption.js";
import { threadsAdapter } from "../src/adapters/threads.js";
import type { Account } from "@prisma/client";

const token = process.env.THREADS_TEST_TOKEN;
if (!token) throw new Error("THREADS_TEST_TOKEN not set in .env");

// We need the Threads user ID too — fetch it from the token
const profileRes = await fetch(
  `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${token}`
);
const profile = await profileRes.json() as { id: string; username: string };
console.log("Threads profile:", profile);

// Build a fake Account record the adapter can use
const fakeAccount: Account = {
  id: "test",
  platform: "threads",
  displayName: profile.username,
  credentials: encrypt(JSON.stringify({ accessToken: token, userId: profile.id })),
  refreshToken: null,
  expiresAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

console.log("\n--- Testing createPost ---");
const postResult = await threadsAdapter.createPost(fakeAccount, {
  text: "Testing social-scheduler Threads adapter 🧵 (ignore this post)",
  mediaUrls: [],
});
console.log("Post result:", postResult);

console.log("\n--- Testing createComment ---");
const commentResult = await threadsAdapter.createComment(
  fakeAccount,
  postResult.replyContext,
  "And this is the first comment posted automatically!"
);
console.log("Comment result:", commentResult);

console.log("\n✅ All done!");
