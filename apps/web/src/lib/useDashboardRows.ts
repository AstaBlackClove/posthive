"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ContentRow, TabKey } from "@/components/dashboard/types";
import { apiFetch } from "./api";
import { toContentRow, type ApiDashboard, type ApiPost } from "./dashboard-data";

/** Rows of a page of the content table: the API's LIST_LIMIT, which is also the size of the first page inside /dashboard. */
export const TABLE_PAGE_SIZE = 10;

interface PageAnswer {
  count: number;
  page: number;
  pageCount: number;
  posts: ApiPost[];
}

const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

/**
 * The rows of the dashboard's content table, a page at a time. The first page of every tab comes with /dashboard, so
 * opening the dashboard or switching tab asks for nothing; the next pages come from /dashboard/content. A new /dashboard
 * answer (after an edit, a delete, a send) asks again for the page on screen. While the next page is on its way the rows of the
 * last one stay, so the table does not flash empty, and an answer for a page the person already left is dropped.
 */
export function useDashboardRows(api: ApiDashboard | null) {
  const [view, setView] = useState<{ tab: TabKey; page: number }>({ tab: "upcoming", page: 1 });
  const [fetched, setFetched] = useState<{ tab: TabKey; answer: PageAnswer } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const request = useRef(0);
  // "tab:page" the server answered in place of the one asked for: its rows are already in `fetched`, so that page is not asked again
  const landed = useRef<string | null>(null);
  const { tab, page } = view;

  useEffect(() => {
    // read and cleared on every run, so a key left over can never skip a page the person asks for later
    const skip = landed.current === `${tab}:${page}`;
    landed.current = null;
    if (!api || page === 1 || skip) {
      setLoading(false);
      return;
    }
    const id = ++request.current;
    setLoading(true);
    apiFetch<PageAnswer>(`/dashboard/content?tab=${tab}&page=${page}`)
      .then((answer) => {
        if (request.current !== id) return;
        setFetched({ tab, answer });
        setError(null);
        // rows were deleted since: the server answered the last page it has, and so does the pager
        if (answer.page !== page) {
          landed.current = `${tab}:${answer.page}`;
          setView({ tab, page: answer.page });
        }
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
  }, [api, tab, page, nonce]);

  // Page 1 is part of /dashboard; a later page is the last answer for this tab (the one before it, while the next loads)
  const first = api?.lists[tab];
  const shown: Pick<PageAnswer, "count" | "posts"> | undefined = page > 1 && fetched?.tab === tab ? fetched.answer : first;
  const posts = shown?.posts;
  const rows = useMemo<ContentRow[]>(() => (posts ?? []).map(toContentRow), [posts]);

  return {
    tab,
    page,
    rows,
    pageCount: Math.max(1, Math.ceil((shown?.count ?? 0) / TABLE_PAGE_SIZE)),
    loading,
    error,
    pickTab: useCallback((next: TabKey) => setView({ tab: next, page: 1 }), []),
    setPage: useCallback((next: number) => setView((v) => ({ ...v, page: next })), []),
    retry: useCallback(() => setNonce((n) => n + 1), []),
  };
}
