import { describe, expect, it } from "vitest";
import { firstName, formatPublishAt, formatTodayPill, greetingFor, initialsOf, monthTitle, quarterMonths, shortName, sortSummary } from "./dashboard-format";
import { inAnchorMonth, shiftAnchor, visibleDays } from "./calendar-range";

describe("formatTodayPill", () => {
  it("is 'Fri, 13 Nov 2026' (the design says Thu, but 13 Nov 2026 is a Friday and its own calendar puts it in the Fri column)", () => {
    expect(formatTodayPill(new Date("2026-11-13T05:00:00Z"))).toBe("Fri, 13 Nov 2026");
  });

  it("uses the WIB day: 20:00 UTC on the 12th is already the 13th in Jakarta", () => {
    expect(formatTodayPill(new Date("2026-11-12T20:00:00Z"))).toBe("Fri, 13 Nov 2026");
    expect(formatTodayPill(new Date("2026-11-12T16:59:00Z"))).toBe("Thu, 12 Nov 2026");
  });

  it("does not depend on the locale's month spelling (September is 'Sep')", () => {
    expect(formatTodayPill(new Date("2026-09-04T05:00:00Z"))).toBe("Fri, 4 Sep 2026");
  });

  it("handles the year boundary", () => {
    expect(formatTodayPill(new Date("2026-12-31T18:00:00Z"))).toBe("Fri, 1 Jan 2027");
  });
});

describe("names", () => {
  it("firstName takes the first word", () => {
    expect(firstName("Puteri Anggraini")).toBe("Puteri");
    expect(firstName("  Rizky  ")).toBe("Rizky");
    expect(firstName("")).toBe("");
    expect(firstName(null)).toBe("");
    expect(firstName(undefined)).toBe("");
  });

  it("initialsOf takes up to two initials, upper-case", () => {
    expect(initialsOf("Puteri Anggraini")).toBe("PA");
    expect(initialsOf("puteri")).toBe("P");
    expect(initialsOf("Ada Lovelace King")).toBe("AL");
    expect(initialsOf("")).toBe("?");
    expect(initialsOf(null)).toBe("?");
  });

  it("monthTitle names the month of a key", () => {
    expect(monthTitle("2026-11-13")).toBe("November 2026");
    expect(monthTitle("2027-01-01")).toBe("January 2027");
  });
});

describe("sortSummary", () => {
  it("says it in the design's words for the default order", () => {
    expect(sortSummary([{ id: "publishAt", desc: false }])).toBe("Sorted by publish date, soonest first");
    expect(sortSummary([{ id: "publishAt", desc: true }])).toBe("Sorted by publish date, latest first");
  });

  it("names any other column and the direction", () => {
    expect(sortSummary([{ id: "owner", desc: false }])).toBe("Sorted by owner, A to Z");
    expect(sortSummary([{ id: "content", desc: true }])).toBe("Sorted by content, Z to A");
    expect(sortSummary([{ id: "production", desc: false }])).toBe("Sorted by production status, A to Z");
  });

  it("says so when nothing is sorted, and falls back to the id for an unknown column", () => {
    expect(sortSummary([])).toBe("Not sorted");
    expect(sortSummary([{ id: "mystery", desc: false }])).toBe("Sorted by mystery, A to Z");
  });
});

