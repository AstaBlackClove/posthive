"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "./api";
import { formatTime, wibDateKey } from "./datetime";
import type { ApiCalendar, ApiDashboard, CalendarEvent } from "./dashboard-data";
import { toCalendarEvents } from "./dashboard-data";

// The server picks the workspace (the user's active one), and switching workspace reloads the whole
// app, so neither hook is keyed on the workspace: one request when the page opens, not one more when
// the workspace list arrives.

export interface DashboardState {
  data: ApiDashboard | null;
  loading: boolean;
  /** Why the numbers could not be loaded. The page keeps what it had, if it had anything. */
  error: string | null;
  reload: () => void;
}

const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

/** The workspace's numbers. */
export function useDashboard(): DashboardState {
  const [data, setData] = useState<ApiDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const request = useRef(0);

  useEffect(() => {
    const id = ++request.current;
    setLoading(true);
    apiFetch<ApiDashboard>("/dashboard")
      .then((answer) => {
        if (request.current !== id) return;
        setData(answer);
        setError(null);
      })
      .catch((e) => {
        if (request.current === id) setError(message(e));
      })
      .finally(() => {
        if (request.current === id) setLoading(false);
      });
    return () => {
      request.current += 1;
    };
  }, [nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, reload };
}

export interface CalendarState {
  events: CalendarEvent[];
  /** The days `events` were answered for (null before the first answer), so the grid knows when it is still waiting. */
  range: { from: string; to: string } | null;
  /** True from the start: the grid always asks for its first range as soon as it is drawn. */
  loading: boolean;
  truncated: boolean;
  error: string | null;
  /** Tell it which days the grid shows now. */
  setRange: (from: string, to: string) => void;
  /** Ask for the range again after a failure. */
  retry: () => void;
}

/** WIB day of an instant, for placing a post on its cell. */
export const dayOf = (iso: string) => wibDateKey(new Date(iso));
/** WIB time of an instant, "14:00", for the pill of a post. */
export const timeOf = (iso: string) => formatTime(new Date(iso));

/**
 * The posts of the days the calendar shows. Moving the grid asks for the new range; an answer that
 * arrives after the person moved on is dropped, so the grid never shows the previous month's posts.
 */
export function useCalendar(): CalendarState {
  const [range, setRangeState] = useState<{ from: string; to: string } | null>(null);
  const [answer, setAnswer] = useState<ApiCalendar | null>(null);
  // Starts true: the first range is asked for right after the first draw, and until then "empty" must not show
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const request = useRef(0);

  useEffect(() => {
    if (!range) return;
    const id = ++request.current;
    setLoading(true);
    setError(null);
    apiFetch<ApiCalendar>(`/dashboard/calendar?from=${range.from}&to=${range.to}`)
      .then((a) => {
        if (request.current === id) setAnswer(a);
      })
      .catch((e) => {
        if (request.current === id) setError(message(e));
      })
      .finally(() => {
        if (request.current === id) setLoading(false);
      });
    return () => {
      request.current += 1;
    };
  }, [range, nonce]);

  const setRange = useCallback((from: string, to: string) => {
    // the same range again is not a change: it would ask the server for nothing new
    setRangeState((current) => (current && current.from === from && current.to === to ? current : { from, to }));
  }, []);
  const retry = useCallback(() => setNonce((n) => n + 1), []);

  // Only an answer for the range on screen counts; while the next one loads the grid shows no posts of the old range
  const events = useMemo(
    () => (answer && range && answer.from === range.from && answer.to === range.to ? toCalendarEvents(answer.posts, dayOf, timeOf) : []),
    [answer, range]
  );
  const answered = useMemo(() => (answer ? { from: answer.from, to: answer.to } : null), [answer]);
  return { events, range: answered, loading, truncated: Boolean(answer?.truncated && events.length > 0), error, setRange, retry };
}
