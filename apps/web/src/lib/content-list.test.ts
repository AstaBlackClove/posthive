import { describe, expect, it } from "vitest";
import {
  LIST_STATUS,
  activityText,
  approvalLabel,
  boardFooter,
  calendarFooter,
  captionLimit,
  cellKey,
  dayLabel,
  dayLine,
  filterOf,
  footerLine,
  groupByDay,
  hourOf,
  listDate,
  listSubtitle,
  longDate,
  nextStep,
  pillOf,
  placeByHour,
  postsLabel,
  publishingLabel,
  rangeLabel,
  shortDayLabel,
  shortLink,
  showDraftBanner,
  sourceLine,
  statusOfPost,
  timeRows,
  timeWib,
  visibleFilters,
  type ImportSource,
  type ListCounts,
  type ListItem,
} from "./content-list";

const counts = (patch: Partial<ListCounts> = {}): ListCounts => ({ all: 0, draft: 0, review: 0, rejected: 0, pending: 0, done: 0, failed: 0, ...patch });
const source: ImportSource = { fileName: "plan.xlsx", importedAt: "2026-11-13T03:42:00.000Z", importedBy: "Putri Anggraini", count: 60 };

describe("the six statuses", () => {
  it("a draft is Draft, In Review or Revision Required by its approval", () => {
    expect(filterOf({ status: "draft", approvalStatus: null })).toBe("draft");
    expect(filterOf({ status: "draft", approvalStatus: "pending" })).toBe("review");
    expect(filterOf({ status: "draft", approvalStatus: "rejected" })).toBe("rejected");
    expect(filterOf({ status: "draft", approvalStatus: "approved" })).toBe("draft");
  });

  it("a scheduled post is Ready to Publish, an out one Published, a broken one Failed, every status the API has", () => {
    for (const s of ["pending", "running"]) expect(filterOf({ status: s, approvalStatus: null })).toBe("pending");
    for (const s of ["done", "comment_done", "post_done"]) expect(filterOf({ status: s, approvalStatus: null })).toBe("done");
    for (const s of ["failed", "post_failed", "comment_failed"]) expect(filterOf({ status: s, approvalStatus: null })).toBe("failed");
  });

  it("an approval on a post that is out does not make it a draft again", () => {
    expect(filterOf({ status: "done", approvalStatus: "rejected" })).toBe("done");
  });

  it("is named as the design names it", () => {
    expect(statusOfPost({ status: "draft", approvalStatus: "pending" })).toBe("In Review");
    expect(statusOfPost({ status: "draft", approvalStatus: "rejected" })).toBe("Revision Required");
    expect(statusOfPost({ status: "pending", approvalStatus: null })).toBe("Ready to Publish");
    expect(LIST_STATUS.all).toBe("All content");
  });

  it("its pill is the colour the dashboard gives the same stage", () => {
    expect(pillOf({ status: "draft", approvalStatus: null })).toBe("brief");
    expect(pillOf({ status: "draft", approvalStatus: "pending" })).toBe("review");
    expect(pillOf({ status: "draft", approvalStatus: "rejected" })).toBe("changes");
    expect(pillOf({ status: "pending", approvalStatus: null })).toBe("approved");
    expect(pillOf({ status: "done", approvalStatus: null })).toBe("published");
    expect(pillOf({ status: "failed", approvalStatus: null })).toBe("failed");
  });

  it("agrees with the server's buckets: the same post is counted under the tab it is listed in", () => {
    // jobFilters.bucketJobCounts: draft + pending approval is "review", draft + rejected is "rejected"
    expect(filterOf({ status: "draft", approvalStatus: "pending" })).toBe("review");
    expect(filterOf({ status: "draft", approvalStatus: "rejected" })).toBe("rejected");
  });
});

