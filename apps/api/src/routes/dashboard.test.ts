import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  role: "member" as string | null,
  userId: "user-1",
  calls: [] as Array<{ model: string; fn: string; args: unknown }>,
  groups: [] as Array<{ status: string; approvalStatus?: string | null; _count: number }>,
  quarterGroups: [] as Array<{ status: string; _count: number }>,
  accounts: [] as Array<{ id: string; platform: string; displayName: string }>,
  targets: [] as Array<{ accountId: string; _count: { accountId: number } }>,
  counts: {} as Record<string, number>,
  posts: [] as unknown[],
  calendar: [] as unknown[],
  imported: null as { id: string } | null,
  created: null as { id: string } | null,
}));

vi.mock("../lib/prisma.js", () => {
  const record = (model: string, fn: string, result: (args: unknown) => unknown) =>
    vi.fn(async (args: unknown) => {
      h.calls.push({ model, fn, args });
      return result(args);
    });
  const hasKey = (args: unknown) => JSON.stringify(args).includes('"importKey"');
  return {
    prisma: {
      postJob: {
        groupBy: record("postJob", "groupBy", (args) =>
          (args as { by: string[] }).by.length === 2 ? h.groups : h.quarterGroups),
        count: record("postJob", "count", (args) => {
          // Each count has one clause nothing else has; the order matters (the more specific first)
          const json = JSON.stringify(args);
          if (json.includes('"updatedAt"')) return h.counts.activity ?? 0;
          if (json.includes('"userId":"user-1","status"')) return h.counts.tasks ?? 0;
          if (json.includes('"targets"')) return h.counts.ready ?? 0;
          if (json.includes('"scheduledFor":{"gte":"2026-11-09T05:00:00.000Z"')) return h.counts.risk ?? 0;
          if (json.includes('"importKey":null')) return h.counts.attention ?? 0;
          if (json.includes('"lt":"2026-11-09T17:00:00.000Z"')) return h.counts.today ?? 0;
          return h.counts.upcoming ?? 0;
        }),
        findMany: record("postJob", "findMany", (args) => {
          const json = JSON.stringify(args);
          return json.includes('"take":401') ? h.calendar : h.posts;
        }),
        findFirst: record("postJob", "findFirst", (args) => (hasKey(args) && JSON.stringify(args).includes('"not":null') ? h.imported : h.created)),
      },
      account: { findMany: record("account", "findMany", () => h.accounts) },
      postJobTarget: { groupBy: record("postJobTarget", "groupBy", () => h.targets) },
      workspaceMember: { count: record("workspaceMember", "count", () => 3) },
      workspaceInvite: { count: record("workspaceInvite", "count", () => 1) },
    },
  };
});
vi.mock("../lib/auth/withAuth.js", () => ({
  withAuth: async () => {},
  getUser: () => ({ id: h.userId }),
  getWorkspaceId: () => "ws-1",
  getWorkspaceRole: async () => h.role,
  jobVisibilityWhere: (role: string | null, userId: string) => (role === "member" ? {} : { OR: [{ status: { not: "draft" } }, { approvalStatus: "pending" }, { userId }] }),
}));

import { dashboardRoutes } from "./dashboard.js";

let app: FastifyInstance;
beforeAll(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-09T05:00:00Z")); // 12:00 WIB on 9 Nov 2026
  app = Fastify();
  await app.register(dashboardRoutes);
  await app.ready();
});
afterAll(async () => {
  vi.useRealTimers();
  await app.close();
});
beforeEach(() => {
  h.role = "member";
  h.calls = [];
  h.groups = [];
  h.quarterGroups = [];
  h.accounts = [];
  h.targets = [];
  h.counts = {};
  h.posts = [];
  h.calendar = [];
  h.imported = null;
  h.created = null;
});

const post = (id: string, patch: Record<string, unknown> = {}) => ({
  id,
  status: "pending",
  approvalStatus: null,
  scheduledFor: new Date("2026-11-18T02:00:00Z"),
  content: JSON.stringify({ title: `Post ${id}` }),
  user: { name: "Putri" },
  targets: [{ account: { platform: "instagram" } }],
  ...patch,
});

