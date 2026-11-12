import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePlatformContent } from "./platformValidation.js";

const yt = [{ id: "a1", platform: "youtube" }];

test("youtube text-only post is rejected", () => {
  assert.match(validatePlatformContent(yt, { text: "hi", images: [] }) ?? "", /YouTube requires a video/);
});

test("youtube accepts an uploaded video or a pasted URL without extension", () => {
  assert.equal(validatePlatformContent(yt, { text: "", images: ["https://cdn.x/v.mp4"] }), null);
  assert.equal(validatePlatformContent(yt, { text: "", images: [], youtubeVideoUrl: "https://drive.example/share/abc" }), null);
});

test("tiktok needs mp4/mov plus a privacy level", () => {
  const tt = [{ id: "t", platform: "tiktok" }];
  assert.match(validatePlatformContent(tt, { text: "", images: ["https://x/v.webm"], tiktokPrivacyLevel: "PUBLIC" }) ?? "", /TikTok requires a video/);
  assert.match(validatePlatformContent(tt, { text: "", images: ["https://x/v.mp4"] }) ?? "", /privacy/i);
  assert.equal(validatePlatformContent(tt, { text: "", images: ["https://x/v.mp4"], tiktokPrivacyLevel: "PUBLIC" }), null);
});

test("per-account text override satisfies the bluesky caption rule", () => {
  const bs = [{ id: "b", platform: "bluesky" }];
  assert.match(validatePlatformContent(bs, { text: "", images: [] }) ?? "", /Bluesky requires a caption/);
  assert.equal(validatePlatformContent(bs, { text: "", images: [], perAccountText: { b: "hello" } }), null);
});

test("validateStoredContent checks text limits before media", async () => {
  const { validateStoredContent } = await import("./platformValidation.js");
  const bs = [{ id: "b", platform: "bluesky" }];
  assert.match(validateStoredContent(bs, { text: "x".repeat(301) }) ?? "", /bluesky: post text is 301 characters, max 300/);
  assert.match(validateStoredContent(bs, { text: "ok" }, "c".repeat(301)) ?? "", /first comment/);
  assert.equal(validateStoredContent(bs, { text: "ok" }), null);
});
