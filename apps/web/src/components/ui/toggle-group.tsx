"use client"

import * as React from "react"
import { type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"

import { toggleVariants } from "@/components/ui/toggle"

type RootProps = React.ComponentProps<typeof ToggleGroupPrimitive.Root>
type SingleProps = Extract<RootProps, { type: "single" }>

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants>
>({
  size: "default",
  variant: "default",
})

// Radix lets the user click the active item of a single-choice group to switch everything off
// (the value becomes ""). A filter or a view switch must always have one choice, so for
// type="single" that is ignored unless allowDeselect is set.
function useKeepOneSelected(props: RootProps, allowDeselect: boolean): RootProps {
  const single = props as SingleProps
  const controlled = single.value !== undefined
  const [inner, setInner] = React.useState(single.defaultValue ?? "")

  if (props.type !== "single" || allowDeselect) return props

  const { defaultValue: _defaultValue, ...rest } = single
  void _defaultValue
  return {
    ...rest,
    value: controlled ? single.value : inner,
    onValueChange: (value: string) => {
      if (!value) return
      if (!controlled) setInner(value)
      single.onValueChange?.(value)
    },
  }
}

// Items sit apart like the old chips. variant="pill" draws the rounded track of a segmented
// control (All / Instagram / LinkedIn, Day / Week / Month).
function ToggleGroup({
  className,
  variant,
  size,
  allowDeselect = false,
  children,
  ...rest
}: RootProps &
  VariantProps<typeof toggleVariants> & {
    /** Let a single-choice group be switched fully off. Default: no. */
    allowDeselect?: boolean
  }) {
  const props = useKeepOneSelected(rest as RootProps, allowDeselect)

  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      className={cn(
        "group/toggle-group flex w-fit flex-wrap items-center gap-1.5",
        variant === "pill" && "gap-0.5 rounded-full border border-border bg-surface p-1",
        className
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
  VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext)

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        "focus:z-10 focus-visible:z-10",
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }
