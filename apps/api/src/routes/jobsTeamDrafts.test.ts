// A draft belongs to the workspace, not to the person who uploaded it. A quarter plan is imported by one person (the
// head of marketing) and kept by the team: when they have other work, a colleague must be able to edit the drafts and
// send them for review. These tests drive the routes that used to say "You can only edit/submit your own posts".
import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  role: "member" as string | null,
  viewer: "colleague",
  job: null as null | Record<string, unknown>,
  jobs: [] as Array<Record<string, unknown>>,
  calls: [] as Array<{ fn: string; args: unknown }>,
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
        findFirst: record("findFirst", () => h.job),
        findMany: record("findMany", () => h.jobs),
        update: record("update", (args) => ({ id: "p1", ...(args as { data: object }).data })),
        updateMany: record("updateMany", () => ({ count: 1 })),
        create: record("create", (args) => ({ id: "new", ...(args as { data: object }).data })),
      },
      workspace: { findUnique: record("workspace.findUnique", () => ({ approvalRequired: true, plan: "pro" })) },
      postJobTarget: { findMany: record("target.findMany", () => []), deleteMany: record("target.deleteMany", () => ({})), createMany: record("target.createMany", () => ({})) },
      account: { findMany: record("account.findMany", (args) => ((args as { where: { id: { in: string[] } } }).where.id.in.map((id) => ({ id })))) },
      $transaction: async (fn: (tx: unknown) => unknown) => fn({ postJob: { create: record("create", (args) => ({ id: "new", ...(args as { data: object }).data })) } }),
      upload: { deleteMany: record("upload.deleteMany", () => ({ count: 1 })), updateMany: record("upload.updateMany", () => ({ count: 1 })) },
    },
  };
});
vi.mock("../lib/auth/withAuth.js", async () => {
  const real = await vi.importActual<typeof import("../lib/auth/withAuth.js")>("../lib/auth/withAuth.js");
  return {
    ...real,
    withAuth: async () => {},
    getUser: () => ({ id: h.viewer }),
    getWorkspaceId: () => "ws-1",
    getWorkspaceRole: async () => h.role,
    // the real one reads the membership through the module's own getWorkspaceRole, not through this mock
    requireContentEditorRole: async () => (h.role === "designer" ? { error: "Content is created and edited by Admin and Marketing only.", code: "FORBIDDEN" } : null),
  };
});
vi.mock("../lib/queue.js", () => ({ schedulePostJob: vi.fn(), postJobQueue: { remove: vi.fn(async () => {}) } }));
vi.mock("../lib/enforcePlan.js", () => ({ enforcePlan: async () => null }));
vi.mock("../lib/templates.js", () => ({ withoutTemplateMedia: async (urls: string[]) => urls }));
vi.mock("../lib/auth/index.js", () => ({ authProvider: {} }));
vi.mock("../adapters/index.js", () => ({ adapters: [] }));

import { jobRoutes } from "./jobs.js";

const storage = { upload: vi.fn(), delete: vi.fn(async () => {}), list: vi.fn(), isLocal: () => true };

let app: FastifyInstance;
beforeAll(async () => {
  app = Fastify();
  await app.register(jobRoutes, { storage } as never);
  await app.ready();
});
afterAll(async () => {
  await app.close();
});
beforeEach(() => {
  h.role = "member";
  h.viewer = "colleague";
  h.job = null;
  h.jobs = [];
  h.calls = [];
  storage.delete.mockClear();
});

/** A draft the head of marketing imported: complete, so it can go to review. */
const draft = (patch: Record<string, unknown> = {}) => ({
  id: "p1",
  status: "draft",
  approvalStatus: null,
  userId: "head-of-marketing",
  scheduledFor: new Date("2026-03-07T01:00:00Z"),
  commentText: null,
  content: JSON.stringify({ title: "T", text: "Caption", category: "Blog Post", mediaUrls: ["/uploads/a.png"] }),
  targets: [{ accountId: "acc-1", account: { platform: "instagram" } }],
  ...patch,
});

const patch = (body: object) => app.inject({ method: "PATCH", url: "/jobs/p1", payload: body });
const call = (fn: string) => h.calls.filter((c) => c.fn === fn);

