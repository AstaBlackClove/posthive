import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The type-{display|head|body|mono}-{sb|m|r}-{size} utilities (globals.css) set the whole
 * `font` shorthand, so they conflict with text-{size}, font-{weight}, leading-* and font-{family}
 * in both directions. In the built CSS `.type-*` comes after `.text-sm`, so without this the
 * last class in the string would not decide the winner.
 */
const twMerge = extendTailwindMerge<"type-style">({
  extend: {
    classGroups: {
      "type-style": [{ type: [(value: string) => /^(display|head|body|mono)-(sb|m|r)-[a-z0-9]+$/.test(value)] }],
    },
    conflictingClassGroups: {
      "type-style": ["font-size", "font-weight", "leading", "font-family"],
      "font-size": ["type-style"],
      "font-weight": ["type-style"],
      leading: ["type-style"],
      "font-family": ["type-style"],
    },
  },
});

/** Join class names and resolve conflicts, last one wins: cn("p-2", active && "bg-brand-100", className) */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
