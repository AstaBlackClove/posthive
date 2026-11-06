/** Display name of a platform id: "linkedin" → "LinkedIn", "twitter" → "X". One list instead of four. */
const NAMES: Record<string, string> = {
  bluesky: "Bluesky",
  threads: "Threads",
  linkedin: "LinkedIn",
  mastodon: "Mastodon",
  pixelfed: "Pixelfed",
  youtube: "YouTube",
  facebook: "Facebook",
  pinterest: "Pinterest",
  telegram: "Telegram",
  nostr: "Nostr",
  twitter: "X",
  instagram: "Instagram",
  tumblr: "Tumblr",
  lemmy: "Lemmy",
  googlebusiness: "Google Business",
  tiktok: "TikTok",
  discord: "Discord",
  website: "Website",
};

export function platformLabel(platform: string): string {
  return NAMES[platform] ?? platform.charAt(0).toUpperCase() + platform.slice(1);
}
