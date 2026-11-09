import { describe, expect, it } from "vitest";
import {
  channelCell,
  classify,
  dateCell,
  formatPlanDate,
  inTab,
  pageNumbers,
  paginate,
  pinIssues,
  rowState,
  suggestDates,
  summarizeImport,
  tabCounts,
} from "./import-rows";
import { buildReviewRows, type ReviewFields, type ReviewRow, type ServerRow } from "./importReview";

const fields = (patch: Partial<ReviewFields> = {}): ReviewFields => ({
  title: "Slope stability", postDate: "2099-03-10", platforms: ["linkedin"], category: "Case Study", caption: "Caption", ...patch,
});
const server = (sourceRow: number, patch: Partial<ServerRow> = {}, f: Partial<ReviewFields> = {}): ServerRow => ({
  sourceRow, status: "valid", fields: fields(f), errors: [], warnings: [], duplicateReason: null, duplicateKind: null, details: {}, ...patch,
});
const rowsOf = (...list: ServerRow[]): ReviewRow[] => buildReviewRows(list);
const edit = (row: ReviewRow, patch: Partial<ReviewFields>): ReviewRow => ({ ...row, fields: { ...row.fields, ...patch } });

describe("formatPlanDate", () => {
  it("is day, short month, year, day padded", () => {
    expect(formatPlanDate("2026-11-02")).toBe("02 Nov 2026");
    expect(formatPlanDate("2026-12-30")).toBe("30 Dec 2026");
  });
  it("leaves what is not a date key alone", () => {
    expect(formatPlanDate("31/11/2026")).toBe("31/11/2026");
  });
});

