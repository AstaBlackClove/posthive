"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
  onPaste?: (e: React.ClipboardEvent) => void;
}

export function Modal({ open, onClose, children, maxWidth = 1100, onPaste }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="modal-backdrop fixed inset-0 z-1000 flex items-center justify-center p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="modal-panel relative flex w-full max-w-(--modal-w) max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-border bg-bg shadow-2xl"
        onPaste={onPaste}
        style={{ "--modal-w": `${maxWidth}px` } as React.CSSProperties}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
