import { describe, expect, it } from "vitest";
import {
  calendarStatus,
  channelStats,
  eventsByDay,
  pipelineCounts,
  productionOf,
  publicationOf,
  quickStart,
  rowsByTab,
  toCalendarEvents,
  toContentRow,
  toDashboardData,
  type ApiDashboard,
  type ApiPost,
} from "./dashboard-data";
import { wibDateKey } from "./datetime";

const post = (patch: Partial<ApiPost> = {}): ApiPost => ({
  id: "p1",
  title: "5 Habits",
  status: "pending",
  approvalStatus: null,
  scheduledFor: "2026-11-18T02:00:00.000Z",
  channels: ["instagram"],
  owner: "Putri",
  ...patch,
});

const api = (patch: Partial<ApiDashboard> = {}): ApiDashboard => ({
  quarter: { label: "Q4 2026", planned: 12, published: 5 },
  inProduction: [],
  readyToSchedule: 2,
  needAttention: 1,
  todayPosts: { count: 2, posts: [post({ id: "t1" })] },
  myTasks: { count: 3, posts: [post({ id: "m1" })] },
  lists: {
    upcoming: { count: 31, posts: [post({ id: "u1" })] },
    attention: { count: 1, posts: [post({ id: "a1", status: "failed" })] },
    risk: { count: 0, posts: [] },
    activity: { count: 9, posts: [post({ id: "x1" })] },
  },
  channels: [{ platform: "instagram", accounts: 1, handle: "@postly.studio", posts: 4 }],
  setup: { imported: false, created: true, accounts: 1, members: 1, invites: 0 },
  ...patch,
});

describe("a post's production stage: only what the app records", () => {
  it("a plain draft needs a brief", () => {
    expect(productionOf({ status: "draft", approvalStatus: null })).toBe("brief");
    expect(productionOf({ status: "draft", approvalStatus: "approved" })).toBe("brief");
  });
  it("waiting for review is In review, sent back is Changes requested", () => {
    expect(productionOf({ status: "draft", approvalStatus: "pending" })).toBe("review");
    expect(productionOf({ status: "draft", approvalStatus: "rejected" })).toBe("changes");
  });
  it("a post that is scheduled or out is past making: Approved", () => {
    for (const status of ["pending", "running", "done", "post_done", "comment_done", "failed", "post_failed"]) {
      expect(productionOf({ status, approvalStatus: null }), status).toBe("approved");
    }
  });
});

describe("a post's publication stage", () => {
  it("scheduled while it waits for its time, published once it went out, failed when it could not be, nothing for a draft", () => {
    expect(publicationOf({ status: "pending" })).toBe("scheduled");
    expect(publicationOf({ status: "running" })).toBe("scheduled");
    for (const s of ["done", "post_done", "comment_done"]) expect(publicationOf({ status: s }), s).toBe("published");
    for (const s of ["failed", "post_failed", "comment_failed"]) expect(publicationOf({ status: s }), s).toBe("failed");
    expect(publicationOf({ status: "draft" })).toBeNull();
  });
});

describe("toContentRow", () => {
  it("is the table's row: first channel, how many more, date, owner and both statuses", () => {
    expect(toContentRow(post({ channels: ["linkedin", "instagram", "mastodon"] }))).toEqual({
      id: "p1", title: "5 Habits", channel: "linkedin", alsoOn: 2, publishAt: "2026-11-18T02:00:00.000Z", owner: "Putri",
      production: "approved", publication: "scheduled",
    });
  });
  it("a draft has no publication stage: null, not one it has not reached", () => {
    const row = toContentRow(post({ status: "draft", approvalStatus: "pending", scheduledFor: null, channels: [], owner: null }));
    expect(row).toMatchObject({ channel: "", alsoOn: 0, publishAt: null, owner: null, production: "review", publication: null });
  });
  it("a failed post is shown as Failed, not as scheduled or published", () => {
    expect(toContentRow(post({ status: "failed" })).publication).toBe("failed");
    expect(toContentRow(post({ status: "post_failed" })).publication).toBe("failed");
  });
});

