import * as React from "react"
import { cn } from "@/lib/cn"
import { ChevronDownIcon } from "lucide-react"

// The browser's own picker (good on phones: TimeInput24, short lists). Use Select for rich menus.
function NativeSelect({
  className,
  containerClassName,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"select">, "size"> & {
  size?: "sm" | "default"
  /** Classes for the wrapper, e.g. "w-auto" */
  containerClassName?: string
}) {
  return (
    <div
      className={cn(
        "group/native-select relative w-full has-[select:disabled]:opacity-60",
        containerClassName
      )}
      data-slot="native-select-wrapper"
    >
      <select
        data-slot="native-select"
        data-size={size}
        className={cn(
          "w-full min-w-0 cursor-pointer appearance-none rounded-xl border border-border bg-bg py-2 pr-9 pl-3 type-body-r-s text-fg outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed data-[size=sm]:rounded-lg data-[size=sm]:py-1 aria-invalid:border-red-400",
          className
        )}
        {...props}
      />
      <ChevronDownIcon
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground select-none"
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  )
}

function NativeSelectOption({
  className,
  ...props
}: React.ComponentProps<"option">) {
  return (
    <option
      data-slot="native-select-option"
      className={cn("bg-[Canvas] text-[CanvasText]", className)}
      {...props}
    />
  )
}

function NativeSelectOptGroup({
  className,
  ...props
}: React.ComponentProps<"optgroup">) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn("bg-[Canvas] text-[CanvasText]", className)}
      {...props}
    />
  )
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption }
