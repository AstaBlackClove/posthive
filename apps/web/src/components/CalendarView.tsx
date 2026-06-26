"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventDropArg, EventContentArg } from "@fullcalendar/core";
import type { Job } from "../app/jobs/page";

// Light background + dark text per status — readable at any size
const STATUS_STYLE: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  pending:  { bg: "#fefce8", border: "#fde68a", text: "#92400e", dot: "#f59e0b" },
  running:  { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af", dot: "#3b82f6" },
  done:     { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534", dot: "#22c55e" },
  failed:   { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", dot: "#ef4444" },
};

const PLATFORM_ICON: Record<string, string> = {
  bluesky: "🦋", threads: "🧵", linkedin: "💼",
};

interface Props {
  jobs: Job[];
  onReschedule: (jobId: string, newDate: Date) => Promise<void>;
}

function EventCard({ info }: { info: EventContentArg }) {
  const job = info.event.extendedProps.job as Job;
  const content = JSON.parse(job.content) as { text: string };
  const style = STATUS_STYLE[job.status] ?? STATUS_STYLE.pending;
  const icons = job.targets.map((t) => PLATFORM_ICON[t.account.platform] ?? "🌐").join("");

  return (
    <div
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: 8,
        padding: "4px 7px",
        width: "100%",
        overflow: "hidden",
        cursor: job.status === "pending" ? "grab" : "default",
      }}
    >
      {/* Top row: dot + time + platform icons */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: style.dot, flexShrink: 0,
        }} />
        <span style={{ fontSize: 10, color: style.text, fontWeight: 600, opacity: 0.7 }}>
          {info.timeText}
        </span>
        <span style={{ fontSize: 10, marginLeft: "auto" }}>{icons}</span>
      </div>

      {/* Post text */}
      <p style={{
        fontSize: 11,
        fontWeight: 600,
        color: style.text,
        lineHeight: 1.3,
        overflow: "hidden",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        margin: 0,
      }}>
        {content.text}
      </p>

      {/* Comment indicator */}
      {job.commentText && (
        <p style={{
          fontSize: 10, color: style.text, opacity: 0.6,
          marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          ↳ {job.commentText}
        </p>
      )}
    </div>
  );
}

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
    const newDate = info.event.start;
    if (!newDate) { info.revert(); return; }
    try {
      await onReschedule(info.event.id, newDate);
    } catch {
      info.revert();
    }
  }

  return (
    <div className="fc-wrapper">
      <style>{`
        .fc-wrapper .fc-toolbar-title { font-size: 1.1rem; font-weight: 700; color: #111827; }
        .fc-wrapper .fc-button {
          background: #f3f4f6 !important; border: 1px solid #e5e7eb !important;
          color: #374151 !important; border-radius: 8px !important;
          font-size: 0.8rem !important; font-weight: 500 !important; box-shadow: none !important;
        }
        .fc-wrapper .fc-button:hover { background: #e5e7eb !important; }
        .fc-wrapper .fc-button-primary:not(:disabled).fc-button-active {
          background: #1d4ed8 !important; color: #fff !important; border-color: #1d4ed8 !important;
        }
        .fc-wrapper .fc-daygrid-day-number { font-size: 0.8rem; color: #6b7280; padding: 4px 8px; }
        .fc-wrapper .fc-col-header-cell-cushion {
          font-size: 0.75rem; font-weight: 600; color: #9ca3af;
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .fc-wrapper .fc-daygrid-day.fc-day-today { background: #eff6ff !important; }
        .fc-wrapper .fc-event { background: transparent !important; border: none !important; padding: 1px 2px; }
        .fc-wrapper .fc-event:active { cursor: grabbing; }
        .fc-wrapper .fc-scrollgrid { border-color: #e5e7eb !important; }
        .fc-wrapper td, .fc-wrapper th { border-color: #f3f4f6 !important; }
        .fc-wrapper .fc-timegrid-slot { height: 40px !important; }
        .fc-wrapper .fc-daygrid-event-harness { margin: 1px 2px; }
      `}</style>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        events={events}
        editable={true}
        eventDrop={handleEventDrop}
        eventContent={(info) => <EventCard info={info} />}
        height="auto"
        eventDidMount={(info) => {
          const job = info.event.extendedProps.job as Job;
          const content = JSON.parse(job.content) as { text: string };
          info.el.title = content.text + (job.status !== "pending" ? ` (${job.status} — cannot reschedule)` : "");
          if (job.status !== "pending") info.el.style.opacity = "0.75";
        }}
      />
    </div>
  );
}
