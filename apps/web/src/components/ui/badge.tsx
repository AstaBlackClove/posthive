import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"
import { TONE } from "@/lib/tone"
import { Slot } from "radix-ui"

// Tones follow CLAUDE.md and come from lib/tone.ts.
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2 py-0.5 type-body-sb-xs whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: TONE.neutral,
        plain: TONE.plain,
        brand: TONE.brand,
        success: TONE.success,
        danger: TONE.danger,
        warning: TONE.warning,
        info: TONE.info,
        outline: "border-border bg-transparent text-fg",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
