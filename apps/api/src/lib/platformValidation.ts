import { checkTextLimits, formatTextLimitError } from "./platformLimits.js";

const VIDEO_URL_RE = /\.(mp4|mov|quicktime|webm|m4v)(\?|#|$)/i;
// TikTok's adapter only accepts these containers
const TIKTOK_VIDEO_RE = /\.(mp4|mov|quicktime)(\?|#|$)/i;
// Same pattern the compose page uses to block links on X: full URLs, www. hosts and bare domains
const LINK_RE = /https?:\/\/\S+|(?<![/@\w])(?:www\.)\S+|(?<![/@\w])\b[\w-]+(?:\.[\w-]+)*\.[a-z]{2,6}\b(?:[/?#]\S*)?/i;
// These platforms take their own title/description fields, so the main post text may be empty
const TEXT_OPTIONAL = new Set(["youtube", "pinterest", "tiktok"]);

export interface PlatformContentInput {
  text: string;
  images: string[];
  mediaType?: string;
  tiktokPrivacyLevel?: string;
  youtubeVideoUrl?: string;
  perAccountText?: Record<string, string | undefined>;
  commentText?: string | null;
  perAccountComment?: Record<string, string | undefined>;
}

// Server-side mirror of the compose page's validateBeforeSubmit(): a post that would fail
// at publish time (possibly days later) is rejected when it's scheduled instead.
export function validatePlatformContent(
  accounts: { id: string; platform: string }[],
  opts: PlatformContentInput,
): string | null {
  const hasMedia = opts.images.length > 0;
  const hasVideo = opts.images.some((u) => VIDEO_URL_RE.test(u));
  const hasTikTokVideo = opts.images.some((u) => TIKTOK_VIDEO_RE.test(u));
  const textFor = (id: string) => (opts.perAccountText?.[id] ?? opts.text).trim();
  const commentFor = (id: string) => (opts.perAccountComment?.[id] ?? opts.commentText ?? "").trim();

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
    if (a.platform === "youtube") {
      if (!hasVideo && !opts.youtubeVideoUrl) return "YouTube requires a video attached.";
      if (opts.youtubeVideoUrl && !opts.youtubeVideoUrl.startsWith("/")) {
        let proto = "";
        try { proto = new URL(opts.youtubeVideoUrl).protocol; } catch { /* invalid */ }
        if (proto !== "https:" && proto !== "http:") return "YouTube video URL must be a valid link starting with https://.";
      }
    }
    if (a.platform === "pinterest" && !hasMedia) return "Pinterest requires at least one image.";
    if (a.platform === "pixelfed" && !hasMedia) return "Pixelfed requires at least one image.";
    if (a.platform === "twitter" && (LINK_RE.test(textFor(a.id)) || LINK_RE.test(commentFor(a.id)))) {
      return "X (Twitter) posts and first comments can't contain links. Remove the link or deselect X.";
    }
    const storyOnly = a.platform === "instagram" && opts.mediaType === "story";
    if (!TEXT_OPTIONAL.has(a.platform) && !storyOnly && !textFor(a.id)) return "Write something before scheduling.";
  }
  return null;
}

export type StoredContent = {
  text?: string;
  mediaUrls?: string[];
  mediaType?: string;
  youtubeVideoUrl?: string;
  tiktokPrivacyLevel?: string;
  perAccount?: Record<string, { text?: string; commentText?: string } | undefined>;
};

// Full publishability check for a post as stored in PostJob.content: per-platform text
// limits first, then required media/fields. Returns a user-facing error or null.
export function validateStoredContent(
  accounts: { id: string; platform: string }[],
  c: StoredContent,
  commentText?: string | null,
): string | null {
  const violations = checkTextLimits(accounts.map((a) => ({
    platform: a.platform,
    text: c.perAccount?.[a.id]?.text ?? c.text ?? "",
    commentText: c.perAccount?.[a.id]?.commentText ?? commentText,
  })));
  if (violations.length) return formatTextLimitError(violations);
  const entries = Object.entries(c.perAccount ?? {});
  return validatePlatformContent(accounts, {
    text: c.text ?? "",
    images: c.mediaUrls ?? [],
    mediaType: c.mediaType,
    youtubeVideoUrl: c.youtubeVideoUrl,
    tiktokPrivacyLevel: c.tiktokPrivacyLevel,
    perAccountText: Object.fromEntries(entries.map(([k, v]) => [k, v?.text])),
    commentText,
    perAccountComment: Object.fromEntries(entries.map(([k, v]) => [k, v?.commentText])),
  });
}
