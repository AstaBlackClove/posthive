// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";
import { Input } from "./input";
import { Switch } from "./switch";
import { Checkbox } from "./checkbox";
import { Progress } from "./progress";
import { Alert } from "./alert";
import { Badge } from "./badge";
import { NativeSelect, NativeSelectOption } from "./native-select";

afterEach(cleanup);

describe("Button", () => {
  it("is the yellow primary button by default", () => {
    render(<Button>Save</Button>);
    const el = screen.getByRole("button", { name: "Save" });
    expect(el.className).toContain("bg-primary");
    expect(el.className).toContain("type-body-sb-s");
    expect(el.dataset.variant).toBe("default");
  });

  it("maps variants to the old btn-* looks", () => {
    render(
      <>
        <Button variant="secondary">a</Button>
        <Button variant="destructive">b</Button>
        <Button variant="destructive-outline">c</Button>
      </>
    );
    expect(screen.getByText("a").className).toContain("bg-surface");
    expect(screen.getByText("b").className).toContain("bg-destructive");
    expect(screen.getByText("c").className).toContain("text-red-600");
  });

  it("the small size swaps the text style instead of stacking two", () => {
    render(<Button size="sm">Small</Button>);
    const cls = screen.getByText("Small").className;
    expect(cls).toContain("type-body-sb-xs");
    expect(cls).not.toContain("type-body-sb-s ");
  });

  it("a link has no padding", () => {
    render(<Button variant="link">More</Button>);
    const cls = screen.getByText("More").className;
    expect(cls).toContain("p-0");
    expect(cls).not.toContain("px-4");
  });

  it("className overrides the variant", () => {
    render(<Button className="rounded-full">Pill</Button>);
    const cls = screen.getByText("Pill").className;
    expect(cls).toContain("rounded-full");
    expect(cls).not.toContain("rounded-xl");
  });

  it("asChild renders the child element, not a button", () => {
    render(
      <Button asChild>
        <a href="/compose">Compose</a>
      </Button>
    );
    const link = screen.getByRole("link", { name: "Compose" });
    expect(link.getAttribute("href")).toBe("/compose");
    expect(link.className).toContain("bg-primary");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("does not fire when disabled", async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Input", () => {
  it("uses the field look by default", () => {
    render(<Input aria-label="Name" />);
    const cls = screen.getByLabelText("Name").className;
    expect(cls).toContain("rounded-xl");
    expect(cls).toContain("type-body-r-s");
  });

  it("the line variant is the dark-panel underline input", () => {
    render(<Input aria-label="Email" variant="line" />);
    const el = screen.getByLabelText("Email");
    expect(el.className).toContain("field-line");
    expect(el.className).not.toContain("rounded-xl");
  });

  it("typing updates the value", async () => {
    render(<Input aria-label="Name" />);
    const el = screen.getByLabelText("Name") as HTMLInputElement;
    await userEvent.type(el, "Puteri");
    expect(el.value).toBe("Puteri");
  });
});

describe("Switch and Checkbox", () => {
  it("Switch exposes role=switch and toggles", async () => {
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Notify" onCheckedChange={onCheckedChange} />);
    const el = screen.getByRole("switch", { name: "Notify" });
    expect(el.getAttribute("aria-checked")).toBe("false");
    await userEvent.click(el);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(el.getAttribute("aria-checked")).toBe("true");
  });

  it("Checkbox exposes role=checkbox and toggles with the keyboard", async () => {
    render(<Checkbox aria-label="Remember me" />);
    const el = screen.getByRole("checkbox", { name: "Remember me" });
    el.focus();
    await userEvent.keyboard(" ");
    expect(el.getAttribute("aria-checked")).toBe("true");
  });
});

describe("Progress", () => {
  it("sets the fill width through a CSS variable and clamps it", () => {
    const { container, rerender } = render(<Progress value={40} />);
    const fill = () => container.querySelector<HTMLElement>("[data-slot=progress-indicator]")!;
    expect(fill().style.getPropertyValue("--progress")).toBe("40%");
    rerender(<Progress value={250} />);
    expect(fill().style.getPropertyValue("--progress")).toBe("100%");
    rerender(<Progress value={-5} />);
    expect(fill().style.getPropertyValue("--progress")).toBe("0%");
  });

  it("the fill can be recoloured", () => {
    const { container } = render(<Progress value={90} indicatorClassName="bg-red-500" />);
    const fill = container.querySelector("[data-slot=progress-indicator]")!;
    expect(fill.className).toContain("bg-red-500");
    expect(fill.className).not.toContain("bg-primary");
  });
});

describe("Alert", () => {
  it("interrupts for danger and warning, stays polite otherwise", () => {
    render(
      <>
        <Alert variant="danger">d</Alert>
        <Alert variant="warning">w</Alert>
        <Alert variant="success">s</Alert>
        <Alert variant="info">i</Alert>
        <Alert>x</Alert>
      </>
    );
    expect(screen.getByText("d").getAttribute("role")).toBe("alert");
    expect(screen.getByText("w").getAttribute("role")).toBe("alert");
    expect(screen.getByText("s").getAttribute("role")).toBe("status");
    expect(screen.getByText("i").getAttribute("role")).toBe("status");
    expect(screen.getByText("x").getAttribute("role")).toBe("status");
  });

  it("uses the CLAUDE.md status colours", () => {
    render(<Alert variant="danger">oops</Alert>);
    const cls = screen.getByText("oops").className;
    expect(cls).toContain("bg-red-50");
    expect(cls).toContain("border-red-200");
    expect(cls).toContain("text-red-600");
  });
});

describe("Badge", () => {
  it("has a tone per status", () => {
    render(
      <>
        <Badge variant="success">ok</Badge>
        <Badge variant="warning">careful</Badge>
      </>
    );
    expect(screen.getByText("ok").className).toContain("bg-green-50");
    expect(screen.getByText("careful").className).toContain("border-brand-400");
  });
});

describe("NativeSelect", () => {
  it("is a real select that changes value", async () => {
    render(
      <NativeSelect aria-label="Hour" defaultValue="09">
        <NativeSelectOption value="09">09</NativeSelectOption>
        <NativeSelectOption value="10">10</NativeSelectOption>
      </NativeSelect>
    );
    const el = screen.getByLabelText("Hour") as HTMLSelectElement;
    await userEvent.selectOptions(el, "10");
    expect(el.value).toBe("10");
  });

  it("the wrapper is full width unless told otherwise", () => {
    const { container } = render(
      <NativeSelect aria-label="A" containerClassName="w-auto">
        <NativeSelectOption value="1">1</NativeSelectOption>
      </NativeSelect>
    );
    const wrapper = container.querySelector("[data-slot=native-select-wrapper]")!;
    expect(wrapper.className).toContain("w-auto");
    expect(wrapper.className).not.toContain("w-full");
  });
});
