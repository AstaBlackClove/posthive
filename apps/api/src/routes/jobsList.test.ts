import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  role: "member" as string | null,
  userId: "user-1",
  calls: [] as Array<{ fn: string; args: unknown }>,
  groups: [] as Array<{ status: string; approvalStatus: string | null; _count: number }>,
  rows: [] as unknown[],
  newest: null as unknown,
  importCount: 0,
  job: null as unknown,
  next: null as unknown,
  prev: null as unknown,
}));

vi.mock("../lib/prisma.js", () => {
  const record = (fn: string, result: (args: unknown) => unknown) =>
    vi.fn(async (args: unknown) => {
      h.calls.push({ fn, args });
      return result(args);
    });
  return {
    prisma: {
      postJob: {
        groupBy: record("groupBy", () => h.groups),
        findMany: record("findMany", () => h.rows),
        // the newest import, else a calendar's closest post (latest first = the one before the range), else one post by id
        findFirst: record("findFirst", (args) => {
          const json = JSON.stringify(args);
          if (json.includes('"importKey"')) return h.newest;
          return json.includes('"orderBy"') ? (json.includes('"desc"') ? h.prev : h.next) : h.job;
        }),
        count: record("count", () => h.importCount),
      },
    },
  };
});
vi.mock("../lib/auth/withAuth.js", () => ({
  withAuth: async () => {},
  getUser: () => ({ id: h.userId }),
  getWorkspaceId: () => "ws-1",
  getWorkspaceRole: async () => h.role,
  jobVisibilityWhere: (role: string | null, userId: string) => (role === "member" ? {} : { OR: [{ status: { not: "draft" } }, { approvalStatus: "pending" }, { userId }] }),
  isDraftVisibleTo: (role: string | null, viewerId: string, job: { status: string; userId: string; approvalStatus: string | null }) =>
    job.status !== "draft" || job.userId === viewerId || job.approvalStatus === "pending" || role === "member",
}));

import { jobsListRoutes } from "./jobsList.js";

let app: FastifyInstance;
beforeAll(async () => {
  app = Fastify();
  await app.register(jobsListRoutes);
  await app.ready();
});
afterAll(async () => {
  await app.close();
});
beforeEach(() => {
  h.role = "member";
  h.calls = [];
  h.groups = [];
  h.rows = [];
  h.newest = null;
  h.importCount = 0;
  h.job = null;
  h.next = null;
  h.prev = null;
});

const draft = (id: string, patch: Record<string, unknown> = {}) => ({
  id,
  status: "draft",
  approvalStatus: null,
  scheduledFor: new Date("2026-03-07T01:00:00Z"),
  content: JSON.stringify({ title: `Post ${id}`, text: "Caption", sourceRow: 1, platforms: ["linkedin"] }),
  targets: [],
  ...patch,
});

const call = (fn: string) => h.calls.filter((c) => c.fn === fn);

