// Where to send the user after sign-in. Only same-site paths are allowed.
// Keep in sync with apps/web/src/lib/session.ts (safeReturnTo).

const BASE = "http://returnto.invalid";

/**
 * Same-site path (with query and hash), or `fallback`.
 * Checks by parsing the way a browser does: a browser drops tabs and newlines inside a URL,
 * so "/\t/evil.com" would become "//evil.com". A first-characters regex misses that;
 * parsing and comparing the origin does not.
 */
export function safeReturnTo(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  try {
    const url = new URL(value, BASE);
    if (url.origin !== BASE) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
