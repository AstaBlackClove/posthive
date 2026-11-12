"use client";

import { useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, CloudUploadIcon, ListIcon, PlusIcon } from "lucide-react";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { Pager } from "@/components/Pager";
import { cn } from "@/lib/cn";
import { statusLabel } from "@/lib/content-status";
import { formatPublishAt, shortName, sortSummary } from "@/lib/dashboard-format";
import { formatTime, wibDateKey } from "@/lib/datetime";
import { platformLabel } from "@/lib/platforms";
import { PlatformIcon } from "@/components/PlatformIcon";
import { StatusPill } from "./StatusPill";
import type { ContentRow, TabKey } from "./types";

// Module scope on purpose: TanStack Table needs stable features, columns and fallback data, or it rebuilds its rows on every render.
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { text: sortFn_text, datetime: sortFn_datetime },
});
const helper = createColumnHelper<typeof features, ContentRow>();
const NO_ROWS: ContentRow[] = [];

const columns = helper.columns([
  helper.accessor("title", { id: "content", header: "Content", sortFn: "text" }),
  // "" (no channel yet) would sort first; undefined goes last
  helper.accessor((r) => r.channels[0] || undefined, { id: "channel", header: "Channel", sortFn: "text", sortUndefined: "last" }),
  // undefined, not "" or null: an empty string sorts FIRST, and sortUndefined: "last" only covers undefined
  helper.accessor((r) => r.publishAt ?? undefined, { id: "publishAt", header: "Publish date", sortFn: "datetime", sortUndefined: "last" }),
  helper.accessor((r) => r.owner ?? undefined, { id: "owner", header: "Owner", sortFn: "text", sortUndefined: "last" }),
  helper.accessor("production", { id: "production", header: "Production", sortFn: "text" }),
  helper.accessor((r) => r.publication ?? undefined, { id: "publication", header: "Publication", sortFn: "text", sortUndefined: "last" }),
]);

const TABS: { key: TabKey; label: string }[] = [
  { key: "upcoming", label: "Upcoming content" },
  { key: "attention", label: "Need attention" },
  { key: "risk", label: "At risk" },
  { key: "activity", label: "Recent Activity" },
];

// Per tab: what an empty list says. Only "upcoming" is in the design; the others reuse its shape.
const EMPTY: Record<TabKey, { title: string; description: string }> = {
  upcoming: { title: "No upcoming content yet", description: "Posts you create or import will be listed here, sorted by publish date, with their production and publication status." },
  attention: { title: "Nothing needs attention", description: "Posts that are blocked or waiting on you will be listed here." },
  risk: { title: "Nothing at risk", description: "Posts likely to miss their publish date will be listed here." },
  activity: { title: "No recent activity", description: "Changes to your content will be listed here." },
};

type Props = {
  /** The rows of each tab (the lists are cut, the count in the tab is the true total). A tab with none is empty. */
  rows?: Partial<Record<TabKey, ContentRow[]>>;
  tabCounts: Record<TabKey, number>;
  /** Today as a WIB "YYYY-MM-DD" key: a post of today has its row marked and says "today 14:00". */
  todayKey?: string;
  /**
   * The ticked rows, kept by the page (they drive its bar of actions). Without it the rows have no checkbox: the table
   * only lists. The first column stays either way, so the others do not move.
   */
  selection?: {
    selected: ReadonlySet<string>;
    onToggle: (id: string) => void;
    /** Tick or untick these rows: the ones of the tab that is shown. */
    onToggleAll: (ids: string[], on: boolean) => void;
  };
  /** A click, or Enter or Space, on a row. Without it a row is not a button. */
  onOpen?: (id: string) => void;
  /** The row whose post is open, for its tint. */
  openId?: string | null;
  /** The person picked another tab. */
  onTabChange?: (tab: TabKey) => void;
  /** The tab's rows come a page at a time: with this the table has a pager under it. Without it the rows are all there is. */
  paging?: { page: number; pageCount: number; loading: boolean; onPage: (page: number) => void };
};

function SortIcon({ state }: { state: false | "asc" | "desc" }) {
  if (state === "asc") return <ArrowUpIcon aria-hidden="true" className="size-3.5" />;
  if (state === "desc") return <ArrowDownIcon aria-hidden="true" className="size-3.5" />;
  return <ArrowUpDownIcon aria-hidden="true" className="size-3.5 opacity-50" />;
}

/**
 * The tabs and the table of content (sortable). The page decides what a row can do: with `selection` the rows can be
 * ticked, with `onOpen` they open the post. With no rows it is the empty state inside the table.
 */
