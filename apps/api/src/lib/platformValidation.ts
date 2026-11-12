const VIDEO_URL_RE = /\.(mp4|mov|quicktime|webm|m4v)(\?|#|$)/i;
// TikTok's adapter only accepts these containers
const TIKTOK_VIDEO_RE = /\.(mp4|mov|quicktime)(\?|#|$)/i;

export interface PlatformContentInput {
  text: string;
  images: string[];
  mediaType?: string;
  tiktokPrivacyLevel?: string;
  youtubeVideoUrl?: string;
  perAccountText?: Record<string, string | undefined>;
}

// Server-side mirror of the compose page's validate(): a post that would fail at
// publish time (possibly days later) is rejected when it's scheduled instead.
export function validatePlatformContent(
  accounts: { id: string; platform: string }[],
  opts: PlatformContentInput,
): string | null {
  const hasMedia = opts.images.length > 0;
  const hasVideo = opts.images.some((u) => VIDEO_URL_RE.test(u));
  const hasTikTokVideo = opts.images.some((u) => TIKTOK_VIDEO_RE.test(u));
  const textFor = (id: string) => (opts.perAccountText?.[id] ?? opts.text).trim();

  for (const a of accounts) {
    if (a.platform === "instagram") {
      if (opts.mediaType === "story" && !hasMedia) return "Instagram Story requires an image or video.";
      if (opts.mediaType === "reel" && !hasVideo) return "Instagram Reel requires a video.";
      if ((opts.mediaType ?? "post") === "post" && !hasMedia) return "Instagram Post requires at least one image or video.";
    }
    if (a.platform === "bluesky" && !textFor(a.id)) return "Bluesky requires a caption.";
    if (a.platform === "threads" && !textFor(a.id)) return "Threads requires a caption.";
    if (a.platform === "tiktok") {
      if (!hasTikTokVideo) return "TikTok requires a video — attach an mp4 or mov file.";
      if (!opts.tiktokPrivacyLevel) return "TikTok requires tiktokPrivacyLevel to be set before posting.";
    }
    if (a.platform === "youtube" && !hasVideo && !opts.youtubeVideoUrl) return "YouTube requires a video attached.";
    if (a.platform === "pinterest" && !hasMedia) return "Pinterest requires at least one image.";
    if (a.platform === "pixelfed" && !hasMedia) return "Pixelfed requires at least one image.";
  }
  return null;
}
