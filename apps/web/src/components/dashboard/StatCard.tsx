import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";

type Tone = "default" | "warning";

type Props = {
  title: string;
  subtitle: string;
  /** The big number. */
  value: number;
  /** Shown after the value as "/ 60 posts"; with `total`, the bar fills value / total. */
  unit: string;
  total?: number;
  /** "warning" is the peach card (something needs attention). */
  tone?: Tone;
  /** A corner action, usually an icon button. */
  action?: ReactNode;
  className?: string;
};

const TONE: Record<Tone, string> = {
  default: "",
  // peach: the red tint at half strength, over the card
  warning: "border-transparent bg-red-100/50",
};

/** The share of `total` done, 0–100. No total or a total of 0 gives 0, never NaN. */
export function percentOf(value: number, total?: number): number {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}

/** A number with a caption: "Drafts to schedule  0 / 60 posts", with a progress bar when it has a total. */
export function StatCard({ title, subtitle, value, unit, total, tone = "default", action, className }: Props) {
  const hasTotal = total !== undefined;
  return (
    <Card className={cn("gap-3 py-4", TONE[tone], className)}>
      <CardHeader className="px-4">
        <CardTitle className="type-body-sb-m">
          <h2>{title}</h2>
        </CardTitle>
        <CardDescription className="type-body-r-xs">{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto space-y-2 px-4">
        <div className="flex items-end justify-between gap-2">
          <p className="flex items-baseline gap-2">
            <span className="type-head-r-3 text-fg tabular-nums">{value}</span>
            <span className="type-body-r-xs text-muted-foreground">
              {hasTotal ? `/ ${total} ` : ""}
              {unit}
            </span>
          </p>
          {action}
        </div>
        {hasTotal && <Progress value={percentOf(value, total)} aria-label={`${title}: ${value} of ${total}`} />}
      </CardContent>
    </Card>
  );
}
