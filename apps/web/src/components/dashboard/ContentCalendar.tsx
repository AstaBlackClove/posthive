"use client";

import { useState } from "react";
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
import { StatusLegend } from "./StatusDot";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CHANNELS = ["all", "instagram", "linkedin"] as const;
type Channel = (typeof CHANNELS)[number];

type Props = {
  /** Today as a WIB "YYYY-MM-DD" key (from the page, so the grid never reads the browser's clock). */
  todayKey: string;
  /** Number of posts in the visible range. 0 shows the empty state over the grid. */
  postCount?: number;
};

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
export function ContentCalendar({ todayKey, postCount = 0 }: Props) {
  const [view, setView] = useState<CalendarView>("month");
  const [channel, setChannel] = useState<Channel>("all");
  const [anchor, setAnchor] = useState(todayKey);

  const days = visibleDays(view, anchor);
  const weeks = chunk(days, view === "day" ? 1 : 7);
  const month = monthTitle(anchor);
  const empty = postCount === 0;

  return (
    <Card aria-labelledby="calendar-title" className="gap-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4">
        <div>
          <h2 id="calendar-title" className="type-body-sb-m text-fg">Content calendar</h2>
          <p className="type-body-r-xs text-muted-foreground" aria-live="polite">{rangeTitle(view, anchor, monthTitle)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup type="single" variant="pill" value={channel} onValueChange={(v) => setChannel(v as Channel)} aria-label="Channel" className="border-0 bg-bg">
            {CHANNELS.map((c) => (
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

      <StatusLegend variant="calendar" className="px-4" />
    </Card>
  );
}
