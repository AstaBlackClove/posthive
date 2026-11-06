import { cn } from "@/lib/cn";
import { CALENDAR_LEGEND, CONTENT_STATUS, PRODUCTION_STAGES, statusLabel, type ContentStatusKey, type StatusContext } from "@/lib/content-status";

/** The coloured dot of a status. Decorative: the label always sits next to it. */
export function StatusDot({ status, className }: { status: ContentStatusKey; className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block size-2 shrink-0 rounded-full", CONTENT_STATUS[status].dot, className)} />;
}

type LegendProps = {
  /** "pipeline": one row per stage with its count. "calendar": a wrapped line of dots and names. */
  variant: "pipeline" | "calendar";
  /** Counts for the pipeline variant. */
  counts?: Partial<Record<ContentStatusKey, number>>;
  className?: string;
};

/** The status key: with counts under the pipeline, as a plain legend under the calendar. */
export function StatusLegend({ variant, counts, className }: LegendProps) {
  const context: StatusContext = variant;
  if (variant === "calendar") {
    return (
      <ul aria-label="Status legend" className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 type-body-r-xs text-muted-foreground", className)}>
        {CALENDAR_LEGEND.map((key) => (
          <li key={key} className="flex items-center gap-1.5">
            <StatusDot status={key} />
            {statusLabel(key, context)}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul aria-label="Production stages" className={cn("space-y-1.5", className)}>
      {PRODUCTION_STAGES.map((key) => (
        <li key={key} className="flex items-center gap-2 type-body-r-xs text-fg">
          <StatusDot status={key} />
          <span className="flex-1">{statusLabel(key, context)}</span>
          <span className="tabular-nums">{counts?.[key] ?? 0}</span>
        </li>
      ))}
    </ul>
  );
}
