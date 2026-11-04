import { beforeEach, describe, expect, it } from "vitest";
import { createSessionService } from "./sessionService.js";
import { createMemorySessionStore } from "./memorySessionStore.js";
import {
  ABSOLUTE_TTL_MS,
  IDLE_TIMEOUT_MS,
  ROTATION_GRACE_MS,
  TOUCH_THROTTLE_MS,
} from "./sessionPolicy.js";

const MIN = 60_000;

function setup() {
  let t = new Date("2026-11-04T08:00:00Z").getTime();
  let n = 0;
  const store = createMemorySessionStore();
  const service = createSessionService({
    store,
    now: () => new Date(t),
    randomToken: () => `tok-${++n}`,
  });
  return {
    store,
    service,
    advance: (ms: number) => { t += ms; },
  };
}

describe("session policy values", () => {
  it("uses idle 1h, absolute 7d", () => {
    expect(IDLE_TIMEOUT_MS).toBe(60 * MIN);
    expect(ABSOLUTE_TTL_MS).toBe(7 * 24 * 60 * MIN);
  });
});

describe("authenticate", () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => { ctx = setup(); });

  it("accepts a fresh session", async () => {
    const { sessionId } = await ctx.service.create("u1");
    expect(await ctx.service.authenticate(sessionId)).toEqual({ userId: "u1" });
  });

  it("rejects an unknown session id", async () => {
    expect(await ctx.service.authenticate("nope")).toBeNull();
  });

  it("expires after the idle timeout with no activity", async () => {
    const { sessionId } = await ctx.service.create("u1");
    ctx.advance(IDLE_TIMEOUT_MS + 1);
    expect(await ctx.service.authenticate(sessionId)).toBeNull();
  });

  it("stays alive while the user keeps making requests", async () => {
    const { sessionId } = await ctx.service.create("u1");
    for (let i = 0; i < 5; i++) {
      ctx.advance(IDLE_TIMEOUT_MS - 10 * MIN);
      expect(await ctx.service.authenticate(sessionId)).toEqual({ userId: "u1" });
    }
  });

  it("expires at the absolute timeout even when always active", async () => {
    const { sessionId } = await ctx.service.create("u1");
    const step = 30 * MIN;
    let alive = true;
    for (let elapsed = 0; elapsed < ABSOLUTE_TTL_MS - step; elapsed += step) {
      ctx.advance(step);
      alive = (await ctx.service.authenticate(sessionId)) !== null;
      expect(alive).toBe(true);
    }
    ctx.advance(2 * step);
    expect(await ctx.service.authenticate(sessionId)).toBeNull();
  });

  it("deletes an expired session row", async () => {
    const { sessionId } = await ctx.service.create("u1");
    ctx.advance(IDLE_TIMEOUT_MS + 1);
    await ctx.service.authenticate(sessionId);
    expect(await ctx.store.findById(sessionId)).toBeNull();
  });

  it("writes lastActiveAt at most once per throttle window", async () => {
    const { sessionId } = await ctx.service.create("u1");
    const first = (await ctx.store.findById(sessionId))!.lastActiveAt.getTime();
    ctx.advance(TOUCH_THROTTLE_MS - MIN);
    await ctx.service.authenticate(sessionId);
    expect((await ctx.store.findById(sessionId))!.lastActiveAt.getTime()).toBe(first);
    ctx.advance(2 * MIN);
    await ctx.service.authenticate(sessionId);
    expect((await ctx.store.findById(sessionId))!.lastActiveAt.getTime()).toBeGreaterThan(first);
  });
});

