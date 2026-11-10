import Link from "next/link";
import { CalendarDaysIcon, CheckIcon, LinkIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ItemGroup, ItemSeparator } from "@/components/ui/item";
import { EmptyState } from "@/components/EmptyState";
import { formatTodayLong } from "@/lib/dashboard-format";
import { ChannelRow } from "./ChannelRow";
import { PostLine } from "./PostLine";
import { SectionPanel } from "./SectionPanel";
import type { DashboardData } from "./types";

type Props = {
  data: Pick<DashboardData, "today" | "milestones" | "channels" | "tasksToday" | "taskRows">;
  today: Date;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Today's publishing, today's tasks, the quarter's milestones and the channels: the right-hand column. */
export function SideColumn({ data, today }: Props) {
  const { today: publishToday, milestones, channels, tasksToday, taskRows } = data;
  const anyDisconnected = channels.some((c) => !c.connected);

  return (
    <div className="flex flex-col gap-3">
      <SectionPanel
        title={`Today Publish, ${formatTodayLong(today)}`}
        action={<Badge variant="outline">{plural(publishToday.count, "post", "posts")}</Badge>}
      >
        {publishToday.rows.length > 0 && (
          <ItemGroup className="gap-3">
            {publishToday.rows.map((row) => (
              <PostLine key={row.id} row={row} />
            ))}
          </ItemGroup>
        )}
        {publishToday.count > publishToday.rows.length && (
          <p className="mt-3 type-body-r-xs text-muted-foreground">and {publishToday.count - publishToday.rows.length} more</p>
        )}
        {publishToday.count === 0 && (
          <EmptyState
            size="inline"
            icon={<CalendarDaysIcon />}
            title="Nothing publishing today"
            description="Posts scheduled for today will appear here with their approval status."
            action={
              <Button asChild variant="outline-brand" className="w-full">
                <Link href="/compose">
                  <PlusIcon />
                  Add content
                </Link>
              </Button>
            }
          />
        )}
      </SectionPanel>

      <SectionPanel
        title="Today's tasks"
        action={
          <Button asChild variant="secondary" size="sm" className="rounded-full">
            <Link href="/jobs">View all</Link>
          </Button>
        }
      >
        {taskRows.length > 0 && (
          <ItemGroup className="gap-3">
            {taskRows.map((row) => (
              <PostLine key={row.id} row={row} />
            ))}
          </ItemGroup>
        )}
        {tasksToday > taskRows.length && (
          <p className="mt-3 type-body-r-xs text-muted-foreground">and {tasksToday - taskRows.length} more</p>
        )}
        {tasksToday === 0 && (
          <EmptyState
            size="inline"
            icon={<CheckIcon />}
            title="No tasks today"
            description="Your own posts scheduled for today, and not out yet, show up here."
          />
        )}
      </SectionPanel>

      <SectionPanel
        title="Quarter milestones"
        action={
          <Button asChild variant="secondary" size="sm" className="rounded-full">
            <Link href="/jobs">View all</Link>
          </Button>
        }
      >
        {milestones.count === 0 && (
          <EmptyState
            size="inline"
            icon={<LinkIcon />}
            title="No milestones yet"
            description="Group posts into campaigns like a product launch to track progress across the quarter."
            action={
              <Button asChild variant="outline-brand">
                <Link href="/jobs/import">Create milestone</Link>
              </Button>
            }
          />
        )}
      </SectionPanel>

      <SectionPanel title="Channels this month" contentClassName="space-y-3">
        <ItemGroup className="gap-3">
          {channels.map((c, i) => (
            <div key={c.platform} className="space-y-3">
              {i > 0 && <ItemSeparator />}
              <ChannelRow channel={c} />
            </div>
          ))}
        </ItemGroup>
        {anyDisconnected && <p className="type-body-r-xs text-muted-foreground">Connect a channel to start scheduling and publishing.</p>}
      </SectionPanel>
    </div>
  );
}

