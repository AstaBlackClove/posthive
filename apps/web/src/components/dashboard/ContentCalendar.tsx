"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, CloudUploadIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/cn";
import { inAnchorMonth, rangeTitle, shiftAnchor, visibleDays, type CalendarView } from "@/lib/calendar-range";
import { monthTitle } from "@/lib/dashboard-format";
import { platformLabel } from "@/lib/platforms";
import { CONTENT_STATUS, statusLabel } from "@/lib/content-status";
import { eventsByDay, type CalendarEvent } from "@/lib/dashboard-data";
import { StatusDot, StatusLegend } from "./StatusDot";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const BASE_CHANNELS = ["instagram", "linkedin"] as const;
/** Events a cell lists before "+N more": the cell is a few lines tall. */
const PER_CELL = 3;

type Props = {
  /** Today as a WIB "YYYY-MM-DD" key (from the page, so the grid never reads the browser's clock). */
  todayKey: string;
  /** The posts of the days the grid shows. None shows the empty state over the grid. */
  events?: CalendarEvent[];
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

/** The posts of one day: a dot for the status and the title, a few lines at most, then "+N more". */
function DayEvents({ events, limit }: { events: CalendarEvent[]; limit: number }) {
  if (events.length === 0) return null;
  const shown = events.slice(0, limit);
  return (
    // a phone's cell is about 48px wide: only the status dots fit (the title is still read out), titles from sm up
    <ul className="mt-1 flex flex-wrap gap-1 sm:block sm:space-y-0.5">
      {shown.map((e) => (
        <li key={e.id} className="flex items-center gap-1.5 truncate type-body-r-xxs" title={`${e.title} · ${statusLabel(e.status, "calendar")}${e.channels.length ? ` · ${e.channels.map(platformLabel).join(", ")}` : ""}`}>
          <StatusDot status={e.status} className={CONTENT_STATUS[e.status].dot} />
          <span className="truncate max-sm:sr-only">{e.title}</span>
        </li>
      ))}
      {events.length > shown.length && <li className="type-body-r-xxs text-muted-foreground">+{events.length - shown.length}<span className="max-sm:sr-only"> more</span></li>}
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
 * the middle of the grid.
 */
export function ContentCalendar({ todayKey, events, loading = false, truncated = false, error = null, onRetry, onRangeChange }: Props) {
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
  const empty = !loading && !error && shown.length === 0;

  return (
    <Card aria-labelledby="calendar-title" className="gap-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4">
        <div>
          <h2 id="calendar-title" className="type-body-sb-m text-fg">Content calendar</h2>
          <p className="type-body-r-xs text-muted-foreground" aria-live="polite">{rangeTitle(view, anchor, monthTitle)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup type="single" variant="pill" value={channel} onValueChange={setChannel} aria-label="Channel" className="border-0 bg-bg">
            {channels.map((c) => (
              <ToggleGroupItem key={c} value={c} size="sm">
                {c === "all" ? "All" : platformLabel(c)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <ToggleGroup type="single" variant="pill" value={view} onValueChange={(v) => setView(v as CalendarView)} aria-label="View" className="border-0 bg-bg">
            <ToggleGroupItem value="day" size="sm">Day</ToggleGroupItem>
            <ToggleGroupItem value="week" size="sm">Week</ToggleGroupItem>
            <ToggleGroupItem value="month" size="sm">Month</ToggleGroupItem>
          </ToggleGroup>

          <Button variant="secondary" size="sm" className="rounded-full border-0 bg-bg hover:bg-neutral-100" onClick={() => setAnchor(todayKey)}>
            Today
          </Button>

          <ButtonGroup aria-label="Change range">
            <Button variant="secondary" size="icon-sm" aria-label={`Previous ${view}`} onClick={() => setAnchor(shiftAnchor(view, anchor, -1))}>
              <ChevronLeftIcon />
            </Button>
            <Button variant="secondary" size="icon-sm" aria-label={`Next ${view}`} onClick={() => setAnchor(shiftAnchor(view, anchor, 1))}>
              <ChevronRightIcon />
            </Button>
          </ButtonGroup>
        </div>
      </div>

      <div className="relative px-4">
        <div role="grid" aria-label={`${month}, content calendar`} className="overflow-hidden rounded-xl border border-border">
          {view !== "day" && (
            <div role="row" className="grid grid-cols-7 border-b border-border bg-bg">
              {WEEKDAYS.map((d) => (
                <div key={d} role="columnheader" className="px-3 py-2 type-body-sb-xs text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>
          )}
          {weeks.map((week, row) => (
            <div key={week[0]} role="row" className={cn("grid", view === "day" ? "grid-cols-1" : "grid-cols-7", row < weeks.length - 1 && "border-b border-border")}>
              {week.map((day, col) => {
                const inMonth = view !== "month" || inAnchorMonth(day, anchor);
                const isToday = day === todayKey;
                return (
                  <div
                    key={day}
                    role="gridcell"
                    aria-label={day}
                    data-today={isToday || undefined}
                    className={cn(
                      "border-border p-2 type-body-r-xs",
                      view === "day" ? "min-h-40" : "min-h-20 sm:min-h-24",
                      view !== "day" && col < 6 && "border-r",
                      inMonth ? "bg-surface text-fg" : "bg-bg/60 text-muted-foreground/60"
                    )}
                  >
                    <span className={cn("inline-flex size-6 items-center justify-center rounded-full", isToday && "bg-brand-500 type-body-sb-xs text-neutral-950")}>
                      {Number(day.slice(8))}
                    </span>
                    <DayEvents events={byDay.get(day) ?? []} limit={view === "day" ? Infinity : PER_CELL} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {empty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
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
