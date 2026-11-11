"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, CloudUploadIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/cn";
import { inAnchorMonth, rangeTitle, shiftAnchor, visibleDays, type CalendarView } from "@/lib/calendar-range";
import { monthTitle } from "@/lib/dashboard-format";
import { platformLabel } from "@/lib/platforms";
import { statusLabel } from "@/lib/content-status";
import { eventsByDay, type CalendarEvent } from "@/lib/dashboard-data";
import { StatusDot, StatusLegend } from "./StatusDot";
import { pillTone } from "./StatusPill";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const BASE_CHANNELS = ["instagram", "linkedin"] as const;
/** Events a cell lists before "+N more": the cell is a few lines tall. */
const PER_CELL = 3;

type Props = {
  /** Today as a WIB "YYYY-MM-DD" key (from the page, so the grid never reads the browser's clock). */
  todayKey: string;
  /** The posts of the days the grid shows. None shows the empty state over the grid. */
  events?: CalendarEvent[];
  /**
   * The days `events` were loaded for. While they are not the days on screen the grid is waiting, and says nothing
   * about them (an old answer is not an empty one). null = nothing has come yet; left out = `events` are for the
   * days on screen.
   */
  eventsRange?: { from: string; to: string } | null;
  /** The grid is waiting for the posts of the range it moved to. */
  loading?: boolean;
  /** The server cut the range short: not every post is on the grid. */
  truncated?: boolean;
  /** Why the posts of this range could not be loaded. The grid then does not claim the range is empty. */
  error?: string | null;
  onRetry?: () => void;
  /** The first and last day the grid shows, told again whenever the person moves it. */
  onRangeChange?: (from: string, to: string) => void;
};

/**
 * The posts of one day, as the design draws them: one line each, in the status's soft tint, with its dot, its
 * time and its title cut with an ellipsis when it does not fit. With more posts than lines the last line is
 * "+N more". A phone's cell is about 48px wide: there only the status dots fit (time and title are still read
 * out), the pill comes from sm up.
 *
 * The list must not wrap on sm and up: in a wrapping flex column every item is as wide as its text, so a long
 * title would stretch past the cell's padding instead of being cut.
 */
