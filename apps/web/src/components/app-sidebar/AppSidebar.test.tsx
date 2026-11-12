// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const h = vi.hoisted(() => ({
  pathname: "/jobs",
  user: { name: "Puteri Anggraini", email: "puteri@example.com", avatarUrl: null as string | null, emailVerified: true, role: "owner" } as Record<string, unknown> | null,
  workspace: { id: "w1", name: "Postly Studio", role: "owner", isActive: true, approvalRequired: false } as Record<string, unknown> | null,
  workspaces: [
    { id: "w1", name: "Postly Studio", role: "owner", isActive: true },
    { id: "w2", name: "Side Project", role: "admin", isActive: false },
  ],
  logout: vi.fn(async () => {}),
  replace: vi.fn(),
  switchWorkspace: vi.fn(async () => {}),
  apiFetch: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), toast: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => h.pathname,
  useRouter: () => ({ replace: h.replace, push: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: h.user, logout: h.logout }) }));
vi.mock("@/context/WorkspaceContext", () => ({
  useWorkspace: () => ({ workspaces: h.workspaces, activeWorkspace: h.workspace, loading: false, switchWorkspace: h.switchWorkspace }),
}));
vi.mock("@/lib/api", () => ({ apiFetch: h.apiFetch }));
vi.mock("@/components/Toast", () => ({ useToast: () => h.toast }));
vi.mock("@/components/TrialBanner", () => ({ TrialBanner: () => <div>trial banner</div> }));

import { AppSidebar, MobileMenuButton } from "./AppSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

function Shell() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <MobileMenuButton />
      <SidebarInset>page</SidebarInset>
    </SidebarProvider>
  );
}

const labels = () => [...document.querySelectorAll("[data-sidebar=menu-button]")].map((b) => (b.textContent ?? "").trim());

beforeEach(() => {
  window.innerWidth = 1280;
  h.pathname = "/jobs";
  h.user = { name: "Puteri Anggraini", email: "puteri@example.com", avatarUrl: null, emailVerified: true, role: "owner" };
  h.workspace = { id: "w1", name: "Postly Studio", role: "owner", isActive: true, approvalRequired: false };
  h.apiFetch.mockReset();
  h.apiFetch.mockImplementation(async (url: string) => (url === "/feedback/unread" ? { unread: 0 } : url === "/feedback/mine" ? [] : {}));
  h.logout.mockClear();
  h.replace.mockClear();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  document.cookie = "sidebar_state=; max-age=0; path=/";
});

describe("AppSidebar: links by role", () => {
  it("an owner sees every page, with the design's group names", () => {
    render(<Shell />);
    for (const group of ["Overview", "Content workspace", "Assets", "Channel", "Channel active", "Workspace"]) expect(screen.getByText(group)).toBeTruthy();
    for (const label of ["Dashboard", "Import quarter plan", "Content list", "Analytics", "Templates", "Library", "Platform", "Groups", "Add account", "Team", "Billing", "Setting & integration"]) {
      expect(labels().some((l) => l.startsWith(label)), label).toBe(true);
    }
  });

  it("a member gets no manage pages and no Add account", () => {
    h.workspace = { id: "w1", name: "Postly Studio", role: "member", isActive: true };
    render(<Shell />);
    for (const gone of ["Team", "Billing", "Library", "Platform", "Groups", "Add account", "Setting & integration"]) {
      expect(labels().some((l) => l.startsWith(gone)), gone).toBe(false);
    }
    expect(labels().some((l) => l.startsWith("Import quarter plan"))).toBe(true);
    expect(screen.queryByText("Workspace")).toBeNull();
  });

  it("no role has a New post button: the design has none, and Add content on the dashboard opens the composer", () => {
    for (const role of ["owner", "member", "designer"]) {
      h.workspace = { id: "w1", name: "Postly Studio", role, isActive: true };
      const { unmount } = render(<Shell />);
      expect(screen.queryByRole("link", { name: "New post" }), role).toBeNull();
      expect(labels().some((l) => l.startsWith("New post")), role).toBe(false);
      unmount();
    }
  });

  it("pages that do not exist yet are dimmed rows with 'Soon', not links", () => {
    render(<Shell />);
    for (const name of ["My task", "Media library", "Help & support"]) {
      const row = screen.getByText(name).closest("[data-sidebar=menu-button]") as HTMLElement;
      expect(row.getAttribute("aria-disabled"), name).toBe("true");
      expect(row.tagName, name).toBe("BUTTON");
    }
    expect(screen.getAllByText("Soon")).toHaveLength(3);
    expect(screen.queryByRole("link", { name: /My task/ })).toBeNull();
  });
});

