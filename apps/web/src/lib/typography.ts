/**
 * Body + Mono type scale (Figma). One source for <Text> and the /typography preview.
 * Values mirror the @utility type-body-* / type-mono-* rules in app/globals.css;
 * typography.test.ts fails if the two drift apart.
 * Class names stay literal strings so Tailwind v4 detects them.
 */

export type TextWeight = "semibold" | "medium" | "regular";
export type BodySize = "xl" | "l" | "m" | "s" | "xs" | "xxs";
export type MonoSize = "l" | "m" | "s" | "xs";

export const BODY_CLASS = {
  semibold: {
    xl: "type-body-sb-xl", l: "type-body-sb-l", m: "type-body-sb-m",
    s: "type-body-sb-s", xs: "type-body-sb-xs", xxs: "type-body-sb-xxs",
  },
  medium: {
    xl: "type-body-m-xl", l: "type-body-m-l", m: "type-body-m-m",
    s: "type-body-m-s", xs: "type-body-m-xs", xxs: "type-body-m-xxs",
  },
  regular: {
    xl: "type-body-r-xl", l: "type-body-r-l", m: "type-body-r-m",
    s: "type-body-r-s", xs: "type-body-r-xs", xxs: "type-body-r-xxs",
  },
} as const satisfies Record<TextWeight, Record<BodySize, string>>;

/** Mono xs exists only in Regular. */
export const MONO_CLASS = {
  semibold: { l: "type-mono-sb-l", m: "type-mono-sb-m", s: "type-mono-sb-s" },
  medium: { l: "type-mono-m-l", m: "type-mono-m-m", s: "type-mono-m-s" },
  regular: { l: "type-mono-r-l", m: "type-mono-r-m", s: "type-mono-r-s", xs: "type-mono-r-xs" },
} as const satisfies Record<TextWeight, Partial<Record<MonoSize, string>>>;

/** [font-size, line-height] in px. Letter spacing is 0 for every style. */
const BODY_METRICS: Record<BodySize, readonly [number, number]> = {
  xl: [20, 30], l: [18, 28], m: [16, 24], s: [14, 22], xs: [12, 18], xxs: [10, 16],
};
const MONO_METRICS: Record<MonoSize, readonly [number, number]> = {
  l: [18, 28], m: [16, 24], s: [14, 22], xs: [12, 18],
};

export const WEIGHT_VALUE: Record<TextWeight, number> = { semibold: 600, medium: 500, regular: 400 };

/** Mono is still Inter (--ff-mono in globals.css). Update together with --ff-mono. */
export const TYPEFACE = { body: "Inter", mono: "Inter" } as const;

export interface TypeStyle {
  className: string;
  variant: "body" | "mono";
  weight: TextWeight;
  size: BodySize | MonoSize;
  fontSize: number;
  lineHeight: number;
}

function entries<T extends object>(obj: T) {
  return Object.entries(obj) as { [K in keyof T]-?: [K, Exclude<T[K], undefined>] }[keyof T][];
}

export const TYPE_STYLES: readonly TypeStyle[] = [
  ...entries(BODY_CLASS).flatMap(([weight, sizes]) =>
    entries(sizes).map(([size, className]) => ({
      className, variant: "body" as const, weight, size,
      fontSize: BODY_METRICS[size][0], lineHeight: BODY_METRICS[size][1],
    })),
  ),
  ...entries(MONO_CLASS).flatMap(([weight, sizes]) =>
    entries(sizes as Partial<Record<MonoSize, string>>).map(([size, className]) => ({
      className, variant: "mono" as const, weight, size,
      fontSize: MONO_METRICS[size][0], lineHeight: MONO_METRICS[size][1],
    })),
  ),
];

/** "Body XL Semibold", "Mono XS Regular" */
export function typeStyleLabel(s: Pick<TypeStyle, "variant" | "size" | "weight">): string {
  const cap = (w: string) => w[0].toUpperCase() + w.slice(1);
  return `${cap(s.variant)} ${s.size.toUpperCase()} ${cap(s.weight)}`;
}