describe("pipeline", () => {
  it("counts drafts by where their approval puts them", () => {
    const counts = pipelineCounts([
      { status: "draft", approvalStatus: null, count: 4 },
      { status: "draft", approvalStatus: "approved", count: 1 },
      { status: "draft", approvalStatus: "pending", count: 2 },
      { status: "draft", approvalStatus: "rejected", count: 3 },
    ]);
    expect(counts).toMatchObject({ brief: 5, review: 2, changes: 3, copywriting: 0, design: 0, approved: 0, scheduled: 0, published: 0 });
  });

  it("Approved is a post that went through approval and now waits for its time; one scheduled straight away never was in production", () => {
    const counts = pipelineCounts([
      { status: "pending", approvalStatus: "approved", count: 3 },
      { status: "running", approvalStatus: "approved", count: 1 },
      { status: "pending", approvalStatus: null, count: 9 },
    ]);
    expect(counts.approved).toBe(4);
  });

  it("every stage is present, zero when empty", () => {
    expect(Object.values(pipelineCounts([])).every((n) => n === 0)).toBe(true);
    expect(Object.keys(pipelineCounts([]))).toHaveLength(9); // the design's eight and Failed
  });
});

describe("quick start", () => {
  const setup = { imported: false, created: false, accounts: 0, members: 1, invites: 0 };

  it("a new workspace has all four steps, with the quarter and the product named", () => {
    const { steps, done } = quickStart(setup, "Q4 2026", "Postly");
    expect(steps.map((s) => s.step)).toEqual([1, 2, 3, 4]);
    expect(done).toBe(false);
    expect(steps[0].description).toContain("Q4 2026");
    expect(steps[2].description).toContain("Postly");
    expect(JSON.stringify(steps)).not.toMatch(/\{quarter\}|\{brand\}/);
  });

  it("a step goes away once it is done: a plan imported, a post made, an account connected, a teammate invited", () => {
    expect(quickStart({ ...setup, imported: true }, "Q4", "P").steps.map((s) => s.step)).toEqual([2, 3, 4]);
    expect(quickStart({ ...setup, created: true }, "Q4", "P").steps.map((s) => s.step)).toEqual([1, 3, 4]);
    expect(quickStart({ ...setup, accounts: 1 }, "Q4", "P").steps.map((s) => s.step)).toEqual([1, 2, 4]);
    expect(quickStart({ ...setup, members: 2 }, "Q4", "P").steps.map((s) => s.step)).toEqual([1, 2, 3]);
    expect(quickStart({ ...setup, invites: 1 }, "Q4", "P").steps.map((s) => s.step)).toEqual([1, 2, 3]);
  });

  it("the banner is done when every step is", () => {
    const done = quickStart({ imported: true, created: true, accounts: 2, members: 3, invites: 0 }, "Q4", "P");
    expect(done.steps).toEqual([]);
    expect(done.done).toBe(true);
  });

  it("the design's heading is for a workspace where nothing is done; after that it is about finishing", () => {
    expect(quickStart(setup, "Q4", "Postly").title).toBeUndefined();
    expect(quickStart({ ...setup, accounts: 1 }, "Q4", "Postly").title).toBe("Finish setting up Postly");
    expect(quickStart({ ...setup, invites: 1 }, "Q4", "Postly").title).toBe("Finish setting up Postly");
  });

  it("a person who can open only some of the steps still gets the new-workspace heading when nothing is done", () => {
    const member = (href: string) => !["/accounts", "/team"].includes(href);
    expect(quickStart(setup, "Q4", "Postly", member).title).toBeUndefined();
  });

  it("a person only sees steps whose page their role opens", () => {
    const designer = (href: string) => !["/compose", "/jobs/import", "/accounts", "/team"].includes(href);
    expect(quickStart(setup, "Q4", "P", designer)).toMatchObject({ steps: [], done: true });
    const member = (href: string) => !["/accounts", "/team"].includes(href);
    expect(quickStart(setup, "Q4", "P", member).steps.map((s) => s.step)).toEqual([1, 2]);
  });
});

