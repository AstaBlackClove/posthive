"use client";

import { toast as sonner } from "sonner";
import { ToastCard, type ToastType } from "@/components/ui/sonner";

export type { ToastType };

// sonner owns placement, stacking, timers and swiping; <Toaster /> in the root layout renders it.
// This file keeps the API every page already uses: const { toast, success, error, warning } = useToast().

const DEFAULT_MS = 4000;
const ERROR_MS = 6000; // errors stay a little longer

function show(message: string, type: ToastType = "info", duration: number = DEFAULT_MS) {
  sonner.custom(
    (id) => <ToastCard type={type} message={message} onDismiss={() => sonner.dismiss(id)} />,
    { duration }
  );
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
}

// Module-level, so the hook returns the same object on every render and every call:
// it is safe in an effect's dependency list and needs no provider.
const api: ToastContextValue = {
  toast: show,
  success: (message) => show(message, "success"),
  error: (message) => show(message, "error", ERROR_MS),
  warning: (message) => show(message, "warning"),
};

export function useToast(): ToastContextValue {
  return api;
}
