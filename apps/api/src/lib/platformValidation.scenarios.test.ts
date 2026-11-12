import { test } from "node:test";
import assert from "node:assert/strict";
import { validateStoredContent, type StoredContent } from "./platformValidation.js";

const acct = (platform: string) => [{ id: "a1", platform }];
const IMG = "https://cdn.x/p.jpg";
const VID = "https://cdn.x/v.mp4";

// [platform, content, expected error regex | null]
const cases: [string, StoredContent, RegExp | null][] = [
  ["youtube", { text: "hi", mediaUrls: [] }, /YouTube requires a video/],
  ["youtube", { text: "hi", mediaUrls: [IMG] }, /YouTube requires a video/],
  ["youtube", { text: "hi", mediaUrls: [VID] }, null],
  ["youtube", { text: "hi", youtubeVideoUrl: "https://drive.example/abc" }, null],

  ["tiktok", { text: "hi", mediaUrls: [IMG], tiktokPrivacyLevel: "PUBLIC_TO_EVERYONE" }, /TikTok requires a video/],
  ["tiktok", { text: "hi", mediaUrls: ["https://cdn.x/v.webm"], tiktokPrivacyLevel: "PUBLIC_TO_EVERYONE" }, /TikTok requires a video/],
  ["tiktok", { text: "hi", mediaUrls: [VID] }, /tiktokPrivacyLevel/],
  ["tiktok", { text: "hi", mediaUrls: [VID], tiktokPrivacyLevel: "SELF_ONLY" }, null],

  ["instagram", { text: "hi", mediaUrls: [] }, /Instagram Post requires/],
  ["instagram", { text: "hi", mediaUrls: [IMG] }, null],
  ["instagram", { text: "hi", mediaUrls: [IMG], mediaType: "reel" }, /Instagram Reel requires a video/],
  ["instagram", { text: "hi", mediaUrls: [VID], mediaType: "reel" }, null],
  ["instagram", { text: "", mediaUrls: [], mediaType: "story" }, /Instagram Story requires/],
  ["instagram", { text: "", mediaUrls: [IMG], mediaType: "story" }, null],

  ["pinterest", { text: "hi", mediaUrls: [] }, /Pinterest requires at least one image/],
  ["pinterest", { text: "hi", mediaUrls: [IMG] }, null],
  ["pixelfed", { text: "hi", mediaUrls: [] }, /Pixelfed requires at least one image/],
  ["pixelfed", { text: "hi", mediaUrls: [IMG] }, null],

  ["bluesky", { text: "  ", mediaUrls: [IMG] }, /Bluesky requires a caption/],
  ["bluesky", { text: "x".repeat(301) }, /bluesky: post text is 301 characters, max 300/],
  ["bluesky", { text: "x".repeat(300) }, null],
  ["threads", { text: "", mediaUrls: [IMG] }, /Threads requires a caption/],
  ["threads", { text: "x".repeat(501) }, /threads: post text is 501 characters, max 500/],
  ["threads", { text: "ok" }, null],

  // text-only platforms must not demand media
  ["linkedin", { text: "hi" }, null],
  ["facebook", { text: "hi" }, null],
  ["twitter", { text: "hi" }, null],
  ["mastodon", { text: "hi" }, null],
  ["telegram", { text: "hi" }, null],
  ["discord", { text: "hi" }, null],
];

for (const [platform, content, expected] of cases) {
  test(`${platform}: ${expected ? "rejects " + expected.source : "accepts"} ${JSON.stringify(content).slice(0, 60)}`, () => {
    const err = validateStoredContent(acct(platform), content);
    if (expected) assert.match(err ?? "(no error)", expected);
    else assert.equal(err, null);
  });
}

test("first comment over the limit is rejected", () => {
  assert.match(validateStoredContent(acct("bluesky"), { text: "ok" }, "c".repeat(301)) ?? "", /bluesky: first comment is 301 characters/);
});

test("per-account override text is what gets checked", () => {
  const c: StoredContent = { text: "", perAccount: { a1: { text: "override caption" } } };
  assert.equal(validateStoredContent(acct("bluesky"), c), null);
  assert.match(validateStoredContent(acct("bluesky"), { text: "ok", perAccount: { a1: { text: "x".repeat(301) } } }) ?? "", /max 300/);
});

test("multi-platform post fails on the strictest platform", () => {
  const accounts = [{ id: "a", platform: "linkedin" }, { id: "b", platform: "youtube" }];
  assert.match(validateStoredContent(accounts, { text: "hi" }) ?? "", /YouTube requires a video/);
});

test("X: links blocked in text, bare domains, www, and first comment", () => {
  const x = acct("twitter");
  assert.match(validateStoredContent(x, { text: "read https://posthive.co" }) ?? "", /can't contain links/);
  assert.match(validateStoredContent(x, { text: "go to posthive.co now" }) ?? "", /can't contain links/);
  assert.match(validateStoredContent(x, { text: "visit www.example.com" }) ?? "", /can't contain links/);
  assert.match(validateStoredContent(x, { text: "plain post" }, "link: https://a.b") ?? "", /can't contain links/);
  assert.match(validateStoredContent(x, { text: "ok", perAccount: { a1: { text: "see example.org" } } }) ?? "", /can't contain links/);
  assert.equal(validateStoredContent(x, { text: "no links here, just @handle and #tag" }), null);
});

test("links stay allowed on other platforms", () => {
  assert.equal(validateStoredContent(acct("linkedin"), { text: "read https://posthive.co" }), null);
});

test("text required except YouTube/Pinterest/TikTok and Instagram Story", () => {
  for (const p of ["linkedin", "facebook", "twitter", "mastodon", "telegram", "discord", "tumblr", "lemmy", "nostr"]) {
    assert.match(validateStoredContent(acct(p), { text: "  ", mediaUrls: [IMG] }) ?? "", /Write something/, p);
  }
  assert.match(validateStoredContent(acct("instagram"), { text: "", mediaUrls: [IMG] }) ?? "", /Write something/);
  assert.equal(validateStoredContent(acct("instagram"), { text: "", mediaUrls: [IMG], mediaType: "story" }), null);
  assert.equal(validateStoredContent(acct("youtube"), { text: "", mediaUrls: [VID] }), null);
  assert.equal(validateStoredContent(acct("pinterest"), { text: "", mediaUrls: [IMG] }), null);
  assert.equal(validateStoredContent(acct("tiktok"), { text: "", mediaUrls: [VID], tiktokPrivacyLevel: "SELF_ONLY" }), null);
});

test("YouTube video URL must be a real link; relative upload paths pass", () => {
  const yt = acct("youtube");
  assert.match(validateStoredContent(yt, { text: "", youtubeVideoUrl: "not a url" }) ?? "", /valid link/);
  assert.match(validateStoredContent(yt, { text: "", youtubeVideoUrl: "ftp://x.com/v.mp4" }) ?? "", /valid link/);
  assert.equal(validateStoredContent(yt, { text: "", youtubeVideoUrl: "https://drive.example/abc" }), null);
  assert.equal(validateStoredContent(yt, { text: "", youtubeVideoUrl: "/uploads/v.mp4" }), null);
});
