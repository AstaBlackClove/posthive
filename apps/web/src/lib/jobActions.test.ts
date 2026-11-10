// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("./api", () => ({ apiFetch: h.apiFetch }));

import { approveJob, deleteMany, savedMessage } from "./jobActions";
import type { Job } from "./jobTypes";

const job = (patch: Partial<Job> = {}, content: Record<string, unknown> = { text: "Caption", title: "Title" }): Job => ({
  id: "p1",
  scheduledFor: null,
  status: "draft",
  content: JSON.stringify(content),
  commentText: null,
  dryRun: false,
  createdAt: "2026-11-01T00:00:00.000Z",
  targets: [],
  ...patch,
});

beforeEach(() => {
  h.apiFetch.mockReset();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-13T04:00:00Z"));
});
afterEach(() => vi.useRealTimers());

const scheduledAt = () => JSON.parse(h.apiFetch.mock.calls[0][1].body).scheduledFor as string;

describe("approveJob", () => {
  it("keeps the time the maker asked for when it is still ahead", async () => {
    h.apiFetch.mockResolvedValue({});
    await approveJob(job({ scheduledFor: "2026-11-20T02:00:00.000Z" }));
    expect(h.apiFetch.mock.calls[0][0]).toBe("/jobs/p1/schedule");
    expect(scheduledAt()).toBe("2026-11-20T02:00:00.000Z");
  });

  it("a time that has passed, or none, becomes five minutes from now: an approved post is never scheduled in the past", async () => {
    h.apiFetch.mockResolvedValue({});
    await approveJob(job({ scheduledFor: "2026-03-07T01:00:00.000Z" }));
    expect(scheduledAt()).toBe("2026-11-13T04:05:00.000Z");
    h.apiFetch.mockClear();
    await approveJob(job({ scheduledFor: null }));
    expect(scheduledAt()).toBe("2026-11-13T04:05:00.000Z");
  });
});

describe("deleteMany", () => {
  it("is one request, and the server's count", async () => {
    h.apiFetch.mockResolvedValue({ deleted: 2 });
    expect(await deleteMany(["a", "b"])).toBe(2);
    expect(h.apiFetch).toHaveBeenCalledTimes(1);
    expect(h.apiFetch.mock.calls[0]).toEqual(["/jobs/bulk", expect.objectContaining({ method: "DELETE", body: JSON.stringify({ ids: ["a", "b"] }) })]);
  });

  it("when that request fails it deletes one by one and counts those that went, so a partial success is not lost", async () => {
    h.apiFetch.mockImplementation(async (path: string) => {
      if (path === "/jobs/bulk") throw new Error("503");
      if (path === "/jobs/b") throw new Error("403");
      return undefined;
    });
    expect(await deleteMany(["a", "b", "c"])).toBe(2);
    expect(h.apiFetch.mock.calls.map((c) => c[0])).toEqual(["/jobs/bulk", "/jobs/a", "/jobs/b", "/jobs/c"]);
  });

  it("when nothing could be deleted it says 0, not a success", async () => {
    h.apiFetch.mockRejectedValue(new Error("down"));
    expect(await deleteMany(["a", "b"])).toBe(0);
  });
});

describe("savedMessage", () => {
  it("says what the save did, by who saved it", () => {
    expect(savedMessage(true, true, true)).toBe("Sent for design review.");
    expect(savedMessage(true, true, false)).toBe("Draft saved.");
    expect(savedMessage(true, false)).toBe("Draft scheduled!");
    expect(savedMessage(false, false)).toBe("Post updated.");
  });
});
