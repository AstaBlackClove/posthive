import { blueskyAdapter } from "./bluesky.js";
import { linkedinAdapter } from "./linkedin.js";
import { threadsAdapter } from "./threads.js";
import { instagramAdapter } from "./instagram.js";
import { mastodonAdapter } from "./mastodon.js";
import { youtubeAdapter } from "./youtube.js";
import { facebookAdapter } from "./facebook.js";
import { twitterAdapter } from "./twitter.js";
import { pinterestAdapter } from "./pinterest.js";
import type { PlatformAdapter } from "./types.js";

const adapters: PlatformAdapter[] = [
  blueskyAdapter,
  threadsAdapter,
  linkedinAdapter,
  instagramAdapter,
  mastodonAdapter,
  youtubeAdapter,
  facebookAdapter,
  twitterAdapter,
  pinterestAdapter,
];

/** Look up an adapter by platform name. Throws if not found. */
export function getAdapter(platform: string): PlatformAdapter {
  const adapter = adapters.find((a) => a.name === platform);
  if (!adapter) throw new Error(`No adapter registered for platform: ${platform}`);
  return adapter;
}
