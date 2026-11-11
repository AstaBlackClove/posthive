// @vitest-environment jsdom
import { useState, type ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuickStartBanner } from "./QuickStartBanner";
import { PlanMarketingCard } from "./PlanMarketingCard";
import { StatGrid } from "./StatGrid";
import { ContentCalendar } from "./ContentCalendar";
import { SideColumn } from "./SideColumn";
import { ContentTable } from "./ContentTable";
import { Topbar } from "./Topbar";
import { toDashboardData, type ApiDashboard } from "@/lib/dashboard-data";
import { emptyStatusCounts } from "@/lib/content-status";
import type { ContentRow } from "./types";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

afterEach(cleanup);

const TODAY = new Date("2026-11-06T09:00:00Z"); // a Friday, in WIB too
const TODAY_KEY = "2026-11-06";

// A workspace with nothing in it, as the API would describe it, through the same code the page uses
const NOTHING: ApiDashboard = {
  quarter: { label: "Q4 2026", planned: 0, published: 0 },
  inProduction: [],
  readyToSchedule: 0,
  needAttention: 0,
  todayPosts: { count: 0, posts: [] },
  myTasks: { count: 0, posts: [] },
  lists: { upcoming: { count: 0, posts: [] }, attention: { count: 0, posts: [] }, risk: { count: 0, posts: [] }, activity: { count: 0, posts: [] } },
  channels: [],
  setup: { imported: false, created: false, accounts: 0, members: 1, invites: 0 },
};
const empty = toDashboardData({ api: NOTHING, userName: "Puteri Anggraini", brand: "Postly" });

describe("fixture: a brand-new account", () => {
  it("has nothing in it", () => {
    expect(empty.readyToSchedule + empty.published + empty.needAttention + empty.tasksToday + empty.today.count + empty.milestones.count).toBe(0);
    expect(Object.values(empty.pipeline.counts).every((n) => n === 0)).toBe(true);
    expect(empty.channels.every((c) => !c.connected && c.handle === null && c.posts === 0)).toBe(true);
    expect(Object.values(empty.tabCounts).every((n) => n === 0)).toBe(true);
  });

  it("the quarter and the quota come from the data, not from the markup", () => {
    expect(empty.plan).toEqual({ label: "Q4 2026", planned: 0 });
  });

  it("the quick-start copy names the quarter and the product", () => {
    expect(empty.quickStart[0].description).toContain("Q4 2026");
    expect(empty.quickStart[2].description).toContain("Postly");
    expect(JSON.stringify(empty.quickStart)).not.toMatch(/\{quarter\}|\{brand\}/);
  });

  it("all text is English (the design mixed in Indonesian)", () => {
    expect(JSON.stringify(empty)).not.toMatch(/Tambah|Quartal|Akun/);
  });
});

