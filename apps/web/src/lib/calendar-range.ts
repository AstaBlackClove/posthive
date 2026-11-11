import { addDaysKey } from "./datetime";

// Which days the content calendar shows. Everything here works on "YYYY-MM-DD" keys and plain
// calendar arithmetic (no Date in the browser's timezone), the same way lib/datetime does, so the
// grid is the same in Jakarta and in Paris. Weeks start on Monday.

export type CalendarView = "day" | "week" | "month";

const parse = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return { y, m, d };
};

/** 0 = Monday … 6 = Sunday. */
function weekdayIndex(key: string): number {
  const dow = new Date(`${key}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return (dow + 6) % 7;
}

const firstOfMonth = (key: string) => `${key.slice(0, 7)}-01`;

function lastOfMonth(key: string): string {
  const { y, m } = parse(key);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/** The days a view shows around an anchor day, in order. A month is whole weeks (it spills into the neighbours). */
export function visibleDays(view: CalendarView, anchor: string): string[] {
  if (view === "day") return [anchor];
  let start: string;
  let end: string;
  if (view === "week") {
    start = addDaysKey(anchor, -weekdayIndex(anchor));
    end = addDaysKey(start, 6);
  } else {
    const first = firstOfMonth(anchor);
    start = addDaysKey(first, -weekdayIndex(first));
    const last = lastOfMonth(anchor);
    end = addDaysKey(last, 6 - weekdayIndex(last));
  }
  const days: string[] = [];
  for (let d = start; d <= end; d = addDaysKey(d, 1)) days.push(d);
  return days;
}

/** Move the anchor one step: a day, a week or a month, clamped so the 31st does not skip a month. */
export function shiftAnchor(view: CalendarView, anchor: string, direction: 1 | -1): string {
  if (view === "day") return addDaysKey(anchor, direction);
  if (view === "week") return addDaysKey(anchor, 7 * direction);
  const { y, m, d } = parse(anchor);
  const target = new Date(Date.UTC(y, m - 1 + direction, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  const ty = target.getUTCFullYear();
  const tm = String(target.getUTCMonth() + 1).padStart(2, "0");
  return `${ty}-${tm}-${String(Math.min(d, lastDay)).padStart(2, "0")}`;
}

/** Is this day inside the month the anchor is in? Days outside are drawn muted. */
export function inAnchorMonth(day: string, anchor: string): boolean {
  return day.slice(0, 7) === anchor.slice(0, 7);
}
