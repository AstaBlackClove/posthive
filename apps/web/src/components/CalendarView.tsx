"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import luxonPlugin from "@fullcalendar/luxon3";
import type { EventDropArg, EventContentArg } from "@fullcalendar/core";
import type { CalendarApi } from "@fullcalendar/core";
import { useRef, useEffect, useCallback, useState } from "react";
import type { Job } from "../app/jobs/page";
import { PlatformIcon } from "./PlatformIcon";
import { APP_TIMEZONE, wibDateKey } from "../lib/datetime";
import { cn } from "../lib/cn";

// card = bg + border + text, bar = timegrid left border, dot = month-view status dot
const STATUS_CLASS: Record<string, { card: string; bar: string; dot: string }> = {
  draft:    { card: "bg-surface border-border text-muted",          bar: "border-l-neutral-500", dot: "bg-neutral-500" },
  pending:  { card: "bg-brand-100 border-brand-400 text-brand-800", bar: "border-l-accent",      dot: "bg-accent" },
  running:  { card: "bg-blue-50 border-blue-200 text-blue-700",     bar: "border-l-blue-500",    dot: "bg-blue-500" },
  done:     { card: "bg-green-50 border-green-200 text-green-700",  bar: "border-l-green-500",   dot: "bg-green-500" },
  failed:   { card: "bg-red-50 border-red-200 text-red-600",        bar: "border-l-red-500",     dot: "bg-red-500" },
};


interface Props {
  jobs: Job[];
  onReschedule: (jobId: string, newDate: Date) => Promise<void>;
  onEdit?: (job: Job) => void;
  /** True when the viewer cannot reschedule/edit content (e.g. Tim Desain read-only). */
  readOnly?: boolean;
}

function jobDisplayTitle(content: { text?: string; title?: string }): string {
  return content.title?.trim() || content.text?.trim() || "Untitled";
}

function EventCard({ info }: { info: EventContentArg }) {
  const job = info.event.extendedProps.job as Job;
  const content = JSON.parse(job.content) as { text?: string; title?: string };
  const displayTitle = jobDisplayTitle(content);
  const tone = STATUS_CLASS[job.status] ?? STATUS_CLASS.pending;
  const isTimegrid = info.view.type.startsWith("timeGrid");

  if (isTimegrid) {
    return (
      <div className={cn(
        "flex size-full cursor-pointer flex-col justify-center gap-0.5 overflow-hidden rounded-lg border border-l-3 px-2 py-0.5",
        tone.card, tone.bar,
      )}>
        <div className="flex items-center gap-1">
          <span className="shrink-0 whitespace-nowrap type-body-sb-xxs opacity-90">
            {info.timeText}
          </span>
          <span className="ml-auto flex shrink-0 gap-0.5">
            {job.targets.slice(0, 4).map((t, i) => (
              <span key={i} className="relative inline-flex shrink-0">
                {t.account?.avatarUrl ? (
                  <img src={t.account.avatarUrl} alt={t.account.displayName}
                    className="size-3 rounded-full object-cover" />
                ) : (
                  <span className="flex size-3 items-center justify-center rounded-full bg-neutral-100 type-body-sb-xxs text-muted">
                    {t.account?.displayName?.[0]?.toUpperCase() ?? "?"}
                  </span>
                )}
                <span className="absolute -right-px -bottom-px flex size-2 items-center justify-center leading-0">
                  <PlatformIcon platform={t.account?.platform ?? "unknown"} size={7} />
                </span>
              </span>
            ))}
          </span>
        </div>
        <p className="truncate type-body-sb-xs">
          {displayTitle}
        </p>
      </div>
    );
  }

  // Month view card
  return (
    <div className={cn(
      "w-full overflow-hidden rounded-xl border px-2 py-1",
      tone.card,
      job.status === "pending" ? "cursor-grab" : "cursor-default",
    )}>
      <div className="mb-0.5 flex items-center gap-1">
        <span className={cn("size-1.5 shrink-0 rounded-full", tone.dot)} />
        <span className="type-body-sb-xxs tracking-wide opacity-80">
          {info.timeText}
        </span>
        <span className="ml-auto flex gap-0.5">
          {job.targets.map((t, i) => (
            <span key={i} className="relative inline-flex shrink-0">
              {t.account?.avatarUrl ? (
                <img src={t.account.avatarUrl} alt={t.account.displayName}
                  className="size-3.5 rounded-full object-cover" />
              ) : (
                <span className="flex size-3.5 items-center justify-center rounded-full bg-neutral-100 type-body-sb-xxs text-muted">
                  {t.account?.displayName?.[0]?.toUpperCase() ?? "?"}
                </span>
              )}
              <span className="absolute -right-px -bottom-px flex size-2 items-center justify-center leading-0">
                <PlatformIcon platform={t.account?.platform ?? "unknown"} size={8} />
              </span>
            </span>
          ))}
        </span>
      </div>
      <p className="line-clamp-2 type-body-sb-xs">
        {displayTitle}
      </p>
      {job.commentText && (
        <p className="mt-0.5 truncate type-body-r-xxs opacity-55">
          ↳ {job.commentText}
        </p>
      )}
    </div>
  );
}

