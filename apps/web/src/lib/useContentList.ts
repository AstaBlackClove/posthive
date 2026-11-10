"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "./api";
import type { ImportSource, ListAnswer, ListFilter } from "./content-list";

export interface ContentListState {
  /** The last answer. While the next page loads it is still the old one, so the table does not flash empty. */
  data: ListAnswer | null;
  /** The plan the newest import came from: asked once, then kept (a page turn does not ask again). null = none. */
  source: ImportSource | null | undefined;
  loading: boolean;
  error: string | null;
  reload: () => void;
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
  return { data, source, loading, error, reload };
}