describe("visibleFilters", () => {
  it("Marketing (makes drafts, submits for review) sees all six", () => {
    expect(visibleFilters({ canEditContent: true, canReview: false, canSubmitOwn: true })).toEqual(["draft", "review", "rejected", "pending", "done", "failed"]);
  });

  it("an admin approves, so no Revision Required of their own; they make drafts and review", () => {
    expect(visibleFilters({ canEditContent: true, canReview: true, canSubmitOwn: false })).toEqual(["draft", "review", "pending", "done", "failed"]);
  });

  it("the design team makes no drafts and only reviews", () => {
    expect(visibleFilters({ canEditContent: false, canReview: true, canSubmitOwn: false })).toEqual(["review", "pending", "done", "failed"]);
  });

  it("a role with nothing still sees the posts that are out", () => {
    expect(visibleFilters({ canEditContent: false, canReview: false, canSubmitOwn: false })).toEqual(["pending", "done", "failed"]);
  });
});

describe("shortLink", () => {
  it("is the host and the last part of the path", () => {
    expect(shortLink("https://docs.google.com/document/d/abc/env-enforcement")).toBe("docs.google.com/…/env-enforcement");
  });

  it("an address with no path is its host; a trailing slash is ignored", () => {
    expect(shortLink("https://example.com")).toBe("example.com");
    expect(shortLink("https://example.com/a/b/")).toBe("example.com/…/b");
  });

  it("text that is not an address is left as it is", () => {
    expect(shortLink("not a link")).toBe("not a link");
  });
});

describe("listDate", () => {
  it("is the WIB day and time: 07 Mar 2026 · 08:00", () => {
    expect(listDate("2026-03-07T01:00:00.000Z")).toBe("07 Mar 2026 · 08:00");
  });

  it("a time late in the evening UTC is the next WIB day", () => {
    expect(listDate("2026-03-06T18:30:00.000Z")).toBe("07 Mar 2026 · 01:30");
  });
});

describe("listSubtitle and the banner", () => {
  it("an imported plan nobody has touched is said as in the design", () => {
    expect(listSubtitle(counts({ all: 60, draft: 60 }), source)).toBe("60 posts imported from your quarterly plan. Every post starts as Draft.");
    expect(showDraftBanner(counts({ all: 60, draft: 60 }), source)).toBe(true);
  });

  it("once one post has moved on, the banner and the 'every post starts as Draft' line are gone", () => {
    const c = counts({ all: 60, draft: 58, review: 2 });
    expect(listSubtitle(c, source)).toBe("60 posts in this workspace, soonest first.");
    expect(showDraftBanner(c, source)).toBe(false);
  });

  it("drafts made here are not an import: no banner, no 'imported' line", () => {
    expect(showDraftBanner(counts({ all: 3, draft: 3 }), null)).toBe(false);
    expect(showDraftBanner(counts({ all: 3, draft: 3 }), undefined)).toBe(false);
    expect(listSubtitle(counts({ all: 3, draft: 3 }), null)).toBe("3 posts in this workspace, soonest first.");
  });

  it("one post is '1 post', and an empty workspace is told what the list is for", () => {
    expect(listSubtitle(counts({ all: 1, pending: 1 }), null)).toBe("1 post in this workspace, soonest first.");
    expect(listSubtitle(counts(), null)).toContain("Every post of the workspace");
    expect(showDraftBanner(counts(), source)).toBe(false);
  });
});

describe("sourceLine", () => {
  it("says when, by whom (shortened), how many, and what Row # is", () => {
    expect(sourceLine(source)).toBe("Imported 13 Nov 2026 · 10:42 by Putri A. · 60 posts imported · source row numbers kept as Row #");
  });

  it("without a name it does not say 'by'", () => {
    expect(sourceLine({ ...source, importedBy: null, count: 1 })).toBe("Imported 13 Nov 2026 · 10:42 · 1 post imported · source row numbers kept as Row #");
  });
});

