// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApprovalBadge, ItemStatusBadge, PlanStatusBadge, RoleBadge, StatusBadge } from "./StatusBadge";
import { PageHeader } from "./PageHeader";
import { SectionCard } from "./SectionCard";
import { StatTile } from "./StatTile";
import { UsageBar } from "./UsageBar";
import { ListRow } from "./ListRow";
import { FormField } from "./FormField";
import { AccountAvatar } from "./AccountAvatar";
import { AccountPicker, type PickerAccount } from "./AccountPicker";
import { FilterChips, type ChipOption } from "./FilterChips";
import { Input } from "@/components/ui/input";

afterEach(cleanup);

const classesOf = (el: Element) => el.className.split(/\s+/);

describe("status badges", () => {
  it("StatusBadge: label, tone and a dot", () => {
    const { container } = render(<StatusBadge status="done" />);
    const badge = screen.getByText("Published");
    expect(classesOf(badge)).toContain("bg-green-50");
    expect(container.querySelector(".bg-green-500")).not.toBeNull();
  });

  it("a running post pulses its dot", () => {
    const { container } = render(<StatusBadge status="running" />);
    expect(screen.getByText("Posting…")).toBeTruthy();
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("a status it does not know shows as text, neutral", () => {
    render(<StatusBadge status="paused_by_admin" />);
    expect(classesOf(screen.getByText("paused_by_admin"))).toContain("bg-surface");
  });

  it("ItemStatusBadge uses the library statuses", () => {
    render(<ItemStatusBadge status="queued" />);
    expect(classesOf(screen.getByText("Queued"))).toContain("bg-brand-100");
  });

  it("ApprovalBadge shows the review state with the reviewer in the tooltip, and nothing otherwise", () => {
    const { container, rerender } = render(<ApprovalBadge approvalStatus="rejected" reviewedBy={{ name: "Rani" }} />);
    const badge = screen.getByText("Rejected");
    expect(badge.getAttribute("title")).toBe("Rejected by Rani");
    expect(classesOf(badge)).toContain("bg-red-50");
    rerender(<ApprovalBadge approvalStatus={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("PlanStatusBadge: active, trial days, payment failed, cancelled (no dot), unknown (nothing)", () => {
    const { container, rerender } = render(<PlanStatusBadge status="active" />);
    expect(screen.getByText("Active")).toBeTruthy();
    rerender(<PlanStatusBadge status="trialing" trialDaysLeft={2} />);
    expect(classesOf(screen.getByText("2 days left"))).toContain("bg-brand-100");
    rerender(<PlanStatusBadge status="on_hold" />);
    expect(classesOf(screen.getByText("Payment failed"))).toContain("bg-red-50");
    rerender(<PlanStatusBadge status="cancelled" />);
    expect(screen.getByText("Cancelled").querySelector("span")).toBeNull();
    rerender(<PlanStatusBadge status="mystery" />);
    expect(container.firstChild).toBeNull();
  });

  it("RoleBadge: one colour per role, owner and admin alike", () => {
    render(
      <>
        <RoleBadge role="owner" />
        <RoleBadge role="admin" />
        <RoleBadge role="designer" />
        <RoleBadge role="member" />
      </>
    );
    expect(classesOf(screen.getByText("owner"))).toContain("bg-brand-100");
    expect(classesOf(screen.getByText("admin"))).toContain("bg-brand-100");
    expect(classesOf(screen.getByText("designer"))).toContain("bg-green-50");
    expect(classesOf(screen.getByText("member"))).toContain("bg-surface");
    expect(classesOf(screen.getByText("member"))).toContain("capitalize");
  });
});

describe("layout", () => {
  it("PageHeader: h1, subtitle and actions", () => {
    render(<PageHeader title="Accounts" subtitle="Connect the accounts you post to." actions={<button>Connect</button>} />);
    expect(screen.getByRole("heading", { level: 1, name: "Accounts" })).toBeTruthy();
    expect(screen.getByText("Connect the accounts you post to.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Connect" })).toBeTruthy();
    expect(screen.getByRole("heading").closest(".page-header")).not.toBeNull();
  });

  it("PageHeader works with just a title", () => {
    const { container } = render(<PageHeader title="Billing" />);
    expect(container.querySelectorAll("p").length).toBe(0);
  });

  it("SectionCard: icon tile, title, description, action and body", () => {
    render(
      <SectionCard title="Profile" description="Your name and photo" icon={<svg data-testid="i" />} action={<span>3 members</span>}>
        <p>Body</p>
      </SectionCard>
    );
    expect(screen.getByRole("heading", { level: 2, name: "Profile" })).toBeTruthy();
    expect(screen.getByText("Your name and photo")).toBeTruthy();
    expect(screen.getByText("3 members")).toBeTruthy();
    expect(screen.getByText("Body")).toBeTruthy();
    expect(classesOf(screen.getByTestId("i").parentElement!)).toContain("bg-brand-100");
  });

  it("SectionCard danger tone is red", () => {
    render(<SectionCard title="Danger zone" tone="danger" icon={<svg data-testid="i" />}>x</SectionCard>);
    expect(classesOf(screen.getByRole("heading"))).toContain("text-red-600");
    expect(classesOf(screen.getByTestId("i").parentElement!)).toContain("bg-red-50");
  });

  it("StatTile: card shows label, value and sub; inline puts the number first, in its tone", () => {
    const { rerender } = render(<StatTile label="Total posts" value={42} sub="last 30 days" />);
    expect(screen.getByText("Total posts")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.getByText("last 30 days")).toBeTruthy();
    rerender(<StatTile variant="inline" label="Failed" value={3} tone="danger" />);
    expect(classesOf(screen.getByText("3"))).toContain("text-red-600");
    expect(screen.getByText("Failed")).toBeTruthy();
  });

  it("ListRow: leading, title, description and trailing", () => {
    render(<ListRow leading={<i>A</i>} title="Puteri" description="puteri@example.com" trailing={<button>Remove</button>} />);
    expect(screen.getByText("Puteri")).toBeTruthy();
    expect(screen.getByText("puteri@example.com")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove" })).toBeTruthy();
    expect(screen.getByText("A")).toBeTruthy();
  });
});

describe("UsageBar", () => {
  const fill = (c: HTMLElement) => c.querySelector("[data-slot=progress-indicator]")!;

  it("unlimited shows ∞ and no bar", () => {
    const { container } = render(<UsageBar label="Accounts" used={4} max={null} />);
    expect(screen.getByText("/ ∞")).toBeTruthy();
    expect(container.querySelector("[data-slot=progress]")).toBeNull();
  });

  it("low usage: yellow fill, normal text", () => {
    const { container } = render(<UsageBar label="Accounts" used={2} max={10} />);
    expect(classesOf(fill(container))).toContain("bg-primary");
    expect(fill(container).getAttribute("style")).toContain("20%");
    expect(screen.queryByText(/Limit reached/)).toBeNull();
  });

  it("from 80% the fill and the number turn brown", () => {
    const { container } = render(<UsageBar label="Accounts" used={8} max={10} />);
    expect(classesOf(fill(container))).toContain("bg-brand-700");
    expect(classesOf(screen.getByText("8"))).toContain("text-brand-800");
    expect(classesOf(screen.getByText("8"))).not.toContain("text-red-600");
  });

  it("at the limit it turns red and says so", () => {
    const { container } = render(<UsageBar label="Accounts" used={10} max={10} />);
    expect(classesOf(fill(container))).toContain("bg-red-500");
    expect(screen.getByText("Limit reached - upgrade to continue.")).toBeTruthy();
  });

  it("a limit of 0 counts as full", () => {
    render(<UsageBar label="Reels" used={0} max={0} />);
    expect(screen.getByText(/Limit reached/)).toBeTruthy();
  });

  it("the bar has an accessible name and value", () => {
    render(<UsageBar label="Accounts" used={3} max={5} />);
    const bar = screen.getByRole("progressbar", { name: "Accounts: 3 of 5 used" });
    expect(bar.getAttribute("aria-valuenow")).toBe("60");
  });
});

describe("FormField", () => {
  it("connects the label to the control", () => {
    render(<FormField label="Email">{(c) => <Input {...c} />}</FormField>);
    expect(screen.getByLabelText("Email")).toBeTruthy();
  });

  it("gives each field its own id", () => {
    render(
      <>
        <FormField label="First">{(c) => <Input {...c} />}</FormField>
        <FormField label="Second">{(c) => <Input {...c} />}</FormField>
      </>
    );
    expect(screen.getByLabelText("First").id).not.toBe(screen.getByLabelText("Second").id);
  });

  it("an error is read with the control and marks it invalid", () => {
    render(<FormField label="Email" error="Enter a valid email">{(c) => <Input {...c} />}</FormField>);
    const input = screen.getByLabelText("Email");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const msg = screen.getByRole("alert");
    expect(msg.textContent).toBe("Enter a valid email");
    expect(input.getAttribute("aria-describedby")).toBe(msg.id);
  });

  it("a hint is described but does not mark the control invalid", () => {
    render(<FormField label="Email" hint="We never share it">{(c) => <Input {...c} />}</FormField>);
    const input = screen.getByLabelText("Email");
    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(input.getAttribute("aria-describedby")).toBe(screen.getByText("We never share it").id);
  });

  it("the error replaces the hint", () => {
    render(<FormField label="Email" hint="We never share it" error="Required">{(c) => <Input {...c} />}</FormField>);
    expect(screen.queryByText("We never share it")).toBeNull();
    expect(screen.getByText("Required")).toBeTruthy();
  });

  it("with neither, the control has no aria-describedby", () => {
    render(<FormField label="Email">{(c) => <Input {...c} />}</FormField>);
    expect(screen.getByLabelText("Email").getAttribute("aria-describedby")).toBeNull();
  });
});

describe("AccountAvatar", () => {
  it("with no picture shows the platform logo in a tile and in the corner badge", () => {
    const { container } = render(<AccountAvatar platform="instagram" />);
    expect(screen.getAllByAltText("instagram").length).toBe(2);
    expect(container.querySelector("[data-slot=account-avatar-badge]")).not.toBeNull();
  });

  it("tints the tile with the platform colour through a CSS variable", () => {
    const { container } = render(<AccountAvatar platform="instagram" />);
    expect((container.firstChild as HTMLElement).style.getPropertyValue("--platform")).toBe("#e1306c");
  });

  it("an unknown platform gets a grey tint", () => {
    const { container } = render(<AccountAvatar platform="newnet" />);
    expect((container.firstChild as HTMLElement).style.getPropertyValue("--platform")).toBe("#6b7280");
  });

  it("the small size has no corner badge unless asked", () => {
    const { container, rerender } = render(<AccountAvatar platform="bluesky" size="sm" />);
    expect(container.querySelector("[data-slot=account-avatar-badge]")).toBeNull();
    rerender(<AccountAvatar platform="bluesky" size="sm" badge />);
    expect(container.querySelector("[data-slot=account-avatar-badge]")).not.toBeNull();
  });
});

describe("AccountPicker", () => {
  const accounts: PickerAccount[] = [
    { id: "a", platform: "instagram", displayName: "@posthive" },
    { id: "b", platform: "linkedin", displayName: "Posthive Inc" },
  ];

  function Host({ initial = [] as string[], onChange }: { initial?: string[]; onChange?: (ids: string[]) => void }) {
    const [value, setValue] = useState(initial);
    return <AccountPicker accounts={accounts} value={value} onChange={(ids) => { setValue(ids); onChange?.(ids); }} />;
  }

  it("lists the accounts with their platform names", () => {
    render(<Host />);
    expect(screen.getByRole("group", { name: "Accounts" })).toBeTruthy();
    expect(screen.getByText("@posthive")).toBeTruthy();
    expect(screen.getByText("LinkedIn")).toBeTruthy();
    expect(screen.getByText("Instagram")).toBeTruthy();
  });

  it("clicking adds, clicking again removes, and aria-pressed follows", async () => {
    const onChange = vi.fn();
    render(<Host onChange={onChange} />);
    const first = screen.getByRole("button", { name: /@posthive/ });
    expect(first.getAttribute("aria-pressed")).toBe("false");
    await userEvent.click(first);
    expect(onChange).toHaveBeenLastCalledWith(["a"]);
    expect(first.getAttribute("aria-pressed")).toBe("true");
    await userEvent.click(screen.getByRole("button", { name: /Posthive Inc/ }));
    expect(onChange).toHaveBeenLastCalledWith(["a", "b"]);
    await userEvent.click(first);
    expect(onChange).toHaveBeenLastCalledWith(["b"]);
    expect(first.getAttribute("aria-pressed")).toBe("false");
  });

  it("works from the keyboard", async () => {
    const onChange = vi.fn();
    render(<Host onChange={onChange} />);
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenLastCalledWith(["a"]);
    await userEvent.keyboard(" ");
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("starts with the chosen ones on", () => {
    render(<Host initial={["b"]} />);
    expect(screen.getByRole("button", { name: /Posthive Inc/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /@posthive/ }).getAttribute("aria-pressed")).toBe("false");
  });

  it("shows the empty message when there are no accounts", () => {
    render(<AccountPicker accounts={[]} value={[]} onChange={() => {}} empty={<a href="/accounts">Connect one first.</a>} />);
    expect(screen.getByRole("link", { name: "Connect one first." })).toBeTruthy();
    expect(screen.queryByRole("group")).toBeNull();
  });
});

describe("FilterChips", () => {
  const options: ChipOption[] = [
    { value: "all", label: "All", count: 12 },
    { value: "pending", label: "Scheduled", dot: "bg-accent", count: 5 },
    { value: "failed", label: "Failed", dot: "bg-red-500", count: 1 },
  ];

  function Host({ onChange }: { onChange?: (v: string) => void }) {
    const [v, setV] = useState("all");
    return <FilterChips options={options} value={v} onChange={(x) => { setV(x); onChange?.(x); }} label="Status" />;
  }

  it("is a radio group with one chip on", () => {
    render(<Host />);
    expect(screen.getByRole("radiogroup", { name: "Status" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: /All/ }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: /Failed/ }).getAttribute("aria-checked")).toBe("false");
  });

  it("shows counts", () => {
    render(<Host />);
    expect(within(screen.getByRole("radio", { name: /Scheduled/ })).getByText("5")).toBeTruthy();
  });

  it("picks another chip and reports it", async () => {
    const onChange = vi.fn();
    render(<Host onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: /Failed/ }));
    expect(onChange).toHaveBeenCalledWith("failed");
    expect(screen.getByRole("radio", { name: /Failed/ }).getAttribute("aria-checked")).toBe("true");
  });

  it("clicking the active chip does not clear the filter", async () => {
    const onChange = vi.fn();
    render(<Host onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: /All/ }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: /All/ }).getAttribute("aria-checked")).toBe("true");
  });

  it("the dot shows its colour only while the chip is on", async () => {
    render(<Host />);
    const dotOf = (name: RegExp) => screen.getByRole("radio", { name }).querySelector("span[aria-hidden=true]")!;
    expect(classesOf(dotOf(/Failed/))).toContain("bg-neutral-300");
    await userEvent.click(screen.getByRole("radio", { name: /Failed/ }));
    expect(classesOf(dotOf(/Failed/))).toContain("bg-red-500");
    expect(classesOf(dotOf(/Failed/))).not.toContain("bg-neutral-300");
  });

  it("item classes are merged over the chip look", () => {
    render(<FilterChips options={options} value="all" onChange={() => {}} label="Status" itemClassName="px-3 py-1.5 rounded-xl" />);
    const chip = screen.getByRole("radio", { name: /All/ });
    expect(classesOf(chip)).toContain("rounded-xl");
    expect(classesOf(chip)).not.toContain("rounded-lg");
  });
});
