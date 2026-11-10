import Link from "next/link";
import { CloudUploadIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { percentOf } from "./StatCard";
import type { PlanQuarter } from "./types";

type Props = {
  plan: PlanQuarter;
};

/** The quarter's plan: how many posts are planned of the quota, and the two ways to add more. */
export function PlanMarketingCard({ plan }: Props) {
  const { label, quota, planned } = plan;
  return (
    <Card className="flex-col gap-4 px-5 py-4 xl:flex-row xl:items-center xl:gap-5">
      <div className="xl:shrink-0">
        <h2 className="whitespace-nowrap type-head-m-5 text-fg">Plan Marketing</h2>
        <p className="type-body-r-xs text-muted-foreground">{label}</p>
      </div>
      <div className="min-w-0 flex-1 space-y-2 xl:min-w-48">
        <p className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          <span className="type-head-r-3 text-fg tabular-nums">{planned}</span>
          <span className="type-body-r-xs text-muted-foreground">
            {quota === undefined
              ? `${planned === 1 ? "post" : "posts"} planned in ${label}`
              : `/ ${quota} posts planned · quota set for ${label.split(" ")[0]}`}
          </span>
        </p>
        {quota !== undefined && <Progress value={percentOf(planned, quota)} aria-label={`Posts planned: ${planned} of ${quota}`} />}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button asChild variant="olive">
          <Link href="/jobs/import">
            <CloudUploadIcon />
            Import planning
          </Link>
        </Button>
        <Button asChild>
          <Link href="/compose">
            <PlusIcon />
            Add content
          </Link>
        </Button>
      </div>
    </Card>
  );
}
