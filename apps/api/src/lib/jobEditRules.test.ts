import { describe, expect, it } from "vitest";
import { canEditJob, sameContent, shouldResetReview } from "./jobEditRules.js";

describe("sameContent (what counts as a content change)", () => {
  it("ignores empty values the edit form always sends", () => {
    expect(sameContent('{"text":"a","title":"t"}', '{"text":"a","title":"t","perAccount":{},"mediaUrls":[]}')).toBe(true);
  });

  it("ignores key order", () => {
    expect(sameContent('{"a":1,"b":2}', '{"b":2,"a":1}')).toBe(true);
  });

  it("detects a changed title or caption", () => {
    expect(sameContent('{"title":"a"}', '{"title":"b"}')).toBe(false);
    expect(sameContent('{"text":"a"}', '{"text":"a!"}')).toBe(false);
  });

  it("detects added media", () => {
    expect(sameContent('{"mediaUrls":[]}', '{"mediaUrls":["/a.png"]}')).toBe(false);
  });
});

const job = (patch: Partial<{ status: string; approvalStatus: string | null; userId: string }> = {}) => ({
  status: "draft",
  approvalStatus: null as string | null,
  userId: "marketing-1",
  ...patch,
});

describe("canEditJob: Marketing (member) changing the post date or content", () => {
  it.each([
    ["plain draft", job()],
    ["draft in review", job({ approvalStatus: "pending" })],
    ["rejected draft", job({ approvalStatus: "rejected" })],
  ])("is allowed on own %s", (_name, j) => {
    expect(canEditJob("member", "marketing-1", j)).toEqual({ ok: true });
  });

  it("is locked once approved (Scheduled)", () => {
    const r = canEditJob("member", "marketing-1", job({ status: "pending", approvalStatus: "approved" }));
    expect(r).toMatchObject({ ok: false, status: 403 });
  });

  it("is locked on published / failed posts", () => {
    expect(canEditJob("member", "marketing-1", job({ status: "done" }))).toMatchObject({ ok: false, status: 409 });
    expect(canEditJob("member", "marketing-1", job({ status: "failed" }))).toMatchObject({ ok: false, status: 409 });
  });

  it("is denied on someone else's post", () => {
    expect(canEditJob("member", "marketing-2", job())).toMatchObject({ ok: false, status: 403 });
  });
});

describe("canEditJob: other roles", () => {
  it("lets admin and owner edit an approved post, even someone else's", () => {
    const approved = job({ status: "pending", approvalStatus: "approved" });
    expect(canEditJob("admin", "admin-1", approved)).toEqual({ ok: true });
    expect(canEditJob("owner", "owner-1", approved)).toEqual({ ok: true });
  });

  it("denies the design team and unknown roles", () => {
    expect(canEditJob("designer", "d-1", job({ approvalStatus: "pending" }))).toMatchObject({ ok: false, status: 403 });
    expect(canEditJob(null, "x", job())).toMatchObject({ ok: false, status: 403 });
  });
});

describe("shouldResetReview", () => {
  const inReview = job({ approvalStatus: "pending" });
  const rejected = job({ approvalStatus: "rejected" });

  it("does not reset for a date-only change", () => {
    expect(shouldResetReview("member", inReview, false)).toBe(false);
    expect(shouldResetReview("member", rejected, false)).toBe(false);
  });

  it("resets an in-review or rejected draft when content changes", () => {
    expect(shouldResetReview("member", inReview, true)).toBe(true);
    expect(shouldResetReview("member", rejected, true)).toBe(true);
  });

  it("never resets a plain draft", () => {
    expect(shouldResetReview("member", job(), true)).toBe(false);
  });

  it("never resets when a manage role edits", () => {
    expect(shouldResetReview("admin", inReview, true)).toBe(false);
    expect(shouldResetReview("owner", inReview, true)).toBe(false);
  });
});