describe("refresh rotation", () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => { ctx = setup(); });

  it("stores only a hash of the refresh token", async () => {
    const { sessionId, refreshToken } = await ctx.service.create("u1");
    const row = (await ctx.store.findById(sessionId))!;
    expect(row.tokenHash).not.toContain(refreshToken);
  });

  it("issues a new refresh token and keeps the same session", async () => {
    const created = await ctx.service.create("u1");
    ctx.advance(20 * MIN);
    const res = await ctx.service.refresh(created.refreshToken);
    expect(res).not.toBeNull();
    expect(res!.sessionId).toBe(created.sessionId);
    expect(res!.refreshToken).not.toBeNull();
    expect(res!.refreshToken).not.toBe(created.refreshToken);
  });

  it("accepts the new token and rotates again", async () => {
    const created = await ctx.service.create("u1");
    ctx.advance(MIN);
    const r1 = await ctx.service.refresh(created.refreshToken);
    ctx.advance(MIN);
    const r2 = await ctx.service.refresh(r1!.refreshToken!);
    expect(r2!.refreshToken).not.toBe(r1!.refreshToken);
  });

  it("does not extend the absolute expiry on rotation", async () => {
    const created = await ctx.service.create("u1");
    const before = (await ctx.store.findById(created.sessionId))!.expiresAt.getTime();
    ctx.advance(10 * MIN);
    await ctx.service.refresh(created.refreshToken);
    expect((await ctx.store.findById(created.sessionId))!.expiresAt.getTime()).toBe(before);
  });

  it("tolerates the old token inside the grace window (parallel requests)", async () => {
    const created = await ctx.service.create("u1");
    ctx.advance(MIN);
    await ctx.service.refresh(created.refreshToken);
    ctx.advance(ROTATION_GRACE_MS - 1000);
    const again = await ctx.service.refresh(created.refreshToken);
    expect(again).not.toBeNull();
    expect(again!.refreshToken).toBeNull(); // cookie already rotated, do not rotate again
  });

  it("rejects the old token after the grace window and kills the session", async () => {
    const created = await ctx.service.create("u1");
    ctx.advance(MIN);
    const r1 = await ctx.service.refresh(created.refreshToken);
    ctx.advance(ROTATION_GRACE_MS + 1000);
    expect(await ctx.service.refresh(created.refreshToken)).toBeNull();
    // reuse = theft signal: the legitimate chain is dead too
    expect(await ctx.service.refresh(r1!.refreshToken!)).toBeNull();
    expect(await ctx.service.authenticate(created.sessionId)).toBeNull();
  });

  it("rejects an unknown token", async () => {
    expect(await ctx.service.refresh("garbage")).toBeNull();
  });

  it("rejects refresh after the idle timeout", async () => {
    const created = await ctx.service.create("u1");
    ctx.advance(IDLE_TIMEOUT_MS + 1);
    expect(await ctx.service.refresh(created.refreshToken)).toBeNull();
  });

  it("rejects refresh after the absolute timeout", async () => {
    const created = await ctx.service.create("u1");
    ctx.advance(ABSOLUTE_TTL_MS + 1);
    expect(await ctx.service.refresh(created.refreshToken)).toBeNull();
  });
});

describe("revocation", () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => { ctx = setup(); });

  it("logout (revoke) invalidates the session on the server", async () => {
    const { sessionId, refreshToken } = await ctx.service.create("u1");
    await ctx.service.revoke(sessionId);
    expect(await ctx.service.authenticate(sessionId)).toBeNull();
    expect(await ctx.service.refresh(refreshToken)).toBeNull();
  });

  it("revokeByToken removes the session owning the refresh token", async () => {
    const { sessionId, refreshToken } = await ctx.service.create("u1");
    await ctx.service.revokeByToken(refreshToken);
    expect(await ctx.service.authenticate(sessionId)).toBeNull();
  });

  it("revokeAllForUser keeps only the excepted session", async () => {
    const a = await ctx.service.create("u1");
    const b = await ctx.service.create("u1");
    const other = await ctx.service.create("u2");
    await ctx.service.revokeAllForUser("u1", a.sessionId);
    expect(await ctx.service.authenticate(a.sessionId)).toEqual({ userId: "u1" });
    expect(await ctx.service.authenticate(b.sessionId)).toBeNull();
    expect(await ctx.service.authenticate(other.sessionId)).toEqual({ userId: "u2" });
  });

  it("revokeAllForUser without exception kills every session of the user", async () => {
    const a = await ctx.service.create("u1");
    const b = await ctx.service.create("u1");
    await ctx.service.revokeAllForUser("u1");
    expect(await ctx.service.authenticate(a.sessionId)).toBeNull();
    expect(await ctx.service.authenticate(b.sessionId)).toBeNull();
  });
});
