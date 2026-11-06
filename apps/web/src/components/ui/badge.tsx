import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"
import { Slot } from "radix-ui"

// Tones follow CLAUDE.md: success / danger / warning / info use the 50 fill, 200 border, 700 text.
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2 py-0.5 type-body-sb-xs whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-border bg-surface text-muted-foreground",
        brand: "border-brand-300 bg-brand-100 text-brand-800",
        success: "border-green-200 bg-green-50 text-green-700",
        danger: "border-red-200 bg-red-50 text-red-600",
        warning: "border-brand-400 bg-brand-100 text-brand-800",
        info: "border-blue-200 bg-blue-50 text-blue-700",
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
