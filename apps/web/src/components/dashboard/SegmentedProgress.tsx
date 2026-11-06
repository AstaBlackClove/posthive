import { cn } from "@/lib/cn";

export interface Segment {
  /** Used for the key and the accessible text. */
  label: string;
  value: number;
  /** Background class of the filled segment, e.g. "bg-status-design". */
  className: string;
}

type Props = {
  segments: Segment[];
  /** Accessible name of the whole bar. */
  label: string;
  className?: string;
};

// With nothing to show the bar is still drawn as one slot per segment, like the empty bar in the design.
/**
 * A bar made of one block per stage, each as wide as its share of the total (shadcn Progress has
 * one fill only). With no data, the blocks are grey placeholders of equal width.
 */
export function SegmentedProgress({ segments, label, className }: Props) {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const empty = total === 0;
  const text = empty ? "no items yet" : segments.filter((s) => s.value > 0).map((s) => `${s.value} ${s.label}`).join(", ");

  return (
    <div role="img" aria-label={`${label}: ${text}`} className={cn("flex h-2 w-full gap-0.5 overflow-hidden rounded-full", className)}>
      {segments.map((s) => {
        const grow = empty ? 1 : Math.max(0, s.value);
        if (grow === 0) return null;
        return (
          <span
            key={s.label}
            data-slot="segment"
            data-empty={empty || undefined}
            // The share of the bar is a runtime number: a CSS variable, read by a class
            style={{ "--grow": grow } as React.CSSProperties}
            className={cn("h-full grow-(--grow) basis-0 rounded-full", empty ? "bg-neutral-100" : s.className)}
          />
        );
      })}
    </div>
  );
}
