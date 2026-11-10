import { notifySessionExpired } from "./session";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** The address of a stored file: an upload path lives on the API, a full URL is already one. */
export function assetUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `${API_BASE}${url}`;
}

type RefreshResult = "ok" | "expired" | "error";

let refreshing: Promise<RefreshResult> | null = null;

async function tryRefresh(): Promise<RefreshResult> {
  // Deduplicate concurrent refresh attempts
  if (refreshing) return refreshing;
  refreshing = fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .then((r): RefreshResult => (r.ok ? "ok" : r.status === 401 ? "expired" : "error"))
    .catch((): RefreshResult => "error")
    .finally(() => { refreshing = null; });
  return refreshing;
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const doFetch = () => {
    const isFormData =
      typeof FormData !== "undefined" && options?.body instanceof FormData;

    return fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(!isFormData && options?.body ? { "Content-Type": "application/json" } : {}),
        ...options?.headers,
      },
      credentials: "include",
    });
  };

  let res = await doFetch();

  // Access token expired — try a silent refresh then retry once
  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed === "ok") {
      res = await doFetch();
    } else if (refreshed === "expired") {
      // Refresh token is gone/expired/revoked: tell the app shell (login redirect or save-your-work dialog)
      notifySessionExpired("expired");
    }
  }

  if (!res.ok) {
    const body = await res.text();
    let message = `${res.status} error`;
    let data: unknown;
    try { const j = JSON.parse(body); data = j; message = j.error ?? j.message ?? message; } catch {}
    // The parsed body rides along for callers that need more than the message (e.g. per-row import errors)
    throw Object.assign(new Error(message), { status: res.status, data });
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
