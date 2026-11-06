import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashCode, MAX_CODE_ATTEMPTS } from "./emailCode.js";

type Row = {
  id: string;
  userId: string;
  token: string;
  email: string | null;
  codeHash: string | null;
  attempts: number;
  usedAt: Date | null;
  createdAt: Date;
  expiresAt: Date;
};

// Tiny in-memory stand-in for the three prisma calls the code uses.
const state = vi.hoisted(() => ({
  user: { id: "u1", email: "new@x.com", emailVerified: false },
  rows: [] as Row[],
}));

vi.mock("../prisma.js", () => ({
  prisma: {
    user: {
      findUnique: async () => ({ emailVerified: state.user.emailVerified }),
      updateMany: async ({ where, data }: { where: { id: string; email?: string }; data: { emailVerified: boolean } }) => {
        if (where.id !== state.user.id || (where.email && where.email !== state.user.email)) return { count: 0 };
        state.user.emailVerified = data.emailVerified;
        return { count: 1 };
      },
    },
    emailVerification: {
      findFirst: async () => {
        const row = state.rows.find((r) => r.codeHash && !r.usedAt);
        return row ? { ...row } : null; // a copy: later updates must not change what the route already read
      },
      updateMany: async ({ where }: { where: { id: string; attempts: { lt: number } } }) => {
        const row = state.rows.find((r) => r.id === where.id && r.attempts < where.attempts.lt);
        if (!row) return { count: 0 };
        row.attempts += 1;
        return { count: 1 };
      },
      deleteMany: async () => {
        state.rows = [];
        return { count: 1 };
      },
    },
  },
}));

import { markEmailVerified, verifyEmailCode } from "./emailVerification.js";

const TOKEN = "tok";
const CODE = "123456";

function seed(over: Partial<Row> = {}) {
  state.rows = [{
    id: "v1",
    userId: "u1",
    token: TOKEN,
    email: "new@x.com",
    codeHash: hashCode(TOKEN, CODE),
    attempts: 0,
    usedAt: null,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 3600_000),
    ...over,
  }];
}

beforeEach(() => {
  state.user = { id: "u1", email: "new@x.com", emailVerified: false };
  seed();
});

describe("verifyEmailCode", () => {
  it("verifies with the right code and clears the pending rows", async () => {
    expect(await verifyEmailCode("u1", CODE)).toBeNull();
    expect(state.user.emailVerified).toBe(true);
    expect(state.rows).toHaveLength(0);
  });

  it("says how many tries are left after a wrong code", async () => {
    expect(await verifyEmailCode("u1", "000000")).toBe("That code isn't right. 4 tries left.");
    expect(state.user.emailVerified).toBe(false);
  });

  it(`locks the code after ${MAX_CODE_ATTEMPTS} wrong guesses, even for the right code`, async () => {
    for (let i = 0; i < MAX_CODE_ATTEMPTS; i++) await verifyEmailCode("u1", "000000");
    expect(await verifyEmailCode("u1", CODE)).toBe("Too many wrong codes. Request a new one.");
    expect(state.user.emailVerified).toBe(false);
  });

  it("rejects a code that was sent to a different address than the user's current email", async () => {
    seed({ email: "old@x.com" }); // user changed their email after this code was mailed
    expect(await verifyEmailCode("u1", CODE)).toMatch(/email changed/i);
    expect(state.user.emailVerified).toBe(false);
  });

  it("rejects an expired code", async () => {
    seed({ createdAt: new Date(Date.now() - 16 * 60_000) });
    expect(await verifyEmailCode("u1", CODE)).toMatch(/expired/i);
    expect(state.user.emailVerified).toBe(false);
  });

  it("is a no-op for an already verified user", async () => {
    state.user.emailVerified = true;
    expect(await verifyEmailCode("u1", "000000")).toBeNull();
  });
});

describe("markEmailVerified", () => {
  it("only verifies while the email still matches", async () => {
    expect(await markEmailVerified("u1", "old@x.com")).toBe(false);
    expect(state.user.emailVerified).toBe(false);
    expect(await markEmailVerified("u1", "new@x.com")).toBe(true);
    expect(state.user.emailVerified).toBe(true);
  });

  it("keeps working for old rows that have no stored email", async () => {
    expect(await markEmailVerified("u1", null)).toBe(true);
  });
});