describe("footerLine", () => {
  it("under All it splits the total by status, and says what Row # is when rows have one", () => {
    expect(footerLine(10, 60, "all", counts({ all: 60, draft: 60 }), true)).toBe("Showing 10 of 60 posts · 60 Draft · Row # = source row in imported file");
    expect(footerLine(10, 62, "all", counts({ all: 62, draft: 58, review: 2, pending: 2 }), false)).toBe("Showing 10 of 62 posts · 58 Draft · 2 In Review · 2 Ready to Publish");
  });

  it("under one tab it does not repeat the split", () => {
    expect(footerLine(2, 2, "review", counts({ all: 60, draft: 58, review: 2 }), false)).toBe("Showing 2 of 2 posts");
  });

  it("one post is '1 post'", () => {
    expect(footerLine(1, 1, "done", counts({ all: 1, done: 1 }), false)).toBe("Showing 1 of 1 post");
  });
});

describe("activityText", () => {
  const name = (p: string) => (p === "instagram" ? "Instagram" : p);

  it("an import: who and when, in WIB", () => {
    expect(activityText({ kind: "imported", by: "Putri Anggraini", at: "2026-11-13T03:42:00.000Z", note: null, channel: null }, name)).toBe("Imported as Draft by Putri A. · 13 Nov 2026, 10:42");
  });

  it("a revision carries the reviewer's note; an approval does not need one", () => {
    expect(activityText({ kind: "revision", by: "Dewi Kusuma", at: "2026-11-14T02:00:00.000Z", note: "Fix the hook", channel: null }, name)).toBe("Revision requested by Dewi K.: Fix the hook · 14 Nov 2026, 09:00");
    expect(activityText({ kind: "approved", by: "Dewi Kusuma", at: "2026-11-14T02:00:00.000Z", note: null, channel: null }, name)).toBe("Approved by Dewi K. · 14 Nov 2026, 09:00");
  });

  it("a failure names the channel and has no time, because none was recorded", () => {
    expect(activityText({ kind: "failed", by: null, at: null, note: "Token expired", channel: "instagram" }, name)).toBe("Failed on Instagram: Token expired");
    expect(activityText({ kind: "failed", by: null, at: null, note: null, channel: null }, name)).toBe("Failed on a channel");
  });

  it("a post made here says Created", () => {
    expect(activityText({ kind: "created", by: null, at: "2026-11-13T03:00:00.000Z", note: null, channel: null }, name)).toBe("Created · 13 Nov 2026, 10:00");
  });
});

describe("the drawer's labels", () => {
  it("approval: a draft nobody sent is Not submitted, a post made without the flow Not required", () => {
    expect(approvalLabel({ status: "draft", approvalStatus: null })).toBe("Not submitted");
    expect(approvalLabel({ status: "draft", approvalStatus: "pending" })).toBe("In review");
    expect(approvalLabel({ status: "draft", approvalStatus: "rejected" })).toBe("Revision requested");
    expect(approvalLabel({ status: "pending", approvalStatus: "approved" })).toBe("Approved");
    expect(approvalLabel({ status: "pending", approvalStatus: null })).toBe("Not required");
  });

  it("publishing follows the six statuses", () => {
    expect(publishingLabel({ status: "draft", approvalStatus: "pending" })).toBe("Not scheduled");
    expect(publishingLabel({ status: "pending", approvalStatus: null })).toBe("Scheduled");
    expect(publishingLabel({ status: "comment_done", approvalStatus: null })).toBe("Published");
    expect(publishingLabel({ status: "post_failed", approvalStatus: null })).toBe("Failed");
  });

  it("the date has its weekday and the time its zone, in WIB", () => {
    expect(longDate("2026-03-07T01:00:00.000Z")).toBe("Sat, 07 Mar 2026");
    expect(timeWib("2026-03-07T01:00:00.000Z")).toBe("08:00 WIB");
    expect(longDate("2026-03-06T18:30:00.000Z")).toBe("Sat, 07 Mar 2026");
  });

  it("the caption limit is the smallest of the channels that have one", () => {
    const limits = { instagram: 2200, linkedin: 3000, threads: 500 };
    expect(captionLimit(["linkedin", "instagram"], limits)).toBe(2200);
    expect(captionLimit(["linkedin", "threads"], limits)).toBe(500);
    expect(captionLimit(["unknown"], limits)).toBeNull();
    expect(captionLimit([], limits)).toBeNull();
  });
});

