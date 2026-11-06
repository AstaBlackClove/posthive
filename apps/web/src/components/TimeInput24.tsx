"use client";

// 24-hour "HH:MM" input. A native <input type="time"> follows the OS locale and can show AM/PM,
// and a native <select> keeps the phone's own picker, so this is two NativeSelects.

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/cn";

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
      <NativeSelect
        aria-label="Hour"
        value={h}
        onChange={(e) => onChange(`${e.target.value}:${m}`)}
        containerClassName="w-auto flex-1"
        className="py-1.5 pr-7 pl-2 scheme-light"
      >
        {HOURS.map((x) => <NativeSelectOption key={x} value={x}>{x}</NativeSelectOption>)}
      </NativeSelect>
      <span className="type-body-r-xs text-neutral-500">:</span>
      <NativeSelect
        aria-label="Minute"
        value={m}
        onChange={(e) => onChange(`${h}:${e.target.value}`)}
        containerClassName="w-auto flex-1"
        className="py-1.5 pr-7 pl-2 scheme-light"
      >
        {MINUTES.map((x) => <NativeSelectOption key={x} value={x}>{x}</NativeSelectOption>)}
      </NativeSelect>
    </div>
  );
}
