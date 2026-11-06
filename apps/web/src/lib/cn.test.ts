import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("joins classes and skips falsy values", () => {
    expect(cn("p-2", false, null, undefined, "bg-surface")).toBe("p-2 bg-surface");
  });

  it("accepts arrays and objects like clsx", () => {
    expect(cn(["a", { b: true, c: false }])).toBe("a b");
  });

  it("lets the last conflicting utility win", () => {
    expect(cn("px-2 px-4")).toBe("px-4");
    expect(cn("rounded-xl", "rounded-lg")).toBe("rounded-lg");
  });

  it("merges the Postly colour tokens", () => {
    expect(cn("text-fg", "text-muted")).toBe("text-muted");
    expect(cn("bg-surface", "bg-bg")).toBe("bg-bg");
    expect(cn("border-border", "border-red-300")).toBe("border-red-300");
  });

  it("keeps a text colour next to a type-* style (they do not conflict)", () => {
    expect(cn("type-body-sb-s", "text-muted")).toBe("type-body-sb-s text-muted");
    expect(cn("text-muted", "type-body-sb-s")).toBe("text-muted type-body-sb-s");
  });

  it("keeps the last type-* style", () => {
    expect(cn("type-body-sb-s", "type-body-r-xs")).toBe("type-body-r-xs");
    expect(cn("type-head-sb-5", "type-display-m-6")).toBe("type-display-m-6");
    expect(cn("type-mono-r-s", "type-body-r-s")).toBe("type-body-r-s");
  });

  it("lets a type-* style override a size, weight or leading set earlier", () => {
    expect(cn("text-sm", "type-body-sb-s")).toBe("type-body-sb-s");
    expect(cn("font-medium", "type-body-sb-s")).toBe("type-body-sb-s");
    expect(cn("leading-6", "type-body-sb-s")).toBe("type-body-sb-s");
  });

  it("lets a size, weight or leading override a type-* style set earlier", () => {
    expect(cn("type-body-sb-s", "text-sm")).toBe("text-sm");
    expect(cn("type-body-sb-s", "font-medium")).toBe("font-medium");
    expect(cn("type-body-sb-s", "leading-6")).toBe("leading-6");
  });
});
