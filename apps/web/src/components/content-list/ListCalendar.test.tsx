// @vitest-environment jsdom
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ListItem } from "@/lib/content-list";
import type { CalendarAnswer } from "@/lib/useContentList";

const h = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch: h.apiFetch, assetUrl: (u: string) => u }));

import { ListCalendar, useCalendarPosition } from "./ListCalendar";

const TODAY = "2026-11-13";
const ROLE = { canEditContent: true, canReview: false, canSubmitOwn: false };

const item = (id: string, patch: Partial<ListItem> = {}): ListItem => ({
  id,
  status: "draft",
  approvalStatus: null,
  scheduledFor: "2026-11-10T02:00:00.000Z", // 09:00 WIB on Tue 10 Nov
  title: `Post ${id}`,
  caption: "",
  channels: ["instagram"],
  sourceRow: null,
  link: null,
  designCopy: "",
  category: null,
  ...patch,
});

const answer = (from: string, to: string, items: ListItem[] = [], patch: Partial<CalendarAnswer> = {}): CalendarAnswer => ({ from, to, items, truncated: false, next: null, prev: null, ...patch });

/** Answer every range of the calendar; `by` decides per range. */
function serve(by: (from: string, to: string) => CalendarAnswer | Promise<CalendarAnswer>) {
  h.apiFetch.mockImplementation(async (path: string) => {
    const query = new URLSearchParams(path.split("?")[1]);
    return by(query.get("from") ?? "", query.get("to") ?? "");
  });
}
const calls = () => h.apiFetch.mock.calls.map((c) => String(c[0]));

function Host(props: Partial<ComponentProps<typeof ListCalendar>>) {
  const position = useCalendarPosition(TODAY);
  return <ListCalendar filter="all" position={position} todayKey={TODAY} version={0} role={ROLE} openId={null} onOpen={() => {}} {...props} />;
}

const empty = (range: string) => <p>Nothing for {range}</p>;

beforeEach(() => {
  h.apiFetch.mockReset();
});
afterEach(cleanup);

/** The nodes that were ever added: a message on screen for one render is gone before an assertion can look. */
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

describe("ListCalendar: which channels a post goes to", () => {
  it("every post shows the icon of each channel it is for", async () => {
    serve((from, to) => answer(from, to, [item("a", { channels: ["instagram", "linkedin"] }), item("b", { scheduledFor: "2026-11-11T02:00:00.000Z", channels: ["linkedin"] })]));
    render(<Host />);
    const both = await screen.findByRole("button", { name: "Open 09:00 Post a, Draft" });
    expect(both.querySelectorAll("img").length).toBe(2);
    expect([...both.querySelectorAll("img")].map((i) => i.getAttribute("alt"))).toEqual(["instagram", "linkedin"]);
    const one = screen.getByRole("button", { name: "Open 09:00 Post b, Draft" });
    expect([...one.querySelectorAll("img")].map((i) => i.getAttribute("alt"))).toEqual(["linkedin"]);
  });
});