// ── Calendar and Kanban ─────────────────────────────────────────────────────

const post = (patch: Partial<ListItem> = {}): ListItem => ({
  id: "p1",
  status: "draft",
  approvalStatus: null,
  scheduledFor: "2026-03-07T01:00:00.000Z",
  title: "T",
  caption: "",
  channels: ["linkedin", "instagram"],
  sourceRow: 1,
  link: null,
  designCopy: "",
  category: null,
  ...patch,
});

describe("the title over the calendar", () => {
  it("a month is its name and year, a day its weekday and date", () => {
    expect(rangeLabel("month", "2026-03-07")).toBe("March 2026");
    expect(rangeLabel("day", "2026-03-07")).toBe("Saturday, 7 Mar 2026");
  });

  it("a week is its Monday to its Sunday, and names the month or year it crosses", () => {
    expect(rangeLabel("week", "2026-03-25")).toBe("23 – 29 Mar 2026");
    expect(rangeLabel("week", "2026-03-31")).toBe("30 Mar – 5 Apr 2026");
    expect(rangeLabel("week", "2026-12-31")).toBe("28 Dec 2026 – 3 Jan 2027");
  });

  it("a day of the week is as the grid heads it", () => {
    expect(dayLabel("2026-03-07")).toBe("Sat, 7 Mar 2026");
    expect(shortDayLabel("2026-03-12")).toBe("Thu 12 Mar");
  });
});

