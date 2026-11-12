"use client";

import { useCallback, useMemo, useState } from "react";
import { RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineAlert } from "@/components/InlineAlert";
import { useAuth } from "@/context/AuthContext";
import { BRAND } from "@/lib/brand";
import { wibDateKey } from "@/lib/datetime";
import { firstName, greetingFor } from "@/lib/dashboard-format";
import { subtitleOf, toDashboardData } from "@/lib/dashboard-data";
import { useDashboard } from "@/lib/useDashboard";
import { useDashboardRows } from "@/lib/useDashboardRows";
import { usePermissions } from "@/lib/usePermissions";
import { SelectionBar } from "@/components/content-list/SelectionBar";
import { useContentActions } from "@/components/content-list/useContentActions";
import { DashboardCalendar } from "@/components/dashboard/DashboardCalendar";
import { ContentTable } from "@/components/dashboard/ContentTable";
import { PlanMarketingCard } from "@/components/dashboard/PlanMarketingCard";
import { QuickStartBanner } from "@/components/dashboard/QuickStartBanner";
import { SideColumn } from "@/components/dashboard/SideColumn";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { Topbar } from "@/components/dashboard/Topbar";

// The dashboard of the active workspace: what is planned, in production, scheduled and published.
// Three states: the numbers (also while they refresh), a skeleton while the first answer is on its way,
// and, when there never was one, only the alert (no zeroes that would pass for a real answer).
// "use client": it reads the signed-in user, and the calendar and table are interactive.
export default function DashboardPage() {
  const { user } = useAuth();
  const { canAccess, canEditContent, canReview, canSubmitOwn } = usePermissions();

  const now = useMemo(() => new Date(), []);
  const todayKey = wibDateKey(now);
  const { data: api, loading, error, reload } = useDashboard();

  const data = api ? toDashboardData({ api, userName: user?.name ?? "", brand: BRAND.name, canAccess }) : null;
  // The table shows ten rows of one tab; the rows keep their identity between renders (TanStack rebuilds its rows when they change)
  const table = useDashboardRows(api);
  const rows = useMemo(() => ({ [table.tab]: table.rows }), [table.tab, table.rows]);

  // The table and the calendar act on a post as the Content List does: the same drawer, bar and dialogs. After a change the
  // numbers and the calendar are asked again (the calendar when `version` changes), so they never show a post that was
  // deleted or sent a moment ago.
  const [version, setVersion] = useState(0);
  const afterChange = useCallback(() => {
    reload();
    setVersion((v) => v + 1);
  }, [reload]);
  // Only the rows on screen can be ticked: keepGone: false drops a tick whose row left the table, so a page turn never
  // leaves a post ticked out of sight for Delete to reach (a tab change also clears at once, below)
  const actions = useContentActions({ rows: table.rows, reload: afterChange, keepGone: false });

  // A workspace with posts in it is greeted by the time of day, as in the design; a brand-new one is welcomed
  const hasContent = Boolean(api && (api.quarter.planned > 0 || api.setup.imported || api.setup.created));
  const first = firstName(user?.name);
  const greeting = hasContent ? `${greetingFor(now)}${first ? `, ${first}` : ""}` : undefined;
  let subtitle = "Loading your workspace…";
  if (api) subtitle = subtitleOf(api);
  else if (!loading) subtitle = "We couldn't load your workspace.";

  return (
    // The shell clips its content, so the page scrolls inside this box
    <div className="theme-dashboard flex-1 overflow-y-auto bg-background">
      <div className="mx-auto flex max-w-[110rem] flex-col gap-4 p-4 pt-16 md:p-6 md:pt-6">
        <Topbar
          greeting={greeting}
          firstName={first}
          fullName={user?.name ?? ""}
          avatarUrl={user?.avatarUrl}
          brand={BRAND.name}
          subtitle={subtitle}
          today={now}
        />

        {error && (
          <InlineAlert tone="danger" title={api ? "Couldn't refresh the dashboard" : "Couldn't load the dashboard"}>
            {error}{" "}
            <Button variant="link" size="sm" className="inline-flex h-auto p-0" onClick={reload}>
              <RefreshCwIcon /> Try again
            </Button>
            {api && " Showing what was loaded before."}
          </InlineAlert>
        )}

        {!data && loading && (
          <div aria-busy="true" aria-label="Loading the dashboard" className="space-y-3">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
            </div>
          </div>
        )}

        {data && (
          <>
            <QuickStartBanner steps={data.quickStart} done={data.quickStartDone} title={data.quickStartTitle} />

            {/* grid-cols-1 is minmax(0, 1fr): without it the single column is as wide as its widest content (a long title) and the page scrolls sideways */}
            <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="flex min-w-0 flex-col gap-3">
                <PlanMarketingCard plan={data.plan} />
                <StatGrid data={data} />
                <DashboardCalendar
                  todayKey={todayKey}
                  version={version}
                  role={{ canEditContent, canReview, canSubmitOwn }}
                  openId={actions.openId}
                  onOpen={actions.open}
                />
              </div>
              <SideColumn data={data} today={now} canImport={canAccess("/jobs/import")} />
            </div>

            <ContentTable
              rows={rows}
              tabCounts={data.tabCounts}
              todayKey={todayKey}
              // A designer reviews from the drawer and has no checkboxes: nothing for them to delete or send in bulk
              selection={canEditContent ? { selected: actions.selected, onToggle: actions.toggle, onToggleAll: actions.toggleAll } : undefined}
              onOpen={actions.open}
              openId={actions.openId}
              // a row ticked on a tab that is no longer shown must not be deleted unseen
              onTabChange={(tab) => {
                actions.clear();
                table.pickTab(tab);
              }}
              paging={{ page: table.page, pageCount: table.pageCount, loading: table.loading, onPage: table.setPage }}
            />
            {table.error && (
              <InlineAlert tone="danger" title="We couldn't load that page of content">
                {table.error}{" "}
                <Button variant="link" size="sm" className="inline-flex h-auto p-0" onClick={table.retry}>
                  <RefreshCwIcon /> Try again
                </Button>
              </InlineAlert>
            )}

            {(canEditContent || canSubmitOwn) && (
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
