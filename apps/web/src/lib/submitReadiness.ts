// Required fields before a post can be sent for design approval.
// Mirrored in apps/api/src/lib/submitReadiness.ts; keep both identical.
import { normalizeCategory } from "./contentTypes";

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

export const MISSING_LABEL: Record<MissingField, string> = {
  title: "title",
  date: "date",
  caption: "caption",
  category: "content type",
  accounts: "an account",
  media: "media",
};

/** "Add title, media and an account to send for approval." — null when nothing is missing. */
export function missingMessage(missing: MissingField[]): string | null {
  if (missing.length === 0) return null;
  const labels = missing.map((m) => MISSING_LABEL[m]);
  const list = labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
  return `Add ${list} to send for approval.`;
}
