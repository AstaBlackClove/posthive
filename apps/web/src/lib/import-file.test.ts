import { describe, expect, it } from "vitest";
import { EXPECTED_COLUMNS, MAX_FILE_BYTES, STEPS, STEP_HEADINGS, formatBytes, stepIndex, validateImportFile } from "./import-file";

describe("validateImportFile", () => {
  const file = (name: string, size = 1000) => ({ name, size });

  it("takes CSV and XLSX in any case", () => {
    expect(validateImportFile(file("plan.csv"))).toBeNull();
    expect(validateImportFile(file("PLAN.XLSX"))).toBeNull();
  });

  it("says why an old Excel file will not do", () => {
    expect(validateImportFile(file("plan.xls"))).toMatch(/aren't supported/);
    expect(validateImportFile(file("plan.xlsm"))).toMatch(/aren't supported/);
  });

  it("refuses another type, an empty file and a large one", () => {
    expect(validateImportFile(file("plan.txt"))).toBe("The file must be .csv or .xlsx.");
    expect(validateImportFile(file("plan.csv", 0))).toBe("The file is empty.");
    expect(validateImportFile(file("plan.csv", MAX_FILE_BYTES + 1))).toBe("The file is too large. The limit is 5 MB.");
    expect(validateImportFile(file("plan.csv", MAX_FILE_BYTES))).toBeNull();
  });
});

describe("formatBytes", () => {
  it("reads in B, KB and MB", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(48 * 1024)).toBe("48 KB");
    expect(formatBytes(10)).toBe("10 B");
    expect(formatBytes(1)).toBe("1 B");
    expect(formatBytes(1100)).toBe("1 KB");
    expect(formatBytes(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });
});

describe("steps", () => {
  it("are four, in order, each with a heading", () => {
    expect(STEPS.map((s) => s.id)).toEqual(["upload", "map", "review", "done"]);
    for (const s of STEPS) expect(STEP_HEADINGS[s.id].title.length).toBeGreaterThan(0);
    expect(stepIndex("review")).toBe(2);
  });

  it("use the product name from the brand file, not a hard-coded one", () => {
    expect(STEPS[1].hint).toBe("Match to Postly fields");
  });
});

describe("expected columns", () => {
  it("require exactly the three the importer cannot do without, first", () => {
    expect(EXPECTED_COLUMNS.filter((c) => c.required).map((c) => c.name)).toEqual(["Content Title", "Post Date", "Platform"]);
    expect(EXPECTED_COLUMNS.slice(0, 3).every((c) => c.required)).toBe(true);
  });
});
