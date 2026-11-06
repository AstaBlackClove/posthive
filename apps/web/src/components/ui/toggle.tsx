"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"
import { Toggle as TogglePrimitive } from "radix-ui"

// default = the old `chip` / `chip-active` (own border, brand-100 when on).
// pill = one segment of a pill group: transparent, yellow when on (Day / Week / Month).
const toggleVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-1.5 border whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-red-400 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-']):not([class*='w-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "rounded-lg border-border bg-surface text-muted-foreground hover:text-fg data-[state=on]:border-brand-300 data-[state=on]:bg-brand-100 data-[state=on]:text-brand-800 data-[state=on]:hover:text-brand-800",
        pill: "rounded-full border-transparent bg-transparent text-muted-foreground hover:text-fg data-[state=on]:bg-brand-500 data-[state=on]:text-accent-fg data-[state=on]:hover:text-accent-fg",
      },
      size: {
        default: "px-2.5 py-1 type-body-sb-xs",
        sm: "px-2 py-0.5 type-body-sb-xxs",
        lg: "px-3 py-1.5 type-body-sb-s",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
