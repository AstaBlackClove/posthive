"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "./api";
import type { BoardFilter, ImportSource, ListAnswer, ListFilter, ListItem } from "./content-list";

export interface ContentListState {
  /** The last answer. While the next page loads it is still the old one, so the table does not flash empty. */
  data: ListAnswer | null;
  /** The plan the newest import came from: asked once, then kept (a page turn does not ask again). null = none. */
  source: ImportSource | null | undefined;
  loading: boolean;
  error: string | null;
  reload: () => void;
  /** Changes with every `reload()`: the calendar and the board ask again when it does, so an edit shows in every view. */
  version: number;
}

const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

/**
 * One page of the Content List. An answer for a page the person already left is dropped: a slow request for
 * page 2 must not land over page 3. The imported file is part of the first answer only.
 */
export function useContentList(filter: ListFilter, page: number, size = 10): ContentListState {
  const [data, setData] = useState<ListAnswer | null>(null);
  const [source, setSource] = useState<ImportSource | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const request = useRef(0);
  const askedSource = useRef(false);

  useEffect(() => {
    const id = ++request.current;
    const withSource = !askedSource.current;
    setLoading(true);
    apiFetch<ListAnswer>(`/jobs/list?filter=${filter}&page=${page}&limit=${size}${withSource ? "&source=1" : ""}`)
      .then((answer) => {
        if (request.current !== id) return;
        setData(answer);
        if (answer.source !== undefined) {
          setSource(answer.source);
          askedSource.current = true;
        }
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
  }, [filter, page, size, nonce]);

  const reload = useCallback(() => {
    // the import may have just been made: ask for the file again with the next answer, and only that one
    askedSource.current = false;
    setNonce((n) => n + 1);
  }, []);
  return { data, source, loading, error, reload, version: nonce };
}

// ── The calendar and the board ──────────────────────────────────────────────

/**
 * The answers of one or more paths, asked together. An answer for a request the person already left is dropped (a slow
 * month must not land over the next one). `state.key` says which paths the answer is for; while the next ones load the
 * last answer stays, so a grid does not flash empty.
 */
function useAnswers<T>(paths: string[], version: number) {
  const key = paths.join("\n");
  const [state, setState] = useState<{ key: string; data: T[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const request = useRef(0);

  useEffect(() => {
    const id = ++request.current;
    setLoading(true);
    setError(null);
    Promise.all(key.split("\n").map((path) => apiFetch<T>(path)))
      .then((data) => {
        if (request.current === id) setState({ key, data });
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
  }, [key, version, nonce]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { key, state, loading, error, retry };
}

/** The API's answer for a range of days: the posts in it, and the closest dated ones outside it. */
export interface CalendarAnswer {
  from: string;
  to: string;
  items: ListItem[];
  truncated: boolean;
  next: ListItem | null;
  prev: ListItem | null;
}

export interface ListCalendarState {
  /** The posts of the last answer, while it is for the days on screen (else none: a month's posts never sit on the next one). */
  answer: CalendarAnswer | null;
  /** The answer on screen is for this status and these days, and nothing is loading. */
  ready: boolean;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/** The posts of the days the calendar shows, of one status (or all). */
export function useListCalendar(filter: ListFilter, from: string, to: string, version: number): ListCalendarState {
  const { key, state, loading, error, retry } = useAnswers<CalendarAnswer>([`/jobs/calendar?filter=${filter}&from=${from}&to=${to}`], version);
  const answer = state?.data[0] && state.data[0].from === from && state.data[0].to === to ? state.data[0] : null;
  return { answer, ready: state?.key === key && !loading && !error, loading, error, retry };
}

export interface BoardState {
  /** One answer per column, for the columns on screen; null until they have come. */
  columns: Record<BoardFilter, ListAnswer> | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/** The first cards of each Kanban column: the same rows as the table, a few per status. */
export function useBoard(filters: BoardFilter[], size: number, version: number): BoardState {
  const { key, state, loading, error, retry } = useAnswers<ListAnswer>(
    filters.map((f) => `/jobs/list?filter=${f}&limit=${size}`),
    version
  );
  const columns = state?.key === key ? (Object.fromEntries(filters.map((f, i) => [f, state.data[i]])) as Record<BoardFilter, ListAnswer>) : null;
  return { columns, loading, error, retry };
}
