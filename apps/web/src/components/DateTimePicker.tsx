"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { APP_TZ_LABEL, addDaysKey, toWibInput, wibDateKey } from "../lib/datetime";

interface Props {
  value: string; // "YYYY-MM-DDTHH:mm"
  onChange: (v: string) => void;
  dropdownDirection?: "up" | "down";
  min?: string; // "YYYY-MM-DD" — days before this are disabled
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ITEM_H = 32;

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
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#555", textAlign: "center", paddingBottom: 4 }}>
        {label}
      </div>
      <div
        ref={scrollRef}
        className="[&::-webkit-scrollbar]:hidden"
        style={{ height: ITEM_H * 5, overflowY: "auto", scrollbarWidth: "none" }}
      >
        {items.map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            style={{
              width: "100%",
              height: ITEM_H,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: i === selectedIndex ? 600 : 400,
              color: i === selectedIndex ? "#ededed" : "#555",
              backgroundColor: i === selectedIndex ? "rgba(91,99,211,0.18)" : "transparent",
              border: i === selectedIndex ? "1px solid rgba(91,99,211,0.35)" : "1px solid transparent",
              borderRadius: 8,
              cursor: "pointer",
              userSelect: "none",
              transition: "all 0.1s",
            }}
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
      if (dropdownDirection === "down") {
        setDropdownStyle({ position: "fixed", top: rect.bottom + 6, left: rect.left, width: 280, zIndex: 9999 });
      } else {
        setDropdownStyle({ position: "fixed", bottom: window.innerHeight - rect.top + 6, left: rect.left, width: 280, zIndex: 9999 });
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
      className="rounded-2xl shadow-2xl overflow-hidden"
      style={{ ...dropdownStyle, backgroundColor: "#111111", border: "1px solid #2a2a2a" }}
    >
      {/* Month nav */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #2a2a2a" }}>
        <button type="button"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition"
          style={{ color: "#888" }}>‹</button>
        <span className="text-sm font-semibold" style={{ color: "#ededed" }}>{MONTHS[month]} {year}</span>
        <button type="button"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition"
          style={{ color: "#888" }}>›</button>
      </div>

      {/* Calendar grid */}
      <div className="px-3 pt-2 pb-1">
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold py-1" style={{ color: "#555" }}>{d}</div>
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
                className="w-full aspect-square rounded-lg text-xs font-medium transition flex items-center justify-center"
                style={disabled ? { color: "#333", cursor: "not-allowed" }
                  : isSelected ? { backgroundColor: "#5b63d3", color: "#fff" }
                  : isToday ? { backgroundColor: "#1a1a2e", color: "#5b63d3", fontWeight: 700 }
                  : { color: "#ccc" }}>
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time picker columns */}
      <div style={{ borderTop: "1px solid #2a2a2a", borderBottom: "1px solid #2a2a2a", padding: "8px 12px" }}>
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
            className="text-xs px-2.5 py-1 rounded-lg transition hover:bg-white/10"
            style={{ backgroundColor: "#1a1a1a", color: "#888", border: "1px solid #2a2a2a" }}>
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
        className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition"
        style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a", color: "#ededed" }}
      >
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#888" }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>{label}</span>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#666" }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {dropdownEl}
    </div>
  );
}
