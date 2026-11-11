"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "./api";
import type { ApiDashboard } from "./dashboard-data";

// The server picks the workspace (the user's active one), and switching workspace reloads the whole
// app, so the hook is not keyed on the workspace: one request when the page opens, not one more when
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
