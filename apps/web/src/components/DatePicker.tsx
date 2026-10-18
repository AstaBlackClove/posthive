"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  const today = new Date(); today.setHours(0, 0, 0, 0);

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
        position: "fixed",
        bottom: window.innerHeight - rect.top + 6,
        left: rect.left,
        width: Math.max(rect.width, 300),
        zIndex: 9999,
      });
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
      style={{
        ...dropdownStyle,
        backgroundColor: "#111111",
        border: "1px solid #2a2a2a",
        borderRadius: 16,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        overflow: "hidden",
      }}
    >
      {/* Month nav */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 16px", borderBottom: "1px solid #2a2a2a",
      }}>
        <button type="button"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "transparent", color: "#888", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
          ‹
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#ededed" }}>{MONTHS[month]} {year}</span>
        <button type="button"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "transparent", color: "#888", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
          ›
        </button>
      </div>

      {/* Calendar grid */}
      <div style={{ padding: "12px 16px 14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 }}>
          {DAYS.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "#555", padding: "3px 0" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
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
                style={{
                  aspectRatio: "1",
                  borderRadius: 10,
                  border: "none",
                  fontSize: 13,
                  fontWeight: isSelected ? 700 : isToday ? 700 : 400,
                  cursor: disabled ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  ...(disabled
                    ? { backgroundColor: "transparent", color: "#333" }
                    : isSelected
                    ? { backgroundColor: "#5b63d3", color: "#fff" }
                    : isToday
                    ? { backgroundColor: "#1a1a2e", color: "#5b63d3" }
                    : { backgroundColor: "transparent", color: "#ccc" }),
                  transition: "background-color 0.1s",
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Clear */}
      {value && (
        <div style={{ borderTop: "1px solid #1e1e1e", padding: "8px 12px" }}>
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            style={{
              width: "100%", padding: "6px", borderRadius: 8, border: "none",
              backgroundColor: "#1a1a1a", color: "#888", fontSize: 12, cursor: "pointer",
            }}
          >
            Clear
          </button>
        </div>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div style={{ position: "relative", display: "block" }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, width: "100%",
          backgroundColor: "#111111",
          color: selected ? "#ededed" : "#aaa",
          border: `1px solid ${open ? "#5b63d3" : "#2a2a2a"}`,
          borderRadius: 12, padding: "6px 12px",
          fontSize: 14, cursor: "pointer", outline: "none",
          transition: "border-color 0.15s",
        }}
      >
        {/* calendar icon */}
        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"
          style={{ color: selected ? "#7c85e8" : "#666" }}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>{label}</span>
        <svg width="11" height="11" fill="none" stroke="#666" viewBox="0 0 24 24"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {dropdownEl}
    </div>
  );
}
