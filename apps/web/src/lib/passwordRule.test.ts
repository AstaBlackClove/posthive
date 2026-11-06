import { describe, expect, it } from "vitest";
import { PASSWORD_HINT, passwordProblem } from "./passwordRule";

describe("passwordProblem", () => {
  it("accepts 8+ characters with a number", () => {
    expect(passwordProblem("abcdefg1")).toBeNull();
  });

  it("rejects short passwords and passwords without a number", () => {
    expect(passwordProblem("abc1")).toMatch(/at least 8/);
    expect(passwordProblem("abcdefgh")).toMatch(/1 number/);
  });

  it("keeps the hint in line with the rule", () => {
    expect(PASSWORD_HINT).toBe("8+ characters, 1 number");
  });
});
