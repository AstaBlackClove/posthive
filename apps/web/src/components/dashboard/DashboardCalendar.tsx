"use client";

import Link from "next/link";
import { CalendarDaysIcon, CloudUploadIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { ListCalendar, useCalendarPosition } from "@/components/content-list/ListCalendar";
import type { RoleView } from "@/lib/content-list";

type Props = {
  /** Today as a WIB "YYYY-MM-DD" key (from the page, so the grid never reads the browser's clock). */
  todayKey: string;
  /** Changes when a post was edited, sent or deleted: the calendar asks again. */
  version: number;
  role: RoleView;
  /** The post whose drawer is open. */
  openId: string | null;
  onOpen: (id: string) => void;
};

/**
 * The dashboard's content calendar: the Content List's calendar in a card, with a filter by channel (so the person can
 * see what goes where). Every post shows the channels it is for and the colour of its status, and a click opens its
 * drawer. With no post in the range an empty state sits over the grid, naming the range.
 */
export function DashboardCalendar({ todayKey, version, role, openId, onOpen }: Props) {
  const position = useCalendarPosition(todayKey);
  return (
    <Card aria-labelledby="calendar-title" className="gap-4 px-4 py-4">
      <h2 id="calendar-title" className="type-body-m-l text-fg">
        Content calendar
      </h2>
      <ListCalendar
        filter="all"
        position={position}
        todayKey={todayKey}
        version={version}
        role={role}
        openId={openId}
        onOpen={onOpen}
        channelFilter
        whenEmpty={(range) => (
          <EmptyState
            size="inline"
            icon={<CalendarDaysIcon />}
            title="Your calendar is empty"
            description={`Schedule your first post or import a quarter plan to fill ${range} with content.`}
            action={
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
            }
          />
        )}
      />
    </Card>
  );
}
