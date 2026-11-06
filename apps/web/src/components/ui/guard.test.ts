import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// shadcn components arrive with defaults that clash with this project (CLAUDE.md, globals.css).
// This scans every file in components/ui and fails if one slipped back in, the same way
// lib/typography.test.ts guards the type-* utilities.

const dir = path.dirname(fileURLToPath(import.meta.url));

/** A class can carry variants in front: hover:, data-[state=on]:, group-data-[x]/y:, … */
const B = String.raw`(?<![\w-])`; // not in the middle of another class
const E = String.raw`(?![\w-])`; // whole class (a "/50" opacity suffix still counts)

export const RULES: { name: string; why: string; pattern: RegExp }[] = [
  {
    name: "bg-accent / bg-muted",
    why: "accent is brand yellow and muted is secondary text here. Hover is bg-neutral-100, a subtle fill is bg-surface, an active item is bg-brand-100",
    pattern: new RegExp(`${B}(?:bg|from|to|via)-(?:accent|muted)${E}`),
  },
  {
    name: "text-accent / text-accent-foreground",
    why: "yellow text on cream is unreadable. Use text-brand-800 (or text-fg)",
    pattern: new RegExp(`${B}text-accent(?:-foreground)?${E}`),
  },
  {
    name: "text-primary",
    why: "primary is the yellow fill. Text uses text-brand-800 (links) or text-fg",
    pattern: new RegExp(`${B}text-primary${E}`),
  },
  {
    name: "text-{size}",
    why: "use a type-body-* / type-mono-* utility; it sets the whole font shorthand",
    pattern: new RegExp(`${B}text-(?:xs|sm|base|lg|xl|[2-9]xl)${E}|${B}text-\\[\\d`),
  },
  {
    name: "font-{weight}",
    why: "the weight is part of the type-* utility",
    pattern: new RegExp(`${B}font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)${E}`),
  },
  {
    name: "leading-*",
    why: "the line height is part of the type-* utility",
    pattern: new RegExp(`${B}leading-`),
  },
  {
    name: "rounded-md / rounded-xs",
    why: "Postly radii: controls rounded-xl, items rounded-lg, panels rounded-2xl, small rounded-sm",
    pattern: new RegExp(`${B}rounded-(?:md|xs)${E}`),
  },
  {
    name: "dark:",
    why: "the app is light-theme only",
    pattern: new RegExp(`${B}dark:`),
  },
  {
    name: "shadow-xs",
    why: "Postly has no hairline shadow; borders do that job",
    pattern: new RegExp(`${B}shadow-xs${E}`),
  },
  {
    name: "fixed h-9",
    why: "heights come from padding and the type-* line height (38px / 40px), not a fixed 36px",
    pattern: new RegExp(`${B}h-9${E}`),
  },
  {
    name: "ring-[3px]",
    why: "focus rings are 2px (ring-2 ring-ring/40)",
    pattern: new RegExp(`${B}ring-\\[3px\\]`),
  },
  {
    name: "svg size rule without the w-* escape",
    why: "an icon that already has w-* must keep it: use :not([class*='size-']):not([class*='w-'])",
    pattern: /\[class\*='size-'\]\)\]/,
  },
];

function uiFiles(): string[] {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx") && f !== "Text.tsx")
    .sort();
}

describe("components/ui guard", () => {
  it("finds the shadcn components", () => {
    // if this drops to 0 the scan below passes for the wrong reason
    expect(uiFiles().length).toBeGreaterThanOrEqual(25);
  });

  for (const rule of RULES) {
    it(`no ${rule.name} (${rule.why})`, () => {
      const hits: string[] = [];
      for (const file of uiFiles()) {
        const lines = fs.readFileSync(path.join(dir, file), "utf8").split(/\r?\n/);
        lines.forEach((line, i) => {
          const m = line.match(rule.pattern);
          if (m) hits.push(`${file}:${i + 1}  ${m[0]}`);
        });
      }
      expect(hits).toEqual([]);
    });
  }
});

describe("guard rules catch what they are meant to", () => {
  const bad: Record<string, string> = {
    "bg-accent / bg-muted": 'className="hover:bg-accent data-[state=on]:bg-muted/50"',
    "text-accent / text-accent-foreground": 'className="data-[state=on]:text-accent-foreground text-accent"',
    "text-primary": 'className="text-primary underline"',
    "text-{size}": 'className="text-sm text-[0.8rem] md:text-xs"',
    "font-{weight}": 'className="font-medium"',
    "leading-*": 'className="leading-none"',
    "rounded-md / rounded-xs": 'className="rounded-md"',
    "dark:": 'className="dark:bg-input/30"',
    "shadow-xs": 'className="shadow-xs"',
    "fixed h-9": 'className="data-[size=default]:h-9"',
    "ring-[3px]": 'className="focus-visible:ring-[3px]"',
    "svg size rule without the w-* escape": "[&_svg:not([class*='size-'])]:size-4",
  };
  const good = [
    'className="hover:bg-neutral-100 text-accent-fg bg-primary text-muted-foreground"',
    'className="type-body-sb-s rounded-xl border-border bg-surface text-fg"',
    "[&_svg:not([class*='size-']):not([class*='w-'])]:size-4",
    'className="text-balance text-brand-800 h-90 ring-2 ring-ring/40"',
  ];

  for (const rule of RULES) {
    it(`${rule.name}: flags a bad class`, () => {
      expect(bad[rule.name], `add a bad sample for "${rule.name}"`).toBeDefined();
      expect(rule.pattern.test(bad[rule.name])).toBe(true);
    });
  }

  it("lets the Postly tokens through", () => {
    for (const sample of good) {
      for (const rule of RULES) expect(rule.pattern.test(sample), `${rule.name} on ${sample}`).toBe(false);
    }
  });
});
