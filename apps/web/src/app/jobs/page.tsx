"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDaysIcon, CloudUploadIcon, KanbanIcon, ListIcon, PlusIcon, Table2Icon } from "lucide-react";
import { ContentListTable } from "@/components/content-list/ContentListTable";
import { DraftBanner } from "@/components/content-list/DraftBanner";
import { KanbanBoard } from "@/components/content-list/KanbanBoard";
import { ListCalendar, useCalendarPosition } from "@/components/content-list/ListCalendar";
import { SelectionBar } from "@/components/content-list/SelectionBar";
import { SourceCard } from "@/components/content-list/SourceCard";
import { StatusCounts } from "@/components/content-list/StatusCounts";
import { useContentActions } from "@/components/content-list/useContentActions";
import { TopbarActions } from "@/components/dashboard/Topbar";
import { EmptyState } from "@/components/EmptyState";
import { InlineAlert } from "@/components/InlineAlert";
import { Pager } from "@/components/Pager";
import { TrialUrgentBanner } from "@/components/TrialUrgentBanner";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/cn";
import { LIST_STATUS, footerLine, listSubtitle, showDraftBanner, visibleFilters, type ListFilter, type ListView } from "@/lib/content-list";
import { wibDateKey } from "@/lib/datetime";
import { useContentList } from "@/lib/useContentList";
import { usePermissions } from "@/lib/usePermissions";

/**
 * The Content List: how many posts are in each status, the posts a page at a time, and a drawer with the whole post
 * of the row that was clicked. A quarter plan lands here as drafts; the person reads them, opens one to edit it, and
 * sends them for review.
 */
