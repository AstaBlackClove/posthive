"use client";

import { useEffect, useRef } from "react";
import { cn } from "../../lib/cn";

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Fires once the last digit is in (typed or pasted). */
  onComplete?: (value: string) => void;
  length?: number;
  /** Read-only instead of disabled, so focus survives while a request is in flight. */
  busy?: boolean;
  invalid?: boolean;
  describedBy?: string;
  autoFocus?: boolean;
};

const digitsOf = (s: string) => s.replace(/\D/g, "");

/**
 * One box per digit. Typing moves forward, Backspace moves back, paste (or OS autofill) fills every box.
 * `value` never has gaps: focus always lands on the first empty box.
 */
export function CodeInput({ value, onChange, onComplete, length = 6, busy, invalid, describedBy, autoFocus }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const group = useRef<HTMLDivElement>(null);
  // Always the newest value. `commit` moves focus BEFORE React re-renders, and the focus
  // handler must already see the new value, or it bounces focus back to the old first-empty box.
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  // The parent cleared a wrong code while the user was in the boxes: start over from the first one.
  useEffect(() => {
    if (value === "" && group.current?.contains(document.activeElement)) refs.current[0]?.focus();
  }, [value]);

  function commit(next: string, focusAt: number) {
    latest.current = next;
    onChange(next);
    refs.current[Math.min(focusAt, length - 1)]?.focus();
    if (next.length === length) onComplete?.(next);
  }

  function handleChange(i: number, raw: string) {
    const typed = digitsOf(raw);
    if (!typed) return;
    const next = (latest.current.slice(0, i) + typed).slice(0, length);
    commit(next, i + typed.length);
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    const current = latest.current;
    if (e.key === "Backspace") {
      e.preventDefault();
      if (i < current.length) commit(current.slice(0, i) + current.slice(i + 1), i);
      else if (i > 0) commit(current.slice(0, i - 1), i - 1);
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < current.length) {
      e.preventDefault();
      refs.current[i + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = digitsOf(e.clipboardData.getData("text")).slice(0, length);
    if (pasted) commit(pasted, pasted.length);
  }

  return (
    <div ref={group} role="group" aria-label={`${length}-digit code`} className="flex gap-1.5 sm:gap-3">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          readOnly={busy}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => {
            if (i > latest.current.length) refs.current[latest.current.length]?.focus();
            else e.target.select();
          }}
          className={cn(
            "h-14 w-11 min-w-0 rounded-xl border bg-white/10 text-center type-head-r-4 text-white outline-none transition-colors",
            "focus:border-brand-500 sm:h-20 sm:w-17 short:sm:h-16",
            invalid ? "border-red-400" : "border-neutral-500",
          )}
        />
      ))}
    </div>
  );
}
