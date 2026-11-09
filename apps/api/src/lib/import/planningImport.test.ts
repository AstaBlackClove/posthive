import { describe, expect, it } from "vitest";
import { ImportMappingError, parsePlanningCsv } from "./planningImport.js";
import { commitFromDrafts, reviewDrafts } from "./reviewRows.js";

const csv = [
  "Content Title,Post Date,Platform,Content Category,Caption",
  "Good post,10-03-2099,LinkedIn,Case Study,Hello",
  ",11-03-2099,Instagram,Case Study,No title",
  "Bad date,31-02-2099,LinkedIn,,",
  "Bad platform,12-03-2099,TikTok,,",
].join("\n");

describe("parsePlanningCsv drafts", () => {
  const parsed = parsePlanningCsv(csv);

  it("returns a draft for every row, including the invalid ones", () => {
    expect(parsed.drafts.map((d) => d.sourceRow)).toEqual([2, 3, 4, 5]);
  });

  it("keeps the raw values of an invalid row so they can be fixed", () => {
    const badDate = parsed.drafts[2];
    expect(badDate.fields.title).toBe("Bad date");
    expect(badDate.fields.postDate).toBe("");
    expect(badDate.rawPostDate).toBe("31-02-2099");
    const badPlatform = parsed.drafts[3];
    expect(badPlatform.platformError).toBe("Unsupported channel: TikTok.");
  });

  it("reviews the file the same way the old parser did", () => {
    const reviewed = reviewDrafts(parsed.drafts);
    expect(reviewed.map((r) => r.status)).toEqual(["valid", "invalid", "invalid", "invalid"]);
    expect(reviewed[1].errors[0]).toMatchObject({ field: "title" });
    expect(reviewed[2].errors[0].message).toMatch(/31-02-2099/);
  });

  it("imports the whole file once every problem row is fixed", () => {
    const plan = commitFromDrafts(parsed.drafts, {
      include: [2, 3, 4, 5],
      edits: {
        3: { title: "Now titled" },
        4: { postDate: "2099-03-11" },
        5: { platforms: ["instagram"] },
      },
    });
    expect(plan.ok).toBe(true);
    if (plan.ok) expect(plan.rows.map((r) => r.title)).toEqual(["Good post", "Now titled", "Bad date", "Bad platform"]);
  });
});

// A plan that does not use the importer's header names: the user maps the columns by hand.
const foreign = [
  "Post Title,Brief,Platform,Type,Date,Copy,PIC,Notes",
  "5 Habits of Fast-Moving Teams,Carousel on async approval,IG,carousel,18/11/2026,Most teams lose hours,Rina S.,Use warm photos",
  "Year-End Recap,Highlights of 2026,LinkedIn,document,24/11/2026,,Dimas P.,",
].join("\n");

