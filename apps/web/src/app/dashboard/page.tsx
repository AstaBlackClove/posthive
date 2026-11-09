"use client";

import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { BRAND } from "@/lib/brand";
import { wibDateKey } from "@/lib/datetime";
import { firstName } from "@/lib/dashboard-format";
import { ContentCalendar } from "@/components/dashboard/ContentCalendar";
import { ContentTable } from "@/components/dashboard/ContentTable";
import { PlanMarketingCard } from "@/components/dashboard/PlanMarketingCard";
import { QuickStartBanner } from "@/components/dashboard/QuickStartBanner";
import { SideColumn } from "@/components/dashboard/SideColumn";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { Topbar } from "@/components/dashboard/Topbar";
import { emptyDashboard } from "./fixtures";

// The dashboard of a brand-new account. The sections take DashboardData; until the API has plan,
// pipeline and channel numbers, a fresh account is the fixture's empty dashboard.
// "use client": it reads the signed-in user, and the calendar and the table are interactive.
export default function DashboardPage() {
  const { user } = useAuth();
  const now = useMemo(() => new Date(), []);
  const todayKey = wibDateKey(now);
  const data = useMemo(
    () => emptyDashboard({ userName: user?.name ?? "", brand: BRAND.name, todayKey }),
    [user?.name, todayKey]
  );

  return (
    // The shell clips its content, so the page scrolls inside this box
    <div className="theme-dashboard flex-1 overflow-y-auto bg-background">
      <div className="mx-auto flex max-w-[110rem] flex-col gap-4 p-4 pt-16 md:p-6 md:pt-6">
        <Topbar
          firstName={firstName(user?.name)}
          fullName={user?.name ?? ""}
          avatarUrl={user?.avatarUrl}
          brand={BRAND.name}
          subtitle="Your workspace is ready — plan your first posts and they'll show up here."
          today={now}
        />

        <QuickStartBanner steps={data.quickStart} done={data.quickStartDone} />

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex min-w-0 flex-col gap-3">
            <PlanMarketingCard plan={data.plan} />
            <StatGrid data={data} />
            <ContentCalendar todayKey={todayKey} postCount={data.rows.length} />
          </div>
          <SideColumn data={data} today={now} />
        </div>

        <ContentTable rows={data.rows} tabCounts={data.tabCounts} />
      </div>
    </div>
  );
}
