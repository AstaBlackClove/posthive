"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
}

export function Modal({ open, onClose, children, maxWidth = 1100 }: ModalProps) {
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
      className="modal-backdrop fixed inset-0 z-[1000] flex items-center justify-center p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="modal-panel relative w-full flex flex-col rounded-2xl overflow-hidden"
        style={{
          maxWidth,
          maxHeight: "90vh",
          backgroundColor: "#0a0a0a",
          border: "1px solid #2a2a2a",
          boxShadow: "0 25px 80px rgba(0,0,0,0.8)",
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
