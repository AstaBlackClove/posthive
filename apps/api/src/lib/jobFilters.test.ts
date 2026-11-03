import { describe, expect, it } from "vitest";
import { bucketJobCounts, jobFilterWhere } from "./jobFilters.js";

const row = (status: string, approvalStatus: string | null, count: number) => ({
  status,
  approvalStatus,
  _count: count,
});

describe("bucketJobCounts", () => {
  const rows = [
    row("draft", null, 3),
    row("draft", "pending", 2),
    row("draft", "rejected", 1),
    row("pending", "approved", 4),
    row("pending", null, 1),
    row("running", null, 1),
    row("done", null, 2),
    row("comment_done", null, 1),
    row("post_done", null, 1),
    row("failed", null, 1),
    row("post_failed", null, 2),
    row("comment_failed", null, 1),
  ];

  it("puts every status/approval combination in the right bucket", () => {
    expect(bucketJobCounts(rows)).toEqual({
      all: 20,
      draft: 3, // plain drafts only: not pending, not rejected
      review: 2,
      rejected: 1,
      pending: 6, // pending + running
      done: 4, // done + comment_done + post_done
      failed: 4, // failed + post_failed + comment_failed
    });
  });

  it("returns zeros for no rows", () => {
    expect(bucketJobCounts([])).toEqual({
      all: 0, draft: 0, review: 0, rejected: 0, pending: 0, done: 0, failed: 0,
    });
  });

  it("all equals the sum of the rows", () => {
    expect(bucketJobCounts(rows).all).toBe(rows.reduce((n, r) => n + r._count, 0));
  });

  it("treats an approved draft as a plain draft", () => {
    expect(bucketJobCounts([row("draft", "approved", 2)]).draft).toBe(2);
  });
});

describe("jobFilterWhere", () => {
  it("review = draft awaiting approval", () => {
    expect(jobFilterWhere("review")).toEqual({ status: { in: ["draft"] }, approvalStatus: "pending" });
  });

  it("rejected = draft sent back", () => {
    expect(jobFilterWhere("rejected")).toEqual({ status: { in: ["draft"] }, approvalStatus: "rejected" });
  });

  it("draft excludes in-review and rejected", () => {
    expect(jobFilterWhere("draft")).toEqual({
      status: { in: ["draft"] },
      OR: [{ approvalStatus: null }, { approvalStatus: { notIn: ["pending", "rejected"] } }],
    });
  });

  it("done and failed cover the legacy sub-statuses", () => {
    expect(jobFilterWhere("done")).toEqual({ status: { in: ["done", "comment_done", "post_done"] } });
    expect(jobFilterWhere("failed")).toEqual({ status: { in: ["failed", "post_failed", "comment_failed"] } });
    expect(jobFilterWhere("pending")).toEqual({ status: { in: ["pending", "running"] } });
  });

  it("unknown filter returns null", () => {
    expect(jobFilterWhere("bogus")).toBeNull();
  });
});
