import { describe, expect, it } from "vitest";
import {
  addDays,
  dayWhere,
  isDateKey,
  listWhere,
  monthOf,
  quarterOf,
  rangeWhere,
  readyToSchedule,
  tasksWhere,
  toPost,
  wibKey,
  wibStart,
  type PostRecord,
} from "./dashboardData.js";

describe("the WIB day", () => {
  it("is the Jakarta day, not the UTC one: 17:00 UTC is already tomorrow in WIB", () => {
    expect(wibKey(new Date("2026-11-09T16:59:59Z"))).toBe("2026-11-09");
    expect(wibKey(new Date("2026-11-09T17:00:00Z"))).toBe("2026-11-10");
    expect(wibKey(new Date("2026-12-31T20:00:00Z"))).toBe("2027-01-01");
  });

  it("a day starts at 17:00 UTC the evening before", () => {
    expect(wibStart("2026-11-09").toISOString()).toBe("2026-11-08T17:00:00.000Z");
    expect(wibKey(wibStart("2026-11-09"))).toBe("2026-11-09");
  });

  it("adds days across a month and a year", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-11-09", -9)).toBe("2026-10-31");
  });

  it("knows a real day from a made-up one", () => {
    expect(isDateKey("2026-11-09")).toBe(true);
    expect(isDateKey("2028-02-29")).toBe(true);
    for (const bad of ["2026-02-31", "2026-13-01", "2026-1-1", "09-11-2026", "", "2026-11-09T00:00", null, undefined, 20261109]) {
      expect(isDateKey(bad), String(bad)).toBe(false);
    }
  });

  it("refuses a year the calendar does not cover: 0000 is a real day to JavaScript but its WIB start is a negative year Postgres rejects (a 500)", () => {
    for (const bad of ["0000-01-01", "0001-06-15", "1999-12-31", "2101-01-01", "9999-12-31"]) {
      expect(isDateKey(bad), bad).toBe(false);
    }
    for (const ok of ["2000-01-01", "2026-11-09", "2100-12-31"]) expect(isDateKey(ok), ok).toBe(true);
  });
});

describe("quarters and months", () => {
  it("a quarter is three whole months, named like the dashboard names it", () => {
    expect(quarterOf("2026-11-09")).toEqual({ label: "Q4 2026", start: "2026-10-01", end: "2027-01-01" });
    expect(quarterOf("2026-01-01")).toEqual({ label: "Q1 2026", start: "2026-01-01", end: "2026-04-01" });
    expect(quarterOf("2026-03-31")).toEqual({ label: "Q1 2026", start: "2026-01-01", end: "2026-04-01" });
    expect(quarterOf("2026-04-01")).toEqual({ label: "Q2 2026", start: "2026-04-01", end: "2026-07-01" });
    expect(quarterOf("2026-09-30")).toEqual({ label: "Q3 2026", start: "2026-07-01", end: "2026-10-01" });
  });

  it("the end of a quarter is the first day AFTER it, so the last day belongs to it", () => {
    const q = quarterOf("2026-12-31");
    expect(q.label).toBe("Q4 2026");
    expect("2026-12-31" < q.end).toBe(true);
    expect(quarterOf(q.end).label).toBe("Q1 2027");
  });

  it("a month, including December", () => {
    expect(monthOf("2026-11-09")).toEqual({ start: "2026-11-01", end: "2026-12-01" });
    expect(monthOf("2026-12-31")).toEqual({ start: "2026-12-01", end: "2027-01-01" });
    expect(monthOf("2028-02-29")).toEqual({ start: "2028-02-01", end: "2028-03-01" });
  });
});

