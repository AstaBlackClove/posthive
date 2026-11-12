// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ListAnswer, ListCounts, ListItem, PostDetail } from "@/lib/content-list";
import type { CalendarAnswer } from "@/lib/useContentList";

const h = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  push: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
  perms: { canEditContent: true, canReview: false, canSubmitOwn: false },
}));

vi.mock("@/lib/api", () => ({ apiFetch: h.apiFetch, assetUrl: (u: string) => u }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: { name: "Putri Anggraini", avatarUrl: null } }) }));
vi.mock("@/lib/usePermissions", () => ({ usePermissions: () => h.perms }));
vi.mock("@/components/Toast", () => ({ useToast: () => h.toast }));
vi.mock("@/components/TrialUrgentBanner", () => ({ TrialUrgentBanner: () => null }));
// The dialogs have their own tests; here only that the page hands them the right post
vi.mock("@/components/EditPostDialog", () => ({ EditPostDialog: ({ job }: { job: { id: string } }) => <div role="dialog" aria-label="edit dialog">{job.id}</div> }));
vi.mock("@/components/ReviewDialog", () => ({ ReviewDialog: ({ job }: { job: { id: string } }) => <div role="dialog" aria-label="review dialog">{job.id}</div> }));

import ContentListPage from "./page";

const row = (n: number, patch: Partial<ListItem> = {}): ListItem => ({
  id: `p${n}`,
  status: "draft",
  approvalStatus: null,
  scheduledFor: "2026-03-07T01:00:00.000Z",
  title: `Post ${n}`,
  caption: `Caption ${n}`,
  channels: ["linkedin"],
  sourceRow: n,
  link: null,
  designCopy: "",
  category: null,
  ...patch,
});

const counts = (patch: Partial<ListCounts> = {}): ListCounts => ({ all: 60, draft: 60, review: 0, rejected: 0, pending: 0, done: 0, failed: 0, ...patch });

const source = { fileName: "_2026 Plan.xlsx", importedAt: "2026-11-13T03:42:00.000Z", importedBy: "Putri Anggraini", count: 60 };

const answer = (patch: Partial<ListAnswer> = {}): ListAnswer => ({
  items: [row(1), row(2)],
  total: 60,
  page: 1,
  pageSize: 10,
  pageCount: 6,
  counts: counts(),
  source,
  ...patch,
});

const detail = (id = "p1"): PostDetail => ({
  ...row(1, { id }),
  pillar: null,
  owner: null,
  accounts: [],
  caption: "A full caption",
  captionLength: 14,
  commentText: null,
  media: [],
  reviewNote: null,
  source: null,
  activity: [{ kind: "created", by: "Putri Anggraini", at: "2026-11-13T03:00:00.000Z", note: null, channel: null }],
  mine: true,
  missing: [],
});

/** The calendar's answer for a range: no post in it, none before or after. */
const calendar = (query: URLSearchParams, patch: Partial<CalendarAnswer> = {}): CalendarAnswer => ({
  from: query.get("from") ?? "",
  to: query.get("to") ?? "",
  items: [],
  truncated: false,
  next: null,
  prev: null,
  ...patch,
});

/** Answer each path; the list can be answered per query. */
function serve(
  list: (query: URLSearchParams) => ListAnswer | Promise<ListAnswer> = () => answer(),
  cal: (query: URLSearchParams) => CalendarAnswer | Promise<CalendarAnswer> = (q) => calendar(q)
) {
  h.apiFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
    const [pathname, search = ""] = path.split("?");
    if (pathname === "/jobs/list") return list(new URLSearchParams(search));
    if (pathname === "/jobs/calendar") return cal(new URLSearchParams(search));
    if (/^\/jobs\/[^/]+\/detail$/.test(pathname)) return detail(pathname.split("/")[2]);
    if (pathname === "/accounts") return [];
    if (pathname === "/templates") return { templates: [] };
    if (pathname === "/jobs/submit-bulk") return { submitted: ["p1", "p2"], skipped: [] };
    if (pathname === "/jobs/bulk" && init?.method === "DELETE") return { deleted: 2 };
    if (/^\/jobs\/[^/]+$/.test(pathname)) return { id: pathname.split("/")[2], status: "draft", content: JSON.stringify({ title: "T", text: "C" }), targets: [], scheduledFor: null, commentText: null };
    if (/^\/jobs\/[^/]+\/(submit|retry-failed)$/.test(pathname)) return {};
    throw new Error(`unexpected ${path}`);
  });
}

