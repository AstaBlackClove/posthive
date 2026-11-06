import { describe, expect, it } from "vitest";
import { passwordProblem } from "./passwordPolicy.js";

describe("passwordProblem", () => {
  it("accepts 8+ characters with a number", () => {
    expect(passwordProblem("abcdefg1")).toBeNull();
    expect(passwordProblem("12345678")).toBeNull();
  });

  it("rejects short passwords", () => {
    expect(passwordProblem("abc1")).toMatch(/at least 8/);
    expect(passwordProblem("abcdef1")).toMatch(/at least 8/);
  });

  it("rejects passwords without a number", () => {
    expect(passwordProblem("abcdefgh")).toMatch(/1 number/);
  });

  it("reports length before the number rule", () => {
    expect(passwordProblem("abc")).toMatch(/at least 8/);
  });

  it("counts characters, not bytes", () => {
    expect(passwordProblem("pässwörd1")).toBeNull();
  });
});