describe("rowState", () => {
  it("a clean row is Valid and says nothing", () => {
    const [r] = rowsOf(server(1));
    expect(rowState(r, [r])).toEqual({ status: "valid", label: "Valid", tone: "success", needsAttention: false, note: null });
  });

  it("a date that is not on the calendar: Invalid date, with the cell the file had", () => {
    const [r] = rowsOf(server(9, { status: "invalid", errors: [{ field: "postDate", message: "x" }], details: { rawPostDate: "31/11/2026" } }, { postDate: "" }));
    expect(rowState(r, [r])).toMatchObject({ status: "invalid-date", label: "Invalid date", tone: "danger", needsAttention: true, note: 'Date "31/11/2026" doesn\'t exist' });
  });

  it("a date cell that is not a date at all can't be read", () => {
    const [r] = rowsOf(server(9, { status: "invalid", errors: [{ field: "postDate", message: "x" }], details: { rawPostDate: "tomorrow" } }, { postDate: "" }));
    expect(rowState(r, [r]).note).toBe('Date "tomorrow" can\'t be read');
  });

  it("an empty date is missing info, not an invalid date", () => {
    const [r] = rowsOf(server(9, { status: "invalid", errors: [{ field: "postDate", message: "Publish date is required." }] }, { postDate: "" }));
    expect(rowState(r, [r])).toMatchObject({ status: "missing-info", label: "Missing required info", note: "Publish date is required" });
  });

  it("an empty title is missing info", () => {
    const [r] = rowsOf(server(17, { status: "invalid", errors: [{ field: "title", message: "Content title is required." }] }, { title: "" }));
    expect(rowState(r, [r])).toMatchObject({ status: "missing-info", note: "Content title is required" });
  });

  it("a title that is too long is its own thing", () => {
    const [r] = rowsOf(server(2));
    const long = edit(r, { title: "x".repeat(201) });
    expect(rowState(long, [long])).toMatchObject({ status: "invalid-title", label: "Invalid title" });
  });

  it("a channel it does not support, named as the file wrote it", () => {
    const [r] = rowsOf(server(21, { status: "invalid", errors: [{ field: "platforms", message: "Unsupported channel: Pinterest." }], details: { platformLabel: "Pinterest" } }, { platforms: [] }));
    expect(rowState(r, [r])).toMatchObject({ status: "unsupported-channel", label: "Unsupported channel", note: '"Pinterest" isn\'t a supported channel' });
  });

  it("no channel at all is missing info", () => {
    const [r] = rowsOf(server(5, { status: "invalid", errors: [{ field: "platforms", message: "Channel is required." }] }, { platforms: [] }));
    expect(rowState(r, [r])).toMatchObject({ status: "missing-info", note: "Channel is required" });
  });

  it("a copy of an earlier row in the file needs a decision", () => {
    const rows = rowsOf(server(2), server(3, { status: "duplicate", duplicateReason: "Same as row 2 in this file.", duplicateKind: "file" }));
    expect(rowState(rows[1], rows)).toMatchObject({ status: "duplicate", label: "Duplicate", tone: "warning", needsAttention: true, note: "Same as row 2 in this file" });
  });

  it("a row the workspace already has starts excluded, and says so", () => {
    const [r] = rowsOf(server(14, { status: "duplicate", duplicateReason: "Already imported into this workspace.", duplicateKind: "workspace" }));
    expect(r.removed).toBe(true);
    expect(rowState(r, [r])).toMatchObject({ status: "excluded", label: "Duplicate · Excluded", needsAttention: false, note: "Already imported into this workspace" });
  });

  it("an unsupported channel the user excluded is 'Unsupported · Excluded'", () => {
    const [r] = rowsOf(server(21, { status: "invalid", errors: [{ field: "platforms", message: "Unsupported channel: Pinterest." }] }, { platforms: [] }));
    expect(rowState({ ...r, removed: true }, [r])).toMatchObject({ status: "excluded", label: "Unsupported · Excluded", needsAttention: false });
  });

  it("any other row the user excluded is just Excluded", () => {
    const [r] = rowsOf(server(2));
    expect(rowState({ ...r, removed: true }, [r])).toMatchObject({ label: "Excluded", note: null });
  });

  it("a row that had a problem and is now fixed is 'Valid · Fixed'", () => {
    const [r] = rowsOf(server(9, { status: "invalid", errors: [{ field: "postDate", message: "x" }], details: { rawPostDate: "31/11/2026" } }, { postDate: "" }));
    const fixed = edit(r, { postDate: "2026-11-30" });
    expect(rowState(fixed, [fixed])).toMatchObject({ status: "fixed", label: "Valid · Fixed", needsAttention: false, note: null });
  });

  it("a row refused by the server stays marked until it is edited", () => {
    const [r] = rowsOf(server(2));
    const refused = new Map([[2, [{ field: "title" as const, message: "Already imported into this workspace." }]]]);
    expect(rowState(r, [r], refused)).toMatchObject({ status: "duplicate", needsAttention: true });
  });
});

describe("tabs, order and pages", () => {
  // distinct titles: rows with the same title, date and channel are copies of each other
  const rows = rowsOf(
    server(1, {}, { title: "One" }),
    server(2, {}, { title: "Two" }),
    server(9, { status: "invalid", errors: [{ field: "postDate", message: "x" }], details: { rawPostDate: "31/11/2026" } }, { title: "Nine", postDate: "" }),
    server(14, { status: "duplicate", duplicateReason: "Already imported into this workspace.", duplicateKind: "workspace" }, { title: "Fourteen" }),
    server(17, { status: "invalid", errors: [{ field: "title", message: "Content title is required." }] }, { title: "" }),
    server(3, {}, { title: "Three" }),
  );
  const items = classify(rows);

  it("counts every tab", () => {
    expect(tabCounts(items)).toEqual({ all: 6, valid: 3, attention: 2, excluded: 1 });
  });

  it("each tab holds the right rows", () => {
    const ids = (tab: Parameters<typeof inTab>[1]) => items.filter((i) => inTab(i, tab)).map((i) => i.row.sourceRow);
    expect(ids("all")).toEqual([1, 2, 9, 14, 17, 3]);
    expect(ids("valid")).toEqual([1, 2, 3]);
    expect(ids("attention")).toEqual([9, 17]);
    expect(ids("excluded")).toEqual([14]);
  });

  it("pins the rows to fix on top, then the ones set aside, then the valid ones, each by row number", () => {
    expect(pinIssues(items).map((i) => i.row.sourceRow)).toEqual([9, 17, 14, 1, 2, 3]);
  });

  it("does not change the list it was given", () => {
    const before = items.map((i) => i.row.sourceRow);
    pinIssues(items);
    expect(items.map((i) => i.row.sourceRow)).toEqual(before);
  });

  it("fixing a row moves it out of Needs attention and into Valid", () => {
    const fixed = rows.map((r) => (r.sourceRow === 9 ? edit(r, { postDate: "2026-11-30" }) : r));
    expect(tabCounts(classify(fixed))).toEqual({ all: 6, valid: 4, attention: 1, excluded: 1 });
  });
});

