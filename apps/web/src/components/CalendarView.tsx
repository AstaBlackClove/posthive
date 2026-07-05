"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventDropArg, EventContentArg } from "@fullcalendar/core";
import type { CalendarApi } from "@fullcalendar/core";
import { useRef, useEffect, useCallback } from "react";
import type { Job } from "../app/jobs/page";
import { PlatformIcon } from "./PlatformIcon";

const STATUS_STYLE: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  pending:  { bg: "#1c1a10", border: "#78560a", text: "#fbbf24", dot: "#f59e0b" },
  running:  { bg: "#0d1526", border: "#1e3a6e", text: "#60a5fa", dot: "#3b82f6" },
  done:     { bg: "#0a1f12", border: "#14532d", text: "#4ade80", dot: "#22c55e" },
  failed:   { bg: "#1f0a0a", border: "#7f1d1d", text: "#f87171", dot: "#ef4444" },
};


interface Props {
  jobs: Job[];
  onReschedule: (jobId: string, newDate: Date) => Promise<void>;
  onEdit?: (job: Job) => void;
}

function EventCard({ info }: { info: EventContentArg }) {
  const job = info.event.extendedProps.job as Job;
  const content = JSON.parse(job.content) as { text: string };
  const style = STATUS_STYLE[job.status] ?? STATUS_STYLE.pending;
  const isTimegrid = info.view.type.startsWith("timeGrid");

  if (isTimegrid) {
    return (
      <div style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderLeft: `3px solid ${style.dot}`,
        borderRadius: 8,
        padding: "3px 7px",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        cursor: job.status === "pending" ? "grab" : "default",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 2,
        boxSizing: "border-box",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 10, color: style.text, fontWeight: 700, opacity: 0.9, whiteSpace: "nowrap", flexShrink: 0 }}>
            {info.timeText}
          </span>
          <span style={{ display: "flex", gap: 2, marginLeft: "auto", flexShrink: 0 }}>
            {job.targets.slice(0, 4).map((t, i) => (
              <span key={i} style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
                {t.account?.avatarUrl ? (
                  <img src={t.account.avatarUrl} alt={t.account.displayName}
                    style={{ width: 13, height: 13, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <span style={{ width: 13, height: 13, borderRadius: "50%", backgroundColor: "#333",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 7, fontWeight: 700, color: "#888" }}>
                    {t.account?.displayName?.[0]?.toUpperCase() ?? "?"}
                  </span>
                )}
                <span style={{ position: "absolute", bottom: -1, right: -1,
                  width: 8, height: 8, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 0 }}>
                  <PlatformIcon platform={t.account?.platform ?? "unknown"} size={7} />
                </span>
              </span>
            ))}
          </span>
        </div>
        <p style={{
          fontSize: 11, fontWeight: 600, color: style.text, lineHeight: 1.3,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0,
        }}>
          {content.text}
        </p>
      </div>
    );
  }

  // Month view card
  return (
    <div style={{
      background: style.bg,
      border: `1px solid ${style.border}`,
      borderRadius: 10,
      padding: "4px 8px",
      width: "100%",
      overflow: "hidden",
      cursor: job.status === "pending" ? "grab" : "default",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: style.dot, flexShrink: 0 }} />
        <span style={{ fontSize: 9, color: style.text, fontWeight: 700, opacity: 0.8, letterSpacing: "0.03em" }}>
          {info.timeText}
        </span>
        <span style={{ display: "flex", gap: 3, marginLeft: "auto" }}>
          {job.targets.map((t, i) => (
            <span key={i} style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
              {t.account?.avatarUrl ? (
                <img src={t.account.avatarUrl} alt={t.account.displayName}
                  style={{ width: 14, height: 14, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <span style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "#333",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 7, fontWeight: 700, color: "#888" }}>
                  {t.account?.displayName?.[0]?.toUpperCase() ?? "?"}
                </span>
              )}
              <span style={{ position: "absolute", bottom: -1, right: -1,
                width: 9, height: 9, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 0 }}>
                <PlatformIcon platform={t.account?.platform ?? "unknown"} size={8} />
              </span>
            </span>
          ))}
        </span>
      </div>
      <p style={{
        fontSize: 11, fontWeight: 600, color: style.text, lineHeight: 1.35,
        overflow: "hidden", display: "-webkit-box",
        WebkitLineClamp: 2, WebkitBoxOrient: "vertical", margin: 0,
      }}>
        {content.text}
      </p>
      {job.commentText && (
        <p style={{
          fontSize: 10, color: style.text, opacity: 0.55, marginTop: 2,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          ↳ {job.commentText}
        </p>
      )}
    </div>
  );
}

const DARK_CSS = `
  /* Base */
  .fc-dark { color: #ededed; }
  .fc-dark .fc-scrollgrid { border-color: #2a2a2a !important; border-radius: 16px; overflow: hidden; }
  .fc-dark td, .fc-dark th { border-color: #2a2a2a !important; }

  /* Header row */
  .fc-dark .fc-col-header { background: #161616; }
  .fc-dark .fc-col-header-cell { background: transparent !important; padding: 12px 0 !important; }
  .fc-dark .fc-col-header-cell-cushion {
    font-size: 0.7rem; font-weight: 700; color: #777;
    text-transform: uppercase; letter-spacing: 0.1em;
    text-decoration: none !important;
  }

  /* Day cells */
  .fc-dark .fc-daygrid-day { background: #111111 !important; transition: background 0.15s; }
  .fc-dark .fc-daygrid-day:hover { background: #181818 !important; position: relative; }
  .fc-dark .fc-daygrid-day:hover::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 1px solid #3a3a3a;
    pointer-events: none;
    z-index: 5;
  }
  .fc-dark .fc-daygrid-day.fc-day-today { background: #13132a !important; box-shadow: inset 0 0 0 1.5px #5b63d3; }
  .fc-dark .fc-daygrid-day.fc-day-other { background: #0d0d0d !important; }
  .fc-dark .fc-daygrid-day.fc-day-other .fc-daygrid-day-number { color: #555 !important; }
  .fc-dark .fc-daygrid-day.fc-day-other .fc-daygrid-event-harness { opacity: 0.7; }
  .fc-dark .fc-daygrid-day-number {
    font-size: 0.78rem; font-weight: 600; color: #aaa; padding: 7px 10px;
    text-decoration: none !important;
  }
  .fc-dark .fc-day-today .fc-daygrid-day-number {
    color: #818cf8 !important; font-weight: 800;
  }

  /* Events */
  .fc-dark .fc-event { background: transparent !important; border: none !important; padding: 1px 3px; }
  .fc-dark .fc-event:active { cursor: grabbing; }
  .fc-dark .fc-daygrid-event-harness { margin: 1px 3px; }
  .fc-dark .fc-daygrid-more-link {
    color: #818cf8 !important; font-size: 0.7rem; font-weight: 700;
    background: #1e1e3a; border-radius: 6px; padding: 1px 6px;
    text-decoration: none !important;
  }

  /* Toolbar title */
  .fc-dark .fc-toolbar-title {
    font-size: 1.05rem !important; font-weight: 700 !important; color: #ededed !important;
    letter-spacing: -0.02em;
  }

  /* Toolbar buttons */
  .fc-dark .fc-button {
    background: #1a1a1a !important; border: 1px solid #333 !important;
    color: #bbb !important; border-radius: 10px !important;
    font-size: 0.72rem !important; font-weight: 600 !important;
    box-shadow: none !important; padding: 5px 12px !important;
    transition: all 0.15s !important; text-transform: capitalize !important;
  }
  .fc-dark .fc-button:hover { background: #222 !important; color: #fff !important; border-color: #444 !important; }
  .fc-dark .fc-button-primary:not(:disabled).fc-button-active,
  .fc-dark .fc-button-primary:not(:disabled):active {
    background: #5b63d3 !important; border-color: #5b63d3 !important; color: #fff !important;
  }
  .fc-dark .fc-button-group { gap: 3px; }
  .fc-dark .fc-button-group .fc-button { border-radius: 8px !important; }

  /* Prev/next icons */
  .fc-dark .fc-icon { font-size: 0.9rem !important; }
  .fc-dark .fc-toolbar { margin-bottom: 16px !important; align-items: center; }

  /* Timegrid */
  .fc-dark .fc-timegrid-slot { background: #111 !important; border-color: #1e1e1e !important; height: 48px !important; }
  .fc-dark .fc-timegrid-slot-minor { border-color: #181818 !important; }
  .fc-dark .fc-timegrid-slot-label { color: #555 !important; font-size: 0.68rem !important; vertical-align: top; padding-top: 4px !important; }
  .fc-dark .fc-timegrid-axis { background: #111 !important; border-color: #1e1e1e !important; }
  .fc-dark .fc-timegrid-col { background: #111 !important; }
  .fc-dark .fc-timegrid-col.fc-day-today { background: #13132a !important; }
  .fc-dark .fc-timegrid-now-indicator-line { border-color: #5b63d3 !important; border-width: 2px !important; }
  .fc-dark .fc-timegrid-now-indicator-arrow { border-top-color: #5b63d3 !important; border-bottom-color: #5b63d3 !important; }

  /* Timegrid events */
  .fc-dark .fc-timegrid-event { border-radius: 8px !important; border: none !important; background: transparent !important; box-shadow: none !important; }
  .fc-dark .fc-timegrid-event .fc-event-main { padding: 0 !important; height: 100%; }
  .fc-dark .fc-timegrid-event-harness { margin: 1px 2px !important; }

  /* Week view column headers — show day number prominently */
  .fc-dark .fc-timegrid-axis-cushion { font-size: 0.62rem !important; color: #444 !important; }
  .fc-dark .fc-col-header-cell.fc-day-today .fc-col-header-cell-cushion { color: #818cf8 !important; }
  .fc-dark .fc-col-header-cell.fc-day-today { border-bottom: 2px solid #5b63d3 !important; }

  /* Scrollgrid */
  .fc-dark .fc-scrollgrid-section-header th { border-color: #2a2a2a !important; }

  /* Past days — subtle gray out, events still visible */
  .fc-dark .fc-day-past { background: #0d0d0d !important; }
  .fc-dark .fc-day-past .fc-daygrid-day-number { color: #3a3a3a !important; }
  .fc-dark .fc-day-past .fc-daygrid-event-harness { opacity: 0.45; }

  /* Drag mirror & placeholder */
  .fc-dark .fc-event-mirror { opacity: 0.75 !important; }
  .fc-dark .fc-daygrid-event-harness.fc-event-dragging { opacity: 0.3 !important; }
  .fc-dark .fc-highlight {
    background: rgba(91, 99, 211, 0.12) !important;
    border: 1px dashed #5b63d3 !important;
    border-radius: 8px !important;
  }

  /* Today — full border via pseudo-element to avoid scrollgrid clipping */
  .fc-dark .fc-daygrid-day.fc-day-today {
    background: #13132a !important;
    position: relative;
  }
  .fc-dark .fc-daygrid-day.fc-day-today::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 2px solid #5b63d3;
    pointer-events: none;
    z-index: 5;
  }

  /* Day popover — scrollable */
  .fc-dark .fc-popover {
    background: #111111 !important;
    border: 1px solid #2a2a2a !important;
    border-radius: 12px !important;
    overflow: hidden !important;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
  }
  .fc-dark .fc-popover-header {
    background: #161616 !important;
    border-bottom: 1px solid #2a2a2a !important;
    padding: 8px 12px !important;
    color: #ededed !important;
    font-size: 12px !important;
    font-weight: 600 !important;
  }
  .fc-dark .fc-popover-close {
    color: #888 !important;
  }
  .fc-dark .fc-popover-body {
    max-height: 320px !important;
    overflow-y: auto !important;
    padding: 6px !important;
  }

  /* ── Mobile ── */
  @media (max-width: 640px) {
    /* Toolbar: stack into clean rows instead of squeezing everything in */
    .fc-dark .fc-toolbar {
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 10px !important;
    }
    .fc-dark .fc-toolbar-chunk {
      display: flex !important;
      justify-content: center !important;
    }
    .fc-dark .fc-toolbar-title { font-size: 0.95rem !important; }
    .fc-dark .fc-button { font-size: 0.68rem !important; padding: 5px 9px !important; }

    /* Let just the day grid scroll horizontally instead of squashing columns unreadably —
       the toolbar (prev/next/title/view buttons) stays full-width and fully visible */
    .fc-dark .fc-view-harness { overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
    .fc-dark .fc-scrollgrid { min-width: 560px; }

    .fc-dark .fc-col-header-cell-cushion { font-size: 0.62rem; letter-spacing: 0.02em; }
    .fc-dark .fc-daygrid-day-number { font-size: 0.7rem; padding: 5px 6px; }

    /* Compact event cards */
    .fc-dark .fc-daygrid-event-harness { margin: 1px 2px; }
  }
`;

const today = new Date();
today.setHours(0, 0, 0, 0);

export function CalendarView({ jobs, onReschedule, onEdit }: Props) {
  const calendarRef = useRef<FullCalendar>(null);
  const dragNavTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging = useRef(false);

  const events = jobs.filter((job) => job.status !== "draft" && job.scheduledFor).map((job) => ({
    id: job.id,
    title: JSON.parse(job.content).text,
    start: job.scheduledFor!,
    backgroundColor: "transparent",
    borderColor: "transparent",
    editable: job.status === "pending",
    extendedProps: { job },
  }));

  async function handleEventDrop(info: EventDropArg) {
    if (!info.event.start) { info.revert(); return; }
    // Block dropping on past dates
    const dropDate = new Date(info.event.start);
    dropDate.setHours(0, 0, 0, 0);
    if (dropDate < today) { info.revert(); return; }
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
    <div className="fc-dark">
      <style>{DARK_CSS}</style>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        buttonText={{ month: "Month", week: "Week", day: "Day", today: "Today" }}
        events={events}
        editable={true}
        eventDragStart={() => { isDragging.current = true; }}
        eventDragStop={() => {
          isDragging.current = false;
          if (dragNavTimer.current) { clearTimeout(dragNavTimer.current); dragNavTimer.current = null; }
        }}
        eventDrop={handleEventDrop}
        eventClick={(info) => {
          const job = info.event.extendedProps.job as Job;
          if (job.status === "pending" && onEdit) onEdit(job);
        }}
        eventContent={(info) => <EventCard info={info} />}
        height="auto"
        dayMaxEvents={3}
        scrollTime="08:00:00"
        slotMinTime="00:00:00"
        slotMaxTime="24:00:00"
        allDaySlot={false}
        nowIndicator={true}
        eventDidMount={(info) => {
          const job = info.event.extendedProps.job as Job;
          const content = JSON.parse(job.content) as { text: string };
          info.el.title = content.text + (job.status !== "pending" ? ` (${job.status})` : "");
          if (job.status !== "pending") info.el.style.opacity = "0.8";
        }}
      />
    </div>
  );
}