describe("AppSidebar: where you are", () => {
  it("marks the current page and exposes aria-current", () => {
    h.pathname = "/jobs";
    render(<Shell />);
    const link = screen.getByRole("link", { name: "Content list" });
    expect(link.getAttribute("aria-current")).toBe("page");
    expect(link.getAttribute("data-active")).toBe("true");
    expect(screen.getByRole("link", { name: "Analytics" }).getAttribute("aria-current")).toBeNull();
  });

  it("/jobs/import lights up import only, not content list", () => {
    h.pathname = "/jobs/import";
    render(<Shell />);
    expect(screen.getByRole("link", { name: "Import quarter plan" }).getAttribute("data-active")).toBe("true");
    expect(screen.getByRole("link", { name: "Content list" }).getAttribute("data-active")).toBe("false");
  });
});

describe("AppSidebar: notices", () => {
  it("asks an unverified person to verify, and resends on request", async () => {
    h.user = { ...(h.user as object), emailVerified: false };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    render(<Shell />);
    expect(screen.getByText("Verify your email")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Resend email" }));
    await waitFor(() => expect(h.toast.success).toHaveBeenCalledWith("Verification email sent — check your inbox."));
    expect(String(fetchMock.mock.calls[0][0])).toContain("/auth/resend-verification");
    fetchMock.mockRestore();
  });

  it("says nothing to a verified person", () => {
    render(<Shell />);
    expect(screen.queryByText("Verify your email")).toBeNull();
  });

  it("shows the trial banner", () => {
    render(<Shell />);
    expect(screen.getByText("trial banner")).toBeTruthy();
  });

  it("the what's new card can be dismissed and stays dismissed", async () => {
    const { unmount } = render(<Shell />);
    await waitFor(() => expect(screen.getByText("Repeat post scheduling")).toBeTruthy());
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Repeat post scheduling")).toBeNull();
    expect(localStorage.getItem("ph:dismissed:repeat-posts")).toBe("1");
    unmount();
    render(<Shell />);
    await act(async () => {});
    expect(screen.queryByText("Repeat post scheduling")).toBeNull();
  });

  it("shows a red count on Feedback when answers are waiting", async () => {
    h.apiFetch.mockImplementation(async (url: string) => (url === "/feedback/unread" ? { unread: 12 } : {}));
    render(<Shell />);
    expect(await screen.findByLabelText("12 unread answers")).toBeTruthy();
    expect(screen.getByLabelText("12 unread answers").textContent).toBe("9+");
  });
});

describe("AppSidebar: workspace switcher", () => {
  it("shows the active workspace and lists the others", async () => {
    render(<Shell />);
    const trigger = screen.getByRole("button", { name: /Postly Studio/ });
    await userEvent.click(trigger);
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByText("Side Project")).toBeTruthy();
    expect(within(menu).getByText("New workspace")).toBeTruthy();
    expect(within(menu).getByLabelText("Current workspace")).toBeTruthy();
  });

  it("choosing another workspace switches to it, choosing the current one does nothing", async () => {
    render(<Shell />);
    await userEvent.click(screen.getByRole("button", { name: /Postly Studio/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /Postly Studio/ }));
    expect(h.switchWorkspace).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /Postly Studio/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /Side Project/ }));
    expect(h.switchWorkspace).toHaveBeenCalledWith("w2");
  });

  it("a failed switch is reported", async () => {
    h.switchWorkspace.mockRejectedValueOnce(new Error("nope"));
    render(<Shell />);
    await userEvent.click(screen.getByRole("button", { name: /Postly Studio/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /Side Project/ }));
    await waitFor(() => expect(h.toast.error).toHaveBeenCalledWith("Failed to switch workspace"));
  });

  it("New workspace opens its dialog", async () => {
    render(<Shell />);
    await userEvent.click(screen.getByRole("button", { name: /Postly Studio/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /New workspace/ }));
    expect(await screen.findByRole("dialog", { name: "New workspace" })).toBeTruthy();
  });
});

