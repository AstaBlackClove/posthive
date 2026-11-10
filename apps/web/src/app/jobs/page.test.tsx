// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ListAnswer, ListCounts, ListItem, PostDetail } from "@/lib/content-list";

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
});

/** Answer each path; the list can be answered per query. */
function serve(list: (query: URLSearchParams) => ListAnswer | Promise<ListAnswer> = () => answer()) {
  h.apiFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
    const [pathname, search = ""] = path.split("?");
    if (pathname === "/jobs/list") return list(new URLSearchParams(search));
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
  sessionStorage.clear();
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
    expect(screen.getByText("Showing 2 of 60 posts · 60 Draft · Row # = source row in imported file")).toBeTruthy();
    expect(screen.getByText("Click a row to preview · sorted by post date")).toBeTruthy();
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

  it("after a reload (an action) the next answer asks for the file again, and a page turn after that does not", async () => {
    serve((q) => answer({ page: Number(q.get("page")), items: [row(Number(q.get("page")) * 10)] }));
    render(<ContentListPage />);
    await userEvent.click(await screen.findByRole("row", { name: /^Open Post 10$/ }));
    await userEvent.click(await screen.findByRole("button", { name: "More actions" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
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
    it("a click on a row opens that post", async () => {
      serve();
      render(<ContentListPage />);
      await userEvent.click(await screen.findByRole("row", { name: "Open Post 2" }));
      expect(h.apiFetch).toHaveBeenCalledWith("/jobs/p2/detail");
      expect(await screen.findByRole("heading", { name: "Post 1" })).toBeTruthy();
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

    it("Duplicate hands the post to the composer and goes there", async () => {
      serve();
      render(<ContentListPage />);
      await userEvent.click(await screen.findByRole("row", { name: "Open Post 1" }));
      await userEvent.click(await screen.findByRole("button", { name: "More actions" }));
      await userEvent.click(await screen.findByRole("menuitem", { name: "Duplicate" }));
      await waitFor(() => expect(h.push).toHaveBeenCalledWith("/compose"));
      expect(JSON.parse(sessionStorage.getItem("posthive_duplicate_draft")!)).toMatchObject({ text: "C", title: "T" });
    });

    it("Delete asks first, and then deletes that one post and reloads", async () => {
      serve();
      render(<ContentListPage />);
      await userEvent.click(await screen.findByRole("row", { name: "Open Post 1" }));
      await userEvent.click(await screen.findByRole("button", { name: "More actions" }));
      await userEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
      expect(await screen.findByText("Delete this post?")).toBeTruthy();
      expect(h.apiFetch).not.toHaveBeenCalledWith("/jobs/p1", expect.objectContaining({ method: "DELETE" }));
      const before = listCalls().length;
      await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));
      await waitFor(() => expect(h.apiFetch).toHaveBeenCalledWith("/jobs/p1", { method: "DELETE" }));
      await waitFor(() => expect(h.toast.success).toHaveBeenCalledWith("Deleted 1 post."));
      await waitFor(() => expect(listCalls().length).toBeGreaterThan(before));
    });
  });

  describe("selecting rows", () => {
    it("ticking rows counts them in the bar; Clear empties it; a status change clears it too", async () => {
      serve();
      render(<ContentListPage />);
      await screen.findByText("Post 1");
      expect(screen.getByText(/0 selected/)).toBeTruthy();
      await userEvent.click(screen.getByRole("checkbox", { name: "Select Post 1" }));
      await userEvent.click(screen.getByRole("checkbox", { name: "Select Post 2" }));
      expect(screen.getByText(/2 selected/)).toBeTruthy();
      await userEvent.click(screen.getByRole("button", { name: "Clear" }));
      expect(screen.getByText(/0 selected/)).toBeTruthy();
      await userEvent.click(screen.getByRole("checkbox", { name: "Select Post 1" }));
      await userEvent.click(screen.getByRole("button", { name: "Draft: 60" }));
      await waitFor(() => expect(screen.getByText(/0 selected/)).toBeTruthy());
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
