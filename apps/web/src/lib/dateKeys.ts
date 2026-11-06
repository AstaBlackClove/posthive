// "YYYY-MM-DD" keys ↔ the Date objects a calendar widget wants.
//
// The app's schedule is WIB wall-clock text (lib/datetime.ts), never a browser-local instant.
// A key is turned into a LOCAL date at noon and read back with local getters, so the calendar
// shows the same day whatever the browser's timezone is. Noon, not midnight: a local midnight can
// fall in a daylight-saving gap and would roll over to the next day in some zones.

const KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-11-20" → that day as a local Date. undefined for "" or anything that is not a real date. */
export function keyToDate(key: string | null | undefined): Date | undefined {
  const m = KEY.exec(key ?? "");
  if (!m) return undefined;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d, 12);
  // 2026-02-31 would roll over to March: reject it
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return undefined;
  return date;
}

/** A local Date → "YYYY-MM-DD" (the day the calendar shows). */
export function dateToKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
