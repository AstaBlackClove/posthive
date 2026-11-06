// What each status looks like, in one place: the label, the tone (lib/tone.ts) and a dot colour.
// Replaces the copies in jobs (STATUS_CONFIG), CalendarView (STATUS_CLASS), library (STATUS_COLORS)
// and billing (StatusBadge). The statuses themselves come from the API.

import type { Tone } from "./tone";

export interface StatusView {
  label: string;
  tone: Tone;
  /** Dot colour. Full class names, so Tailwind can see them. */
  dot: string;
  /** Pulse the dot: something is happening or needs attention now. */
  pulse?: boolean;
  /** Left border colour of a calendar event. */
  bar?: string;
}

/** PostJob.status. Unknown values fall back to a neutral badge with the raw text. */
export const POST_STATUS: Record<string, StatusView> = {
  draft: { label: "Draft", tone: "neutral", dot: "bg-neutral-500", bar: "border-l-neutral-500" },
  pending: { label: "Scheduled", tone: "warning", dot: "bg-accent", bar: "border-l-accent" },
  running: { label: "Posting…", tone: "info", dot: "bg-blue-500", pulse: true, bar: "border-l-blue-500" },
  done: { label: "Published", tone: "success", dot: "bg-green-500", bar: "border-l-green-500" },
  failed: { label: "Failed", tone: "danger", dot: "bg-red-500", bar: "border-l-red-500" },
  post_done: { label: "Posted", tone: "info", dot: "bg-blue-400", bar: "border-l-blue-400" },
  comment_done: { label: "Done", tone: "success", dot: "bg-green-500", bar: "border-l-green-500" },
  post_failed: { label: "Post failed", tone: "danger", dot: "bg-red-500", bar: "border-l-red-500" },
  comment_failed: { label: "Reply failed", tone: "warning", dot: "bg-red-400", bar: "border-l-red-400" },
};

/** Status of one item in a library (the drip queue). */
export const ITEM_STATUS: Record<string, StatusView> = {
  queued: { label: "Queued", tone: "brand", dot: "bg-brand-700" },
  scheduled: { label: "Scheduled", tone: "info", dot: "bg-blue-500" },
  published: { label: "Published", tone: "success", dot: "bg-green-500" },
  skipped: { label: "Skipped", tone: "neutral", dot: "bg-neutral-400" },
  failed: { label: "Failed", tone: "danger", dot: "bg-red-500" },
};

export function statusView(table: Record<string, StatusView>, status: string): StatusView {
  return table[status] ?? { label: status, tone: "neutral", dot: "bg-neutral-500" };
}

/** Design-approval state of a draft: shown under the approval flow. null = not under review. */
export function approvalView(approvalStatus: string | null | undefined): StatusView | null {
  switch (approvalStatus) {
    case "pending":
      return { label: "In review", tone: "brand", dot: "bg-brand-700" };
    case "rejected":
      return { label: "Rejected", tone: "danger", dot: "bg-red-500" };
    case "approved":
      return { label: "Approved", tone: "success", dot: "bg-green-500" };
    default:
      return null;
  }
}

/** Workspace plan state (billing). null for a status we do not know. */
export function planStatusView(
  status: string,
  { trialDaysLeft = 0, trialEndsAt = null, now = new Date() }: { trialDaysLeft?: number; trialEndsAt?: string | null; now?: Date } = {}
): StatusView | null {
  switch (status) {
    case "active":
      return { label: "Active", tone: "success", dot: "bg-green-500", pulse: true };
    case "trialing": {
      if (trialEndsAt && new Date(trialEndsAt) < now) {
        return { label: "Trial ended", tone: "danger", dot: "bg-red-500", pulse: true };
      }
      if (trialDaysLeft <= 3) {
        return {
          label: trialDaysLeft === 0 ? "Trial ends today" : `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left`,
          tone: "warning",
          dot: "bg-brand-700",
          pulse: true,
        };
      }
      return { label: `${trialDaysLeft} days left`, tone: "plain", dot: "bg-accent" };
    }
    case "on_hold":
      return { label: "Payment failed", tone: "danger", dot: "bg-red-500", pulse: true };
    case "cancelling":
      return { label: "Cancels at period end", tone: "warning", dot: "bg-brand-700" };
    case "cancelled":
      return { label: "Cancelled", tone: "neutral", dot: "" };
    default:
      return null;
  }
}

/** Workspace role → tone. Owner and admin look the same, a designer is green, a member is plain. */
export function roleTone(role: string): Tone {
  if (role === "owner" || role === "admin") return "brand";
  if (role === "designer") return "success";
  return "neutral";
}

/** Share of a limit used, 0–100. A limit of 0 counts as full. */
export function usagePercent(used: number, max: number): number {
  if (max === 0) return 100;
  return Math.min(100, Math.round((used / max) * 100));
}