describe("paginate", () => {
  const list = Array.from({ length: 26 }, (_, i) => i + 1);

  it("10 to a page, and says what is shown", () => {
    expect(paginate(list, 1)).toMatchObject({ items: list.slice(0, 10), page: 1, pageCount: 3, from: 1, to: 10, total: 26 });
    expect(paginate(list, 3)).toMatchObject({ items: [21, 22, 23, 24, 25, 26], page: 3, from: 21, to: 26 });
  });

  it("keeps the page inside the range", () => {
    expect(paginate(list, 9).page).toBe(3);
    expect(paginate(list, 0).page).toBe(1);
    expect(paginate(list, Number.NaN).page).toBe(1);
  });

  it("an empty list is one empty page", () => {
    expect(paginate([], 1)).toEqual({ items: [], page: 1, pageCount: 1, from: 0, to: 0, total: 0 });
  });

  it("exactly one page worth has one page", () => {
    expect(paginate(list.slice(0, 10), 1).pageCount).toBe(1);
    expect(paginate(list.slice(0, 11), 1).pageCount).toBe(2);
  });
});

describe("pageNumbers", () => {
  it("all of them when there are few", () => {
    expect(pageNumbers(1, 3)).toEqual([1, 2, 3]);
  });
  it("the ends and the neighbours of the current page when there are many", () => {
    expect(pageNumbers(1, 20)).toEqual([1, 2, "gap", 20]);
    expect(pageNumbers(10, 20)).toEqual([1, "gap", 9, 10, 11, "gap", 20]);
    expect(pageNumbers(20, 20)).toEqual([1, "gap", 19, 20]);
  });
});

describe("cells", () => {
  it("the channel cell names the channels, or shows the text the file had when it could not be read", () => {
    const [ok, bad] = rowsOf(
      server(1, {}, { platforms: ["linkedin", "instagram"] }),
      server(21, { status: "invalid", errors: [{ field: "platforms", message: "Unsupported channel: Pinterest." }], details: { platformLabel: "Pinterest" } }, { platforms: [] }),
    );
    expect(channelCell(ok)).toEqual({ names: ["LinkedIn", "Instagram"], platforms: ["linkedin", "instagram"], unreadable: false });
    expect(channelCell(bad)).toEqual({ names: ["Pinterest"], platforms: [], unreadable: true });
  });

  it("the date cell is the day and the default time, or the file's own text when it is not a date", () => {
    const [ok, bad] = rowsOf(
      server(1, {}, { postDate: "2026-11-18" }),
      server(9, { status: "invalid", errors: [{ field: "postDate", message: "x" }], details: { rawPostDate: "31/11/2026" } }, { postDate: "" }),
    );
    expect(dateCell(ok)).toEqual({ text: "18 Nov 2026 · 09:00", unreadable: false });
    expect(dateCell(bad)).toEqual({ text: "31/11/2026", unreadable: true });
  });
});

