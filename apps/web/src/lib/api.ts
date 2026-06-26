/**
 * Thin wrapper around fetch that points at the API service.
 * All web components import from here — nothing calls fetch directly.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    credentials: "include", // send auth cookies on every request
    ...options,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${options?.method ?? "GET"} ${path} → ${res.status}: ${body}`);
  }

  // 204 No Content has no body
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
