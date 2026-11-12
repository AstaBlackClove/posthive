import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  role: "member" as string | null,
  userId: "user-1",
  calls: [] as Array<{ model: string; fn: string; args: unknown }>,
  groups: [] as Array<{ status: string; approvalStatus?: string | null; _count: number }>,
  attentionGroups: [] as Array<{ status: string; approvalStatus: string | null; _count: number }>,
  quarterGroups: [] as Array<{ status: string; _count: number }>,
  quarterPosts: [] as Array<{ status: string; content: string }>,
  accounts: [] as Array<{ id: string; platform: string; displayName: string }>,
  targets: [] as Array<{ accountId: string; _count: { accountId: number } }>,
  counts: {} as Record<string, number>,
  posts: [] as unknown[],
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
        // Two keys: the in-production pairs, or the attention list's own (the only one with the plan-import clause)
        groupBy: record("postJob", "groupBy", (args) => {
          if ((args as { by: string[] }).by.length !== 2) return h.quarterGroups;
          return JSON.stringify(args).includes('"importKey":null') ? h.attentionGroups : h.groups;
        }),
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
          if (json.includes('"take":5000')) return h.quarterPosts;
          return h.posts;
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
  h.attentionGroups = [];
  h.quarterGroups = [];
  h.quarterPosts = [];
  h.accounts = [];
  h.targets = [];
  h.counts = {};
  h.posts = [];
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
  const inQuarter = (status: string, content: Record<string, unknown> = {}) => ({ status, content: JSON.stringify(content) });
  const quarterRead = () => h.calls.find((c) => c.fn === "findMany" && JSON.stringify(c.args).includes('"take":5000'));
  const quarterCounts = () => h.calls.find((c) => c.fn === "groupBy" && (c.args as { by: string[] }).by.length === 1 && JSON.stringify(c.args).includes("2026-09-30T17:00:00.000Z"));

  it("names the quarter from the WIB calendar and counts what is planned and what is out", async () => {
    h.quarterGroups = [{ status: "draft", _count: 4 }, { status: "pending", _count: 3 }, { status: "done", _count: 5 }, { status: "post_done", _count: 1 }, { status: "failed", _count: 2 }];
    const json = (await app.inject({ method: "GET", url: "/dashboard" })).json();
    expect(json.quarter).toEqual({ label: "Q4 2026", planned: 15, published: 6, milestones: [], uncategorized: 15 });
  });

  it("the totals are counted by the database over the WHOLE quarter, so thousands of posts with no category (drip) never cut them", async () => {
    h.quarterGroups = [{ status: "pending", _count: 9000 }, { status: "done", _count: 40 }];
    h.quarterPosts = [inQuarter("done", { category: "Case Study" })];
    const json = (await app.inject({ method: "GET", url: "/dashboard" })).json();
    expect(json.quarter).toMatchObject({ planned: 9040, published: 40, uncategorized: 9039 });
    expect(json.quarter.milestones).toEqual([{ category: "Case Study", planned: 1, posted: 1, scheduled: 0 }]);
  });

  it("answers a milestone per content category: its target is what the plan holds, and what is out of it", async () => {
    h.quarterGroups = [{ status: "done", _count: 1 }, { status: "pending", _count: 1 }, { status: "draft", _count: 4 }];
    h.quarterPosts = [
      inQuarter("done", { category: "Product Features" }),
      inQuarter("pending", { category: "Product Features" }),
      inQuarter("draft", { category: "Product Features", sourceStatus: "Published" }),
      inQuarter("draft", { category: "Product Features" }),
      inQuarter("draft", { category: "Internal Event" }),
    ];
    const json = (await app.inject({ method: "GET", url: "/dashboard" })).json();
    expect(json.quarter.milestones).toEqual([
      { category: "Product Features", planned: 4, posted: 2, scheduled: 1 },
      { category: "Internal Event", planned: 1, posted: 0, scheduled: 0 },
    ]);
    // the plan row marked Published is one more published post, on top of the one the app sent
    expect(json.quarter).toMatchObject({ planned: 6, published: 2, uncategorized: 1 });
  });

  it("asks for the quarter in WIB, from 1 Oct 00:00 WIB to 1 Jan 00:00 WIB, for the counts and for the read", async () => {
    await app.inject({ method: "GET", url: "/dashboard" });
    for (const q of [quarterCounts(), quarterRead()]) {
      expect(q).toBeTruthy();
      expect(JSON.stringify(q!.args)).toContain("2026-09-30T17:00:00.000Z");
      expect(JSON.stringify(q!.args)).toContain("2026-12-31T17:00:00.000Z");
    }
  });

  it("reads only what the milestones need: the status and content of posts that name a category or are a Published plan row", async () => {
    await app.inject({ method: "GET", url: "/dashboard" });
    const read = quarterRead()!.args as { select: unknown; where: unknown };
    expect(read.select).toEqual({ status: true, content: true });
    const where = JSON.stringify(read.where);
    // the stored content is compact JSON, so these are the exact strings a categorized or Published row holds
    expect(where).toContain('{"content":{"contains":"\\"category\\":\\""}}');
    expect(where).toContain('"status":"draft","content":{"contains":"\\"sourceStatus\\":\\"Published\\"","mode":"insensitive"}');
  });

  it("the quarter's counts and read follow the role's draft visibility, like every other number on the page", async () => {
    h.role = "admin";
    await app.inject({ method: "GET", url: "/dashboard" });
    expect(JSON.stringify(quarterCounts()!.args)).toContain('"approvalStatus":"pending"');
    expect(JSON.stringify(quarterRead()!.args)).toContain('"approvalStatus":"pending"');
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
    h.counts = { upcoming: 31, risk: 1, activity: 40, ready: 5, today: 3, tasks: 2 };
    h.attentionGroups = [{ status: "failed", approvalStatus: null, _count: 2 }];
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

  it("counts the attention posts by what they are, all of them, however many a page holds", async () => {
    h.role = "admin";
    h.attentionGroups = [{ status: "failed", approvalStatus: null, _count: 12 }, { status: "draft", approvalStatus: "rejected", _count: 3 }];
    const json = (await app.inject({ method: "GET", url: "/dashboard" })).json();
    expect(json.needAttention).toBe(15);
    expect(json.lists.attention.count).toBe(15);
    expect(json.needAttentionBy).toEqual([
      { status: "failed", approvalStatus: null, count: 12 },
      { status: "draft", approvalStatus: "rejected", count: 3 },
    ]);
    // one query for the total and the split, with the attention filter and the role's visibility
    const grouped = h.calls.filter((c) => c.fn === "groupBy" && JSON.stringify(c.args).includes('"importKey":null'));
    expect(grouped).toHaveLength(1);
    expect(JSON.stringify(grouped[0].args)).toContain('"approvalStatus":"pending"');
    expect(h.calls.filter((c) => c.fn === "count" && JSON.stringify(c.args).includes('"importKey":null'))).toHaveLength(0);
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
    const list = h.calls.find((c) => c.model === "postJob" && c.fn === "findMany" && !JSON.stringify(c.args).includes('"take":5000'));
    expect(JSON.stringify(list!.args)).not.toContain('"approvalStatus":"pending"');
  });

  it("sorts the lists soonest first with undated drafts last, and recent activity by latest change", async () => {
    await app.inject({ method: "GET", url: "/dashboard" });
    // the quarter's count reads every post and has no order
    const orders = h.calls.filter((c) => c.fn === "findMany" && c.model === "postJob" && "orderBy" in (c.args as object)).map((c) => JSON.stringify((c.args as { orderBy: unknown }).orderBy));
    expect(orders.filter((o) => o.includes('"nulls":"last"'))).toHaveLength(3);
    expect(orders.filter((o) => o.includes('"updatedAt":"desc"'))).toHaveLength(1);
  });

  it("the signed-in person's tasks are filtered by their id", async () => {
    h.userId = "user-1";
    await app.inject({ method: "GET", url: "/dashboard" });
    const tasks = h.calls.find((c) => c.model === "postJob" && c.fn === "findMany" && JSON.stringify(c.args).includes('"userId":"user-1","status"'));
    expect(tasks).toBeTruthy();
  });

  it("sends only the first 10 rows of each list: the rest are asked for a page at a time", async () => {
    await app.inject({ method: "GET", url: "/dashboard" });
    const lists = h.calls.filter((c) => c.fn === "findMany" && c.model === "postJob" && JSON.stringify((c.args as { orderBy?: unknown }).orderBy ?? "").match(/nulls|updatedAt/) && !JSON.stringify(c.args).includes('"userId":"user-1","status"'));
    expect(lists).toHaveLength(4);
    for (const q of lists) expect((q.args as { take: number }).take).toBe(10);
  });
});

