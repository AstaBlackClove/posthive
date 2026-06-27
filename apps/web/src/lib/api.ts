const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  // Deduplicate concurrent refresh attempts
  if (refreshing) return refreshing;
  refreshing = fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => { refreshing = null; });
  return refreshing;
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const doFetch = () =>
    fetch(`${API_BASE}${path}`, {
      headers: {
        ...(options?.body ? { "Content-Type": "application/json" } : {}),
        ...options?.headers,
      },
      credentials: "include",
      ...options,
    });

  let res = await doFetch();

  // Access token expired — try a silent refresh then retry once
  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await doFetch();
    }
  }

  if (!res.ok) {
    const body = await res.text();
    let message = `${res.status} error`;
    try { const j = JSON.parse(body); message = j.error ?? j.message ?? message; } catch {}
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
