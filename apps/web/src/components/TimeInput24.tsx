"use client";

// 24-hour "HH:MM" input — native <input type="time"> follows the OS locale and can show AM/PM.

import { cn } from "../lib/cn";

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));

interface Props {
  value: string; // "HH:MM"
  onChange: (v: string) => void;
  className?: string;
}

export function TimeInput24({ value, onChange, className }: Props) {
  const [h = "09", m = "00"] = value.split(":");

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <select value={h} onChange={(e) => onChange(`${e.target.value}:${m}`)} className="field w-auto flex-1 px-2 py-1.5 scheme-light" aria-label="Hour">
        {HOURS.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      <span className="type-body-r-xs text-neutral-500">:</span>
      <select value={m} onChange={(e) => onChange(`${h}:${e.target.value}`)} className="field w-auto flex-1 px-2 py-1.5 scheme-light" aria-label="Minute">
        {MINUTES.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    </div>
  );
}