// The card is the status: a small dot or badge is too little to read across a month. Each status has its own tint and stroke,
// and the dot on the card repeats the stroke's colour.
describe("ListCalendar: the colour of a post", () => {
  const byStatus: [string, Partial<ListItem>, string][] = [
    ["Draft", { status: "draft" }, "neutral-200"],
    ["In Review", { status: "draft", approvalStatus: "pending" }, "brand-600"],
    ["Revision Required", { status: "draft", approvalStatus: "rejected" }, "status-changes"],
    ["Ready to Publish", { status: "pending" }, "green-600"],
    ["Published", { status: "done" }, "blue-600"],
    ["Failed", { status: "failed" }, "red-600"],
  ];

  it.each(byStatus)("a %s post has a full stroke and a tint in its own colour, and no bar on the left", async (name, patch, colour) => {
    serve((from, to) => answer(from, to, [item("a", patch)]));
    render(<Host />);
    const chip = await screen.findByRole("button", { name: `Open 09:00 Post a, ${name}` });
    const classes = chip.className.split(" ");
    // a colour with no width draws nothing: the stroke needs both
    expect(classes).toEqual(expect.arrayContaining(["border", `border-${colour}`]));
    expect(classes.some((c) => c.startsWith(`bg-${colour}/`))).toBe(true);
    expect(classes.some((c) => c.startsWith("border-l-"))).toBe(false);
  });

  it("the six statuses are six different cards", async () => {
    serve((from, to) => answer(from, to, byStatus.map(([, patch], i) => item(`s${i}`, { ...patch, scheduledFor: `2026-11-1${i}T02:00:00.000Z` }))));
    render(<Host />);
    await screen.findByText("Post s0");
    const strokes = byStatus.map(([name]) => screen.getByRole("button", { name: new RegExp(`, ${name}$`) }).className.split(" ").find((c) => c.startsWith("border-") && c !== "border"));
    expect(new Set(strokes).size).toBe(6);
  });

  it.each(byStatus)("a %s post shows its status as a dot in the colour of its stroke, and not as a name", async (name, patch, colour) => {
    serve((from, to) => answer(from, to, [item("a", patch)]));
    render(<Host />);
    const chip = await screen.findByRole("button", { name: `Open 09:00 Post a, ${name}` });
    // the name is in the button's label, not in its text
    expect(within(chip).queryByText(name)).toBeNull();
    const dot = chip.querySelector(`.bg-${colour}`);
    expect(dot?.getAttribute("aria-hidden")).toBe("true");
    expect(dot?.className).toContain("rounded-full");
  });

  it("a post on a Saturday or a Sunday is drawn at 55%, and so is one outside the month; a weekday post is not", async () => {
    serve((from, to) =>
      answer(from, to, [
        item("fri", { scheduledFor: "2026-11-13T02:00:00.000Z" }),
        item("sat", { scheduledFor: "2026-11-14T02:00:00.000Z" }),
        item("sun", { scheduledFor: "2026-11-15T02:00:00.000Z" }),
        item("out", { scheduledFor: "2026-10-27T02:00:00.000Z" }), // a Tuesday in the grid's first row, before November
      ])
    );
    render(<Host />);
    const faded = async (id: string) => (await screen.findByRole("button", { name: `Open 09:00 Post ${id}, Draft` })).className.split(" ").includes("opacity-55");
    expect(await faded("fri")).toBe(false);
    expect(await faded("sat")).toBe(true);
    expect(await faded("sun")).toBe(true);
    expect(await faded("out")).toBe(true);
  });

  it("the weekend fade is in the Week view too", async () => {
    serve((from, to) => answer(from, to, [item("fri", { scheduledFor: "2026-11-13T02:00:00.000Z" }), item("sat", { scheduledFor: "2026-11-14T02:00:00.000Z" })]));
    render(<Host />);
    await userEvent.click(await screen.findByRole("radio", { name: "Week" }));
    expect((await screen.findByRole("button", { name: "Open 09:00 Post sat, Draft" })).className.split(" ")).toContain("opacity-55");
    expect(screen.getByRole("button", { name: "Open 09:00 Post fri, Draft" }).className.split(" ")).not.toContain("opacity-55");
  });

  it("a weekend post whose drawer is open is drawn at full strength", async () => {
    serve((from, to) => answer(from, to, [item("sat", { scheduledFor: "2026-11-14T02:00:00.000Z" })]));
    render(<Host openId="sat" />);
    const chip = await screen.findByRole("button", { name: "Open 09:00 Post sat, Draft" });
    expect(chip.className.split(" ")).not.toContain("opacity-55");
  });

  it("the chip of the post whose drawer is open is ringed", async () => {
    serve((from, to) => answer(from, to, [item("a"), item("b", { scheduledFor: "2026-11-11T02:00:00.000Z" })]));
    render(<Host openId="a" />);
    const open = await screen.findByRole("button", { name: "Open 09:00 Post a, Draft" });
    expect(open.getAttribute("data-open")).toBe("true");
    expect(open.className.split(" ")).toContain("ring-2");
    const other = screen.getByRole("button", { name: "Open 09:00 Post b, Draft" });
    expect(other.getAttribute("data-open")).toBeNull();
    expect(other.className.split(" ")).not.toContain("ring-2");
  });

  it("in the Day view the card of a post has the stroke and tint of its status too", async () => {
    serve((from, to) => answer(from, to, [item("a", { status: "done", scheduledFor: "2026-11-13T02:00:00.000Z" })]));
    render(<Host />);
    await userEvent.click(await screen.findByRole("radio", { name: "Day" }));
    const card = await screen.findByRole("article");
    expect(card.className.split(" ")).toEqual(expect.arrayContaining(["border", "border-blue-600"]));
    expect(card.className.split(" ")).not.toContain("border-l-3");
    expect(card.className).toMatch(/(^| )bg-blue-600\/\d+/);
    expect(within(card).getByText("Published")).toBeTruthy();
  });

  it("in the Day view a Saturday's card is drawn at 55%, a Friday's is not", async () => {
    serve((from, to) => answer(from, to, [item("fri", { scheduledFor: "2026-11-13T02:00:00.000Z" }), item("sat", { scheduledFor: "2026-11-14T02:00:00.000Z" })]));
    render(<Host />);
    await userEvent.click(await screen.findByRole("radio", { name: "Day" }));
    const wrapper = async () => (await screen.findByRole("article")).parentElement!;
    expect((await wrapper()).className.split(" ")).not.toContain("opacity-55");
    await userEvent.click(screen.getByRole("button", { name: "Next day" }));
    await screen.findByText("Post sat");
    expect((await wrapper()).className.split(" ")).toContain("opacity-55");
  });

  it("the legend under the grid explains the colours with a dot and a name each, for a page that has its own empty state or not", async () => {
    serve((from, to) => answer(from, to));
    const { unmount } = render(<Host />);
    const legend = await screen.findByRole("list", { name: "Status legend" });
    const entries = within(legend).getAllByRole("listitem");
    expect(entries.map((i) => i.textContent)).toEqual(["Draft", "In Review", "Revision Required", "Ready to Publish", "Published", "Failed"]);
    for (const entry of entries) expect(entry.querySelector("span")?.className).toContain("rounded-full");
    unmount();
    render(<Host whenEmpty={empty} />);
    expect(await screen.findByRole("list", { name: "Status legend" })).toBeTruthy();
  });
});

