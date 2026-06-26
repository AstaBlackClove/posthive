"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventDropArg, EventContentArg } from "@fullcalendar/core";
import type { Job } from "../app/jobs/page";

const STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b",
  running: "#3b82f6",
  done:    "#22c55e",
  failed:  "#ef4444",
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
  const icons = job.targets.map((t) => PLATFORM_ICON[t.account.platform] ?? "🌐").join(" ");

  return (
    <div className="px-1.5 py-1 w-full overflow-hidden">
      <div className="flex items-center gap-1 mb-0.5">
        <span className="text-[10px]">{icons}</span>
        <span className="text-[10px] font-semibold text-white/80 uppercase tracking-wide">
          {info.timeText}
        </span>
      </div>
      <p className="text-xs font-medium text-white leading-tight line-clamp-2">
        {content.text}
      </p>
      {job.commentText && (
        <p className="text-[10px] text-white/70 mt-0.5 truncate">↳ {job.commentText}</p>
      )}
    </div>
  );
}

export function CalendarView({ jobs, onReschedule }: Props) {
  const events = jobs.map((job) => ({
    id: job.id,
    title: JSON.parse(job.content).text,
    start: job.scheduledFor,
    backgroundColor: STATUS_COLOR[job.status] ?? "#6b7280",
    borderColor: "transparent",
    // Only pending jobs are draggable — can't reschedule what's already running/done
    editable: job.status === "pending",
    extendedProps: { job },
  }));

  async function handleEventDrop(info: EventDropArg) {
    const newDate = info.event.start;
    if (!newDate) { info.revert(); return; }

    try {
      await onReschedule(info.event.id, newDate);
    } catch {
      // If the PATCH fails, snap the event back to its original position
      info.revert();
    }
  }

  return (
    <div className="fc-wrapper">
      <style>{`
        .fc-wrapper .fc-toolbar-title { font-size: 1.1rem; font-weight: 700; color: #111827; }
        .fc-wrapper .fc-button { background: #f3f4f6 !important; border: 1px solid #e5e7eb !important; color: #374151 !important; border-radius: 8px !important; font-size: 0.8rem !important; font-weight: 500 !important; box-shadow: none !important; }
        .fc-wrapper .fc-button:hover { background: #e5e7eb !important; }
        .fc-wrapper .fc-button-active, .fc-wrapper .fc-button-primary:not(:disabled).fc-button-active { background: #1d4ed8 !important; color: #fff !important; border-color: #1d4ed8 !important; }
        .fc-wrapper .fc-daygrid-day-number { font-size: 0.8rem; color: #6b7280; padding: 4px 8px; }
        .fc-wrapper .fc-col-header-cell-cushion { font-size: 0.75rem; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
        .fc-wrapper .fc-event { border-radius: 8px !important; cursor: grab; }
        .fc-wrapper .fc-event:active { cursor: grabbing; }
        .fc-wrapper .fc-daygrid-day.fc-day-today { background: #eff6ff !important; }
        .fc-wrapper .fc-timegrid-slot { height: 40px !important; }
        .fc-wrapper .fc-scrollgrid { border-radius: 12px; overflow: hidden; border-color: #e5e7eb !important; }
        .fc-wrapper td, .fc-wrapper th { border-color: #f3f4f6 !important; }
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
          // Show tooltip with full text on hover
          const job = info.event.extendedProps.job as Job;
          const content = JSON.parse(job.content) as { text: string };
          info.el.title = content.text;
          if (job.status !== "pending") {
            info.el.style.opacity = "0.7";
            info.el.title += ` (${job.status} — cannot reschedule)`;
          }
        }}
      />
    </div>
  );
}
