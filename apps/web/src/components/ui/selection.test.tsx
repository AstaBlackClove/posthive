// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";
import { Toggle } from "./toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Calendar } from "./calendar";

afterEach(cleanup);

describe("ToggleGroup single", () => {
  function Filter({ onChange, allowDeselect }: { onChange?: (v: string) => void; allowDeselect?: boolean }) {
    return (
      <ToggleGroup type="single" defaultValue="all" onValueChange={onChange} allowDeselect={allowDeselect} aria-label="Platform">
        <ToggleGroupItem value="all">All</ToggleGroupItem>
        <ToggleGroupItem value="instagram">Instagram</ToggleGroupItem>
        <ToggleGroupItem value="linkedin">LinkedIn</ToggleGroupItem>
      </ToggleGroup>
    );
  }

  it("is a radio group: one item is checked", () => {
    render(<Filter />);
    expect(screen.getByRole("radiogroup", { name: "Platform" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "All" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "Instagram" }).getAttribute("aria-checked")).toBe("false");
  });

  it("switches to another item and reports it", async () => {
    const onChange = vi.fn();
    render(<Filter onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "Instagram" }));
    expect(onChange).toHaveBeenCalledWith("instagram");
    expect(screen.getByRole("radio", { name: "Instagram" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "All" }).getAttribute("aria-checked")).toBe("false");
  });

  it("clicking the active item does NOT switch everything off", async () => {
    const onChange = vi.fn();
    render(<Filter onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "All" }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "All" }).getAttribute("aria-checked")).toBe("true");
  });

  it("allowDeselect brings the Radix behaviour back", async () => {
    const onChange = vi.fn();
    render(<Filter onChange={onChange} allowDeselect />);
    await userEvent.click(screen.getByRole("radio", { name: "All" }));
    expect(onChange).toHaveBeenCalledWith("");
    expect(screen.getByRole("radio", { name: "All" }).getAttribute("aria-checked")).toBe("false");
  });

  it("works controlled and still refuses to deselect", async () => {
    function Controlled() {
      const [v, setV] = useState("list");
      return (
        <ToggleGroup type="single" value={v} onValueChange={setV} aria-label="View">
          <ToggleGroupItem value="list">List</ToggleGroupItem>
          <ToggleGroupItem value="calendar">Calendar</ToggleGroupItem>
        </ToggleGroup>
      );
    }
    render(<Controlled />);
    await userEvent.click(screen.getByRole("radio", { name: "Calendar" }));
    expect(screen.getByRole("radio", { name: "Calendar" }).getAttribute("aria-checked")).toBe("true");
    await userEvent.click(screen.getByRole("radio", { name: "Calendar" }));
    expect(screen.getByRole("radio", { name: "Calendar" }).getAttribute("aria-checked")).toBe("true");
  });

  it("moves with the arrow keys", async () => {
    render(<Filter />);
    screen.getByRole("radio", { name: "All" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement?.textContent).toBe("Instagram");
  });

  it("draws chips by default and a pill track for variant=pill", () => {
    const { rerender } = render(<Filter />);
    expect(screen.getByRole("radiogroup").className).not.toContain("rounded-full");
    expect(screen.getByRole("radio", { name: "All" }).className).toContain("data-[state=on]:bg-brand-100");
    rerender(
      <ToggleGroup type="single" defaultValue="day" variant="pill" aria-label="Range">
        <ToggleGroupItem value="day">Day</ToggleGroupItem>
      </ToggleGroup>
    );
    expect(screen.getByRole("radiogroup", { name: "Range" }).className).toContain("rounded-full");
    expect(screen.getByRole("radio", { name: "Day" }).className).toContain("data-[state=on]:bg-brand-500");
  });
});

describe("ToggleGroup multiple", () => {
  it("lets several accounts be on and each be turned off", async () => {
    render(
      <ToggleGroup type="multiple" aria-label="Accounts">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </ToggleGroup>
    );
    await userEvent.click(screen.getByRole("button", { name: "A" }));
    await userEvent.click(screen.getByRole("button", { name: "B" }));
    expect(screen.getByRole("button", { name: "A" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "B" }).getAttribute("aria-pressed")).toBe("true");
    await userEvent.click(screen.getByRole("button", { name: "A" }));
    expect(screen.getByRole("button", { name: "A" }).getAttribute("aria-pressed")).toBe("false");
  });
});