describe("GET /dashboard", () => {
  it("names the quarter from the WIB calendar and counts what is planned and what is out", async () => {
    h.quarterGroups = [{ status: "draft", _count: 4 }, { status: "pending", _count: 3 }, { status: "done", _count: 5 }, { status: "post_done", _count: 1 }, { status: "failed", _count: 2 }];
    const json = (await app.inject({ method: "GET", url: "/dashboard" })).json();
    expect(json.quarter).toEqual({ label: "Q4 2026", planned: 15, published: 6 });
  });

  it("asks for the quarter in WIB: from 1 Oct 00:00 WIB to 1 Jan 00:00 WIB", async () => {
    await app.inject({ method: "GET", url: "/dashboard" });
    const quarter = h.calls.find((c) => c.fn === "groupBy" && JSON.stringify(c.args).includes("2026-09-30T17:00:00.000Z"));
    expect(quarter).toBeTruthy();
    expect(JSON.stringify(quarter!.args)).toContain("2026-12-31T17:00:00.000Z");
  });

  it("hands over the in-production posts as status and approval pairs for the browser to place in stages", async () => {
    h.groups = [{ status: "draft", approvalStatus: null, _count: 2 }, { status: "draft", approvalStatus: "pending", _count: 1 }];
    const json = (await app.inject({ method: "GET", url: "/dashboard" })).json();
    expect(json.inProduction).toEqual([
      { status: "draft", approvalStatus: null, count: 2 },
      { status: "draft", approvalStatus: "pending", count: 1 },
    ]);
  });

  it("carries the counts and the posts of every list, with the true total next to a cut list", async () => {
    h.counts = { upcoming: 31, attention: 2, risk: 1, activity: 40, ready: 5, today: 3, tasks: 2 };
    h.posts = [post("a"), post("b")];
    const json = (await app.inject({ method: "GET", url: "/dashboard" })).json();
    expect(json.lists.upcoming.count).toBe(31);
    expect(json.lists.upcoming.posts).toHaveLength(2);
    expect(json.lists.attention.count).toBe(2);
    expect(json.lists.risk.count).toBe(1);
    expect(json.lists.activity.count).toBe(40);
    expect(json.needAttention).toBe(2);
    expect(json.readyToSchedule).toBe(5);
    expect(json.todayPosts.count).toBe(3);
    expect(json.myTasks.count).toBe(2);
    expect(json.lists.upcoming.posts[0]).toMatchObject({ id: "a", title: "Post a", channels: ["instagram"], owner: "Putri" });
  });

  it("never sends the content of a post, only what a list shows", async () => {
    h.posts = [post("a", { content: JSON.stringify({ title: "T", designCopy: "SECRET-DESIGN-COPY", mediaUrls: ["u"] }) })];
    const text = (await app.inject({ method: "GET", url: "/dashboard" })).body;
    expect(text).not.toContain("SECRET-DESIGN-COPY");
    expect(text).not.toContain('"content"');
  });

  it("lists a connected channel once with its first account's name and the month's published and scheduled posts", async () => {
    h.accounts = [
      { id: "a1", platform: "instagram", displayName: "@postly.studio" },
      { id: "a2", platform: "instagram", displayName: "@postly.second" },
      { id: "a3", platform: "linkedin", displayName: "Postly Studio" },
    ];
    h.targets = [{ accountId: "a1", _count: { accountId: 4 } }, { accountId: "a2", _count: { accountId: 2 } }];
    const json = (await app.inject({ method: "GET", url: "/dashboard" })).json();
    expect(json.channels).toEqual([
      { platform: "instagram", accounts: 2, handle: "@postly.studio", posts: 6 },
      { platform: "linkedin", accounts: 1, handle: "Postly Studio", posts: 0 },
    ]);
  });

  it("asks for the month in WIB too", async () => {
    await app.inject({ method: "GET", url: "/dashboard" });
    const month = h.calls.find((c) => c.model === "postJobTarget");
    expect(JSON.stringify(month!.args)).toContain("2026-10-31T17:00:00.000Z");
    expect(JSON.stringify(month!.args)).toContain("2026-11-30T17:00:00.000Z");
  });

  it("says what is set up, for the quick start", async () => {
    h.imported = { id: "x" };
    h.accounts = [{ id: "a1", platform: "instagram", displayName: "@x" }];
    const json = (await app.inject({ method: "GET", url: "/dashboard" })).json();
    expect(json.setup).toEqual({ imported: true, created: false, accounts: 1, members: 3, invites: 1 });
  });

  it("applies the role's draft visibility to every post query: the same rule as the Posts page", async () => {
    h.role = "admin";
    await app.inject({ method: "GET", url: "/dashboard" });
    const postQueries = h.calls.filter((c) => c.model === "postJob" && c.fn !== "findFirst");
    expect(postQueries.length).toBeGreaterThan(8);
    for (const q of postQueries) expect(JSON.stringify(q.args), `${q.fn}`).toContain('"approvalStatus":"pending"');
    for (const q of postQueries) expect(JSON.stringify(q.args)).toContain('"workspaceId":"ws-1"');
  });

  it("a member sees every draft: no visibility filter is added", async () => {
    h.role = "member";
    await app.inject({ method: "GET", url: "/dashboard" });
    const list = h.calls.find((c) => c.model === "postJob" && c.fn === "findMany");
    expect(JSON.stringify(list!.args)).not.toContain('"approvalStatus":"pending"');
  });

  it("sorts the lists soonest first with undated drafts last, and recent activity by latest change", async () => {
    await app.inject({ method: "GET", url: "/dashboard" });
    const orders = h.calls.filter((c) => c.fn === "findMany" && c.model === "postJob").map((c) => JSON.stringify((c.args as { orderBy: unknown }).orderBy));
    expect(orders.filter((o) => o.includes('"nulls":"last"'))).toHaveLength(3);
    expect(orders.filter((o) => o.includes('"updatedAt":"desc"'))).toHaveLength(1);
  });

  it("the signed-in person's tasks are filtered by their id", async () => {
    h.userId = "user-1";
    await app.inject({ method: "GET", url: "/dashboard" });
    const tasks = h.calls.find((c) => c.model === "postJob" && c.fn === "findMany" && JSON.stringify(c.args).includes('"userId":"user-1","status"'));
    expect(tasks).toBeTruthy();
  });
});