describe("GET /jobs/list", () => {
  it("answers a page of rows with the count of every filter and the page it is on", async () => {
    h.groups = [{ status: "draft", approvalStatus: null, _count: 60 }];
    h.rows = [draft("a"), draft("b")];
    const res = await app.inject({ method: "GET", url: "/jobs/list" });
    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json).toMatchObject({ total: 60, page: 1, pageSize: 10, pageCount: 6 });
    expect(json.counts).toEqual({ all: 60, draft: 60, review: 0, rejected: 0, pending: 0, done: 0, failed: 0 });
    expect(json.items).toHaveLength(2);
    expect(json.items[0]).toMatchObject({ id: "a", title: "Post a", channels: ["linkedin"], sourceRow: 1 });
    expect(json).not.toHaveProperty("source");
  });

  it("reads the page asked for: skip and take follow the page and its size", async () => {
    h.groups = [{ status: "draft", approvalStatus: null, _count: 60 }];
    await app.inject({ method: "GET", url: "/jobs/list?page=3" });
    expect(call("findMany")[0].args).toMatchObject({ skip: 20, take: 10 });
    await app.inject({ method: "GET", url: "/jobs/list?page=2&limit=25" });
    expect(call("findMany")[1].args).toMatchObject({ skip: 25, take: 25 });
  });

  it("keeps the page inside the list: past the last it is the last, a page of 0 or text is the first", async () => {
    h.groups = [{ status: "draft", approvalStatus: null, _count: 25 }];
    expect((await app.inject({ method: "GET", url: "/jobs/list?page=99" })).json().page).toBe(3);
    expect((await app.inject({ method: "GET", url: "/jobs/list?page=0" })).json().page).toBe(1);
    expect((await app.inject({ method: "GET", url: "/jobs/list?page=abc" })).json().page).toBe(1);
    expect((await app.inject({ method: "GET", url: "/jobs/list?page=-4" })).json().page).toBe(1);
  });

  it("an empty workspace is one empty page, not page 0", async () => {
    const json = (await app.inject({ method: "GET", url: "/jobs/list?page=5" })).json();
    expect(json).toMatchObject({ total: 0, page: 1, pageCount: 1, items: [] });
  });

  it("caps the page size at 50 and falls back to 10 for nonsense", async () => {
    h.groups = [{ status: "draft", approvalStatus: null, _count: 500 }];
    await app.inject({ method: "GET", url: "/jobs/list?limit=5000" });
    expect(call("findMany")[0].args).toMatchObject({ take: 50 });
    await app.inject({ method: "GET", url: "/jobs/list?limit=abc" });
    expect(call("findMany")[1].args).toMatchObject({ take: 10 });
    await app.inject({ method: "GET", url: "/jobs/list?limit=0" });
    expect(call("findMany")[2].args).toMatchObject({ take: 10 });
  });

  it("a filter totals its own count, and asks the database only for that filter's posts", async () => {
    h.groups = [
      { status: "draft", approvalStatus: null, _count: 40 },
      { status: "draft", approvalStatus: "pending", _count: 7 },
      { status: "done", approvalStatus: null, _count: 3 },
    ];
    const json = (await app.inject({ method: "GET", url: "/jobs/list?filter=review" })).json();
    expect(json).toMatchObject({ total: 7, pageCount: 1 });
    expect(JSON.stringify(call("findMany")[0].args)).toContain('"approvalStatus":"pending"');
  });

  it("an unknown filter is a 400, not an empty list", async () => {
    const res = await app.inject({ method: "GET", url: "/jobs/list?filter=everything" });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe("INVALID_FILTER");
    expect(call("findMany")).toHaveLength(0);
  });

  it("a repeated filter (a list, not a word) is a 400 and never reaches the query", async () => {
    expect((await app.inject({ method: "GET", url: "/jobs/list?filter=draft&filter=done" })).statusCode).toBe(400);
    expect(call("findMany")).toHaveLength(0);
  });

  it("soonest first, drafts with no date last, ties by id", async () => {
    await app.inject({ method: "GET", url: "/jobs/list" });
    expect((call("findMany")[0].args as { orderBy: unknown }).orderBy).toEqual([{ scheduledFor: { sort: "asc", nulls: "last" } }, { id: "asc" }]);
  });

  it("a member sees every draft; an admin only own, in-review and sent posts (the Posts page's rule)", async () => {
    h.role = "member";
    await app.inject({ method: "GET", url: "/jobs/list" });
    h.role = "admin";
    await app.inject({ method: "GET", url: "/jobs/list" });
    const member = JSON.stringify(call("groupBy")[0].args);
    const admin = JSON.stringify(call("groupBy")[1].args);
    expect(member).not.toContain('"approvalStatus":"pending"');
    expect(admin).toContain('"status":{"not":"draft"}');
    expect(admin).toContain('"userId":"user-1"');
    // the rows and the counts are cut by the same rule
    expect(JSON.stringify(call("findMany")[1].args)).toContain('"userId":"user-1"');
  });

  it("every query is for the workspace", async () => {
    await app.inject({ method: "GET", url: "/jobs/list?source=1" });
    for (const c of h.calls) expect(JSON.stringify(c.args), c.fn).toContain('"workspaceId":"ws-1"');
  });

  it("with source=1 it tells which file the newest import came from, who imported it and how many posts came in", async () => {
    h.newest = {
      content: JSON.stringify({ importSource: { fileName: "_2026 Content Marketing Plan Braga - Caption.xlsx", importedAt: "2026-11-13T03:42:00.000Z" } }),
      user: { name: "Putri Anggraini" },
    };
    h.importCount = 60;
    const json = (await app.inject({ method: "GET", url: "/jobs/list?source=1" })).json();
    expect(json.source).toEqual({
      fileName: "_2026 Content Marketing Plan Braga - Caption.xlsx",
      importedAt: "2026-11-13T03:42:00.000Z",
      importedBy: "Putri Anggraini",
      count: 60,
    });
    // the count is of that import's own timestamp, on posts that came in by import
    const countArgs = JSON.stringify(call("count")[0].args);
    expect(countArgs).toContain("2026-11-13T03:42:00.000Z");
    expect(countArgs).toContain('"importKey":{"not":null}');
  });

  it("with source=1 and no import it says so with null (not by leaving the field out)", async () => {
    const json = (await app.inject({ method: "GET", url: "/jobs/list?source=1" })).json();
    expect(json.source).toBeNull();
    expect(call("count")).toHaveLength(0);
  });

  it("an import whose post has no readable source is no source", async () => {
    h.newest = { content: JSON.stringify({ title: "x" }), user: null };
    expect((await app.inject({ method: "GET", url: "/jobs/list?source=1" })).json().source).toBeNull();
  });

  it("a row never carries the content JSON: a hostile design copy stays out of the answer", async () => {
    h.groups = [{ status: "draft", approvalStatus: null, _count: 1 }];
    h.rows = [draft("a", { content: JSON.stringify({ title: "T", designCopy: "javascript:alert(1)", assetNotes: "private", importSource: { fileName: "x" } }) })];
    const json = (await app.inject({ method: "GET", url: "/jobs/list" })).json();
    expect(json.items[0].link).toBeNull();
    expect(JSON.stringify(json)).not.toContain("private");
  });
});

