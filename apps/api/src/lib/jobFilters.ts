import type { Prisma } from "@prisma/client";

/** Status filters the Posts page offers. "review" and "rejected" are drafts split by approvalStatus. */
export const JOB_FILTERS = ["draft", "review", "rejected", "pending", "done", "failed"] as const;
export type JobFilter = (typeof JOB_FILTERS)[number];

/** PostJob.status values behind each status-based filter. */
export const STATUS_GROUPS = {
  draft: ["draft"],
  pending: ["pending", "running"],
  done: ["done", "comment_done", "post_done"],
  failed: ["failed", "post_failed", "comment_failed"],
} as const;

/** Prisma where-fragment for one filter, or null when the filter is unknown. */
export function jobFilterWhere(filter: string): Prisma.PostJobWhereInput | null {
  switch (filter) {
    case "review":
      return { status: { in: ["draft"] }, approvalStatus: "pending" };
    case "rejected":
      return { status: { in: ["draft"] }, approvalStatus: "rejected" };
    case "draft":
      // Plain drafts only — in-review and rejected have their own filters
      return {
        status: { in: ["draft"] },
        OR: [{ approvalStatus: null }, { approvalStatus: { notIn: ["pending", "rejected"] } }],
      };
    case "pending":
    case "done":
    case "failed":
      return { status: { in: [...STATUS_GROUPS[filter]] } };
    default:
      return null;
  }
}

export interface JobCounts {
  all: number;
  draft: number;
  review: number;
  rejected: number;
  pending: number;
  done: number;
  failed: number;
}

/** Folds groupBy(status, approvalStatus) rows into per-filter counts. */
export function bucketJobCounts(
  rows: { status: string; approvalStatus: string | null; _count: number }[],
): JobCounts {
  const counts: JobCounts = { all: 0, draft: 0, review: 0, rejected: 0, pending: 0, done: 0, failed: 0 };
  for (const { status, approvalStatus, _count: n } of rows) {
    counts.all += n;
    if (status === "draft") {
      if (approvalStatus === "pending") counts.review += n;
      else if (approvalStatus === "rejected") counts.rejected += n;
      else counts.draft += n;
    } else if ((STATUS_GROUPS.pending as readonly string[]).includes(status)) counts.pending += n;
    else if ((STATUS_GROUPS.done as readonly string[]).includes(status)) counts.done += n;
    else if ((STATUS_GROUPS.failed as readonly string[]).includes(status)) counts.failed += n;
  }
  return counts;
}
