// Per-platform text character limits — mirrors apps/web/src/components/PlatformPreview.tsx's
// PLATFORM_LIMIT. Kept in sync manually since web and api are separate apps.
export const PLATFORM_LIMIT: Record<string, number> = {
  bluesky: 300,
  threads: 500,
  linkedin: 3000,
  mastodon: 500,
  pixelfed: 2001,
  youtube: 5000,
  facebook: 63206,
  twitter: 25000,
  pinterest: 500,
  telegram: 4096,
  nostr: 10000,
  discord: 2000,
  tumblr: 4096,
  lemmy: 10000,
  googlebusiness: 1500,
  tiktok: 2200,
  instagram: 2200,
};

export function countGraphemes(text: string): number {
  try { return [...new Intl.Segmenter().segment(text)].length; }
  catch { return text.length; }
}

export interface TextLimitViolation {
  platform: string;
  field: "text" | "commentText";
  length: number;
  limit: number;
}

/**
 * Checks each target's effective post text and first-comment text against
 * its platform's character limit. Call with the already-resolved per-account
 * text (override ?? global text), not the raw request body.
 */
export function checkTextLimits(
  targets: { platform: string; text: string; commentText?: string | null }[]
): TextLimitViolation[] {
  const violations: TextLimitViolation[] = [];
  for (const t of targets) {
    const limit = PLATFORM_LIMIT[t.platform];
    if (!limit) continue;
    const textLen = countGraphemes(t.text);
    if (textLen > limit) violations.push({ platform: t.platform, field: "text", length: textLen, limit });
    if (t.commentText) {
      const commentLen = countGraphemes(t.commentText);
      if (commentLen > limit) violations.push({ platform: t.platform, field: "commentText", length: commentLen, limit });
    }
  }
  return violations;
}

export function formatTextLimitError(violations: TextLimitViolation[]): string {
  return violations
    .map((v) => `${v.platform}: ${v.field === "commentText" ? "first comment" : "post text"} is ${v.length} characters, max ${v.limit}`)
    .join("; ");
}