describe("suggestDates", () => {
  it("a day past the end of the month: the last day and the first of the next", () => {
    expect(suggestDates("31/11/2026")).toEqual({ note: "November has 30 days.", dates: ["2026-11-30", "2026-12-01"] });
    expect(suggestDates("31-02-2027")).toEqual({ note: "February has 28 days.", dates: ["2027-02-28", "2027-03-01"] });
  });

  it("knows a leap year", () => {
    expect(suggestDates("30/02/2028")).toEqual({ note: "February has 29 days.", dates: ["2028-02-29", "2028-03-01"] });
  });

  it("December rolls into January of the next year", () => {
    expect(suggestDates("32/12/2026")).toEqual({ note: "December has 31 days.", dates: ["2026-12-31", "2027-01-01"] });
  });

  it("reads a year-first cell too", () => {
    expect(suggestDates("2026-11-31")).toEqual({ note: "November has 30 days.", dates: ["2026-11-30", "2026-12-01"] });
  });

  it("a month past 12 with a day up to 12 is probably day and month swapped", () => {
    expect(suggestDates("03/25/2026")).toEqual({ note: "There is no month 25.", dates: ["2026-03-25"] });
  });

  it("has nothing for a real date, nothing that looks like a date, or day 0", () => {
    expect(suggestDates("30/11/2026")).toBeNull();
    expect(suggestDates("tomorrow")).toBeNull();
    expect(suggestDates("")).toBeNull();
    expect(suggestDates("0/11/2026")).toBeNull();
    expect(suggestDates("31/13/2026")).toBeNull();
  });
});

describe("summarizeImport", () => {
  const today = "2026-11-09";
  const rows = rowsOf(
    server(1, {}, { title: "A", platforms: ["instagram"], category: "Case Study", caption: "c", postDate: "2026-11-18" }),
    server(2, {}, { title: "B", platforms: ["instagram"], category: "Case Study", caption: "", postDate: "2026-11-20" }),
    server(3, {}, { title: "C", platforms: ["linkedin", "instagram"], category: null, caption: "c", postDate: "2026-12-02" }),
    server(4, {}, { title: "D", platforms: ["linkedin"], category: "Blog Post", caption: "c", postDate: "2026-11-01" }),
    server(5, { status: "duplicate", duplicateReason: "Already imported into this workspace.", duplicateKind: "workspace" }, { title: "E" }),
  );
  const s = summarizeImport(rows, { instagram: 1, linkedin: 2 }, today);

  it("counts the rows kept, not the ones set aside", () => {
    expect(s.imported).toBe(4);
  });

  it("names the channels in a fixed order", () => {
    expect(s.channels).toEqual(["LinkedIn", "Instagram"]);
    expect(s.channelsLine).toBe("LinkedIn & Instagram");
  });

  it("counts per channel and category, a mirrored row under each of its channels", () => {
    expect(s.breakdown.map((b) => [b.label, b.category, b.count])).toEqual([
      ["LinkedIn", "Blog Post", 1],
      ["LinkedIn", "No category", 1],
      ["Instagram", "Case Study", 2],
      ["Instagram", "No category", 1],
    ]);
  });

  it("the first post that is still ahead", () => {
    expect(s.firstLive).toBe("2026-11-18");
    expect(summarizeImport(rows, {}, "2027-01-01").firstLive).toBeNull();
  });

  it("lists what each draft still needs, two reasons at most", () => {
    expect(s.needsInfo).toEqual([
      { sourceRow: 2, title: "B", detail: "No caption yet" },
      { sourceRow: 3, title: "C", detail: "No category · Choose a LinkedIn account" },
      { sourceRow: 4, title: "D", detail: "Choose a LinkedIn account · Date has passed" },
    ]);
  });

  it("asks for an account when none is connected, and says a website draft has no social target", () => {
    const only = rowsOf(
      server(1, {}, { platforms: ["instagram"] }),
      server(2, {}, { title: "Site post", platforms: ["website"] }),
    );
    const t = summarizeImport(only, {}, today);
    expect(t.needsInfo).toEqual([
      { sourceRow: 1, title: "Slope stability", detail: "No Instagram account connected" },
      { sourceRow: 2, title: "Site post", detail: "Website has no social target" },
    ]);
  });

  it("an empty batch is all zeroes", () => {
    expect(summarizeImport([], {}, today)).toEqual({ imported: 0, channels: [], channelsLine: "", breakdown: [], firstLive: null, needsInfo: [] });
  });

  it("three channels read 'A, B & C'", () => {
    expect(summarizeImport(rowsOf(server(1, {}, { platforms: ["linkedin", "instagram", "website"] })), {}, today).channelsLine).toBe("LinkedIn, Instagram & Website");
  });
});
