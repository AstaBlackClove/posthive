"use client";

import { useState } from "react";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { fieldClass } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import { dateToKey, keyToDate } from "@/lib/dateKeys";
import { wibDateKey } from "@/lib/datetime";

interface Props {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (v: string) => void;
  min?: string; // "YYYY-MM-DD": earlier days are disabled
  placeholder?: string;
}

/**
 * A day picker: a field-looking button that opens a calendar above it. "Today" is the WIB day,
 * not the browser's, like every schedule time in the app. A day can be changed but not unpicked
 * from the grid; "Clear" empties it.
 */
export function DatePicker({ value, onChange, min, placeholder = "End date (optional)" }: Props) {
  const [open, setOpen] = useState(false);
  const selected = keyToDate(value);
  const minDate = keyToDate(min);
  const today = keyToDate(wibDateKey(new Date()))!;

  const label = selected
    ? selected.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(fieldClass, "flex cursor-pointer items-center justify-between gap-1.5 py-1.5", selected ? "text-fg" : "text-muted")}
        >
          <CalendarIcon aria-hidden="true" className={cn("size-3.5", selected ? "text-brand-800" : "text-neutral-500")} />
          <span>{label}</span>
          <ChevronDownIcon aria-hidden="true" className={cn("size-3 text-neutral-500 transition-transform", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-auto overflow-hidden p-0">
        <Calendar
          mode="single"
          required
          autoFocus
          selected={selected}
          onSelect={(day) => {
            onChange(dateToKey(day));
            setOpen(false);
          }}
          defaultMonth={selected ?? today}
          today={today}
          disabled={minDate ? { before: minDate } : undefined}
        />
        {value && (
          <div className="border-t border-border px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
