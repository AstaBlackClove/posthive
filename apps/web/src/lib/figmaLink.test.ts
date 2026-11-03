import { describe, expect, it } from "vitest";
import { figmaLinkError, isFigmaDesignUrl } from "./figmaLink";

describe("isFigmaDesignUrl", () => {
  it.each([
    "https://www.figma.com/design/AbC123/Slope-stability?node-id=1-2",
    "https://figma.com/file/AbC123/Old-style-link",
    "https://www.figma.com/proto/AbC123/Prototype",
    "https://www.figma.com/board/AbC123/FigJam-board",
    "https://team.figma.com/design/AbC123/Sub-domain",
  ])("accepts %s", (url) => {
    expect(isFigmaDesignUrl(url)).toBe(true);
  });

  it.each([
    ["a non-Figma site", "https://example.com/design/abc"],
    ["plain http", "http://www.figma.com/design/abc"],
    ["a look-alike host", "https://figma.com.evil.io/design/abc"],
    ["a host that only ends with figma.com", "https://notfigma.com/design/abc"],
    ["a Figma page that is not a design", "https://www.figma.com/pricing"],
    ["the Figma home page", "https://www.figma.com/"],
    ["text that is not a URL", "figma design please"],
    ["an empty string", ""],
  ])("rejects %s", (_name, url) => {
    expect(isFigmaDesignUrl(url)).toBe(false);
  });

  it("ignores surrounding spaces", () => {
    expect(isFigmaDesignUrl("  https://www.figma.com/design/abc/x  ")).toBe(true);
  });
});

describe("figmaLinkError", () => {
  it("returns null for a valid link", () => {
    expect(figmaLinkError("https://www.figma.com/design/abc/x")).toBeNull();
  });

  it("asks for a link when empty", () => {
    expect(figmaLinkError("  ")).toBe("Add a Figma link.");
  });

  it("explains what a valid link looks like", () => {
    expect(figmaLinkError("https://example.com/x")).toMatch(/figma\.com\/design/);
  });
});
