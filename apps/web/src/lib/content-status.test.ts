import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONTENT_STATUS,
  CONTENT_STATUS_KEYS,
  PRODUCTION_STAGES,
  PUBLICATION_STAGES,
  emptyStatusCounts,
  statusLabel,
} from "./content-status";

describe("content status", () => {
  it("has one entry per key, and the key matches", () => {
    expect(Object.keys(CONTENT_STATUS).sort()).toEqual([...CONTENT_STATUS_KEYS].sort());
    for (const key of CONTENT_STATUS_KEYS) expect(CONTENT_STATUS[key].key).toBe(key);
  });

  it("the pipeline lists the six production stages of the design, in order", () => {
    expect(PRODUCTION_STAGES.map((k) => statusLabel(k))).toEqual([
      "Brief needed", "Copywriting", "In design", "In review", "Changes requested", "Approved",
    ]);
  });


  it("a status has one name everywhere: the pipeline and the table say 'Changes requested' and 'Brief needed', not 'Rejected' and 'Draft'", () => {
    expect(statusLabel("changes")).toBe("Changes requested");
    expect(statusLabel("brief")).toBe("Brief needed");
    expect(CONTENT_STATUS.changes.dot).toBe("bg-status-changes");
  });

  it("Published is blue, so it is not taken for In review, which is yellow", () => {
    expect(CONTENT_STATUS.published.dot).toBe("bg-blue-600");
    expect(CONTENT_STATUS.published.dot).not.toBe(CONTENT_STATUS.review.dot);
  });

  it("production and publication stages do not overlap and together cover every status", () => {
    expect([...PRODUCTION_STAGES, ...PUBLICATION_STAGES].sort()).toEqual([...CONTENT_STATUS_KEYS].sort());
  });

  it("every dot is a token class, never a hex or an arbitrary colour", () => {
    for (const s of Object.values(CONTENT_STATUS)) expect(s.dot).toMatch(/^bg-[a-z]+(-[a-z]+)?(-\d{2,3})?$/);
  });

  it("every dot colour exists in globals.css", () => {
    const css = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../app/globals.css"), "utf8");
    for (const s of Object.values(CONTENT_STATUS)) {
      const token = s.dot.replace(/^bg-/, "");
      const defined = new RegExp(`--color-${token}\\s*:`).test(css);
      expect(defined, `${s.key}: --color-${token}`).toBe(true);
    }
  });

  it("the two dots without a palette step are registered as theme colours", () => {
    const css = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../app/globals.css"), "utf8");
    expect(css).toMatch(/--color-status-design:\s*var\(--status-design\)/);
    expect(css).toMatch(/--color-status-changes:\s*var\(--status-changes\)/);
  });

  it("emptyStatusCounts is all zero, with every key", () => {
    const counts = emptyStatusCounts();
    expect(Object.keys(counts)).toHaveLength(CONTENT_STATUS_KEYS.length);
    expect(Object.values(counts).every((n) => n === 0)).toBe(true);
  });
});
