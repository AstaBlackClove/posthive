// Required fields before a post can be sent for design approval.
// Mirrored in apps/web/src/lib/submitReadiness.ts; keep both identical.
import { normalizeCategory } from "./contentTypes.js";

export type MissingField = "title" | "date" | "caption" | "category" | "accounts" | "media";

/** Platforms whose posts carry their own title/description instead of a caption. */
const NO_CAPTION_PLATFORMS = new Set(["youtube", "pinterest"]);

interface Content {
  title?: unknown;
  text?: unknown;
  mediaUrls?: unknown;
  youtubeVideoUrl?: unknown;
  category?: unknown;
}

const filled = (v: unknown): boolean => typeof v === "string" && v.trim().length > 0;

/** Fields still empty, in form order. Empty list = ready to send. */
export function missingForReview(input: {
  scheduledFor: Date | string | null;
  content: string;
  targetPlatforms: string[];
}): MissingField[] {
  let content: Content = {};
  try {
    content = JSON.parse(input.content) as Content;
  } catch { /* broken JSON counts as empty */ }

  const missing: MissingField[] = [];
  if (!filled(content.title)) missing.push("title");
  if (!input.scheduledFor) missing.push("date");

  const platforms = input.targetPlatforms;
  const captionOptional = platforms.length > 0 && platforms.every((p) => NO_CAPTION_PLATFORMS.has(p));
  if (!filled(content.text) && !captionOptional) missing.push("caption");

  // Pillar is derived from the category, so the category alone decides
  if (!normalizeCategory(content.category)) missing.push("category");
  if (platforms.length === 0) missing.push("accounts");

  const hasMedia = (Array.isArray(content.mediaUrls) && content.mediaUrls.length > 0) || filled(content.youtubeVideoUrl);
  if (!hasMedia) missing.push("media");
  return missing;
}
