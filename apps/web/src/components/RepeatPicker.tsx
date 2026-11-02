"use client";

import { useEffect, useRef, useState } from "react";
import { DatePicker } from "./DatePicker";
import { minKeyForInterval } from "../lib/datetime";
import { cn } from "../lib/cn";

const INTERVALS = [
  { value: "daily", label: "Every Day" },
  { value: "weekly", label: "Every Week" },
  { value: "monthly", label: "Every Month" },
] as const;

type Interval = "daily" | "weekly" | "monthly";

interface Props {
  value: Interval | "";
  endsAt: string;
  onChangeInterval: (v: Interval | "") => void;
  onChangeEndsAt: (v: string) => void;
}

export function RepeatPicker({ value, endsAt, onChangeInterval, onChangeEndsAt }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const label = value ? INTERVALS.find(i => i.value === value)?.label : "Repeat Post…";

  return (
    <div className="flex items-center gap-2">
      {/* Trigger */}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className={cn(
            "field flex w-auto cursor-pointer items-center gap-1.5 py-1.5",
            value ? "text-fg" : "text-muted",
            open && "border-accent",
          )}
        >
          {/* repeat icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            className={value ? "text-brand-800" : "text-neutral-500"}>
            <path d="M17 1l4 4-4 4" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <path d="M7 23l-4-4 4-4" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
          <span>{label}</span>
          {/* chevron */}
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={cn("text-neutral-500 transition-transform", open && "rotate-180")}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {/* Dropdown — opens upward */}
        {open && (
          <div className="card absolute bottom-full left-0 z-300 mb-2 min-w-45 overflow-hidden rounded-xl shadow-lg">
            {/* No repeat option */}
            <button
              type="button"
              onClick={() => { onChangeInterval(""); onChangeEndsAt(""); setOpen(false); }}
              className={cn(
                "block w-full cursor-pointer border-b border-border px-4 py-2.5 text-left type-body-r-s",
                !value ? "bg-brand-100 text-brand-800" : "text-muted hover:bg-neutral-100",
              )}
            >
              Do Not Repeat
            </button>
            {INTERVALS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChangeInterval(opt.value); onChangeEndsAt(""); setOpen(false); }}
                className={cn(
                  "block w-full cursor-pointer border-b border-border px-4 py-2.5 text-left type-body-r-s",
                  value === opt.value ? "bg-brand-100 text-brand-800" : "text-muted hover:bg-neutral-100",
                )}
              >
                <span className="flex items-center justify-between">
                  {opt.label}
                  {value === opt.value && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* End date — only when interval selected */}
      {value && (
        <div className="flex items-center gap-1.5">
          <span className="type-body-m-s text-muted">until</span>
          <DatePicker
            value={endsAt}
            onChange={onChangeEndsAt}
            min={minKeyForInterval(value)}
            placeholder="End date (optional)"
          />
        </div>
      )}
    </div>
  );
}
