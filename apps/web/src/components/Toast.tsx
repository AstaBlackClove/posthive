"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastType, string> = {
  success: "M5 13l4 4L19 7",
  error: "M6 18L18 6M6 6l12 12",
  warning: "M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
  info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
};

// box: panel + text/icon color (icons use currentColor); icon: badge behind the icon
const CLASSES: Record<ToastType, { box: string; icon: string }> = {
  success: { box: "bg-green-50 border-green-200 text-green-700", icon: "bg-green-100" },
  error:   { box: "bg-red-50 border-red-200 text-red-600",       icon: "bg-red-100" },
  warning: { box: "bg-brand-100 border-brand-400 text-brand-800", icon: "bg-brand-200" },
  info:    { box: "bg-blue-50 border-blue-200 text-blue-700",    icon: "bg-blue-100" },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const s = CLASSES[toast.type];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const show = setTimeout(() => setVisible(true), 10);
    // Animate out before removing
    const hide = setTimeout(() => setVisible(false), (toast.duration ?? 4000) - 300);
    const remove = setTimeout(() => onDismiss(toast.id), toast.duration ?? 4000);
    return () => { clearTimeout(show); clearTimeout(hide); clearTimeout(remove); };
  }, [toast, onDismiss]);

  return (
    <div
      className={cn("flex items-start gap-3 px-4 py-3 rounded-2xl border max-w-90 shadow-2xl transition-all duration-300", s.box,
        visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-97")}>
      <div className={cn("w-5 h-5 shrink-0 mt-0.5 rounded-full flex items-center justify-center", s.icon)}>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}>
          <path d={ICONS[toast.type]} />
        </svg>
      </div>
      <p className="type-body-r-s flex-1">{toast.message}</p>
      <button onClick={() => onDismiss(toast.id)} className="shrink-0 mt-0.5 hover:opacity-60 transition-opacity">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info", duration = 4000) => {
    const id = `toast-${++counter.current}`;
    setToasts((prev) => [...prev.slice(-4), { id, type, message, duration }]);
  }, []);

  const success = useCallback((m: string) => toast(m, "success"), [toast]);
  const error   = useCallback((m: string) => toast(m, "error", 6000), [toast]);
  const warning = useCallback((m: string) => toast(m, "warning"), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning }}>
      {children}
      {/* Toast stack — bottom right */}
      <div className="fixed bottom-6 right-6 z-100 flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
