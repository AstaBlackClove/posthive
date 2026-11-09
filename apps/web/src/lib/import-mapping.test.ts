import { describe, expect, it } from "vitest";
import {
  assignField,
  columnStatus,
  currentFields,
  dataChecks,
  fieldChecks,
  mappingChanged,
  mappingToSend,
  summarizeMapping,
  type FileColumn,
} from "./import-mapping";
import type { ServerRow } from "./importReview";

// "Post Title / Brief / Platform / Type / Date / Copy / PIC / Notes": the importer knows three of them
const columns: FileColumn[] = [
  { index: 0, label: "Post Title", sample: "5 Habits", field: "title" },
  { index: 1, label: "Brief", sample: "Carousel on async approval", field: null },
  { index: 2, label: "Platform", sample: "IG", field: "platform" },
  { index: 3, label: "Type", sample: "carousel", field: null },
  { index: 4, label: "Date", sample: "18/11/2026", field: "postDate" },
  { index: 5, label: "Copy", sample: "Most teams lose hours", field: null },
  { index: 6, label: "PIC", sample: "Rina S.", field: null },
  { index: 7, label: "Notes", sample: "Use warm photos", field: null },
];

describe("column status", () => {
  it("a column with a field is matched, one without is waiting for the user, one the user dropped is skipped", () => {
    expect(columnStatus(columns[0], {})).toBe("matched");
    expect(columnStatus(columns[5], {})).toBe("needs-mapping");
    expect(columnStatus(columns[5], { 5: null })).toBe("skipped");
    expect(columnStatus(columns[5], { 5: "caption" })).toBe("matched");
  });

  it("the user can drop a column the importer had matched", () => {
    expect(columnStatus(columns[4], { 4: null })).toBe("skipped");
  });
});

describe("assignField", () => {
  it("gives a field to a column", () => {
    expect(assignField(columns, {}, 5, "caption")).toEqual({ 5: "caption" });
  });

  it("takes the field away from the column that had it (one column per field)", () => {
    // Title was on column 0; the user picks it for column 1
    expect(assignField(columns, {}, 1, "title")).toEqual({ 1: "title", 0: null });
  });

  it("also takes it from a column the user mapped earlier", () => {
    const first = assignField(columns, {}, 5, "caption");
    expect(assignField(columns, first, 6, "caption")).toEqual({ 5: null, 6: "caption" });
  });

  it("touches only what changed, so a column nobody decided on still says 'needs mapping'", () => {
    const next = assignField(columns, {}, 5, "caption");
    expect(columnStatus(columns[7], next)).toBe("needs-mapping");
    expect(Object.keys(next)).toEqual(["5"]);
  });

  it("'don't import' is null", () => {
    expect(assignField(columns, { 5: "caption" }, 5, null)).toEqual({ 5: null });
  });

  it("does not change the overrides it was given", () => {
    const given = { 5: "caption" as const };
    assignField(columns, given, 6, "caption");
    expect(given).toEqual({ 5: "caption" });
  });
});

describe("summary", () => {
  it("counts matched, needs input and skipped, and how many required fields are mapped", () => {
    expect(summarizeMapping(columns, {})).toMatchObject({
      matched: 3, needsMapping: 5, skipped: 0, requiredMapped: 3, requiredTotal: 3, missingRequired: [],
      mappedColumns: 3, totalColumns: 8,
    });
    const decided = { 1: "caption" as const, 3: null, 5: null, 6: "picContent" as const, 7: null };
    expect(summarizeMapping(columns, decided)).toMatchObject({ matched: 5, needsMapping: 0, skipped: 3, mappedColumns: 5 });
  });

  it("names the required field nobody reads", () => {
    const s = summarizeMapping(columns, { 4: null });
    expect(s.missingRequired).toEqual(["postDate"]);
    expect(s.requiredMapped).toBe(2);
  });

  it("a file the importer knows nothing about misses all three", () => {
    const blind: FileColumn[] = columns.map((c) => ({ ...c, field: null }));
    expect(summarizeMapping(blind, {}).missingRequired).toEqual(["title", "postDate", "platform"]);
    expect(summarizeMapping(blind, { 0: "title", 4: "postDate", 2: "platform" }).missingRequired).toEqual([]);
  });
});

