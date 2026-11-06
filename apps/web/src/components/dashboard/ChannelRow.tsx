import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Progress } from "@/components/ui/progress";
import { PlatformIcon } from "@/components/PlatformIcon";
import { platformLabel } from "@/lib/platforms";
import { percentOf } from "./StatCard";

export interface ChannelStat {
  /** A platform id the app knows: "instagram", "linkedin"… */
  platform: string;
  /** The linked account's handle, or null when none is linked. */
  handle: string | null;
  connected: boolean;
  /** Posts published or scheduled this month. */
  posts: number;
  /** The month's target, when there is one. Without it the bar stays empty. */
  target?: number;
}

type Props = {
  channel: ChannelStat;
  /** Shown instead of the handle when nothing is linked. */
  emptyHandle?: ReactNode;
};

/** One channel of "Channels this month": its icon, name, handle, state, and how far the month's posts are. */
export function ChannelRow({ channel, emptyHandle = "No account linked" }: Props) {
  const { platform, handle, connected, posts, target } = channel;
  const name = platformLabel(platform);
  return (
    <div className="space-y-2">
      <Item size="sm" className="p-0">
        <ItemMedia variant="icon" className="size-9 rounded-xl border-0 bg-bg">
          <PlatformIcon platform={platform} size={20} />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>{name}</ItemTitle>
          <ItemDescription>{connected && handle ? handle : emptyHandle}</ItemDescription>
        </ItemContent>
        {!connected && (
          <Badge variant="danger" className="gap-1.5">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-red-500" />
            Not connected
          </Badge>
        )}
      </Item>
      <div className="flex items-center gap-3">
        <Progress value={percentOf(posts, target)} aria-label={`${name} this month: ${posts}${target ? ` of ${target}` : ""} posts`} />
        <span className="shrink-0 type-body-r-xs text-muted-foreground tabular-nums">
          {posts} {posts === 1 ? "post" : "posts"}
        </span>
      </div>
    </div>
  );
}
