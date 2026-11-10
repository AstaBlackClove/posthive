import { PlatformIcon } from "@/components/PlatformIcon";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { formatTime } from "@/lib/datetime";
import { statusLabel } from "@/lib/content-status";
import { platformLabel } from "@/lib/platforms";
import { StatusDot } from "./StatusDot";
import type { ContentRow } from "./types";

/** One post in a side panel: its channel, its title, when it goes out and where it stands. */
export function PostLine({ row }: { row: ContentRow }) {
  // a draft has no publication stage yet: say where it is in production instead
  const status = row.publication ?? row.production;
  return (
    <Item size="sm" className="p-0">
      <ItemMedia variant="icon" className="size-9 rounded-xl border-0 bg-bg">
        {row.channel ? <PlatformIcon platform={row.channel} size={18} /> : <span aria-hidden="true" className="text-muted-foreground">—</span>}
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="max-w-full">
          <span className="truncate">{row.title}</span>
        </ItemTitle>
        <ItemDescription className="flex flex-wrap items-center gap-x-2">
          {row.channel && <span>{platformLabel(row.channel)}</span>}
          {row.publishAt && <time dateTime={row.publishAt}>{formatTime(new Date(row.publishAt))} WIB</time>}
          <span className="inline-flex items-center gap-1.5">
            <StatusDot status={status} />
            {statusLabel(status)}
          </span>
        </ItemDescription>
      </ItemContent>
    </Item>
  );
}