describe("the hours of the week and day grids", () => {
  it("are 08:00 to 17:00 when the posts fit, as the design draws them", () => {
    expect(timeRows([])).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
    expect(timeRows([9, 15])).toEqual(timeRows([]));
  });

  it("grow by one hour past an early or a late post, and stop at the day's ends", () => {
    expect(timeRows([8])[0]).toBe(7);
    expect(timeRows([17]).at(-1)).toBe(18);
    expect(timeRows([0])[0]).toBe(0);
    expect(timeRows([23]).at(-1)).toBe(23);
    expect(timeRows([6, 20])).toEqual([5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
  });

  it("a post is in the row of its WIB hour", () => {
    expect(hourOf("2026-03-07T01:00:00.000Z")).toBe(8);
    expect(hourOf("2026-03-07T17:30:00.000Z")).toBe(0);
  });
});

describe("posts by day", () => {
  it("groups by the WIB day, in order, and leaves out a post with no date", () => {
    const a = post({ id: "a", scheduledFor: "2026-03-06T18:00:00.000Z" }); // 01:00 WIB on the 7th
    const b = post({ id: "b", scheduledFor: "2026-03-07T03:00:00.000Z" });
    const c = post({ id: "c", scheduledFor: null });
    const days = groupByDay([a, b, c]);
    expect([...days.keys()]).toEqual(["2026-03-07"]);
    expect(days.get("2026-03-07")?.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("places a post in the cell of its WIB day and hour, and lists the hours the grid needs", () => {
    const a = post({ id: "a", scheduledFor: "2026-03-07T01:00:00.000Z" }); // 08:00 WIB
    const b = post({ id: "b", scheduledFor: "2026-03-07T01:45:00.000Z" }); // 08:45 WIB: the same cell
    const c = post({ id: "c", scheduledFor: "2026-03-07T13:00:00.000Z" }); // 20:00 WIB
    const d = post({ id: "d", scheduledFor: null });
    const { cells, hours } = placeByHour([a, b, c, d]);
    expect(cells.get(cellKey("2026-03-07", 8))?.map((i) => i.id)).toEqual(["a", "b"]);
    expect(cells.get(cellKey("2026-03-07", 20))?.map((i) => i.id)).toEqual(["c"]);
    expect(cells.size).toBe(2);
    // one hour of room before the earliest post and after the latest
    expect(hours[0]).toBe(7);
    expect(hours.at(-1)).toBe(21);
    expect(placeByHour([]).hours).toEqual(timeRows([]));
  });

  it("says how many a day has", () => {
    expect(postsLabel(0)).toBe("No posts");
    expect(postsLabel(1)).toBe("1 post");
    expect(postsLabel(3)).toBe("3 posts");
  });

  it("a day's line names its channels, and for one post its status and its row in the file", () => {
    const name = (p: string) => ({ linkedin: "LinkedIn", instagram: "Instagram" })[p] ?? p;
    expect(dayLine([post()], name)).toBe("1 post · LinkedIn + Instagram · Draft · source Row 1");
    expect(dayLine([post({ sourceRow: null })], name)).toBe("1 post · LinkedIn + Instagram · Draft");
    expect(dayLine([post(), post({ id: "p2", channels: ["linkedin"] })], name)).toBe("2 posts · LinkedIn + Instagram");
    expect(dayLine([], name)).toBe("No posts");
  });
});

describe("the footers of the calendar and the board", () => {
  it("the calendar's counts the posts of the range and the status split", () => {
    const c = counts({ all: 60, draft: 60 });
    expect(calendarFooter("month", "2026-03-07", 7, "all", c)).toBe("Showing 7 posts in March 2026 · 60 Draft · click a post to preview · posts with no date are in the table");
    expect(calendarFooter("week", "2026-03-25", 3, "all", c)).toContain("Showing 3 posts in the week of 23 – 29 Mar 2026 · 60 Draft · click a post to preview");
    expect(calendarFooter("day", "2026-03-07", 1, "all", c)).toContain("Showing 1 post on Sat, 7 Mar 2026 · 60 Draft · click a post to preview");
    // a status tab is already one status: no split to read
    expect(calendarFooter("month", "2026-03-07", 7, "draft", c)).toBe("Showing 7 posts in March 2026 · click a post to preview · posts with no date are in the table");
  });

  it("the board's counts the cards on it and does not talk about dragging", () => {
    expect(boardFooter(4, 60)).toBe("Showing 4 of 60 posts · grouped by status · scroll sideways for the rest");
    expect(boardFooter(4, 60)).not.toMatch(/drag/i);
  });
});

describe("the Day view's next step", () => {
  const maker = { canEditContent: true, canReview: false, canSubmitOwn: true };
  const reviewer = { canEditContent: false, canReview: true, canSubmitOwn: false };

  it("a draft is sent for review by the person who sends them", () => {
    expect(nextStep(post(), maker)).toMatch(/submit it for review to move it to In Review/);
    expect(nextStep(post(), reviewer)).not.toMatch(/submit/);
  });

  it("a post in review is answered by the reviewer and waited for by the maker", () => {
    expect(nextStep(post({ approvalStatus: "pending" }), reviewer)).toMatch(/approve it or send it back/);
    expect(nextStep(post({ approvalStatus: "pending" }), maker)).toMatch(/Waiting for the review/);
  });

  it("a post sent back says the drawer's own line", () => {
    expect(nextStep(post({ approvalStatus: "rejected" }), maker)).toBe("Revision requested. Edit the content to send it for review again.");
  });

  it("a scheduled post says when it goes out, and a published or failed one what is left to do", () => {
    expect(nextStep(post({ status: "pending" }), maker)).toBe("Approved. It goes out on 07 Mar 2026 · 08:00 WIB.");
    expect(nextStep(post({ status: "done" }), maker)).toMatch(/^Published/);
    expect(nextStep(post({ status: "failed" }), maker)).toMatch(/try again/);
  });
});
