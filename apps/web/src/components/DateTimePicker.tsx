"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { APP_TZ_LABEL, addDaysKey, toWibInput, wibDateKey } from "../lib/datetime";
import { cn } from "../lib/cn";

interface Props {
  value: string; // "YYYY-MM-DDTHH:mm"
  onChange: (v: string) => void;
  dropdownDirection?: "up" | "down";
  min?: string; // "YYYY-MM-DD" — days before this are disabled
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pad(n: number) { return String(n).padStart(2, "0"); }

// Value is WIB wall-clock — parse the string directly, never through the browser's local Date
function parseValue(v: string) {
  const [date, time] = v.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = (time ?? "09:00").split(":").map(Number);
  return { year, month: month - 1, day, hour, minute };
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
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

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.children[selectedIndex] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="pb-1 text-center type-body-sb-xxs uppercase tracking-widest text-neutral-500">
        {label}
      </div>
      {/* 5 rows of h-8 items */}
      <div
        ref={scrollRef}
        className="h-40 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            className={cn(
              "flex h-8 w-full cursor-pointer select-none items-center justify-center rounded-lg border transition",
              i === selectedIndex
                ? "border-brand-300 bg-brand-100 type-body-sb-s text-brand-800"
                : "border-transparent type-body-r-s text-neutral-500 hover:text-fg",
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));

export function DateTimePicker({ value, onChange, dropdownDirection = "up", min }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const selected = parseValue(value);
  const [cursor, setCursor] = useState(new Date(selected.year, selected.month, 1));

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    function recalc() {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      // --dd-y is read as `top` (down) or `bottom` (up) by the panel's classes
      if (dropdownDirection === "down") {
        setDropdownStyle({ "--dd-y": `${rect.bottom + 6}px`, "--dd-left": `${rect.left}px` } as React.CSSProperties);
      } else {
        setDropdownStyle({ "--dd-y": `${window.innerHeight - rect.top + 6}px`, "--dd-left": `${rect.left}px` } as React.CSSProperties);
      }
    }
    recalc();
    window.addEventListener("scroll", recalc, true);
    window.addEventListener("resize", recalc);
    return () => { window.removeEventListener("scroll", recalc, true); window.removeEventListener("resize", recalc); };
  }, [open, dropdownDirection]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const todayKey = wibDateKey(new Date());
  const selectedKey = dateKey(selected.year, selected.month, selected.day);

  function isDayDisabled(day: number) {
    if (!min) return false;
    return dateKey(year, month, day) < min;
  }

  function selectDay(day: number) {
    if (isDayDisabled(day)) return;
    onChange(`${dateKey(year, month, day)}T${pad(selected.hour)}:${pad(selected.minute)}`);
  }

  function setTime(h: number, m: number) {
    onChange(`${selectedKey}T${pad(h)}:${pad(m)}`);
  }

  const label = (() => {
    const dateStr = selectedKey === todayKey ? "Today"
      : selectedKey === addDaysKey(todayKey, 1) ? "Tomorrow"
      : `${MONTHS[selected.month]} ${selected.day}`;
    return `${dateStr} · ${pad(selected.hour)}:${pad(selected.minute)} ${APP_TZ_LABEL}`;
  })();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const dropdownEl = open && typeof document !== "undefined" ? createPortal(
    <div
      ref={ref}
      className={cn(
        "card fixed left-(--dd-left) z-9999 w-70 overflow-hidden shadow-lg",
        dropdownDirection === "down" ? "top-(--dd-y)" : "bottom-(--dd-y)",
      )}
      style={dropdownStyle}
    >
      {/* Month nav */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <button type="button"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:bg-neutral-100 transition">‹</button>
        <span className="type-body-sb-s text-fg">{MONTHS[month]} {year}</span>
        <button type="button"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:bg-neutral-100 transition">›</button>
      </div>

      {/* Calendar grid */}
      <div className="px-3 pt-2 pb-1">
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map((d) => (
            <div key={d} className="py-1 text-center type-body-sb-xxs text-neutral-500">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const disabled = isDayDisabled(day);
            const isSelected = dateKey(year, month, day) === selectedKey;
            const isToday = dateKey(year, month, day) === todayKey;
            return (
              <button key={i} type="button" onClick={() => selectDay(day)} disabled={disabled}
                className={cn(
                  "w-full aspect-square rounded-lg transition flex items-center justify-center",
                  disabled ? "cursor-not-allowed type-body-m-xs text-neutral-500 opacity-40"
                    : isSelected ? "type-body-m-xs bg-accent text-accent-fg"
                    : isToday ? "type-body-sb-xs bg-brand-100 text-brand-800"
                    : "type-body-m-xs text-fg hover:bg-neutral-100",
                )}>
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time picker columns */}
      <div className="border-y border-border px-3 py-2">
        <div className="flex gap-2">
          <ScrollColumn
            label="Hour"
            items={HOURS}
            selectedIndex={selected.hour}
            onSelect={(i) => setTime(i, selected.minute)}
          />
          <ScrollColumn
            label="Min"
            items={MINUTES}
            selectedIndex={selected.minute}
            onSelect={(i) => setTime(selected.hour, i)}
          />
        </div>
      </div>

      {/* Quick shortcuts */}
      <div className="px-3 py-3 flex gap-1.5 flex-wrap">
        {[
          { label: "In 1h", fn: () => onChange(`${toWibInput(new Date(Date.now() + 60 * 60 * 1000)).slice(0, 13)}:00`) },
          { label: "Tomorrow 09:00", fn: () => onChange(`${addDaysKey(todayKey, 1)}T09:00`) },
          { label: "Next Mon", fn: () => { const dow = new Date(`${todayKey}T00:00:00Z`).getUTCDay(); onChange(`${addDaysKey(todayKey, (8 - dow) % 7 || 7)}T09:00`); } },
        ].map(({ label, fn }) => (
          <button key={label} type="button"
            onClick={() => { fn(); setOpen(false); }}
            className="type-body-r-xs px-2.5 py-1 rounded-lg border border-border bg-bg text-muted transition hover:bg-neutral-100">
            {label}
          </button>
        ))}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="field flex w-auto items-center gap-2 py-1.5"
      >
        <svg className="w-3.5 h-3.5 shrink-0 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>{label}</span>
        <svg className="w-3 h-3 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {dropdownEl}
    </div>
  );
}