describe("what each list holds", () => {
  const base = { workspaceId: "ws" };
  const now = new Date("2026-11-09T05:00:00Z"); // 12:00 WIB on the 9th
  const clauses = (w: unknown) => JSON.stringify(w);

  it("every list starts from the workspace and what the role may see", () => {
    for (const kind of ["upcoming", "attention", "risk", "activity"] as const) {
      expect(listWhere(base, kind, now)).toMatchObject({ AND: [base, expect.anything()] });
    }
  });

  it("upcoming counts from the start of today in WIB, not from this minute: a post at 08:00 today is still upcoming at noon", () => {
    const json = clauses(listWhere(base, "upcoming", now));
    expect(json).toContain("2026-11-08T17:00:00.000Z");
    expect(json).toContain('"scheduledFor":null');
  });

  it("attention includes a scheduled post that is still pending 15 minutes after its time: it did not go out and nothing else lists it", () => {
    const where = listWhere(base, "attention", now) as { AND: [unknown, { OR: Array<Record<string, unknown>> }] };
    const overdue = where.AND[1].OR.find((c) => c.status === "pending");
    // 12:00 WIB is 05:00Z; 15 minutes before it is 04:45Z
    expect(overdue).toMatchObject({ status: "pending", scheduledFor: { lt: new Date("2026-11-09T04:45:00.000Z") } });
  });

  it("attention leaves out a draft that came from a plan file (an import saves past dates as archive drafts)", () => {
    const where = listWhere(base, "attention", now) as { AND: [unknown, { OR: Array<Record<string, unknown>> }] };
    const pastDraft = where.AND[1].OR.find((c) => c.status === "draft" && "scheduledFor" in c);
    expect(pastDraft).toMatchObject({ importKey: null, scheduledFor: { lt: now } });
    expect(clauses(where)).toContain('"approvalStatus":"rejected"');
    expect(clauses(where)).toContain("post_failed");
  });

  it("at risk is a draft due in the next three days that was not sent back", () => {
    const json = clauses(listWhere(base, "risk", now));
    expect(json).toContain('"status":"draft"');
    expect(json).toContain("2026-11-12T05:00:00.000Z");
    expect(json).toContain('"not":"rejected"');
  });

  it("recent activity is what changed in the last seven days", () => {
    expect(clauses(listWhere(base, "activity", now))).toContain("2026-11-02T05:00:00.000Z");
  });

  it("a day is [start, next start) in WIB, and a range includes its last day", () => {
    expect(clauses(dayWhere(base, "2026-11-09"))).toContain('"gte":"2026-11-08T17:00:00.000Z","lt":"2026-11-09T17:00:00.000Z"');
    expect(clauses(rangeWhere(base, "2026-10-26", "2026-12-06"))).toContain('"gte":"2026-10-25T17:00:00.000Z","lt":"2026-12-06T17:00:00.000Z"');
  });

  it("ready to schedule is a plain draft with a date still ahead and an account, so an archive draft is not counted", () => {
    const json = clauses(readyToSchedule(now));
    expect(json).toContain('"scheduledFor":{"gte":"2026-11-09T05:00:00.000Z"}');
    expect(json).toContain('"targets":{"some":{}}');
    expect(json).toContain('"notIn":["pending","rejected"]');
  });

  it("my tasks are the signed-in person's own posts of that day that are not done", () => {
    const json = clauses(tasksWhere(base, "user-1", "2026-11-09"));
    expect(json).toContain('"userId":"user-1"');
    expect(json).toContain('"draft"');
    expect(json).toContain('"running"');
    expect(json).not.toContain("done");
  });
});

