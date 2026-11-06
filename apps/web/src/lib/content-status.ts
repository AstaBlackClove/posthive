// The stages a piece of content goes through, and what each one looks like. One list, read by the
// production pipeline, the calendar legend and the content table, so a label or a colour changes
// in one place. Dot colours are tokens (the two with no palette step are --status-design and
// --status-changes in globals.css); the strings are written out so Tailwind sees every class.

export const CONTENT_STATUS_KEYS = ["brief", "copywriting", "design", "review", "changes", "approved", "scheduled", "published"] as const;

export type ContentStatusKey = (typeof CONTENT_STATUS_KEYS)[number];

export interface ContentStatus {
  key: ContentStatusKey;
  /** Shown in the production pipeline and the table. */
  label: string;
  /** Shown in the calendar legend when it reads differently ("Draft", "Rejected"). */
  calendarLabel?: string;
  /** Background class of the dot. */
  dot: string;
}

export const CONTENT_STATUS: Record<ContentStatusKey, ContentStatus> = {
  brief: { key: "brief", label: "Brief needed", calendarLabel: "Draft", dot: "bg-neutral-200" },
  copywriting: { key: "copywriting", label: "Copywriting", dot: "bg-neutral-500" },
  design: { key: "design", label: "In design", dot: "bg-status-design" },
  review: { key: "review", label: "In review", dot: "bg-brand-600" },
  changes: { key: "changes", label: "Changes requested", calendarLabel: "Rejected", dot: "bg-status-changes" },
  approved: { key: "approved", label: "Approved", dot: "bg-green-600" },
  scheduled: { key: "scheduled", label: "Scheduled", dot: "bg-neutral-800" },
  published: { key: "published", label: "Published", dot: "bg-brand-500" },
};

/** Stages of making a piece, in order. The pipeline card counts these. */
export const PRODUCTION_STAGES: readonly ContentStatusKey[] = ["brief", "copywriting", "design", "review", "changes", "approved"];

/** Stages of getting it out. */
export const PUBLICATION_STAGES: readonly ContentStatusKey[] = ["scheduled", "published"];

/** Everything the calendar legend lists, in the design's order. */
export const CALENDAR_LEGEND: readonly ContentStatusKey[] = CONTENT_STATUS_KEYS;

export type StatusContext = "pipeline" | "calendar";

export function statusLabel(key: ContentStatusKey, context: StatusContext = "pipeline"): string {
  const s = CONTENT_STATUS[key];
  return context === "calendar" ? (s.calendarLabel ?? s.label) : s.label;
}

/** A count for every stage, all zero: the starting point of a pipeline. */
export function emptyStatusCounts(): Record<ContentStatusKey, number> {
  return Object.fromEntries(CONTENT_STATUS_KEYS.map((k) => [k, 0])) as Record<ContentStatusKey, number>;
}
