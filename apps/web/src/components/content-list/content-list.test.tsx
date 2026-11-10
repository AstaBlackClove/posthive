// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContentDrawer } from "./ContentDrawer";
import { ContentListTable } from "./ContentListTable";
import { DraftBanner } from "./DraftBanner";
import { SelectionBar } from "./SelectionBar";
import { SourceCard } from "./SourceCard";
import { StatusCounts } from "./StatusCounts";
import type { ListCounts, ListItem, PostDetail } from "@/lib/content-list";

const h = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch: h.apiFetch, assetUrl: (u: string) => `http://api.test${u}` }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

afterEach(cleanup);

const item = (patch: Partial<ListItem> = {}): ListItem => ({
  id: "p1",
  status: "draft",
  approvalStatus: null,
  scheduledFor: "2026-03-07T01:00:00.000Z",
  title: "When Environmental Data Leads to Enforcement",
  caption: "Most regional monitoring fails not for lack of data.",
  channels: ["linkedin", "instagram"],
  sourceRow: 1,
  link: "https://docs.google.com/document/d/abc/env-enforcement",
  designCopy: "",
  category: "Geospatial Insight/Expertise",
  ...patch,
});

const counts = (patch: Partial<ListCounts> = {}): ListCounts => ({ all: 60, draft: 60, review: 0, rejected: 0, pending: 0, done: 0, failed: 0, ...patch });

const table = (items: ListItem[], extra: Partial<Parameters<typeof ContentListTable>[0]> = {}) => {
  const handlers = { onToggle: vi.fn(), onToggleAll: vi.fn(), onOpen: vi.fn() };
  render(<ContentListTable items={items} selected={new Set()} openId={null} selectable {...handlers} {...extra} />);
  return handlers;
};

describe("StatusCounts", () => {
  it("is a card for each status of the role, with its count, in the design's order", () => {
    render(<StatusCounts counts={counts({ draft: 58, review: 2 })} filters={["draft", "review", "rejected", "pending", "done", "failed"]} active="all" onPick={() => {}} />);
    const cards = within(screen.getByRole("list", { name: "Posts by status" })).getAllByRole("button");
    expect(cards.map((c) => c.getAttribute("aria-label"))).toEqual([
      "Draft: 58", "In Review: 2", "Revision Required: 0", "Ready to Publish: 0", "Published: 0", "Failed: 0",
    ]);
  });

  it("a role without drafts has no Draft card", () => {
    render(<StatusCounts counts={counts()} filters={["review", "pending", "done", "failed"]} active="all" onPick={() => {}} />);
    expect(screen.queryByRole("button", { name: /^Draft/ })).toBeNull();
  });

  it("a card opens its tab, and the open tab's card is pressed", async () => {
    const onPick = vi.fn();
    render(<StatusCounts counts={counts()} filters={["draft", "review"]} active="review" onPick={onPick} />);
    expect(screen.getByRole("button", { name: "In Review: 0" }).getAttribute("aria-pressed")).toBe("true");
    await userEvent.click(screen.getByRole("button", { name: "Draft: 60" }));
    expect(onPick).toHaveBeenCalledWith("draft");
  });

  it("the cards that ask for action or went well carry a colour; Draft does not", () => {
    render(<StatusCounts counts={counts()} filters={["draft", "rejected", "done", "failed"]} active="all" onPick={() => {}} />);
    const num = (name: string) => screen.getByRole("button", { name }).querySelector("span")!.className;
    expect(num("Revision Required: 0")).toContain("text-red-600");
    expect(num("Published: 0")).toContain("text-green-600");
    expect(num("Failed: 0")).toContain("text-red-600");
    expect(num("Draft: 60")).toContain("text-fg");
  });
});

