// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { InboxIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { ChannelRow } from "./ChannelRow";
import { QuickStartStep } from "./QuickStartStep";
import { SectionPanel } from "./SectionPanel";
import { SegmentedProgress } from "./SegmentedProgress";
import { StatCard, percentOf } from "./StatCard";
import { StatusDot, StatusLegend } from "./StatusDot";
import { CONTENT_STATUS } from "@/lib/content-status";
import { PILL_OF } from "@/lib/content-list";

afterEach(cleanup);

const classesOf = (el: Element) => el.className.split(/\s+/);

describe("EmptyState (on shadcn Empty)", () => {
  it("shows tile, title, help and the actions side by side", () => {
    render(
      <EmptyState
        icon={<InboxIcon data-testid="icon" />}
        title="Your calendar is empty"
        description="Schedule your first post."
        action={<><Button>Import plan</Button><Button>Add content</Button></>}
      />
    );
    expect(screen.getByText("Your calendar is empty")).toBeTruthy();
    expect(screen.getByText("Schedule your first post.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Import plan" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add content" })).toBeTruthy();
    expect(classesOf(screen.getByTestId("icon").parentElement!)).toContain("bg-brand-100");
  });

  it("is built on the shadcn Empty (its data slots are there)", () => {
    const { container } = render(<EmptyState title="Nothing" />);
    expect(container.querySelector("[data-slot=empty]")).not.toBeNull();
    expect(container.querySelector("[data-slot=empty-title]")).not.toBeNull();
  });

  it("renders no icon tile and no action when none is given", () => {
    const { container } = render(<EmptyState title="Nothing" />);
    expect(container.querySelector("[data-slot=empty-icon]")).toBeNull();
    expect(container.querySelector("[data-slot=empty-content]")).toBeNull();
  });

  it("has three sizes", () => {
    const { container, rerender } = render(<EmptyState title="x" size="page" />);
    expect(classesOf(container.firstChild as Element)).toContain("py-24");
    rerender(<EmptyState title="x" size="compact" />);
    expect(classesOf(container.firstChild as Element)).toContain("py-10");
    rerender(<EmptyState title="x" size="inline" />);
    expect(classesOf(container.firstChild as Element)).toContain("py-4");
  });
});

describe("percentOf", () => {
  it("is the rounded share, capped at 100", () => {
    expect(percentOf(0, 60)).toBe(0);
    expect(percentOf(30, 60)).toBe(50);
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(60, 60)).toBe(100);
    expect(percentOf(90, 60)).toBe(100);
  });

  it("never gives NaN or Infinity: no total, a total of 0 or a negative one is 0", () => {
    expect(percentOf(5)).toBe(0);
    expect(percentOf(5, 0)).toBe(0);
    expect(percentOf(5, -10)).toBe(0);
    expect(percentOf(-3, 60)).toBe(0);
  });
});

describe("StatCard", () => {
  it("shows title, subtitle, the value and '/ total unit'", () => {
    render(<StatCard title="Drafts to schedule" subtitle="Approved, not yet scheduled" value={0} total={60} unit="posts" />);
    expect(screen.getByText("Drafts to schedule")).toBeTruthy();
    expect(screen.getByText("Approved, not yet scheduled")).toBeTruthy();
    expect(screen.getByText("0")).toBeTruthy();
    expect(screen.getByText("/ 60 posts")).toBeTruthy();
  });

  it("with a total it has a progress bar that names its numbers", () => {
    render(<StatCard title="Published" subtitle="This quarter" value={15} total={60} unit="posts" />);
    const bar = screen.getByRole("progressbar", { name: "Published: 15 of 60" });
    expect(bar.getAttribute("aria-valuenow")).toBe("25");
  });

  it("without a total there is no bar and no '/'", () => {
    render(<StatCard title="My tasks today" subtitle="Assigned to you" value={2} unit="posts in progress" />);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByText("posts in progress").textContent).toBe("posts in progress");
  });

  it("a total of 0 gives an empty bar, not a crash", () => {
    render(<StatCard title="Published" subtitle="x" value={0} total={0} unit="posts" />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
  });

  it("the warning tone is the peach card, no other tone is", () => {
    const { container, rerender } = render(<StatCard title="Need attention" subtitle="x" value={0} unit="posts" tone="warning" />);
    expect(classesOf(container.firstChild as Element)).toContain("bg-red-100/50");
    rerender(<StatCard title="Need attention" subtitle="x" value={0} unit="posts" />);
    expect(classesOf(container.firstChild as Element)).not.toContain("bg-red-100/50");
  });

  it("shows its action", () => {
    render(<StatCard title="t" subtitle="s" value={0} unit="posts" action={<Button size="icon" aria-label="Open">→</Button>} />);
    expect(screen.getByRole("button", { name: "Open" })).toBeTruthy();
  });
});

describe("SectionPanel", () => {
  it("title, description, action and content", () => {
    render(
      <SectionPanel title="Today's tasks" description="Assigned to you" action={<Button size="sm">View all</Button>}>
        <p>Body</p>
      </SectionPanel>
    );
    expect(screen.getByText("Today's tasks")).toBeTruthy();
    expect(screen.getByText("Assigned to you")).toBeTruthy();
    expect(screen.getByRole("button", { name: "View all" })).toBeTruthy();
    expect(screen.getByText("Body")).toBeTruthy();
  });

  it("works with only a title and content", () => {
    render(<SectionPanel title="Milestones"><p>x</p></SectionPanel>);
    expect(screen.getByText("Milestones")).toBeTruthy();
  });
});

describe("StatusDot and StatusLegend", () => {
  it("a dot uses its status' token class and hides from screen readers", () => {
    const { container } = render(<StatusDot status="design" />);
    const dot = container.firstChild as HTMLElement;
    expect(classesOf(dot)).toContain("bg-status-design");
    expect(dot.getAttribute("aria-hidden")).toBe("true");
  });

  it("the pipeline legend lists six stages with their counts, defaulting to 0", () => {
    render(<StatusLegend variant="pipeline" counts={{ copywriting: 4, review: 2 }} />);
    const rows = within(screen.getByRole("list", { name: "Production stages" })).getAllByRole("listitem");
    expect(rows.map((r) => r.textContent)).toEqual([
      "Brief needed0", "Copywriting4", "In design0", "In review2", "Changes requested0", "Approved0",
    ]);
  });

  it("the calendar legend names the statuses the way the chips on the calendar do, one per status of the list", () => {
    render(<StatusLegend variant="calendar" />);
    const items = within(screen.getByRole("list", { name: "Status legend" })).getAllByRole("listitem");
    expect(items.map((i) => i.textContent)).toEqual(["Draft", "In Review", "Revision Required", "Ready to Publish", "Published", "Failed"]);
  });

  it("each legend entry is a round dot in the colour of that status and its name: no card swatch", () => {
    render(<StatusLegend variant="calendar" />);
    const items = within(screen.getByRole("list", { name: "Status legend" })).getAllByRole("listitem");
    const filters = ["draft", "review", "rejected", "pending", "done", "failed"] as const;
    items.forEach((item, i) => {
      const dot = item.querySelector("span")!;
      expect(dot.getAttribute("aria-hidden")).toBe("true");
      expect(classesOf(dot), filters[i]).toContain("rounded-full");
      expect(classesOf(dot), filters[i]).toContain(CONTENT_STATUS[PILL_OF[filters[i]]].dot);
      expect(classesOf(dot), filters[i]).not.toContain("border-l-3");
    });
  });

  it("the same status has the same colour in the pipeline and the calendar: the legend's dot is the pipeline's dot", () => {
    const { container } = render(<><StatusLegend variant="pipeline" /><StatusLegend variant="calendar" /></>);
    const review = [...container.querySelectorAll("li")].filter((li) => /^in review/i.test(li.textContent ?? ""));
    expect(review).toHaveLength(2);
    expect(classesOf(review[0].querySelector("span")!)).toContain(CONTENT_STATUS.review.dot);
    expect(classesOf(review[1].querySelector("span")!)).toContain(CONTENT_STATUS.review.dot);
  });
});

describe("SegmentedProgress", () => {
  const segs = [
    { label: "Copywriting", value: 3, className: "bg-neutral-500" },
    { label: "In design", value: 1, className: "bg-status-design" },
    { label: "Approved", value: 0, className: "bg-green-600" },
  ];

  it("draws a block per stage that has items, wider for more", () => {
    const { container } = render(<SegmentedProgress segments={segs} label="Production" />);
    const blocks = [...container.querySelectorAll<HTMLElement>("[data-slot=segment]")];
    expect(blocks).toHaveLength(2);
    expect(blocks.map((b) => b.style.getPropertyValue("--grow"))).toEqual(["3", "1"]);
    expect(classesOf(blocks[1])).toContain("bg-status-design");
  });

  it("describes itself in words for screen readers", () => {
    render(<SegmentedProgress segments={segs} label="Production" />);
    expect(screen.getByRole("img", { name: "Production: 3 Copywriting, 1 In design" })).toBeTruthy();
  });

  it("with no items it shows one grey slot per stage, like the empty bar in the design", () => {
    const empty = segs.map((s) => ({ ...s, value: 0 }));
    const { container } = render(<SegmentedProgress segments={empty} label="Production" />);
    const blocks = [...container.querySelectorAll<HTMLElement>("[data-slot=segment]")];
    expect(blocks).toHaveLength(3);
    for (const b of blocks) expect(classesOf(b)).toContain("bg-neutral-100");
    expect(screen.getByRole("img", { name: "Production: no items yet" })).toBeTruthy();
  });

  it("a negative value counts as nothing", () => {
    const { container } = render(<SegmentedProgress segments={[{ label: "a", value: -4, className: "bg-neutral-500" }, { label: "b", value: 2, className: "bg-neutral-800" }]} label="x" />);
    expect(container.querySelectorAll("[data-slot=segment]")).toHaveLength(1);
  });

  it("has no inline width: the share goes through a CSS variable", () => {
    const { container } = render(<SegmentedProgress segments={segs} label="Production" />);
    for (const b of container.querySelectorAll<HTMLElement>("[data-slot=segment]")) {
      expect(b.style.width).toBe("");
      expect(b.getAttribute("style")).toContain("--grow");
    }
  });
});

describe("ChannelRow", () => {
  it("a channel with no account says so and shows the Not connected badge", () => {
    render(<ChannelRow channel={{ platform: "instagram", handle: null, connected: false, posts: 0 }} />);
    expect(screen.getByText("Instagram")).toBeTruthy();
    expect(screen.getByText("No account linked")).toBeTruthy();
    expect(screen.getByText("Not connected")).toBeTruthy();
    expect(screen.getByText("0 posts")).toBeTruthy();
  });

  it("never shows a made-up handle for a channel that is not connected", () => {
    render(<ChannelRow channel={{ platform: "linkedin", handle: "@postly.studio", connected: false, posts: 0 }} />);
    expect(screen.queryByText("@postly.studio")).toBeNull();
    expect(screen.getByText("No account linked")).toBeTruthy();
  });

  it("a connected channel shows its handle, no badge, its posts and a bar against the target", () => {
    render(<ChannelRow channel={{ platform: "linkedin", handle: "@postly.studio", connected: true, posts: 5, target: 20 }} />);
    expect(screen.getByText("LinkedIn")).toBeTruthy();
    expect(screen.getByText("@postly.studio")).toBeTruthy();
    expect(screen.queryByText("Not connected")).toBeNull();
    expect(screen.getByText("5 posts")).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "LinkedIn this month: 5 of 20 posts" }).getAttribute("aria-valuenow")).toBe("25");
  });

  it("says '1 post', not '1 posts'", () => {
    render(<ChannelRow channel={{ platform: "linkedin", handle: "@a", connected: true, posts: 1 }} />);
    expect(screen.getByText("1 post")).toBeTruthy();
  });

  it("without a target the bar stays empty", () => {
    render(<ChannelRow channel={{ platform: "linkedin", handle: "@a", connected: true, posts: 7 }} />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
  });
});

describe("QuickStartStep", () => {
  it("a numbered step with title, help and a link that does it", () => {
    render(
      <ul>
        <QuickStartStep step={{ step: 2, title: "Create your first post", description: "Draft a post.", cta: "Add content", href: "/compose" }} />
      </ul>
    );
    expect(screen.getByRole("heading", { level: 3, name: "Create your first post" })).toBeTruthy();
    expect(screen.getByText("Draft a post.")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    const link = screen.getByRole("link", { name: "Add content" });
    expect(link.getAttribute("href")).toBe("/compose");
  });
});
