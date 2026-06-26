"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: string; // "YYYY-MM-DDTHH:mm"
  onChange: (v: string) => void;
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pad(n: number) { return String(n).padStart(2, "0"); }

function parseLocal(v: string): Date {
  const [date, time] = v.split("T");
  const [y, mo, d] = date.split("-").map(Number);
  const [h, m] = (time ?? "09:00").split(":").map(Number);
  return new Date(y, mo - 1, d, h, m);
}

function toLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DateTimePicker({ value, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = parseLocal(value);
  const [cursor, setCursor] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1));

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function selectDay(day: number) {
    const next = new Date(year, month, day, selected.getHours(), selected.getMinutes());
    onChange(toLocal(next));
  }

  function setTime(h: number, m: number) {
    const next = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), h, m);
    onChange(toLocal(next));
  }

  const label = (() => {
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const isToday = selected.toDateString() === today.toDateString();
    const isTomorrow = selected.toDateString() === tomorrow.toDateString();
    const dateStr = isToday ? "Today" : isTomorrow ? "Tomorrow"
      : selected.toLocaleDateString([], { month: "short", day: "numeric" });
    const timeStr = selected.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${dateStr} · ${timeStr}`;
  })();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition"
        style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a", color: "#ededed" }}
      >
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#888" }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>{label}</span>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#666" }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute bottom-full mb-2 left-0 z-50 rounded-2xl shadow-2xl overflow-hidden"
          style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a", width: "280px" }}
        >
          {/* Month nav */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #1f1f1f" }}>
            <button type="button"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition"
              style={{ color: "#888" }}>
              ‹
            </button>
            <span className="text-sm font-semibold" style={{ color: "#ededed" }}>
              {MONTHS[month]} {year}
            </span>
            <button type="button"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition"
              style={{ color: "#888" }}>
              ›
            </button>
          </div>

          {/* Calendar grid */}
          <div className="px-3 pt-2 pb-1">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-[10px] font-semibold py-1" style={{ color: "#555" }}>{d}</div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const isSelected = day === selected.getDate() && month === selected.getMonth() && year === selected.getFullYear();
                const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectDay(day)}
                    className="w-full aspect-square rounded-lg text-xs font-medium transition flex items-center justify-center"
                    style={isSelected
                      ? { backgroundColor: "#5b63d3", color: "#fff" }
                      : isToday
                      ? { backgroundColor: "#1a1a2e", color: "#5b63d3", fontWeight: 700 }
                      : { color: "#ccc" }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time picker */}
          <div className="px-4 py-3 flex items-center gap-3" style={{ borderTop: "1px solid #1f1f1f" }}>
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#666" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs" style={{ color: "#888" }}>Time</span>
            <div className="flex items-center gap-1 ml-auto">
              <input
                type="number" min={0} max={23}
                value={pad(selected.getHours())}
                onChange={(e) => setTime(Number(e.target.value), selected.getMinutes())}
                className="w-11 text-center text-sm rounded-lg py-1 focus:outline-none"
                style={{ backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", color: "#ededed" }}
              />
              <span style={{ color: "#555" }}>:</span>
              <input
                type="number" min={0} max={59} step={5}
                value={pad(selected.getMinutes())}
                onChange={(e) => setTime(selected.getHours(), Number(e.target.value))}
                className="w-11 text-center text-sm rounded-lg py-1 focus:outline-none"
                style={{ backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", color: "#ededed" }}
              />
            </div>
          </div>

          {/* Quick shortcuts */}
          <div className="px-3 pb-3 flex gap-1.5 flex-wrap">
            {[
              { label: "In 1h", fn: () => { const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0); onChange(toLocal(d)); } },
              { label: "Tomorrow 9am", fn: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); onChange(toLocal(d)); } },
              { label: "Next Mon", fn: () => { const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); d.setHours(9, 0, 0, 0); onChange(toLocal(d)); } },
            ].map(({ label, fn }) => (
              <button key={label} type="button"
                onClick={() => { fn(); setOpen(false); }}
                className="text-xs px-2.5 py-1 rounded-lg transition hover:bg-white/10"
                style={{ backgroundColor: "#1a1a1a", color: "#888", border: "1px solid #2a2a2a" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
