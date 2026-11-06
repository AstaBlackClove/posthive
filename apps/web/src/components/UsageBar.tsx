import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";
import { usagePercent } from "@/lib/status";

type Props = {
  label: string;
  used: number;
  /** null = unlimited. */
  max: number | null;
  /** The bar turns brown from this percentage. */
  warningAt?: number;
  className?: string;
};

/** "Accounts 3 / 5" with a bar: yellow, brown when nearly full, red at the limit. */
export function UsageBar({ label, used, max, warningAt = 80, className }: Props) {
  if (max === null) {
    return (
      <div className={cn("flex items-center justify-between", className)}>
        <span className="type-body-m-xs text-muted">{label}</span>
        <span className="type-body-sb-xs text-fg">
          {used} <span className="text-neutral-500">/ ∞</span>
        </span>
      </div>
    );
  }
  const pct = usagePercent(used, max);
  const isFull = pct >= 100;
  const isHigh = pct >= warningAt;
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="type-body-m-xs text-muted">{label}</span>
        <span className={cn("type-body-sb-xs", isFull ? "text-red-600" : isHigh ? "text-brand-800" : "text-fg")}>
          {used} <span className="text-neutral-500">/ {max}</span>
        </span>
      </div>
      <Progress
        value={pct}
        aria-label={`${label}: ${used} of ${max} used`}
        indicatorClassName={cn(isFull ? "bg-red-500" : isHigh ? "bg-brand-700" : "bg-primary")}
      />
      {isFull && <p className="mt-1.5 type-body-r-xs text-brand-800">Limit reached - upgrade to continue.</p>}
    </div>
  );
}
