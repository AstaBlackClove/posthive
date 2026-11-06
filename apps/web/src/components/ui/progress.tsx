"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { Progress as ProgressPrimitive } from "radix-ui"

// The fill width is a CSS variable (the allowed runtime-value pattern), not an inline width.
// Recolour the fill with indicatorClassName, e.g. "bg-red-500" when a limit is reached.
function Progress({
  className,
  indicatorClassName,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indicatorClassName?: string
}) {
  const pct = Math.min(100, Math.max(0, value ?? 0))
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={pct}
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-full bg-neutral-100",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full w-(--progress) rounded-full bg-primary transition-[width]",
          indicatorClassName
        )}
        style={{ "--progress": `${pct}%` } as React.CSSProperties}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