beforeEach(() => {
  h.apiFetch.mockReset();
  h.push.mockReset();
  h.toast.success.mockReset();
  h.toast.error.mockReset();
  h.perms = { canEditContent: true, canReview: false, canSubmitOwn: false };
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-13T04:00:00Z"));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const listCalls = () => h.apiFetch.mock.calls.map((c) => String(c[0])).filter((p) => p.startsWith("/jobs/list"));

describe("Content List page", () => {
  it("shows a loading state first, then the imported file, the status cards, the banner and the rows", async () => {
    serve();
    render(<ContentListPage />);
    expect(screen.getByLabelText("Loading the content list").getAttribute("aria-busy")).toBe("true");
    expect(await screen.findByText("Post 1")).toBeTruthy();
    expect(screen.queryByLabelText("Loading the content list")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Content List");
    expect(screen.getByText("60 posts imported from your quarterly plan. Every post starts as Draft.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "_2026 Plan.xlsx" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Draft: 60" })).toBeTruthy();
    expect(screen.getByText("All imported posts are in Draft")).toBeTruthy();
    expect(screen.getByText("Showing 2 of 60 posts · 60 Draft")).toBeTruthy();
    // the table is the view it opens in; the other two are one click away
    expect(screen.getByRole("radio", { name: "Table view" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "Kanban view" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Calendar view" })).toBeTruthy();
  });

  it("asks for the first page of All, and for the imported file once", async () => {
    serve();
    render(<ContentListPage />);
    await screen.findByText("Post 1");
    expect(listCalls()).toEqual(["/jobs/list?filter=all&page=1&limit=10&source=1"]);
  });

  it("a page turn asks for that page and does not ask for the file again", async () => {
    serve((q) => answer({ page: Number(q.get("page")), items: [row(Number(q.get("page")) * 10)] }));
    render(<ContentListPage />);
    await screen.findByText("Post 10");
    await userEvent.click(screen.getByRole("button", { name: "Page 2" }));
    expect(await screen.findByText("Post 20")).toBeTruthy();
    expect(listCalls().at(-1)).toBe("/jobs/list?filter=all&page=2&limit=10");
    // the file card stays while the next page loads
    expect(screen.getByRole("heading", { name: "_2026 Plan.xlsx" })).toBeTruthy();
  });

  it("the # column counts the list from 1 and goes on over the pages, whatever row of the file a post came from", async () => {
    // Post 20 is row 20 of the file, but it is the 11th of the list
    serve((q) => answer({ page: Number(q.get("page")), items: [row(Number(q.get("page")) * 10)] }));
    render(<ContentListPage />);
    const numberOf = async (title: string) => within(await screen.findByRole("row", { name: `Open ${title}` })).getAllByRole("cell")[1].textContent;
    expect(await numberOf("Post 10")).toBe("1");
    await userEvent.click(screen.getByRole("button", { name: "Page 2" }));
    expect(await numberOf("Post 20")).toBe("11");
  });

  it("after a reload (an action) the next answer asks for the file again, and a page turn after that does not", async () => {
    serve((q) => answer({ page: Number(q.get("page")), items: [row(Number(q.get("page")) * 10)] }));
    render(<ContentListPage />);
    await userEvent.click(await screen.findByRole("row", { name: /^Open Post 10$/ }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }));
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(h.toast.success).toHaveBeenCalled());
    await waitFor(() => expect(listCalls().at(-1)).toContain("source=1"));
    await userEvent.click(await screen.findByRole("button", { name: "Page 2" }));
    await waitFor(() => expect(listCalls().at(-1)).toContain("page=2"));
    expect(listCalls().at(-1)).not.toContain("source=1");
  });

  it("a status card or tab shows that status from page 1", async () => {
    h.perms = { canEditContent: true, canReview: true, canSubmitOwn: false };
    serve((q) => answer({ counts: counts({ draft: 58, review: 2 }), items: [row(1)], page: Number(q.get("page")) }));
    render(<ContentListPage />);
    await screen.findByText("Post 1");
    await userEvent.click(screen.getByRole("button", { name: "Page 3" }));
    await waitFor(() => expect(listCalls().at(-1)).toContain("page=3"));
    await userEvent.click(screen.getByRole("button", { name: "In Review: 2" }));
    await waitFor(() => expect(listCalls().at(-1)).toBe("/jobs/list?filter=review&page=1&limit=10"));
    await userEvent.click(screen.getByRole("tab", { name: /^All content/ }));
    await waitFor(() => expect(listCalls().at(-1)).toBe("/jobs/list?filter=all&page=1&limit=10"));
  });

  it("once a post has moved on, the banner is gone and the subtitle no longer says every post is a draft", async () => {
    serve(() => answer({ counts: counts({ draft: 58, review: 2 }) }));
    render(<ContentListPage />);
    await screen.findByText("Post 1");
    expect(screen.queryByText("All imported posts are in Draft")).toBeNull();
    expect(screen.getByText("60 posts in this workspace, soonest first.")).toBeTruthy();
  });

  it("a workspace with posts made by hand has no file card and no banner", async () => {
    serve(() => answer({ source: null, counts: counts({ all: 3, draft: 3 }), total: 3, pageCount: 1 }));
    render(<ContentListPage />);
    await screen.findByText("Post 1");
    expect(screen.queryByText("All imported posts are in Draft")).toBeNull();
    expect(screen.queryByRole("link", { name: "Import new plan" })).toBeNull();
  });

  it("an empty workspace is invited to import a plan or write a post", async () => {
    serve(() => answer({ items: [], total: 0, pageCount: 1, counts: counts({ all: 0, draft: 0 }), source: null }));
    render(<ContentListPage />);
    expect(await screen.findByText("No content yet")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Import plan" }).getAttribute("href")).toBe("/jobs/import");
    expect(screen.getByRole("link", { name: "Add content" }).getAttribute("href")).toBe("/compose");
    expect(screen.queryByRole("list", { name: "Posts by status" })).toBeNull();
  });

  it("a role that cannot make content gets the empty state without the buttons", async () => {
    h.perms = { canEditContent: false, canReview: true, canSubmitOwn: false };
    serve(() => answer({ items: [], total: 0, pageCount: 1, counts: counts({ all: 0, draft: 0 }), source: null }));
    render(<ContentListPage />);
    await screen.findByText("No content yet");
    expect(screen.queryByRole("link", { name: "Import plan" })).toBeNull();
  });

  it("a failed load says why and Try again asks again; it does not show zeros", async () => {
    let fail = true;
    h.apiFetch.mockImplementation(async (path: string) => {
      if (path.startsWith("/jobs/list")) {
        if (fail) throw new Error("Server is down");
        return answer();
      }
      return path === "/templates" ? { templates: [] } : [];
    });
    render(<ContentListPage />);
    expect((await screen.findByRole("alert")).textContent).toContain("Server is down");
    expect(screen.queryByRole("list", { name: "Posts by status" })).toBeNull();
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Post 1")).toBeTruthy();
  });

  it("an answer for a page the person already left does not replace the page they are on", async () => {
    let releaseOld!: (a: ListAnswer) => void;
    serve((q) => (q.get("page") === "1" && !q.has("source") ? new Promise((r) => (releaseOld = r)) : answer({ page: Number(q.get("page")), items: [row(Number(q.get("page")) * 10)] })));
    // page 1 answers at once; the slow one is a second request for page 1 (after a filter round trip)
    h.apiFetch.mockImplementationOnce(async () => answer());
    render(<ContentListPage />);
    await screen.findByText("Post 1");
    await userEvent.click(screen.getByRole("button", { name: "Page 2" }));
    await screen.findByText("Post 20");
    await userEvent.click(screen.getByRole("button", { name: "Page 1" }));
    await userEvent.click(screen.getByRole("button", { name: "Page 2" }));
    await screen.findByText("Post 20");
    releaseOld(answer({ items: [row(99)] }));
    await Promise.resolve();
    expect(screen.queryByText("Post 99")).toBeNull();
  });

  describe("the drawer", () => {
    it("the accounts and the design references are asked the first time something needs them, and once: not when the list opens", async () => {
      serve();
      render(<ContentListPage />);
      await screen.findByText("Post 1");
      const asked = (p: string) => h.apiFetch.mock.calls.filter((c) => c[0] === p).length;
      expect(asked("/accounts")).toBe(0);
      expect(asked("/templates")).toBe(0);
      await userEvent.click(screen.getByRole("row", { name: "Open Post 1" }));
      await waitFor(() => expect(asked("/templates")).toBe(1));
      expect(asked("/accounts")).toBe(1);
      await screen.findByRole("heading", { name: "Post 1" });
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      await userEvent.click(screen.getByRole("row", { name: "Open Post 2" }));
      await screen.findByRole("dialog");
      expect(asked("/accounts")).toBe(1);
      expect(asked("/templates")).toBe(1);
    });

    it("a click on a row opens that post", async () => {
      serve();
      render(<ContentListPage />);
      await userEvent.click(await screen.findByRole("row", { name: "Open Post 2" }));
      expect(h.apiFetch).toHaveBeenCalledWith("/jobs/p2/detail");
      expect(await screen.findByRole("heading", { name: "Post 1" })).toBeTruthy();
    });

    it("Edit Content waits for the accounts: the editor reads them once, when it opens, so it must not open on an empty list", async () => {
      serve();
      const base = h.apiFetch.getMockImplementation()!;
      let release!: () => void;
      h.apiFetch.mockImplementation(async (path: string, init?: { method?: string }) =>
        path === "/accounts" ? new Promise((resolve) => (release = () => resolve([]))) : base(path, init as never)
      );
      render(<ContentListPage />);
      await userEvent.click(await screen.findByRole("row", { name: "Open Post 1" }));
      await userEvent.click(await screen.findByRole("button", { name: "Edit Content" }));
      await waitFor(() => expect(h.apiFetch).toHaveBeenCalledWith("/jobs/p1"));
      expect(screen.queryByRole("dialog", { name: "edit dialog" })).toBeNull();
      release();
      expect(await screen.findByRole("dialog", { name: "edit dialog" })).toBeTruthy();
    });

    it("Edit Content fetches the whole post and opens the editor with it", async () => {
      serve();
      render(<ContentListPage />);
      await userEvent.click(await screen.findByRole("row", { name: "Open Post 1" }));
      await userEvent.click(await screen.findByRole("button", { name: "Edit Content" }));
      expect(h.apiFetch).toHaveBeenCalledWith("/jobs/p1");
      expect((await screen.findByRole("dialog", { name: "edit dialog" })).textContent).toBe("p1");
    });

    it("Review (for the people who approve) opens the review dialog on a post in review", async () => {
      h.perms = { canEditContent: false, canReview: true, canSubmitOwn: false };
      serve(() => answer({ items: [row(1, { approvalStatus: "pending" })], counts: counts({ draft: 0, review: 60 }) }));
      h.apiFetch.mockImplementation(async (path: string) => {
        if (path.startsWith("/jobs/list")) return answer({ items: [row(1, { approvalStatus: "pending" })], counts: counts({ draft: 0, review: 60 }) });
        if (path === "/jobs/p1/detail") return { ...detail(), approvalStatus: "pending" };
        if (path === "/jobs/p1") return { id: "p1", status: "draft", approvalStatus: "pending", content: "{}", targets: [], scheduledFor: null, commentText: null };
        return path === "/templates" ? { templates: [] } : [];
      });
      render(<ContentListPage />);
      await userEvent.click(await screen.findByRole("row", { name: "Open Post 1" }));
      await userEvent.click(await screen.findByRole("button", { name: "Review" }));
      expect(await screen.findByRole("dialog", { name: "review dialog" })).toBeTruthy();
    });

    it("Delete asks first, and then deletes that one post and reloads", async () => {
      serve();
      render(<ContentListPage />);
      await userEvent.click(await screen.findByRole("row", { name: "Open Post 1" }));
      await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));
      expect(await screen.findByText("Delete this post?")).toBeTruthy();
      expect(h.apiFetch).not.toHaveBeenCalledWith("/jobs/p1", expect.objectContaining({ method: "DELETE" }));
      const before = listCalls().length;
      await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));
      await waitFor(() => expect(h.apiFetch).toHaveBeenCalledWith("/jobs/p1", { method: "DELETE" }));
      await waitFor(() => expect(h.toast.success).toHaveBeenCalledWith("Deleted 1 post."));
      await waitFor(() => expect(listCalls().length).toBeGreaterThan(before));
    });
  });

  describe("the drawer's buttons follow what the post has", () => {
    const footer = () => within(screen.getByRole("dialog").querySelector("footer")!).queryAllByRole("button").map((b) => b.textContent);

    it("a draft that lacks a field has Close and Edit Content; after the edit makes it complete, opening it again shows Submit for review and Delete", async () => {
      h.perms = { canEditContent: true, canReview: false, canSubmitOwn: true };
      let complete = false;
      serve();
      const base = h.apiFetch.getMockImplementation()!;
      h.apiFetch.mockImplementation(async (path: string, init?: unknown) =>
        path === "/jobs/p1/detail" ? { ...detail(), missing: complete ? [] : ["accounts", "media"] } : base(path, init as never));
      render(<ContentListPage />);
      await userEvent.click(await screen.findByRole("row", { name: "Open Post 1" }));
      await screen.findByRole("heading", { name: "Post 1" });
      expect(footer()).toEqual(["Close", "Edit Content"]);
      await userEvent.click(within(screen.getByRole("dialog").querySelector("footer")!).getByRole("button", { name: "Close" }));
      complete = true; // the person filled the account and the media in the editor
      await userEvent.click(await screen.findByRole("row", { name: "Open Post 1" }));
      await waitFor(() => expect(footer()).toEqual(["Delete", "Submit for review", "Close", "Edit Content"]));
    });

    it("a post in review shows no Submit when it is opened again; once an edit pulls it back to a draft the button is back", async () => {
      h.perms = { canEditContent: true, canReview: false, canSubmitOwn: true };
      let state: { approvalStatus: string | null } = { approvalStatus: "pending" };
      serve();
      const base = h.apiFetch.getMockImplementation()!;
      h.apiFetch.mockImplementation(async (path: string, init?: unknown) =>
        path === "/jobs/p1/detail" ? { ...detail(), ...state, missing: [] } : base(path, init as never));
      render(<ContentListPage />);
      await userEvent.click(await screen.findByRole("row", { name: "Open Post 1" }));
      await screen.findByRole("heading", { name: "Post 1" });
      expect(footer()).toEqual(["Delete", "Close", "Edit Content"]);
      await userEvent.click(within(screen.getByRole("dialog").querySelector("footer")!).getByRole("button", { name: "Close" }));
      state = { approvalStatus: null }; // the server reset the review when the content changed
      await userEvent.click(await screen.findByRole("row", { name: "Open Post 1" }));
      await waitFor(() => expect(footer()).toEqual(["Delete", "Submit for review", "Close", "Edit Content"]));
    });

    it("a post the reviewer sent back has no Submit when it is opened again; once an edit has cleared the rejection the button is back", async () => {
      h.perms = { canEditContent: true, canReview: false, canSubmitOwn: true };
      let state: { approvalStatus: string | null; reviewNote: string | null } = { approvalStatus: "rejected", reviewNote: "Fix the hook" };
      serve();
      const base = h.apiFetch.getMockImplementation()!;
      h.apiFetch.mockImplementation(async (path: string, init?: unknown) =>
        path === "/jobs/p1/detail" ? { ...detail(), ...state, missing: [] } : base(path, init as never));
      render(<ContentListPage />);
      await userEvent.click(await screen.findByRole("row", { name: "Open Post 1" }));
      await screen.findByRole("heading", { name: "Post 1" });
      expect(footer()).toEqual(["Delete", "Close", "Edit Content"]);
      await userEvent.click(within(screen.getByRole("dialog").querySelector("footer")!).getByRole("button", { name: "Close" }));
      state = { approvalStatus: null, reviewNote: null }; // the server cleared the rejection when the content changed
      await userEvent.click(await screen.findByRole("row", { name: "Open Post 1" }));
      await waitFor(() => expect(footer()).toEqual(["Delete", "Submit for review", "Close", "Edit Content"]));
    });

    it("Submit for review sends that post and closes the drawer", async () => {
      h.perms = { canEditContent: true, canReview: false, canSubmitOwn: true };
      serve();
      render(<ContentListPage />);
      await userEvent.click(await screen.findByRole("row", { name: "Open Post 1" }));
      await userEvent.click(await screen.findByRole("button", { name: "Submit for review" }));
      await waitFor(() => expect(h.apiFetch).toHaveBeenCalledWith("/jobs/p1/submit", { method: "POST" }));
      await waitFor(() => expect(h.toast.success).toHaveBeenCalledWith("Sent for design review: waiting for approval."));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    });
  });

  describe("selecting rows", () => {
    const bar = () => screen.queryByRole("region", { name: "Selected posts" });

    it("the bar is not there until a row is ticked; ticking counts them; Clear takes it away; a status change does too", async () => {
      serve();
      render(<ContentListPage />);
      await screen.findByText("Post 1");
      expect(bar()).toBeNull();
      await userEvent.click(screen.getByRole("checkbox", { name: "Select Post 1" }));
      await userEvent.click(screen.getByRole("checkbox", { name: "Select Post 2" }));
      expect(within(bar()!).getByText(/2 selected/)).toBeTruthy();
      await userEvent.click(screen.getByRole("button", { name: "Clear" }));
      expect(bar()).toBeNull();
      await userEvent.click(screen.getByRole("checkbox", { name: "Select Post 1" }));
      expect(bar()).toBeTruthy();
      await userEvent.click(screen.getByRole("button", { name: "Draft: 60" }));
      await waitFor(() => expect(bar()).toBeNull());
    });

    it("a tick is kept when the person turns the page, and the bar counts it (the dashboard drops ticks that leave its list; this list must not)", async () => {
      serve((q) => answer({ page: Number(q.get("page")), items: [row(Number(q.get("page")) * 10)] }));
      render(<ContentListPage />);
      await userEvent.click(await screen.findByRole("checkbox", { name: "Select Post 10" }));
      await userEvent.click(screen.getByRole("button", { name: "Page 2" }));
      await screen.findByText("Post 20");
      expect(within(bar()!).getByText(/1 selected/)).toBeTruthy();
      expect(screen.getByRole("checkbox", { name: "Select Post 20" }).getAttribute("aria-checked")).toBe("false");
    });

    it("the bar floats over the list: it sits after the card in the page's column, sticky, not fixed", async () => {
      serve();
      render(<ContentListPage />);
      await userEvent.click(await screen.findByRole("checkbox", { name: "Select Post 1" }));
      const region = bar()!;
      expect(region.className).toContain("sticky");
      expect(region.className).not.toMatch(/\bfixed\b/);
      // a child of the page's own column (the box that scrolls), after the list, so sticky holds it at the bottom of that box
      const card = document.querySelector("[data-slot=card]")!;
      expect(region.parentElement).toBe(card.parentElement);
      expect(card.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("selecting does not open the drawer", async () => {
      serve();
      render(<ContentListPage />);
      await userEvent.click(await screen.findByRole("checkbox", { name: "Select Post 1" }));
      expect(h.apiFetch).not.toHaveBeenCalledWith("/jobs/p1/detail");
    });

    it("says so when the server deleted fewer posts than were ticked (it skips the ones that are not yours), and not 'Deleted 0'", async () => {
      serve();
      const base = h.apiFetch.getMockImplementation()!;
      let deleted = 1;
      h.apiFetch.mockImplementation(async (path: string, init?: { method?: string }) => (path === "/jobs/bulk" ? { deleted } : base(path, init as never)));
      render(<ContentListPage />);
      await userEvent.click(await screen.findByRole("checkbox", { name: "Select Post 1" }));
      await userEvent.click(screen.getByRole("checkbox", { name: "Select Post 2" }));
      await userEvent.click(screen.getByRole("button", { name: "Delete 2" }));
      await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete" }));
      await waitFor(() => expect(h.toast.success).toHaveBeenCalledWith("Deleted 1 of 2 posts. The rest are not yours, or are publishing right now."));
      deleted = 0;
      await userEvent.click(await screen.findByRole("checkbox", { name: "Select Post 1" }));
      await userEvent.click(screen.getByRole("checkbox", { name: "Select Post 2" }));
      await userEvent.click(screen.getByRole("button", { name: "Delete 2" }));
      await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete" }));
      await waitFor(() => expect(h.toast.error).toHaveBeenCalledWith("Nothing was deleted. The rest are not yours, or are publishing right now."));
      expect(h.toast.success).not.toHaveBeenCalledWith("Deleted 0 posts.");
    });

    it("Delete 2 asks first and deletes the ticked posts in one request", async () => {
      serve();
      render(<ContentListPage />);
      await userEvent.click(await screen.findByRole("checkbox", { name: "Select Post 1" }));
      await userEvent.click(screen.getByRole("checkbox", { name: "Select Post 2" }));
      await userEvent.click(screen.getByRole("button", { name: "Delete 2" }));
      expect(await screen.findByText("Delete 2 posts?")).toBeTruthy();
      await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));
      await waitFor(() => expect(h.apiFetch).toHaveBeenCalledWith("/jobs/bulk", expect.objectContaining({ method: "DELETE", body: JSON.stringify({ ids: ["p1", "p2"] }) })));
      await waitFor(() => expect(h.toast.success).toHaveBeenCalledWith("Deleted 2 posts."));
    });

    it("Submit selected for review is for the people under the approval flow, and sends the ticked ids", async () => {
      h.perms = { canEditContent: true, canReview: false, canSubmitOwn: true };
      serve();
      render(<ContentListPage />);
      await userEvent.click(await screen.findByRole("checkbox", { name: "Select Post 1" }));
      await userEvent.click(screen.getByRole("checkbox", { name: "Select Post 2" }));
      await userEvent.click(screen.getByRole("button", { name: "Submit selected for review" }));
      await waitFor(() => expect(h.apiFetch).toHaveBeenCalledWith("/jobs/submit-bulk", { method: "POST", body: JSON.stringify({ ids: ["p1", "p2"] }) }));
      await waitFor(() => expect(h.toast.success).toHaveBeenCalledWith("Sent 2 for design review."));
    });

    it("a row sent back for changes ticked alone leaves no Submit under the list; ticking a plain draft too brings it back for that one only", async () => {
      h.perms = { canEditContent: true, canReview: false, canSubmitOwn: true };
      serve(() => answer({ items: [row(1, { approvalStatus: "rejected" }), row(2), row(3, { approvalStatus: "pending" })] }));
      render(<ContentListPage />);
      await userEvent.click(await screen.findByRole("checkbox", { name: "Select Post 1" }));
      expect(screen.getByText(/1 selected/)).toBeTruthy();
      expect(screen.queryByRole("button", { name: /Submit/ })).toBeNull();
      expect(screen.getByRole("button", { name: "Delete 1" })).toBeTruthy();
      await userEvent.click(screen.getByRole("checkbox", { name: "Select Post 3" }));
      expect(screen.queryByRole("button", { name: /Submit/ })).toBeNull();
      await userEvent.click(screen.getByRole("checkbox", { name: "Select Post 2" }));
      await userEvent.click(screen.getByRole("button", { name: "Submit 1 of 3 for review" }));
      // only the plain draft is sent: the sent-back post and the one in review are not asked about
      await waitFor(() => expect(h.apiFetch).toHaveBeenCalledWith("/jobs/submit-bulk", { method: "POST", body: JSON.stringify({ ids: ["p2"] }) }));
    });

    it("a ticked post that has been sent since (from the drawer) is no longer offered to Submit: the page's fresh row wins", async () => {
      h.perms = { canEditContent: true, canReview: false, canSubmitOwn: true };
      let inReview = false;
      serve(() => answer({ items: [row(1, { approvalStatus: inReview ? "pending" : null })] }));
      render(<ContentListPage />);
      await userEvent.click(await screen.findByRole("checkbox", { name: "Select Post 1" }));
      expect(screen.getByRole("button", { name: "Submit selected for review" })).toBeTruthy();
      inReview = true; // sent from the drawer: the list is asked again and answers In Review
      await userEvent.click(await screen.findByRole("row", { name: "Open Post 1" }));
      await userEvent.click(await screen.findByRole("button", { name: "Submit for review" }));
      await waitFor(() => expect(h.toast.success).toHaveBeenCalled());
      await waitFor(() => expect(screen.queryByRole("button", { name: /Submit selected|Submit \d/ })).toBeNull());
      expect(screen.getByRole("button", { name: "Delete 1" })).toBeTruthy();
    });

    it("the header checkbox ticks the whole page; with only sent-back and in-review posts there is no Submit", async () => {
      h.perms = { canEditContent: true, canReview: false, canSubmitOwn: true };
      serve(() => answer({ items: [row(1, { approvalStatus: "rejected" }), row(3, { approvalStatus: "pending" })] }));
      render(<ContentListPage />);
      await userEvent.click(await screen.findByRole("checkbox", { name: "Select all on this page" }));
      expect(screen.getByText(/2 selected/)).toBeTruthy();
      expect(screen.queryByRole("button", { name: /Submit/ })).toBeNull();
    });

    it("says which posts were skipped and why", async () => {
      h.perms = { canEditContent: true, canReview: false, canSubmitOwn: true };
      serve();
      const base = h.apiFetch.getMockImplementation()!;
      h.apiFetch.mockImplementation(async (path: string, init?: unknown) =>
        path === "/jobs/submit-bulk" ? { submitted: [], skipped: [{ id: "p1", title: "Post 1", reason: "Missing required fields", missing: ["caption"] }, { id: "p2", title: "Post 2", reason: "Not a draft" }] } : base(path, init as never));
      render(<ContentListPage />);
      await userEvent.click(await screen.findByRole("checkbox", { name: "Select Post 1" }));
      await userEvent.click(screen.getByRole("button", { name: "Submit selected for review" }));
      await waitFor(() => expect(h.toast.error).toHaveBeenCalled());
      expect(String(h.toast.error.mock.calls[0][0])).toMatch(/^Skipped 2: "Post 1" missing /);
      expect(String(h.toast.error.mock.calls[0][0])).toContain("and more");
    });
  });

  describe("roles", () => {
    it("the design team makes no drafts: no Draft card or tab, no checkboxes, no bar", async () => {
      h.perms = { canEditContent: false, canReview: true, canSubmitOwn: false };
      serve();
      render(<ContentListPage />);
      await screen.findByText("Post 1");
      expect(screen.queryByRole("button", { name: /^Draft:/ })).toBeNull();
      expect(screen.queryByRole("tab", { name: /^Draft/ })).toBeNull();
      expect(screen.getByRole("button", { name: /^In Review:/ })).toBeTruthy();
      expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
      expect(screen.queryByText(/selected/)).toBeNull();
    });

    it("Marketing sees all six cards, and Revision Required is theirs", async () => {
      h.perms = { canEditContent: true, canReview: false, canSubmitOwn: true };
      serve();
      render(<ContentListPage />);
      await screen.findByText("Post 1");
      expect(within(screen.getByRole("list", { name: "Posts by status" })).getAllByRole("button")).toHaveLength(6);
    });

    it("an admin has no Revision Required card of their own", async () => {
      h.perms = { canEditContent: true, canReview: true, canSubmitOwn: false };
      serve();
      render(<ContentListPage />);
      await screen.findByText("Post 1");
      expect(screen.queryByRole("button", { name: /^Revision Required:/ })).toBeNull();
      expect(within(screen.getByRole("list", { name: "Posts by status" })).getAllByRole("button")).toHaveLength(5);
    });
  });

  it("a long title, an address with no spaces and a long file name cannot widen the page: every box above them may shrink", async () => {
    const long = "https://braga.example/posts/geospatial-technology-in-indonesia-from-maps-to-decisions-for-environmental-enforcement";
    serve(() => answer({ items: [row(1, { title: long, caption: long })], source: { ...source, fileName: `${"quarterly-plan-".repeat(30)}.xlsx` } }));
    render(<ContentListPage />);
    await screen.findByRole("table");
    const title = screen.getAllByText(long).find((el) => el.tagName === "P" && el.className.includes("line-clamp-2"))!;
    expect(title.className).toContain("break-words");
    expect(screen.getByRole("table").className).toContain("table-fixed");
    // the file name is one line with an ellipsis, in a box that may shrink
    const file = screen.getByRole("heading", { name: /quarterly-plan-/ });
    expect(file.className).toContain("truncate");
    expect(file.parentElement!.className).toContain("min-w-0");
  });
});

const calendarCalls = () => h.apiFetch.mock.calls.map((c) => String(c[0])).filter((p) => p.startsWith("/jobs/calendar"));
/** The posts at 08:00 WIB of 7 Mar 2026 and at 10:00 WIB of 12 Mar 2026. */
const mar7 = row(1, { scheduledFor: "2026-03-07T01:00:00.000Z", channels: ["linkedin", "instagram"] });
const mar12 = row(3, { scheduledFor: "2026-03-12T03:00:00.000Z" });

async function openView(name: "Kanban view" | "Calendar view") {
  await screen.findByText("Post 1");
  await userEvent.click(screen.getByRole("radio", { name }));
}

describe("Content List page: calendar view", () => {
  it("asks for the six weeks of the month of today, of the status tab on screen", async () => {
    serve();
    render(<ContentListPage />);
    await openView("Calendar view");
    // 13 Nov 2026: November's grid runs Mon 26 Oct to Sun 6 Dec
    await waitFor(() => expect(calendarCalls()).toEqual(["/jobs/calendar?filter=all&from=2026-10-26&to=2026-12-06"]));
    expect(await screen.findByRole("heading", { name: "November 2026" })).toBeTruthy();
    // the table and its bar are not drawn: nothing here is ticked
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByText(/selected/)).toBeNull();
  });

  it("explains the colours of the posts under the grid", async () => {
    serve();
    render(<ContentListPage />);
    await openView("Calendar view");
    const legend = await screen.findByRole("list", { name: "Status legend" });
    expect(within(legend).getAllByRole("listitem").map((i) => i.textContent)).toEqual(["Draft", "In Review", "Revision Required", "Ready to Publish", "Published", "Failed"]);
  });

  it("an empty month jumps once to the month of the closest post, and only once", async () => {
    serve(undefined, (q) => (q.get("from") === "2026-10-26" ? calendar(q, { prev: mar7 }) : calendar(q, { items: [mar7, mar12] })));
    render(<ContentListPage />);
    await openView("Calendar view");
    expect(await screen.findByRole("heading", { name: "March 2026" })).toBeTruthy();
    expect(calendarCalls().at(-1)).toBe("/jobs/calendar?filter=all&from=2026-02-23&to=2026-04-05");
    // moving on to an empty month is the person's choice: it stays there
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(await screen.findByRole("heading", { name: "May 2026" })).toBeTruthy();
  });

  it("places a post on its day, and a click opens its drawer", async () => {
    serve(undefined, (q) => (q.get("from") === "2026-10-26" ? calendar(q, { prev: mar7 }) : calendar(q, { items: [mar7, mar12] })));
    render(<ContentListPage />);
    await openView("Calendar view");
    const cell = await screen.findByRole("gridcell", { name: "Sat, 7 Mar 2026" });
    expect(within(cell).getByText("1 post")).toBeTruthy();
    await userEvent.click(within(cell).getByRole("button", { name: /^Open 08:00 Post 1, Draft$/ }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(h.apiFetch).toHaveBeenCalledWith("/jobs/p1/detail");
  });

  it("a busy month cell lists the first post and '+2 more', which opens that day", async () => {
    const day = (n: number) => row(n, { id: `d${n}`, title: `Busy ${n}`, scheduledFor: `2026-03-07T0${n}:00:00.000Z` });
    serve(undefined, (q) => (q.get("from") === "2026-10-26" ? calendar(q, { prev: mar7 }) : calendar(q, { items: [day(1), day(2), day(3)] })));
    render(<ContentListPage />);
    await openView("Calendar view");
    const cell = await screen.findByRole("gridcell", { name: "Sat, 7 Mar 2026" });
    expect(within(cell).getByText("3 posts")).toBeTruthy();
    expect(within(cell).getAllByRole("button", { name: /^Open / })).toHaveLength(1);
    await userEvent.click(within(cell).getByRole("button", { name: "+2 more" }));
    expect(await screen.findByRole("heading", { name: "Saturday, 7 Mar 2026" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^Open Busy / })).toHaveLength(3);
  });

  it("the week view puts a post in the column of its day and the row of its hour", async () => {
    serve(undefined, (q) => (q.get("from") === "2026-11-09" ? calendar(q, { items: [row(5, { id: "w5", title: "Friday post", scheduledFor: "2026-11-13T07:30:00.000Z" })] }) : calendar(q)));
    render(<ContentListPage />);
    await openView("Calendar view");
    await userEvent.click(screen.getByRole("radio", { name: "Week" }));
    // 07:30 UTC = 14:30 WIB on Fri 13 Nov
    const chip = await screen.findByRole("button", { name: "Open 14:30 Friday post, Draft" });
    const cells = within(chip.closest('[role="row"]') as HTMLElement).getAllByRole("gridcell");
    expect(cells.indexOf(chip.closest('[role="gridcell"]') as HTMLElement)).toBe(4);
    expect(within(chip.closest('[role="row"]') as HTMLElement).getByRole("rowheader").textContent).toBe("14:00");
  });

  it("the week view heads each column with its day and how many posts it has, and rows the hours", async () => {
    serve(undefined, (q) => calendar(q, { items: [] }));
    render(<ContentListPage />);
    await openView("Calendar view");
    await userEvent.click(screen.getByRole("radio", { name: "Week" }));
    // 13 Nov 2026 is a Friday: the week is 9 – 15 Nov
    expect(await screen.findByRole("heading", { name: "9 – 15 Nov 2026" })).toBeTruthy();
    expect(calendarCalls().at(-1)).toBe("/jobs/calendar?filter=all&from=2026-11-09&to=2026-11-15");
    expect(screen.getAllByText("No posts").length).toBe(7);
    expect(screen.getByRole("rowheader", { name: "08:00" })).toBeTruthy();
    expect(screen.getByRole("rowheader", { name: "17:00" })).toBeTruthy();
  });

  it("the day view says what the next step is, and offers the next post", async () => {
    h.perms = { canEditContent: true, canReview: false, canSubmitOwn: true };
    serve(undefined, (q) => (q.get("from") === "2026-10-26" ? calendar(q, { prev: mar7 }) : q.get("from") === "2026-03-07" ? calendar(q, { items: [mar7], next: mar12 }) : calendar(q, { items: [mar7, mar12] })));
    render(<ContentListPage />);
    await openView("Calendar view");
    await screen.findByRole("heading", { name: "March 2026" });
    // from the month, a day's "+N more" or a click on the post goes to the day: here the person picks Day
    await userEvent.click(screen.getByRole("radio", { name: "Day" }));
    expect(await screen.findByRole("heading", { name: "Saturday, 7 Mar 2026" })).toBeTruthy();
    const step = await screen.findByRole("complementary", { name: "Next step" });
    expect(within(step).getByText(/submit it for review/)).toBeTruthy();
    await userEvent.click(within(step).getByRole("button", { name: /^Next post: Thu 12 Mar · 10:00 · Post 3$/ }));
    expect(await screen.findByRole("heading", { name: "Thursday, 12 Mar 2026" })).toBeTruthy();
  });

  it("a slow answer for a range the person left does not land on the range they are on", async () => {
    let late!: (a: CalendarAnswer) => void;
    const stale = new Promise<CalendarAnswer>((resolve) => (late = resolve));
    const dec = row(7, { id: "dec", title: "December post", scheduledFor: "2026-12-10T03:00:00.000Z" });
    const nov = row(8, { id: "nov", title: "November post", scheduledFor: "2026-11-13T03:00:00.000Z" });
    // November (the first range) is slow; December answers at once
    serve(undefined, (q) => (q.get("from") === "2026-10-26" ? stale : calendar(q, { items: [dec] })));
    render(<ContentListPage />);
    await openView("Calendar view");
    await userEvent.click(await screen.findByRole("button", { name: "Next month" }));
    expect(await screen.findByRole("button", { name: /^Open 10:00 December post/ })).toBeTruthy();
    late(calendar(new URLSearchParams("from=2026-10-26&to=2026-12-06"), { items: [nov] }));
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole("button", { name: /November post/ })).toBeNull();
    // and the grid still has December's post: the late answer did not replace it
    expect(screen.getByRole("button", { name: /^Open 10:00 December post/ })).toBeTruthy();
  });

  it("coming back from the table finds the calendar where the person left it, and does not jump again", async () => {
    serve(undefined, (q) => (q.get("from") === "2026-10-26" ? calendar(q, { prev: mar7 }) : calendar(q, { items: [mar7] })));
    render(<ContentListPage />);
    await openView("Calendar view");
    await screen.findByRole("heading", { name: "March 2026" });
    await userEvent.click(screen.getByRole("radio", { name: "Week" }));
    await userEvent.click(screen.getByRole("button", { name: "Next week" }));
    // the jump put the anchor on Sat 7 Mar: its week is 2 – 8 Mar, the next one 9 – 15 Mar
    expect(await screen.findByRole("heading", { name: "9 – 15 Mar 2026" })).toBeTruthy();
    await userEvent.click(screen.getByRole("radio", { name: "Table view" }));
    await screen.findByRole("table");
    await userEvent.click(screen.getByRole("radio", { name: "Calendar view" }));
    expect(await screen.findByRole("heading", { name: "9 – 15 Mar 2026" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Week" }).getAttribute("aria-checked")).toBe("true");
  });

  it("a status tab asks for its own status", async () => {
    h.perms = { canEditContent: true, canReview: true, canSubmitOwn: false };
    serve(() => answer({ counts: counts({ draft: 58, review: 2 }) }));
    render(<ContentListPage />);
    await openView("Calendar view");
    await userEvent.click(screen.getByRole("button", { name: "In Review: 2" }));
    await waitFor(() => expect(calendarCalls().at(-1)).toBe("/jobs/calendar?filter=review&from=2026-10-26&to=2026-12-06"));
  });

  it("a range that could not be loaded says so and can be asked again", async () => {
    let fail = true;
    serve(undefined, (q) => {
      if (fail) throw new Error("The server is busy.");
      return calendar(q);
    });
    render(<ContentListPage />);
    await openView("Calendar view");
    expect(await screen.findByText("The server is busy.")).toBeTruthy();
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.queryByText("The server is busy.")).toBeNull());
  });

  it("an edit that reloads the list asks the calendar again", async () => {
    serve(undefined, (q) => (q.get("from") === "2026-10-26" ? calendar(q, { prev: mar7 }) : calendar(q, { items: [mar7] })));
    render(<ContentListPage />);
    await openView("Calendar view");
    await userEvent.click(await screen.findByRole("button", { name: /^Open 08:00 Post 1, Draft$/ }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }));
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(h.toast.success).toHaveBeenCalled());
    const before = calendarCalls().length;
    await waitFor(() => expect(calendarCalls().length).toBeGreaterThanOrEqual(before));
    expect(before).toBeGreaterThan(2);
  });
});

