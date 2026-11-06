import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  label: ReactNode;
  value: ReactNode;
  /** A line under the value (card layout). */
  sub?: ReactNode;
  /**
   * card: a boxed tile with a big number (analytics).
   * inline: "12 Queued" in a toolbar row (library, import). Tone colours the number.
   */
  variant?: "card" | "inline";
  tone?: "default" | "brand" | "success" | "danger";
  className?: string;
};

const VALUE_TONE = {
  default: "text-fg",
  brand: "text-brand-800",
  success: "text-green-700",
  danger: "text-red-600",
} as const;

/** One number with its label. */
export function StatTile({ label, value, sub, variant = "card", tone = "default", className }: Props) {
  if (variant === "inline") {
    return (
      <div className={cn("flex items-baseline gap-1.5", className)}>
        <span className={cn("type-body-sb-l", VALUE_TONE[tone])}>{value}</span>
        <span className="type-body-r-xs text-muted">{label}</span>
      </div>
    );
  }
  return (
    <div className={cn("card flex flex-col gap-1 p-5", className)}>
      <p className="type-body-m-xs tracking-wide text-muted uppercase">{label}</p>
      <p className={cn("type-head-sb-4", VALUE_TONE[tone])}>{value}</p>
      {sub && <p className="type-body-r-xs text-muted">{sub}</p>}
    </div>
  );
}
