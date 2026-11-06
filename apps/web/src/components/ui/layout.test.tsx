// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HomeIcon, InboxIcon, SearchIcon } from "lucide-react";
import { Button } from "./button";
import { ButtonGroup, ButtonGroupSeparator } from "./button-group";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./empty";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "./input-group";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "./item";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "./sidebar";

const classesOf = (el: Element) => el.className.split(/\s+/);

afterEach(() => {
  cleanup();
  document.cookie = "sidebar_state=; max-age=0; path=/";
});

describe("Empty", () => {
  it("shows tile, title, help and the next step", () => {
    render(
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><InboxIcon data-testid="icon" /></EmptyMedia>
          <EmptyTitle>Nothing publishing today</EmptyTitle>
          <EmptyDescription>Posts scheduled for today appear here.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><Button>Add content</Button></EmptyContent>
      </Empty>
    );
    expect(screen.getByText("Nothing publishing today")).toBeTruthy();
    expect(screen.getByText("Posts scheduled for today appear here.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add content" })).toBeTruthy();
    // the icon tile is brand-100 / brand-800, not shadcn's muted
    expect(classesOf(screen.getByTestId("icon").parentElement!)).toEqual(expect.arrayContaining(["bg-brand-100", "text-brand-800"]));
  });

  it("the title uses the body type scale", () => {
    render(<Empty><EmptyTitle>T</EmptyTitle></Empty>);
    expect(classesOf(screen.getByText("T"))).toContain("type-body-sb-m");
  });
});