describe("Content List page: Kanban view", () => {
  // the table's own request (filter=all, a page) and the Draft column have rows; every other column is empty
  const board = (q: URLSearchParams) =>
    q.get("filter") === "draft" || q.get("filter") === "all" ? answer({ items: [row(1), row(3)], total: 60 }) : answer({ items: [], total: 0, pageCount: 1 });

  it("asks for a few cards of each status the role has, and draws a column per status", async () => {
    h.perms = { canEditContent: true, canReview: false, canSubmitOwn: true };
    serve(board);
    render(<ContentListPage />);
    await openView("Kanban view");
    expect(await screen.findByRole("region", { name: "Revision Required" })).toBeTruthy();
    for (const f of ["draft", "review", "rejected", "pending", "done", "failed"]) expect(listCalls()).toContain(`/jobs/list?filter=${f}&limit=4`);
    for (const name of ["Draft", "In Review", "Revision Required", "Ready to Publish", "Published", "Failed"]) expect(screen.getByRole("region", { name })).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Draft" })).getByText("Post 1")).toBeTruthy();
  });

  it("a board that could not be loaded says so and shows no placeholders, and asking again fills it", async () => {
    let fail = true;
    serve((q) => {
      if (fail && q.get("limit") === "4") throw new Error("The server is busy.");
      return board(q);
    });
    const { container } = render(<ContentListPage />);
    await openView("Kanban view");
    expect(await screen.findByText("The server is busy.")).toBeTruthy();
    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("button", { name: "Open Post 3" })).toBeTruthy();
  });

  it("an empty column says why nothing is there", async () => {
    serve(board);
    render(<ContentListPage />);
    await openView("Kanban view");
    const done = await screen.findByRole("region", { name: "Published" });
    expect(within(done).getByText("No posts yet")).toBeTruthy();
    expect(within(done).getByText("Posts that went out show up here.")).toBeTruthy();
  });

  it("the rest of a column is in the table: '+ 58 more drafts' opens the Draft tab", async () => {
    serve(board);
    render(<ContentListPage />);
    await openView("Kanban view");
    await userEvent.click(await screen.findByRole("button", { name: "+ 58 more drafts" }));
    expect(screen.getByRole("radio", { name: "Table view" }).getAttribute("aria-checked")).toBe("true");
    await waitFor(() => expect(listCalls().at(-1)).toBe("/jobs/list?filter=draft&page=1&limit=10"));
    expect(screen.getByRole("tab", { name: /^Draft/ }).getAttribute("aria-selected")).toBe("true");
  });

  it("a card keeps its neutral frame: the column already says the status", async () => {
    serve(board);
    render(<ContentListPage />);
    await openView("Kanban view");
    const card = (await screen.findByRole("button", { name: "Open Post 3" })).closest("article") as HTMLElement;
    expect(card.className).not.toMatch(/border-l-/);
    expect(card.className).toContain("border-border");
  });

  it("a card opens the drawer, and is not draggable", async () => {
    serve(board);
    render(<ContentListPage />);
    await openView("Kanban view");
    const card = await screen.findByRole("button", { name: "Open Post 3" });
    expect(card.closest("article")?.getAttribute("draggable")).toBeNull();
    await userEvent.click(card);
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(h.apiFetch).toHaveBeenCalledWith("/jobs/p3/detail");
  });

  it("a status tab leaves that column alone, with more cards", async () => {
    h.perms = { canEditContent: true, canReview: true, canSubmitOwn: false };
    serve((q) => answer({ counts: counts({ draft: 58, review: 2 }), items: [row(1)], page: Number(q.get("page")) }));
    render(<ContentListPage />);
    await openView("Kanban view");
    await userEvent.click(screen.getByRole("button", { name: "In Review: 2" }));
    await waitFor(() => expect(listCalls()).toContain("/jobs/list?filter=review&limit=12"));
    expect(screen.queryByRole("region", { name: "Draft" })).toBeNull();
  });

  it("the selection bar is the table's: the board has nothing to tick, and a tick made in the table is not shown over it", async () => {
    serve(board);
    render(<ContentListPage />);
    await userEvent.click(await screen.findByRole("checkbox", { name: "Select Post 1" }));
    expect(screen.getByRole("region", { name: "Selected posts" })).toBeTruthy();
    await userEvent.click(screen.getByRole("radio", { name: "Kanban view" }));
    expect(screen.queryByRole("region", { name: "Selected posts" })).toBeNull();
    await userEvent.click(screen.getByRole("radio", { name: "Table view" }));
    // the tick was kept, so the bar comes back with the table
    expect(await screen.findByText(/1 selected/)).toBeTruthy();
  });
});