// FullCalendar layout + EventCard chrome on top of the token-based `.fc` theme in
// globals.css (colors live there; only token vars here).
const CALENDAR_CSS = `
  /* Base */
  .ph-calendar .fc-scrollgrid { border-radius: 16px; overflow: hidden; }

  /* Header row */
  .ph-calendar .fc-col-header-cell { padding: 12px 0 !important; }
  .ph-calendar .fc-col-header-cell-cushion { text-decoration: none !important; }

  /* Day cells */
  .ph-calendar .fc-daygrid-day { transition: background-color 0.15s; }
  .ph-calendar .fc-daygrid-day:hover { position: relative; }
  .ph-calendar .fc-daygrid-day:hover::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 1px solid var(--color-neutral-300);
    pointer-events: none;
    z-index: 5;
  }
  .ph-calendar .fc-daygrid-day.fc-day-other .fc-daygrid-day-number { color: var(--color-neutral-500) !important; }
  .ph-calendar .fc-daygrid-day.fc-day-other .fc-daygrid-event-harness { opacity: 0.7; }
  .ph-calendar .fc-daygrid-day-number {
    font-weight: 600; padding: 7px 10px;
    text-decoration: none !important;
  }

  /* Events — EventCard draws the status-colored card itself */
  .ph-calendar .fc-event { background: transparent !important; border: none !important; padding: 1px 3px; }
  .ph-calendar .fc-event:active { cursor: grabbing; }
  .ph-calendar .fc-daygrid-event-harness { margin: 1px 3px; }
  .ph-calendar .fc-daygrid-more-link {
    color: var(--color-brand-800) !important; font-size: 0.7rem; font-weight: 700;
    background: var(--color-brand-100); border-radius: 6px; padding: 1px 6px;
    text-decoration: none !important;
  }

  /* Toolbar title */
  .ph-calendar .fc-toolbar-title { font-weight: 700 !important; letter-spacing: -0.02em; }

  /* Toolbar buttons */
  .ph-calendar .fc-button {
    border-radius: 10px !important; font-weight: 600 !important;
    box-shadow: none !important; padding: 5px 12px !important;
    transition: all 0.15s !important; text-transform: capitalize !important;
  }
  .ph-calendar .fc-button:hover { border-color: var(--color-neutral-300) !important; }
  .ph-calendar .fc-button-group { gap: 3px; }
  .ph-calendar .fc-button-group .fc-button { border-radius: 8px !important; }

  /* Prev/next icons */
  .ph-calendar .fc-icon { font-size: 0.9rem !important; }
  .ph-calendar .fc-toolbar { margin-bottom: 16px !important; align-items: center; }

  /* Timegrid */
  .ph-calendar .fc-timegrid-slot { height: 48px !important; }
  .ph-calendar .fc-timegrid-slot-label { color: var(--color-neutral-500) !important; font-size: 0.68rem !important; vertical-align: top; padding-top: 4px !important; }
  .ph-calendar .fc-timegrid-col.fc-day-today { background: color-mix(in oklab, var(--c-accent) 12%, transparent) !important; }
  .ph-calendar .fc-timegrid-now-indicator-line { border-color: var(--c-accent) !important; border-width: 2px !important; }
  .ph-calendar .fc-timegrid-now-indicator-arrow { border-top-color: var(--c-accent) !important; border-bottom-color: var(--c-accent) !important; }

  /* Timegrid events */
  .ph-calendar .fc-timegrid-event { border-radius: 8px !important; border: none !important; background: transparent !important; box-shadow: none !important; }
  .ph-calendar .fc-timegrid-event .fc-event-main { padding: 0 !important; height: 100%; }
  .ph-calendar .fc-timegrid-event-harness { margin: 1px 2px !important; }

  /* Week view column headers — today highlighted */
  .ph-calendar .fc-timegrid-axis-cushion { font-size: 0.62rem !important; color: var(--color-neutral-500) !important; }
  .ph-calendar .fc-col-header-cell.fc-day-today .fc-col-header-cell-cushion { color: var(--color-brand-800) !important; }
  .ph-calendar .fc-col-header-cell.fc-day-today { border-bottom: 2px solid var(--c-accent) !important; }

  /* Past days — no dimming, same as future days */
  .ph-calendar .fc-day-past .fc-daygrid-event-harness { opacity: 1 !important; }

  /* Drag mirror & placeholder */
  .ph-calendar .fc-event-mirror { opacity: 0.75 !important; }
  .ph-calendar .fc-daygrid-event-harness.fc-event-dragging { opacity: 0.3 !important; }
  .ph-calendar .fc-highlight {
    background: color-mix(in oklab, var(--c-accent) 12%, transparent) !important;
    border: 1px dashed var(--c-accent) !important;
    border-radius: 8px !important;
  }

  /* Today — full border via pseudo-element to avoid scrollgrid clipping */
  .ph-calendar .fc-daygrid-day.fc-day-today { position: relative; }
  .ph-calendar .fc-daygrid-day.fc-day-today::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 2px solid var(--c-accent);
    pointer-events: none;
    z-index: 5;
  }

  /* Day popover — scrollable */
  .ph-calendar .fc-popover {
    border-radius: 12px !important;
    overflow: hidden !important;
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important;
  }
  .ph-calendar .fc-popover-header {
    padding: 8px 12px !important;
    font-size: 12px !important;
    font-weight: 600 !important;
  }
  .ph-calendar .fc-popover-close { color: var(--c-muted) !important; }
  .ph-calendar .fc-popover-body {
    max-height: 320px !important;
    overflow-y: auto !important;
    padding: 6px !important;
  }

  /* ── Mobile ── */
  @media (max-width: 640px) {
    /* Toolbar: stack into clean rows instead of squeezing everything in */
    .ph-calendar .fc-toolbar {
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 10px !important;
    }
    .ph-calendar .fc-toolbar-chunk {
      display: flex !important;
      justify-content: center !important;
    }
    .ph-calendar .fc-toolbar-title { font-size: 0.95rem !important; }
    .ph-calendar .fc-button { font-size: 0.68rem !important; padding: 5px 9px !important; }

    /* Let just the day grid scroll horizontally instead of squashing columns unreadably —
       the toolbar (prev/next/title/view buttons) stays full-width and fully visible */
    .ph-calendar .fc-view-harness { overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
    .ph-calendar .fc-scrollgrid { min-width: 560px; }

    .ph-calendar .fc-col-header-cell-cushion { font-size: 0.62rem; letter-spacing: 0.02em; }
    .ph-calendar .fc-daygrid-day-number { font-size: 0.7rem; padding: 5px 6px; }

    /* Compact event cards */
    .ph-calendar .fc-daygrid-event-harness { margin: 1px 2px; }
  }
`;