describe("Item", () => {
  it("is a list row: media, title, description and actions", () => {
    render(
      <ItemGroup>
        <Item variant="outline">
          <ItemMedia variant="icon"><HomeIcon /></ItemMedia>
          <ItemContent>
            <ItemTitle>Instagram</ItemTitle>
            <ItemDescription>No account linked</ItemDescription>
          </ItemContent>
          <ItemActions><Button size="sm">Connect</Button></ItemActions>
        </Item>
      </ItemGroup>
    );
    expect(screen.getByRole("list")).toBeTruthy();
    expect(screen.getByText("Instagram")).toBeTruthy();
    expect(screen.getByText("No account linked")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Connect" })).toBeTruthy();
  });

  it("asChild turns the row into a link", () => {
    render(<Item asChild><a href="/accounts">Accounts</a></Item>);
    expect(screen.getByRole("link", { name: "Accounts" }).getAttribute("href")).toBe("/accounts");
  });
});

describe("ButtonGroup", () => {
  it("is a group of buttons that keeps their own behaviour", async () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <ButtonGroup aria-label="Month">
        <Button variant="secondary" size="icon" aria-label="Previous month" onClick={onPrev}>‹</Button>
        <ButtonGroupSeparator />
        <Button variant="secondary" size="icon" aria-label="Next month" onClick={onNext}>›</Button>
      </ButtonGroup>
    );
    expect(screen.getByRole("group", { name: "Month" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrev).not.toHaveBeenCalled();
  });
});

describe("InputGroup", () => {
  it("an input with an icon inside, still typeable and labelled", async () => {
    const onChange = vi.fn();
    render(
      <InputGroup>
        <InputGroupAddon><SearchIcon /></InputGroupAddon>
        <InputGroupInput aria-label="Search" placeholder="Search content" onChange={(e) => onChange(e.target.value)} />
      </InputGroup>
    );
    const input = screen.getByRole("textbox", { name: "Search" });
    await userEvent.type(input, "tips");
    expect(onChange).toHaveBeenLastCalledWith("tips");
  });

  it("clicking the icon area focuses the input", async () => {
    render(
      <InputGroup>
        <InputGroupAddon data-testid="addon"><SearchIcon /></InputGroupAddon>
        <InputGroupInput aria-label="Search" />
      </InputGroup>
    );
    await userEvent.click(screen.getByTestId("addon"));
    expect(document.activeElement).toBe(screen.getByRole("textbox"));
  });

  it("a button inside the group works and does not steal the focus click", async () => {
    const onClick = vi.fn();
    render(
      <InputGroup>
        <InputGroupInput aria-label="Search" />
        <InputGroupAddon align="inline-end"><InputGroupButton aria-label="Clear" onClick={onClick}>x</InputGroupButton></InputGroupAddon>
      </InputGroup>
    );
    await userEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("the input draws no border or ring of its own: the group does", () => {
    render(<InputGroup><InputGroupInput aria-label="S" /></InputGroup>);
    const cls = classesOf(screen.getByRole("textbox"));
    expect(cls).toEqual(expect.arrayContaining(["border-0", "rounded-none"]));
    expect(classesOf(screen.getByRole("group"))).toContain("rounded-xl");
  });
});

// ── Sidebar ───────────────────────────────────────────────────────────────

function Shell({ defaultOpen }: { defaultOpen?: boolean }) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar collapsible="icon" variant="inset" aria-label="Main">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Overview</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive tooltip="Dashboard">
                  <a href="/dashboard"><HomeIcon /><span>Dashboard</span></a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Content List">
                  <a href="/jobs"><InboxIcon /><span>Content List</span></a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <SidebarTrigger aria-label="Toggle sidebar" />
        <p>Page</p>
      </SidebarInset>
    </SidebarProvider>
  );
}

const sidebar = () => document.querySelector<HTMLElement>("[data-slot=sidebar][data-state]")!;

describe("Sidebar (desktop)", () => {
  beforeEach(() => {
    window.innerWidth = 1280;
  });

  it("starts expanded with its links and group label", () => {
    render(<Shell />);
    expect(sidebar().getAttribute("data-state")).toBe("expanded");
    expect(screen.getByRole("link", { name: "Dashboard" }).getAttribute("href")).toBe("/dashboard");
    expect(screen.getByText("Overview")).toBeTruthy();
  });

  it("the active link is marked and the others are not", () => {
    render(<Shell />);
    expect(screen.getByRole("link", { name: "Dashboard" }).getAttribute("data-active")).toBe("true");
    expect(screen.getByRole("link", { name: "Content List" }).getAttribute("data-active")).toBe("false");
  });

  it("the trigger collapses to icons and expands again, and remembers it in a cookie", async () => {
    render(<Shell />);
    await userEvent.click(screen.getByRole("button", { name: "Toggle sidebar" }));
    expect(sidebar().getAttribute("data-state")).toBe("collapsed");
    expect(sidebar().getAttribute("data-collapsible")).toBe("icon");
    expect(document.cookie).toContain("sidebar_state=false");
    await userEvent.click(screen.getByRole("button", { name: "Toggle sidebar" }));
    expect(sidebar().getAttribute("data-state")).toBe("expanded");
    expect(document.cookie).toContain("sidebar_state=true");
  });

  it("Ctrl+B toggles it", async () => {
    render(<Shell />);
    await userEvent.keyboard("{Control>}b{/Control}");
    expect(sidebar().getAttribute("data-state")).toBe("collapsed");
    await userEvent.keyboard("{Control>}b{/Control}");
    expect(sidebar().getAttribute("data-state")).toBe("expanded");
  });

  it("defaultOpen={false} starts collapsed", () => {
    render(<Shell defaultOpen={false} />);
    expect(sidebar().getAttribute("data-state")).toBe("collapsed");
  });

  it("collapsed, a link shows its name in a tooltip on keyboard focus", async () => {
    render(<Shell defaultOpen={false} />);
    await userEvent.tab();
    expect((await screen.findByRole("tooltip")).textContent).toContain("Dashboard");
  });

  it("expanded, it shows no tooltip (the label is already there)", async () => {
    render(<Shell />);
    await userEvent.tab();
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("the page sits in a main landmark", () => {
    render(<Shell />);
    expect(screen.getByRole("main").textContent).toContain("Page");
  });
});

describe("Sidebar (mobile)", () => {
  beforeEach(() => {
    window.innerWidth = 500;
  });

  it("is a drawer that the trigger opens and Escape closes", async () => {
    render(<Shell />);
    expect(screen.queryByRole("dialog")).toBeNull();
    await userEvent.click(await screen.findByRole("button", { name: "Toggle sidebar" }));
    const drawer = await screen.findByRole("dialog");
    expect(drawer.textContent).toContain("Dashboard");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("is a dialog with a title for screen readers", async () => {
    render(<Shell />);
    await userEvent.click(await screen.findByRole("button", { name: "Toggle sidebar" }));
    expect(await screen.findByRole("dialog", { name: "Sidebar" })).toBeTruthy();
  });
});
