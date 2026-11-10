"use client";

import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheetIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InlineAlert } from "@/components/InlineAlert";
import { PlatformIcon } from "@/components/PlatformIcon";
import { cn } from "@/lib/cn";
import { initialsOf } from "@/lib/dashboard-format";
import { formatBytes } from "@/lib/import-file";
import {
  categoryLabel,
  channelCell,
  dateCell,
  inTab,
  paginate,
  picOf,
  pinIssues,
  tabCounts,
  type Classified,
  type RowTab,
  type RowTone,
} from "@/lib/import-rows";
import { Pager } from "@/components/Pager";
import { ImportStat } from "./ImportStat";

const TABS: ReadonlyArray<{ key: RowTab; label: string }> = [
  { key: "all", label: "All rows" },
  { key: "valid", label: "Valid" },
  { key: "attention", label: "Needs attention" },
  { key: "excluded", label: "Excluded" },
];

const BADGE: Record<RowTone, "success" | "danger" | "warning" | "default"> = {
  success: "success",
  danger: "danger",
  warning: "warning",
  neutral: "default",
};

type Props = {
  file: { name: string; size: number; rows: number; mappedColumns: number; totalColumns: number };
  /** Every row with what it is right now (classify), worked out once by the page. */
  items: Classified[];
  /** Everything is locked while the import is being saved. */
  locked: boolean;
  /** How many fixes the user made, for "You fixed 2 records". */
  fixedCount: number;
  onEditMapping: () => void;
  onExclude: (sourceRow: number) => void;
  onInclude: (sourceRow: number) => void;
  onFix: (sourceRow: number) => void;
};

