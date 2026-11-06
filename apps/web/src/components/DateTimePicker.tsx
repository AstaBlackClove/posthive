"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { fieldClass } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import { dateToKey, keyToDate } from "@/lib/dateKeys";
import { APP_TZ_LABEL, addDaysKey, toWibInput, wibDateKey } from "@/lib/datetime";

interface Props {
  value: string; // "YYYY-MM-DDTHH:mm", WIB wall-clock
  onChange: (v: string) => void;
  /** Which side of the button the panel opens on. */
  dropdownDirection?: "up" | "down";
  min?: string; // "YYYY-MM-DD": days before this are disabled
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));
const ROW = 32; // h-8

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// The value is WIB wall-clock: parse the text, never go through the browser's local Date
function parseValue(v: string) {
  const [date, time] = v.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = (time ?? "09:00").split(":").map(Number);
  return { year, month: month - 1, day, hour, minute, key: date };
}

function ScrollColumn({
  label,
  items,
  selectedIndex,
  onSelect,
}: {
  label: string;
  items: string[];
  selectedIndex: number;
  onSelect: (i: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Put the chosen row in the middle of the column. Set scrollTop directly: scrollIntoView
  // would also scroll the page when the panel is partly off screen.
  useEffect(() => {
    const box = scrollRef.current;
    if (box) box.scrollTop = Math.max(0, selectedIndex * ROW - 2 * ROW);
  }, [selectedIndex]);

  return (
    <div role="group" aria-label={label} className="flex min-w-0 flex-1 flex-col">
      <div aria-hidden="true" className="pb-1 text-center type-body-sb-xxs tracking-widest text-neutral-500 uppercase">
        {label}
      </div>
      <div ref={scrollRef} className="h-40 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item, i) => (
          <button
            key={item}
            type="button"
            aria-label={`${label} ${item}`}
            aria-pressed={i === selectedIndex}
            onClick={() => onSelect(i)}
            className={cn(
              "flex h-8 w-full cursor-pointer items-center justify-center rounded-lg border transition-colors select-none",
              i === selectedIndex
                ? "border-brand-300 bg-brand-100 type-body-sb-s text-brand-800"
                : "border-transparent type-body-r-s text-neutral-500 hover:text-fg"
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A schedule time picker: day on a calendar, hour and minute in two columns, and three quick picks. All WIB. */
export function DateTimePicker({ value, onChange, dropdownDirection = "up", min }: Props) {
  const [open, setOpen] = useState(false);
  const selected = parseValue(value);
  const selectedDay = keyToDate(selected.key);
  const minDate = keyToDate(min);
  const todayKey = wibDateKey(new Date());
  const today = keyToDate(todayKey)!;

  function setTime(h: number, m: number) {
    onChange(`${selected.key}T${pad(h)}:${pad(m)}`);
  }

  const dateStr =
    selected.key === todayKey
      ? "Today"
      : selected.key === addDaysKey(todayKey, 1)
        ? "Tomorrow"
        : `${MONTHS[selected.month]} ${selected.day}`;
  const label = `${dateStr} · ${pad(selected.hour)}:${pad(selected.minute)} ${APP_TZ_LABEL}`;

  const shortcuts = [
    { label: "In 1h", value: () => `${toWibInput(new Date(Date.now() + 60 * 60 * 1000)).slice(0, 13)}:00` },
    { label: "Tomorrow 09:00", value: () => `${addDaysKey(todayKey, 1)}T09:00` },
    {
      label: "Next Mon",
      value: () => {
        const dow = new Date(`${todayKey}T00:00:00Z`).getUTCDay();
        return `${addDaysKey(todayKey, (8 - dow) % 7 || 7)}T09:00`;
      },
    },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn(fieldClass, "flex w-auto cursor-pointer items-center gap-2 py-1.5")}>
          <CalendarIcon aria-hidden="true" className="size-3.5 shrink-0 text-muted" />
          <span>{label}</span>
          <ChevronDownIcon aria-hidden="true" className="size-3 text-neutral-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent side={dropdownDirection === "down" ? "bottom" : "top"} align="start" className="w-70 overflow-hidden p-0">
        <Calendar
          mode="single"
          required
          autoFocus
          selected={selectedDay}
          onSelect={(day) => onChange(`${dateToKey(day)}T${pad(selected.hour)}:${pad(selected.minute)}`)}
          defaultMonth={selectedDay ?? today}
          today={today}
          disabled={minDate ? { before: minDate } : undefined}
          className="w-full"
        />

        <div className="flex gap-2 border-y border-border px-3 py-2">
          <ScrollColumn label="Hour" items={HOURS} selectedIndex={selected.hour} onSelect={(i) => setTime(i, selected.minute)} />
          <ScrollColumn label="Min" items={MINUTES} selectedIndex={selected.minute} onSelect={(i) => setTime(selected.hour, i)} />
        </div>

        <div className="flex flex-wrap gap-1.5 px-3 py-3">
          {shortcuts.map((s) => (
            <Button
              key={s.label}
              variant="secondary"
              size="sm"
              onClick={() => {
                onChange(s.value());
                setOpen(false);
              }}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
