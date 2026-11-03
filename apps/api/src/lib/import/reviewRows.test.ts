import { describe, expect, it } from "vitest";
import {
  commitFromDrafts,
  reviewDrafts,
  validatePlanFields,
  type PlanningDraft,
} from "./reviewRows.js";
import { makeImportKey } from "./planningImport.js";

const fields = (patch: Partial<PlanningDraft["fields"]> = {}): PlanningDraft["fields"] => ({
  title: "Slope stability",
  postDate: "2099-03-10",
  platforms: ["linkedin"],
  category: "Case Study",
  caption: "Caption",
  ...patch,
});

const draft = (sourceRow: number, patch: Partial<PlanningDraft["fields"]> = {}, rest: Partial<PlanningDraft> = {}): PlanningDraft => ({
  sourceRow,
  fields: fields(patch),
  extras: { designCopy: "copy", assetNotes: "", pillar: null, picContent: null, contentReview: null, approvedBy: null, reviewer: null, picDesign: null, progress: null, outputUrl: null, sourceStatus: null },
  warnings: [],
  ...rest,
});

const only = <T>(list: T[]): T => {
  expect(list).toHaveLength(1);
  return list[0];
};

describe("validatePlanFields", () => {
  it("passes a complete row and derives the pillar from the category", () => {
    const r = validatePlanFields(fields({ category: "case study" }));
    expect(r.errors).toEqual([]);
    expect(r.category).toBe("Case Study");
    expect(r.pillar).toBe("Promotional");
    expect(r.scheduledFor?.toISOString()).toBe("2099-03-10T02:00:00.000Z");
  });

  it("flags an empty title with a clear reason", () => {
    const r = validatePlanFields(fields({ title: "  " }));
    expect(r.errors).toEqual([{ field: "title", message: "Content Title wajib diisi." }]);
  });

  it("flags an empty or impossible date", () => {
    expect(validatePlanFields(fields({ postDate: "" })).errors[0]).toMatchObject({ field: "postDate", message: "Post Date wajib diisi." });
    expect(validatePlanFields(fields({ postDate: "2026-02-31" })).errors[0]).toMatchObject({ field: "postDate" });
    expect(validatePlanFields(fields({ postDate: "31-02-2026" })).errors[0]).toMatchObject({ field: "postDate" });
  });

  it("flags no platform and an unknown platform", () => {
    expect(validatePlanFields(fields({ platforms: [] })).errors[0]).toMatchObject({ field: "platforms" });
    expect(validatePlanFields(fields({ platforms: ["tiktok"] })).errors[0]).toMatchObject({
      field: "platforms",
      message: "Platform tidak dikenal: tiktok.",
    });
  });

  it("only warns about an unknown category, it does not block", () => {
    const r = validatePlanFields(fields({ category: "Nonsense" }));
    expect(r.errors).toEqual([]);
    expect(r.warnings.join(" ")).toMatch(/Nonsense/);
    expect(r.category).toBeNull();
  });

  it("warns about a past date and a website-only row", () => {
    expect(validatePlanFields(fields({ postDate: "2020-01-01" })).warnings.join(" ")).toMatch(/lewat/);
    expect(validatePlanFields(fields({ platforms: ["website"] })).warnings.join(" ")).toMatch(/Website/);
  });

  it("rejects a title over 200 characters", () => {
    expect(validatePlanFields(fields({ title: "x".repeat(201) })).errors[0]).toMatchObject({ field: "title" });
  });
});

