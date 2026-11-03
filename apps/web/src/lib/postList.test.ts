import { describe, expect, it } from "vitest";
import { countJobs, matchesFilter, sectionOf, sortJobs, type ListJob } from "./postList";

let n = 0;
function job(p: Partial<ListJob> & { title?: string } = {}): ListJob {
  n += 1;
  const { title, ...rest } = p;
  return {
    id: p.id ?? `j${n}`,
    status: "pending",
    approvalStatus: null,
    scheduledFor: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    content: JSON.stringify({ text: title ?? `post ${n}` }),
    targets: [],
    ...rest,
  };
}
const ids = (jobs: ListJob[]) => jobs.map((j) => j.id);

describe("countJobs (bug: counts must not depend on the active filter)", () => {
  const all = [
    job({ status: "done" }),
    job({ status: "done" }),
    job({ status: "comment_done" }),
    job({ status: "draft" }),
    job({ status: "draft", approvalStatus: "pending" }),
    job({ status: "draft", approvalStatus: "rejected" }),
    job({ status: "pending", approvalStatus: "approved" }),
    job({ status: "failed" }),
    job({ status: "post_failed" }),
  ];

  it("counts every bucket from the full list", () => {
    expect(countJobs(all)).toEqual({
      all: 9, draft: 1, review: 1, rejected: 1, pending: 1, done: 3, failed: 2,
    });
  });

  it("counts the new In review and Rejected statuses", () => {
    const c = countJobs(all);
    expect(c.review).toBe(1);
    expect(c.rejected).toBe(1);
  });

  it("is unaffected by the filter that produced a visible list", () => {
    const before = countJobs(all);
    // Showing only Drafts must not change what the counts were computed from
    const visible = all.filter((j) => matchesFilter(j, "draft", "all"));
    expect(visible).toHaveLength(1);
    expect(countJobs(all)).toEqual(before);
  });

  it("respects the platform filter", () => {
    const withPlatform = [
      job({ status: "done", targets: [{ account: { platform: "bluesky" } }] }),
      job({ status: "done", targets: [{ account: { platform: "mastodon" } }] }),
    ];
    expect(countJobs(withPlatform, "bluesky").done).toBe(1);
    expect(countJobs(withPlatform, "all").done).toBe(2);
  });
});

describe("matchesFilter", () => {
  it("separates drafts, in review and rejected", () => {
    const plain = job({ status: "draft" });
    const review = job({ status: "draft", approvalStatus: "pending" });
    const rejected = job({ status: "draft", approvalStatus: "rejected" });
    expect(matchesFilter(plain, "draft", "all")).toBe(true);
    expect(matchesFilter(review, "draft", "all")).toBe(false);
    expect(matchesFilter(rejected, "draft", "all")).toBe(false);
    expect(matchesFilter(review, "review", "all")).toBe(true);
    expect(matchesFilter(rejected, "rejected", "all")).toBe(true);
    expect(matchesFilter(rejected, "review", "all")).toBe(false);
  });

  it("approved post lives in Scheduled", () => {
    const approved = job({ status: "pending", approvalStatus: "approved" });
    expect(matchesFilter(approved, "pending", "all")).toBe(true);
    expect(matchesFilter(approved, "review", "all")).toBe(false);
  });

  it("done and failed include their sub-statuses", () => {
    expect(matchesFilter(job({ status: "comment_done" }), "done", "all")).toBe(true);
    expect(matchesFilter(job({ status: "post_failed" }), "failed", "all")).toBe(true);
    expect(matchesFilter(job({ status: "running" }), "pending", "all")).toBe(true);
  });
});

describe("sectionOf", () => {
  it("groups statuses like the list sections", () => {
    expect(sectionOf(job({ status: "draft" }))).toBe("draft");
    expect(sectionOf(job({ status: "running" }))).toBe("upcoming");
    expect(sectionOf(job({ status: "comment_done" }))).toBe("past");
    expect(sectionOf(job({ status: "post_failed" }))).toBe("past");
  });
});

describe("sortJobs", () => {
  const a = job({ id: "a", title: "banana", scheduledFor: "2026-03-01T00:00:00.000Z", createdAt: "2026-01-02T00:00:00.000Z" });
  const b = job({ id: "b", title: "Apple", scheduledFor: "2026-02-01T00:00:00.000Z", createdAt: "2026-01-03T00:00:00.000Z" });
  const c = job({ id: "c", title: "cherry", scheduledFor: "2026-04-01T00:00:00.000Z", createdAt: "2026-01-01T00:00:00.000Z" });
  const none = job({ id: "none", title: "Aardvark", scheduledFor: null, createdAt: "2026-01-04T00:00:00.000Z" });
  const list = [a, none, c, b];

  it("soonest: closest first in upcoming, undated last", () => {
    expect(ids(sortJobs(list, "soonest", "upcoming"))).toEqual(["b", "a", "c", "none"]);
  });

  it("soonest: most recent first in past, undated last", () => {
    expect(ids(sortJobs(list, "soonest", "past"))).toEqual(["c", "a", "b", "none"]);
  });

  it("latest: reverse of soonest, undated still last", () => {
    expect(ids(sortJobs(list, "latest", "upcoming"))).toEqual(["c", "a", "b", "none"]);
    expect(ids(sortJobs(list, "latest", "past"))).toEqual(["b", "a", "c", "none"]);
  });

  it("newest / oldest created", () => {
    expect(ids(sortJobs(list, "newest", "upcoming"))).toEqual(["none", "b", "a", "c"]);
    expect(ids(sortJobs(list, "oldest", "upcoming"))).toEqual(["c", "a", "b", "none"]);
  });

  it("title A-Z ignores case", () => {
    expect(ids(sortJobs(list, "title", "upcoming"))).toEqual(["none", "b", "a", "c"]);
  });

  it("title uses the title field before the text", () => {
    const t = job({ id: "t", content: JSON.stringify({ text: "zzz", title: "AAA first" }) });
    expect(ids(sortJobs([c, t], "title", "upcoming"))).toEqual(["t", "c"]);
  });

  it("is stable on ties (by id) and does not mutate the input", () => {
    const x = job({ id: "x", scheduledFor: "2026-02-01T00:00:00.000Z" });
    const y = job({ id: "y", scheduledFor: "2026-02-01T00:00:00.000Z" });
    const input = [y, x];
    expect(ids(sortJobs(input, "soonest", "upcoming"))).toEqual(["x", "y"]);
    expect(ids(input)).toEqual(["y", "x"]);
  });

  it("survives broken content JSON", () => {
    const bad = job({ id: "bad", content: "not json" });
    expect(() => sortJobs([bad, a], "title", "upcoming")).not.toThrow();
  });

  it("works together with a status filter and never changes counts", () => {
    const all = [
      job({ id: "d1", status: "draft", scheduledFor: "2026-05-01T00:00:00.000Z" }),
      job({ id: "d2", status: "draft", scheduledFor: null }),
      job({ id: "d3", status: "draft", scheduledFor: "2026-04-01T00:00:00.000Z" }),
      job({ id: "p1", status: "pending", scheduledFor: "2026-03-01T00:00:00.000Z" }),
      job({ id: "r1", status: "draft", approvalStatus: "pending" }),
    ];
    const before = countJobs(all);
    const shown = sortJobs(all.filter((j) => matchesFilter(j, "draft", "all")), "soonest", "draft");
    expect(ids(shown)).toEqual(["d3", "d1", "d2"]);
    expect(countJobs(all)).toEqual(before);
    sortJobs(all, "title", "draft");
    expect(countJobs(all)).toEqual(before);
  });
});
