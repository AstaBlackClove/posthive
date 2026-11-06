import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"
import { Slot } from "radix-ui"

// Heights come from padding + the type-* line height, not a fixed h-*: default is 38px,
// secondary-style buttons 40px (the border adds 2px), same as the old btn-* classes.
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl type-body-sb-s whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-']):not([class*='w-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-brand-500",
        secondary: "border border-border bg-surface text-fg hover:bg-neutral-100",
        // The olive button of the dashboard design ("Import plan", "Add account")
        olive: "bg-neutral-600 text-white hover:bg-neutral-800",
        destructive: "bg-destructive text-destructive-foreground hover:bg-red-600",
        "destructive-outline":
          "border border-red-200 bg-surface text-red-600 hover:bg-red-50",
        ghost: "text-muted-foreground hover:bg-neutral-100 hover:text-fg",
        link: "text-brand-800 underline-offset-4 hover:text-brand-900 hover:underline",
        // Dark auth screens: taller, brighter yellow
        auth: "h-12 min-w-45 bg-brand-500 px-8 text-accent-fg hover:bg-brand-400",
      },
      size: {
        default: "px-4 py-2",
        sm: "gap-1.5 rounded-lg px-2.5 py-1 type-body-sb-xs",
        lg: "px-6 py-3",
        icon: "size-10",
        // 28px square, the old job-action-btn
        "icon-sm": "size-7 rounded-lg",
      },
    },
    compoundVariants: [
      // a link has no box
      { variant: "link", class: "h-auto min-w-0 rounded-sm p-0" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
