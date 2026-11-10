"use client";

import { useState } from "react";
import { PlatformIcon } from "@/components/PlatformIcon";
import { Item, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import { assetUrl } from "@/lib/api";
import { formatTime } from "@/lib/datetime";
import { platformLabel } from "@/lib/platforms";
import { StatusPill } from "./StatusPill";
import type { ContentRow } from "./types";

type Props = {
  row: ContentRow;
  /** "publish": today's posts, with the channel and time beside the status. "task": the person's own, with the due time under it. */
  kind: "publish" | "task";
};

/** The small print under a post: where it stands today, in words. */
function noteOf(row: ContentRow, kind: Props["kind"]): string | null {
  const time = row.publishAt ? `${formatTime(new Date(row.publishAt))} WIB` : null;
  if (kind === "task") return [time && `Due ${time}`, row.channels[0] && platformLabel(row.channels[0])].filter(Boolean).join(" · ") || null;
  if (row.publication === "scheduled") return "Scheduled today · ready to publish";
  if (row.publication === "published") return "Published today";
  if (row.publication === "failed") return "Publishing failed · needs a retry";
  if (row.production === "review") return "Waiting for approval";
  if (row.production === "changes") return "Changes requested";
  return "Draft · not scheduled yet";
}

/**
 * One post in a side panel: its picture (or its channel's icon), its title on one line, its status as a
 * pill and a line of small print. Everything is allowed to shrink (min-w-0) and nothing wraps below the
 * picture, so a title as long as a paragraph or an address with no spaces is cut with an ellipsis and
 * cannot widen the panel.
 */
export function PostLine({ row, kind }: Props) {
  // a picture that cannot be loaded (a deleted file) falls back to the channel's icon
  const [broken, setBroken] = useState(false);
  // As in the design, a scheduled post reads "Approved" (the small print says it is scheduled); only an outcome replaces it
  const status = row.publication === "published" || row.publication === "failed" ? row.publication : row.production;
  const channel = row.channels[0];
  const note = noteOf(row, kind);
  const time = row.publishAt ? `${formatTime(new Date(row.publishAt))} WIB` : null;

  return (
    <Item size="sm" className="flex-nowrap items-start gap-3 p-0">
      <ItemMedia variant="icon" className="size-12 translate-y-0 self-start overflow-hidden rounded-lg border-0 bg-bg">
        {row.thumbnail && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={assetUrl(row.thumbnail)} alt="" loading="lazy" className="size-full object-cover" onError={() => setBroken(true)} />
        ) : channel ? (
          <PlatformIcon platform={channel} size={22} />
        ) : (
          <span aria-hidden="true" className="text-muted-foreground">—</span>
        )}
      </ItemMedia>
      <ItemContent className="min-w-0 gap-1">
        <ItemTitle className="w-full min-w-0 max-w-full">
          <span className="truncate" title={row.title}>
            {row.title}
          </span>
        </ItemTitle>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <StatusPill status={status} solid={status === "approved"} check={status === "approved"} />
          {kind === "publish" && (channel || time) && (
            <span className="min-w-0 truncate type-body-r-xs text-muted-foreground">
              {[channel && platformLabel(channel), time].filter(Boolean).join(" · ")}
            </span>
          )}
        </div>
        {note && <p className="min-w-0 truncate type-body-r-xxs text-muted-foreground">{note}</p>}
      </ItemContent>
    </Item>
  );
}
