import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { ImportMappingError } from "./planningImport.js";
import { parsePlanningXlsx } from "./planningXlsx.js";

async function workbook(sheets: Record<string, Array<Array<string | number | Date>>>): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  for (const [name, rows] of Object.entries(sheets)) {
    const sheet = wb.addWorksheet(name);
    for (const row of rows) sheet.addRow(row);
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

describe("parsePlanningXlsx", () => {
  it("reads the template that ships with the app, and nothing is missing", async () => {
    const buffer = readFileSync(new URL("../../../../web/public/import-plan-template.xlsx", import.meta.url));
    const parsed = await parsePlanningXlsx(buffer);
    expect(parsed.missingFields).toEqual([]);
    const fields = parsed.columns.map((c) => c.field);
    expect(fields).toEqual(expect.arrayContaining(["title", "postDate", "platform"]));
  });

  it("reads a sheet with the importer's own headers", async () => {
    const buffer = await workbook({
      Plan: [
        ["Content Title", "Post Date", "Platform"],
        ["A post", "10-03-2099", "LinkedIn"],
      ],
    });
    const parsed = await parsePlanningXlsx(buffer);
    expect(parsed.missingFields).toEqual([]);
    expect(parsed.drafts[0].fields).toMatchObject({ title: "A post", postDate: "2099-03-10", platforms: ["linkedin"] });
  });

  it("does not refuse a sheet whose headers it does not know: the columns come back to be mapped", async () => {
    const buffer = await workbook({
      Plan: [
        ["Headline", "When", "Where", "Owner"],
        ["A post", "10-03-2099", "LinkedIn", "Rina"],
      ],
    });
    const parsed = await parsePlanningXlsx(buffer);
    expect(parsed.missingFields).toEqual(["title", "postDate", "platform"]);
    expect(parsed.drafts).toEqual([]);
    expect(parsed.columns.map((c) => [c.label, c.sample])).toEqual([
      ["Headline", "A post"],
      ["When", "10-03-2099"],
      ["Where", "LinkedIn"],
      ["Owner", "Rina"],
    ]);
  });

  it("reads the rows once the columns are mapped", async () => {
    const buffer = await workbook({
      Plan: [
        ["Headline", "When", "Where", "Owner"],
        ["A post", "10-03-2099", "LinkedIn", "Rina"],
      ],
    });
    const parsed = await parsePlanningXlsx(buffer, { mapping: { 0: "title", 1: "postDate", 2: "platform", 3: "picContent" } });
    expect(parsed.missingFields).toEqual([]);
    expect(parsed.drafts[0].fields).toMatchObject({ title: "A post", postDate: "2099-03-10", platforms: ["linkedin"] });
    expect(parsed.drafts[0].extras.picContent).toBe("Rina");
  });

  it("turns an Excel date cell into a date once its column is mapped to the publish date", async () => {
    const buffer = await workbook({
      Plan: [
        ["Headline", "When", "Where"],
        ["A post", new Date(Date.UTC(2099, 2, 10)), "Instagram"],
      ],
    });
    const parsed = await parsePlanningXlsx(buffer, { mapping: { 0: "title", 1: "postDate", 2: "platform" } });
    expect(parsed.drafts[0].fields.postDate).toBe("2099-03-10");
  });

  it("prefers a sheet with the importer's headers over one it has to guess", async () => {
    const buffer = await workbook({
      Notes: [["Anything", "Else"], ["a", "b"], ["c", "d"], ["e", "f"]],
      Plan: [["Content Title", "Post Date", "Platform"], ["A post", "10-03-2099", "LinkedIn"]],
    });
    const parsed = await parsePlanningXlsx(buffer);
    expect(parsed.sheetName).toBe("Plan");
    expect(parsed.missingFields).toEqual([]);
  });

  it("refuses a column that is not in the sheet", async () => {
    const buffer = await workbook({ Plan: [["Content Title", "Post Date", "Platform"], ["A", "10-03-2099", "LinkedIn"]] });
    await expect(parsePlanningXlsx(buffer, { mapping: { 0: "title", 9: "caption" } })).rejects.toBeInstanceOf(ImportMappingError);
  });

  it("refuses a file that is not an XLSX", async () => {
    await expect(parsePlanningXlsx(Buffer.from("not a zip"))).rejects.toThrow(/isn't valid/);
  });

  it("refuses a workbook with nothing in it", async () => {
    const buffer = await workbook({ Empty: [] });
    await expect(parsePlanningXlsx(buffer)).rejects.toThrow(/no rows/);
  });
});