describe("reviewDrafts", () => {
  it("marks a row with an empty field invalid and keeps the reason per field", () => {
    const r = only(reviewDrafts([draft(2, { title: "" })]));
    expect(r.status).toBe("invalid");
    expect(r.errors).toEqual([{ field: "title", message: "Content Title wajib diisi." }]);
  });

  it("keeps the original reason for a date and platform the file could not read", () => {
    const r = only(reviewDrafts([draft(2, { postDate: "", platforms: [] }, { rawPostDate: "31-02-2026", platformError: "Platform tidak dikenal: TikTok." })]));
    expect(r.errors.map((e) => e.message)).toEqual([
      'Post Date tidak valid: "31-02-2026". Gunakan format DD-MM-YYYY (YYYY-MM-DD juga diterima).',
      "Platform tidak dikenal: TikTok.",
    ]);
  });

  it("passes the row once the field is fixed and re-validated", () => {
    const broken = draft(2, { postDate: "", platforms: [] }, { rawPostDate: "31-02-2026", platformError: "Platform tidak dikenal: TikTok." });
    expect(only(reviewDrafts([broken])).status).toBe("invalid");
    const fixed = only(reviewDrafts([broken], { edits: { 2: { postDate: "2099-03-10", platforms: ["instagram"] } } }));
    expect(fixed.status).toBe("valid");
    expect(fixed.errors).toEqual([]);
  });

  it("flags a row already imported before", () => {
    const key = makeImportKey("Slope stability", "2099-03-10", ["linkedin"]);
    const r = only(reviewDrafts([draft(2)], { existingKeys: new Set([key]) }));
    expect(r.status).toBe("duplicate");
    expect(r.duplicateReason).toBe("Sudah pernah diimpor ke workspace ini.");
  });

  it("flags the second copy of a row inside the same file", () => {
    const [a, b] = reviewDrafts([draft(2), draft(3)]);
    expect(a.status).toBe("valid");
    expect(b.status).toBe("duplicate");
    expect(b.duplicateReason).toBe("Duplikat dengan baris 2 di file ini.");
  });

  it("no longer counts a duplicate once its title is changed", () => {
    const [, b] = reviewDrafts([draft(2), draft(3)], { edits: { 3: { title: "Another title" } } });
    expect(b.status).toBe("valid");
  });

  it("does not count a row that is left out of the batch as a duplicate source", () => {
    const [a, b] = reviewDrafts([draft(2), draft(3)], { include: [3] });
    expect(a.included).toBe(false);
    expect(b.status).toBe("valid");
  });
});

describe("commitFromDrafts", () => {
  it("refuses the whole batch when an included row is invalid, with the row errors", () => {
    const r = commitFromDrafts([draft(2), draft(3, { title: "" })], { include: [2, 3] });
    expect(r).toEqual({
      ok: false,
      rowErrors: [{ sourceRow: 3, errors: [{ field: "title", message: "Content Title wajib diisi." }] }],
    });
  });

  it("rejects invalid data sent straight to the server", () => {
    const r = commitFromDrafts([draft(2)], { include: [2], edits: { 2: { postDate: "not-a-date", platforms: ["tiktok"] } } });
    expect(r.ok).toBe(false);
  });

  it("refuses a duplicate that was included without changing it", () => {
    const key = makeImportKey("Slope stability", "2099-03-10", ["linkedin"]);
    const r = commitFromDrafts([draft(2)], { include: [2], existingKeys: new Set([key]) });
    expect(r).toMatchObject({ ok: false, rowErrors: [{ sourceRow: 2 }] });
  });

  it("does not save a row that was removed from the batch", () => {
    const r = commitFromDrafts([draft(2), draft(3, { title: "Other post" })], { include: [3] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.rows.map((row) => row.sourceRow)).toEqual([3]);
  });

  it("saves the edited values, not the file's", () => {
    const r = commitFromDrafts([draft(2, { title: "", postDate: "", platforms: [] }, { rawPostDate: "x" })], {
      include: [2],
      edits: { 2: { title: "Fixed title", postDate: "2099-04-01", platforms: ["linkedin", "instagram"], category: "tips/how to", caption: "New caption" } },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const row = only(r.rows);
    expect(row).toMatchObject({
      title: "Fixed title",
      postDate: "2099-04-01",
      platforms: ["linkedin", "instagram"],
      category: "Tips/How To",
      pillar: "Educational",
      caption: "New caption",
    });
    expect(row.scheduledFor.toISOString()).toBe("2099-04-01T02:00:00.000Z");
    expect(row.importKey).toBe(makeImportKey("Fixed title", "2099-04-01", ["linkedin", "instagram"]));
  });

  it("keeps columns the review does not edit", () => {
    const r = commitFromDrafts([draft(2)], { include: [2] });
    expect(r.ok && only(r.rows).extras.designCopy).toBe("copy");
  });

  it("refuses an empty batch", () => {
    expect(commitFromDrafts([draft(2)], { include: [] }).ok).toBe(false);
  });

  it("refuses a row number that is not in the file", () => {
    const r = commitFromDrafts([draft(2)], { include: [2, 99] });
    expect(r).toMatchObject({ ok: false, rowErrors: [{ sourceRow: 99 }] });
  });
});
