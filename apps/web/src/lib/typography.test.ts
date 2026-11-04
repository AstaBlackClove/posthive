import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TYPEFACE, TYPE_STYLES, WEIGHT_VALUE, typeStyleLabel } from "./typography";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

type Rule = { weight: number; fontSize: number; lineHeight: number; family: string };

/** Every `@utility type-body-* / type-mono-* { font: W Xrem/Yrem var(--ff-F); }` in globals.css */
function parseUtilities(): Map<string, Rule> {
  const re = /@utility (type-(?:body|mono)-[a-z]+-[a-z]+)\s*\{\s*font:\s*(\d+)\s+([\d.]+)rem\/([\d.]+)rem\s+var\(--ff-([a-z]+)\);\s*\}/g;
  const rules = new Map<string, Rule>();
  for (const m of css.matchAll(re)) {
    rules.set(m[1], {
      weight: Number(m[2]),
      fontSize: Number(m[3]) * 16,
      lineHeight: Number(m[4]) * 16,
      family: m[5],
    });
  }
  return rules;
}

describe("type scale matches globals.css", () => {
  const rules = parseUtilities();

  it("has exactly the Body + Mono utilities listed in TYPE_STYLES", () => {
    expect([...rules.keys()].sort()).toEqual(TYPE_STYLES.map((s) => s.className).sort());
  });

  it.each(TYPE_STYLES.map((s) => [s.className, s] as const))("%s: weight, size, line-height, font", (cls, s) => {
    expect(rules.get(cls)).toEqual({
      weight: WEIGHT_VALUE[s.weight],
      fontSize: s.fontSize,
      lineHeight: s.lineHeight,
      family: s.variant === "mono" ? "mono" : "inter",
    });
  });

  it("only Mono Regular has an xs size", () => {
    const monoXs = TYPE_STYLES.filter((s) => s.variant === "mono" && s.size === "xs");
    expect(monoXs.map((s) => s.className)).toEqual(["type-mono-r-xs"]);
  });

  it("wires --font-mono to --ff-mono", () => {
    expect(css).toMatch(/--font-mono:\s*var\(--ff-mono\);/);
  });

  it("TYPEFACE.mono says Inter exactly while --ff-mono points at Inter", () => {
    const monoIsInter = /--ff-mono:\s*var\(--ff-inter\);/.test(css);
    expect(TYPEFACE.mono === "Inter").toBe(monoIsInter);
  });
});

describe("typeStyleLabel", () => {
  it("formats variant, size and weight", () => {
    expect(typeStyleLabel({ variant: "body", size: "xxs", weight: "semibold" })).toBe("Body XXS Semibold");
    expect(typeStyleLabel({ variant: "mono", size: "xs", weight: "regular" })).toBe("Mono XS Regular");
  });
});
