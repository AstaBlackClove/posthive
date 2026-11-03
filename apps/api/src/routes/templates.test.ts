import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import type { StorageAdapter } from "../lib/storage.js";
import { templateRoutes } from "./templates.js";

describe("template routes", () => {
  it("no longer has the .fig upload endpoint", async () => {
    const app = Fastify();
    await app.register(templateRoutes, { storage: {} as StorageAdapter });
    await app.ready();
    expect(app.hasRoute({ method: "POST", url: "/templates/file" })).toBe(false);
    expect(app.hasRoute({ method: "POST", url: "/templates" })).toBe(true);
    const res = await app.inject({ method: "POST", url: "/templates/file" });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});