describe("channels", () => {
  it("Instagram and LinkedIn are always listed; one with an account shows its name and the month's posts", () => {
    expect(channelStats([{ platform: "instagram", accounts: 1, handle: "@postly.studio", posts: 4 }])).toEqual([
      { platform: "instagram", handle: "@postly.studio", connected: true, posts: 4 },
      { platform: "linkedin", handle: null, connected: false, posts: 0 },
    ]);
  });
  it("another channel the workspace has connected is added after them", () => {
    const list = channelStats([{ platform: "mastodon", accounts: 1, handle: "@x@mastodon.social", posts: 2 }]);
    expect(list.map((c) => [c.platform, c.connected])).toEqual([["instagram", false], ["linkedin", false], ["mastodon", true]]);
  });
  it("no channels at all: the two of the design, not connected", () => {
    expect(channelStats([]).every((c) => !c.connected && c.handle === null && c.posts === 0)).toBe(true);
  });
});

describe("toDashboardData", () => {
  const build = (a = api()) => toDashboardData({ api: a, userName: "Putri", brand: "Postly" });

  it("takes the numbers the server counted", () => {
    const d = build();
    expect(d.plan).toEqual({ label: "Q4 2026", planned: 12 });
    expect(d.published).toBe(5);
    expect(d.readyToSchedule).toBe(2);
    expect(d.needAttention).toBe(1);
    expect(d.tasksToday).toBe(3);
    expect(d.today.count).toBe(2);
    expect(d.tabCounts).toEqual({ upcoming: 31, attention: 1, risk: 0, activity: 9 });
  });

  it("invents no quota: nothing stores one", () => {
    expect("quota" in build().plan).toBe(false);
  });

  it("the tab counts are the true totals, the rows are the cut lists", () => {
    const d = build();
    expect(d.tabCounts.upcoming).toBe(31);
    expect(rowsByTab(api()).upcoming).toHaveLength(1);
    expect(d.taskRows).toHaveLength(1);
    expect(d.today.rows).toHaveLength(1);
  });

  it("there are no milestones yet: nothing records them", () => {
    expect(build().milestones.count).toBe(0);
  });

  it("hides the quick start once the workspace is set up", () => {
    expect(build().quickStartDone).toBe(false);
    expect(build(api({ setup: { imported: true, created: true, accounts: 1, members: 2, invites: 0 } })).quickStartDone).toBe(true);
  });

  it("rowsByTab gives each tab its own list", () => {
    const rows = rowsByTab(api());
    expect(rows.upcoming.map((r) => r.id)).toEqual(["u1"]);
    expect(rows.attention.map((r) => r.id)).toEqual(["a1"]);
    expect(rows.risk).toEqual([]);
    expect(rows.activity.map((r) => r.id)).toEqual(["x1"]);
  });

  it("all text is English", () => {
    expect(JSON.stringify(build())).not.toMatch(/Tambah|Quartal|Akun/);
  });
});

describe("calendar", () => {
  it("a post shows the status it is in: out, waiting for its time, failed, else where it is in production", () => {
    expect(calendarStatus(post({ status: "failed" }))).toBe("failed");
    expect(calendarStatus(post({ status: "done" }))).toBe("published");
    expect(calendarStatus(post({ status: "pending" }))).toBe("scheduled");
    expect(calendarStatus(post({ status: "draft", approvalStatus: "rejected" }))).toBe("changes");
    expect(calendarStatus(post({ status: "draft" }))).toBe("brief");
  });

  it("events sit on the WIB day, not the UTC one: 20:00 UTC is already tomorrow in Jakarta", () => {
    const events = toCalendarEvents([post({ scheduledFor: "2026-11-09T20:00:00.000Z" }), post({ id: "p2", scheduledFor: "2026-11-09T16:59:00.000Z" })], (iso) => wibDateKey(new Date(iso)));
    expect(events.map((e) => e.day)).toEqual(["2026-11-10", "2026-11-09"]);
  });

  it("a post with no date has no day, so it is not on the grid", () => {
    expect(toCalendarEvents([post({ scheduledFor: null })], (i) => i)).toEqual([]);
  });

  it("groups the events of a day, in the order they came", () => {
    const events = toCalendarEvents([post({ id: "a" }), post({ id: "b" }), post({ id: "c", scheduledFor: "2026-11-19T02:00:00.000Z" })], (iso) => iso.slice(0, 10));
    const days = eventsByDay(events);
    expect(days.get("2026-11-18")!.map((e) => e.id)).toEqual(["a", "b"]);
    expect(days.get("2026-11-19")!.map((e) => e.id)).toEqual(["c"]);
  });
});
