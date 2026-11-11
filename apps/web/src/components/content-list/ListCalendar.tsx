"use client";

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { InlineAlert } from "@/components/InlineAlert";
import { StatusDot } from "@/components/dashboard/StatusDot";
import { StatusPill } from "@/components/dashboard/StatusPill";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/cn";
import { inAnchorMonth, shiftAnchor, visibleDays, type CalendarView } from "@/lib/calendar-range";
import {
  calendarFooter,
  dayLabel,
  dayLine,
  groupByDay,
  cellKey,
  hourLabel,
  nextStep,
  pillOf,
  placeByHour,
  postsLabel,
  rangeLabel,
  shortDayLabel,
  statusOfPost,
  weekdayName,
  type ListCounts,
  type ListFilter,
  type ListItem,
  type RoleView,
} from "@/lib/content-list";
import { formatTime, wibDateKey } from "@/lib/datetime";
import { platformLabel } from "@/lib/platforms";
import { useListCalendar } from "@/lib/useContentList";
import { ChannelStack, PostCard } from "./PostCard";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
/** Posts a month cell lists before "+N more". */
const MONTH_CELL_POSTS = 2;
/** The columns of the week and day grids: the hours, then the days. */
const WEEK_COLUMNS = "grid-cols-[4.5rem_repeat(7,minmax(0,1fr))]";
const DAY_COLUMNS = "grid-cols-[4.5rem_minmax(0,1fr)]";

const dayOf = (item: ListItem): string => wibDateKey(new Date(item.scheduledFor as string));
const timeOf = (item: ListItem): string => formatTime(new Date(item.scheduledFor as string));

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

type Open = { openId: string | null; onOpen: (id: string) => void };

/**
 * A post inside a month cell or a week column: its channels, its time, its status and its title on one line. In a
 * narrow cell (a phone, a small window) the status is only its dot; the full name is in the button's label and title.
 */
