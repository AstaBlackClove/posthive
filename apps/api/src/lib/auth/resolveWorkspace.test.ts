import type { FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  memberFindUnique: vi.fn(),
  captured: null as null | ((req: FastifyRequest, userId: string) => Promise<void>),
}));

vi.mock("../prisma.js", () => ({
  prisma: {
    user: { findUnique: db.userFindUnique },
    workspaceMember: { findUnique: db.memberFindUnique },
  },
}));
vi.mock("./index.js", () => ({ authProvider: {} }));
// The guard is built with the function under test; keep that function so the test can call it directly
vi.mock("./authGuard.js", async (orig) => ({
  ...(await orig<typeof import("./authGuard.js")>()),
  createAuthGuard: (deps: { resolveWorkspace: (req: FastifyRequest, userId: string) => Promise<void> }) => {
    db.captured = deps.resolveWorkspace;
    return { withAuth: vi.fn(), withAuthOrToken: vi.fn() };
  },
}));

await import("./withAuth.js");

const run = async (headers: Record<string, string> = {}) => {
  const req = { headers } as unknown as FastifyRequest & { workspaceId?: string | null };
  await db.captured!(req, "u1");
  return req.workspaceId;
};

const user = (activeWorkspaceId: string | null, member: string[]) => ({
  activeWorkspaceId,
  workspaceMembers: member.map((workspaceId) => ({ workspaceId })),
});

beforeEach(() => {
  db.userFindUnique.mockReset();
  db.memberFindUnique.mockReset();
});

describe("which workspace a request is for", () => {
  it("is the active workspace while the person is a member of it", async () => {
    db.userFindUnique.mockResolvedValue(user("w2", ["w1", "w2"]));
    expect(await run()).toBe("w2");
  });

  it("is the first workspace they belong to when none is active", async () => {
    db.userFindUnique.mockResolvedValue(user(null, ["w1", "w2"]));
    expect(await run()).toBe("w1");
  });

  it("is NOT the active workspace once the person was removed from it: removing a member leaves activeWorkspaceId behind", async () => {
    db.userFindUnique.mockResolvedValue(user("w-removed", ["w-own"]));
    expect(await run()).toBe("w-own");
  });

  it("is nothing for a person who belongs to no workspace", async () => {
    db.userFindUnique.mockResolvedValue(user("w-removed", []));
    expect(await run()).toBeNull();
    db.userFindUnique.mockResolvedValue(null);
    expect(await run()).toBeNull();
  });

  it("an x-workspace-id header wins when the person is a member of it, and is ignored when not", async () => {
    db.memberFindUnique.mockResolvedValue({ id: "m1" });
    expect(await run({ "x-workspace-id": "w9" })).toBe("w9");
    expect(db.userFindUnique).not.toHaveBeenCalled();

    db.memberFindUnique.mockResolvedValue(null);
    db.userFindUnique.mockResolvedValue(user("w2", ["w2"]));
    expect(await run({ "x-workspace-id": "w-stranger" })).toBe("w2");
  });
});
