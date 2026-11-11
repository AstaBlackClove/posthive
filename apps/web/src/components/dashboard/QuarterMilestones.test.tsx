// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuarterMilestones } from "./QuarterMilestones";
import type { Milestone } from "./types";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

afterEach(cleanup);

const milestone = (category: string, planned: number, posted = 0, scheduled = 0): Milestone => ({ category, planned, posted, scheduled });
const NAMES = ["Product Features", "Case Study", "Blog Post", "Tips/How To", "Internal Event", "Polling & Survey", "Trend Response"];
const many = (n: number) => NAMES.slice(0, n).map((c, i) => milestone(c, 20 - i));

const show = (rows: Milestone[], extra: { uncategorized?: number; canImport?: boolean } = {}) =>
  render(<QuarterMilestones quarter="Q4 2026" milestones={{ rows, uncategorized: extra.uncategorized ?? 0 }} canImport={extra.canImport ?? true} />);

describe("QuarterMilestones: a category's posts out against what the plan holds", () => {
  it("a row names the category and counts what is out of the target", () => {
    show([milestone("Product Features", 15, 6, 4)]);
    expect(screen.getByText("Product Features")).toBeTruthy();
    expect(screen.getByText("6").parentElement!.textContent).toBe("6 / 15");
  });

  it("the bar says the same in words for a screen reader: out of the target, and how many are waiting", () => {
    show([milestone("Product Features", 15, 6, 4)]);
    const bar = screen.getByRole("progressbar", { name: "Product Features" });
    expect(bar.getAttribute("aria-valuenow")).toBe("6");
    expect(bar.getAttribute("aria-valuemax")).toBe("15");
    expect(bar.getAttribute("aria-valuetext")).toBe("6 of 15 posted, 4 scheduled");
  });

  it("the bar has two parts, posted and scheduled, each as wide as its share of the target", () => {
    show([milestone("Product Features", 15, 6, 4)]);
    const [posted, scheduled] = Array.from(screen.getByRole("progressbar").children) as HTMLElement[];
    expect(posted.style.getPropertyValue("--posted")).toBe("40%");
    expect(scheduled.style.getPropertyValue("--scheduled")).toBe("26.7%");
    expect(posted.className).toContain("w-(--posted)");
    expect(scheduled.className).toContain("w-(--scheduled)");
    // no inline width: the share goes through a variable the class reads
    expect(posted.style.width).toBe("");
  });

  it("says what is waiting and how many posts are still to go", () => {
    show([milestone("Product Features", 15, 6, 4), milestone("Case Study", 10, 2, 0)]);
    expect(screen.getByText("9 to go · 4 scheduled")).toBeTruthy();
    expect(screen.getByText("8 to go")).toBeTruthy();
  });

  it("a category with nothing out yet is an empty bar, not a broken one", () => {
    show([milestone("Internal Event", 3)]);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("0");
    expect(bar.getAttribute("aria-valuetext")).toBe("0 of 3 posted, 0 scheduled");
    expect((bar.children[0] as HTMLElement).style.getPropertyValue("--posted")).toBe("0%");
    expect(screen.getByText("3 to go")).toBeTruthy();
  });

  it("a category whose target is met says so, and its bar turns green", () => {
    show([milestone("Product Features", 15, 15), milestone("Case Study", 10, 2)]);
    const rows = screen.getAllByRole("listitem");
    expect(within(rows[0]).getByText("Target reached")).toBeTruthy();
    expect(within(rows[0]).queryByText(/to go/)).toBeNull();
    expect((within(rows[0]).getByRole("progressbar").children[0] as HTMLElement).className).toContain("bg-green-600");
    // the other one is not green and not done
    expect(within(rows[1]).queryByText("Target reached")).toBeNull();
    expect((within(rows[1]).getByRole("progressbar").children[0] as HTMLElement).className).not.toContain("bg-green-600");
  });

  it("a long category name is cut to one line instead of pushing the count out of the panel", () => {
    show([milestone("A very long category name that would otherwise run over the count", 15, 6)]);
    expect(screen.getByText(/A very long category name/).className).toContain("truncate");
  });

  it("names the quarter, and explains the bars once", () => {
    show([milestone("Product Features", 15, 6, 4)]);
    expect(screen.getByText("Q4 2026 · posted of planned, per category")).toBeTruthy();
    const legend = screen.getByRole("list", { name: "Bar colours" });
    expect(within(legend).getByText("Posted")).toBeTruthy();
    expect(within(legend).getByText("Scheduled")).toBeTruthy();
  });
});

describe("QuarterMilestones: many categories", () => {
  it("five or fewer are all shown and there is nothing to expand", () => {
    show(many(5));
    expect(screen.getAllByRole("progressbar")).toHaveLength(5);
    expect(screen.queryByRole("button", { name: /Show/ })).toBeNull();
  });

  it("more than five show the first five, and Show all opens the rest and Show less closes them again", async () => {
    show(many(7));
    expect(screen.getAllByRole("progressbar")).toHaveLength(5);
    // the server sorts, the panel keeps that order
    expect(screen.getAllByRole("progressbar").map((b) => b.getAttribute("aria-label"))).toEqual(NAMES.slice(0, 5));

    const more = screen.getByRole("button", { name: "Show all (7)" });
    expect(more.getAttribute("aria-expanded")).toBe("false");
    await userEvent.click(more);
    expect(screen.getAllByRole("progressbar")).toHaveLength(7);
    const less = screen.getByRole("button", { name: "Show less" });
    expect(less.getAttribute("aria-expanded")).toBe("true");
    await userEvent.click(less);
    expect(screen.getAllByRole("progressbar")).toHaveLength(5);
  });
});

describe("QuarterMilestones: posts with no category", () => {
  it("says how many are in no bar, so the bars are not read as the whole quarter", () => {
    show([milestone("Product Features", 15, 6)], { uncategorized: 3 });
    expect(screen.getByText("3 posts this quarter have no content category, so they are not in these bars.")).toBeTruthy();
  });

  it("says it for one post in the singular", () => {
    show([milestone("Product Features", 15, 6)], { uncategorized: 1 });
    expect(screen.getByText("1 post this quarter has no content category, so it is not in these bars.")).toBeTruthy();
  });

  it("says nothing when every post has a category", () => {
    show([milestone("Product Features", 15, 6)]);
    expect(screen.queryByText(/no content category/)).toBeNull();
  });
});

describe("QuarterMilestones: nothing planned yet", () => {
  it("explains where milestones come from and offers the import", () => {
    show([]);
    expect(screen.getByText("No milestones yet")).toBeTruthy();
    expect(screen.getByText(/Each content category becomes a milestone/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Import quarter plan" }).getAttribute("href")).toBe("/jobs/import");
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByRole("list", { name: "Bar colours" })).toBeNull();
    expect(screen.queryByText(/posted of planned/)).toBeNull();
  });

  it("a role that cannot open the import page is not sent there", () => {
    show([], { canImport: false });
    expect(screen.getByText("No milestones yet")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Import quarter plan" })).toBeNull();
  });

  it("when the quarter has posts but none has a category, it says that and does not offer an import", () => {
    show([], { uncategorized: 4 });
    expect(screen.getByText("No milestones yet")).toBeTruthy();
    expect(screen.getByText(/Give the posts of this quarter a content category/)).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Import quarter plan" })).toBeNull();
    expect(screen.getByText("4 posts this quarter have no content category, so they are not in these bars.")).toBeTruthy();
  });
});
