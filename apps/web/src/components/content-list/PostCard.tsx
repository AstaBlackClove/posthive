"use client";

import { PlatformIcon } from "@/components/PlatformIcon";
import { StatusPill } from "@/components/dashboard/StatusPill";
import { cn } from "@/lib/cn";
import { listDate, pillOf, shortLink, statusOfPost, type ListItem } from "@/lib/content-list";
import { platformLabel } from "@/lib/platforms";

/** The channels of a post as round icons that overlap, so a post for three channels is not three icons wide. Decorative: the names are written beside it. */
export function ChannelStack({ channels, size = 20 }: { channels: string[]; size?: number }) {
  if (channels.length === 0) return null;
  return (
    <span aria-hidden="true" className="flex shrink-0 -space-x-1.5">
      {channels.slice(0, 3).map((c) => (
        <span key={c} className="flex rounded-full bg-surface ring-2 ring-surface">
          <PlatformIcon platform={c} size={size} className="rounded-full" />
        </span>
      ))}
    </span>
  );
}

type Props = {
  item: ListItem;
  /** The post whose drawer is open. */
  open: boolean;
  onOpen: (id: string) => void;
};

/**
 * One post as a card, for the Kanban columns and the Day view: its channels, its title, the start of its caption, the
 * link of its design copy and its date and status. The title is the card's button and stretches over the whole card
 * (`after:inset-0`), so the card opens the drawer by click or by Enter and the link keeps its own click without a
 * button inside a button.
 */
export function PostCard({ item, open, onOpen }: Props) {
  return (
    <article
      data-open={open || undefined}
      className={cn(
        "relative flex min-w-0 flex-col gap-2 rounded-xl border p-3.5 transition-colors focus-within:ring-2 focus-within:ring-ring/40",
        open ? "border-brand-400 bg-brand-50" : "border-border bg-surface hover:border-neutral-300"
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <ChannelStack channels={item.channels} />
        <span className="min-w-0 flex-1 truncate type-body-r-xs text-muted-foreground">
          {item.channels.length > 0 ? item.channels.map(platformLabel).join(" · ") : "No channel"}
        </span>
        {item.sourceRow !== null && <span className="shrink-0 type-body-r-xxs text-neutral-500">Row {item.sourceRow}</span>}
      </div>

      <h3 className="type-body-m-m text-fg">
        <button type="button" onClick={() => onOpen(item.id)} aria-label={`Open ${item.title}`} className="block w-full cursor-pointer text-left break-words outline-none after:absolute after:inset-0 after:rounded-xl">
          <span className="line-clamp-3">{item.title}</span>
        </button>
      </h3>

      {item.caption && <p className="line-clamp-3 type-body-r-s break-words text-muted-foreground">{item.caption}</p>}

      {item.link ? (
        <a href={item.link} target="_blank" rel="noopener noreferrer" title={item.link} className="relative z-10 block w-fit max-w-full truncate type-body-r-xs text-brand-800 underline-offset-2 hover:underline">
          {shortLink(item.link)}
        </a>
      ) : (
        item.designCopy && <p className="truncate type-body-r-xs text-muted-foreground">{item.designCopy}</p>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5">
        <span className="type-body-r-xs whitespace-nowrap text-fg tabular-nums">{item.scheduledFor ? listDate(item.scheduledFor) : <span className="text-muted-foreground">No date</span>}</span>
        <StatusPill status={pillOf(item)}>{statusOfPost(item)}</StatusPill>
      </div>
    </article>
  );
}
