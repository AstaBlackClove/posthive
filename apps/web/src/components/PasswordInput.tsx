"use client";

import { forwardRef, useCallback, useLayoutEffect, useRef, useState } from "react";
import type { InputHTMLAttributes, MutableRefObject, Ref } from "react";
import { cn } from "../lib/cn";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "autoComplete"> & {
  /** Required: "current-password" (login), "new-password" (register/change), or "off". */
  autoComplete: "current-password" | "new-password" | "off";
  /** `box`: bordered field with an eye icon. `line`: underline field with a "Show"/"Hide" text toggle (dark auth panel). */
  variant?: "box" | "line";
};

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.04 12.32a1 1 0 0 1 0-.64C3.42 7.51 7.36 4.5 12 4.5s8.58 3.01 9.96 7.18a1 1 0 0 1 0 .64C20.58 16.49 16.64 19.5 12 19.5s-8.58-3.01-9.96-7.18Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="m3 3 18 18" />}
    </svg>
  );
}

/**
 * Password field with a show/hide toggle. Hidden by default.
 * The toggle never takes focus on mouse click, so the caret and selection in the input survive.
 */
export const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput(
  { className, disabled, id, variant = "box", ...rest },
  forwardedRef,
) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const caret = useRef<{ start: number | null; end: number | null; focused: boolean } | null>(null);

  const setRefs = useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof forwardedRef === "function") (forwardedRef as (n: HTMLInputElement | null) => void)(node);
    else if (forwardedRef) (forwardedRef as MutableRefObject<HTMLInputElement | null>).current = node;
  }, [forwardedRef]);

  // Changing `type` can reset the caret in some browsers: put it back.
  useLayoutEffect(() => {
    const saved = caret.current;
    const el = inputRef.current;
    if (!saved || !el) return;
    caret.current = null;
    if (saved.focused) {
      el.focus();
      if (saved.start !== null && saved.end !== null) el.setSelectionRange(saved.start, saved.end);
    }
  }, [visible]);

  function toggle() {
    const el = inputRef.current;
    caret.current = el
      ? { start: el.selectionStart, end: el.selectionEnd, focused: document.activeElement === el }
      : null;
    setVisible((v) => !v);
  }

  return (
    <div className="relative">
      <input
        {...rest}
        id={id}
        ref={setRefs as Ref<HTMLInputElement>}
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={cn(variant === "line" ? "field-line pr-14" : "field pr-11", className)}
      />
      <button
        type="button"
        onClick={toggle}
        // Keep focus in the input when clicking with a mouse or finger.
        onMouseDown={(e) => e.preventDefault()}
        disabled={disabled}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-controls={id}
        className={cn(
          "absolute inset-y-0 right-0 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60",
          variant === "line"
            ? "rounded px-1 type-body-sb-xs text-brand-500 hover:text-brand-300 focus-visible:ring-brand-500/60"
            : "w-11 rounded-r-xl text-muted hover:text-fg focus-visible:ring-accent/40",
        )}
      >
        {variant === "line" ? (visible ? "Hide" : "Show") : <EyeIcon off={visible} />}
      </button>
    </div>
  );
});
