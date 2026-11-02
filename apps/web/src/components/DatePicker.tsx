"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { wibDateKey } from "../lib/datetime";
import { cn } from "../lib/cn";

interface Props {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (v: string) => void;
  min?: string; // "YYYY-MM-DD"
  placeholder?: string;
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pad(n: number) { return String(n).padStart(2, "0"); }

function parseDate(v: string): Date | null {
  if (!v) return null;
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function DatePicker({ value, onChange, min, placeholder = "End date (optional)" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const selected = parseDate(value);
  const minDate = parseDate(min ?? "");
  const today = new Date(`${wibDateKey(new Date())}T00:00:00`);

  const [cursor, setCursor] = useState(() => {
    const base = selected ?? today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Portal position — opens upward
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    function recalc() {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        "--dd-bottom": `${window.innerHeight - rect.top + 6}px`,
        "--dd-left": `${rect.left}px`,
        "--dd-w": `${Math.max(rect.width, 300)}px`,
      } as React.CSSProperties);
    }
    recalc();
    window.addEventListener("scroll", recalc, true);
    window.addEventListener("resize", recalc);
    return () => {
      window.removeEventListener("scroll", recalc, true);
      window.removeEventListener("resize", recalc);
    };
  }, [open]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function selectDay(day: number) {
    const d = new Date(year, month, day);
    onChange(toYMD(d));
    setOpen(false);
  }

  function isDayDisabled(day: number) {
    if (!minDate) return false;
    return new Date(year, month, day) < minDate;
  }

  const label = selected
    ? selected.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
    : placeholder;

  const dropdownEl = open && typeof document !== "undefined" ? createPortal(
    <div
      ref={ref}
      className="card fixed bottom-(--dd-bottom) left-(--dd-left) z-9999 w-(--dd-w) overflow-hidden shadow-lg"
      style={dropdownStyle}
    >
      {/* Month nav */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <button type="button"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="flex size-7 cursor-pointer items-center justify-center rounded-lg type-body-r-l text-muted transition-colors hover:bg-neutral-100">
          ‹
        </button>
        <span className="type-body-sb-m text-fg">{MONTHS[month]} {year}</span>
        <button type="button"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="flex size-7 cursor-pointer items-center justify-center rounded-lg type-body-r-l text-muted transition-colors hover:bg-neutral-100">
          ›
        </button>
      </div>

      {/* Calendar grid */}
      <div className="px-4 pt-3 pb-3.5">
        <div className="mb-1.5 grid grid-cols-7">
          {DAYS.map(d => (
            <div key={d} className="py-1 text-center type-body-sb-xs text-neutral-500">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const disabled = isDayDisabled(day);
            const isSelected = selected && day === selected.getDate() && month === selected.getMonth() && year === selected.getFullYear();
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => selectDay(day)}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-lg transition-colors",
                  isSelected || isToday ? "type-body-sb-s" : "type-body-r-s",
                  disabled
                    ? "cursor-not-allowed text-neutral-500 opacity-40"
                    : isSelected
                    ? "cursor-pointer bg-accent text-accent-fg"
                    : isToday
                    ? "cursor-pointer bg-brand-100 text-brand-800"
                    : "cursor-pointer text-fg hover:bg-neutral-100",
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Clear */}
      {value && (
        <div className="border-t border-border px-3 py-2">
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className="w-full cursor-pointer rounded-lg bg-bg p-1.5 type-body-r-xs text-muted transition-colors hover:bg-neutral-100"
          >
            Clear
          </button>
        </div>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          "field flex cursor-pointer items-center justify-between gap-1.5 py-1.5",
          selected ? "text-fg" : "text-muted",
          open && "border-accent",
        )}
      >
        {/* calendar icon */}
        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"
          className={selected ? "text-brand-800" : "text-neutral-500"}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>{label}</span>
        <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={cn("text-neutral-500 transition-transform", open && "rotate-180")}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {dropdownEl}
    </div>
  );
}
