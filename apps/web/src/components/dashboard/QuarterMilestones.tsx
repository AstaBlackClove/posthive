"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckIcon, LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/cn";
import { SectionPanel } from "./SectionPanel";
import type { Milestone, MilestoneData } from "./types";

type Props = {
  /** "Q4 2026". */
  quarter: string;
  milestones: MilestoneData;
  /** Whether the person's role opens the import page: the empty state only points there when it does. */
  canImport: boolean;
};

/** Categories shown before "Show all": the panel is a glance, and the rows are the largest targets first. */
const SHOWN = 5;

/** The share of `of` that `n` is, 0–100, to one decimal: the width of a bar part. */
const share = (n: number, of: number) => (of > 0 ? Math.min(100, Math.round((n / of) * 1000) / 10) : 0);

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * One category's bar: posted (solid) then scheduled (light) on a track as wide as the target. The widths are
 * CSS variables read by a class, not inline widths. A met target turns the bar green.
 */
function MilestoneRow({ milestone }: { milestone: Milestone }) {
  const { category, planned, posted, scheduled } = milestone;
  const met = posted >= planned;
  const toGo = planned - posted;
  return (
    <li className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate type-body-sb-s text-fg">{category}</span>
        <span className="shrink-0 type-body-r-xs text-muted-foreground tabular-nums">
          <span className="type-body-sb-s text-fg">{posted}</span> / {planned}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={category}
        aria-valuemin={0}
        aria-valuemax={planned}
        aria-valuenow={posted}
        aria-valuetext={`${posted} of ${planned} posted, ${scheduled} scheduled`}
        className="flex h-1.5 w-full overflow-hidden rounded-full bg-neutral-100"
      >
        <span
          style={{ "--posted": `${share(posted, planned)}%` } as React.CSSProperties}
          className={cn("h-full w-(--posted) transition-[width]", met ? "bg-green-600" : "bg-primary")}
        />
        <span style={{ "--scheduled": `${share(scheduled, planned)}%` } as React.CSSProperties} className="h-full w-(--scheduled) bg-brand-200 transition-[width]" />
      </div>
      {met ? (
        <p className="flex items-center gap-1 type-body-sb-xs text-green-700">
          <CheckIcon aria-hidden="true" className="size-3.5" />
          Target reached
        </p>
      ) : (
        <p className="type-body-r-xs text-muted-foreground">{[`${toGo} to go`, scheduled > 0 ? `${scheduled} scheduled` : ""].filter(Boolean).join(" · ")}</p>
      )}
    </li>
  );
}

/** What the plan says the quarter must hold per content category, and how much of it is out. */
export function QuarterMilestones({ quarter, milestones, canImport }: Props) {
  const { rows, uncategorized } = milestones;
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, SHOWN);
  const note =
    uncategorized > 0
      ? `${plural(uncategorized, "post", "posts")} this quarter ${uncategorized === 1 ? "has" : "have"} no content category, so ${uncategorized === 1 ? "it is" : "they are"} not in these bars.`
      : null;

  return (
    <SectionPanel
      title="Quarter milestones"
      description={rows.length > 0 ? `${quarter} · posted of planned, per category` : undefined}
      action={
        rows.length > SHOWN && (
          <Button variant="secondary" size="sm" className="rounded-full" aria-expanded={all} onClick={() => setAll((open) => !open)}>
            {all ? "Show less" : `Show all (${rows.length})`}
          </Button>
        )
      }
      contentClassName="space-y-4"
    >
      {rows.length === 0 ? (
        <EmptyState
          size="inline"
          icon={<LinkIcon />}
          title="No milestones yet"
          description={
            uncategorized > 0
              ? "Give the posts of this quarter a content category and each category becomes a milestone."
              : canImport
                ? "Import your quarter plan. Each content category becomes a milestone, and its bar fills as posts go out."
                : "Each content category of the quarter plan becomes a milestone here, and its bar fills as posts go out."
          }
          action={
            canImport && uncategorized === 0 ? (
              <Button asChild variant="outline-brand">
                <Link href="/jobs/import">Import quarter plan</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <ul role="list" className="space-y-4">
            {shown.map((m) => (
              <MilestoneRow key={m.category} milestone={m} />
            ))}
          </ul>
          <ul role="list" aria-label="Bar colours" className="flex flex-wrap gap-x-4 gap-y-1 type-body-r-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
              Posted
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2 rounded-full bg-brand-200" />
              Scheduled
            </li>
          </ul>
        </>
      )}
      {note && <p className="type-body-r-xs text-muted-foreground">{note}</p>}
    </SectionPanel>
  );
}