describe("a file whose headers the importer does not know", () => {
  it("is not refused: it comes back with its columns and what is still missing", () => {
    const parsed = parsePlanningCsv(foreign);
    expect(parsed.columns.map((c) => [c.label, c.field])).toEqual([
      ["Post Title", "title"], // "post title" is a known alias
      ["Brief", null],
      ["Platform", "platform"],
      ["Type", null],
      ["Date", "postDate"],
      ["Copy", null], // "copy" alone is not a header the importer knows
      ["PIC", null],
      ["Notes", null],
    ]);
    expect(parsed.missingFields).toEqual([]);
  });

  it("keeps the first value of each column as the sample", () => {
    const parsed = parsePlanningCsv(foreign);
    expect(parsed.columns.find((c) => c.label === "Brief")?.sample).toBe("Carousel on async approval");
    // Copy is empty in row 3 but filled in row 2: the sample is the first filled cell
    expect(parsed.columns.find((c) => c.label === "Copy")?.sample).toBe("Most teams lose hours");
  });

  it("reads no row while a required field has no column, and says which", () => {
    const parsed = parsePlanningCsv("Headline,When,Where\nA post,2099-03-10,LinkedIn");
    expect(parsed.missingFields).toEqual(["title", "postDate", "platform"]);
    expect(parsed.drafts).toEqual([]);
    expect(parsed.columns.map((c) => c.label)).toEqual(["Headline", "When", "Where"]);
    expect(parsed.columns.every((c) => c.field === null)).toBe(true);
  });

  it("reads the rows once the user maps the three required columns", () => {
    const parsed = parsePlanningCsv("Headline,When,Where\nA post,2099-03-10,LinkedIn", {
      mapping: { 0: "title", 1: "postDate", 2: "platform" },
    });
    expect(parsed.missingFields).toEqual([]);
    expect(parsed.drafts).toHaveLength(1);
    expect(parsed.drafts[0].fields).toMatchObject({ title: "A post", postDate: "2099-03-10", platforms: ["linkedin"] });
    expect(parsed.columns.map((c) => c.field)).toEqual(["title", "postDate", "platform"]);
  });

  it("the user's choice wins over the guess, and a column set to null is not read", () => {
    const parsed = parsePlanningCsv(foreign, {
      mapping: { 0: "title", 1: "caption", 2: "platform", 3: null, 4: "postDate", 5: null, 6: "picContent", 7: null },
    });
    expect(parsed.drafts[0].fields.caption).toBe("Carousel on async approval");
    expect(parsed.drafts[0].extras.designCopy).toBe(""); // Copy was set to "don't import"
    expect(parsed.drafts[0].extras.picContent).toBe("Rina S.");
  });

  it("refuses a field mapped to two columns", () => {
    expect(() => parsePlanningCsv(foreign, { mapping: { 0: "title", 1: "title" } })).toThrow(ImportMappingError);
  });

  it("refuses a column that is not in the file", () => {
    expect(() => parsePlanningCsv(foreign, { mapping: { 0: "title", 40: "caption" } })).toThrow(/Column 41/);
  });

  it("finds the header row below a title block", () => {
    const parsed = parsePlanningCsv(["Q4 plan,,", ",,", "Headline,Date,Channel", "A post,2099-03-10,LinkedIn"].join("\n"));
    expect(parsed.header.headerRow).toBe(3);
    expect(parsed.columns.map((c) => c.label)).toEqual(["Headline", "Date", "Channel"]);
    expect(parsed.columns[1].field).toBe("postDate");
  });

  it("takes the header row, not the title line above it, when no header is a name it knows", () => {
    const parsed = parsePlanningCsv(["Q4 content plan,,", "Headline,When,Where", "A post,10-03-2099,LinkedIn"].join("\n"));
    expect(parsed.header.headerRow).toBe(2);
    expect(parsed.columns.map((c) => c.label)).toEqual(["Headline", "When", "Where"]);
    expect(parsed.columns.map((c) => c.sample)).toEqual(["A post", "10-03-2099", "LinkedIn"]);
  });

  it("only refuses an empty file", () => {
    expect(() => parsePlanningCsv("")).toThrow(/no rows/);
    expect(() => parsePlanningCsv("\n\n  \n")).toThrow(/no rows/);
  });
});

describe("a file with the importer's own headers", () => {
  it("lists every column with the field it is read as, and nothing is missing", () => {
    const parsed = parsePlanningCsv(csv);
    expect(parsed.missingFields).toEqual([]);
    expect(parsed.columns.map((c) => c.field)).toEqual(["title", "postDate", "platform", "category", "caption"]);
  });

  it("prefers the strict header over a loose one when a row of the file has both", () => {
    const parsed = parsePlanningCsv(["Plan,Owner,Status", "Content Title,Post Date,Platform", "A,2099-03-10,LinkedIn"].join("\n"));
    expect(parsed.header.headerRow).toBe(2);
    expect(parsed.missingFields).toEqual([]);
  });
});