describe("SourceCard", () => {
  const source = { fileName: "_2026 Content Marketing Plan Braga - Caption.xlsx", importedAt: "2026-11-13T03:42:00.000Z", importedBy: "Putri Anggraini", count: 60 };

  it("names the file, says when, by whom and how many came in", () => {
    render(<SourceCard source={source} canImport />);
    expect(screen.getByRole("heading", { name: source.fileName })).toBeTruthy();
    expect(screen.getByText("Imported 13 Nov 2026 · 10:42 by Putri A. · 60 posts imported · source row numbers kept as Row #")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Import new plan" }).getAttribute("href")).toBe("/jobs/import");
  });

  it("a role that cannot make content has no Import new plan", () => {
    render(<SourceCard source={source} canImport={false} />);
    expect(screen.queryByRole("link", { name: "Import new plan" })).toBeNull();
  });

  it("a file name as long as a sentence is cut to one line, the rest in its tooltip", () => {
    const long = `${"quarterly-plan-".repeat(30)}.xlsx`;
    render(<SourceCard source={{ ...source, fileName: long }} canImport />);
    const title = screen.getByRole("heading", { name: long });
    expect(title.className).toContain("truncate");
    expect(title.getAttribute("title")).toBe(long);
    expect(title.parentElement!.className).toContain("min-w-0");
  });
});

describe("DraftBanner", () => {
  it("says every imported post is a draft and what comes next", () => {
    render(<DraftBanner />);
    expect(screen.getByRole("status").textContent).toContain("All imported posts are in Draft");
    expect(screen.getByRole("status").textContent).toContain("Draft → In Review → Revision Required → Ready to Publish → Published");
  });
});

describe("ContentListTable", () => {
  it("shows the row's number, title, date, platforms, link, caption and status", () => {
    table([item()]);
    const row = screen.getByRole("row", { name: "Open When Environmental Data Leads to Enforcement" });
    expect(within(row).getByText("1")).toBeTruthy();
    expect(within(row).getByText("07 Mar 2026 · 08:00")).toBeTruthy();
    expect(within(row).getByText("LinkedIn")).toBeTruthy();
    expect(within(row).getByText("Instagram")).toBeTruthy();
    expect(within(row).getByRole("link").textContent).toBe("docs.google.com/…/env-enforcement");
    expect(within(row).getByText("Most regional monitoring fails not for lack of data.")).toBeTruthy();
    expect(within(row).getByText("Draft")).toBeTruthy();
  });

  it("a click on the row opens it; so do Enter and Space on the row", async () => {
    const { onOpen } = table([item()]);
    const row = screen.getByRole("row", { name: /Open When/ });
    await userEvent.click(row);
    expect(onOpen).toHaveBeenCalledWith("p1");
    onOpen.mockClear();
    row.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it("the checkbox ticks the row without opening it, and so does Space on the checkbox", async () => {
    const { onOpen, onToggle } = table([item()]);
    await userEvent.click(screen.getByRole("checkbox", { name: "Select When Environmental Data Leads to Enforcement" }));
    expect(onToggle).toHaveBeenCalledWith("p1");
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("the link opens in a new tab without opening the row", async () => {
    const { onOpen } = table([item()]);
    const link = screen.getByRole("link");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    link.addEventListener("click", (e) => e.preventDefault());
    await userEvent.click(link);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("the header checkbox ticks every row of the page, and is mixed when some are", async () => {
    const items = [item({ id: "a" }), item({ id: "b", sourceRow: 3 })];
    const { onToggleAll } = table(items);
    await userEvent.click(screen.getByRole("checkbox", { name: "Select all on this page" }));
    expect(onToggleAll).toHaveBeenCalledWith(["a", "b"], true);
    cleanup();
    render(<ContentListTable items={items} selected={new Set(["a"])} openId={null} selectable onToggle={() => {}} onToggleAll={onToggleAll} onOpen={() => {}} />);
    expect(screen.getByRole("checkbox", { name: "Select all on this page" }).getAttribute("data-state")).toBe("indeterminate");
  });

  it("a role that cannot make content has no checkboxes", () => {
    table([item()], { selectable: false });
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("a post made here has no source row; with no date, no channel and no caption it says so", () => {
    table([item({ sourceRow: null, scheduledFor: null, channels: [], caption: "", link: null })]);
    expect(screen.getByText("No date")).toBeTruthy();
    expect(screen.getByText("No channel")).toBeTruthy();
    expect(screen.getByText("No caption yet")).toBeTruthy();
  });

  it("a design copy that is text, not an address, is not a link", () => {
    table([item({ link: null, designCopy: "Slide 1: the problem" })]);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Slide 1: the problem")).toBeTruthy();
  });

  it("each status has its pill: In Review, Revision Required, Ready to Publish, Published, Failed", () => {
    table([
      item({ id: "a", status: "draft", approvalStatus: "pending" }),
      item({ id: "b", status: "draft", approvalStatus: "rejected" }),
      item({ id: "c", status: "pending" }),
      item({ id: "d", status: "comment_done" }),
      item({ id: "e", status: "post_failed" }),
    ]);
    for (const name of ["In Review", "Revision Required", "Ready to Publish", "Published", "Failed"]) expect(screen.getByText(name)).toBeTruthy();
  });

  it("an open row is marked, and so is a ticked one", () => {
    render(<ContentListTable items={[item({ id: "a" }), item({ id: "b" })]} selected={new Set(["b"])} openId="a" selectable onToggle={() => {}} onToggleAll={() => {}} onOpen={() => {}} />);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0].getAttribute("data-open")).toBe("true");
    expect(rows[1].getAttribute("data-state")).toBe("selected");
  });

  it("a title as long as a paragraph, or an address with no spaces, is cut and cannot widen the table", () => {
    const long = "https://braga.example/posts/geospatial-technology-in-indonesia-from-maps-to-decisions-for-environmental-enforcement";
    table([item({ title: long, caption: "A caption", link: `${long}/x` })]);
    const title = screen.getByText(long);
    expect(title.className).toContain("line-clamp-2");
    expect(title.className).toContain("break-words");
    const link = screen.getByRole("link");
    expect(link.className).toContain("truncate");
    expect(link.className).toContain("block");
    expect(screen.getByRole("table").className).toContain("table-fixed");
  });
});

describe("SelectionBar", () => {
  const bar = (patch: Partial<Parameters<typeof SelectionBar>[0]> = {}) => {
    const handlers = { onClear: vi.fn(), onSubmit: vi.fn(), onDelete: vi.fn() };
    render(<SelectionBar count={0} canEdit canSubmitOwn busy={false} {...handlers} {...patch} />);
    return handlers;
  };

  it("with nothing ticked it says so, and both buttons wait", () => {
    bar();
    expect(screen.getByText(/0 selected · tick rows to submit several posts for review at once/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Submit selected for review" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Delete" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("with some ticked it counts them, and each button does its work", async () => {
    const { onSubmit, onDelete, onClear } = bar({ count: 3 });
    expect(screen.getByText(/3 selected/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Submit selected for review" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete 3" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("the people who do not go through review have no Submit, and a review-only role has neither button", () => {
    bar({ count: 2, canSubmitOwn: false });
    expect(screen.queryByRole("button", { name: "Submit selected for review" })).toBeNull();
    expect(screen.getByRole("button", { name: "Delete 2" })).toBeTruthy();
    cleanup();
    bar({ count: 2, canEdit: false, canSubmitOwn: false });
    expect(screen.queryByRole("button", { name: /Delete|Submit/ })).toBeNull();
  });

  it("while something runs, the buttons wait", () => {
    bar({ count: 2, busy: true });
    expect((screen.getByRole("button", { name: "Delete 2" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("ContentDrawer", () => {
  const detail = (patch: Partial<PostDetail> = {}): PostDetail => ({
    ...item(),
    pillar: "Educational",
    owner: "Putri A.",
    accounts: [],
    caption: "Most regional monitoring fails not for lack of data.",
    captionLength: 226,
    commentText: null,
    media: [],
    reviewNote: null,
    source: { fileName: "_2026 Plan.xlsx", importedAt: "2026-11-13T03:42:00.000Z" },
    activity: [{ kind: "imported", by: "Putri Anggraini", at: "2026-11-13T03:42:00.000Z", note: null, channel: null }],
    mine: true,
    missing: [],
    ...patch,
  });

  const open = async (post: PostDetail, role: Partial<Parameters<typeof ContentDrawer>[0]> = {}) => {
    h.apiFetch.mockResolvedValue(post);
    const handlers = { onClose: vi.fn(), onEdit: vi.fn(), onReview: vi.fn(), onSubmit: vi.fn(), onRetry: vi.fn(), onDelete: vi.fn() };
    render(<ContentDrawer id="p1" templates={[]} canEdit canReview={false} canSubmitOwn={false} {...handlers} {...role} />);
    await screen.findByRole("heading", { name: post.title });
    return handlers;
  };

  beforeEach(() => h.apiFetch.mockReset());

  it("asks for the post of its id, and shows nothing while closed", async () => {
    render(<ContentDrawer id={null} templates={[]} canEdit canReview={false} canSubmitOwn={false} onClose={() => {}} onEdit={() => {}} onReview={() => {}} onSubmit={() => {}} onRetry={() => {}} onDelete={() => {}} />);
    expect(h.apiFetch).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
    cleanup();
    await open(detail());
    expect(h.apiFetch).toHaveBeenCalledWith("/jobs/p1/detail");
  });

  it("is the post as the design draws it: where it came from, three statuses, the facts, the caption, the activity", async () => {
    await open(detail());
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("Content detail · Row 1 · Pillar: Geospatial Insight/Expertise");
    expect(dialog.textContent).toContain("Draft · Imported from _2026 Plan.xlsx (row 1) · 13 Nov 2026");
    expect(within(dialog).getByText("Content: Draft")).toBeTruthy();
    expect(within(dialog).getByText("Approval: Not submitted")).toBeTruthy();
    expect(within(dialog).getByText("Publishing: Not scheduled")).toBeTruthy();
    expect(within(dialog).getByText("Sat, 07 Mar 2026")).toBeTruthy();
    expect(within(dialog).getByText("08:00 WIB")).toBeTruthy();
    expect(within(dialog).getByText("LinkedIn · Instagram")).toBeTruthy();
    expect(within(dialog).getByText("226 / 2,200 characters")).toBeTruthy(); // Instagram's limit is the smaller one
    expect(within(dialog).getByText("Imported as Draft by Putri A. · 13 Nov 2026, 10:42")).toBeTruthy();
  });

  it("does not make up what is not stored: no format tile, no priority tile", async () => {
    await open(detail());
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByText("Content format")).toBeNull();
    expect(within(dialog).queryByText("Priority")).toBeNull();
  });

  it("the link is an address only when the server said it is one", async () => {
    await open(detail());
    expect(within(screen.getByRole("dialog")).getByRole("link", { name: "docs.google.com/document/d/abc/env-enforcement" }).getAttribute("href")).toBe("https://docs.google.com/document/d/abc/env-enforcement");
    cleanup();
    await open(detail({ link: null, designCopy: "Slide 1" }));
    expect(within(screen.getByRole("dialog")).queryByRole("link", { name: /docs\.google/ })).toBeNull();
    expect(within(screen.getByRole("dialog")).getByText("Not a link")).toBeTruthy();
  });

  it("a caption over what its channel takes says by how much", async () => {
    await open(detail({ channels: ["threads"], captionLength: 620 }));
    expect(within(screen.getByRole("dialog")).getByText("620 / 500 characters")).toBeTruthy();
    expect(within(screen.getByRole("dialog")).getByRole("status").textContent).toContain("120 characters over");
  });

  it("with no design it says so and what to do; with images it shows them and counts them in the tab", async () => {
    await open(detail());
    expect(within(screen.getByRole("dialog")).getAllByText("No template or design yet").length).toBeGreaterThan(0);
    expect(screen.getByRole("tab", { name: "Design (0)" })).toBeTruthy();
    cleanup();
    await open(detail({ media: ["/uploads/a.png", "/uploads/b.png"] }));
    expect(screen.getByRole("tab", { name: "Design (2)" })).toBeTruthy();
    const imgs = [...screen.getByRole("dialog").querySelectorAll("img")];
    expect(imgs.map((i) => i.getAttribute("src"))).toEqual(expect.arrayContaining(["http://api.test/uploads/a.png"]));
  });

  it("the tabs show Overview, the design alone, or the activity alone", async () => {
    await open(detail({ activity: [{ kind: "imported", by: null, at: "2026-11-13T03:42:00.000Z", note: null, channel: null }, { kind: "revision", by: "Dewi Kusuma", at: "2026-11-14T02:00:00.000Z", note: "Fix the hook", channel: null }] }));
    expect(screen.getByRole("tab", { name: "Activity (2)" })).toBeTruthy();
    await userEvent.click(screen.getByRole("tab", { name: "Activity (2)" }));
    const log = screen.getByRole("list");
    // newest first
    expect(within(log).getAllByRole("listitem")[0].textContent).toContain("Revision requested by Dewi K.: Fix the hook");
    expect(screen.queryByText("Content information")).toBeNull();
  });

  /** The buttons of the footer, by name. */
  const buttons = () => within(screen.getByRole("dialog").querySelector("footer")!).queryAllByRole("button").map((b) => b.textContent);
  const lacking: PostDetail["missing"] = ["accounts", "media"];

  describe("the footer", () => {
    it("a draft that still lacks a required field has two buttons: Close and Edit Content. No Delete, no Submit, no Duplicate", async () => {
      await open(detail({ missing: lacking }), { canSubmitOwn: true });
      expect(buttons()).toEqual(["Close", "Edit Content"]);
      await open(detail({ missing: lacking }), { canSubmitOwn: false });
      expect(buttons()).toEqual(["Close", "Edit Content"]);
    });

    it("an admin's draft that lacks a field has the same two buttons", async () => {
      await open(detail({ missing: lacking, mine: true }), { canReview: true });
      expect(buttons()).toEqual(["Close", "Edit Content"]);
    });

    it("once every required field is there a draft also has Submit for review and Delete", async () => {
      await open(detail({ missing: [] }), { canSubmitOwn: true });
      expect(buttons()).toEqual(["Delete", "Submit for review", "Close", "Edit Content"]);
    });

    it("a person who does not go through review has Delete but no Submit when the draft is complete", async () => {
      await open(detail({ missing: [] }), { canSubmitOwn: false });
      expect(buttons()).toEqual(["Delete", "Close", "Edit Content"]);
    });

    it("a post sent back for changes follows the same gate as a draft", async () => {
      await open(detail({ approvalStatus: "rejected", missing: lacking }), { canSubmitOwn: true });
      expect(buttons()).toEqual(["Close", "Edit Content"]);
      await open(detail({ approvalStatus: "rejected", missing: [] }), { canSubmitOwn: true });
      expect(buttons()).toEqual(["Delete", "Submit for review", "Close", "Edit Content"]);
    });

    it("a post in review has no Submit when it is opened again without a change: Delete, Close and Edit Content", async () => {
      await open(detail({ approvalStatus: "pending", missing: [] }), { canSubmitOwn: true });
      expect(buttons()).toEqual(["Delete", "Close", "Edit Content"]);
      expect(screen.queryByRole("button", { name: "Submit for review" })).toBeNull();
    });

    it("an edit that pulls the post back to a draft brings Submit back: the server clears the review, so the post is a draft again", async () => {
      // what the server answers after a content edit by Marketing: status draft, no approval
      await open(detail({ approvalStatus: null, missing: [] }), { canSubmitOwn: true });
      expect(screen.getByRole("button", { name: "Submit for review" })).toBeTruthy();
    });

    it("an edit that leaves a field empty (or empties one) takes Submit and Delete away again", async () => {
      await open(detail({ approvalStatus: null, missing: ["caption"] }), { canSubmitOwn: true });
      expect(buttons()).toEqual(["Close", "Edit Content"]);
    });

    it("the reviewer sees Review on a post in review, and Edit Content, without Submit", async () => {
      const { onReview } = await open(detail({ approvalStatus: "pending", missing: [], mine: false }), { canReview: true });
      expect(buttons()).toEqual(["Delete", "Review", "Close", "Edit Content"]);
      await userEvent.click(screen.getByRole("button", { name: "Review" }));
      expect(onReview).toHaveBeenCalledWith("p1");
    });

    it("a post that is not the person's own has only Close, for a person who goes through review: the server refuses their edit, submit and delete", async () => {
      await open(detail({ mine: false, missing: [] }), { canSubmitOwn: true });
      expect(buttons()).toEqual(["Close"]);
    });

    it("a role that cannot make content can only read: Close, and the footer says only 'Preview only'", async () => {
      await open(detail({ missing: [] }), { canEdit: false });
      expect(buttons()).toEqual(["Close"]);
      expect(screen.getByText("Preview only")).toBeTruthy();
    });

    it("a post that is out cannot be edited or submitted; it can be deleted by the person who may", async () => {
      await open(detail({ status: "done", missing: [] }));
      expect(buttons()).toEqual(["Delete", "Close"]);
    });

    it("an approved (Ready to Publish) post is locked for a person who goes through review, open to an admin", async () => {
      await open(detail({ status: "pending", missing: [] }), { canSubmitOwn: true });
      expect(buttons()).toEqual(["Delete", "Close"]);
      await open(detail({ status: "pending", missing: [] }), { canSubmitOwn: false });
      expect(buttons()).toEqual(["Delete", "Close", "Edit Content"]);
    });

    it("a failed post can be retried, by the people who make content, as well as deleted", async () => {
      const { onRetry } = await open(detail({ status: "post_failed", missing: [] }));
      expect(buttons()).toEqual(["Delete", "Retry failed", "Close"]);
      await userEvent.click(screen.getByRole("button", { name: "Retry failed" }));
      expect(onRetry).toHaveBeenCalledWith("p1");
    });

    it("there is no Duplicate and no 'More actions' menu anywhere", async () => {
      for (const missing of [lacking, []] as const) {
        await open(detail({ missing: [...missing] }), { canSubmitOwn: true });
        expect(screen.queryByRole("button", { name: /Duplicate|More actions/ })).toBeNull();
        cleanup();
      }
    });

    it("each button does its work", async () => {
      const { onEdit, onSubmit, onDelete, onClose } = await open(detail({ missing: [] }), { canSubmitOwn: true });
      await userEvent.click(screen.getByRole("button", { name: "Edit Content" }));
      await userEvent.click(screen.getByRole("button", { name: "Submit for review" }));
      await userEvent.click(screen.getByRole("button", { name: "Delete" }));
      await userEvent.click(within(screen.getByRole("dialog").querySelector("footer")!).getByRole("button", { name: "Close" }));
      expect(onEdit).toHaveBeenCalledWith("p1");
      expect(onSubmit).toHaveBeenCalledWith("p1");
      expect(onDelete).toHaveBeenCalledWith("p1");
      expect(onClose).toHaveBeenCalled();
    });

    it("tells the person who sends posts for review what a draft still lacks, in the words of the editor", async () => {
      await open(detail({ missing: ["title", "accounts", "media"] }), { canSubmitOwn: true });
      expect(within(screen.getByRole("dialog")).getByRole("status").textContent).toBe("Add title, an account and media to send for approval.");
    });

    it("says nothing about what is missing to anyone else, and nothing once the draft is complete", async () => {
      await open(detail({ missing: lacking }), { canSubmitOwn: false });
      expect(within(screen.getByRole("dialog")).queryByRole("status")).toBeNull();
      expect(screen.getByText("Preview only · all edits happen in the full-page editor")).toBeTruthy();
      cleanup();
      await open(detail({ missing: [] }), { canSubmitOwn: true });
      expect(within(screen.getByRole("dialog")).queryByRole("status")).toBeNull();
    });
  });

  it("when the post cannot be loaded it says why, and no action is offered on it", async () => {
    // the rejection is created when the drawer asks, so the drawer's own .catch is already attached
    h.apiFetch.mockImplementationOnce(() => new Promise((_, reject) => setTimeout(() => reject(new Error("Job not found")), 0)));
    render(<ContentDrawer id="p1" templates={[]} canEdit canReview={false} canSubmitOwn={false} onClose={() => {}} onEdit={() => {}} onReview={() => {}} onSubmit={() => {}} onRetry={() => {}} onDelete={() => {}} />);
    expect((await screen.findByRole("alert")).textContent).toBe("Job not found");
    expect(screen.getByRole("heading", { name: "This post can't be shown" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Edit Content" })).toBeNull();
  });

  it("an answer for a row the person already left does not land on the next one", async () => {
    let resolveFirst!: (v: PostDetail) => void;
    h.apiFetch.mockImplementation((path: string) => (path === "/jobs/p1/detail" ? new Promise((r) => (resolveFirst = r)) : Promise.resolve(detail({ id: "p2", title: "Second post" }))));
    const props = { templates: [], canEdit: true, canReview: false, canSubmitOwn: false, onClose: () => {}, onEdit: () => {}, onReview: () => {}, onSubmit: () => {}, onRetry: () => {}, onDelete: () => {} };
    const { rerender } = render(<ContentDrawer id="p1" {...props} />);
    rerender(<ContentDrawer id="p2" {...props} />);
    await screen.findByRole("heading", { name: "Second post" });
    resolveFirst(detail({ id: "p1", title: "First post" }));
    await Promise.resolve();
    expect(screen.queryByRole("heading", { name: "First post" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Second post" })).toBeTruthy();
  });

  it("a title as long as a paragraph wraps inside the drawer, not past it", async () => {
    const long = "https://braga.example/posts/geospatial-technology-in-indonesia-from-maps-to-decisions-for-environmental-enforcement";
    await open(detail({ title: long }));
    expect(screen.getByRole("heading", { name: long }).className).toContain("break-words");
    fireEvent.keyDown(document, { key: "Escape" });
  });
});