function DayEvents({ events, limit }: { events: CalendarEvent[]; limit: number }) {
  if (events.length === 0) return null;
  const shown = events.length > limit ? events.slice(0, limit - 1) : events;
  const hidden = events.length - shown.length;
  return (
    <ul className="flex flex-wrap gap-1 sm:flex-col sm:flex-nowrap">
      {shown.map((e) => (
        <li key={e.id} className="min-w-0" title={`${e.title} · ${statusLabel(e.status)}${e.channels.length ? ` · ${e.channels.map(platformLabel).join(", ")}` : ""}`}>
          <span className={cn("flex min-w-0 flex-wrap items-center gap-x-1.5 rounded-md px-1.5 py-0.5 type-body-r-xxs max-sm:bg-transparent max-sm:p-0", pillTone(e.status))}>
            <StatusDot status={e.status} className="size-1.5" />
            <span className="shrink-0 type-body-sb-xxs tabular-nums max-sm:sr-only">{e.time}</span>
            {/* a wide cell has the title beside the time; a narrow one (the dashboard's column) drops it under, in the same pill */}
            <span className="min-w-0 basis-full truncate text-fg @[7rem]:flex-1 @[7rem]:basis-0 max-sm:sr-only">{e.title}</span>
          </span>
        </li>
      ))}
      {hidden > 0 && <li className="px-1.5 type-body-sb-xxs text-muted-foreground">+{hidden}<span className="max-sm:sr-only"> more</span></li>}
    </ul>
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * The month grid. It is built from plain "YYYY-MM-DD" keys (lib/calendar-range), not from the
 * shadcn Calendar: that one is a date picker, this one is a board that will hold events. The
 * filter, the view switch and the arrows are shadcn components; with no posts an Empty sits over
 * the middle of the grid, in the grid's own area, so a short board (a day, a week) grows to hold it.
 */
export function ContentCalendar({ todayKey, events, eventsRange, loading = false, truncated = false, error = null, onRetry, onRangeChange }: Props) {
  const [view, setView] = useState<CalendarView>("month");
  const [channel, setChannel] = useState<string>("all");
  const [anchor, setAnchor] = useState(todayKey);

  const days = visibleDays(view, anchor);
  const weeks = chunk(days, view === "day" ? 1 : 7);
  const month = monthTitle(anchor);
  const first = days[0];
  const last = days[days.length - 1];

  // The page fetches the posts of whatever range the grid is showing
  useEffect(() => {
    onRangeChange?.(first, last);
  }, [first, last, onRangeChange]);

  // The filter lists the two channels of the design, any other a post in view goes to, and the one picked
  // (so moving to a month without that channel does not leave a filter with nothing selected)
  const channels = useMemo(() => {
    const extra = new Set<string>();
    for (const e of events ?? []) for (const c of e.channels) if (!(BASE_CHANNELS as readonly string[]).includes(c)) extra.add(c);
    if (channel !== "all" && !(BASE_CHANNELS as readonly string[]).includes(channel)) extra.add(channel);
    return ["all", ...BASE_CHANNELS, ...extra];
  }, [events, channel]);
  const shown = useMemo(() => (events ?? []).filter((e) => channel === "all" || e.channels.includes(channel)), [events, channel]);
  const byDay = useMemo(() => eventsByDay(shown), [shown]);
  // The page learns the new days from an effect and only then starts loading, so for a render or two `events` and
  // `loading` still belong to the days the person just left: that is waiting, not an empty range.
  const answered = eventsRange === undefined || (eventsRange !== null && eventsRange.from === first && eventsRange.to === last);
  const empty = answered && !loading && !error && shown.length === 0;

  return (
    <Card aria-labelledby="calendar-title" className="gap-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4">
        <h2 id="calendar-title" className="type-body-m-l text-fg">Content calendar</h2>

        <ToggleGroup type="single" variant="pill" value={channel} onValueChange={setChannel} aria-label="Channel" className="border-0 bg-bg">
          {channels.map((c) => (
            <ToggleGroupItem key={c} value={c} size="sm">
              {c === "all" ? "All" : platformLabel(c)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="px-4">
        {/* the board of the design: the range controls on top, the grid under them, one border around both. It is a
            grid of its own so the empty state can take the grid's place: a day or a week is shorter than the card, and
            the board grows to the taller of the two instead of the card spilling over the controls. Every child has its
            cell spelled out: a child with a fixed cell is placed first, and would push the others a row down. */}
        <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-border">
          <div className="col-start-1 row-start-1 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" size="sm" className="rounded-full px-4 py-1.5" onClick={() => setAnchor(todayKey)}>
                Today
              </Button>
              <div role="group" aria-label="Change range" className="flex items-center gap-1.5">
                <Button variant="secondary" size="icon-sm" className="size-8 rounded-full" aria-label={`Previous ${view}`} onClick={() => setAnchor(shiftAnchor(view, anchor, -1))}>
                  <ChevronLeftIcon />
                </Button>
                <Button variant="secondary" size="icon-sm" className="size-8 rounded-full" aria-label={`Next ${view}`} onClick={() => setAnchor(shiftAnchor(view, anchor, 1))}>
                  <ChevronRightIcon />
                </Button>
              </div>
              <p className="type-body-sb-l text-fg" aria-live="polite">{rangeTitle(view, anchor, monthTitle)}</p>
            </div>

            <ToggleGroup type="single" variant="pill" value={view} onValueChange={(v) => setView(v as CalendarView)} aria-label="View" className="border-0 bg-bg">
              <ToggleGroupItem value="day" size="sm">Day</ToggleGroupItem>
              <ToggleGroupItem value="week" size="sm">Week</ToggleGroupItem>
              <ToggleGroupItem value="month" size="sm">Month</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div role="grid" aria-label={`${month}, content calendar`} className="col-start-1 row-start-2">
            {view !== "day" && (
              <div role="row" className="grid grid-cols-7 border-b border-border/60 bg-surface">
                {WEEKDAYS.map((d, col) => (
                  <div key={d} role="columnheader" className={cn("min-w-0 border-border/60 px-2.5 py-2 type-body-r-xxs text-muted-foreground uppercase", col < 6 && "border-r")}>
                    {d}
                  </div>
                ))}
              </div>
            )}
            {weeks.map((week, row) => (
              <div key={week[0]} role="row" className={cn("grid", view === "day" ? "grid-cols-1" : "grid-cols-7", row < weeks.length - 1 && "border-b border-border/60")}>
                {week.map((day, col) => {
                  const inMonth = view !== "month" || inAnchorMonth(day, anchor);
                  const isToday = day === todayKey;
                  const dayEvents = byDay.get(day) ?? [];
                  return (
                    <div
                      key={day}
                      role="gridcell"
                      aria-label={day}
                      data-today={isToday || undefined}
                      className={cn(
                        // p-1.5: the pills keep 6px from the lines of the cell, however long the title
                        "@container flex min-w-0 flex-col gap-1 border-border/60 p-1.5 type-body-r-xs",
                        view === "day" ? "min-h-40" : "min-h-20 sm:min-h-34",
                        view !== "day" && col < 6 && "border-r",
                        // today has a yellow edge and a pale yellow fill; the next and last month's days a shade off white, the weekend a hint of it
                        isToday
                          ? "bg-brand-50 text-fg ring-2 ring-brand-400 ring-inset"
                          : !inMonth
                            ? "bg-bg/50 text-muted-foreground/50"
                            : view !== "day" && col >= 5
                              ? "bg-bg/25 text-fg"
                              : "bg-surface text-fg"
                      )}
                    >
                      <div className="flex h-6 items-center justify-between gap-1">
                        <span className={cn("flex size-6 items-center justify-center rounded-full type-body-r-s", isToday && "bg-accent type-body-sb-xs text-accent-fg")}>
                          {Number(day.slice(8))}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="pr-1 type-body-r-xxs text-muted-foreground max-sm:sr-only">
                            {dayEvents.length} {dayEvents.length === 1 ? "post" : "posts"}
                          </span>
                        )}
                      </div>
                      <DayEvents events={dayEvents} limit={view === "day" ? Infinity : PER_CELL} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {empty && (
            <div className="pointer-events-none col-start-1 row-start-2 flex items-center justify-center p-4">
              <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-border bg-surface shadow-lg">
                <EmptyState
                  size="inline"
                  icon={<CalendarDaysIcon />}
                  title="Your calendar is empty"
                  description={`Schedule your first post or import a quarter plan to fill ${month.split(" ")[0]} with content.`}
                  action={
                    <>
                      <Button asChild variant="olive">
                        <Link href="/jobs/import">
                          <CloudUploadIcon />
                          Import plan
                        </Link>
                      </Button>
                      <Button asChild>
                        <Link href="/compose">
                          <PlusIcon />
                          Add content
                        </Link>
                      </Button>
                    </>
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="flex flex-wrap items-center gap-2 px-4 type-body-r-xs text-red-600" role="alert">
          Couldn&apos;t load the posts of this range. {error}
          {onRetry && (
            <Button variant="link" size="sm" className="h-auto p-0" onClick={onRetry}>
              Try again
            </Button>
          )}
        </p>
      )}

      {truncated && (
        <p className="px-4 type-body-r-xs text-brand-800" role="status">
          This range has more posts than the calendar can show. Move to a shorter view to see them all.
        </p>
      )}

      <StatusLegend variant="calendar" className="px-4" />
    </Card>
  );
}
