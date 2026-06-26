"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventDropArg, EventContentArg } from "@fullcalendar/core";
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
}

function EventCard({ info }: { info: EventContentArg }) {
  const job = info.event.extendedProps.job as Job;
  const content = JSON.parse(job.content) as { text: string };
  const style = STATUS_STYLE[job.status] ?? STATUS_STYLE.pending;
  const platforms = job.targets.map((t) => t.account.platform);

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
        <span style={{ display: "flex", gap: 2, marginLeft: "auto" }}>
          {platforms.map((p, i) => <PlatformIcon key={i} platform={p} size={10} />)}
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
  .fc-dark .fc-scrollgrid { border-color: #1f1f1f !important; border-radius: 16px; overflow: hidden; }
  .fc-dark td, .fc-dark th { border-color: #1f1f1f !important; }

  /* Header row */
  .fc-dark .fc-col-header { background: #0a0a0a; }
  .fc-dark .fc-col-header-cell { background: transparent !important; padding: 10px 0 !important; }
  .fc-dark .fc-col-header-cell-cushion {
    font-size: 0.68rem; font-weight: 700; color: #444;
    text-transform: uppercase; letter-spacing: 0.08em;
    text-decoration: none !important;
  }

  /* Day cells */
  .fc-dark .fc-daygrid-day { background: #0a0a0a !important; transition: background 0.15s; }
  .fc-dark .fc-daygrid-day:hover { background: #111111 !important; }
  .fc-dark .fc-daygrid-day.fc-day-today { background: #0d0d1a !important; }
  .fc-dark .fc-daygrid-day.fc-day-other { background: #080808 !important; }
  .fc-dark .fc-daygrid-day.fc-day-other .fc-daygrid-day-number { color: #2a2a2a !important; }
  .fc-dark .fc-daygrid-day-number {
    font-size: 0.72rem; font-weight: 600; color: #555; padding: 6px 9px;
    text-decoration: none !important;
  }
  .fc-dark .fc-day-today .fc-daygrid-day-number {
    color: #5b63d3 !important; font-weight: 800;
  }

  /* Events */
  .fc-dark .fc-event { background: transparent !important; border: none !important; padding: 1px 3px; }
  .fc-dark .fc-event:active { cursor: grabbing; }
  .fc-dark .fc-daygrid-event-harness { margin: 1px 3px; }
  .fc-dark .fc-daygrid-more-link {
    color: #5b63d3 !important; font-size: 0.7rem; font-weight: 700;
    background: #1a1a2e; border-radius: 6px; padding: 1px 6px;
  }

  /* Toolbar title */
  .fc-dark .fc-toolbar-title {
    font-size: 1rem !important; font-weight: 700 !important; color: #ededed !important;
    letter-spacing: -0.02em;
  }

  /* Toolbar buttons */
  .fc-dark .fc-button {
    background: #111111 !important; border: 1px solid #2a2a2a !important;
    color: #999 !important; border-radius: 10px !important;
    font-size: 0.72rem !important; font-weight: 600 !important;
    box-shadow: none !important; padding: 5px 12px !important;
    transition: all 0.15s !important; text-transform: capitalize !important;
  }
  .fc-dark .fc-button:hover { background: #1a1a1a !important; color: #ededed !important; border-color: #3a3a3a !important; }
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
  .fc-dark .fc-timegrid-slot { background: #0a0a0a !important; border-color: #1a1a1a !important; height: 44px !important; }
  .fc-dark .fc-timegrid-slot-label { color: #444 !important; font-size: 0.68rem !important; }
  .fc-dark .fc-timegrid-axis { background: #0a0a0a !important; }
  .fc-dark .fc-timegrid-now-indicator-line { border-color: #5b63d3 !important; }
  .fc-dark .fc-timegrid-now-indicator-arrow { border-color: #5b63d3 !important; }

  /* Scrollgrid */
  .fc-dark .fc-scrollgrid-section-header th { border-color: #1f1f1f !important; }
`;

export function CalendarView({ jobs, onReschedule }: Props) {
  const events = jobs.map((job) => ({
    id: job.id,
    title: JSON.parse(job.content).text,
    start: job.scheduledFor,
    backgroundColor: "transparent",
    borderColor: "transparent",
    editable: job.status === "pending",
    extendedProps: { job },
  }));

  async function handleEventDrop(info: EventDropArg) {
    if (!info.event.start) { info.revert(); return; }
    try { await onReschedule(info.event.id, info.event.start); }
    catch { info.revert(); }
  }

  return (
    <div className="fc-dark">
      <style>{DARK_CSS}</style>
      <FullCalendar
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
        eventDrop={handleEventDrop}
        eventContent={(info) => <EventCard info={info} />}
        height="auto"
        dayMaxEvents={3}
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