export default function ContentListPage() {
  const { user } = useAuth();
  const { canEditContent, canReview, canSubmitOwn } = usePermissions();
  const now = useMemo(() => new Date(), []);
  const todayKey = wibDateKey(now);
  const calendarPosition = useCalendarPosition(todayKey);

  const [filter, setFilter] = useState<ListFilter>("all");
  const [view, setView] = useState<ListView>("table");
  const [page, setPage] = useState(1);
  const { data, source, loading, error, reload, version } = useContentList(filter, page);

  const role = { canEditContent, canReview, canSubmitOwn };
  const filters = visibleFilters(role);
  const counts = data?.counts;
  const items = data?.items ?? [];

  // Opening, ticking, sending, deleting, editing and reviewing a post: the same for the dashboard's table
  const actions = useContentActions({ rows: items, reload });

  function pick(next: ListFilter) {
    setFilter(next);
    setPage(1);
    actions.clear();
  }

  const empty = !loading && !error && counts?.all === 0;
  const subtitle = counts ? listSubtitle(counts, source) : "Loading the content of your workspace…";
  const shown = filter === "all" || !counts ? counts?.all : counts[filter];

  return (
    <div className="theme-dashboard flex-1 overflow-y-auto bg-background">
      <TrialUrgentBanner />
      <div className="mx-auto flex max-w-[110rem] flex-col gap-4 p-4 pt-16 md:p-6 md:pt-6">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between xl:gap-6">
          <div className="min-w-0">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>Content workspace</BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Content List</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="mt-3 type-display-m-6 text-fg">Content List</h1>
            <p className="mt-1 max-w-4xl type-body-r-m text-fg">{subtitle}</p>
          </div>
          <TopbarActions fullName={user?.name ?? ""} avatarUrl={user?.avatarUrl} today={now} />
        </header>

        {error && (
          <InlineAlert tone="danger" title="We couldn't load your content">
            {error}{" "}
            <button type="button" onClick={reload} className="cursor-pointer underline underline-offset-2">
              Try again
            </button>
          </InlineAlert>
        )}

        {loading && !data && (
          <div className="space-y-4" aria-busy="true" aria-label="Loading the content list">
            <Skeleton className="h-20 rounded-2xl" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        )}

        {empty && (
          <Card>
            <EmptyState
              icon={<ListIcon />}
              title="No content yet"
              description="Import a quarter plan to fill this list with drafts, or write your first post."
              action={
                canEditContent && (
                  <>
                    <Button asChild variant="olive">
                      <Link href="/jobs/import">
                        <CloudUploadIcon />
                        Import plan
                      </Link>
                    </Button>
                    <Button asChild>
                      <Link href="/compose">
                        <PlusIcon />
                        Add content
                      </Link>
                    </Button>
                  </>
                )
              }
            />
          </Card>
        )}

        {data && counts && counts.all > 0 && (
          <>
            {source && <SourceCard source={source} canImport={canEditContent} />}
            <StatusCounts counts={counts} filters={filters} active={filter} onPick={pick} />
            {showDraftBanner(counts, source) && <DraftBanner />}

            <Card className="gap-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Tabs value={filter} onValueChange={(v) => pick(v as ListFilter)} className="min-w-0 max-w-full">
                  <TabsList aria-label="Statuses" className="max-w-full flex-wrap justify-start border-0 bg-transparent p-0">
                    {(["all", ...filters] as ListFilter[]).map((f) => (
                      <TabsTrigger key={f} value={f} className="group-data-[variant=default]/tabs-list:px-4 group-data-[variant=default]/tabs-list:py-2 group-data-[variant=default]/tabs-list:data-[state=active]:bg-neutral-50 group-data-[variant=default]/tabs-list:data-[state=active]:text-fg">
                        {LIST_STATUS[f]}
                        <span className={cn("min-w-5 rounded-full px-1.5 text-center type-body-sb-xxs tabular-nums", f === "all" ? "bg-brand-500 text-neutral-950" : "bg-green-600/10 text-green-700")}>{counts[f]}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                <ToggleGroup type="single" variant="pill" value={view} onValueChange={(v) => setView(v as ListView)} aria-label="View" className="shrink-0 bg-bg">
                  <ToggleGroupItem value="kanban" aria-label="Kanban view" title="Kanban view" className="px-4 py-1.5">
                    <KanbanIcon />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="table" aria-label="Table view" title="Table view" className="px-4 py-1.5">
                    <Table2Icon />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="calendar" aria-label="Calendar view" title="Calendar view" className="px-4 py-1.5">
                    <CalendarDaysIcon />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {view === "table" && (
                <>
                  {/* @container: the table drops its Link and Caption columns when this box is narrow (the drawer has both), so Status never hides behind a scroll */}
                  <div className="@container overflow-hidden rounded-xl border border-border" aria-busy={loading}>
                    <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
                      <ContentListTable
                        items={items}
                        selected={actions.selected}
                        openId={actions.openId}
                        selectable={canEditContent}
                        firstNumber={(data.page - 1) * data.pageSize + 1}
                        onToggle={actions.toggle}
                        onToggleAll={actions.toggleAll}
                        onOpen={actions.open}
                      />
                    </div>
                    {items.length === 0 && !loading && (
                      <p className="px-4 py-10 text-center type-body-r-s text-muted-foreground">No {LIST_STATUS[filter].toLowerCase()} posts.</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 type-body-r-xs text-muted-foreground">
                    <p aria-live="polite">
                      {footerLine(items.length, shown ?? 0, filter, counts)}
                    </p>
                    <Pager page={data.page} pageCount={data.pageCount} onPage={setPage} />
                  </div>
                </>
              )}

              {view === "calendar" && (
                <ListCalendar filter={filter} counts={counts} position={calendarPosition} todayKey={todayKey} version={version} role={role} openId={actions.openId} onOpen={actions.open} />
              )}

              {view === "kanban" && (
                <KanbanBoard
                  filter={filter}
                  filters={filters}
                  counts={counts}
                  version={version}
                  openId={actions.openId}
                  onOpen={actions.open}
                  onMore={(f) => {
                    setView("table");
                    pick(f);
                  }}
                />
              )}
            </Card>

            {view === "table" && (canEditContent || canSubmitOwn) && (
              <SelectionBar
                count={actions.count}
                submittable={actions.submittable}
                canEdit={canEditContent}
                canSubmitOwn={canSubmitOwn}
                busy={actions.busy}
                onClear={actions.clear}
                onSubmit={actions.submitSelected}
                onDelete={actions.askDeleteSelected}
              />
            )}
          </>
        )}
      </div>

      {actions.layer}
    </div>
  );
}
