import { cn } from "@/lib/cn";
import { CONTENT_STATUS, PRODUCTION_STAGES, statusLabel, type ContentStatusKey } from "@/lib/content-status";
import { LIST_STATUS, PILL_OF } from "@/lib/content-list";

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

/** The status key: with counts under the pipeline, as a plain legend under the calendar (the dot of each status of the list, with its name). */
export function StatusLegend({ variant, counts, className }: LegendProps) {
  if (variant === "calendar") {
    return (
      <ul aria-label="Status legend" className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 type-body-r-xs text-muted-foreground", className)}>
        {(Object.keys(PILL_OF) as (keyof typeof PILL_OF)[]).map((filter) => (
          <li key={filter} className="flex items-center gap-1.5">
            <StatusDot status={PILL_OF[filter]} className="size-1.5" />
            {LIST_STATUS[filter]}
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
          <span className="flex-1">{statusLabel(key)}</span>
          <span className="tabular-nums">{counts?.[key] ?? 0}</span>
        </li>
      ))}
    </ul>
  );
}
