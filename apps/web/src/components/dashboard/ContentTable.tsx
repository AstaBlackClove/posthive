"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, CloudUploadIcon, ListIcon, PlusIcon } from "lucide-react";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSelectionFeature,
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
import { cn } from "@/lib/cn";
import { sortSummary } from "@/lib/dashboard-format";
import { formatDate } from "@/lib/datetime";
import { statusLabel } from "@/lib/content-status";
import { platformLabel } from "@/lib/platforms";
import { PlatformIcon } from "@/components/PlatformIcon";
import { StatusDot } from "./StatusDot";
import type { ContentRow, TabKey } from "./types";

// Module scope on purpose: TanStack Table needs stable features, columns and fallback data, or it rebuilds its rows on every render.
const features = tableFeatures({
  rowSortingFeature,
  rowSelectionFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { text: sortFn_text, datetime: sortFn_datetime },
});
const helper = createColumnHelper<typeof features, ContentRow>();
const NO_ROWS: ContentRow[] = [];

const columns = helper.columns([
  helper.accessor("title", { id: "content", header: "Content", sortFn: "text" }),
  // "" (no channel yet) would sort first; undefined goes last
  helper.accessor((r) => r.channel || undefined, { id: "channel", header: "Channel", sortFn: "text", sortUndefined: "last" }),
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
};

function SortIcon({ state }: { state: false | "asc" | "desc" }) {
  if (state === "asc") return <ArrowUpIcon aria-hidden="true" className="size-3.5" />;
  if (state === "desc") return <ArrowDownIcon aria-hidden="true" className="size-3.5" />;
  return <ArrowUpDownIcon aria-hidden="true" className="size-3.5 opacity-50" />;
}

/** The tabs and the table of content (sortable, selectable). With no rows it is the empty state inside the table. */
export function ContentTable({ rows: rowsByTab, tabCounts }: Props) {
  const [tab, setTab] = useState<TabKey>("upcoming");
  const rows = rowsByTab?.[tab] ?? NO_ROWS;
  // The list starts in the order its footer promises: by publish date, soonest first
  const table = useTable({ features, columns, data: rows, getRowId: (r) => r.id, initialState: { sorting: [{ id: "publishAt", desc: false }] } });
  const result = table.getRowModel().rows;
  const empty = EMPTY[tab];

  return (
    <section aria-label="Content list" className="space-y-3">
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="gap-3">
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

        <TabsContent value={tab} className="rounded-2xl border border-neutral-200 bg-bg">
          <Table aria-label={TABS.find((t) => t.key === tab)?.label} className="min-w-160">
            <TableHeader>
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id} className="hover:bg-transparent">
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label="Select all rows"
                      checked={table.getIsAllRowsSelected() ? true : table.getIsSomeRowsSelected() ? "indeterminate" : false}
                      disabled={result.length === 0}
                      onCheckedChange={(v) => table.toggleAllRowsSelected(v === true)}
                    />
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
              {result.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox aria-label={`Select ${row.original.title}`} checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(v === true)} />
                  </TableCell>
                  <TableCell className="max-w-64 truncate type-body-m-s">{row.original.title}</TableCell>
                  <TableCell>
                    {row.original.channel ? (
                      <span className="inline-flex items-center gap-2">
                        <PlatformIcon platform={row.original.channel} size={14} />
                        {platformLabel(row.original.channel)}
                        {row.original.alsoOn ? <span className="text-muted-foreground">+{row.original.alsoOn}</span> : null}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{row.original.publishAt ? formatDate(new Date(row.original.publishAt)) : "—"}</TableCell>
                  <TableCell>{row.original.owner ?? "—"}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <StatusDot status={row.original.production} />
                      {statusLabel(row.original.production)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {row.original.publication ? (
                      <span className="inline-flex items-center gap-2">
                        <StatusDot status={row.original.publication} />
                        {statusLabel(row.original.publication)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground" title="Not scheduled yet">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
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
            Showing {result.length} of {Math.max(tabCounts[tab], result.length)}
          </p>
          <p>{sortSummary(table.state.sorting)}</p>
        </div>
      </Tabs>
    </section>
  );
}