describe("PATCH /jobs/:id: a colleague edits a draft the head of marketing uploaded", () => {
  it("a plain draft: allowed", async () => {
    h.job = draft();
    const res = await patch({ title: "A better title" });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse((call("update")[0].args as { data: { content: string } }).data.content).title).toBe("A better title");
  });

  it("a draft in review and a draft sent back: allowed", async () => {
    h.job = draft({ approvalStatus: "pending" });
    expect((await patch({ text: "Edited" })).statusCode).toBe(200);
    h.job = draft({ approvalStatus: "rejected" });
    expect((await patch({ text: "Edited again" })).statusCode).toBe(200);
  });

  it("the uploader's own edit is just as allowed (nothing changed for them)", async () => {
    h.viewer = "head-of-marketing";
    h.job = draft();
    expect((await patch({ title: "Mine" })).statusCode).toBe(200);
  });

  it("an edit to a colleague's draft in review pulls it back to a draft, so it is sent again: the reviewer never approves what changed behind their back", async () => {
    h.job = draft({ approvalStatus: "pending" });
    await patch({ text: "Changed caption" });
    expect(call("update")[0].args).toMatchObject({ data: { approvalStatus: null, reviewNote: null, reviewedByUserId: null, reviewedAt: null } });
  });

  it("a date-only change does not pull it back", async () => {
    h.job = draft({ approvalStatus: "pending" });
    await patch({ scheduledFor: "2026-03-09T01:00:00.000Z" });
    expect((call("update")[0].args as { data: Record<string, unknown> }).data).not.toHaveProperty("approvalStatus");
  });

  it("an approved post is still locked for Marketing, a colleague's or their own", async () => {
    h.job = draft({ status: "pending", approvalStatus: "approved" });
    expect((await patch({ title: "x" })).statusCode).toBe(403);
    h.viewer = "head-of-marketing";
    expect((await patch({ title: "x" })).statusCode).toBe(403);
    expect(call("update")).toHaveLength(0);
  });

  it("a published post stays closed", async () => {
    h.job = draft({ status: "done" });
    expect((await patch({ title: "x" })).statusCode).toBe(409);
  });

  it("the design team still cannot edit content, and a colleague's draft is no exception", async () => {
    h.role = "designer";
    h.job = draft({ approvalStatus: "pending" });
    expect((await patch({ title: "x" })).statusCode).toBe(403);
    expect(call("update")).toHaveLength(0);
  });

  it("a post of another workspace is still not found: the lookup is by workspace", async () => {
    h.job = null;
    expect((await patch({ title: "x" })).statusCode).toBe(404);
    expect(call("findFirst")[0].args).toMatchObject({ where: { id: "p1", workspaceId: "ws-1" } });
  });

  // The orphan cleaner deletes an upload nobody claimed after a day. A picture added while editing is as much the
  // post's as one added when it was made, so the edit claims it: otherwise the picture of a draft that waits for review
  // disappears and the drawer shows an empty box.
  it("a picture added in an edit is claimed by the editor, so the orphan cleaner leaves it alone", async () => {
    h.job = draft();
    await patch({ mediaUrls: ["/uploads/a.png", "/uploads/new.png"] });
    const claim = call("upload.updateMany");
    expect(claim).toHaveLength(1);
    const args = claim[0].args as { where: Record<string, unknown>; data: { claimedAt: unknown } };
    expect(args.where).toEqual({ url: { in: ["/uploads/a.png", "/uploads/new.png"] }, userId: "colleague" });
    expect(args.data.claimedAt).toBeInstanceOf(Date);
  });

  it("an edit that does not touch the pictures claims nothing", async () => {
    h.job = draft();
    await patch({ title: "Only the title" });
    expect(call("upload.updateMany")).toHaveLength(0);
  });

  it("removing every picture claims nothing", async () => {
    h.job = draft();
    await patch({ mediaUrls: [] });
    expect(call("upload.updateMany")).toHaveLength(0);
  });

  it("a file a colleague removes from the draft goes, whoever uploaded it, so no row points at a deleted file", async () => {
    h.job = draft();
    await patch({ mediaUrls: [] });
    expect(storage.delete).toHaveBeenCalledWith("/uploads/a.png");
    const where = (call("upload.deleteMany")[0].args as { where: Record<string, unknown> }).where;
    expect(where).toEqual({ url: { in: ["/uploads/a.png"] } });
  });
});

describe("POST /jobs: the pictures of a new post", () => {
  const ACCOUNT = "cmw0000000000000000000000";
  const create = (mediaUrls: string[]) =>
    app.inject({ method: "POST", url: "/jobs", payload: { draft: true, accountIds: [ACCOUNT], content: { text: "Caption", mediaUrls } } });

  it("are claimed by the person who made it, so the orphan cleaner leaves them alone", async () => {
    h.viewer = "head-of-marketing";
    const res = await create(["/uploads/a.png"]);
    expect(res.statusCode).toBe(201);
    const claim = call("upload.updateMany");
    expect(claim).toHaveLength(1);
    expect((claim[0].args as { where: unknown }).where).toEqual({ url: { in: ["/uploads/a.png"] }, userId: "head-of-marketing" });
  });

  it("a post with no pictures claims nothing", async () => {
    expect((await create([])).statusCode).toBe(201);
    expect(call("upload.updateMany")).toHaveLength(0);
  });
});

