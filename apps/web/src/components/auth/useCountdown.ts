"use client";

import { useCallback, useEffect, useState } from "react";

/** Whole-second countdown for "Resend" buttons. `start(30)` (re)starts it; `remaining` is 0 when done. */
export function useCountdown(): { remaining: number; start: (seconds: number) => void } {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  const start = useCallback((seconds: number) => setRemaining(seconds), []);
  return { remaining, start };
}

/** 30 -> "0:30", 75 -> "1:15" */
export function formatCountdown(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
