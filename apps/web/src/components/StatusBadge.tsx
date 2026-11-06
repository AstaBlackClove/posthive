import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import {
  ITEM_STATUS,
  POST_STATUS,
  approvalView,
  planStatusView,
  roleTone,
  statusView,
  type StatusView,
} from "@/lib/status";
import type { Tone } from "@/lib/tone";

// The Badge variant for a tone ("neutral" is Badge's default look).
const variantOf = (tone: Tone) => (tone === "neutral" ? "default" : tone);

function Dot({ view }: { view: StatusView }) {
  if (!view.dot) return null;
  return <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", view.dot, view.pulse && "animate-pulse")} />;
}

function View({ view, className, title }: { view: StatusView; className?: string; title?: string }) {
  return (
    <Badge variant={variantOf(view.tone)} className={cn("gap-1.5", className)} title={title}>
      <Dot view={view} />
      {view.label}
    </Badge>
  );
}

/** Status of a post (PostJob.status): Scheduled, Published, Failed… The one badge for jobs, calendar and detail. */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return <View view={statusView(POST_STATUS, status)} className={className} />;
}

/** Status of one library item: Queued, Scheduled, Published, Skipped, Failed. */
export function ItemStatusBadge({ status, className }: { status: string; className?: string }) {
  return <View view={statusView(ITEM_STATUS, status)} className={className} />;
}

/** In review / Rejected / Approved on a draft. Renders nothing when the post is not under review. */
export function ApprovalBadge({
  approvalStatus,
  reviewedBy,
  className,
}: {
  approvalStatus: string | null | undefined;
  reviewedBy?: { name: string } | null;
  className?: string;
}) {
  const view = approvalView(approvalStatus);
  if (!view) return null;
  return (
    <Badge
      variant={variantOf(view.tone)}
      className={className}
      title={reviewedBy ? `${view.label} by ${reviewedBy.name}` : view.label}
    >
      {view.label}
    </Badge>
  );
}

/** Plan state on the billing page: Active, 3 days left, Payment failed… Renders nothing for an unknown state. */
export function PlanStatusBadge({
  status,
  trialDaysLeft,
  trialEndsAt,
  className,
}: {
  status: string;
  trialDaysLeft?: number;
  trialEndsAt?: string | null;
  className?: string;
}) {
  const view = planStatusView(status, { trialDaysLeft, trialEndsAt });
  if (!view) return null;
  return <View view={view} className={cn("px-2.5 py-1", className)} />;
}

/** owner / admin / designer / member, in one colour map for team, invite and anywhere else. */
export function RoleBadge({ role, className }: { role: string; className?: string }) {
  return (
    <Badge variant={variantOf(roleTone(role))} className={cn("capitalize", className)}>
      {role}
    </Badge>
  );
}
