"use client"

import * as React from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckIcon, InfoIcon, TriangleAlertIcon, XIcon } from "lucide-react"
import { cn } from "@/lib/cn"

export type ToastType = "success" | "error" | "warning" | "info"

const ICONS = {
  success: CheckIcon,
  error: XIcon,
  warning: TriangleAlertIcon,
  info: InfoIcon,
} as const

// box: panel + text / icon colour; icon: the round badge behind the icon. Status colours from CLAUDE.md.
const TONES: Record<ToastType, { box: string; icon: string }> = {
  success: { box: "border-green-200 bg-green-50 text-green-700", icon: "bg-green-100" },
  error: { box: "border-red-200 bg-red-50 text-red-600", icon: "bg-red-100" },
  warning: { box: "border-brand-400 bg-brand-100 text-brand-800", icon: "bg-brand-200" },
  info: { box: "border-blue-200 bg-blue-50 text-blue-700", icon: "bg-blue-100" },
}

// What one toast looks like. sonner places it, stacks it, times it and lets it be swiped away.
// Errors and warnings interrupt a screen reader, the rest are polite (same rule as Alert).
function ToastCard({
  type,
  message,
  onDismiss,
  className,
}: {
  type: ToastType
  message: React.ReactNode
  onDismiss: () => void
  className?: string
}) {
  const tone = TONES[type]
  const Icon = ICONS[type]
  return (
    <div
      data-slot="toast"
      data-type={type}
      role={type === "error" || type === "warning" ? "alert" : "status"}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl",
        tone.box,
        className
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
          tone.icon
        )}
      >
        <Icon className="size-3" strokeWidth={2.5} aria-hidden="true" />
      </div>
      <p className="min-w-0 flex-1 type-body-r-s">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="mt-0.5 shrink-0 cursor-pointer rounded-sm transition-opacity outline-none hover:opacity-60 focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <XIcon className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}

// Mount once, in the root layout. Bottom right like before, up to 5 toasts, fanned out.
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="bottom-right"
      visibleToasts={5}
      expand
      gap={8}
      offset={24}
      mobileOffset={16}
      containerAriaLabel="Notifications"
      {...props}
    />
  )
}

export { Toaster, ToastCard }