describe("ListCalendar: Today", () => {
  it("brings the month back to the month of today", async () => {
    serve((from, to) => answer(from, to));
    render(<Host />);
    await screen.findByRole("heading", { name: "November 2026" });
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("heading", { name: "January 2027" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByRole("heading", { name: "November 2026" })).toBeTruthy();
  });

  it("brings a week back to the week of today", async () => {
    serve((from, to) => answer(from, to));
    render(<Host />);
    await userEvent.click(await screen.findByRole("radio", { name: "Week" }));
    expect(screen.getByRole("heading", { name: "9 – 15 Nov 2026" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Next week" }));
    expect(screen.getByRole("heading", { name: "16 – 22 Nov 2026" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByRole("heading", { name: "9 – 15 Nov 2026" })).toBeTruthy();
  });
});

describe("ListCalendar: filtering by channel", () => {
  const posts = () => [
    item("ig", { channels: ["instagram"] }),
    item("li", { scheduledFor: "2026-11-11T02:00:00.000Z", channels: ["linkedin"] }),
    item("both", { scheduledFor: "2026-11-12T02:00:00.000Z", channels: ["instagram", "linkedin"] }),
  ];

  it("is not offered unless the page asks for it", async () => {
    serve((from, to) => answer(from, to, posts()));
    render(<Host />);
    await screen.findByText("Post ig");
    expect(screen.queryByRole("radiogroup", { name: "Channel" })).toBeNull();
  });

  it("offers All, Instagram and LinkedIn, and any other channel a post in view goes to", async () => {
    serve((from, to) => answer(from, to, [...posts(), item("m", { scheduledFor: "2026-11-16T02:00:00.000Z", channels: ["mastodon"] })]));
    render(<Host channelFilter />);
    await screen.findByText("Post ig");
    const group = screen.getByRole("radiogroup", { name: "Channel" });
    expect(within(group).getAllByRole("radio").map((r) => r.textContent)).toEqual(["All", "Instagram", "LinkedIn", "Mastodon"]);
    expect(within(group).getByRole("radio", { name: "All" }).getAttribute("aria-checked")).toBe("true");
  });

  it("picking a channel keeps the posts that go there, the ones for several channels too, and asks the server for nothing", async () => {
    serve((from, to) => answer(from, to, posts()));
    render(<Host channelFilter />);
    await screen.findByText("Post ig");
    const before = calls().length;
    await userEvent.click(screen.getByRole("radio", { name: "LinkedIn" }));
    expect(screen.queryByText("Post ig")).toBeNull();
    expect(screen.getByText("Post li")).toBeTruthy();
    expect(screen.getByText("Post both")).toBeTruthy();
    expect(calls()).toHaveLength(before);
    // the footer counts what is on the grid
    expect(screen.getByText(/^Showing 2 posts in November 2026/)).toBeTruthy();
    await userEvent.click(screen.getByRole("radio", { name: "All" }));
    expect(screen.getByText("Post ig")).toBeTruthy();
  });

  it("keeps one choice: clicking the picked channel again does not switch the filter off", async () => {
    serve((from, to) => answer(from, to, posts()));
    render(<Host channelFilter />);
    await screen.findByText("Post ig");
    await userEvent.click(screen.getByRole("radio", { name: "LinkedIn" }));
    await userEvent.click(screen.getByRole("radio", { name: "LinkedIn" }));
    expect(screen.getByRole("radio", { name: "LinkedIn" }).getAttribute("aria-checked")).toBe("true");
  });

  it("moving to a month without the picked channel keeps it in the filter", async () => {
    serve((from, to) => answer(from, to, from === "2026-10-26" ? [item("m", { channels: ["mastodon"] })] : []));
    render(<Host channelFilter />);
    await screen.findByText("Post m");
    await userEvent.click(screen.getByRole("radio", { name: "Mastodon" }));
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    await screen.findByRole("heading", { name: "December 2026" });
    expect(screen.getByRole("radio", { name: "Mastodon" }).getAttribute("aria-checked")).toBe("true");
  });
});

describe("ListCalendar: a range with no post", () => {
  it("says so over the grid, naming the range, once the answer is in", async () => {
    serve((from, to) => answer(from, to));
    render(<Host whenEmpty={empty} />);
    expect(await screen.findByText("Nothing for November 2026")).toBeTruthy();
  });

  it("says nothing without a page that asked for it", async () => {
    serve((from, to) => answer(from, to));
    render(<Host />);
    await screen.findByRole("heading", { name: "November 2026" });
    await waitFor(() => expect(screen.getByText(/^Showing 0 posts/)).toBeTruthy());
    expect(screen.queryByText(/Nothing for/)).toBeNull();
  });

  it("does not say it while the posts are on their way, or when they could not be loaded", async () => {
    serve(() => new Promise<CalendarAnswer>(() => {}));
    const { unmount } = render(<Host whenEmpty={empty} />);
    await screen.findByRole("heading", { name: "November 2026" });
    expect(screen.queryByText(/Nothing for/)).toBeNull();
    unmount();

    serve(() => { throw new Error("calendar down"); });
    render(<Host whenEmpty={empty} />);
    expect((await screen.findByRole("alert")).textContent).toContain("calendar down");
    expect(screen.queryByText(/Nothing for/)).toBeNull();
  });

  // The answer on screen is still the old one while the same range is asked again (a post was deleted or sent): that is not
  // the moment to say the range is empty, and a failed second ask must not put the message over the error.
  it("does not say it while the same range is asked again, nor over the error of a failed second ask", async () => {
    let calls = 0;
    serve((from, to) => {
      calls += 1;
      if (calls === 1) return answer(from, to);
      if (calls === 2) return new Promise<CalendarAnswer>(() => {});
      throw new Error("calendar down");
    });
    const { rerender } = render(<Host whenEmpty={empty} version={0} />);
    expect(await screen.findByText("Nothing for November 2026")).toBeTruthy();

    // the same range, asked again: the old empty answer is still here, but a new one is on its way
    rerender(<Host whenEmpty={empty} version={1} />);
    await waitFor(() => expect(calls).toBe(2));
    await waitFor(() => expect(screen.queryByText(/Nothing for/)).toBeNull());

    // and asked once more, failing
    rerender(<Host whenEmpty={empty} version={2} />);
    expect((await screen.findByRole("alert")).textContent).toContain("calendar down");
    expect(screen.queryByText(/Nothing for/)).toBeNull();
  });

  it("is not said when the range has posts, nor when only the channel filter hides them", async () => {
    serve((from, to) => answer(from, to, [item("ig")]));
    render(<Host whenEmpty={empty} channelFilter />);
    await screen.findByText("Post ig");
    expect(screen.queryByText(/Nothing for/)).toBeNull();
    await userEvent.click(screen.getByRole("radio", { name: "LinkedIn" }));
    expect(screen.queryByText("Post ig")).toBeNull();
    expect(screen.queryByText(/Nothing for/)).toBeNull();
  });

  it("stays on the range instead of jumping to the closest post: the page that says it is empty wants that month", async () => {
    serve((from, to) => answer(from, to, [], { prev: item("old", { scheduledFor: "2026-03-07T01:00:00.000Z" }) }));
    render(<Host whenEmpty={empty} />);
    expect(await screen.findByText("Nothing for November 2026")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "November 2026" })).toBeTruthy();
    expect(calls()).toHaveLength(1);
  });

  it("goes on saying it for the next month, and names the week and the day when the view is one", async () => {
    serve((from, to) => answer(from, to));
    render(<Host whenEmpty={empty} />);
    await screen.findByText("Nothing for November 2026");
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(await screen.findByText("Nothing for December 2026")).toBeTruthy();
    await userEvent.click(screen.getByRole("radio", { name: "Week" }));
    // the anchor is 13 Dec (13 Nov plus a month): a Sunday, the last day of the week of 7 – 13 Dec
    expect(await screen.findByText("Nothing for 7 – 13 Dec 2026")).toBeTruthy();
    await userEvent.click(screen.getByRole("radio", { name: "Day" }));
    expect(await screen.findByText("Nothing for Sunday, 13 Dec 2026")).toBeTruthy();
  });

  // A day or a week is a short board, shorter than the message. It sits in the grid's own cell, under the controls, so the
  // board grows to the taller of the two and the message never spills over the arrows. jsdom has no layout: this checks the structure.
  it.each(["Month", "Week", "Day"])("in the %s view it shares the grid's cell and never covers the controls", async (view) => {
    serve((from, to) => answer(from, to));
    render(<Host whenEmpty={empty} />);
    await userEvent.click(await screen.findByRole("radio", { name: view }));
    const card = await screen.findByText(/^Nothing for /);
    const board = card.closest("[data-slot=board]") as HTMLElement;
    expect(board).toBeTruthy();
    expect(board.className).toContain("grid");
    const wrapper = [...board.children].find((child) => child.contains(card)) as HTMLElement;
    expect(wrapper.className).toContain("col-start-1");
    expect(wrapper.className).toContain("row-start-1");
    expect(wrapper.className).not.toContain("absolute");
    expect(board.contains(screen.getByRole("grid"))).toBe(true);
    // the controls are not in the board at all
    expect(board.contains(screen.getByRole("button", { name: `Previous ${view.toLowerCase()}` }))).toBe(false);
    expect(board.contains(screen.getByRole("radiogroup", { name: "Calendar range" }))).toBe(false);
  });

  it("never says it on the way to the next month, nor from Month to Week, when those ranges have posts", async () => {
    let release: () => void = () => {};
    serve((from, to) =>
      from === "2026-10-26"
        ? answer(from, to, [item("nov")])
        : new Promise<CalendarAnswer>((resolve) => { release = () => resolve(answer(from, to, [item("later", { scheduledFor: "2026-12-10T02:00:00.000Z" })])); })
    );
    render(<Host whenEmpty={empty} />);
    await screen.findByText("Post nov");

    const next = watchForText("Nothing for");
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    release();
    expect(await screen.findByText("Post later")).toBeTruthy();
    expect(next.appeared()).toBe(false);

    await userEvent.click(screen.getByRole("button", { name: "Previous month" }));
    await screen.findByText("Post nov");
    const week = watchForText("Nothing for");
    await userEvent.click(screen.getByRole("radio", { name: "Week" }));
    release();
    await waitFor(() => expect(calls().some((c) => c.includes("from=2026-11-09"))).toBe(true));
    await screen.findByRole("heading", { name: "9 – 15 Nov 2026" });
    expect(week.appeared()).toBe(false);
  });
});

describe("ListCalendar: what it says under the grid", () => {
  it("counts the posts of the range, with no split by status when the page has no counts of its own", async () => {
    serve((from, to) => answer(from, to, [item("a")]));
    render(<Host />);
    expect(await screen.findByText("Showing 1 post in November 2026 · click a post to preview · posts with no date are in the table")).toBeTruthy();
  });

  it("tells the person when the range was cut short, and how to see the rest", async () => {
    serve((from, to) => answer(from, to, [item("a")], { truncated: true }));
    render(<Host />);
    expect((await screen.findByRole("status")).textContent).toBe("This range has more posts than the calendar can show. Move to a shorter view to see them all.");
  });
});
