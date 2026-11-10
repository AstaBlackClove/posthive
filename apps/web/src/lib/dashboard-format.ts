import { APP_TIMEZONE, formatTime } from "./datetime";

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

/** "Fri 13 Nov · 14:00": a publish date as the content table shows it, in WIB. */
export function formatPublishAt(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: APP_TIMEZONE, weekday: "short", day: "numeric", month: "short" }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("weekday")} ${get("day")} ${get("month")} · ${formatTime(d)}`;
}

/** "Good morning" / "Good afternoon" / "Good evening" for the WIB hour (the app's schedule is WIB, not the browser's zone). */
export function greetingFor(d: Date): string {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: APP_TIMEZONE, hour: "2-digit", hourCycle: "h23" }).format(d));
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

/** "Oct – Dec" for a label like "Q4 2026"; empty when the label is not a quarter. */
export function quarterMonths(label: string): string {
  const q = /^Q([1-4])\b/.exec(label)?.[1];
  if (!q) return "";
  const first = (Number(q) - 1) * 3;
  return `${MONTHS_FULL[first].slice(0, 3)} – ${MONTHS_FULL[first + 2].slice(0, 3)}`;
}

/** "Putri Anggraini" → "Putri A.": a column is narrow. One word stays as it is. */
export function shortName(full: string | null | undefined): string {
  const words = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return words[0] ?? "";
  return `${words[0]} ${words[words.length - 1][0].toUpperCase()}.`;
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
