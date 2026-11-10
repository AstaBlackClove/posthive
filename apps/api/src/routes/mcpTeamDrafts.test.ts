// The MCP update_post tool follows the same rule as the app: a draft belongs to the workspace (a quarter plan is
// imported by one person and kept by the team), a scheduled post stays with the person who made it.
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  job: null as null | Record<string, unknown>,
  updates: [] as unknown[],
}));

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    postJob: {
      findUnique: vi.fn(async () => h.job),
      update: vi.fn(async (args: { data: Record<string, unknown> }) => {
        h.updates.push(args);
        return { id: "p1", status: h.job?.status, scheduledFor: null };
      }),
    },
  },
}));
vi.mock("../lib/queue.js", () => ({ schedulePostJob: vi.fn() }));
vi.mock("../lib/auth/withApiKey.js", () => ({ withApiKey: async () => {}, canUseApi: () => true }));

import { handleTool } from "./mcp.js";

const stored = (patch: Record<string, unknown> = {}) => ({
  id: "p1",
  workspaceId: "ws-1",
  userId: "head-of-marketing",
  status: "draft",
  approvalStatus: null,
  content: JSON.stringify({ title: "T", text: "Caption" }),
  scheduledFor: new Date("2026-03-07T01:00:00Z"),
  ...patch,
});

const update = (ctx: { role: string | null; approvalRequired: boolean }, userId = "colleague") =>
  handleTool("update_post", { post_id: "p1", content: "Edited caption" }, userId, "ws-1", ctx);

beforeEach(() => {
  h.job = null;
  h.updates = [];
});

describe("update_post: a colleague edits the head of marketing's draft", () => {
  it("a member key under the approval flow: allowed on a draft", async () => {
    h.job = stored();
    await expect(update({ role: "member", approvalRequired: true })).resolves.toBeTruthy();
    expect(h.updates).toHaveLength(1);
  });

  it("a member without the approval flow: allowed on a draft", async () => {
    h.job = stored();
    await expect(update({ role: "member", approvalRequired: false })).resolves.toBeTruthy();
  });

  it("an edit to a colleague's draft in review pulls it back to a draft, so it is sent again", async () => {
    h.job = stored({ approvalStatus: "pending" });
    await update({ role: "member", approvalRequired: true });
    expect(h.updates[0]).toMatchObject({ data: { approvalStatus: null, reviewNote: null, reviewedByUserId: null, reviewedAt: null } });
  });

  it("an approved (scheduled) post stays frozen for a member key under the approval flow, even the uploader's own", async () => {
    h.job = stored({ status: "pending", approvalStatus: "approved" });
    await expect(update({ role: "member", approvalRequired: true })).rejects.toThrow(/frozen/);
    await expect(update({ role: "member", approvalRequired: true }, "head-of-marketing")).rejects.toThrow(/frozen/);
    expect(h.updates).toHaveLength(0);
  });

  it("a scheduled post of a colleague stays closed to a member without the approval flow; the uploader may edit it", async () => {
    h.job = stored({ status: "pending" });
    await expect(update({ role: "member", approvalRequired: false })).rejects.toThrow("You can only edit your own posts.");
    await expect(update({ role: "member", approvalRequired: false }, "head-of-marketing")).resolves.toBeTruthy();
  });

  it("the design team never edits, a draft in review included", async () => {
    h.job = stored({ approvalStatus: "pending" });
    await expect(update({ role: "designer", approvalRequired: true })).rejects.toThrow(/Admin and Marketing only/);
    expect(h.updates).toHaveLength(0);
  });

  it("a post of another workspace is not found", async () => {
    h.job = stored({ workspaceId: "ws-other" });
    await expect(update({ role: "member", approvalRequired: true })).rejects.toThrow("Post not found");
  });

  it("an admin edits any draft or scheduled post, as before", async () => {
    h.job = stored({ status: "pending" });
    await expect(update({ role: "admin", approvalRequired: true })).resolves.toBeTruthy();
  });
});
