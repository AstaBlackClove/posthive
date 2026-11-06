import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory stand-in for prisma. $transaction snapshots the data and puts it back if the
// callback throws, which is what a real database does on rollback.
const state = vi.hoisted(() => ({
  reset: { id: "r1", usedAt: null as Date | null, expiresAt: new Date() },
  user: { id: "u1", passwordHash: "old-hash" },
  failUserUpdate: false,
}));

vi.mock("../prisma.js", () => {
  const tx = {
    passwordReset: {
      updateMany: async ({ where, data }: {
        where: { id: string; usedAt: null; expiresAt: { gt: Date } };
        data: { usedAt: Date };
      }) => {
        const r = state.reset;
        if (r.id !== where.id || r.usedAt !== null || !(r.expiresAt > where.expiresAt.gt)) return { count: 0 };
        r.usedAt = data.usedAt;
        return { count: 1 };
      },
    },
    user: {
      update: async ({ data }: { data: { passwordHash: string } }) => {
        if (state.failUserUpdate) throw new Error("db down");
        state.user.passwordHash = data.passwordHash;
      },
    },
  };
  return {
    prisma: {
      $transaction: async (fn: (t: typeof tx) => Promise<boolean>) => {
        const before = structuredClone({ reset: state.reset, user: state.user });
        try {
          return await fn(tx);
        } catch (err) {
          Object.assign(state.reset, before.reset);
          Object.assign(state.user, before.user);
          throw err;
        }
      },
    },
  };
});

import { claimResetAndSetPassword } from "./passwordReset.js";

beforeEach(() => {
  state.reset = { id: "r1", usedAt: null, expiresAt: new Date(Date.now() + 30 * 60_000) };
  state.user = { id: "u1", passwordHash: "old-hash" };
  state.failUserUpdate = false;
});

describe("claimResetAndSetPassword", () => {
  it("sets the password and marks the link used", async () => {
    expect(await claimResetAndSetPassword("r1", "u1", "new-hash")).toBe(true);
    expect(state.user.passwordHash).toBe("new-hash");
    expect(state.reset.usedAt).not.toBeNull();
  });

  it("a second use of the same link fails and leaves the first password alone", async () => {
    expect(await claimResetAndSetPassword("r1", "u1", "first-hash")).toBe(true);
    expect(await claimResetAndSetPassword("r1", "u1", "second-hash")).toBe(false);
    expect(state.user.passwordHash).toBe("first-hash");
  });

  it("an expired link changes nothing", async () => {
    state.reset.expiresAt = new Date(Date.now() - 1000);
    expect(await claimResetAndSetPassword("r1", "u1", "new-hash")).toBe(false);
    expect(state.user.passwordHash).toBe("old-hash");
    expect(state.reset.usedAt).toBeNull();
  });

  it("if saving the password fails, the link is not burned", async () => {
    state.failUserUpdate = true;
    await expect(claimResetAndSetPassword("r1", "u1", "new-hash")).rejects.toThrow("db down");
    expect(state.reset.usedAt).toBeNull();
    expect(state.user.passwordHash).toBe("old-hash");

    state.failUserUpdate = false; // the user clicks the same link again
    expect(await claimResetAndSetPassword("r1", "u1", "new-hash")).toBe(true);
  });
});