describe("visibleDays (weeks start on Monday)", () => {
  it("November 2026 is the grid of the design: Mon 26 Oct … Sun 6 Dec is NOT shown, it ends Mon 30 Nov's week", () => {
    const days = visibleDays("month", "2026-11-13");
    expect(days[0]).toBe("2026-10-26"); // Nov 1 is a Sunday, so the first week starts the Monday before
    expect(days[6]).toBe("2026-11-01");
    expect(days[days.length - 1]).toBe("2026-12-06");
    expect(days).toHaveLength(42);
  });

  it("a month that fits five weeks has 35 days", () => {
    // February 2027 starts on a Monday and has 28 days
    const days = visibleDays("month", "2027-02-10");
    expect(days[0]).toBe("2027-02-01");
    expect(days[days.length - 1]).toBe("2027-02-28");
    expect(days).toHaveLength(28);
  });

  it("always whole weeks, starting on a Monday and ending on a Sunday", () => {
    for (const anchor of ["2026-01-15", "2026-02-28", "2026-05-01", "2026-08-31", "2026-11-30", "2028-02-29", "2026-12-31"]) {
      const days = visibleDays("month", anchor);
      expect(days.length % 7, anchor).toBe(0);
      expect(new Date(`${days[0]}T00:00:00Z`).getUTCDay(), anchor).toBe(1);
      expect(new Date(`${days[days.length - 1]}T00:00:00Z`).getUTCDay(), anchor).toBe(0);
      expect(days).toContain(anchor);
      expect(new Set(days).size).toBe(days.length);
    }
  });

  it("a week is the Monday to Sunday around the anchor", () => {
    expect(visibleDays("week", "2026-11-13")).toEqual(["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"]);
    expect(visibleDays("week", "2026-11-15")[0]).toBe("2026-11-09"); // a Sunday belongs to the week before it
    expect(visibleDays("week", "2026-11-09")[0]).toBe("2026-11-09");
  });

  it("a week can cross a month and a year", () => {
    expect(visibleDays("week", "2026-12-31")).toEqual(["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
  });

  it("a day is itself", () => {
    expect(visibleDays("day", "2026-11-13")).toEqual(["2026-11-13"]);
  });
});

describe("shiftAnchor", () => {
  it("moves by a day, a week or a month", () => {
    expect(shiftAnchor("day", "2026-11-13", 1)).toBe("2026-11-14");
    expect(shiftAnchor("day", "2026-11-01", -1)).toBe("2026-10-31");
    expect(shiftAnchor("week", "2026-11-13", 1)).toBe("2026-11-20");
    expect(shiftAnchor("week", "2026-11-03", -1)).toBe("2026-10-27");
    expect(shiftAnchor("month", "2026-11-13", 1)).toBe("2026-12-13");
    expect(shiftAnchor("month", "2026-11-13", -1)).toBe("2026-10-13");
  });

  it("a month step from the 31st does not skip a month", () => {
    expect(shiftAnchor("month", "2026-01-31", 1)).toBe("2026-02-28");
    expect(shiftAnchor("month", "2028-01-31", 1)).toBe("2028-02-29");
    expect(shiftAnchor("month", "2026-03-31", -1)).toBe("2026-02-28");
    expect(shiftAnchor("month", "2026-10-31", 1)).toBe("2026-11-30");
  });

  it("crosses the year", () => {
    expect(shiftAnchor("month", "2026-12-15", 1)).toBe("2027-01-15");
    expect(shiftAnchor("month", "2027-01-15", -1)).toBe("2026-12-15");
  });

  it("going forward then back returns to the same month", () => {
    for (const a of ["2026-05-15", "2026-11-13"]) expect(shiftAnchor("month", shiftAnchor("month", a, 1), -1)).toBe(a);
  });
});

describe("inAnchorMonth", () => {
  it("days of the neighbouring months are outside", () => {
    expect(inAnchorMonth("2026-10-31", "2026-11-13")).toBe(false);
    expect(inAnchorMonth("2026-11-01", "2026-11-13")).toBe(true);
    expect(inAnchorMonth("2026-12-01", "2026-11-13")).toBe(false);
  });
});

describe("formatPublishAt", () => {
  it("is the weekday, day, month and WIB time: 'Fri 13 Nov · 14:00'", () => {
    expect(formatPublishAt(new Date("2026-11-13T07:00:00Z"))).toBe("Fri 13 Nov · 14:00");
  });
  it("is the WIB day, not the UTC one: 20:00 UTC is already the next morning in Jakarta", () => {
    expect(formatPublishAt(new Date("2026-11-12T20:00:00Z"))).toBe("Fri 13 Nov · 03:00");
  });
});

describe("greetingFor", () => {
  const at = (utc: string) => greetingFor(new Date(`2026-11-13T${utc}:00Z`));
  it("is morning from 05:00 to 11:59 WIB, afternoon to 17:59, evening after", () => {
    expect(at("22:00")).toBe("Good morning"); // 05:00 WIB
    expect(at("04:59")).toBe("Good morning"); // 11:59 WIB
    expect(at("05:00")).toBe("Good afternoon"); // 12:00 WIB
    expect(at("10:59")).toBe("Good afternoon"); // 17:59 WIB
    expect(at("11:00")).toBe("Good evening"); // 18:00 WIB
    expect(at("21:59")).toBe("Good evening"); // 04:59 WIB
  });
});

describe("quarterMonths", () => {
  it("names the first and last month of the quarter", () => {
    expect(quarterMonths("Q4 2026")).toBe("Oct – Dec");
    expect(quarterMonths("Q1 2027")).toBe("Jan – Mar");
    expect(quarterMonths("Q2 2026")).toBe("Apr – Jun");
  });
  it("is empty for a label that is not a quarter", () => {
    expect(quarterMonths("Autumn")).toBe("");
    expect(quarterMonths("")).toBe("");
  });
});

describe("shortName", () => {
  it("is the first name and the initial of the last: 'Putri A.'", () => {
    expect(shortName("Putri Anggraini")).toBe("Putri A.");
    expect(shortName("  rina  dewi sari ")).toBe("rina S.");
  });
  it("keeps a single word, and is empty for nothing", () => {
    expect(shortName("Budi")).toBe("Budi");
    expect(shortName(null)).toBe("");
    expect(shortName("")).toBe("");
  });
});
