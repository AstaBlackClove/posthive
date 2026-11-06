import { BRAND } from "../lib/brand";
import { cn } from "../lib/cn";

type Props = {
  /** `full`: the uppercase name. `mark`: first letter in a rounded square (collapsed sidebar, small spots). */
  variant?: "full" | "mark";
  size?: "sm" | "md" | "lg";
  className?: string;
};

// A logo is not body typography, so it sets its own size instead of a `type-*` token.
const FULL_SIZE = { sm: "text-lg", md: "text-xl", lg: "text-2xl" } as const;
const MARK_SIZE = { sm: "size-7 text-base", md: "size-8 text-lg", lg: "size-9 text-xl" } as const;

/** Brand logo. Colour follows `currentColor`, so set `text-*` on it or on a parent. */
export function Wordmark({ variant = "full", size = "md", className }: Props) {
  if (variant === "mark") {
    return (
      <span
        aria-label={BRAND.name}
        role="img"
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-lg bg-accent font-heading font-semibold leading-none text-accent-fg",
          MARK_SIZE[size],
          className,
        )}
      >
        {BRAND.name.charAt(0)}
      </span>
    );
  }
  return (
    <span className={cn("font-heading font-semibold uppercase leading-none tracking-wide", FULL_SIZE[size], className)}>
      {BRAND.name}
    </span>
  );
}
