import { blueskyAdapter } from "./bluesky.js";
import { linkedinAdapter } from "./linkedin.js";
import { threadsAdapter } from "./threads.js";
import { instagramAdapter } from "./instagram.js";
import { mastodonAdapter } from "./mastodon.js";
import { pixelfedAdapter } from "./pixelfed.js";
import { youtubeAdapter } from "./youtube.js";
import { facebookAdapter } from "./facebook.js";
import { twitterAdapter } from "./twitter.js";
import { pinterestAdapter } from "./pinterest.js";
import { telegramAdapter } from "./telegram.js";
import { nostrAdapter } from "./nostr.js";
import { discordAdapter } from "./discord.js";
import { tumblrAdapter } from "./tumblr.js";
import { lemmyAdapter } from "./lemmy.js";
import type { PlatformAdapter } from "./types.js";

export const adapters: PlatformAdapter[] = [
  blueskyAdapter,
  threadsAdapter,
  linkedinAdapter,
  instagramAdapter,
  mastodonAdapter,
  pixelfedAdapter,
  youtubeAdapter,
  facebookAdapter,
  twitterAdapter,
  pinterestAdapter,
  telegramAdapter,
  nostrAdapter,
  discordAdapter,
  tumblrAdapter,
  lemmyAdapter,
];

/** Look up an adapter by platform name. Throws if not found. */
export function getAdapter(platform: string): PlatformAdapter {
  const adapter = adapters.find((a) => a.name === platform);
  if (!adapter) throw new Error(`No adapter registered for platform: ${platform}`);
  return adapter;
}
