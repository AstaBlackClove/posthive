import * as React from "react"
import { cn } from "@/lib/cn"

type InputProps = React.ComponentProps<"input"> & {
  /** "line" is the underline-only input of the dark auth panel (the field-line class). */
  variant?: "default" | "line"
}

function Input({ className, type, variant = "default", ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      data-variant={variant}
      className={cn(
        variant === "line"
          ? "field-line"
          : "w-full min-w-0 rounded-xl border border-border bg-bg px-3 py-2 type-body-r-s text-fg outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-red-400",
        className
      )}
      {...props}
    />
  )
}

export { Input }
