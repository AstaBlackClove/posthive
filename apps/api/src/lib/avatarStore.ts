import type { StorageAdapter } from "./storage.js";

let store: StorageAdapter | null = null;
export function setAvatarStorage(s: StorageAdapter): void { store = s; }

/** Download an avatar URL and persist it in our own storage. Falls back to original URL on any error. */
export async function downloadAndStoreAvatar(url: string | null): Promise<string | null> {
  if (!url || !store) return url;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return url;
    const ct = res.headers.get("content-type") ?? "image/jpeg";
    const mime = ct.startsWith("image/") ? ct.split(";")[0].trim() : "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    const storedPath = await store.upload(buf, mime, "profile-pics");
    const apiBase = process.env.PUBLIC_API_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
    return storedPath.startsWith("http") ? storedPath : `${apiBase}${storedPath}`;
  } catch {
    return url;
  }
}
