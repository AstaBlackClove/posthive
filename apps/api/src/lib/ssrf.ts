export function isSsrfBlocked(url: string): boolean {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return true; }
  if (parsed.protocol !== "https:") return true;
  const h = parsed.hostname;
  return (
    h === "localhost" ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    h === "169.254.169.254" ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h === "0.0.0.0"
  );
}
