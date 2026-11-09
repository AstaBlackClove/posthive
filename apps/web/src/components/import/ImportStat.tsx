import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const TONE = {
  default: "text-fg",
  success: "text-green-700",
  danger: "text-red-600",
  brand: "text-brand-800",
} as const;

/** A big number with its label under it: the four counts above the review table and on the success screen. */
export function ImportStat({
  value,
  label,
  tone = "default",
  surface = "card",
  className,
}: {
  value: ReactNode;
  label: ReactNode;
  tone?: keyof typeof TONE;
  /** card: its own bordered box. tile: a soft tile inside a card. */
  surface?: "card" | "tile";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl px-5 py-4",
        surface === "card" ? "border border-border bg-surface" : "bg-bg",
        className
      )}
    >
      <p className={cn("type-head-sb-5 tabular-nums", TONE[tone])}>{value}</p>
      <p className="type-body-r-xs text-muted">{label}</p>
    </div>
  );
}
