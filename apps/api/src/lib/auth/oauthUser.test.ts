import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  workspaceCreate: vi.fn(),
}));
const revokeOtherSessions = vi.hoisted(() => vi.fn());

vi.mock("../prisma.js", () => ({
  prisma: {
    user: { findUnique: db.findUnique, update: db.update, create: db.create },
    workspace: { create: db.workspaceCreate },
  },
}));
vi.mock("../mailer.js", () => ({ sendWelcomeEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock("./index.js", () => ({ authProvider: { revokeOtherSessions } }));

import { findOrCreateOAuthUser } from "./oauthUser.js";

const base = { id: "u1", email: "a@b.c", name: "A", avatarUrl: "x.png" };

beforeEach(() => {
  vi.clearAllMocks();
  db.update.mockImplementation(async ({ where, data }) => ({ ...base, id: where.id, ...data }));
});

describe("findOrCreateOAuthUser", () => {
  it("unverified sign-up: drops the password, verifies the email and revokes sessions", async () => {
    db.findUnique.mockResolvedValue({ ...base, emailVerified: false, passwordHash: "attacker-hash" });

    const { user, isNew } = await findOrCreateOAuthUser({ email: "a@b.c" });

    expect(isNew).toBe(false);
    expect(db.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { emailVerified: true, passwordHash: null },
    });
    expect(user.emailVerified).toBe(true);
    expect(revokeOtherSessions).toHaveBeenCalledWith("u1");
  });

  it("verified account: keeps the password and sessions", async () => {
    db.findUnique.mockResolvedValue({ ...base, emailVerified: true, passwordHash: "real-hash" });

    const { isNew } = await findOrCreateOAuthUser({ email: "a@b.c", avatarUrl: "new.png" });

    expect(isNew).toBe(false);
    expect(db.update).not.toHaveBeenCalled(); // avatar already set, nothing to change
    expect(revokeOtherSessions).not.toHaveBeenCalled();
  });

  it("verified account: only backfills a missing avatar", async () => {
    db.findUnique.mockResolvedValue({ ...base, avatarUrl: null, emailVerified: true, passwordHash: "real-hash" });

    await findOrCreateOAuthUser({ email: "a@b.c", avatarUrl: "new.png" });

    expect(db.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { avatarUrl: "new.png" } });
    expect(revokeOtherSessions).not.toHaveBeenCalled();
  });

  it("new email: creates a verified user with a trial workspace", async () => {
    db.findUnique.mockResolvedValue(null);
    db.create.mockResolvedValue({ ...base, emailVerified: true });
    db.workspaceCreate.mockResolvedValue({ id: "w1" });

    const { isNew } = await findOrCreateOAuthUser({ email: "a@b.c", name: "A" });

    expect(isNew).toBe(true);
    expect(db.create.mock.calls[0][0].data.emailVerified).toBe(true);
    expect(db.workspaceCreate.mock.calls[0][0].data.plan).toBe("trialing");
    expect(db.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { activeWorkspaceId: "w1" } });
  });
});
