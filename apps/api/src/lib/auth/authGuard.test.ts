import { describe, expect, it } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { createAuthGuard, setAuthCookies, SESSION_EXPIRED_BODY, UNAUTHENTICATED_BODY } from "./authGuard.js";
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
    expect(cleared).toEqual(["ss-access-token", "ss-refresh-token", "ss-session-only"]);
  });
});

describe("keep me logged in (cookie lifetime)", () => {
  async function buildLoginApp(remember: boolean) {
    const app = Fastify();
    await app.register(cookie);
    app.get("/login", async (_req, reply) => {
      setAuthCookies(reply, "a", "r", { persistent: remember });
      return { ok: true };
    });
    return app;
  }

  it("persistent login sets expiring cookies and no session-only marker", async () => {
    const app = await buildLoginApp(true);
    const res = await app.inject({ method: "GET", url: "/login" });
    expect(res.cookies.find((c) => c.name === "ss-access-token")?.maxAge).toBe(15 * 60);
    expect(res.cookies.find((c) => c.name === "ss-refresh-token")?.maxAge).toBe(7 * 24 * 60 * 60);
    const marker = res.cookies.find((c) => c.name === "ss-session-only");
    expect(marker?.value ?? "").toBe("");
  });

  it("session-only login sets cookies without maxAge/expires and marks the session", async () => {
    const app = await buildLoginApp(false);
    const res = await app.inject({ method: "GET", url: "/login" });
    for (const name of ["ss-access-token", "ss-refresh-token", "ss-session-only"]) {
      const c = res.cookies.find((x) => x.name === name);
      expect(c, name).toBeDefined();
      expect(c?.maxAge, name).toBeUndefined();
      expect(c?.expires, name).toBeUndefined();
      expect(c?.httpOnly, name).toBe(true);
    }
    expect(res.cookies.find((c) => c.name === "ss-session-only")?.value).toBe("1");
  });

  it("keeps rotated cookies session-only when the marker is present", async () => {
    const app = await build(makeProvider());
    const res = await app.inject({
      method: "GET",
      url: "/p",
      cookies: { "ss-access-token": "stale", "ss-refresh-token": "refresh-ok", "ss-session-only": "1" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.cookies.find((c) => c.name === "ss-access-token")?.maxAge).toBeUndefined();
    expect(res.cookies.find((c) => c.name === "ss-refresh-token")?.maxAge).toBeUndefined();
    expect(res.cookies.find((c) => c.name === "ss-session-only")?.value).toBe("1");
  });

  it("keeps rotated cookies persistent when there is no marker", async () => {
    const app = await build(makeProvider());
    const res = await app.inject({
      method: "GET",
      url: "/p",
      cookies: { "ss-access-token": "stale", "ss-refresh-token": "refresh-ok" },
    });
    expect(res.cookies.find((c) => c.name === "ss-access-token")?.maxAge).toBe(15 * 60);
    expect(res.cookies.find((c) => c.name === "ss-refresh-token")?.maxAge).toBe(7 * 24 * 60 * 60);
  });
});