export function CalendarView({ jobs, onReschedule, onEdit, readOnly = false }: Props) {
  const calendarRef = useRef<FullCalendar>(null);
  const dragNavTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging = useRef(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const events = jobs.filter((job) => job.scheduledFor).map((job) => {
    const content = JSON.parse(job.content) as { text?: string; title?: string };
    return {
      id: job.id,
      title: jobDisplayTitle(content),
      start: job.scheduledFor!,
      backgroundColor: "transparent",
      borderColor: "transparent",
      editable: readOnly ? false : job.status === "pending",
      extendedProps: { job },
    };
  });

  async function handleEventDrop(info: EventDropArg) {
    if (!info.event.start) { info.revert(); return; }
    // Block dropping on past dates (WIB calendar day)
    if (wibDateKey(info.event.start) < wibDateKey(new Date())) { info.revert(); return; }
    try { await onReschedule(info.event.id, info.event.start); }
    catch { info.revert(); }
  }

  // Drag-over-arrow month navigation using mouseover (FC uses pointer events, not HTML5 drag)
  const setupDragNav = useCallback(() => {
    const container = (calendarRef.current?.getApi() as unknown as { el?: HTMLElement } | undefined)?.el;
    if (!container) return;

    const prevBtn = container.querySelector(".fc-prev-button") as HTMLElement | null;
    const nextBtn = container.querySelector(".fc-next-button") as HTMLElement | null;

    const clearTimer = () => {
      if (dragNavTimer.current) { clearTimeout(dragNavTimer.current); dragNavTimer.current = null; }
    };

    const onEnter = (direction: "prev" | "next") => () => {
      if (!isDragging.current) return;
      clearTimer();
      dragNavTimer.current = setTimeout(() => {
        const api = calendarRef.current?.getApi() as CalendarApi | undefined;
        if (direction === "prev") api?.prev(); else api?.next();
      }, 700);
    };

    prevBtn?.addEventListener("mouseover", onEnter("prev"));
    prevBtn?.addEventListener("mouseleave", clearTimer);
    nextBtn?.addEventListener("mouseover", onEnter("next"));
    nextBtn?.addEventListener("mouseleave", clearTimer);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setupDragNav(), 300);
    return () => clearTimeout(t);
  }, [setupDragNav]);

  return (
    <div className="ph-calendar">
      <style>{CALENDAR_CSS}</style>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, luxonPlugin]}
        timeZone={APP_TIMEZONE}
        eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        buttonText={{ month: "Month", week: "Week", day: "Day", today: "Today" }}
        events={events}
        editable={!readOnly && !isTouchDevice}
        eventDragStart={() => { isDragging.current = true; }}
        eventDragStop={() => {
          isDragging.current = false;
          if (dragNavTimer.current) { clearTimeout(dragNavTimer.current); dragNavTimer.current = null; }
        }}
        eventDrop={handleEventDrop}
        eventClick={(info) => {
          if (readOnly) return;
          const job = info.event.extendedProps.job as Job;
          if ((job.status === "pending" || job.status === "draft") && onEdit) onEdit(job);
        }}
        eventContent={(info) => <EventCard info={info} />}
        height="auto"
        dayMaxEvents={3}
        scrollTime="08:00:00"
        slotMinTime="00:00:00"
        slotMaxTime="24:00:00"
        allDaySlot={false}
        nowIndicator={true}
        longPressDelay={isTouchDevice ? 9999 : 1000}
        eventDidMount={(info) => {
          const job = info.event.extendedProps.job as Job;
          const content = JSON.parse(job.content) as { text?: string; title?: string };
          info.el.title = jobDisplayTitle(content) + (job.status !== "pending" ? ` (${job.status})` : "");
          if (job.status !== "pending") info.el.style.opacity = "0.8";
        }}
      />
      {isTouchDevice && !readOnly && (
        <p className="mt-3 text-center type-body-r-xs text-neutral-500">
          Tap any post to edit or reschedule
        </p>
      )}
    </div>
  );
}
