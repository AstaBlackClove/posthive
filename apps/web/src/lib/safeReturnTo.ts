// Only allow an internal, single-leading-slash path as a post-login redirect target.
// Rejects "//evil.com" and "/\evil.com" (both resolve as protocol-relative off-site
// URLs in the browser) and anything with a scheme ("javascript:", "https://evil.com").
export function safeReturnTo(returnTo: string | null | undefined, fallback: string): string {
  if (!returnTo) return fallback;
  if (/^\/(?!\/|\\)/.test(returnTo)) return returnTo;
  return fallback;
}