const submit = () => app.inject({ method: "POST", url: "/jobs/p1/submit" });

describe("POST /jobs/:id/submit: a colleague sends the head's draft for review", () => {
  it("is allowed when the draft has everything the review needs", async () => {
    h.job = draft();
    const res = await submit();
    expect(res.statusCode).toBe(200);
    expect(call("update")[0].args).toMatchObject({ data: { approvalStatus: "pending" } });
  });

  it("still refuses a draft that lacks a field, naming it", async () => {
    h.job = draft({ content: JSON.stringify({ title: "T", category: "Blog Post" }) });
    const res = await submit();
    expect(res.statusCode).toBe(422);
    expect(res.json().missing).toEqual(["caption", "media"]);
  });

  it("refuses a draft the reviewer sent back until its content changes: 409, and nothing is written", async () => {
    h.job = draft({ approvalStatus: "rejected" });
    const res = await submit();
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ code: "NEEDS_CHANGES" });
    expect(call("update")).toHaveLength(0);
  });

  it("after a colleague's edit changed the content, the same draft is a plain draft again and goes to review", async () => {
    h.job = draft({ approvalStatus: "rejected" });
    await patch({ text: "A new caption that answers the review" });
    expect(call("update")[0].args).toMatchObject({ data: { approvalStatus: null, reviewNote: null } });
    h.job = draft({ approvalStatus: null }); // what the row is now
    expect((await submit()).statusCode).toBe(200);
  });

  it("an edit that does not change the content leaves the rejection in place, so the draft still cannot be sent", async () => {
    h.job = draft({ approvalStatus: "rejected" });
    await patch({ scheduledFor: "2026-03-09T01:00:00.000Z" });
    expect((call("update")[0].args as { data: Record<string, unknown> }).data).not.toHaveProperty("approvalStatus");
    expect((await submit()).statusCode).toBe(409);
  });

  it("still refuses a post that is not a draft, and one already in review", async () => {
    h.job = draft({ status: "pending" });
    expect((await submit()).statusCode).toBe(409);
    h.job = draft({ approvalStatus: "pending" });
    expect((await submit()).statusCode).toBe(409);
  });

  it("the design team still never submits", async () => {
    h.role = "designer";
    h.job = draft();
    expect((await submit()).statusCode).toBe(403);
    expect(call("update")).toHaveLength(0);
  });
});

describe("POST /jobs/submit-bulk: a colleague sends several of the head's drafts at once", () => {
  const ids = ["ckaaaaaaaaaaaaaaaaaaaaaaa", "ckbbbbbbbbbbbbbbbbbbbbbbb", "ckccccccccccccccccccccccc"];
  const bulk = () => app.inject({ method: "POST", url: "/jobs/submit-bulk", payload: { ids } });

  it("submits the complete ones, skips the incomplete with a reason, and never says 'Not your post'", async () => {
    h.jobs = [
      draft({ id: ids[0] }),
      draft({ id: ids[1], content: JSON.stringify({ title: "Only a title" }) }),
      draft({ id: ids[2], status: "pending" }),
    ];
    const res = await bulk();
    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.submitted).toEqual([ids[0]]);
    expect(json.skipped.map((s: { reason: string }) => s.reason)).toEqual(["Missing required fields", "Not a draft"]);
    expect(JSON.stringify(json)).not.toContain("Not your post");
  });

  it("skips a draft that was sent back, saying so, and sends the other complete ones", async () => {
    h.jobs = [draft({ id: ids[0], approvalStatus: "rejected" }), draft({ id: ids[1] }), draft({ id: ids[2], status: "pending" })];
    const json = (await bulk()).json();
    expect(json.submitted).toEqual([ids[1]]);
    expect(json.skipped).toEqual([
      expect.objectContaining({ id: ids[0], reason: "Sent back for changes: change it first" }),
      expect.objectContaining({ id: ids[2], reason: "Not a draft" }),
    ]);
  });

  it("only the drafts of this workspace are read", async () => {
    h.jobs = [];
    await bulk();
    expect(call("findMany")[0].args).toMatchObject({ where: { workspaceId: "ws-1" } });
  });

  it("the design team still cannot", async () => {
    h.role = "designer";
    expect((await bulk()).statusCode).toBe(403);
  });
});
