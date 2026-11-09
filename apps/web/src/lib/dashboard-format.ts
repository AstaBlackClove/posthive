import { APP_TIMEZONE } from "./datetime";

const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * "Thu, 13 Nov 2026": today's date for the dashboard pill, as the WIB calendar day (the app's
 * schedule is WIB, whatever the browser's timezone is). Built from parts so the order does not
 * depend on the browser's locale ("Sept" vs "Sep" and the comma differ between locales).
 */
export function formatTodayPill(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: APP_TIMEZONE, weekday: "short", day: "numeric", month: "short", year: "numeric" }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("weekday")}, ${get("day")} ${get("month")} ${get("year")}`;
}

/** "13 November": the WIB day and month, day first, for "Today Publish, 13 November". */
export function formatTodayLong(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: APP_TIMEZONE, day: "numeric", month: "long" }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")} ${get("month")}`;
}

/** "November 2026" for a "YYYY-MM-DD" key. */
export function monthTitle(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS_FULL[m - 1] ?? ""} ${y}`;
}

/** The footer text under the content table: which column it is sorted by and which way, in the design's words. */
export function sortSummary(sorting: readonly { id: string; desc: boolean }[]): string {
  const s = sorting[0];
  if (!s) return "Not sorted";
  if (s.id === "publishAt") return `Sorted by publish date, ${s.desc ? "latest" : "soonest"} first`;
  const name = ({ content: "content", channel: "channel", owner: "owner", production: "production status", publication: "publication status" } as Record<string, string>)[s.id] ?? s.id;
  return `Sorted by ${name}, ${s.desc ? "Z to A" : "A to Z"}`;
}

/** First name for the greeting: "Puteri Anggraini" → "Puteri". Empty when there is no usable name. */
export function firstName(full: string | null | undefined): string {
  return (full ?? "").trim().split(/\s+/)[0] ?? "";
}

/** Up to two initials: "Puteri Anggraini" → "PA", "puteri" → "P", nothing → "?". */
export function initialsOf(full: string | null | undefined): string {
  const words = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words.slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}
