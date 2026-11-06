import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

// Tones follow CLAUDE.md (status colours). The text colour is set on the box, so the title,
// description and icon all inherit it.
const alertVariants = cva(
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-xl border px-4 py-3 type-body-r-s has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "border-border bg-surface text-fg",
        success: "border-green-200 bg-green-50 text-green-700",
        danger: "border-red-200 bg-red-50 text-red-600",
        warning: "border-brand-400 bg-brand-100 text-brand-800",
        info: "border-blue-200 bg-blue-50 text-blue-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  // Errors and warnings interrupt a screen reader; the rest is polite.
  const role = variant === "danger" || variant === "warning" ? "alert" : "status"
  return (
    <div
      data-slot="alert"
      role={role}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("col-start-2 type-body-sb-s", className)}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 grid justify-items-start gap-1 type-body-r-s",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
