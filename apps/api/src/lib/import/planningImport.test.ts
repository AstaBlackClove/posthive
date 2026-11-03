import { describe, expect, it } from "vitest";
import { parsePlanningCsv } from "./planningImport.js";
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
    expect(badPlatform.platformError).toBe("Platform tidak dikenal: TikTok.");
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
