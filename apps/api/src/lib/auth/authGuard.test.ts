import { describe, expect, it } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { createAuthGuard, SESSION_EXPIRED_BODY, UNAUTHENTICATED_BODY } from "./authGuard.js";
import type { AuthProvider } from "./types.js";

const USER = { id: "u1", email: "a@b.c", name: "A", avatarUrl: null, timezone: "UTC" };

function makeProvider(overrides: Partial<AuthProvider> = {}): AuthProvider {
  return {
    register: async () => { throw new Error("unused"); },
    login: async () => { throw new Error("unused"); },
    validateAccessToken: async (t) => (t === "good" ? { ...USER, sessionId: "s1" } : null),
    refreshTokens: async (t) => (t === "refresh-ok" ? { accessToken: "good", refreshToken: "refresh-2" } : null),
    logout: async () => {},
    ...overrides,
  };
}

async function build(provider: AuthProvider) {
  const app = Fastify();
  await app.register(cookie);
  const guard = createAuthGuard({ provider, resolveWorkspace: async (req) => { req.workspaceId = "w1"; } });
  app.get("/p", { preHandler: [guard.withAuth] }, async (req) => ({ id: req.user?.id, sid: req.sessionId, ws: req.workspaceId }));
  return app;
}

describe("auth guard", () => {
  it("lets a valid access cookie through and exposes the session id", async () => {
    const app = await build(makeProvider());
    const res = await app.inject({ method: "GET", url: "/p", cookies: { "ss-access-token": "good" } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: "u1", sid: "s1", ws: "w1" });
  });

  it("returns UNAUTHENTICATED when there are no cookies", async () => {
    const app = await build(makeProvider());
    const res = await app.inject({ method: "GET", url: "/p" });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual(UNAUTHENTICATED_BODY);
  });

  it("returns the same SESSION_EXPIRED body for a revoked/expired access token", async () => {
    const app = await build(makeProvider());
    const res = await app.inject({ method: "GET", url: "/p", cookies: { "ss-access-token": "stale", "ss-refresh-token": "dead" } });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual(SESSION_EXPIRED_BODY);
    expect(SESSION_EXPIRED_BODY.code).toBe("SESSION_EXPIRED");
  });

  it("returns SESSION_EXPIRED when only a bad access token is present", async () => {
    const app = await build(makeProvider());
    const res = await app.inject({ method: "GET", url: "/p", cookies: { "ss-access-token": "stale" } });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual(SESSION_EXPIRED_BODY);
  });

  it("refreshes transparently and sets rotated cookies", async () => {
    const app = await build(makeProvider());
    const res = await app.inject({ method: "GET", url: "/p", cookies: { "ss-access-token": "stale", "ss-refresh-token": "refresh-ok" } });
    expect(res.statusCode).toBe(200);
    const names = res.cookies.map((c) => c.name);
    expect(names).toContain("ss-access-token");
    expect(res.cookies.find((c) => c.name === "ss-refresh-token")?.value).toBe("refresh-2");
  });

  it("does not touch the refresh cookie when the provider says keep it (grace window)", async () => {
    const app = await build(makeProvider({
      refreshTokens: async () => ({ accessToken: "good", refreshToken: null }),
    }));
    const res = await app.inject({ method: "GET", url: "/p", cookies: { "ss-access-token": "stale", "ss-refresh-token": "old" } });
    expect(res.statusCode).toBe(200);
    expect(res.cookies.find((c) => c.name === "ss-refresh-token")).toBeUndefined();
  });

  it("clears both cookies on 401", async () => {
    const app = await build(makeProvider());
    const res = await app.inject({ method: "GET", url: "/p", cookies: { "ss-access-token": "stale", "ss-refresh-token": "dead" } });
    const cleared = res.cookies.filter((c) => c.value === "").map((c) => c.name).sort();
    expect(cleared).toEqual(["ss-access-token", "ss-refresh-token"]);
  });
});