export function ContentTable({ rows: rowsByTab, tabCounts, todayKey, selection, onOpen, openId, onTabChange, paging }: Props) {
  const [tab, setTab] = useState<TabKey>("upcoming");
  const rows = rowsByTab?.[tab] ?? NO_ROWS;
  // The list starts in the order its footer promises: by publish date, soonest first
  const table = useTable({ features, columns, data: rows, getRowId: (r) => r.id, initialState: { sorting: [{ id: "publishAt", desc: false }] } });
  const result = table.getRowModel().rows;
  const empty = EMPTY[tab];

  const ids = result.map((r) => r.id);
  const allOn = Boolean(selection) && ids.length > 0 && ids.every((id) => selection!.selected.has(id));
  const someOn = Boolean(selection) && !allOn && ids.some((id) => selection!.selected.has(id));

  function onKey(e: KeyboardEvent<HTMLTableRowElement>, id: string) {
    // Only the row itself: Enter on the checkbox inside is the checkbox's own
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen?.(id);
    }
  }

  return (
    <section aria-label="Content list" className="space-y-3">
      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as TabKey);
          onTabChange?.(v as TabKey);
        }}
        className="gap-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsList aria-label="Content views" className="border-0 bg-transparent p-0">
              {TABS.map((t) => (
                <TabsTrigger key={t.key} value={t.key} className="group-data-[variant=default]/tabs-list:data-[state=active]:bg-surface group-data-[variant=default]/tabs-list:data-[state=active]:text-fg">
                  {t.label}
                  <Badge
                    variant={t.key === "risk" ? "danger" : t.key === "upcoming" ? "warning" : "plain"}
                    className={cn("ml-1 min-w-5 justify-center rounded-full px-1.5", t.key === "risk" && "bg-red-400 text-white border-transparent", t.key === "upcoming" && "bg-brand-500 text-neutral-950 border-transparent")}
                  >
                    {tabCounts[t.key]}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <Button asChild variant="secondary" size="sm" className="shrink-0 rounded-full">
            <Link href="/jobs">View all</Link>
          </Button>
        </div>

        <TabsContent value={tab} aria-busy={paging?.loading} className={cn("overflow-hidden rounded-2xl border border-neutral-200 bg-bg transition-opacity", paging?.loading && "opacity-60")}>
          <Table aria-label={TABS.find((t) => t.key === tab)?.label} className="min-w-160">
            <TableHeader>
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id} className="hover:bg-transparent">
                  <TableHead className="w-10">
                    {selection && (
                      <Checkbox
                        aria-label="Select all rows"
                        checked={allOn ? true : someOn ? "indeterminate" : false}
                        disabled={result.length === 0}
                        onCheckedChange={(v) => selection.onToggleAll(ids, v === true)}
                      />
                    )}
                  </TableHead>
                  {group.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    return (
                      <TableHead key={header.id} aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}>
                        <Button variant="ghost" size="sm" className="-ml-2 h-8 gap-1.5 px-2" onClick={() => header.column.toggleSorting()}>
                          <table.FlexRender header={header} />
                          <SortIcon state={sorted} />
                        </Button>
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {result.map((row) => {
                const post = row.original;
                const at = post.publishAt ? new Date(post.publishAt) : null;
                const isToday = Boolean(at && todayKey && wibDateKey(at) === todayKey);
                const on = Boolean(selection?.selected.has(post.id));
                const open = openId === post.id;
                return (
                  <TableRow
                    key={row.id}
                    // a row that opens a post is a button: reachable by Tab, and named for what it opens
                    {...(onOpen && {
                      tabIndex: 0,
                      "aria-label": `Open ${post.title}`,
                      onClick: () => onOpen(post.id),
                      onKeyDown: (e: KeyboardEvent<HTMLTableRowElement>) => onKey(e, post.id),
                    })}
                    data-state={on ? "selected" : undefined}
                    data-open={open || undefined}
                    data-today={isToday || undefined}
                    className={cn(
                      "bg-surface hover:bg-brand-50",
                      onOpen && "cursor-pointer outline-none focus-visible:bg-brand-50 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset",
                      (isToday || on || open) && "bg-brand-50"
                    )}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {selection && <Checkbox aria-label={`Select ${post.title}`} checked={on} onCheckedChange={() => selection.onToggle(post.id)} />}
                    </TableCell>
                    <TableCell className="max-w-72 min-w-48 whitespace-normal">
                      <p className="line-clamp-2 type-body-m-s break-words" title={post.title}>
                        {post.title}
                      </p>
                      {post.category && <p className="mt-0.5 truncate type-body-r-xxs text-brand-800">{post.category}</p>}
                    </TableCell>
                    <TableCell>
                      {post.channels.length > 0 ? (
                        <ul className="space-y-1.5">
                          {post.channels.map((c) => (
                            <li key={c} className="flex items-center gap-2">
                              <PlatformIcon platform={c} size={18} />
                              {platformLabel(c)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{at ? formatPublishAt(at) : "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{post.owner ? shortName(post.owner) : "—"}</TableCell>
                    <TableCell>
                      <StatusPill status={post.production} solid>
                        {statusLabel(post.production)}
                      </StatusPill>
                    </TableCell>
                    <TableCell>
                      {post.publication ? (
                        <StatusPill status={post.publication}>
                          {post.publication === "scheduled" && at ? `Scheduled · ${isToday ? "today " : ""}${formatTime(at)}` : statusLabel(post.publication)}
                        </StatusPill>
                      ) : (
                        // a draft is not on its way out: the grey "brief" tint, not a stage it has not reached
                        <StatusPill status="brief">Not scheduled</StatusPill>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {result.length === 0 && (
            <EmptyState
              size="compact"
              className="min-h-72"
              icon={<ListIcon />}
              title={empty.title}
              description={empty.description}
              action={
                tab === "upcoming" ? (
                  <>
                    <Button asChild variant="olive">
                      <Link href="/jobs/import">
                        <CloudUploadIcon />
                        Import quarter plan
                      </Link>
                    </Button>
                    <Button asChild>
                      <Link href="/compose">
                        <PlusIcon />
                        Add content
                      </Link>
                    </Button>
                  </>
                ) : undefined
              }
            />
          )}
        </TabsContent>

        <div className="flex flex-wrap items-center justify-between gap-2 px-1 type-body-r-xs text-muted-foreground">
          <p aria-live="polite">
            Showing {result.length} of {Math.max(tabCounts[tab], result.length)} posts
          </p>
          {paging && <Pager page={paging.page} pageCount={paging.pageCount} onPage={paging.onPage} />}
          {/* the table sorts the rows it holds: with more pages, that is this page and not the whole list */}
          <p>{sortSummary(table.state.sorting)}{paging && paging.pageCount > 1 ? " · on this page" : ""}</p>
        </div>
      </Tabs>
    </section>
  );
}
