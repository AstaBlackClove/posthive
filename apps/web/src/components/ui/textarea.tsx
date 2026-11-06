import * as React from "react"
import { cn } from "@/lib/cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "block w-full rounded-xl border border-border bg-bg px-3 py-2 type-body-r-s text-fg outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-red-400",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