/** Step 3: the counts, the tabs, and one row per record with what is wrong with it and what to do. */
export function ReviewStep({ file, items, locked, fixedCount, onEditMapping, onExclude, onInclude, onFix }: Props) {
  const [tab, setTab] = useState<RowTab>("all");
  const [page, setPage] = useState(1);

  const counts = tabCounts(items);
  const shown = useMemo(() => pinIssues(items.filter((i) => inTab(i, tab))), [items, tab]);
  const view = paginate(shown, page);
  const excludedNote = counts.excluded;

  // Fixing the last row of a page, or switching tab, can leave the page number past the end
  useEffect(() => {
    if (page !== view.page) setPage(view.page);
  }, [page, view.page]);

  const allGood = counts.attention === 0 && counts.valid > 0;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <section aria-label="File" className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface px-5 py-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-bg text-neutral-600">
          <FileSpreadsheetIcon aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate type-body-sb-m">{file.name}</p>
          <p className="type-body-r-xs text-muted">
            {formatBytes(file.size)} · {file.rows} {file.rows === 1 ? "row" : "rows"} · {file.mappedColumns} of {file.totalColumns} columns mapped
          </p>
        </div>
        <Button variant="secondary" onClick={onEditMapping} disabled={locked}>
          Edit mapping
        </Button>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ImportStat value={counts.all} label="Total records" />
        <ImportStat value={counts.valid} label="Valid records" tone="success" />
        <ImportStat value={counts.attention} label="Records requiring attention" tone={counts.attention > 0 ? "danger" : "default"} />
        <ImportStat value={counts.excluded} label="Excluded records" tone={counts.excluded > 0 ? "brand" : "default"} />
      </div>

      {counts.attention > 0 ? (
        <InlineAlert tone="danger" title={`${counts.attention} ${counts.attention === 1 ? "row needs" : "rows need"} your attention before import`}>
          Fix them, or exclude them; excluded rows stay in the Excluded tab and can be included again any time.
        </InlineAlert>
      ) : allGood ? (
        <InlineAlert tone="success" title="All records are ready to import">
          {fixedCount > 0 ? `You fixed ${fixedCount} ${fixedCount === 1 ? "record" : "records"}. ` : ""}
          {counts.valid} {counts.valid === 1 ? "row" : "rows"} will be added to your content list as drafts.
          {excludedNote > 0 ? ` ${excludedNote} excluded ${excludedNote === 1 ? "row" : "rows"} won't be imported; you can include them again before confirming.` : ""}
        </InlineAlert>
      ) : (
        <InlineAlert tone="warning" title="Nothing to import yet">
          Every row is excluded. Include at least one row to continue.
        </InlineAlert>
      )}

      <section aria-labelledby="rows-title" className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <h2 id="rows-title" className="sr-only">
          Records
        </h2>
        <Tabs value={tab} onValueChange={(v) => { setTab(v as RowTab); setPage(1); }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TabsList aria-label="Row views" className="border-0 bg-transparent p-0">
                {TABS.map((t) => (
                  <TabsTrigger key={t.key} value={t.key} className="group-data-[variant=default]/tabs-list:data-[state=active]:bg-bg group-data-[variant=default]/tabs-list:data-[state=active]:text-fg">
                    {t.label}
                    <Badge
                      variant={t.key === "attention" && counts.attention > 0 ? "danger" : t.key === "valid" ? "success" : "plain"}
                      className="ml-1 min-w-5 justify-center rounded-full px-1.5"
                    >
                      {counts[t.key]}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <p className="type-body-r-xs text-muted">Fix a record to edit it · Exclude keeps it out of this import only</p>
          </div>
        </Tabs>

        <div className="mt-3 rounded-xl border border-border">
          <Table aria-label={TABS.find((t) => t.key === tab)?.label} className="min-w-240">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">
                  <span className="sr-only">Include</span>
                </TableHead>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Content title</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Publish date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Content PIC</TableHead>
                <TableHead>Validation</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {view.items.map((item) => (
                <ReviewRowView key={item.row.sourceRow} item={item} locked={locked} onExclude={onExclude} onInclude={onInclude} onFix={onFix} />
              ))}
            </TableBody>
          </Table>
          {view.items.length === 0 && (
            <p className="px-4 py-10 text-center type-body-r-s text-muted">
              {tab === "attention" ? "Nothing needs attention." : tab === "excluded" ? "No rows are excluded." : tab === "valid" ? "No valid rows yet." : "This file has no rows."}
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 type-body-r-xs text-muted">
          <p aria-live="polite">
            {view.total === 0 ? "No rows" : `Showing ${view.from}–${view.to} of ${view.total} ${view.total === 1 ? "row" : "rows"}`}
            {counts.attention > 0 && " · issues pinned to top"}
          </p>
          <Pager page={view.page} pageCount={view.pageCount} onPage={setPage} />
        </div>
      </section>
    </div>
  );
}

function ReviewRowView({ item, locked, onExclude, onInclude, onFix }: {
  item: Classified;
  locked: boolean;
  onExclude: (sourceRow: number) => void;
  onInclude: (sourceRow: number) => void;
  onFix: (sourceRow: number) => void;
}) {
  const { row, state } = item;
  const channel = channelCell(row);
  const date = dateCell(row);
  const category = categoryLabel(row.fields.category);
  const pic = picOf(row);
  const title = row.fields.title.trim();

  return (
    <TableRow
      data-state={row.removed ? "excluded" : undefined}
      className={cn(state.needsAttention && "bg-red-50/60", row.removed && "bg-neutral-50")}
    >
      <TableCell>
        <Checkbox
          aria-label={`Include row ${row.sourceRow}`}
          checked={!row.removed}
          disabled={locked}
          onCheckedChange={(v) => (v === true ? onInclude(row.sourceRow) : onExclude(row.sourceRow))}
        />
      </TableCell>
      <TableCell className="type-mono-r-xs text-muted">{row.sourceRow}</TableCell>
      <TableCell className="max-w-72">
        <p className={cn("type-body-m-s", !title && "text-muted")}>{title || "Untitled"}</p>
        {state.note && <p className={cn("type-body-r-xs", state.needsAttention ? (state.tone === "danger" ? "text-red-600" : "text-brand-800") : "text-brand-800")}>{state.note}</p>}
      </TableCell>
      <TableCell>
        {channel.names.length === 0 ? (
          <span className="text-muted">—</span>
        ) : (
          <span className={cn("inline-flex items-center gap-2 whitespace-nowrap", channel.unreadable && "text-red-600")}>
            {channel.platforms.map((p) => <PlatformIcon key={p} platform={p} size={16} />)}
            {channel.names.join(", ")}
          </span>
        )}
      </TableCell>
      <TableCell className={cn("whitespace-nowrap", date.unreadable && "text-red-600")}>{date.text || <span className="text-muted">—</span>}</TableCell>
      <TableCell className="whitespace-nowrap">{category ?? <span className="text-muted">—</span>}</TableCell>
      <TableCell>
        {pic ? (
          <span className="inline-flex items-center gap-2">
            <Avatar size="sm">
              <AvatarFallback className="bg-brand-500 text-neutral-950">{initialsOf(pic)}</AvatarFallback>
            </Avatar>
            {pic}
          </span>
        ) : (
          <span className="text-muted">Unassigned</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={BADGE[state.tone]} className="gap-1.5">
          <span aria-hidden="true" className={cn("size-1.5 rounded-full", state.tone === "success" ? "bg-green-600" : state.tone === "danger" ? "bg-red-500" : "bg-brand-600")} />
          {state.label}
        </Badge>
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        {row.removed ? (
          <Button variant="ghost" size="sm" disabled={locked} onClick={() => onInclude(row.sourceRow)} aria-label={`Include row ${row.sourceRow}`}>
            Include
          </Button>
        ) : state.needsAttention ? (
          <Button variant="ghost" size="sm" disabled={locked} onClick={() => onFix(row.sourceRow)} aria-label={`Fix row ${row.sourceRow}`}>
            Fix
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-600" disabled={locked} onClick={() => onExclude(row.sourceRow)} aria-label={`Exclude row ${row.sourceRow}`}>
            Exclude
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
