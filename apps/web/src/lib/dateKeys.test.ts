import { describe, expect, it } from "vitest";
import { dateToKey, keyToDate } from "./dateKeys";

describe("keyToDate", () => {
  it("gives that calendar day, whatever the machine's timezone is", () => {
    const d = keyToDate("2026-11-20")!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 20]);
  });

  it("is local noon, so a daylight-saving gap at midnight cannot change the day", () => {
    expect(keyToDate("2026-03-29")!.getHours()).toBe(12);
  });

  it("returns undefined for empty, missing or malformed input", () => {
    for (const bad of ["", undefined, null, "2026-11", "20-11-2026", "2026-1-5", "2026-11-20T09:00", "abc"]) {
      expect(keyToDate(bad), String(bad)).toBeUndefined();
    }
  });

  it("rejects a day that does not exist instead of rolling into the next month", () => {
    expect(keyToDate("2026-02-31")).toBeUndefined();
    expect(keyToDate("2026-13-01")).toBeUndefined();
    expect(keyToDate("2026-00-10")).toBeUndefined();
    expect(keyToDate("2025-02-29")).toBeUndefined();
    expect(keyToDate("2028-02-29")).toBeDefined();
  });
});

describe("dateToKey", () => {
  it("pads month and day", () => {
    expect(dateToKey(new Date(2026, 0, 5, 12))).toBe("2026-01-05");
  });

  it("round-trips every day of a year, including leap day and the year ends", () => {
    for (let t = new Date(2028, 0, 1, 12); t.getFullYear() === 2028; t.setDate(t.getDate() + 1)) {
      const key = dateToKey(t);
      expect(dateToKey(keyToDate(key)!), key).toBe(key);
    }
  });

  it("reads the local day, even late in the evening", () => {
    expect(dateToKey(new Date(2026, 10, 20, 23, 59))).toBe("2026-11-20");
    expect(dateToKey(new Date(2026, 10, 21, 0, 1))).toBe("2026-11-21");
  });
});
