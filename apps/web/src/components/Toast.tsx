"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

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

const STYLES: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: { bg: "#052e16", border: "#14532d", icon: "#4ade80", text: "#86efac" },
  error:   { bg: "#1a0a0a", border: "#7f1d1d", icon: "#f87171", text: "#fca5a5" },
  warning: { bg: "#1c1209", border: "#7c2d12", icon: "#fb923c", text: "#fdba74" },
  info:    { bg: "#0d0d1a", border: "#2a2a5a", icon: "#818cf8", text: "#a5b4fc" },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const s = STYLES[toast.type];
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
      className="flex items-start gap-3 px-4 py-3 rounded-2xl shadow-2xl transition-all duration-300"
      style={{
        backgroundColor: s.bg,
        border: `1px solid ${s.border}`,
        maxWidth: 360,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(8px) scale(0.97)",
      }}>
      <div className="w-5 h-5 flex-shrink-0 mt-0.5 rounded-full flex items-center justify-center"
        style={{ backgroundColor: s.icon + "20" }}>
        <svg className="w-3 h-3" fill="none" stroke={s.icon} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}>
          <path d={ICONS[toast.type]} />
        </svg>
      </div>
      <p className="text-sm flex-1 leading-snug" style={{ color: s.text }}>{toast.message}</p>
      <button onClick={() => onDismiss(toast.id)} className="flex-shrink-0 mt-0.5 hover:opacity-60 transition-opacity"
        style={{ color: s.icon }}>
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
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 items-end pointer-events-none">
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
