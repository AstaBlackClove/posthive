// A template points at its design with a Figma link.
// Mirrored in apps/api/src/lib/figmaLink.ts; keep both identical.

const DESIGN_PATHS = ["/file/", "/design/", "/proto/", "/board/"];

/** True for an https link on figma.com (or a subdomain) that opens a file, design, prototype or board. */
export function isFigmaDesignUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (host !== "figma.com" && !host.endsWith(".figma.com")) return false;
  return DESIGN_PATHS.some((p) => url.pathname.startsWith(p));
}

/** Message for the form and API, or null when the link is fine. */
export function figmaLinkError(raw: string): string | null {
  if (!raw.trim()) return "Add a Figma link.";
  if (isFigmaDesignUrl(raw)) return null;
  return "Use a Figma link, like https://www.figma.com/design/… (file, design, proto or board).";
}