// the six weeks a month grid shows: Mon 2 Mar – Sun 12 Apr 2026
const RANGE = "from=2026-03-02&to=2026-04-12";

describe("GET /jobs/calendar", () => {
  it("answers the posts of the range as list rows, with the closest posts before and after it", async () => {
    h.rows = [draft("a"), draft("b")];
    h.next = draft("n", { scheduledFor: new Date("2026-05-01T03:00:00Z") });
    h.prev = draft("p", { scheduledFor: new Date("2026-02-01T03:00:00Z") });
    const res = await app.inject({ method: "GET", url: `/jobs/calendar?${RANGE}` });
    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json).toMatchObject({ from: "2026-03-02", to: "2026-04-12", truncated: false });
    expect(json.items.map((i: { id: string }) => i.id)).toEqual(["a", "b"]);
    expect(json.items[0]).toMatchObject({ title: "Post a", channels: ["linkedin"], sourceRow: 1 });
    expect(json.next).toMatchObject({ id: "n" });
    expect(json.prev).toMatchObject({ id: "p" });
  });

  it("reads the range in WIB days; next starts the day after it and prev ends the day it starts", async () => {
    await app.inject({ method: "GET", url: `/jobs/calendar?${RANGE}` });
    // WIB is UTC+7: 2 Mar 00:00 WIB is 1 Mar 17:00 UTC
    expect(JSON.stringify(call("findMany")[0].args)).toContain('"scheduledFor":{"gte":"2026-03-01T17:00:00.000Z","lt":"2026-04-12T17:00:00.000Z"}');
    const [next, prev] = call("findFirst").map((c) => JSON.stringify(c.args));
    expect(next).toContain('"scheduledFor":{"gte":"2026-04-12T17:00:00.000Z"}');
    expect(prev).toContain('"scheduledFor":{"lt":"2026-03-01T17:00:00.000Z"}');
  });

  it("says so when there is no post before or after: null, not a missing field", async () => {
    const json = (await app.inject({ method: "GET", url: `/jobs/calendar?${RANGE}` })).json();
    expect(json).toMatchObject({ items: [], next: null, prev: null });
  });

  it("cuts at 400 posts and says the range was cut", async () => {
    h.rows = Array.from({ length: 401 }, (_, i) => draft(`p${i}`));
    const json = (await app.inject({ method: "GET", url: `/jobs/calendar?${RANGE}` })).json();
    expect(json.items).toHaveLength(400);
    expect(json.truncated).toBe(true);
  });

  it("is cut by the status filter, in the rows and in the closest posts", async () => {
    await app.inject({ method: "GET", url: `/jobs/calendar?filter=review&${RANGE}` });
    for (const c of [...call("findMany"), ...call("findFirst")]) expect(JSON.stringify(c.args)).toContain('"approvalStatus":"pending"');
  });

  it("an unknown filter is a 400 and reaches no query", async () => {
    const res = await app.inject({ method: "GET", url: `/jobs/calendar?filter=everything&${RANGE}` });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe("INVALID_FILTER");
    expect(h.calls).toHaveLength(0);
  });

  it.each([
    ["no range", ""],
    ["a day that is not one", "from=2026-02-31&to=2026-03-05"],
    ["a day that is text", "from=today&to=2026-03-05"],
    ["a range that ends before it starts", "from=2026-03-05&to=2026-03-01"],
    ["more than 42 days", "from=2026-03-01&to=2026-04-12"],
    ["a repeated day", "from=2026-03-01&from=2026-03-02&to=2026-03-05"],
    // Postgres cannot store these: asking for them would be a 500, not a 400
    ["year 0000, which Postgres cannot store", "from=0000-01-01&to=0000-01-02"],
    ["a year before 2000", "from=1999-12-30&to=1999-12-31"],
    ["a year after 2100", "from=2101-01-01&to=2101-01-02"],
  ])("%s is a 400 and reaches no query", async (_name, query) => {
    const res = await app.inject({ method: "GET", url: `/jobs/calendar?${query}` });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe("INVALID_RANGE");
    expect(h.calls).toHaveLength(0);
  });

  it("accepts exactly 42 days, a six-week month grid, and refuses one more", async () => {
    const ask = (to: string) => app.inject({ method: "GET", url: `/jobs/calendar?from=2026-10-26&to=${to}` });
    expect((await ask("2026-12-06")).statusCode).toBe(200);
    expect((await ask("2026-12-07")).statusCode).toBe(400);
  });

  it("a day is a range of one", async () => {
    expect((await app.inject({ method: "GET", url: "/jobs/calendar?from=2026-03-07&to=2026-03-07" })).statusCode).toBe(200);
  });

  it("an admin sees only own drafts, drafts in review and sent posts: the rule of the list", async () => {
    h.role = "admin";
    await app.inject({ method: "GET", url: `/jobs/calendar?${RANGE}` });
    for (const c of h.calls) {
      expect(JSON.stringify(c.args), c.fn).toContain('"userId":"user-1"');
      expect(JSON.stringify(c.args), c.fn).toContain('"workspaceId":"ws-1"');
    }
  });

  it("a row never carries the content JSON", async () => {
    h.rows = [draft("a", { content: JSON.stringify({ title: "T", assetNotes: "private" }) })];
    h.next = draft("n", { content: JSON.stringify({ title: "N", assetNotes: "private" }) });
    expect(JSON.stringify((await app.inject({ method: "GET", url: `/jobs/calendar?${RANGE}` })).json())).not.toContain("private");
  });
});

