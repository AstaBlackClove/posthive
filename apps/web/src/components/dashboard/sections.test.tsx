// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuickStartBanner } from "./QuickStartBanner";
import { PlanMarketingCard } from "./PlanMarketingCard";
import { StatGrid } from "./StatGrid";
import { ContentCalendar } from "./ContentCalendar";
import { SideColumn } from "./SideColumn";
import { ContentTable } from "./ContentTable";
import { Topbar } from "./Topbar";
import { emptyDashboard, quarterLabel, QUARTER_QUOTA } from "@/app/dashboard/fixtures";
import { emptyStatusCounts } from "@/lib/content-status";
import type { ContentRow } from "./types";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

afterEach(cleanup);

const TODAY = new Date("2026-11-06T09:00:00Z"); // a Friday, in WIB too
const TODAY_KEY = "2026-11-06";
const empty = emptyDashboard({ userName: "Puteri Anggraini", brand: "Postly", todayKey: TODAY_KEY });

describe("fixture: a brand-new account", () => {
  it("has nothing in it", () => {
    expect(empty.rows).toEqual([]);
    expect(empty.readyToSchedule + empty.published + empty.needAttention + empty.tasksToday + empty.today.count + empty.milestones.count).toBe(0);
    expect(Object.values(empty.pipeline.counts).every((n) => n === 0)).toBe(true);
    expect(empty.channels.every((c) => !c.connected && c.handle === null && c.posts === 0)).toBe(true);
    expect(Object.values(empty.tabCounts).every((n) => n === 0)).toBe(true);
  });

  it("the quarter and the quota come from the data, not from the markup", () => {
    expect(empty.plan).toEqual({ label: "Q4 2026", quota: QUARTER_QUOTA, planned: 0 });
    expect(quarterLabel("2027-02-10")).toBe("Q1 2027");
    expect(quarterLabel("2026-04-01")).toBe("Q2 2026");
    expect(quarterLabel("2026-09-30")).toBe("Q3 2026");
    expect(quarterLabel("2026-12-31")).toBe("Q4 2026");
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
    expect(screen.getByRole("link", { name: /Import planning/ }).getAttribute("href")).toBe("/jobs/import");
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
    expect(screen.getByText("Q4 2026")).toBeTruthy();
    expect(screen.getByText(/\/ 60 posts planned · quota set for Q4/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Import planning" }).getAttribute("href")).toBe("/jobs/import");
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
    for (const t of ["Ready to schedule", "Published", "Need attention", "My tasks today"]) expect(screen.getByText(t)).toBeTruthy();
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

  it("with no posts the empty state sits over the grid, naming the month, with both actions", () => {
    render(<ContentCalendar todayKey={TODAY_KEY} />);
    expect(screen.getByText("Your calendar is empty")).toBeTruthy();
    expect(screen.getByText(/to fill November with content/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Import plan" }).getAttribute("href")).toBe("/jobs/import");
    expect(screen.getByRole("link", { name: "Add content" }).getAttribute("href")).toBe("/compose");
  });

  it("with posts the empty state is gone", () => {
    render(<ContentCalendar todayKey={TODAY_KEY} postCount={3} />);
    expect(screen.queryByText("Your calendar is empty")).toBeNull();
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

  it("has the legend with the calendar's names", () => {
    render(<ContentCalendar todayKey={TODAY_KEY} />);
    const legend = screen.getByRole("list", { name: "Status legend" });
    expect(within(legend).getByText("Rejected")).toBeTruthy();
    expect(within(legend).queryByText("Changes requested")).toBeNull();
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
    render(<SideColumn data={{ ...empty, today: { count: 1 } }} today={TODAY} />);
    expect(screen.getByText("1 post")).toBeTruthy();
    expect(screen.queryByText("Nothing publishing today")).toBeNull();
  });

  it("each empty panel explains itself and offers the next step", () => {
    render(<SideColumn data={empty} today={TODAY} />);
    for (const t of ["Nothing publishing today", "No tasks yet", "No milestones yet"]) expect(screen.getByText(t)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Add content" }).getAttribute("href")).toBe("/compose");
    expect(screen.getByRole("link", { name: "Create milestone" }).getAttribute("href")).toBe("/jobs/import");
    expect(screen.getAllByRole("link", { name: "View all" })).toHaveLength(2);
  });

  it("an empty panel goes away when it has content", () => {
    render(<SideColumn data={{ ...empty, tasksToday: 2, milestones: { count: 1 } }} today={TODAY} />);
    expect(screen.queryByText("No tasks yet")).toBeNull();
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

describe("ContentTable", () => {
  const rows: ContentRow[] = [
    { id: "1", title: "Launch teaser", channel: "instagram", publishAt: "2026-11-09T02:00:00Z", owner: "Rani", production: "design", publication: "scheduled" },
    { id: "2", title: "Weekly tips", channel: "linkedin", publishAt: "2026-11-07T02:00:00Z", owner: null, production: "review", publication: "scheduled" },
    { id: "3", title: "Case study", channel: "linkedin", publishAt: null, owner: "Budi", production: "approved", publication: "scheduled" },
  ];
  const counts = { upcoming: 3, attention: 0, risk: 0, activity: 0 };
  const bodyTitles = () => screen.getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[1]?.textContent);

  it("empty: the header, the empty state inside the table, and 'Showing 0 of 0'", () => {
    render(<ContentTable tabCounts={{ upcoming: 0, attention: 0, risk: 0, activity: 0 }} />);
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent?.trim())).toEqual(["", "Content", "Channel", "Publish date", "Owner", "Production", "Publication"]);
    expect(screen.getByText("No upcoming content yet")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Import quarter plan" }).getAttribute("href")).toBe("/jobs/import");
    expect(screen.getByRole("link", { name: "Add content" }).getAttribute("href")).toBe("/compose");
    expect(screen.getByText("Showing 0 of 0")).toBeTruthy();
    expect(screen.getByText("Sorted by publish date, soonest first")).toBeTruthy();
  });

  it("the footer follows the sort the person picks", async () => {
    render(<ContentTable rows={rows} tabCounts={counts} />);
    await userEvent.click(within(screen.getByRole("columnheader", { name: /Owner/ })).getByRole("button"));
    expect(screen.getByText("Sorted by owner, A to Z")).toBeTruthy();
    expect(screen.queryByText(/publish date/)).toBeNull();
  });

  it("starts sorted by publish date, soonest first, with undated rows last", () => {
    render(<ContentTable rows={rows} tabCounts={counts} />);
    expect(bodyTitles()).toEqual(["Weekly tips", "Launch teaser", "Case study"]);
    expect(screen.getByRole("columnheader", { name: /Publish date/ }).getAttribute("aria-sort")).toBe("ascending");
  });

  it("empty: the select-all box is disabled, not checked", () => {
    render(<ContentTable tabCounts={counts} />);
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
    render(<ContentTable rows={rows} tabCounts={counts} />);
    expect(screen.getByText("Launch teaser")).toBeTruthy();
    expect(screen.getByText("Instagram")).toBeTruthy();
    expect(screen.getByText("In design")).toBeTruthy();
    expect(screen.getAllByText("Scheduled")).toHaveLength(3);
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.getByText("Showing 3 of 3")).toBeTruthy();
    expect(screen.queryByText("No upcoming content yet")).toBeNull();
  });

  it("sorting: click a header to sort ascending, again for descending, and the column says so", async () => {
    render(<ContentTable rows={rows} tabCounts={counts} />);
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
    render(<ContentTable rows={rows} tabCounts={counts} />);
    const sortButton = () => within(screen.getByRole("columnheader", { name: /Publish date/ })).getByRole("button");
    // it starts ascending (see the test above); one click flips to descending
    await userEvent.click(sortButton());
    expect(screen.getByRole("columnheader", { name: /Publish date/ }).getAttribute("aria-sort")).toBe("descending");
    expect(bodyTitles()).toEqual(["Launch teaser", "Weekly tips", "Case study"]); // latest first, undated still last
    expect(screen.getByText("Sorted by publish date, latest first")).toBeTruthy();
  });

  it("sorting by owner puts rows with no owner last", async () => {
    render(<ContentTable rows={rows} tabCounts={counts} />);
    await userEvent.click(within(screen.getByRole("columnheader", { name: /Owner/ })).getByRole("button"));
    expect(bodyTitles()).toEqual(["Case study", "Launch teaser", "Weekly tips"]); // Budi, Rani, then nobody
  });

  it("selecting: a row checkbox, then select-all (indeterminate in between), then clear", async () => {
    render(<ContentTable rows={rows} tabCounts={counts} />);
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

  it("a selected row keeps its selection when the list is sorted", async () => {
    render(<ContentTable rows={rows} tabCounts={counts} />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Weekly tips" }));
    await userEvent.click(within(screen.getByRole("columnheader", { name: /Content/ })).getByRole("button"));
    expect(screen.getByRole("checkbox", { name: "Select Weekly tips" }).getAttribute("aria-checked")).toBe("true");
  });
});