describe("what is sent", () => {
  it("nothing when the user changed nothing: the file is read the way the importer reads it", () => {
    expect(mappingToSend(columns, {})).toBeUndefined();
    expect(mappingChanged(columns, {})).toBe(false);
  });

  it("every column once the user changed one: the guess where untouched, the choice elsewhere", () => {
    const sent = mappingToSend(columns, assignField(columns, {}, 5, "caption"));
    expect(sent).toEqual({ 0: "title", 1: null, 2: "platform", 3: null, 4: "postDate", 5: "caption", 6: null, 7: null });
  });

  it("a mapping that ends up the same as the guess is not a change", () => {
    expect(mappingChanged(columns, { 0: "title" })).toBe(false);
    expect(mappingChanged(columns, { 5: "caption" })).toBe(true);
    expect(mappingChanged(columns, { 4: null })).toBe(true);
  });

  it("currentFields shows the choice over the guess", () => {
    expect(currentFields(columns, { 4: null, 5: "caption" }).get(4)).toBeNull();
    expect(currentFields(columns, { 4: null, 5: "caption" }).get(5)).toBe("caption");
    expect(currentFields(columns, {}).get(0)).toBe("title");
  });
});

describe("mapping validation list", () => {
  it("lists the three required fields with their column, and the optional ones that are read", () => {
    const list = fieldChecks(columns, { 5: "caption" });
    expect(list.map((f) => [f.label, f.column, f.required])).toEqual([
      ["Content title", "Post Title", true],
      ["Publish date", "Date", true],
      ["Channel", "Platform", true],
      ["Caption", "Copy", false],
    ]);
  });

  it("says 'no column' for a required field nobody reads", () => {
    const list = fieldChecks(columns, { 4: null });
    expect(list.find((f) => f.field === "postDate")?.column).toBeNull();
  });
});

describe("data checks", () => {
  const row = (sourceRow: number, patch: Partial<ServerRow>): ServerRow => ({
    sourceRow, status: "valid", fields: { title: "T", postDate: "2099-03-10", platforms: ["linkedin"], category: null, caption: "" },
    errors: [], warnings: [], duplicateReason: null, duplicateKind: null, details: {}, ...patch,
  });

  it("is empty when every row is fine", () => {
    expect(dataChecks([row(2, {}), row(3, {})])).toEqual([]);
  });

  it("groups what is wrong, with the first row as the example", () => {
    const rows = [
      row(9, { status: "invalid", errors: [{ field: "postDate", message: "x" }], fields: { title: "T", postDate: "", platforms: ["linkedin"], category: null, caption: "" }, details: { rawPostDate: "31/11/2026" } }),
      row(12, { status: "invalid", errors: [{ field: "postDate", message: "x" }], fields: { title: "T", postDate: "", platforms: ["linkedin"], category: null, caption: "" }, details: { rawPostDate: "32/01/2026" } }),
      row(17, { status: "invalid", errors: [{ field: "title", message: "Content title is required." }], fields: { title: "", postDate: "2099-03-10", platforms: ["linkedin"], category: null, caption: "" } }),
      row(21, { status: "invalid", errors: [{ field: "platforms", message: "Unsupported channel: Pinterest." }], fields: { title: "T", postDate: "2099-03-10", platforms: [], category: null, caption: "" } }),
      row(14, { status: "duplicate", duplicateReason: "Already imported into this workspace.", duplicateKind: "workspace" }),
    ];
    expect(dataChecks(rows)).toEqual([
      { kind: "invalid-date", title: "2 invalid dates", example: 'Row 9 · "31/11/2026" doesn\'t exist', count: 2, tone: "danger" },
      { kind: "missing-value", title: "1 missing required value", example: "Row 17 · Title is empty", count: 1, tone: "danger" },
      { kind: "unsupported-channel", title: "1 unsupported channel", example: "Row 21 · Unsupported channel: Pinterest", count: 1, tone: "warning" },
      { kind: "duplicate", title: "1 possible duplicate", example: "Row 14 · Already imported into this workspace.", count: 1, tone: "warning" },
    ]);
  });

  it("an empty date cell is a missing value, not an invalid date", () => {
    const empty = row(5, { status: "invalid", errors: [{ field: "postDate", message: "Publish date is required." }], fields: { title: "T", postDate: "", platforms: ["linkedin"], category: null, caption: "" } });
    expect(dataChecks([empty])).toEqual([expect.objectContaining({ kind: "missing-value", example: "Row 5 · Publish date is empty" })]);
  });

  it("a row counts once, under its first problem", () => {
    const both = row(4, {
      status: "invalid",
      errors: [{ field: "title", message: "Content title is required." }, { field: "platforms", message: "Channel is required." }],
      fields: { title: "", postDate: "2099-03-10", platforms: [], category: null, caption: "" },
    });
    const checks = dataChecks([both]);
    expect(checks).toHaveLength(1);
    expect(checks[0].kind).toBe("missing-value");
  });
});
