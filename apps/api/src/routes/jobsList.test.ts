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
        findFirst: record("findFirst", (args) => (JSON.stringify(args).includes('"importKey"') ? h.newest : h.job)),
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