describe("Toggle", () => {
  it("is a button with aria-pressed", async () => {
    render(<Toggle>Reels</Toggle>);
    const el = screen.getByRole("button", { name: "Reels" });
    expect(el.getAttribute("aria-pressed")).toBe("false");
    await userEvent.click(el);
    expect(el.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("Tabs", () => {
  function Review() {
    return (
      <Tabs defaultValue="content">
        <TabsList variant="line" aria-label="Review">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
        </TabsList>
        <TabsContent value="content">Caption text</TabsContent>
        <TabsContent value="platforms">Platform options</TabsContent>
      </Tabs>
    );
  }

  it("wires tab and panel together", async () => {
    render(<Review />);
    const tab = screen.getByRole("tab", { name: "Content" });
    expect(tab.getAttribute("aria-selected")).toBe("true");
    expect(tab.getAttribute("aria-controls")).toBeTruthy();
    expect(screen.getByRole("tabpanel").textContent).toBe("Caption text");
    await userEvent.click(screen.getByRole("tab", { name: "Platforms" }));
    expect(screen.getByRole("tabpanel").textContent).toBe("Platform options");
  });

  it("moves between tabs with the arrow keys", async () => {
    render(<Review />);
    screen.getByRole("tab", { name: "Content" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement?.textContent).toBe("Platforms");
    expect(screen.getByRole("tab", { name: "Platforms" }).getAttribute("aria-selected")).toBe("true");
  });

  it("the line variant is an underline, the default a pill", () => {
    render(<Review />);
    expect(screen.getByRole("tablist").className).toContain("border-b");
    cleanup();
    render(
      <Tabs defaultValue="a">
        <TabsList aria-label="x">
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    expect(screen.getByRole("tablist").className).toContain("rounded-full");
  });
});

describe("Collapsible", () => {
  it("is a button with aria-expanded that shows and hides its content", async () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Feedback thread</CollapsibleTrigger>
        <CollapsibleContent>Replies</CollapsibleContent>
      </Collapsible>
    );
    const trigger = screen.getByRole("button", { name: "Feedback thread" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Replies")).toBeNull();
    await userEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Replies")).toBeTruthy();
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(screen.queryByText("Replies")).toBeNull());
  });
});

describe("Avatar", () => {
  it("shows the initial when there is no image", () => {
    render(
      <Avatar>
        <AvatarImage src="" alt="Puteri" />
        <AvatarFallback>P</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByText("P")).toBeTruthy();
  });

  it("the fallback uses the brand-100 tile", () => {
    render(
      <Avatar size="lg">
        <AvatarFallback>PA</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByText("PA").className).toContain("bg-brand-100");
  });
});

describe("Calendar", () => {
  it("renders a month and picks a day", async () => {
    const onSelect = vi.fn();
    render(<Calendar mode="single" defaultMonth={new Date(2026, 10, 1)} onSelect={onSelect} />);
    expect(screen.getByText(/November 2026/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /November 20th, 2026/ }));
    expect(onSelect).toHaveBeenCalled();
    expect((onSelect.mock.calls[0][0] as Date).getDate()).toBe(20);
  });

  it("does not let a disabled day be picked", async () => {
    const onSelect = vi.fn();
    render(
      <Calendar
        mode="single"
        defaultMonth={new Date(2026, 10, 1)}
        disabled={{ before: new Date(2026, 10, 10) }}
        onSelect={onSelect}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /November 5th, 2026/ }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("marks today with the brand tile, not shadcn's accent", () => {
    render(<Calendar mode="single" defaultMonth={new Date()} />);
    const today = document.querySelector("[data-today=true]");
    expect(today).not.toBeNull();
    expect(today!.className).toContain("bg-brand-100");
    expect(today!.className).not.toContain("bg-accent");
  });
});
