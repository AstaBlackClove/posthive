import { describe, expect, it } from "vitest";
import {
  buildCommitPayload,
  buildReviewRows,
  canImport,
  issuesOf,
  reviewSummary,
  validateFields,
  type ReviewFields,
  type ReviewRow,
  type ServerRow,
} from "./importReview";

const fields = (patch: Partial<ReviewFields> = {}): ReviewFields => ({
  title: "Slope stability",
  postDate: "2099-03-10",
  platforms: ["linkedin"],
  category: "Case Study",
  caption: "Caption",
  ...patch,
});

const server = (sourceRow: number, patch: Partial<ServerRow> = {}, f: Partial<ReviewFields> = {}): ServerRow => ({
  sourceRow,
  status: "valid",
  fields: fields(f),
  errors: [],
  warnings: [],
  duplicateReason: null,
  duplicateKind: null,
  details: {},
  ...patch,
});

const edit = (row: ReviewRow, patch: Partial<ReviewFields>): ReviewRow => ({ ...row, fields: { ...row.fields, ...patch } });

describe("validateFields", () => {
  it("passes a complete row", () => {
    expect(validateFields(fields())).toEqual([]);
  });

  it("explains each empty or bad field", () => {
    expect(validateFields(fields({ title: " " }))).toEqual([{ field: "title", message: "Content title is required." }]);
    expect(validateFields(fields({ postDate: "" }))[0]).toMatchObject({ field: "postDate", message: "Publish date is required." });
    expect(validateFields(fields({ postDate: "2026-02-31" }))[0]).toMatchObject({ field: "postDate" });
    expect(validateFields(fields({ platforms: [] }))[0]).toMatchObject({ field: "platforms", message: "Channel is required." });
  });

  it("does not block on an unknown category", () => {
    expect(validateFields(fields({ category: "Nonsense" }))).toEqual([]);
  });

  it("flags a title over 200 characters and a channel it does not know", () => {
    expect(validateFields(fields({ title: "x".repeat(201) }))[0]).toMatchObject({ field: "title", message: "Content title must be 200 characters or fewer." });
    expect(validateFields(fields({ platforms: ["pinterest"] }))[0]).toMatchObject({ field: "platforms", message: "Unsupported channel: pinterest." });
  });
});

describe("issuesOf", () => {
  it("keeps the server's reason for a field the user has not touched", () => {
    const [row] = buildReviewRows([
      server(2, { status: "invalid", errors: [{ field: "postDate", message: 'Publish date isn\'t valid: "31-02-2099".' }] }, { postDate: "" }),
    ]);
    expect(issuesOf(row, [row]).errors).toEqual([{ field: "postDate", message: 'Publish date isn\'t valid: "31-02-2099".' }]);
  });

  it("clears the marker once the field is fixed", () => {
    const [row] = buildReviewRows([
      server(2, { status: "invalid", errors: [{ field: "postDate", message: "x" }] }, { postDate: "" }),
    ]);
    const fixed = edit(row, { postDate: "2099-03-10" });
    expect(issuesOf(fixed, [fixed]).errors).toEqual([]);
  });

  it("marks the second copy of a post inside the batch", () => {
    const rows = buildReviewRows([server(2), server(3)]);
    expect(issuesOf(rows[0], rows).errors).toEqual([]);
    expect(issuesOf(rows[1], rows).errors).toEqual([{ field: "title", message: "Same as row 2 in this file." }]);
  });

  it("ignores a removed row when looking for duplicates", () => {
    const rows = buildReviewRows([server(2), server(3)]);
    rows[0] = { ...rows[0], removed: true };
    expect(issuesOf(rows[1], rows).errors).toEqual([]);
  });

  it("keeps a restored duplicate flagged until its title, date or platform changes", () => {
    const [dup] = buildReviewRows([server(2, { status: "duplicate", duplicateReason: "Already imported into this workspace.", duplicateKind: "workspace" })]);
    const restored = { ...dup, removed: false };
    expect(issuesOf(restored, [restored]).errors).toEqual([{ field: "title", message: "Already imported into this workspace." }]);
    const changed = edit(restored, { title: "New title" });
    expect(issuesOf(changed, [changed]).errors).toEqual([]);
  });

  it("shows errors the server sent back for a row until it is edited", () => {
    const [row] = buildReviewRows([server(2)]);
    const serverErrors = new Map([[2, [{ field: "title" as const, message: "Already imported into this workspace." }]]]);
    expect(issuesOf(row, [row], serverErrors).errors).toHaveLength(1);
    expect(issuesOf(edit(row, { title: "Other" }), [row], serverErrors).errors).toEqual([]);
  });
});

describe("summary and import button", () => {
  it("counts total, valid, needs fix, removed and duplicates", () => {
    const rows = buildReviewRows([
      server(2),
      server(3, { status: "invalid", errors: [{ field: "title", message: "Content title is required." }] }, { title: "" }),
      server(4, { status: "duplicate", duplicateReason: "Already imported into this workspace.", duplicateKind: "workspace" }),
      server(5),
    ]);
    rows[3] = { ...rows[3], removed: true };
    expect(reviewSummary(rows)).toEqual({ total: 4, valid: 1, needsFix: 1, removed: 2, duplicates: 1 });
  });

  it("only allows Import when every kept row is valid", () => {
    const rows = buildReviewRows([
      server(2),
      server(3, { status: "invalid", errors: [{ field: "title", message: "Content title is required." }] }, { title: "" }),
    ]);
    expect(canImport(rows)).toBe(false);
    expect(canImport([rows[0], edit(rows[1], { title: "Fixed" })])).toBe(true);
    expect(canImport([rows[0], { ...rows[1], removed: true }])).toBe(true);
  });

  it("does not allow Import with nothing left", () => {
    const rows = buildReviewRows([server(2)]).map((r) => ({ ...r, removed: true }));
    expect(canImport(rows)).toBe(false);
  });

  it("sets aside a row the workspace already has, but keeps a copy inside the file to be fixed or removed", () => {
    const rows = buildReviewRows([
      server(2),
      server(3, { status: "duplicate", duplicateReason: "Same as row 2 in this file.", duplicateKind: "file" }),
    ]);
    expect(rows.map((r) => r.removed)).toEqual([false, false]);
    expect(rows[1].duplicateKind).toBe("file");
    expect(issuesOf(rows[1], rows).errors).toEqual([{ field: "title", message: "Same as row 2 in this file." }]);
  });

  it("starts with already-imported rows set aside", () => {
    const [row] = buildReviewRows([server(2, { status: "duplicate", duplicateReason: "x", duplicateKind: "workspace" })]);
    expect(row.removed).toBe(true);
  });
});

describe("buildCommitPayload", () => {
  it("leaves removed rows out", () => {
    const rows = buildReviewRows([server(2), server(3)]);
    rows[0] = { ...rows[0], removed: true };
    expect(buildCommitPayload(rows).include).toEqual([3]);
  });

  it("sends only what the user changed", () => {
    const rows = buildReviewRows([server(2), server(3)]);
    rows[1] = edit(rows[1], { title: "New title", platforms: ["instagram", "linkedin"] });
    expect(buildCommitPayload(rows)).toEqual({
      include: [2, 3],
      edits: { 3: { title: "New title", platforms: ["instagram", "linkedin"] } },
    });
  });
});
