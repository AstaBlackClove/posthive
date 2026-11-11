// The stages a piece of content goes through, and what each one looks like. One list, read by the
// production pipeline and the content table, so a label or a colour changes in one place. Dot colours are tokens (the two with no palette step are --status-design and
// --status-changes in globals.css); the strings are written out so Tailwind sees every class.

export const CONTENT_STATUS_KEYS = ["brief", "copywriting", "design", "review", "changes", "approved", "scheduled", "published", "failed"] as const;

export type ContentStatusKey = (typeof CONTENT_STATUS_KEYS)[number];

export interface ContentStatus {
  key: ContentStatusKey;
  /** Shown in the production pipeline and the table. */
  label: string;
  /** Background class of the dot. */
  dot: string;
}

export const CONTENT_STATUS: Record<ContentStatusKey, ContentStatus> = {
  brief: { key: "brief", label: "Brief needed", dot: "bg-neutral-200" },
  copywriting: { key: "copywriting", label: "Copywriting", dot: "bg-neutral-500" },
  design: { key: "design", label: "In design", dot: "bg-status-design" },
  review: { key: "review", label: "In review", dot: "bg-brand-600" },
  changes: { key: "changes", label: "Changes requested", dot: "bg-status-changes" },
  approved: { key: "approved", label: "Approved", dot: "bg-green-600" },
  scheduled: { key: "scheduled", label: "Scheduled", dot: "bg-neutral-800" },
  // Blue, not yellow: In review is yellow, and on the calendar the two cards must not look alike
  published: { key: "published", label: "Published", dot: "bg-blue-600" },
  // Not in the design: a post the worker could not publish is real, and showing it as Approved would be wrong
  failed: { key: "failed", label: "Failed", dot: "bg-red-600" },
};

/** Stages of making a piece, in order. The pipeline card counts these. */
export const PRODUCTION_STAGES: readonly ContentStatusKey[] = ["brief", "copywriting", "design", "review", "changes", "approved"];

/** Stages of getting it out (and how it ended when it did not go out). */
export const PUBLICATION_STAGES: readonly ContentStatusKey[] = ["scheduled", "published", "failed"];

export function statusLabel(key: ContentStatusKey): string {
  return CONTENT_STATUS[key].label;
}

/** A count for every stage, all zero: the starting point of a pipeline. */
export function emptyStatusCounts(): Record<ContentStatusKey, number> {
  return Object.fromEntries(CONTENT_STATUS_KEYS.map((k) => [k, 0])) as Record<ContentStatusKey, number>;
}
