import Fastify, { type FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  accounts: [] as Array<{ id: string; platform: string; displayName: string }>,
  taken: [] as Array<{ importKey: string }>,
  created: [] as unknown[],
}));

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    account: { findMany: vi.fn(async () => h.accounts) },
    postJob: {
      findMany: vi.fn(async () => h.taken),
      create: vi.fn(async (args: unknown) => {
        h.created.push(args);
        return { id: `job-${h.created.length}` };
      }),
    },
    $transaction: vi.fn(async (run: (tx: unknown) => unknown) => {
      const { prisma } = await import("../lib/prisma.js");
      return run(prisma);
    }),
  },
}));
vi.mock("../lib/auth/withAuth.js", () => ({
  withAuth: async () => {},
  getUser: () => ({ id: "user-1" }),
  getWorkspaceId: () => "ws-1",
  requireContentEditorRole: async () => null,
}));

import { importRoutes } from "./import.js";

const BOUNDARY = "----posthive-test";

/** A multipart body by hand: one file part, then text fields. */
function body(file: { name: string; text: string }, fields: Record<string, string> = {}): Buffer {
  const parts = [
    `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="${file.name}"\r\nContent-Type: text/csv\r\n\r\n${file.text}\r\n`,
    ...Object.entries(fields).map(
      ([name, value]) => `--${BOUNDARY}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
    ),
    `--${BOUNDARY}--\r\n`,
  ];
  return Buffer.from(parts.join(""));
}

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify();
  await app.register(multipart);
  await app.register(importRoutes);
  await app.ready();
});
afterAll(() => app.close());
beforeEach(() => {
  h.accounts = [];
  h.taken = [];
  h.created = [];
});

const post = (url: string, file: { name: string; text: string }, fields?: Record<string, string>) =>
  app.inject({
    method: "POST",
    url,
    headers: { "content-type": `multipart/form-data; boundary=${BOUNDARY}` },
    payload: body(file, fields),
  });

const own = { name: "plan.csv", text: "Content Title,Post Date,Platform\nA post,10-03-2099,LinkedIn\nB post,11-03-2099,IG" };
const foreign = { name: "plan.csv", text: "Headline,When,Where\nA post,10-03-2099,LinkedIn\nB post,11-03-2099,IG" };

describe("POST /jobs/import/preview", () => {
  it("returns the columns with the field each is read as, and nothing missing", async () => {
    const res = await post("/jobs/import/preview", own);
    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.missingFields).toEqual([]);
    expect(json.columns.map((c: { field: string }) => c.field)).toEqual(["title", "postDate", "platform"]);
    expect(json.rows).toHaveLength(2);
    expect(json.rows[0]).toMatchObject({ status: "valid", duplicateKind: null });
  });

  it("does not refuse a file with unknown headers: no rows, the missing fields, the columns to map", async () => {
    const res = await post("/jobs/import/preview", foreign);
    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.missingFields).toEqual(["title", "postDate", "platform"]);
    expect(json.rows).toEqual([]);
    expect(json.summary).toMatchObject({ totalRows: 2, validRows: 0, invalidRows: 0 });
    expect(json.columns.map((c: { label: string; sample: string }) => [c.label, c.sample])).toEqual([
      ["Headline", "A post"],
      ["When", "10-03-2099"],
      ["Where", "LinkedIn"],
    ]);
  });

  it("reads the rows with the mapping the user sent", async () => {
    const res = await post("/jobs/import/preview", foreign, { mapping: JSON.stringify({ 0: "title", 1: "postDate", 2: "platform" }) });
    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.missingFields).toEqual([]);
    expect(json.rows.map((r: { fields: { title: string } }) => r.fields.title)).toEqual(["A post", "B post"]);
    expect(json.columns.map((c: { field: string }) => c.field)).toEqual(["title", "postDate", "platform"]);
  });

  it("marks a date it cannot read, with the cell as the file had it", async () => {
    const res = await post("/jobs/import/preview", { name: "plan.csv", text: "Content Title,Post Date,Platform\nA,31-11-2099,LinkedIn" });
    const [row] = res.json().rows;
    expect(row.status).toBe("invalid");
    expect(row.details.rawPostDate).toBe("31-11-2099");
    expect(row.errors[0].message).toBe('Publish date isn\'t valid: "31-11-2099". Use DD-MM-YYYY (YYYY-MM-DD also works).');
  });

  it("says why a row is a duplicate: of the workspace or of another row", async () => {
    const twice = { name: "plan.csv", text: "Content Title,Post Date,Platform\nA,10-03-2099,LinkedIn\nA,10-03-2099,LinkedIn\nC,12-03-2099,LinkedIn" };
    const first = (await post("/jobs/import/preview", twice)).json();
    expect(first.rows.map((r: { duplicateKind: string | null }) => r.duplicateKind)).toEqual([null, "file", null]);

    const { createHash } = await import("node:crypto");
    h.taken = [{ importKey: createHash("sha256").update("c|2099-03-12|linkedin").digest("hex") }];
    const second = (await post("/jobs/import/preview", twice)).json();
    expect(second.rows[2]).toMatchObject({ status: "duplicate", duplicateKind: "workspace", duplicateReason: "Already imported into this workspace." });
  });

  it.each([
    ["not JSON", "nope"],
    ["an unknown field", JSON.stringify({ 0: "salary" })],
    ["a key that is not a column number", JSON.stringify({ title: "title" })],
    ["a negative column", JSON.stringify({ "-1": "title" })],
  ])("refuses a mapping that is %s", async (_label, mapping) => {
    const res = await post("/jobs/import/preview", own, { mapping });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe("INVALID_MAPPING");
  });

  it("refuses one field on two columns, and a column that is not in the file", async () => {
    const twice = await post("/jobs/import/preview", own, { mapping: JSON.stringify({ 0: "title", 1: "title" }) });
    expect(twice.statusCode).toBe(400);
    expect(twice.json()).toMatchObject({ code: "INVALID_MAPPING", error: expect.stringMatching(/more than one column/) });

    const outside = await post("/jobs/import/preview", own, { mapping: JSON.stringify({ 0: "title", 30: "caption" }) });
    expect(outside.statusCode).toBe(400);
    expect(outside.json().error).toMatch(/Column 31/);
  });

  it("refuses an old Excel file and a file of another type, in English", async () => {
    const xls = await post("/jobs/import/preview", { name: "plan.xls", text: "x" });
    expect(xls.statusCode).toBe(415);
    expect(xls.json().error).toMatch(/aren't supported/);
    const txt = await post("/jobs/import/preview", { name: "plan.txt", text: "x" });
    expect(txt.json().error).toBe("The file must be .csv or .xlsx.");
  });
});

describe("POST /jobs/import/commit", () => {
  it("saves nothing and names the rows when the mapping leaves a required field out", async () => {
    const res = await post("/jobs/import/commit", foreign, { include: "[2,3]" });
    expect(res.statusCode).toBe(422);
    expect(h.created).toEqual([]);
  });

  it("saves the rows read with the same mapping the preview used", async () => {
    const res = await post("/jobs/import/commit", foreign, {
      include: "[2,3]",
      mapping: JSON.stringify({ 0: "title", 1: "postDate", 2: "platform" }),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().summary).toEqual({ totalRows: 2, created: 2 });
    expect(h.created).toHaveLength(2);
  });

  it("refuses a bad mapping before it saves anything", async () => {
    const res = await post("/jobs/import/commit", own, { include: "[2]", mapping: JSON.stringify({ 0: "title", 1: "title" }) });
    expect(res.statusCode).toBe(400);
    expect(h.created).toEqual([]);
  });

  it("refuses the whole batch, in English, when an included row is invalid", async () => {
    const res = await post("/jobs/import/commit", { name: "plan.csv", text: "Content Title,Post Date,Platform\nA,31-11-2099,LinkedIn" }, { include: "[2]" });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({ error: "Some rows aren't valid yet. Nothing was saved.", code: "IMPORT_INVALID" });
    expect(h.created).toEqual([]);
  });
});
