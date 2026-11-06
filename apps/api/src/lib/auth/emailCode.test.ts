import { describe, expect, it } from "vitest";
import {
  CODE_LENGTH, CODE_TTL_MIN, codeExpired, codeMatches, generateCode, hashCode, isCodeFormat,
} from "./emailCode.js";

describe("generateCode", () => {
  it("returns exactly 6 digits, zero-padded", () => {
    for (let i = 0; i < 500; i++) expect(generateCode()).toMatch(/^\d{6}$/);
    expect(CODE_LENGTH).toBe(6);
  });

  it("is not constant", () => {
    const seen = new Set(Array.from({ length: 50 }, generateCode));
    expect(seen.size).toBeGreaterThan(40);
  });
});

describe("isCodeFormat", () => {
  it("accepts only 6 digits", () => {
    expect(isCodeFormat("012345")).toBe(true);
    for (const bad of ["12345", "1234567", "12345a", " 12345", "12 345", "", "１２３４５６", 123456, null, undefined]) {
      expect(isCodeFormat(bad)).toBe(false);
    }
  });
});

describe("codeMatches", () => {
  const token = "t".repeat(64);
  const hash = hashCode(token, "482913");

  it("matches the right code for the right token", () => {
    expect(codeMatches(token, "482913", hash)).toBe(true);
  });

  it("rejects a wrong code", () => {
    expect(codeMatches(token, "482914", hash)).toBe(false);
  });

  it("rejects the right code under another token", () => {
    expect(codeMatches("x".repeat(64), "482913", hash)).toBe(false);
  });

  it("rejects a malformed stored hash instead of throwing", () => {
    expect(codeMatches(token, "482913", "zz")).toBe(false);
  });
});

describe("codeExpired", () => {
  const created = new Date("2026-11-05T10:00:00Z");

  it("is valid before the TTL and expired at it", () => {
    const before = new Date(created.getTime() + (CODE_TTL_MIN * 60 - 1) * 1000);
    const at = new Date(created.getTime() + CODE_TTL_MIN * 60 * 1000);
    expect(codeExpired(created, before)).toBe(false);
    expect(codeExpired(created, at)).toBe(true);
  });
});
