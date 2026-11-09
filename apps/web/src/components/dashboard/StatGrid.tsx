import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PRODUCTION_STAGES, CONTENT_STATUS } from "@/lib/content-status";
import { SegmentedProgress } from "./SegmentedProgress";
import { StatCard } from "./StatCard";
import { StatusLegend } from "./StatusDot";
import type { DashboardData } from "./types";

type Props = {
  data: Pick<DashboardData, "pipeline" | "plan" | "readyToSchedule" | "published" | "needAttention" | "tasksToday">;
};

// The corner button of a stat card: an arrow to the list behind it, named for screen readers.
function GoButton({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Button asChild size="icon" variant="ghost" className={className}>
      <Link href={href} aria-label={label}>
        <ArrowRightIcon />
      </Link>
    </Button>
  );
}

/** The production pipeline and the four stat cards beside it. */
export function StatGrid({ data }: Props) {
  const { pipeline, plan, readyToSchedule, published, needAttention, tasksToday } = data;
  const inProgress = PRODUCTION_STAGES.reduce((sum, k) => sum + (pipeline.counts[k] ?? 0), 0);
  const segments = PRODUCTION_STAGES.map((k) => ({ label: CONTENT_STATUS[k].label, value: pipeline.counts[k] ?? 0, className: CONTENT_STATUS[k].dot }));

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.1fr_1fr_1fr] xl:grid-rows-2">
      <Card className="gap-3 py-4 md:row-span-2">
        <CardHeader className="px-4">
          <CardTitle className="type-body-sb-m">
            <h2>Production pipeline</h2>
          </CardTitle>
          <CardDescription className="type-body-r-xs">In production, not yet published</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-between gap-6 px-4">
          <p className="mt-6 flex items-baseline gap-2">
            <span className="type-head-r-3 text-fg tabular-nums">{inProgress}</span>
            <span className="type-body-r-xs text-muted-foreground">posts in progress</span>
          </p>
          <div className="space-y-5">
            <SegmentedProgress segments={segments} label="Production pipeline" />
            <StatusLegend variant="pipeline" counts={pipeline.counts} />
          </div>
        </CardContent>
      </Card>

      <StatCard title="Ready to schedule" subtitle="Approved, not yet scheduled" value={readyToSchedule} total={plan.quota} unit="posts" />
      <StatCard title="Published" subtitle="Published this quarter" value={published} total={plan.quota} unit="posts" />
      <StatCard
        title="Need attention"
        subtitle={needAttention === 0 ? "Nothing at risk right now" : "Behind schedule or blocked"}
        value={needAttention}
        unit="posts"
        tone="warning"
        action={<GoButton href="/jobs" label="See posts that need attention" className="bg-neutral-100/80 hover:bg-neutral-200" />}
      />
      <StatCard
        title="My tasks today"
        subtitle="Assigned to you for today"
        value={tasksToday}
        unit="posts in progress"
        action={<GoButton href="/jobs" label="See my tasks" className="bg-neutral-100 hover:bg-neutral-200" />}
      />
    </div>
  );
}
