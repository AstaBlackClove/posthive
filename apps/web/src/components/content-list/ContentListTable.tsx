"use client";

import type { KeyboardEvent } from "react";
import { PlatformIcon } from "@/components/PlatformIcon";
import { StatusPill } from "@/components/dashboard/StatusPill";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { listDate, pillOf, shortLink, statusOfPost, type ListItem } from "@/lib/content-list";
import { platformLabel } from "@/lib/platforms";

type Props = {
  items: ListItem[];
  selected: ReadonlySet<string>;
  /** The row whose drawer is open. */
  openId: string | null;
  /** Rows can be ticked (the person makes content). */
  selectable: boolean;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], on: boolean) => void;
  onOpen: (id: string) => void;
};

/**
 * The rows of the page. A row opens the drawer by click or by Enter / Space; the checkbox and the link keep their own
 * click. Every cell can shrink and its text is cut, so a title with no spaces or an address as long as a paragraph
 * cannot widen the table.
 */
export function ContentListTable({ items, selected, openId, selectable, onToggle, onToggleAll, onOpen }: Props) {
  const allOn = items.length > 0 && items.every((i) => selected.has(i.id));
  const someOn = !allOn && items.some((i) => selected.has(i.id));

  function onKey(e: KeyboardEvent<HTMLTableRowElement>, id: string) {
    // Only the row itself: Enter on the checkbox or the link inside it is theirs
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(id);
    }
  }

  return (
    <Table aria-label="Content list" className="min-w-160 table-fixed @min-[62rem]:min-w-264">
      <TableHeader>
        <TableRow className="bg-bg hover:bg-bg">
          <TableHead className="w-12">
            {selectable && (
              <Checkbox
                aria-label="Select all on this page"
                checked={allOn ? true : someOn ? "indeterminate" : false}
                onCheckedChange={(v) => onToggleAll(items.map((i) => i.id), v === true)}
              />
            )}
          </TableHead>
          <TableHead className="w-14">#</TableHead>
          <TableHead className="w-[21%]">Content title</TableHead>
          <TableHead className="w-44">Post date</TableHead>
          <TableHead className="w-34">Platform</TableHead>
          <TableHead className="hidden w-40 @min-[62rem]:table-cell">Link copywrite</TableHead>
          <TableHead className="hidden @min-[62rem]:table-cell">Caption</TableHead>
          <TableHead className="w-32">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const on = selected.has(item.id);
          return (
            <TableRow
              key={item.id}
              tabIndex={0}
              aria-label={`Open ${item.title}`}
              data-state={on ? "selected" : undefined}
              data-open={openId === item.id || undefined}
              onClick={() => onOpen(item.id)}
              onKeyDown={(e) => onKey(e, item.id)}
              className={cn("cursor-pointer bg-surface align-middle outline-none hover:bg-brand-50 focus-visible:bg-brand-50 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset", (on || openId === item.id) && "bg-brand-50")}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                {selectable && <Checkbox aria-label={`Select ${item.title}`} checked={on} onCheckedChange={() => onToggle(item.id)} />}
              </TableCell>
              <TableCell className="tabular-nums text-muted-foreground">{item.sourceRow ?? "—"}</TableCell>
              <TableCell className="whitespace-normal">
                <p className="line-clamp-2 type-body-m-s break-words" title={item.title}>
                  {item.title}
                </p>
              </TableCell>
              <TableCell className="tabular-nums whitespace-nowrap">{item.scheduledFor ? listDate(item.scheduledFor) : <span className="text-muted-foreground">No date</span>}</TableCell>
              <TableCell className="whitespace-normal">
                {item.channels.length > 0 ? (
                  <ul className="space-y-1.5">
                    {item.channels.map((c) => (
                      <li key={c} className="flex min-w-0 items-center gap-2">
                        <PlatformIcon platform={c} size={18} />
                        <span className="min-w-0 truncate">{platformLabel(c)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-muted-foreground">No channel</span>
                )}
              </TableCell>
              <TableCell className="hidden whitespace-normal @min-[62rem]:table-cell" onClick={(e) => item.link && e.stopPropagation()}>
                {item.link ? (
                  <a href={item.link} target="_blank" rel="noopener noreferrer" title={item.link} className="block truncate text-brand-800 underline-offset-2 hover:underline">
                    {shortLink(item.link)}
                  </a>
                ) : item.designCopy ? (
                  <span className="block truncate text-muted-foreground" title={item.designCopy}>
                    {item.designCopy}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="hidden whitespace-normal @min-[62rem]:table-cell">
                {item.caption ? (
                  <p className="line-clamp-2 type-body-r-s break-words" title={item.caption}>
                    {item.caption}
                  </p>
                ) : (
                  <span className="text-muted-foreground">No caption yet</span>
                )}
              </TableCell>
              <TableCell>
                <StatusPill status={pillOf(item)}>{statusOfPost(item)}</StatusPill>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