const detailRow = (patch: Record<string, unknown> = {}) => ({
  id: "p1",
  status: "draft",
  approvalStatus: null,
  scheduledFor: new Date("2026-03-07T01:00:00Z"),
  content: JSON.stringify({ title: "T", text: "A caption", designCopy: "https://docs.google.com/x", sourceRow: 1, importSource: { fileName: "plan.xlsx", importedAt: "2026-11-13T03:42:00.000Z" } }),
  commentText: null,
  createdAt: new Date("2026-11-13T03:00:00Z"),
  userId: "user-2",
  reviewNote: null,
  reviewedAt: null,
  reviewedBy: null,
  user: { name: "Putri" },
  targets: [],
  ...patch,
});

describe("GET /jobs/:id/detail", () => {
  it("answers the whole post of the drawer", async () => {
    h.job = detailRow();
    const res = await app.inject({ method: "GET", url: "/jobs/p1/detail" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      id: "p1",
      title: "T",
      caption: "A caption",
      captionLength: 9,
      link: "https://docs.google.com/x",
      source: { fileName: "plan.xlsx", importedAt: "2026-11-13T03:42:00.000Z" },
    });
    expect(res.json().activity[0]).toMatchObject({ kind: "imported", by: "Putri" });
  });

  it("lists what the post still lacks before review, from the content and the accounts it has", async () => {
    h.job = detailRow({ content: JSON.stringify({ title: "T", text: "C", category: "Blog Post" }), targets: [] });
    expect((await app.inject({ method: "GET", url: "/jobs/p1/detail" })).json().missing).toEqual(["accounts", "media"]);
    h.job = detailRow({ content: JSON.stringify({ title: "T", text: "C", category: "Blog Post", mediaUrls: ["/uploads/a.png"] }), targets: [{ status: "pending", error: null, account: { platform: "instagram", displayName: "@a" } }] });
    expect((await app.inject({ method: "GET", url: "/jobs/p1/detail" })).json().missing).toEqual([]);
  });

  it("says whether the post is the viewer's own: the drawer offers Submit only on those", async () => {
    h.job = detailRow({ userId: "user-1" });
    expect((await app.inject({ method: "GET", url: "/jobs/p1/detail" })).json().mine).toBe(true);
    h.job = detailRow({ userId: "user-2" });
    expect((await app.inject({ method: "GET", url: "/jobs/p1/detail" })).json().mine).toBe(false);
  });

  it("looks the post up in this workspace only", async () => {
    h.job = detailRow();
    await app.inject({ method: "GET", url: "/jobs/p1/detail" });
    expect(call("findFirst")[0].args).toMatchObject({ where: { id: "p1", workspaceId: "ws-1" } });
  });

  it("a post that is not there is a 404", async () => {
    expect((await app.inject({ method: "GET", url: "/jobs/nope/detail" })).statusCode).toBe(404);
  });

  it("a plain draft of someone else is a 404 for an admin, the same answer as a post that does not exist", async () => {
    h.role = "admin";
    h.job = detailRow({ userId: "user-2" });
    const hidden = await app.inject({ method: "GET", url: "/jobs/p1/detail" });
    h.job = null;
    const missing = await app.inject({ method: "GET", url: "/jobs/p1/detail" });
    expect(hidden.statusCode).toBe(404);
    expect(hidden.json()).toEqual(missing.json());
  });

  it("an admin sees a draft in review, and their own", async () => {
    h.role = "admin";
    h.job = detailRow({ approvalStatus: "pending", userId: "user-2" });
    expect((await app.inject({ method: "GET", url: "/jobs/p1/detail" })).statusCode).toBe(200);
    h.job = detailRow({ userId: "user-1" });
    expect((await app.inject({ method: "GET", url: "/jobs/p1/detail" })).statusCode).toBe(200);
  });

  it("a published post is visible to everyone", async () => {
    h.role = "designer";
    h.job = detailRow({ status: "done", userId: "user-2" });
    expect((await app.inject({ method: "GET", url: "/jobs/p1/detail" })).statusCode).toBe(200);
  });

  it("a design copy that is script is not an address in the answer", async () => {
    h.job = detailRow({ content: JSON.stringify({ title: "T", designCopy: "javascript:alert(document.cookie)" }) });
    const json = (await app.inject({ method: "GET", url: "/jobs/p1/detail" })).json();
    expect(json.link).toBeNull();
  });
});
