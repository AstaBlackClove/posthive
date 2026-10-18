"use client";

import { useEffect, useRef, useState } from "react";
import { DatePicker } from "./DatePicker";

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
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {/* Trigger */}
      <div ref={ref} style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            backgroundColor: "#111111",
            color: value ? "#ededed" : "#aaa",
            border: `1px solid ${open ? "#5b63d3" : "#2a2a2a"}`,
            borderRadius: 12, padding: "6px 12px",
            fontSize: 14, cursor: "pointer", outline: "none",
            transition: "border-color 0.15s",
          }}
        >
          {/* repeat icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={value ? "#7c85e8" : "#666"} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 1l4 4-4 4" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <path d="M7 23l-4-4 4-4" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
          <span>{label}</span>
          {/* chevron */}
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {/* Dropdown — opens upward */}
        {open && (
          <div style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: 0,
            minWidth: 180,
            backgroundColor: "#111111",
            border: "1px solid #2a2a2a",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            zIndex: 300,
            overflow: "hidden",
          }}>
            {/* No repeat option */}
            <button
              type="button"
              onClick={() => { onChangeInterval(""); onChangeEndsAt(""); setOpen(false); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "10px 16px", fontSize: 14,
                color: !value ? "#ededed" : "#888",
                backgroundColor: !value ? "#1a1a2e" : "transparent",
                border: "none", cursor: "pointer",
                borderBottom: "1px solid #1e1e1e",
              }}
            >
              Do Not Repeat
            </button>
            {INTERVALS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChangeInterval(opt.value); onChangeEndsAt(""); setOpen(false); }}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "10px 16px", fontSize: 14,
                  color: value === opt.value ? "#ededed" : "#aaa",
                  backgroundColor: value === opt.value ? "#1a1a2e" : "transparent",
                  border: "none", cursor: "pointer",
                  borderBottom: "1px solid #1e1e1e",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  {opt.label}
                  {value === opt.value && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="#5b63d3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, color: "#aaa", fontWeight: 500 }}>until</span>
          <DatePicker
            value={endsAt}
            onChange={onChangeEndsAt}
            min={(() => {
              const d = new Date();
              if (value === "daily") d.setDate(d.getDate() + 1);
              else if (value === "weekly") d.setDate(d.getDate() + 7);
              else d.setMonth(d.getMonth() + 1);
              return d.toISOString().slice(0, 10);
            })()}
            placeholder="End date (optional)"
          />
        </div>
      )}
    </div>
  );
}
