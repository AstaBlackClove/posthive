// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApiDashboard, ApiPost } from "@/lib/dashboard-data";
import type { ListItem } from "@/lib/content-list";
import type { CalendarAnswer } from "@/lib/useContentList";

const h = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  role: "member" as string,
  workspace: "ws-1",
  workspaceLoading: false,
  approvalRequired: false,
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api", () => ({ apiFetch: h.apiFetch, assetUrl: (u: string) => u }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: { name: "Putri Anggraini", avatarUrl: null, role: h.role } }) }));
vi.mock("@/context/WorkspaceContext", () => ({
  useWorkspace: () => ({ activeWorkspace: h.workspaceLoading ? null : { id: h.workspace, role: h.role, approvalRequired: h.approvalRequired }, loading: h.workspaceLoading }),
}));
vi.mock("@/components/Toast", () => ({ useToast: () => h.toast }));
// The dialogs have their own tests; here only that the page hands them the right post
vi.mock("@/components/EditPostDialog", () => ({ EditPostDialog: ({ job }: { job: { id: string } }) => <div role="dialog" aria-label="edit dialog">{job.id}</div> }));
vi.mock("@/components/ReviewDialog", () => ({ ReviewDialog: ({ job }: { job: { id: string } }) => <div role="dialog" aria-label="review dialog">{job.id}</div> }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

import DashboardPage from "./page";

const post = (patch: Partial<ApiPost> = {}): ApiPost => ({
  id: "p1", title: "5 Habits", status: "pending", approvalStatus: null, scheduledFor: "2099-03-10T02:00:00.000Z",
  channels: ["instagram"], owner: "Putri", category: null, thumbnail: null, ...patch,
});

const dashboard = (patch: Partial<ApiDashboard> = {}): ApiDashboard => ({
  quarter: { label: "Q4 2026", planned: 12, published: 5, milestones: [], uncategorized: 0 },
  inProduction: [{ status: "draft", approvalStatus: null, count: 4 }, { status: "draft", approvalStatus: "pending", count: 2 }],
  readyToSchedule: 2,
  needAttention: 1,
  todayPosts: { count: 2, posts: [post({ id: "t1", title: "Today post" })] },
  myTasks: { count: 1, posts: [post({ id: "m1", title: "My own draft" })] },
  lists: {
    upcoming: { count: 31, posts: [post({ id: "u1", title: "Launch teaser" })] },
    attention: { count: 1, posts: [post({ id: "a1", title: "Failed post", status: "failed" })] },
    risk: { count: 0, posts: [] },
    activity: { count: 9, posts: [post({ id: "x1", title: "Recent change" })] },
  },
  channels: [{ platform: "instagram", accounts: 1, handle: "@postly.studio", posts: 4 }],
  setup: { imported: true, created: true, accounts: 1, members: 2, invites: 0 },
  ...patch,
});

/** A post of /dashboard as the row /jobs/calendar sends for it: the calendar is the Content List's. */
const listItem = (p: ApiPost): ListItem => ({
  id: p.id, status: p.status, approvalStatus: p.approvalStatus, scheduledFor: p.scheduledFor, title: p.title, caption: "",
  channels: p.channels, sourceRow: null, link: null, designCopy: "", category: p.category,
});
const calendar = (posts: ApiPost[], range: { from: string; to: string }, truncated = false): CalendarAnswer => ({ ...range, items: posts.map(listItem), truncated, next: null, prev: null });

/** Route each path to an answer; the calendar can be answered per range. */
function serve(
  dash: ApiDashboard | Error,
  cal: (from: string, to: string) => CalendarAnswer | Promise<CalendarAnswer> = (from, to) => calendar([], { from, to }),
  /** Anything else the page may ask (the drawer, the actions): a path answers with its value; unknown paths still fail the test. */
  other: (path: string, init?: { method?: string; body?: string }) => unknown = (path) => {
    throw new Error(`unexpected ${path}`);
  }
) {
  h.apiFetch.mockImplementation(async (path: string, init?: { method?: string; body?: string }) => {
    if (path === "/dashboard") {
      if (dash instanceof Error) throw dash;
      return dash;
    }
    const m = path.match(/^\/jobs\/calendar\?filter=all&from=([\d-]+)&to=([\d-]+)$/);
    if (m) return cal(m[1], m[2]);
    return other(path, init);
  });
}

beforeEach(() => {
  h.apiFetch.mockReset();
  h.role = "member";
  h.workspace = "ws-1";
  h.workspaceLoading = false;
  h.approvalRequired = false;
  h.toast.success.mockReset();
  h.toast.error.mockReset();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-09T05:00:00Z"));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const calls = (prefix: string) => h.apiFetch.mock.calls.filter((c) => String(c[0]).startsWith(prefix));

describe("dashboard page: real data", () => {
  it("shows a loading state first, and no quick start flashes while it loads", async () => {
    serve(dashboard());
    render(<DashboardPage />);
    expect(screen.getByLabelText("Loading the dashboard").getAttribute("aria-busy")).toBe("true");
    expect(screen.queryByText("Let's get your first campaign live")).toBeNull();
    expect(await screen.findByText("Plan Marketing")).toBeTruthy();
    expect(screen.queryByLabelText("Loading the dashboard")).toBeNull();
  });

  it("fills the sections with what the workspace holds", async () => {
    serve(dashboard());
    render(<DashboardPage />);
    await screen.findByText("Plan Marketing");
    expect(screen.getByText("posts planned in Q4 2026").previousElementSibling!.textContent).toBe("12");
    expect(screen.getByText("Published this quarter").closest("[data-slot=card]")!.textContent).toContain("5");
    expect(screen.getByText("Dated drafts with a channel, not yet scheduled").closest("[data-slot=card]")!.textContent).toContain("2");
    expect(screen.getByText("Launch teaser")).toBeTruthy();
    expect(screen.getByText("Today post")).toBeTruthy();
    expect(screen.getByText("My own draft")).toBeTruthy();
    expect(screen.getByText("@postly.studio")).toBeTruthy();
    expect(screen.getByText("Showing 1 of 31 posts")).toBeTruthy();
    // the fixture's one post for today is scheduled for 09:00 WIB
    expect(screen.getByText("12 posts planned in Q4 2026 · 1 post goes live today at 09:00.")).toBeTruthy();
  });

  it("greets a workspace that has posts by the time of day, and a brand-new one with a welcome", async () => {
    serve(dashboard());
    const { unmount } = render(<DashboardPage />);
    await screen.findByText("Plan Marketing");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/^Good (morning|afternoon|evening), Putri$/);
    unmount();

    serve(dashboard({ quarter: { label: "Q4 2026", planned: 0, published: 0, milestones: [], uncategorized: 0 }, setup: { imported: false, created: false, accounts: 0, members: 1, invites: 0 }, todayPosts: { count: 0, posts: [] }, myTasks: { count: 0, posts: [] } }));
    render(<DashboardPage />);
    await screen.findByText("Plan Marketing");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Welcome to Postly, Putri");
    expect(screen.getByText("Your workspace is ready — plan your first posts and they'll show up here.")).toBeTruthy();
  });

  it("the pipeline counts the drafts by stage", async () => {
    serve(dashboard());
    render(<DashboardPage />);
    await screen.findByText("Plan Marketing");
    const stages = within(screen.getByRole("list", { name: "Production stages" })).getAllByRole("listitem").map((li) => li.textContent);
    expect(stages).toEqual(["Brief needed4", "Copywriting0", "In design0", "In review2", "Changes requested0", "Approved0"]);
  });

  it("the tabs carry the true totals and each shows its own rows", async () => {
    serve(dashboard());
    render(<DashboardPage />);
    await screen.findByText("Plan Marketing");
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Upcoming content31", "Need attention1", "At risk0", "Recent Activity9"]);
    await userEvent.click(screen.getByRole("tab", { name: /Need attention/ }));
    expect(screen.getByText("Failed post")).toBeTruthy();
    expect(screen.queryByText("Launch teaser")).toBeNull();
    await userEvent.click(screen.getByRole("tab", { name: /Recent Activity/ }));
    expect(screen.getByText("Recent change")).toBeTruthy();
    expect(calls("/dashboard").filter((c) => c[0] === "/dashboard")).toHaveLength(1); // switching tab asks nothing
  });

  it("asks for the workspace once, and for the calendar of the days the grid shows: six weeks of November", async () => {
    serve(dashboard());
    render(<DashboardPage />);
    await screen.findByText("Plan Marketing");
    await waitFor(() => expect(calls("/jobs/calendar")).toHaveLength(1));
    expect(calls("/jobs/calendar")[0][0]).toBe("/jobs/calendar?filter=all&from=2026-10-26&to=2026-12-06");
  });

  it("asks for the workspace exactly once, even when the workspace list arrives after the first draw", async () => {
    h.workspaceLoading = true;
    serve(dashboard());
    const { rerender } = render(<DashboardPage />);
    await screen.findByText("Plan Marketing");
    h.workspaceLoading = false;
    rerender(<DashboardPage />);
    await Promise.resolve();
    expect(h.apiFetch.mock.calls.filter((c) => c[0] === "/dashboard")).toHaveLength(1);
  });

  it("an account with posts shows no 'brand-new account' message and a set-up one has no quick start", async () => {
    serve(dashboard());
    render(<DashboardPage />);
    await screen.findByText("Plan Marketing");
    expect(screen.queryByText(/Your workspace is ready/)).toBeNull();
    expect(screen.queryByText("Let's get your first campaign live")).toBeNull();
  });

  it("a workspace with nothing planned is the welcome screen, with the quick start", async () => {
    serve(dashboard({
      quarter: { label: "Q4 2026", planned: 0, published: 0, milestones: [], uncategorized: 0 },
      setup: { imported: false, created: false, accounts: 0, members: 1, invites: 0 },
      lists: { upcoming: { count: 0, posts: [] }, attention: { count: 0, posts: [] }, risk: { count: 0, posts: [] }, activity: { count: 0, posts: [] } },
      todayPosts: { count: 0, posts: [] }, myTasks: { count: 0, posts: [] }, channels: [], inProduction: [], readyToSchedule: 0, needAttention: 0,
    }));
    render(<DashboardPage />);
    expect(await screen.findByText("Let's get your first campaign live")).toBeTruthy();
    expect(screen.getByText(/Your workspace is ready/)).toBeTruthy();
    expect(screen.getByText("Nothing publishing today")).toBeTruthy();
  });

  it("a designer is not sent to steps their role cannot open: with nothing else to do the banner is gone", async () => {
    h.role = "designer";
    serve(dashboard({ setup: { imported: false, created: false, accounts: 0, members: 1, invites: 0 } }));
    render(<DashboardPage />);
    await screen.findByText("Plan Marketing");
    expect(screen.queryByText("Let's get your first campaign live")).toBeNull();
  });

  it("the quarter milestones are the categories the server counted, each with how much of its plan is out", async () => {
    serve(dashboard({
      quarter: {
        label: "Q4 2026", planned: 20, published: 6, uncategorized: 2,
        milestones: [{ category: "Product Features", planned: 15, posted: 6, scheduled: 4 }, { category: "Internal Event", planned: 3, posted: 3, scheduled: 0 }],
      },
    }));
    render(<DashboardPage />);
    await screen.findByText("Plan Marketing");
    const panel = within(screen.getByRole("heading", { name: "Quarter milestones" }).closest("[data-slot=card]") as HTMLElement);
    expect(panel.getByRole("progressbar", { name: "Product Features" }).getAttribute("aria-valuetext")).toBe("6 of 15 posted, 4 scheduled");
    expect(panel.getByRole("progressbar", { name: "Internal Event" }).getAttribute("aria-valuenow")).toBe("3");
    expect(panel.getByText("Target reached")).toBeTruthy();
    expect(panel.getByText("2 posts this quarter have no content category, so they are not in these bars.")).toBeTruthy();
    expect(panel.queryByText("No milestones yet")).toBeNull();
  });

  it("a quarter with no categorized post says no milestones yet, and Marketing is offered the import", async () => {
    serve(dashboard());
    render(<DashboardPage />);
    await screen.findByText("Plan Marketing");
    const panel = within(screen.getByRole("heading", { name: "Quarter milestones" }).closest("[data-slot=card]") as HTMLElement);
    expect(panel.getByText("No milestones yet")).toBeTruthy();
    expect(panel.getByRole("link", { name: "Import quarter plan" }).getAttribute("href")).toBe("/jobs/import");
  });

  it("a designer sees the milestones but is not sent to an import page they cannot open", async () => {
    h.role = "designer";
    serve(dashboard());
    render(<DashboardPage />);
    await screen.findByText("Plan Marketing");
    const panel = within(screen.getByRole("heading", { name: "Quarter milestones" }).closest("[data-slot=card]") as HTMLElement);
    expect(panel.getByText("No milestones yet")).toBeTruthy();
    expect(panel.queryByRole("link", { name: "Import quarter plan" })).toBeNull();
  });
});

describe("dashboard page: failure", () => {
  it("when the numbers cannot be loaded it says so and offers to try again, and draws no zeroes that look like a real answer", async () => {
    serve(new Error("Network down"));
    render(<DashboardPage />);
    expect(await screen.findByText("Couldn't load the dashboard")).toBeTruthy();
    expect(screen.getByText(/Network down/)).toBeTruthy();
    expect(screen.getByText("We couldn't load your workspace.")).toBeTruthy();
    expect(screen.queryByLabelText("Loading the dashboard")).toBeNull();
    // a workspace we know nothing about is not shown as brand new, nor with 0 posts planned
    expect(screen.queryByText("Let's get your first campaign live")).toBeNull();
    expect(screen.queryByText("Plan Marketing")).toBeNull();
    expect(screen.queryByText("Your calendar is empty")).toBeNull();
    expect(screen.queryByText("No upcoming content yet")).toBeNull();
  });

  it("Try again asks once more, and the dashboard then shows the data", async () => {
    serve(new Error("Network down"));
    render(<DashboardPage />);
    await screen.findByText("Couldn't load the dashboard");
    serve(dashboard());
    await userEvent.click(screen.getByRole("button", { name: /Try again/ }));
    expect(await screen.findByText("Launch teaser")).toBeTruthy();
    expect(screen.queryByText("Couldn't load the dashboard")).toBeNull();
  });
});

describe("dashboard page: the calendar", () => {
  it("draws the posts of the range on their WIB day", async () => {
    serve(dashboard(), (from, to) => calendar([post({ id: "c1", title: "Cal post", scheduledFor: "2026-11-10T02:00:00.000Z" })], { from, to }));
    render(<DashboardPage />);
    await screen.findByText("Plan Marketing");
    const cell = await screen.findByRole("gridcell", { name: "Tue, 10 Nov 2026" });
    expect(await within(cell).findByText("Cal post")).toBeTruthy();
  });

  it("moving to the next month asks for that range", async () => {
    serve(dashboard());
    render(<DashboardPage />);
    await screen.findByText("Plan Marketing");
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    await waitFor(() => expect(calls("/jobs/calendar")).toHaveLength(2));
    expect(calls("/jobs/calendar")[1][0]).toBe("/jobs/calendar?filter=all&from=2026-11-30&to=2027-01-03");
  });

  it("an answer that comes back after the person moved on is dropped: November's posts never show on December", async () => {
    let releaseNovember: (a: CalendarAnswer) => void = () => {};
    serve(dashboard(), (from, to) =>
      from === "2026-10-26"
        ? new Promise<CalendarAnswer>((resolve) => { releaseNovember = resolve; })
        : calendar([post({ id: "dec", title: "December post", scheduledFor: "2026-12-10T02:00:00.000Z" })], { from, to })
    );
    render(<DashboardPage />);
    await screen.findByText("Plan Marketing");
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(await screen.findByText("December post")).toBeTruthy();
    // November's answer arrives late
    releaseNovember(calendar([post({ id: "nov", title: "November post", scheduledFor: "2026-12-02T02:00:00.000Z" })], { from: "2026-10-26", to: "2026-12-06" }));
    await Promise.resolve();
    await Promise.resolve();
    expect(screen.queryByText("November post")).toBeNull();
    expect(screen.getByText("December post")).toBeTruthy();
  });

  it("a calendar that fails leaves the rest of the dashboard alone, says so, and does not call the month empty", async () => {
    serve(dashboard(), () => { throw new Error("calendar down"); });
    render(<DashboardPage />);
    expect(await screen.findByText("Launch teaser")).toBeTruthy();
    expect(screen.queryByText("Couldn't load the dashboard")).toBeNull();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("We couldn't load the posts of this range");
    expect(alert.textContent).toContain("calendar down");
    expect(screen.queryByText("Your calendar is empty")).toBeNull();
  });

  it("Try again on a failed range asks for the same range once more", async () => {
    let fail = true;
    serve(dashboard(), (from, to) => {
      if (fail) throw new Error("calendar down");
      return calendar([post({ id: "c1", title: "Cal post", scheduledFor: "2026-11-10T02:00:00.000Z" })], { from, to });
    });
    render(<DashboardPage />);
    await screen.findByRole("alert");
    fail = false;
    await userEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Cal post")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(calls("/jobs/calendar").map((c) => c[0])).toEqual(Array(2).fill("/jobs/calendar?filter=all&from=2026-10-26&to=2026-12-06"));
  });

  it("while the first range loads the calendar is not called empty", async () => {
    serve(dashboard(), () => new Promise<CalendarAnswer>(() => {}));
    render(<DashboardPage />);
    await screen.findByText("Plan Marketing");
    expect(screen.queryByText("Your calendar is empty")).toBeNull();
  });

  it("every post shows the channels it goes to, so the calendar says where each one will be posted", async () => {
    serve(dashboard(), (from, to) => calendar([
      post({ id: "both", title: "On both", channels: ["linkedin", "instagram"], scheduledFor: "2026-11-10T02:00:00.000Z" }),
      post({ id: "li", title: "LinkedIn only", channels: ["linkedin"], scheduledFor: "2026-11-11T02:00:00.000Z" }),
    ], { from, to }));
    render(<DashboardPage />);
    const both = await screen.findByRole("button", { name: "Open 09:00 On both, Ready to Publish" });
    expect([...both.querySelectorAll("img")].map((i) => i.getAttribute("alt"))).toEqual(["linkedin", "instagram"]);
    expect([...screen.getByRole("button", { name: "Open 09:00 LinkedIn only, Ready to Publish" }).querySelectorAll("img")].map((i) => i.getAttribute("alt"))).toEqual(["linkedin"]);
  });

  it("the channel filter keeps the posts that go to the channel picked, and asks the server for nothing", async () => {
    serve(dashboard(), (from, to) => calendar([
      post({ id: "ig", title: "Instagram post", channels: ["instagram"], scheduledFor: "2026-11-10T02:00:00.000Z" }),
      post({ id: "li", title: "LinkedIn post", channels: ["linkedin"], scheduledFor: "2026-11-11T02:00:00.000Z" }),
    ], { from, to }));
    render(<DashboardPage />);
    await screen.findByText("Instagram post");
    const before = calls("/jobs/calendar").length;
    await userEvent.click(within(screen.getByRole("radiogroup", { name: "Channel" })).getByRole("radio", { name: "LinkedIn" }));
    expect(screen.queryByText("Instagram post")).toBeNull();
    expect(screen.getByText("LinkedIn post")).toBeTruthy();
    expect(calls("/jobs/calendar")).toHaveLength(before);
  });

  it("a click on a post opens its drawer, even a post the table below does not list", async () => {
    serve(dashboard(), (from, to) => calendar([post({ id: "c1", title: "Only on the calendar", scheduledFor: "2026-11-10T02:00:00.000Z" })], { from, to }), (path) => {
      if (path === "/accounts") return [];
      if (path === "/templates") return { templates: [] };
      if (path === "/jobs/c1/detail") return { id: "c1", status: "pending", approvalStatus: null, scheduledFor: "2026-11-10T02:00:00.000Z", title: "Only on the calendar", caption: "", channels: ["instagram"], sourceRow: null, link: null, designCopy: "", category: null, pillar: null, owner: null, accounts: [], captionLength: 0, commentText: null, media: [], reviewNote: null, source: null, activity: [], mine: true, missing: [] };
      throw new Error(`unexpected ${path}`);
    });
    render(<DashboardPage />);
    expect(screen.queryByRole("row", { name: "Open Only on the calendar" })).toBeNull();
    await userEvent.click(await screen.findByRole("button", { name: /^Open 09:00 Only on the calendar/ }));
    expect(await screen.findByRole("heading", { name: "Only on the calendar" })).toBeTruthy();
    expect(calls("/jobs/c1/detail")).toHaveLength(1);
  });

  it("the legend names the statuses the chips use", async () => {
    serve(dashboard());
    render(<DashboardPage />);
    await screen.findByText("Plan Marketing");
    const legend = screen.getByRole("list", { name: "Status legend" });
    expect(within(legend).getAllByRole("listitem").map((i) => i.textContent)).toEqual(["Draft", "In Review", "Revision Required", "Ready to Publish", "Published", "Failed"]);
  });

  it("Today brings the calendar back to this month", async () => {
    serve(dashboard());
    render(<DashboardPage />);
    await screen.findByText("Plan Marketing");
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(await screen.findByRole("heading", { name: "December 2026" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(await screen.findByRole("heading", { name: "November 2026" })).toBeTruthy();
  });

  it("tells the person when the range was cut short", async () => {
    serve(dashboard(), (from, to) => calendar([post({ id: "c1", title: "Cal post", scheduledFor: "2026-11-10T02:00:00.000Z" })], { from, to }, true));
    render(<DashboardPage />);
    await screen.findByText("Cal post");
    expect(screen.getByText(/more posts than the calendar can show/)).toBeTruthy();
  });
});

/**
 * Moving the grid is two renders and an effect before the page knows it is waiting. A message that is on the page
 * for one render is gone before an assertion can look, so this records every node that was ever added.
 */
function watchForText(text: string) {
  let appeared = false;
  const look = (records: MutationRecord[]) => {
    for (const r of records) r.addedNodes.forEach((n) => { if (n.textContent?.includes(text)) appeared = true; });
  };
  const observer = new MutationObserver(look);
  observer.observe(document.body, { childList: true, subtree: true });
  return {
    appeared: () => {
      look(observer.takeRecords());
      observer.disconnect();
      return appeared;
    },
  };
}

describe("dashboard page: moving the calendar over a month that has posts", () => {
  const nov = post({ id: "nov", title: "November post", scheduledFor: "2026-11-10T02:00:00.000Z" });

  /** November answers at once; any other range waits until the test lets it go, with `posts`. */
  function serveHeld(posts: ApiPost[]) {
    let release: () => void = () => {};
    serve(dashboard(), (from, to) =>
      from === "2026-10-26"
        ? calendar([nov], { from, to })
        : new Promise<CalendarAnswer>((resolve) => { release = () => resolve(calendar(posts, { from, to })); })
    );
    return () => release();
  }

  it("never says the calendar is empty on the way to the next month", async () => {
    const release = serveHeld([post({ id: "dec", title: "December post", scheduledFor: "2026-12-10T02:00:00.000Z" })]);
    render(<DashboardPage />);
    await screen.findByText("November post");
    const watch = watchForText("Your calendar is empty");
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    release();
    expect(await screen.findByText("December post")).toBeTruthy();
    expect(watch.appeared()).toBe(false);
  });

  it("never says the calendar is empty on the way from Month to Week", async () => {
    const release = serveHeld([post({ id: "thu", title: "Thursday post", scheduledFor: "2026-11-12T02:00:00.000Z" })]);
    render(<DashboardPage />);
    await screen.findByText("November post");
    const watch = watchForText("Your calendar is empty");
    await userEvent.click(screen.getByRole("radio", { name: "Week" }));
    release();
    expect(await screen.findByText("Thursday post")).toBeTruthy();
    expect(watch.appeared()).toBe(false);
  });

  it("names the whole range it is empty for: the week and the day too, not the first word of their names", async () => {
    serve(dashboard());
    render(<DashboardPage />);
    expect(await screen.findByText("Schedule your first post or import a quarter plan to fill November 2026 with content.")).toBeTruthy();
    await userEvent.click(screen.getByRole("radio", { name: "Week" }));
    expect(await screen.findByText("Schedule your first post or import a quarter plan to fill 9 – 15 Nov 2026 with content.")).toBeTruthy();
    await userEvent.click(screen.getByRole("radio", { name: "Day" }));
    expect(await screen.findByText("Schedule your first post or import a quarter plan to fill Monday, 9 Nov 2026 with content.")).toBeTruthy();
  });

  it("still says it when the month it arrives at really has no posts", async () => {
    serve(dashboard(), (from, to) => calendar(from === "2026-10-26" ? [nov] : [], { from, to }));
    render(<DashboardPage />);
    await screen.findByText("November post");
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(await screen.findByText("Your calendar is empty")).toBeTruthy();
  });
});

describe("dashboard page: acting on the content list", () => {
  // two drafts (one plain, one in review) and a scheduled post, under "Upcoming content"; the failed post is under "Need attention"
  const acting = () =>
    dashboard({
      lists: {
        upcoming: {
          count: 3,
          posts: [
            post({ id: "d1", title: "Plain draft", status: "draft", scheduledFor: "2026-11-12T02:00:00.000Z" }),
            post({ id: "d2", title: "Draft in review", status: "draft", approvalStatus: "pending", scheduledFor: "2026-11-13T02:00:00.000Z" }),
            post({ id: "s1", title: "Scheduled post", status: "pending", scheduledFor: "2026-11-14T02:00:00.000Z" }),
          ],
        },
        attention: { count: 1, posts: [post({ id: "a1", title: "Failed post", status: "failed" })] },
        risk: { count: 0, posts: [] },
        activity: { count: 0, posts: [] },
      },
    });

  const detail = (id: string) => ({
    id, status: "draft", approvalStatus: null, scheduledFor: "2026-11-12T02:00:00.000Z", title: "Plain draft", caption: "A caption", channels: ["instagram"],
    sourceRow: null, link: null, designCopy: "", category: null, pillar: null, owner: null, accounts: [], captionLength: 9, commentText: null, media: [],
    reviewNote: null, source: null, activity: [], mine: true, missing: [],
  });

  /** The dashboard with every request answered: the drawer, the lookups and the bulk actions. */
  function serveActions() {
    serve(acting(), undefined, (path, init) => {
      if (path === "/accounts") return [];
      if (path === "/templates") return { templates: [] };
      if (path.endsWith("/detail")) return detail(path.split("/")[2]);
      if (path === "/jobs/bulk") return { deleted: 2 };
      if (path === "/jobs/submit-bulk") return { submitted: ["d1"], skipped: [] };
      if (init?.method === "DELETE") return {};
      throw new Error(`unexpected ${path}`);
    });
  }

  const bar = () => screen.queryByRole("region", { name: "Selected posts" });
  const asked = (path: string, method?: string) => h.apiFetch.mock.calls.filter((c) => c[0] === path && (method === undefined || c[1]?.method === method)).length;
  const calendarCalls = () => h.apiFetch.mock.calls.filter((c) => String(c[0]).startsWith("/jobs/calendar")).length;
  const bodyOf = (path: string) => JSON.parse(h.apiFetch.mock.calls.find((c) => c[0] === path)![1].body);

  it("there is no bar until a row is ticked; then it shows how many and Delete, and Clear takes it away", async () => {
    serveActions();
    render(<DashboardPage />);
    await screen.findByText("Plain draft");
    expect(bar()).toBeNull();
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Plain draft" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Scheduled post" }));
    expect(within(bar()!).getByText(/2 selected/)).toBeTruthy();
    expect(within(bar()!).getByRole("button", { name: "Delete 2" })).toBeTruthy();
    await userEvent.click(within(bar()!).getByRole("button", { name: "Clear" }));
    expect(bar()).toBeNull();
  });

  it("the bar is a child of the page's column, after the table, so it can stick to the bottom of what scrolls", async () => {
    serveActions();
    render(<DashboardPage />);
    await userEvent.click(await screen.findByRole("checkbox", { name: "Select Plain draft" }));
    const region = bar()!;
    expect(region.className).toContain("sticky");
    // the same parent as the table's section (the page's column that scrolls), and after it
    const table = screen.getByRole("region", { name: "Content list" });
    expect(region.parentElement).toBe(table.parentElement);
    expect(table.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("Delete asks first, then deletes the ticked posts, and asks for the numbers and the calendar again", async () => {
    serveActions();
    render(<DashboardPage />);
    await userEvent.click(await screen.findByRole("checkbox", { name: "Select Plain draft" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Scheduled post" }));
    await userEvent.click(within(bar()!).getByRole("button", { name: "Delete 2" }));
    expect(await screen.findByText("Delete 2 posts?")).toBeTruthy();
    expect(asked("/jobs/bulk")).toBe(0);
    const dashboardBefore = asked("/dashboard");
    const calendarBefore = calendarCalls();
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(asked("/jobs/bulk", "DELETE")).toBe(1));
    expect(bodyOf("/jobs/bulk")).toEqual({ ids: ["d1", "s1"] });
    await waitFor(() => expect(h.toast.success).toHaveBeenCalledWith("Deleted 2 posts."));
    await waitFor(() => expect(asked("/dashboard")).toBeGreaterThan(dashboardBefore));
    await waitFor(() => expect(calendarCalls()).toBeGreaterThan(calendarBefore));
    expect(bar()).toBeNull();
  });

  it("a click on a row opens that post in the drawer", async () => {
    serveActions();
    render(<DashboardPage />);
    await userEvent.click(await screen.findByRole("row", { name: "Open Plain draft" }));
    expect(await screen.findByRole("heading", { name: "Plain draft" })).toBeTruthy();
    expect(asked("/jobs/d1/detail")).toBe(1);
  });

  it("picking another tab drops the ticks: a row ticked out of sight is never deleted", async () => {
    serveActions();
    render(<DashboardPage />);
    await userEvent.click(await screen.findByRole("checkbox", { name: "Select Plain draft" }));
    expect(bar()).toBeTruthy();
    await userEvent.click(screen.getByRole("tab", { name: /Need attention/ }));
    expect(bar()).toBeNull();
    await userEvent.click(screen.getByRole("tab", { name: /Upcoming content/ }));
    expect(screen.getByRole("checkbox", { name: "Select Plain draft" }).getAttribute("aria-checked")).toBe("false");
  });

  it("where drafts go through review, only the plain draft is sent: 'Submit 1 of 2 for review' posts that one", async () => {
    h.approvalRequired = true;
    serveActions();
    render(<DashboardPage />);
    await userEvent.click(await screen.findByRole("checkbox", { name: "Select Plain draft" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Draft in review" }));
    await userEvent.click(within(bar()!).getByRole("button", { name: "Submit 1 of 2 for review" }));
    await waitFor(() => expect(asked("/jobs/submit-bulk", "POST")).toBe(1));
    expect(bodyOf("/jobs/submit-bulk")).toEqual({ ids: ["d1"] });
    await waitFor(() => expect(h.toast.success).toHaveBeenCalledWith("Sent 1 for design review."));
  });

  it("a ticked row that the next answer no longer lists is not still ticked out of sight: Delete never reaches a post the person cannot see", async () => {
    h.approvalRequired = true;
    serveActions();
    render(<DashboardPage />);
    await userEvent.click(await screen.findByRole("checkbox", { name: "Select Scheduled post" }));
    expect(within(bar()!).getByText(/1 selected/)).toBeTruthy();
    // the dashboard lists only the first rows of each tab: after a change the scheduled post is gone from "Upcoming content"
    const trimmed = acting();
    trimmed.lists.upcoming.posts = trimmed.lists.upcoming.posts.filter((p) => p.id !== "s1");
    serve(trimmed, undefined, (path) => {
      if (path === "/accounts") return [];
      if (path === "/templates") return { templates: [] };
      if (path.endsWith("/detail")) return detail(path.split("/")[2]);
      if (path === "/jobs/d1/submit") return {};
      throw new Error(`unexpected ${path}`);
    });
    await userEvent.click(screen.getByRole("row", { name: "Open Plain draft" }));
    await userEvent.click(await screen.findByRole("button", { name: "Submit for review" }));
    await waitFor(() => expect(screen.queryByText("Scheduled post")).toBeNull());
    expect(bar()).toBeNull();
  });

  it("where drafts are not reviewed there is no Submit, only Delete", async () => {
    serveActions();
    render(<DashboardPage />);
    await userEvent.click(await screen.findByRole("checkbox", { name: "Select Plain draft" }));
    expect(within(bar()!).queryByRole("button", { name: /Submit/ })).toBeNull();
    expect(within(bar()!).getByRole("button", { name: "Delete 1" })).toBeTruthy();
  });

  it("a designer has no checkboxes, and still opens a row: the drawer is where a post is reviewed", async () => {
    h.role = "designer";
    serveActions();
    render(<DashboardPage />);
    await screen.findByText("Plain draft");
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    await userEvent.click(screen.getByRole("row", { name: "Open Plain draft" }));
    expect(await screen.findByRole("heading", { name: "Plain draft" })).toBeTruthy();
    expect(bar()).toBeNull();
  });

  it("nothing asks for the accounts or the design references until a post is opened, and then only once", async () => {
    serveActions();
    render(<DashboardPage />);
    await screen.findByText("Plain draft");
    await waitFor(() => expect(calendarCalls()).toBeGreaterThan(0));
    expect(asked("/accounts")).toBe(0);
    expect(asked("/templates")).toBe(0);
    await userEvent.click(screen.getByRole("row", { name: "Open Plain draft" }));
    await screen.findByRole("heading", { name: "Plain draft" });
    await waitFor(() => expect(asked("/templates")).toBe(1));
    expect(asked("/accounts")).toBe(1);
  });
});
