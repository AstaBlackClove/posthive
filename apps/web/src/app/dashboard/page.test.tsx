// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApiCalendar, ApiDashboard, ApiPost } from "@/lib/dashboard-data";

const h = vi.hoisted(() => ({ apiFetch: vi.fn(), role: "member" as string, workspace: "ws-1", workspaceLoading: false }));

vi.mock("@/lib/api", () => ({ apiFetch: h.apiFetch }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: { name: "Putri Anggraini", avatarUrl: null, role: h.role } }) }));
vi.mock("@/context/WorkspaceContext", () => ({ useWorkspace: () => ({ activeWorkspace: h.workspaceLoading ? null : { id: h.workspace, role: h.role }, loading: h.workspaceLoading }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

import DashboardPage from "./page";

const post = (patch: Partial<ApiPost> = {}): ApiPost => ({
  id: "p1", title: "5 Habits", status: "pending", approvalStatus: null, scheduledFor: "2099-03-10T02:00:00.000Z",
  channels: ["instagram"], owner: "Putri", category: null, thumbnail: null, ...patch,
});

const dashboard = (patch: Partial<ApiDashboard> = {}): ApiDashboard => ({
  quarter: { label: "Q4 2026", planned: 12, published: 5 },
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

const calendar = (posts: ApiPost[], range: { from: string; to: string }, truncated = false): ApiCalendar => ({ ...range, posts, truncated });

/** Route each path to an answer; the calendar can be answered per range. */
function serve(dash: ApiDashboard | Error, cal: (from: string, to: string) => ApiCalendar | Promise<ApiCalendar> = (from, to) => calendar([], { from, to })) {
  h.apiFetch.mockImplementation(async (path: string) => {
    if (path === "/dashboard") {
      if (dash instanceof Error) throw dash;
      return dash;
    }
    const m = path.match(/^\/dashboard\/calendar\?from=([\d-]+)&to=([\d-]+)$/);
    if (m) return cal(m[1], m[2]);
    throw new Error(`unexpected ${path}`);
  });
}

beforeEach(() => {
  h.apiFetch.mockReset();
  h.role = "member";
  h.workspace = "ws-1";
  h.workspaceLoading = false;
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

    serve(dashboard({ quarter: { label: "Q4 2026", planned: 0, published: 0 }, setup: { imported: false, created: false, accounts: 0, members: 1, invites: 0 }, todayPosts: { count: 0, posts: [] }, myTasks: { count: 0, posts: [] } }));
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
    await waitFor(() => expect(calls("/dashboard/calendar")).toHaveLength(1));
    expect(calls("/dashboard/calendar")[0][0]).toBe("/dashboard/calendar?from=2026-10-26&to=2026-12-06");
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
      quarter: { label: "Q4 2026", planned: 0, published: 0 },
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
    const cell = await screen.findByRole("gridcell", { name: "2026-11-10" });
    expect(await within(cell).findByText("Cal post")).toBeTruthy();
  });

  it("moving to the next month asks for that range", async () => {
    serve(dashboard());
    render(<DashboardPage />);
    await screen.findByText("Plan Marketing");
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    await waitFor(() => expect(calls("/dashboard/calendar")).toHaveLength(2));
    expect(calls("/dashboard/calendar")[1][0]).toBe("/dashboard/calendar?from=2026-11-30&to=2027-01-03");
  });

  it("an answer that comes back after the person moved on is dropped: November's posts never show on December", async () => {
    let releaseNovember: (a: ApiCalendar) => void = () => {};
    serve(dashboard(), (from, to) =>
      from === "2026-10-26"
        ? new Promise<ApiCalendar>((resolve) => { releaseNovember = resolve; })
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
    expect((await screen.findByRole("alert")).textContent).toContain("Couldn't load the posts of this range. calendar down");
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
    expect(calls("/dashboard/calendar").map((c) => c[0])).toEqual(Array(2).fill("/dashboard/calendar?from=2026-10-26&to=2026-12-06"));
  });

  it("while the first range loads the calendar is not called empty", async () => {
    serve(dashboard(), () => new Promise<ApiCalendar>(() => {}));
    render(<DashboardPage />);
    await screen.findByText("Plan Marketing");
    expect(screen.queryByText("Your calendar is empty")).toBeNull();
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
        : new Promise<ApiCalendar>((resolve) => { release = () => resolve(calendar(posts, { from, to })); })
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

  it("still says it when the month it arrives at really has no posts", async () => {
    serve(dashboard(), (from, to) => calendar(from === "2026-10-26" ? [nov] : [], { from, to }));
    render(<DashboardPage />);
    await screen.findByText("November post");
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(await screen.findByText("Your calendar is empty")).toBeTruthy();
  });
});