describe("AppSidebar: dialogs and sign out", () => {
  it("Feedback opens the dialog and the Send button needs a message", async () => {
    render(<Shell />);
    await userEvent.click(screen.getByRole("button", { name: /Feedback/ }));
    const dialog = await screen.findByRole("dialog", { name: "Feedback" });
    const send = within(dialog).getByRole("button", { name: "Send feedback" }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    await userEvent.type(within(dialog).getByLabelText("Your message"), "It crashes");
    expect(send.disabled).toBe(false);
  });

  it("sending feedback posts it with the page the person was on and thanks them", async () => {
    render(<Shell />);
    await userEvent.click(screen.getByRole("button", { name: /Feedback/ }));
    const dialog = await screen.findByRole("dialog", { name: "Feedback" });
    await userEvent.click(within(dialog).getByRole("radio", { name: /Bug/ }));
    await userEvent.type(within(dialog).getByLabelText("Your message"), "It crashes");
    await userEvent.click(within(dialog).getByRole("button", { name: "Send feedback" }));
    await waitFor(() => expect(h.toast.success).toHaveBeenCalledWith("Thanks for your feedback!"));
    const call = h.apiFetch.mock.calls.find((c) => c[0] === "/feedback");
    expect(JSON.parse(call![1].body)).toMatchObject({ type: "bug", message: "It crashes" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Feedback" })).toBeNull());
  });

  it("the My feedback tab loads the list", async () => {
    h.apiFetch.mockImplementation(async (url: string) =>
      url === "/feedback/mine"
        ? [{ id: "f1", type: "bug", message: "Calendar is empty", unreadByUser: 1, createdAt: "2026-11-01T00:00:00Z", replies: [] }]
        : { unread: 1 }
    );
    render(<Shell />);
    await userEvent.click(screen.getByRole("button", { name: /Feedback/ }));
    await userEvent.click(await screen.findByRole("tab", { name: "My feedback" }));
    expect(await screen.findByText("Calendar is empty")).toBeTruthy();
    expect(screen.getByText("1 new")).toBeTruthy();
  });

  it("Sign out logs out and goes to /login", async () => {
    render(<Shell />);
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(h.logout).toHaveBeenCalled());
    expect(h.replace).toHaveBeenCalledWith("/login");
  });

  it("shows who is signed in", () => {
    render(<Shell />);
    expect(screen.getByText("Puteri Anggraini")).toBeTruthy();
    expect(screen.getByText("puteri@example.com")).toBeTruthy();
  });
});

describe("AppSidebar: collapse", () => {
  const sidebar = () => document.querySelector<HTMLElement>("[data-slot=sidebar][data-state]")!;

  it("collapses to icons with the trigger and remembers it in the sidebar cookie", async () => {
    render(<Shell />);
    await userEvent.click(screen.getAllByRole("button", { name: "Toggle sidebar" })[0]);
    expect(sidebar().getAttribute("data-state")).toBe("collapsed");
    expect(document.cookie).toContain("sidebar_state=false");
  });

  it("the page sits in a main landmark", () => {
    render(<Shell />);
    expect(screen.getByRole("main").textContent).toContain("page");
  });
});

describe("AppSidebar: mobile drawer", () => {
  beforeEach(() => {
    window.innerWidth = 500;
  });

  it("opens from the menu button and STAYS open (it used to close itself on mount)", async () => {
    render(<Shell />);
    expect(screen.queryByRole("dialog", { name: "Sidebar" })).toBeNull();
    await userEvent.click(await screen.findByRole("button", { name: "Open menu" }));
    const drawer = await screen.findByRole("dialog", { name: "Sidebar" });
    await act(async () => { await new Promise((r) => setTimeout(r, 80)); });
    expect(screen.queryByRole("dialog", { name: "Sidebar" })).toBe(drawer);
    expect(within(drawer).getByRole("link", { name: "Content list" })).toBeTruthy();
  });

  it("closes with Escape", async () => {
    render(<Shell />);
    await userEvent.click(await screen.findByRole("button", { name: "Open menu" }));
    await screen.findByRole("dialog", { name: "Sidebar" });
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Sidebar" })).toBeNull());
  });

  it("closes when the page changes", async () => {
    const { rerender } = render(<Shell />);
    await userEvent.click(await screen.findByRole("button", { name: "Open menu" }));
    await screen.findByRole("dialog", { name: "Sidebar" });
    h.pathname = "/analytics";
    rerender(<Shell />);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Sidebar" })).toBeNull());
  });

  it("does not close when the page stays the same and the layout re-renders", async () => {
    const { rerender } = render(<Shell />);
    await userEvent.click(await screen.findByRole("button", { name: "Open menu" }));
    await screen.findByRole("dialog", { name: "Sidebar" });
    rerender(<Shell />);
    rerender(<Shell />);
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(screen.queryByRole("dialog", { name: "Sidebar" })).not.toBeNull();
  });
});