describe("Topbar", () => {
  const props = { firstName: "Puteri", brand: "Postly", fullName: "Puteri Anggraini", subtitle: "Your workspace is ready.", today: TODAY };

  it("greets by product and first name", () => {
    render(<Topbar {...props} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Welcome to Postly, Puteri");
  });

  it("a workspace with content is greeted by the time of day instead", () => {
    render(<Topbar {...props} greeting="Good morning, Puteri" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Good morning, Puteri");
  });

  it("drops the comma and name when there is no name", () => {
    render(<Topbar {...props} firstName="" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Welcome to Postly");
  });

  it("shows today's date from the clock it is given, in the Fri, 6 Nov 2026 form", () => {
    render(<Topbar {...props} />);
    expect(screen.getByText("Fri, 6 Nov 2026").tagName).toBe("TIME");
  });

  it("the avatar shows two initials", () => {
    render(<Topbar {...props} />);
    expect(screen.getByText("PA")).toBeTruthy();
  });

  it("the icon buttons are named, and search is a labelled search field", () => {
    render(<Topbar {...props} />);
    expect(screen.getByRole("button", { name: "Tips" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Notifications" })).toBeTruthy();
    expect(screen.getByRole("searchbox", { name: "Search" })).toBeTruthy();
  });
});

describe("QuickStartBanner", () => {
  it("shows the headline and the four steps as an ordered list with links that do each", () => {
    render(<QuickStartBanner steps={empty.quickStart} />);
    expect(screen.getByRole("heading", { level: 2, name: /Let's get your first campaign live/ })).toBeTruthy();
    const steps = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(steps).toHaveLength(4);
    expect(screen.getByRole("link", { name: /Import plan/ }).getAttribute("href")).toBe("/jobs/import");
    expect(screen.getByRole("link", { name: /Add content/ }).getAttribute("href")).toBe("/compose");
    expect(screen.getByRole("link", { name: /Connect channel/ }).getAttribute("href")).toBe("/accounts");
    expect(screen.getByRole("link", { name: /Invite team/ }).getAttribute("href")).toBe("/team");
  });

  it("is hidden once the account is set up, or when there are no steps", () => {
    const { container, rerender } = render(<QuickStartBanner steps={empty.quickStart} done />);
    expect(container.firstChild).toBeNull();
    rerender(<QuickStartBanner steps={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("PlanMarketingCard", () => {
  it("shows the quarter, the planned count against the quota, and both actions", () => {
    render(<PlanMarketingCard plan={empty.plan} />);
    expect(screen.getByText("Plan Marketing")).toBeTruthy();
    expect(screen.getByText("Q4 2026 · Oct – Dec")).toBeTruthy();
    expect(screen.getByText(/posts planned in Q4 2026/)).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull(); // no quota is stored anywhere, so no bar and no made-up target
    expect(screen.getByRole("link", { name: "Import plan" }).getAttribute("href")).toBe("/jobs/import");
    expect(screen.getByRole("link", { name: "Add content" }).getAttribute("href")).toBe("/compose");
  });

  it("its numbers come from the props", () => {
    render(<PlanMarketingCard plan={{ label: "Q1 2027", quota: 120, planned: 30 }} />);
    expect(screen.getByText(/\/ 120 posts planned · quota set for Q1/)).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Posts planned: 30 of 120" }).getAttribute("aria-valuenow")).toBe("25");
  });
});

describe("StatGrid", () => {
  it("shows the pipeline with six stages at 0, and the four stat cards", () => {
    render(<StatGrid data={empty} />);
    expect(screen.getByText("Production pipeline")).toBeTruthy();
    expect(screen.getAllByText("posts in progress")).toHaveLength(2); // the pipeline and "My tasks today"
    expect(within(screen.getByRole("list", { name: "Production stages" })).getAllByRole("listitem")).toHaveLength(6);
    for (const t of ["Drafts to schedule", "Published", "Need attention", "My tasks today"]) expect(screen.getByText(t)).toBeTruthy();
    expect(screen.getByText("Nothing at risk right now")).toBeTruthy();
  });

  it("the pipeline total is the sum of the six production stages only", () => {
    const counts = { ...emptyStatusCounts(), copywriting: 3, review: 2, scheduled: 9, published: 9 };
    render(<StatGrid data={{ ...empty, pipeline: { counts } }} />);
    expect(screen.getByText("5")).toBeTruthy(); // scheduled and published are not "in production"
  });

  it("Need attention changes its caption when something is at risk", () => {
    render(<StatGrid data={{ ...empty, needAttention: 3 }} />);
    expect(screen.getByText("Behind schedule or blocked")).toBeTruthy();
    expect(screen.queryByText("Nothing at risk right now")).toBeNull();
  });

  it("Need attention says what the posts are when it is told", () => {
    render(<StatGrid data={{ ...empty, needAttention: 2, needAttentionNote: "1 publish failed · 1 changes requested" }} />);
    expect(screen.getByText("1 publish failed · 1 changes requested")).toBeTruthy();
  });

  it("the two arrow buttons are named links", () => {
    render(<StatGrid data={empty} />);
    expect(screen.getByRole("link", { name: "See posts that need attention" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "See my tasks" })).toBeTruthy();
  });

  it("the totals use the quarter's quota", () => {
    render(<StatGrid data={{ ...empty, plan: { ...empty.plan, quota: 90 } }} />);
    expect(screen.getAllByText("/ 90 posts")).toHaveLength(2);
  });
});

describe("ContentCalendar", () => {
  const cells = () => screen.getAllByRole("gridcell");
  const monthNumbers = () => cells().map((c) => c.textContent);

  it("November 2026 is the grid of the design: Monday first, Oct 26 … Dec 6, today marked", () => {
    render(<ContentCalendar todayKey={TODAY_KEY} />);
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    const nums = monthNumbers();
    expect(nums).toHaveLength(42);
    expect(nums.slice(0, 7)).toEqual(["26", "27", "28", "29", "30", "31", "1"]);
    expect(nums.slice(-7)).toEqual(["30", "1", "2", "3", "4", "5", "6"]);
    const today = cells().filter((c) => c.getAttribute("data-today"));
    expect(today).toHaveLength(1);
    expect(today[0].getAttribute("aria-label")).toBe("2026-11-06");
  });

  it("days of the neighbouring months are drawn muted", () => {
    render(<ContentCalendar todayKey={TODAY_KEY} />);
    expect(cells()[0].className).toContain("text-muted-foreground");
    expect(cells()[10].className).not.toContain("text-muted-foreground");
  });

  it("the weekend has a hint of tint, today a yellow edge and a yellow number, the other days white", () => {
    render(<ContentCalendar todayKey={TODAY_KEY} />);
    // cells run Mon…Sun from Oct 26: [7] is Nov 2 (Mon), [12] Nov 7 (Sat), [13] Nov 8 (Sun)
    expect(cells()[7].className).toContain("bg-surface");
    expect(cells()[12].className).toContain("bg-bg/25");
    expect(cells()[13].className).toContain("bg-bg/25");
    expect(cells()[5].className).toContain("bg-bg/50"); // Oct 31 is a Saturday of the last month: the muted tint wins
    const today = screen.getByRole("gridcell", { name: TODAY_KEY });
    expect(today.className).toContain("bg-brand-50");
    expect(today.className).toContain("ring-brand-400");
    expect(within(today).getByText("6").className).toContain("bg-accent");
  });

  it("every cell keeps a 6px inset and may shrink, so nothing inside can push past its lines", () => {
    render(<ContentCalendar todayKey={TODAY_KEY} />);
    for (const c of cells()) {
      expect(c.className).toContain("p-1.5");
      expect(c.className).toContain("min-w-0");
    }
  });

  it("the range controls sit in the board with the grid: Today, the arrows, the month, the view switch", () => {
    render(<ContentCalendar todayKey={TODAY_KEY} />);
    const board = screen.getByRole("grid").parentElement!;
    expect(within(board).getByRole("button", { name: "Today" })).toBeTruthy();
    expect(within(board).getByRole("group", { name: "Change range" })).toBeTruthy();
    expect(within(board).getByText("November 2026")).toBeTruthy();
    expect(within(board).getByRole("radio", { name: "Month" })).toBeTruthy();
  });

  it("with no posts the empty state sits over the grid, naming the month, with both actions", () => {
    render(<ContentCalendar todayKey={TODAY_KEY} />);
    expect(screen.getByText("Your calendar is empty")).toBeTruthy();
    expect(screen.getByText(/to fill November with content/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Import plan" }).getAttribute("href")).toBe("/jobs/import");
    expect(screen.getByRole("link", { name: "Add content" }).getAttribute("href")).toBe("/compose");
  });

  it("with posts the empty state is gone", () => {
    render(<ContentCalendar todayKey={TODAY_KEY} events={[{ id: "1", title: "Launch teaser", day: "2026-11-10", time: "09:00", channels: ["instagram"], status: "scheduled" }]} />);
    expect(screen.queryByText("Your calendar is empty")).toBeNull();
  });

  // A day or a week is a short board, shorter than the card. The card used to be laid over the whole board and spilled
  // out of it, covering the arrows. jsdom has no layout, so this checks the structure that keeps it inside: the card
  // takes the grid's place in the board's own grid (which grows to the taller of the two), under the controls.
  it.each([
    ["Month", "Month"],
    ["Week", "Week"],
    ["Day", "Day"],
  ])("in the %s view the empty state shares the grid's area under the controls, so it never covers them", async (_name, view) => {
    render(<ContentCalendar todayKey={TODAY_KEY} />);
    await userEvent.click(screen.getByRole("radio", { name: view }));
    const board = screen.getByRole("grid").parentElement!;
    expect(board.className).toContain("grid");
    const card = within(board).getByText("Your calendar is empty");
    const wrapper = [...board.children].find((child) => child.contains(card)) as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.className).toContain("col-start-1");
    expect(wrapper.className).toContain("row-start-2");
    expect(wrapper.className).not.toContain("absolute");
    expect(wrapper.contains(screen.getByRole("group", { name: "Change range" }))).toBe(false);
    expect(wrapper.contains(screen.getByRole("radiogroup", { name: "View" }))).toBe(false);
    // a child with a fixed cell is placed first: the controls and the grid must have theirs too, or the grid drops to row 3
    expect(screen.getByRole("grid").className).toContain("row-start-2");
    const controls = [...board.children].find((child) => child.contains(screen.getByRole("group", { name: "Change range" }))) as HTMLElement;
    expect(controls.className).toContain("row-start-1");
  });

  it("the arrows move a month at a time and Today comes back", async () => {
    render(<ContentCalendar todayKey={TODAY_KEY} />);
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByText("December 2026")).toBeTruthy();
    expect(monthNumbers().slice(0, 7)).toEqual(["30", "1", "2", "3", "4", "5", "6"]);
    expect(screen.getByText(/to fill December with content/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Previous month" }));
    await userEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByText("October 2026")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByText("November 2026")).toBeTruthy();
  });

  it("the view switch changes the grid to a week and to a day, and the arrows follow", async () => {
    render(<ContentCalendar todayKey={TODAY_KEY} />);
    await userEvent.click(screen.getByRole("radio", { name: "Week" }));
    expect(cells()).toHaveLength(7);
    expect(monthNumbers()).toEqual(["2", "3", "4", "5", "6", "7", "8"]);
    expect(screen.getByRole("button", { name: "Next week" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Next week" }));
    expect(monthNumbers()).toEqual(["9", "10", "11", "12", "13", "14", "15"]);
    await userEvent.click(screen.getByRole("radio", { name: "Day" }));
    expect(cells()).toHaveLength(1);
    expect(screen.queryAllByRole("columnheader")).toHaveLength(0);
  });

  it("the view switch and the channel filter each keep exactly one choice", async () => {
    render(<ContentCalendar todayKey={TODAY_KEY} />);
    expect(screen.getByRole("radio", { name: "Month" }).getAttribute("aria-checked")).toBe("true");
    await userEvent.click(screen.getByRole("radio", { name: "Month" }));
    expect(screen.getByRole("radio", { name: "Month" }).getAttribute("aria-checked")).toBe("true");
    await userEvent.click(screen.getByRole("radio", { name: "LinkedIn" }));
    expect(screen.getByRole("radio", { name: "LinkedIn" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "All" }).getAttribute("aria-checked")).toBe("false");
  });

  it("has the legend, with the same names as the pipeline", () => {
    render(<ContentCalendar todayKey={TODAY_KEY} />);
    const legend = screen.getByRole("list", { name: "Status legend" });
    expect(within(legend).getByText("Changes requested")).toBeTruthy();
    expect(within(legend).getByText("Brief needed")).toBeTruthy();
    expect(within(legend).queryByText("Rejected")).toBeNull();
  });

  it("is a labelled region and a grid, and every week is a row so a screen reader can read it across", () => {
    render(<ContentCalendar todayKey={TODAY_KEY} />);
    const grid = screen.getByRole("grid", { name: "November 2026, content calendar" });
    const rows = within(grid).getAllByRole("row");
    expect(rows).toHaveLength(1 + 6); // the weekday header and six weeks
    for (const row of rows.slice(1)) expect(within(row).getAllByRole("gridcell")).toHaveLength(7);
  });
});

describe("SideColumn", () => {
  it("Today Publish is dated and counted from the data, '0 posts', not the design's '3 Post'", () => {
    render(<SideColumn data={empty} today={TODAY} />);
    expect(screen.getByText("Today Publish, 6 November")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Today Publish/ }).closest("[data-slot=card]")!.textContent).toContain("0 posts");
    expect(screen.queryByText(/3 Post/)).toBeNull();
  });

  it("says '1 post' for one", () => {
    render(<SideColumn data={{ ...empty, today: { count: 1, rows: [] } }} today={TODAY} />);
    expect(screen.getByText("1 post")).toBeTruthy();
    expect(screen.queryByText("Nothing publishing today")).toBeNull();
  });

  it("each empty panel explains itself and offers the next step", () => {
    render(<SideColumn data={empty} today={TODAY} />);
    for (const t of ["Nothing publishing today", "No tasks today", "No milestones yet"]) expect(screen.getByText(t)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Add content" }).getAttribute("href")).toBe("/compose");
    expect(screen.getByRole("link", { name: "Create milestone" }).getAttribute("href")).toBe("/jobs/import");
    expect(screen.getAllByRole("link", { name: "View all" })).toHaveLength(2);
  });

  it("an empty panel goes away when it has content", () => {
    render(<SideColumn data={{ ...empty, tasksToday: 2, milestones: { count: 1 } }} today={TODAY} />);
    expect(screen.queryByText("No tasks today")).toBeNull();
    expect(screen.queryByText("No milestones yet")).toBeNull();
  });

  it("channels: not connected, no made-up handle, the hint to connect", () => {
    render(<SideColumn data={empty} today={TODAY} />);
    expect(screen.getByText("Instagram")).toBeTruthy();
    expect(screen.getByText("LinkedIn")).toBeTruthy(); // not "Linkedin"
    expect(screen.getAllByText("Not connected")).toHaveLength(2);
    expect(screen.getAllByText("No account linked")).toHaveLength(2);
    expect(screen.queryByText(/@postly/)).toBeNull();
    expect(screen.getByText("Connect a channel to start scheduling and publishing.")).toBeTruthy();
  });

  it("the connect hint disappears when every channel is connected", () => {
    const all = empty.channels.map((c) => ({ ...c, connected: true, handle: "@x" }));
    render(<SideColumn data={{ ...empty, channels: all }} today={TODAY} />);
    expect(screen.queryByText("Connect a channel to start scheduling and publishing.")).toBeNull();
    expect(screen.queryByText("Not connected")).toBeNull();
  });
});

/** The ticks live in the page (they drive its bar), so the table gets them as props: this holds them the way the page does. */
function WithTicks(props: Omit<ComponentProps<typeof ContentTable>, "selection">) {
  const [on, setOn] = useState<ReadonlySet<string>>(new Set());
  return (
    <ContentTable
      {...props}
      selection={{
        selected: on,
        onToggle: (id) =>
          setOn((prev) => {
            const next = new Set(prev);
            if (!next.delete(id)) next.add(id);
            return next;
          }),
        onToggleAll: (ids, value) =>
          setOn((prev) => {
            const next = new Set(prev);
            for (const id of ids) {
              if (value) next.add(id);
              else next.delete(id);
            }
            return next;
          }),
      }}
    />
  );
}

describe("ContentTable", () => {
  const rows: ContentRow[] = [
    { id: "1", title: "Launch teaser", channels: ["instagram"], publishAt: "2026-11-09T02:00:00Z", owner: "Rani", production: "design", publication: "scheduled", status: "pending", approvalStatus: null },
    { id: "2", title: "Weekly tips", channels: ["linkedin"], publishAt: "2026-11-07T02:00:00Z", owner: null, production: "review", publication: "scheduled", status: "pending", approvalStatus: null },
    { id: "3", title: "Case study", channels: ["linkedin"], publishAt: null, owner: "Budi", production: "approved", publication: "scheduled", status: "pending", approvalStatus: null },
  ];
  const counts = { upcoming: 3, attention: 0, risk: 0, activity: 0 };
  const bodyTitles = () => screen.getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[1]?.textContent);

  it("empty: the header, the empty state inside the table, and 'Showing 0 of 0 posts'", () => {
    render(<ContentTable tabCounts={{ upcoming: 0, attention: 0, risk: 0, activity: 0 }} />);
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent?.trim())).toEqual(["", "Content", "Channel", "Publish date", "Owner", "Production", "Publication"]);
    expect(screen.getByText("No upcoming content yet")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Import quarter plan" }).getAttribute("href")).toBe("/jobs/import");
    expect(screen.getByRole("link", { name: "Add content" }).getAttribute("href")).toBe("/compose");
    expect(screen.getByText("Showing 0 of 0 posts")).toBeTruthy();
    expect(screen.getByText("Sorted by publish date, soonest first")).toBeTruthy();
  });

  it("the footer follows the sort the person picks", async () => {
    render(<ContentTable rows={{ upcoming: rows }} tabCounts={counts} />);
    await userEvent.click(within(screen.getByRole("columnheader", { name: /Owner/ })).getByRole("button"));
    expect(screen.getByText("Sorted by owner, A to Z")).toBeTruthy();
    expect(screen.queryByText(/publish date/)).toBeNull();
  });

  it("starts sorted by publish date, soonest first, with undated rows last", () => {
    render(<ContentTable rows={{ upcoming: rows }} tabCounts={counts} />);
    expect(bodyTitles()).toEqual(["Weekly tips", "Launch teaser", "Case study"]);
    expect(screen.getByRole("columnheader", { name: /Publish date/ }).getAttribute("aria-sort")).toBe("ascending");
  });

  it("empty: the select-all box is disabled, not checked", () => {
    render(<WithTicks tabCounts={counts} />);
    const all = screen.getByRole("checkbox", { name: "Select all rows" });
    expect((all as HTMLButtonElement).disabled).toBe(true);
    expect(all.getAttribute("aria-checked")).toBe("false");
  });

  it("the four tabs carry their counts, with the design's colours for upcoming and at risk", () => {
    render(<ContentTable tabCounts={{ upcoming: 7, attention: 2, risk: 1, activity: 9 }} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["Upcoming content7", "Need attention2", "At risk1", "Recent Activity9"]);
    expect(within(tabs[0]).getByText("7").className).toContain("bg-brand-500");
    expect(within(tabs[2]).getByText("1").className).toContain("bg-red-400");
  });

  it("each tab controls a panel that holds the table, so a screen reader links them", () => {
    render(<ContentTable tabCounts={counts} />);
    const tab = screen.getByRole("tab", { name: /Upcoming content/ });
    const panel = screen.getByRole("tabpanel");
    expect(tab.getAttribute("aria-controls")).toBe(panel.id);
    expect(within(panel).getByRole("table")).toBeTruthy();
  });

  it("switching tab changes what an empty list says", async () => {
    render(<ContentTable tabCounts={counts} />);
    await userEvent.click(screen.getByRole("tab", { name: /At risk/ }));
    expect(screen.getByText("Nothing at risk")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Import quarter plan" })).toBeNull();
  });

  it("with rows: they are listed with channel, date, owner and both statuses; a missing date or owner is a dash", () => {
    render(<ContentTable rows={{ upcoming: rows }} tabCounts={counts} />);
    expect(screen.getByText("Launch teaser")).toBeTruthy();
    expect(screen.getByText("Instagram")).toBeTruthy();
    expect(screen.getByText("In design")).toBeTruthy();
    // the publication pill names the time as well: "Scheduled · 09:00" (a post with no date says only "Scheduled")
    expect(screen.getAllByText(/^Scheduled/)).toHaveLength(3);
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.getByText("Showing 3 of 3 posts")).toBeTruthy();
    expect(screen.queryByText("No upcoming content yet")).toBeNull();
  });

  it("sorting: click a header to sort ascending, again for descending, and the column says so", async () => {
    render(<ContentTable rows={{ upcoming: rows }} tabCounts={counts} />);
    const header = () => screen.getByRole("columnheader", { name: /Content/ });
    expect(header().getAttribute("aria-sort")).toBe("none");
    await userEvent.click(within(header()).getByRole("button"));
    expect(header().getAttribute("aria-sort")).toBe("ascending");
    expect(bodyTitles()).toEqual(["Case study", "Launch teaser", "Weekly tips"]);
    await userEvent.click(within(header()).getByRole("button"));
    expect(header().getAttribute("aria-sort")).toBe("descending");
    expect(bodyTitles()).toEqual(["Weekly tips", "Launch teaser", "Case study"]);
  });

  it("rows with no date stay last when the date column is sorted either way", async () => {
    render(<ContentTable rows={{ upcoming: rows }} tabCounts={counts} />);
    const sortButton = () => within(screen.getByRole("columnheader", { name: /Publish date/ })).getByRole("button");
    // it starts ascending (see the test above); one click flips to descending
    await userEvent.click(sortButton());
    expect(screen.getByRole("columnheader", { name: /Publish date/ }).getAttribute("aria-sort")).toBe("descending");
    expect(bodyTitles()).toEqual(["Launch teaser", "Weekly tips", "Case study"]); // latest first, undated still last
    expect(screen.getByText("Sorted by publish date, latest first")).toBeTruthy();
  });

  it("sorting by owner puts rows with no owner last", async () => {
    render(<ContentTable rows={{ upcoming: rows }} tabCounts={counts} />);
    await userEvent.click(within(screen.getByRole("columnheader", { name: /Owner/ })).getByRole("button"));
    expect(bodyTitles()).toEqual(["Case study", "Launch teaser", "Weekly tips"]); // Budi, Rani, then nobody
  });

  it("selecting: a row checkbox, then select-all (indeterminate in between), then clear", async () => {
    render(<WithTicks rows={{ upcoming: rows }} tabCounts={counts} />);
    const all = screen.getByRole("checkbox", { name: "Select all rows" });
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Launch teaser" }));
    expect(screen.getByRole("checkbox", { name: "Select Launch teaser" }).getAttribute("aria-checked")).toBe("true");
    expect(all.getAttribute("aria-checked")).toBe("mixed");
    await userEvent.click(all);
    for (const r of rows) expect(screen.getByRole("checkbox", { name: `Select ${r.title}` }).getAttribute("aria-checked")).toBe("true");
    expect(all.getAttribute("aria-checked")).toBe("true");
    await userEvent.click(all);
    for (const r of rows) expect(screen.getByRole("checkbox", { name: `Select ${r.title}` }).getAttribute("aria-checked")).toBe("false");
  });

  describe("acting on a row", () => {
    it("a table with no `selection` only lists: no checkboxes, no select-all", () => {
      render(<ContentTable rows={{ upcoming: rows }} tabCounts={counts} />);
      expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
      // the first column stays, so the others do not move when the checkboxes come and go
      expect(screen.getAllByRole("columnheader")).toHaveLength(7);
    });

    it("a table with no `onOpen` has rows that are not buttons", () => {
      render(<ContentTable rows={{ upcoming: rows }} tabCounts={counts} />);
      expect(screen.queryByRole("row", { name: /^Open / })).toBeNull();
    });

    it("a click on a row opens that post; a click on its checkbox only ticks it", async () => {
      const onOpen = vi.fn();
      render(<WithTicks rows={{ upcoming: rows }} tabCounts={counts} onOpen={onOpen} />);
      await userEvent.click(screen.getByRole("checkbox", { name: "Select Launch teaser" }));
      expect(onOpen).not.toHaveBeenCalled();
      await userEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }));
      expect(onOpen).not.toHaveBeenCalled();
      await userEvent.click(screen.getByRole("row", { name: "Open Weekly tips" }));
      expect(onOpen).toHaveBeenCalledOnce();
      expect(onOpen).toHaveBeenCalledWith("2");
    });

    it("Enter or Space on a focused row opens it, Enter on the checkbox inside is the checkbox's own", async () => {
      const onOpen = vi.fn();
      render(<WithTicks rows={{ upcoming: rows }} tabCounts={counts} onOpen={onOpen} />);
      const row = screen.getByRole("row", { name: "Open Case study" });
      row.focus();
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard(" ");
      expect(onOpen).toHaveBeenCalledTimes(2);
      expect(onOpen).toHaveBeenLastCalledWith("3");
      onOpen.mockClear();
      screen.getByRole("checkbox", { name: "Select Case study" }).focus();
      await userEvent.keyboard("{Enter}");
      expect(onOpen).not.toHaveBeenCalled();
    });

    it("the row whose post is open is marked, like a ticked one", async () => {
      render(<WithTicks rows={{ upcoming: rows }} tabCounts={counts} onOpen={() => {}} openId="2" />);
      expect(screen.getByRole("row", { name: "Open Weekly tips" }).getAttribute("data-open")).toBe("true");
      expect(screen.getByRole("row", { name: "Open Launch teaser" }).getAttribute("data-open")).toBeNull();
      await userEvent.click(screen.getByRole("checkbox", { name: "Select Launch teaser" }));
      expect(screen.getByRole("row", { name: "Open Launch teaser" }).getAttribute("data-state")).toBe("selected");
    });

    it("picking another tab tells the page, which drops the ticks (a row ticked out of sight must not be deleted)", async () => {
      const onTabChange = vi.fn();
      render(<WithTicks rows={{ upcoming: rows }} tabCounts={counts} onTabChange={onTabChange} />);
      await userEvent.click(screen.getByRole("tab", { name: /At risk/ }));
      expect(onTabChange).toHaveBeenCalledWith("risk");
    });

    it("the select-all box ticks the rows of the tab that is shown, and no others", async () => {
      const seen: [string[], boolean][] = [];
      render(
        <ContentTable
          rows={{ upcoming: rows, risk: [{ ...rows[0], id: "r1", title: "Risky" }] }}
          tabCounts={counts}
          selection={{ selected: new Set(), onToggle: () => {}, onToggleAll: (ids, on) => seen.push([[...ids].sort(), on]) }}
        />
      );
      await userEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }));
      expect(seen).toEqual([[["1", "2", "3"], true]]);
    });
  });

  it("a selected row keeps its selection when the list is sorted", async () => {
    render(<WithTicks rows={{ upcoming: rows }} tabCounts={counts} />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Weekly tips" }));
    await userEvent.click(within(screen.getByRole("columnheader", { name: /Content/ })).getByRole("button"));
    expect(screen.getByRole("checkbox", { name: "Select Weekly tips" }).getAttribute("aria-checked")).toBe("true");
  });
});

describe("ContentTable: rows per tab", () => {
  const upcoming: ContentRow[] = [{ id: "u", title: "Launch teaser", channels: ["instagram", "linkedin"], publishAt: "2026-11-09T02:00:00Z", owner: "Rani", production: "approved", publication: "scheduled", status: "pending", approvalStatus: null }];
  const attention: ContentRow[] = [{ id: "a", title: "Failed post", channels: ["linkedin"], publishAt: "2026-11-05T02:00:00Z", owner: null, production: "approved", publication: "approved", status: "pending", approvalStatus: null }];
  const counts = { upcoming: 31, attention: 1, risk: 0, activity: 0 };
  const titles = () => screen.getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[1]?.textContent);

  it("each tab lists its own rows, and switching shows the other list without asking again", async () => {
    render(<ContentTable rows={{ upcoming, attention }} tabCounts={counts} />);
    expect(titles()).toEqual(["Launch teaser"]);
    await userEvent.click(screen.getByRole("tab", { name: /Need attention/ }));
    expect(titles()).toEqual(["Failed post"]);
  });

  it("the footer says the true total when the list is cut: 'Showing 1 of 31'", () => {
    render(<ContentTable rows={{ upcoming }} tabCounts={counts} />);
    expect(screen.getByText("Showing 1 of 31 posts")).toBeTruthy();
  });

  it("a tab with no rows is its own empty state, whatever the other tabs hold", async () => {
    render(<ContentTable rows={{ upcoming }} tabCounts={counts} />);
    await userEvent.click(screen.getByRole("tab", { name: /At risk/ }));
    expect(screen.getByText("Nothing at risk")).toBeTruthy();
  });

  it("sorting by channel puts a post with no channel last, either way", async () => {
    const none: ContentRow = { id: "n", title: "Plan row", channels: [], publishAt: null, owner: null, production: "brief", publication: null, status: "draft", approvalStatus: null };
    render(<ContentTable rows={{ upcoming: [none, ...upcoming] }} tabCounts={counts} />);
    const sort = () => within(screen.getByRole("columnheader", { name: /Channel/ })).getByRole("button");
    await userEvent.click(sort());
    expect(titles()).toEqual(["Launch teaser", "Plan row"]);
    await userEvent.click(sort());
    expect(titles()).toEqual(["Launch teaser", "Plan row"]);
  });

  it("a draft's publication is 'Not scheduled', never a stage it has not reached", () => {
    const draft: ContentRow = { id: "d", title: "A draft", channels: ["instagram"], publishAt: null, owner: null, production: "brief", publication: null, status: "draft", approvalStatus: null };
    render(<ContentTable rows={{ upcoming: [draft] }} tabCounts={counts} />);
    expect(screen.getByText("Not scheduled")).toBeTruthy();
    expect(screen.getAllByText("Brief needed")).toHaveLength(1);
  });

  it("a post that goes to more than one channel lists each, one above the other; one with no channel yet shows a dash", () => {
    const none: ContentRow = { id: "n", title: "Plan row", channels: [], publishAt: null, owner: null, production: "brief", publication: null, status: "draft", approvalStatus: null };
    render(<ContentTable rows={{ upcoming: [...upcoming, none] }} tabCounts={counts} />);
    const cells = screen.getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[2]);
    expect(within(cells[0]).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Instagram", "LinkedIn"]);
    expect(cells[1].textContent).toBe("—");
  });

  it("shows the category under the title, the date with its weekday and time, and the owner as 'Putri A.'", () => {
    const row: ContentRow = { id: "c", title: "Geo Dashboard", channels: ["linkedin"], category: "Industry insight", publishAt: "2026-11-13T07:00:00Z", owner: "Putri Anggraini", production: "approved", publication: "scheduled", status: "pending", approvalStatus: null };
    render(<ContentTable rows={{ upcoming: [row] }} tabCounts={counts} todayKey="2026-11-13" />);
    expect(screen.getByText("Industry insight")).toBeTruthy();
    expect(screen.getByText("Fri 13 Nov · 14:00")).toBeTruthy();
    expect(screen.getByText("Putri A.")).toBeTruthy();
  });

  it("the row of today is marked and its publication says 'today 14:00'; another day does not", () => {
    const at = (id: string, iso: string): ContentRow => ({ id, title: `Post ${id}`, channels: ["instagram"], publishAt: iso, owner: null, production: "approved", publication: "scheduled", status: "pending", approvalStatus: null });
    render(<ContentTable rows={{ upcoming: [at("a", "2026-11-13T07:00:00Z"), at("b", "2026-11-17T02:00:00Z")] }} tabCounts={counts} todayKey="2026-11-13" />);
    expect(screen.getByText("Scheduled · today 14:00")).toBeTruthy();
    expect(screen.getByText("Scheduled · 09:00")).toBeTruthy();
    const rowsOf = screen.getAllByRole("row").slice(1);
    expect(rowsOf[0].getAttribute("data-today")).toBe("true");
    expect(rowsOf[1].getAttribute("data-today")).toBeNull();
  });

  it("a title as long as a paragraph stays inside its cell: cut to two lines, whole in the tooltip", () => {
    const long = "Geospatial ".repeat(60).trim();
    render(<ContentTable rows={{ upcoming: [{ id: "l", title: long, channels: ["instagram"], publishAt: null, owner: null, production: "brief", publication: null, status: "draft", approvalStatus: null }] }} tabCounts={counts} />);
    expect(screen.getByTitle(long).className).toContain("line-clamp-2");
  });
});

describe("SideColumn: today's posts and tasks", () => {
  const row = (id: string, title: string, patch: Partial<ContentRow> = {}): ContentRow => ({ id, title, channels: ["instagram"], publishAt: "2026-11-06T02:00:00Z", owner: "Putri", production: "approved", publication: "scheduled", status: "pending", approvalStatus: null, ...patch });

  it("lists today's posts with channel, time and status, and says how many more there are", () => {
    render(<SideColumn data={{ ...empty, today: { count: 3, rows: [row("1", "Launch teaser"), row("2", "Weekly tips")] } }} today={TODAY} />);
    expect(screen.getByText("Launch teaser")).toBeTruthy();
    expect(screen.getAllByText("Instagram · 09:00 WIB")).toHaveLength(2);
    expect(screen.getAllByText("Approved").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Scheduled today · ready to publish")).toHaveLength(2);
    expect(screen.getByText("and 1 more")).toBeTruthy();
    expect(screen.queryByText("Nothing publishing today")).toBeNull();
  });

  it("a panel lists three posts at most and counts the rest, whatever the page sent", () => {
    const five = [1, 2, 3, 4, 5].map((n) => row(String(n), `Post ${n}`));
    render(<SideColumn data={{ ...empty, today: { count: 5, rows: five }, tasksToday: 5, taskRows: five }} today={TODAY} />);
    expect(screen.getAllByText(/^Post \d$/)).toHaveLength(6); // three in each panel
    expect(screen.getAllByText("and 2 more")).toHaveLength(2);
  });

  it("a title is one line with the whole of it in the tooltip: a paragraph or an address cannot widen the panel", () => {
    const long = "https://braga.example/posts/" + "geospatial-".repeat(30);
    render(<SideColumn data={{ ...empty, today: { count: 1, rows: [row("1", long)] } }} today={TODAY} />);
    const title = screen.getByTitle(long);
    expect(title.className).toContain("truncate");
    // every box above the title may shrink below its content, or `truncate` has nothing to cut against
    expect(title.closest("[data-slot=item-content]")!.className).toContain("min-w-0");
    expect(title.closest("[data-slot=item-title]")!.className).toContain("min-w-0");
    expect(screen.getByRole("heading", { name: /Today Publish/ }).closest("[data-slot=card]")!.parentElement!.className).toContain("min-w-0");
  });

  it("a failed post says so and what to do; a post waiting for review says it is waiting", () => {
    render(<SideColumn data={{ ...empty, today: { count: 2, rows: [row("1", "Broke", { publication: "failed" }), row("2", "Waiting", { production: "review", publication: null })] } }} today={TODAY} />);
    expect(screen.getByText("Publishing failed · needs a retry")).toBeTruthy();
    expect(screen.getByText("Waiting for approval")).toBeTruthy();
  });

  it("shows the post's own picture when it has one", () => {
    const { container } = render(<SideColumn data={{ ...empty, today: { count: 1, rows: [row("1", "With picture", { thumbnail: "/uploads/a.png" })] } }} today={TODAY} />);
    const imgs = [...container.querySelectorAll("[data-slot=item-media] img")];
    expect(imgs.some((i) => i.getAttribute("src")?.endsWith("/uploads/a.png"))).toBe(true);
  });

  it("a picture that cannot be loaded (the file was deleted) gives way to the channel's icon", () => {
    const { container } = render(<SideColumn data={{ ...empty, today: { count: 1, rows: [row("1", "Gone picture", { thumbnail: "/uploads/gone.png" })] } }} today={TODAY} />);
    const media = () => container.querySelector("[data-slot=item-media]")!;
    const img = media().querySelector("img")!;
    expect(img.getAttribute("src")).toContain("/uploads/gone.png");
    fireEvent.error(img);
    expect(media().querySelector("img[src*='gone.png']")).toBeNull();
    // the icon of the post's channel is what is left in the box
    expect(media().querySelector("img, svg")).toBeTruthy();
  });

  it("the tasks panel is counted in its title and says when each is due", () => {
    render(<SideColumn data={{ ...empty, tasksToday: 3, taskRows: [row("9", "My draft", { production: "brief", publication: null })] }} today={TODAY} />);
    expect(screen.getByText("My draft")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Today's tasks · 3" })).toBeTruthy();
    expect(screen.getByText("Due 09:00 WIB · Instagram")).toBeTruthy();
    expect(screen.queryByText("No tasks today")).toBeNull();
  });

  it("Add Content sits under a panel that has posts; an empty one has only its own button", () => {
    const { rerender } = render(<SideColumn data={{ ...empty, today: { count: 1, rows: [row("1", "Launch teaser")] } }} today={TODAY} />);
    expect(screen.getByRole("link", { name: "Add Content" }).getAttribute("href")).toBe("/compose");
    rerender(<SideColumn data={empty} today={TODAY} />);
    expect(screen.getAllByRole("link", { name: /Add content/i })).toHaveLength(1);
  });

  it("a connected channel says Connected, and the quarter's posts are counted across them", () => {
    const channels = [{ platform: "instagram", handle: "@braga.geo", connected: true, posts: 3 }, { platform: "linkedin", handle: null, connected: false, posts: 0 }];
    render(<SideColumn data={{ ...empty, plan: { label: "Q4 2026", planned: 12 }, channels }} today={TODAY} />);
    expect(screen.getByText("Connected")).toBeTruthy();
    expect(screen.getByText("Not connected")).toBeTruthy();
    expect(screen.getByText("12 posts planned across 1 connected channel this quarter.")).toBeTruthy();
  });

  it("with no tasks it explains what counts as one", () => {
    render(<SideColumn data={empty} today={TODAY} />);
    expect(screen.getByText("No tasks today")).toBeTruthy();
    expect(screen.getByText(/Your own posts scheduled for today/)).toBeTruthy();
  });
});

describe("ContentCalendar: events", () => {
  const ev = (id: string, day: string, channels: string[], status: "scheduled" | "published" | "brief" = "scheduled") => ({ id, title: `Post ${id}`, day, time: "09:00", channels, status });
  const cell = (day: string) => screen.getByRole("gridcell", { name: day });

  it("draws each post on its day with its status named for a screen reader", () => {
    render(<ContentCalendar todayKey={TODAY_KEY} events={[ev("1", "2026-11-10", ["instagram"])]} />);
    expect(within(cell("2026-11-10")).getByText("Post 1")).toBeTruthy();
    expect(within(cell("2026-11-11")).queryByText("Post 1")).toBeNull();
    expect(within(cell("2026-11-10")).getByTitle(/Post 1 · Scheduled · Instagram/)).toBeTruthy();
  });

  it("a post is one pill: its dot, its time and its title in the soft tint of its status", () => {
    render(<ContentCalendar todayKey={TODAY_KEY} events={[ev("1", "2026-11-10", ["instagram"], "published")]} />);
    const pill = within(cell("2026-11-10")).getByText("Post 1").parentElement!;
    expect(pill.textContent).toContain("09:00");
    expect(pill.className).toContain("rounded-md");
    expect(pill.className).toContain("bg-brand-100"); // published: the yellow tint
    expect(pill.className).toContain("min-w-0");
  });

  it("a title as long as a paragraph, or an address with no spaces, is cut with an ellipsis inside the cell, never wider than it", () => {
    const long = "https://braga.example.com/a/very/long/address/with/no/spaces/at/all/to/break/on?utm=1";
    render(<ContentCalendar todayKey={TODAY_KEY} events={[{ ...ev("1", "2026-11-10", ["instagram"]), title: long }]} />);
    const title = within(cell("2026-11-10")).getByText(long);
    expect(title.className).toContain("truncate");
    expect(title.className).toContain("min-w-0");
    // every box between the title and the cell may shrink: the list does not wrap (a wrapping column is as wide as its text)
    const list = title.closest("ul")!;
    expect(list.className).toContain("sm:flex-nowrap");
    expect(title.closest("li")!.className).toContain("min-w-0");
    expect(title.parentElement!.className).toContain("min-w-0");
  });

  it("shows three posts a day when there are three, and no '+N more'", () => {
    const three = [1, 2, 3].map((n) => ev(String(n), "2026-11-10", ["instagram"]));
    render(<ContentCalendar todayKey={TODAY_KEY} events={three} />);
    expect(within(cell("2026-11-10")).getAllByText(/^Post \d$/)).toHaveLength(3);
    expect(within(cell("2026-11-10")).queryByText(/more/)).toBeNull();
  });

  it("with more than three it shows two and '+N more' as the third line, as the design does", () => {
    const many = [1, 2, 3, 4, 5].map((n) => ev(String(n), "2026-11-10", ["instagram"]));
    render(<ContentCalendar todayKey={TODAY_KEY} events={many} />);
    expect(within(cell("2026-11-10")).getAllByText(/^Post \d$/)).toHaveLength(2);
    expect(within(cell("2026-11-10")).getByText("+3", { exact: false }).textContent).toBe("+3 more");
  });

  it("the day view lists every post of the day", async () => {
    const many = [1, 2, 3, 4, 5].map((n) => ev(String(n), "2026-11-06", ["instagram"]));
    render(<ContentCalendar todayKey={TODAY_KEY} events={many} />);
    await userEvent.click(screen.getByRole("radio", { name: "Day" }));
    expect(within(cell("2026-11-06")).getAllByText(/^Post \d$/)).toHaveLength(5);
  });

  it("the channel filter keeps only that channel's posts, and the empty state returns when none is left", async () => {
    render(<ContentCalendar todayKey={TODAY_KEY} events={[ev("1", "2026-11-10", ["instagram"]), ev("2", "2026-11-11", ["linkedin"])]} />);
    await userEvent.click(screen.getByRole("radio", { name: "LinkedIn" }));
    expect(screen.queryByText("Post 1")).toBeNull();
    expect(screen.getByText("Post 2")).toBeTruthy();
    cleanup();
    render(<ContentCalendar todayKey={TODAY_KEY} events={[ev("1", "2026-11-10", ["instagram"])]} />);
    await userEvent.click(screen.getByRole("radio", { name: "LinkedIn" }));
    expect(screen.getByText("Your calendar is empty")).toBeTruthy();
  });

  it("a post that goes to two channels shows under either", async () => {
    render(<ContentCalendar todayKey={TODAY_KEY} events={[ev("1", "2026-11-10", ["linkedin", "instagram"])]} />);
    await userEvent.click(screen.getByRole("radio", { name: "Instagram" }));
    expect(screen.getByText("Post 1")).toBeTruthy();
  });

  it("another channel a post goes to gets a filter button of its own", () => {
    render(<ContentCalendar todayKey={TODAY_KEY} events={[ev("1", "2026-11-10", ["mastodon"])]} />);
    expect(screen.getByRole("radio", { name: "Mastodon" })).toBeTruthy();
  });

  it("the picked channel stays in the filter when the next month has none of its posts", async () => {
    const { rerender } = render(<ContentCalendar todayKey={TODAY_KEY} events={[ev("1", "2026-11-10", ["mastodon"])]} />);
    await userEvent.click(screen.getByRole("radio", { name: "Mastodon" }));
    rerender(<ContentCalendar todayKey={TODAY_KEY} events={[]} />);
    expect(screen.getByRole("radio", { name: "Mastodon" }).getAttribute("aria-checked")).toBe("true");
  });

  it("while a range loads there is no 'calendar is empty' message", () => {
    render(<ContentCalendar todayKey={TODAY_KEY} events={[]} loading />);
    expect(screen.queryByText("Your calendar is empty")).toBeNull();
  });

  describe("posts that were loaded for other days than the grid shows", () => {
    const NOVEMBER = { from: "2026-10-26", to: "2026-12-06" }; // the six weeks of the grid on TODAY_KEY
    const DECEMBER = { from: "2026-11-30", to: "2027-01-03" };

    it("an answer for the days on screen with no posts is an empty calendar", () => {
      render(<ContentCalendar todayKey={TODAY_KEY} events={[]} eventsRange={NOVEMBER} />);
      expect(screen.getByText("Your calendar is empty")).toBeTruthy();
    });

    it("an answer for other days says nothing about these ones: no empty message", () => {
      render(<ContentCalendar todayKey={TODAY_KEY} events={[]} eventsRange={DECEMBER} />);
      expect(screen.queryByText("Your calendar is empty")).toBeNull();
    });

    it("nothing has come yet (null): no empty message", () => {
      render(<ContentCalendar todayKey={TODAY_KEY} events={[]} eventsRange={null} />);
      expect(screen.queryByText("Your calendar is empty")).toBeNull();
    });

    it("the person moves the grid before the page has asked: the old empty answer does not carry over to the new days", async () => {
      render(<ContentCalendar todayKey={TODAY_KEY} events={[]} eventsRange={NOVEMBER} />);
      expect(screen.getByText("Your calendar is empty")).toBeTruthy();
      await userEvent.click(screen.getByRole("button", { name: "Next month" }));
      expect(screen.queryByText("Your calendar is empty")).toBeNull();
    });

    it("the same for a change of view", async () => {
      render(<ContentCalendar todayKey={TODAY_KEY} events={[]} eventsRange={NOVEMBER} />);
      await userEvent.click(screen.getByRole("radio", { name: "Week" }));
      expect(screen.queryByText("Your calendar is empty")).toBeNull();
    });
  });

  it("says when the server cut the range short", () => {
    render(<ContentCalendar todayKey={TODAY_KEY} events={[ev("1", "2026-11-10", ["instagram"])]} truncated />);
    expect(screen.getByRole("status").textContent).toContain("more posts than the calendar can show");
  });

  it("tells the page which days it shows now, and again when the person moves it", async () => {
    const onRangeChange = vi.fn();
    render(<ContentCalendar todayKey={TODAY_KEY} onRangeChange={onRangeChange} />);
    expect(onRangeChange).toHaveBeenLastCalledWith("2026-10-26", "2026-12-06");
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(onRangeChange).toHaveBeenLastCalledWith("2026-11-30", "2027-01-03");
    await userEvent.click(screen.getByRole("radio", { name: "Week" }));
    expect(onRangeChange).toHaveBeenLastCalledWith("2026-11-30", "2026-12-06");
  });
});