describe("GET /dashboard/content", () => {
  const pageQuery = () => h.calls.find((c) => c.fn === "findMany" && c.model === "postJob")!.args as { skip: number; take: number; where: unknown; orderBy: unknown };

  it("answers the page asked for with the true total and the number of pages", async () => {
    h.counts = { upcoming: 31 };
    h.posts = [post("a"), post("b")];
    const json = (await app.inject({ method: "GET", url: "/dashboard/content?tab=upcoming&page=2" })).json();
    expect(json).toMatchObject({ count: 31, page: 2, pageCount: 4 });
    expect(json.posts).toHaveLength(2);
    expect(json.posts[0]).toMatchObject({ id: "a", title: "Post a", channels: ["instagram"], owner: "Putri" });
    expect(pageQuery()).toMatchObject({ skip: 10, take: 10 });
  });

  it("the first page, and a page that is not a number, start at the first row", async () => {
    h.counts = { upcoming: 31 };
    for (const url of ["/dashboard/content?tab=upcoming", "/dashboard/content?tab=upcoming&page=abc", "/dashboard/content?tab=upcoming&page=-3"]) {
      h.calls = [];
      expect((await app.inject({ method: "GET", url })).json().page, url).toBe(1);
      expect(pageQuery().skip, url).toBe(0);
    }
  });

  it("a page past the end answers the last page, and an empty list is one empty page", async () => {
    h.counts = { upcoming: 31 };
    const last = (await app.inject({ method: "GET", url: "/dashboard/content?tab=upcoming&page=99" })).json();
    expect(last).toMatchObject({ page: 4, pageCount: 4 });
    expect(pageQuery().skip).toBe(30);
    h.counts = {};
    h.calls = [];
    expect((await app.inject({ method: "GET", url: "/dashboard/content?tab=upcoming&page=5" })).json()).toMatchObject({ count: 0, page: 1, pageCount: 1, posts: [] });
  });

  it("an unknown or missing tab is refused before anything is read", async () => {
    for (const url of ["/dashboard/content?tab=nope", "/dashboard/content"]) {
      h.calls = [];
      const res = await app.inject({ method: "GET", url });
      expect(res.statusCode, url).toBe(400);
      expect(res.json().code, url).toBe("INVALID_TAB");
      expect(h.calls, url).toHaveLength(0);
    }
  });

  it("each tab is counted and read with its own filter: the same one /dashboard uses", async () => {
    const countOf = async (tab: string) => {
      h.calls = [];
      await app.inject({ method: "GET", url: `/dashboard/content?tab=${tab}` });
      return JSON.stringify(h.calls.find((c) => c.fn === "count")!.args);
    };
    expect(await countOf("activity")).toContain('"updatedAt"');
    expect(await countOf("risk")).toContain('"scheduledFor":{"gte":"2026-11-09T05:00:00.000Z"');
    expect(await countOf("attention")).toContain('"importKey":null');
    expect(await countOf("upcoming")).toContain('"status":"draft","scheduledFor":null');
  });

  it("sorts like the first page: soonest first with undated drafts last, activity by latest change", async () => {
    await app.inject({ method: "GET", url: "/dashboard/content?tab=upcoming" });
    expect(JSON.stringify(pageQuery().orderBy)).toContain('"nulls":"last"');
    h.calls = [];
    await app.inject({ method: "GET", url: "/dashboard/content?tab=activity" });
    expect(JSON.stringify(pageQuery().orderBy)).toContain('"updatedAt":"desc"');
  });

  it("follows the role's draft visibility and the workspace, for the count and for the read", async () => {
    h.role = "admin";
    await app.inject({ method: "GET", url: "/dashboard/content?tab=upcoming" });
    const queries = h.calls.filter((c) => c.model === "postJob");
    expect(queries).toHaveLength(2);
    for (const q of queries) {
      expect(JSON.stringify(q.args), q.fn).toContain('"approvalStatus":"pending"');
      expect(JSON.stringify(q.args), q.fn).toContain('"workspaceId":"ws-1"');
    }
  });

  it("never sends the content of a post, only what a list shows", async () => {
    h.posts = [post("a", { content: JSON.stringify({ title: "T", designCopy: "SECRET-DESIGN-COPY" }) })];
    const text = (await app.inject({ method: "GET", url: "/dashboard/content?tab=upcoming" })).body;
    expect(text).not.toContain("SECRET-DESIGN-COPY");
    expect(text).not.toContain('"content"');
  });
});

