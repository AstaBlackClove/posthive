import { describe, expect, it } from "vitest";
import { safeReturnTo } from "./returnTo.js";

describe("safeReturnTo", () => {
  it("keeps same-site paths with query and hash", () => {
    expect(safeReturnTo("/compose?x=1#a")).toBe("/compose?x=1#a");
    expect(safeReturnTo("/jobs")).toBe("/jobs");
  });

  it("falls back for empty or non-string input", () => {
    expect(safeReturnTo(undefined)).toBe("/dashboard");
    expect(safeReturnTo(null)).toBe("/dashboard");
    expect(safeReturnTo("")).toBe("/dashboard");
    expect(safeReturnTo(42)).toBe("/dashboard");
    expect(safeReturnTo("", "/x")).toBe("/x");
  });

  it("rejects other sites, including the tab/newline tricks a browser would 'fix'", () => {
    for (const bad of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "/\t/evil.com",
      "/\n/evil.com",
      "/\r/evil.com",
      "/\\\t/evil.com",
      "javascript:alert(1)",
      "evil.com",
    ]) {
      expect(safeReturnTo(bad), JSON.stringify(bad)).toBe("/dashboard");
    }
  });
});
