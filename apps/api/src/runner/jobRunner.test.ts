// What happens to a post's pictures when it goes out. The Content List's drawer and the dashboard show a published post's
// design, and a repeating post's next occurrence copies the same files. The runner used to delete the files and their
// upload rows after a post went out, which left a published post whose pictures answer 404 in the drawer.
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  calls: [] as string[],
  createPost: vi.fn(async () => ({ platformPostId: "p-1", replyContext: { uri: "u", cid: "c" } })),
}));

vi.mock("../lib/prisma.js", () => {
  const note = (name: string, result: unknown = {}) =>
    vi.fn(async () => {
      h.calls.push(name);
      return typeof result === "function" ? (result as () => unknown)() : result;
    });
  return {
    prisma: {
      postJob: { update: note("postJob.update"), findUnique: note("postJob.findUnique", null) },
      workspace: { findUnique: note("workspace.findUnique", { planStatus: "active" }) },
      postJobTarget: {
        update: note("postJobTarget.update"),
        updateMany: note("postJobTarget.updateMany"),
        findMany: note("postJobTarget.findMany", () => [{ status: "post_done" }]),
      },
      libraryItem: { updateMany: note("libraryItem.updateMany"), count: note("libraryItem.count", 0) },
      user: { findUnique: note("user.findUnique", null) },
      upload: { deleteMany: note("upload.deleteMany") },
    },
  };
});
vi.mock("../adapters/index.js", () => ({
  getAdapter: () => ({ refreshTokenIfNeeded: async (a: unknown) => a, createPost: h.createPost, createComment: vi.fn() }),
}));
vi.mock("../lib/queue.js", () => ({ schedulePostJob: vi.fn() }));
vi.mock("../lib/mailer.js", () => ({ sendPostFailedEmail: vi.fn(async () => {}) }));

import { runJob } from "./jobRunner.js";

const job = (content: object) =>
  ({
    id: "job-1",
    status: "pending",
    dryRun: false,
    userId: "u1",
    workspaceId: null,
    scheduledFor: new Date("2026-11-10T02:00:00Z"),
    commentText: null,
    content: JSON.stringify(content),
    targets: [{ id: "t1", accountId: "a1", status: "pending", attempts: 0, replyContext: null, postJobId: "job-1", account: { platform: "instagram" } }],
  }) as never;

beforeEach(() => {
  h.calls = [];
  h.createPost.mockClear();
});

describe("runJob: the pictures of a post that went out", () => {
  const content = { text: "Caption", mediaUrls: ["https://pub-x.r2.dev/a.jpg", "https://pub-x.r2.dev/b.webp"], youtubeThumbnailUrl: "https://pub-x.r2.dev/t.jpg" };

  it("keep their upload rows, so a later cleanup or a duplicate of the post still knows the files", async () => {
    await runJob(job(content));
    expect(h.createPost).toHaveBeenCalledTimes(1);
    expect(h.calls).not.toContain("upload.deleteMany");
  });

  it("the post is still marked done", async () => {
    await runJob(job(content));
    expect(h.calls.filter((c) => c === "postJob.update")).toHaveLength(2); // running, then done
  });
});