describe("GET /dashboard/calendar", () => {
  const get = (query: string) => app.inject({ method: "GET", url: `/dashboard/calendar${query}` });

  it("returns the posts of the range and asks for it in WIB, last day included", async () => {
    h.calendar = [post("a"), post("b")];
    const res = await get("?from=2026-10-26&to=2026-12-06");
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ from: "2026-10-26", to: "2026-12-06", truncated: false });
    expect(res.json().posts.map((p: { id: string }) => p.id)).toEqual(["a", "b"]);
    const query = h.calls.find((c) => c.fn === "findMany");
    expect(JSON.stringify(query!.args)).toContain('"gte":"2026-10-25T17:00:00.000Z","lt":"2026-12-06T17:00:00.000Z"');
  });

  it("says when the range held more than it sends", async () => {
    h.calendar = Array.from({ length: 401 }, (_, i) => post(`p${i}`));
    const json = (await get("?from=2026-11-01&to=2026-11-30")).json();
    expect(json.truncated).toBe(true);
    expect(json.posts).toHaveLength(400);
  });

  it.each([
    ["year 0000, which Postgres cannot store", "?from=0000-01-01&to=0000-01-02"],
    ["a year before 2000", "?from=1999-12-30&to=1999-12-31"],
    ["a year after 2100", "?from=2101-01-01&to=2101-01-02"],
    ["no range", ""],
    ["no end", "?from=2026-11-01"],
    ["a day that does not exist", "?from=2026-02-31&to=2026-03-05"],
    ["a wrong format", "?from=01-11-2026&to=30-11-2026"],
    ["an end before the start", "?from=2026-11-10&to=2026-11-01"],
    ["more than 42 days", "?from=2026-11-01&to=2026-12-20"],
  ])("refuses %s", async (_label, query) => {
    const res = await get(query);
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe("INVALID_RANGE");
    expect(h.calls).toEqual([]);
  });

  it("accepts exactly 42 days, a six-week month grid", async () => {
    expect((await get("?from=2026-10-26&to=2026-12-06")).statusCode).toBe(200);
    expect((await get("?from=2026-10-26&to=2026-12-07")).statusCode).toBe(400);
  });

  it("applies the same draft visibility as the list", async () => {
    h.role = "designer";
    await get("?from=2026-11-01&to=2026-11-30");
    expect(JSON.stringify(h.calls[0].args)).toContain('"approvalStatus":"pending"');
  });
});
