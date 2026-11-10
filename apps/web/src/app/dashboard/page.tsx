"use client";

import { useMemo } from "react";
import { RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineAlert } from "@/components/InlineAlert";
import { useAuth } from "@/context/AuthContext";
import { BRAND } from "@/lib/brand";
import { wibDateKey } from "@/lib/datetime";
import { firstName } from "@/lib/dashboard-format";
import { rowsByTab, toDashboardData } from "@/lib/dashboard-data";
import { useCalendar, useDashboard } from "@/lib/useDashboard";
import { usePermissions } from "@/lib/usePermissions";
import { ContentCalendar } from "@/components/dashboard/ContentCalendar";
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
  const { canAccess } = usePermissions();

  const now = useMemo(() => new Date(), []);
  const todayKey = wibDateKey(now);
  const { data: api, loading, error, reload } = useDashboard();
  const calendar = useCalendar();

  const data = api ? toDashboardData({ api, userName: user?.name ?? "", brand: BRAND.name, canAccess }) : null;
  // The table's rows must keep their identity between renders (TanStack rebuilds its rows when they change)
  const rows = useMemo(() => (api ? rowsByTab(api) : undefined), [api]);

  let subtitle = "Your workspace is ready — plan your first posts and they'll show up here.";
  if (!api) subtitle = loading ? "Loading your workspace…" : "We couldn't load your workspace.";
  else if (api.quarter.planned > 0) subtitle = `Here is where ${api.quarter.label} stands.`;

  return (
    // The shell clips its content, so the page scrolls inside this box
    <div className="theme-dashboard flex-1 overflow-y-auto bg-background">
      <div className="mx-auto flex max-w-[110rem] flex-col gap-4 p-4 pt-16 md:p-6 md:pt-6">
        <Topbar
          firstName={firstName(user?.name)}
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

            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="flex min-w-0 flex-col gap-3">
                <PlanMarketingCard plan={data.plan} />
                <StatGrid data={data} />
                <ContentCalendar
                  todayKey={todayKey}
                  events={calendar.events}
                  loading={calendar.loading}
                  truncated={calendar.truncated}
                  error={calendar.error}
                  onRetry={calendar.retry}
                  onRangeChange={calendar.setRange}
                />
              </div>
              <SideColumn data={data} today={now} />
            </div>

            <ContentTable rows={rows} tabCounts={data.tabCounts} />
          </>
        )}
      </div>
    </div>
  );
}