describe("toPost", () => {
  const record = (patch: Partial<PostRecord> = {}): PostRecord => ({
    id: "p1",
    status: "pending",
    approvalStatus: null,
    scheduledFor: new Date("2026-11-18T02:00:00Z"),
    content: JSON.stringify({ title: "5 Habits", text: "A long caption", designCopy: "x".repeat(5000), mediaUrls: [] }),
    user: { name: "Putri" },
    targets: [{ account: { platform: "instagram" } }],
    ...patch,
  });

  it("keeps what a list needs and nothing of the content (a design copy can be long)", () => {
    const post = toPost(record());
    expect(post).toEqual({
      id: "p1",
      title: "5 Habits",
      status: "pending",
      approvalStatus: null,
      scheduledFor: "2026-11-18T02:00:00.000Z",
      channels: ["instagram"],
      owner: "Putri",
      category: null,
      thumbnail: null,
    });
    expect(JSON.stringify(post)).not.toContain("xxxx");
  });

  it("a title is cut to 200 characters: a plan cell can hold a paragraph", () => {
    expect(toPost(record({ content: JSON.stringify({ title: "t".repeat(900) }) })).title).toHaveLength(200);
  });

  it("the category is what the plan file named, trimmed, or null", () => {
    expect(toPost(record({ content: JSON.stringify({ title: "T", category: "  Industry insight " }) })).category).toBe("Industry insight");
    expect(toPost(record({ content: JSON.stringify({ title: "T", category: 7 }) })).category).toBeNull();
    expect(toPost(record({ content: JSON.stringify({ title: "T", category: "c".repeat(500) }) })).category).toHaveLength(60);
  });

  describe("thumbnail", () => {
    const thumb = (mediaUrls: unknown) => toPost(record({ content: JSON.stringify({ title: "T", mediaUrls }) })).thumbnail;

    it("is the first picture: one of our uploads or an http(s) address", () => {
      expect(thumb(["/uploads/a.png", "/uploads/b.png"])).toBe("/uploads/a.png");
      expect(thumb(["https://cdn.example/a.jpg"])).toBe("https://cdn.example/a.jpg");
    });

    it("skips a video and takes the next picture; a post with only a video has none", () => {
      expect(thumb(["/uploads/clip.MP4", "/uploads/b.png"])).toBe("/uploads/b.png");
      expect(thumb(["/uploads/clip.mov?x=1"])).toBeNull();
    });

    it("never hands the browser anything but an upload path or an http(s) URL", () => {
      expect(thumb(["javascript:alert(1)", "data:image/png;base64,AAAA", "//evil.example/a.png", "../secret.png"])).toBeNull();
      expect(thumb(["/uploads/" + "a".repeat(600)])).toBeNull();
    });

    it("takes an upload only in the shape storage gives it, so a '..' cannot aim the viewer's browser at another API path", () => {
      expect(thumb(["/uploads/9f1c-aa.png"])).toBe("/uploads/9f1c-aa.png");
      expect(thumb(["/uploads/avatars/9f1c-aa.jpg"])).toBe("/uploads/avatars/9f1c-aa.jpg");
      expect(thumb(["/uploads/../auth/threads"])).toBeNull();
      expect(thumb(["/uploads/%2e%2e/auth/threads.png"])).toBeNull();
      expect(thumb(["/uploads/a/b/c.png"])).toBeNull();
      expect(thumb(["/uploads/a.png?next=/auth/threads"])).toBeNull();
      // the next one is fine: the bad entry is skipped, not the whole post
      expect(thumb(["/uploads/../x.png", "/uploads/ok.png"])).toBe("/uploads/ok.png");
    });

    it("is null when there is no media, or it is not a list, or it holds something else", () => {
      expect(thumb([])).toBeNull();
      expect(thumb("/uploads/a.png")).toBeNull();
      expect(thumb([7, null, {}])).toBeNull();
      expect(toPost(record({ content: "{}" })).thumbnail).toBeNull();
    });
  });

  it("an untitled post is called by the start of its caption, cut to 80 characters", () => {
    expect(toPost(record({ content: JSON.stringify({ text: "  Hello world  " }) })).title).toBe("Hello world");
    expect(toPost(record({ content: JSON.stringify({ text: "y".repeat(200) }) })).title).toHaveLength(80);
  });

  it("a post with no title and no caption is Untitled, and broken content does not throw", () => {
    expect(toPost(record({ content: "{}" })).title).toBe("Untitled");
    expect(toPost(record({ content: "not json" })).title).toBe("Untitled");
    for (const odd of ["null", "7", "[1,2]", '"text"']) expect(toPost(record({ content: odd })).title, odd).toBe("Untitled");
  });

  it("the channels are the accounts it goes to, once each", () => {
    const two = toPost(record({ targets: [{ account: { platform: "instagram" } }, { account: { platform: "instagram" } }, { account: { platform: "linkedin" } }] }));
    expect(two.channels).toEqual(["instagram", "linkedin"]);
  });

  it("a draft from a plan file with no account yet shows the channels the file named", () => {
    const post = toPost(record({ status: "draft", targets: [], content: JSON.stringify({ title: "T", platforms: ["linkedin", "instagram", 7] }) }));
    expect(post.channels).toEqual(["linkedin", "instagram"]);
  });

  it("the owner is the person the plan file named, else who created it, else nobody", () => {
    expect(toPost(record({ content: JSON.stringify({ title: "T", picContent: " Rina S. " }) })).owner).toBe("Rina S.");
    expect(toPost(record({ user: null })).owner).toBeNull();
  });

  it("a post with no date keeps null", () => {
    expect(toPost(record({ scheduledFor: null })).scheduledFor).toBeNull();
  });
});