function Chip({ item, openId, onOpen }: Open & { item: ListItem }) {
  const open = openId === item.id;
  const label = `${timeOf(item)} ${item.title}, ${statusOfPost(item)}`;
  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      aria-label={`Open ${label}`}
      title={label}
      data-open={open || undefined}
      className={cn(
        "@container flex w-full min-w-0 cursor-pointer flex-col gap-1 rounded-lg border px-1.5 py-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
        open ? "border-brand-400 bg-brand-50" : "border-border bg-bg hover:border-neutral-300"
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <ChannelStack channels={item.channels} size={16} />
        <span className="shrink-0 type-body-sb-xxs text-brand-800 tabular-nums">{timeOf(item)}</span>
        {/* wide enough for the status name: a chip in the design's 1440px month cell or week column is about this wide */}
        <StatusPill status={pillOf(item)} className="ml-auto hidden min-w-0 px-2 @min-[7.5rem]:inline-flex">
          {statusOfPost(item)}
        </StatusPill>
        <StatusDot status={pillOf(item)} className="ml-auto size-1.5 @min-[7.5rem]:hidden" />
      </span>
      <span className="truncate type-body-r-xs text-fg">{item.title}</span>
    </button>
  );
}

function MonthGrid({ days, anchor, todayKey, byDay, openId, onOpen, onDay }: Open & { days: string[]; anchor: string; todayKey: string; byDay: Map<string, ListItem[]>; onDay: (day: string) => void }) {
  return (
    <div role="grid" aria-label={rangeLabel("month", anchor)} className="min-w-176">
      <div role="row" className="grid grid-cols-7 border-b border-border/60 bg-surface">
        {WEEKDAYS.map((d) => (
          <div key={d} role="columnheader" className="min-w-0 border-r border-border/60 px-4 py-3 type-body-r-xs text-muted-foreground last:border-r-0">
            {d}
          </div>
        ))}
      </div>
      {chunk(days, 7).map((week) => (
        <div key={week[0]} role="row" className="grid grid-cols-7 border-b border-border/60 last:border-b-0">
          {week.map((day) => {
            const posts = byDay.get(day) ?? [];
            const hidden = posts.length > MONTH_CELL_POSTS ? posts.length - (MONTH_CELL_POSTS - 1) : 0;
            const shown = hidden > 0 ? posts.slice(0, MONTH_CELL_POSTS - 1) : posts;
            const isToday = day === todayKey;
            return (
              <div
                key={day}
                role="gridcell"
                aria-label={dayLabel(day)}
                className={cn("flex min-h-32 min-w-0 flex-col gap-1.5 border-r border-border/60 p-2 last:border-r-0", inAnchorMonth(day, anchor) ? "bg-surface" : "bg-bg text-muted-foreground/60")}
              >
                <div className="flex h-6 items-center justify-between gap-1">
                  <span className={cn("flex h-6 min-w-6 items-center justify-center rounded-full px-1 type-body-r-s", isToday && "bg-accent type-body-sb-xs text-accent-fg")}>{Number(day.slice(8))}</span>
                  {posts.length > 0 && <span className="type-body-r-xxs text-muted-foreground max-sm:sr-only">{postsLabel(posts.length)}</span>}
                </div>
                {shown.map((item) => (
                  <Chip key={item.id} item={item} openId={openId} onOpen={onOpen} />
                ))}
                {hidden > 0 && (
                  <button type="button" onClick={() => onDay(day)} className="w-fit cursor-pointer px-1 type-body-sb-xxs text-brand-800 underline-offset-2 hover:underline">
                    +{hidden} more
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function WeekGrid({ days, todayKey, byDay, items, openId, onOpen }: Open & { days: string[]; todayKey: string; byDay: Map<string, ListItem[]>; items: ListItem[] }) {
  const { cells, hours: rows } = useMemo(() => placeByHour(items), [items]);
  return (
    <div role="grid" aria-label={rangeLabel("week", days[0])} className="min-w-208">
      <div role="row" className={cn("grid border-b border-border/60 bg-bg", WEEK_COLUMNS)}>
        <div role="columnheader" className="px-3 py-3 type-body-r-xxs text-muted-foreground">
          GMT+7
        </div>
        {days.map((day) => (
          <div key={day} role="columnheader" aria-label={dayLabel(day)} className="min-w-0 border-l border-border/60 px-3 py-2.5">
            <p className="flex items-center gap-1.5">
              <span className="type-body-r-s text-muted-foreground">{weekdayName(day)}</span>
              <span className={cn("flex h-6 min-w-6 items-center justify-center rounded-full px-1 type-body-sb-m", day === todayKey ? "bg-accent text-accent-fg" : "text-fg")}>{Number(day.slice(8))}</span>
            </p>
            <p className="type-body-r-xxs text-muted-foreground">{postsLabel(byDay.get(day)?.length ?? 0)}</p>
          </div>
        ))}
      </div>
      {rows.map((hour) => (
        <div key={hour} role="row" className={cn("grid border-b border-border/60 last:border-b-0", WEEK_COLUMNS)}>
          <div role="rowheader" className="bg-bg/60 px-3 py-3.5 type-body-r-xs text-muted-foreground tabular-nums">
            {hourLabel(hour)}
          </div>
          {days.map((day) => (
            <div key={day} role="gridcell" className="flex min-h-13 min-w-0 flex-col gap-1.5 border-l border-border/60 bg-surface p-1.5">
              {(cells.get(cellKey(day, hour)) ?? []).map((item) => (
                <Chip key={item.id} item={item} openId={openId} onOpen={onOpen} />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function DayGrid({ day, posts, next, role, openId, onOpen, onGoTo }: Open & { day: string; posts: ListItem[]; next: ListItem | null; role: RoleView; onGoTo: (day: string) => void }) {
  const { cells, hours: rows } = useMemo(() => placeByHour(posts), [posts]);
  const nextPost = next?.scheduledFor ? (
    <button type="button" onClick={() => onGoTo(dayOf(next))} className="cursor-pointer text-left type-body-r-s text-brand-800 underline-offset-2 hover:underline">
      Next post: {shortDayLabel(dayOf(next))} · {timeOf(next)} · {next.title}
    </button>
  ) : null;

  return (
    <div role="grid" aria-label={rangeLabel("day", day)}>
      <div role="row" className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border/60 bg-brand-50 px-4 py-3">
        <span className="type-body-r-s text-muted-foreground">{weekdayName(day)}</span>
        <span className="type-body-sb-l text-brand-800">{Number(day.slice(8))}</span>
        <span className="type-body-r-xs text-muted-foreground">{dayLine(posts, platformLabel)}</span>
        {posts.length === 0 && nextPost}
      </div>
      {rows.map((hour) => {
        const here = cells.get(cellKey(day, hour)) ?? [];
        return (
          <div key={hour} role="row" className={cn("grid border-b border-border/60 last:border-b-0", DAY_COLUMNS)}>
            <div role="rowheader" className="bg-bg/60 px-3 py-3 type-body-r-xs text-muted-foreground tabular-nums">
              {hourLabel(hour)}
            </div>
            <div role="gridcell" className={cn("flex min-h-11 min-w-0 flex-wrap items-start gap-3 border-l border-border/60 p-3", here.length > 0 ? "bg-brand-50" : "bg-surface")}>
              {here.map((item) => (
                <div key={item.id} className="w-96 max-w-full">
                  <PostCard item={item} open={openId === item.id} onOpen={onOpen} />
                </div>
              ))}
              {/* the next step is about the first post of the day, and sits beside it */}
              {posts[0] && here.includes(posts[0]) && (
                <aside aria-label="Next step" className="w-80 max-w-full rounded-xl border border-border bg-surface p-4">
                  <h3 className="type-body-sb-s text-fg">Next step</h3>
                  <p className="mt-2 type-body-r-s text-muted-foreground">{nextStep(posts[0], role)}</p>
                  {nextPost && <div className="mt-3">{nextPost}</div>}
                </aside>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Where the calendar is: the range it shows and the day it is on. */
export interface CalendarPosition {
  view: CalendarView;
  setView: (view: CalendarView) => void;
  anchor: string;
  setAnchor: (day: string) => void;
  /** The status tab the grid has already jumped for. */
  jumpedFor: MutableRefObject<ListFilter | null>;
}

/**
 * The calendar's position lives in the page, not in the calendar: the calendar is left when the person goes to the
 * table to tick rows, and coming back must find the week they were on, not today's month again.
 */
export function useCalendarPosition(todayKey: string): CalendarPosition {
  const [view, setView] = useState<CalendarView>("month");
  const [anchor, setAnchor] = useState(todayKey);
  const jumpedFor = useRef<ListFilter | null>(null);
  return { view, setView, anchor, setAnchor, jumpedFor };
}

type Props = Open & {
  filter: ListFilter;
  counts: ListCounts;
  position: CalendarPosition;
  /** Today as a WIB "YYYY-MM-DD" key. */
  todayKey: string;
  /** Changes when the list was edited: the grid asks again. */
  version: number;
  role: RoleView;
};

/**
 * The calendar view of the list: Month, Week or Day, the posts of the status tab on screen placed by their WIB day and
 * hour. It opens on today's month; when that month has no post it jumps once to the closest one (before or after), so a
 * plan for another quarter is not an empty grid. A post only opens the drawer: moving a post to another day is an edit.
 */
export function ListCalendar({ filter, counts, position, todayKey, version, role, openId, onOpen }: Props) {
  const { view, setView, anchor, setAnchor, jumpedFor } = position;
  const days = visibleDays(view, anchor);
  const { answer, ready, loading, error, retry } = useListCalendar(filter, days[0], days[days.length - 1], version);

  const items = useMemo(() => answer?.items ?? [], [answer]);
  const byDay = useMemo(() => groupByDay(items), [items]);

  // Once for each status tab: an empty grid goes to the closest post. Moving the grid afterwards is the person's.
  useEffect(() => {
    if (!ready || !answer || jumpedFor.current === filter) return;
    jumpedFor.current = filter;
    const target = answer.items.length === 0 ? (answer.next ?? answer.prev) : null;
    if (target?.scheduledFor) setAnchor(dayOf(target));
  }, [ready, answer, filter, jumpedFor, setAnchor]);

  const goToDay = (day: string) => {
    setView("day");
    setAnchor(day);
  };
  const inRange = view === "month" ? items.filter((i) => inAnchorMonth(dayOf(i), anchor)) : items;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label={`Previous ${view}`} onClick={() => setAnchor(shiftAnchor(view, anchor, -1))}>
            <ChevronLeftIcon />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label={`Next ${view}`} onClick={() => setAnchor(shiftAnchor(view, anchor, 1))}>
            <ChevronRightIcon />
          </Button>
          <h2 className="ml-2 type-body-m-xl text-fg" aria-live="polite">
            {rangeLabel(view, anchor)}
          </h2>
        </div>
        <ToggleGroup type="single" variant="pill" value={view} onValueChange={(v) => setView(v as CalendarView)} aria-label="Calendar range" className="border-0 bg-transparent p-0">
          <ToggleGroupItem value="day">Day</ToggleGroupItem>
          <ToggleGroupItem value="week">Week</ToggleGroupItem>
          <ToggleGroupItem value="month">Month</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {error && (
        <InlineAlert tone="danger" title="We couldn't load the posts of this range">
          {error}{" "}
          <button type="button" onClick={retry} className="cursor-pointer underline underline-offset-2">
            Try again
          </button>
        </InlineAlert>
      )}

      <div className="overflow-x-auto rounded-xl border border-border" aria-busy={loading}>
        <div className={cn("transition-opacity", loading && "opacity-60")}>
          {view === "month" && <MonthGrid days={days} anchor={anchor} todayKey={todayKey} byDay={byDay} openId={openId} onOpen={onOpen} onDay={goToDay} />}
          {view === "week" && <WeekGrid days={days} todayKey={todayKey} byDay={byDay} items={items} openId={openId} onOpen={onOpen} />}
          {view === "day" && <DayGrid day={anchor} posts={byDay.get(anchor) ?? []} next={answer?.next ?? null} role={role} openId={openId} onOpen={onOpen} onGoTo={goToDay} />}
        </div>
      </div>

      {answer?.truncated && (
        <p role="status" className="type-body-r-xs text-brand-800">
          This range has more posts than the calendar can show. Pick a status or a shorter range to see them all.
        </p>
      )}
      <p className="type-body-r-xs text-muted-foreground" aria-live="polite">
        {answer && calendarFooter(view, anchor, inRange.length, filter, counts)}
      </p>
    </div>
  );
}
