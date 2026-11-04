import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "../../lib/cn";
import { BODY_CLASS, MONO_CLASS, type BodySize, type MonoSize, type TextWeight } from "../../lib/typography";

type MonoClass = typeof MONO_CLASS;

/** Every legal Mono weight + size pair, read off MONO_CLASS (xs exists only in regular). */
type MonoStyle = {
  [W in keyof MonoClass]: { variant: "mono"; weight: W; size: keyof MonoClass[W] };
}[keyof MonoClass];

/** weight defaults to "regular", variant defaults to "body". */
export type TextStyle =
  | { variant?: "body"; size: BodySize; weight?: TextWeight }
  | MonoStyle
  | { variant: "mono"; size: keyof MonoClass["regular"]; weight?: undefined };

export type TextProps<T extends ElementType = "span"> = TextStyle & {
  as?: T;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "variant" | "size" | "weight">;

/** The type-* utility for a style: textClass({ size: "s", weight: "semibold" }) → "type-body-sb-s" */
export function textClass(style: TextStyle): string {
  const weight = style.weight ?? "regular";
  if (style.variant === "mono") {
    // TextStyle only admits pairs that exist in MONO_CLASS.
    return (MONO_CLASS[weight] as Record<MonoSize, string>)[style.size];
  }
  return BODY_CLASS[weight][style.size];
}

/**
 * Text in the Body / Mono scale.
 * <Text size="s" weight="semibold">, <Text variant="mono" size="xs" as="code">
 */
export function Text<T extends ElementType = "span">({ as, variant, size, weight, className, ...rest }: TextProps<T>) {
  const Tag: ElementType = as ?? "span";
  const style = { variant, size, weight } as TextStyle;
  return <Tag {...rest} className={cn(textClass(style), className)} />;
}
