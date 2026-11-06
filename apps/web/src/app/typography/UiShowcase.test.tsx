// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UiShowcase } from "./UiShowcase";

afterEach(cleanup);

// The showcase puts every ui/* component on one page. If a prop is wrong for Radix or
// react-day-picker, it throws while rendering or on the first interaction.
describe("UiShowcase", () => {
  it("renders every section", () => {
    render(<UiShowcase />);
    for (const title of ["Button", "Badge and Alert", "Feedback", "Form controls", "Toggle group, tabs, progress", "Avatar, card, table, collapsible", "Overlays"]) {
      expect(screen.getByRole("heading", { name: title })).toBeTruthy();
    }
    // 7 badge tones + the 4 alerts
    expect(screen.getAllByRole("alert").length + screen.getAllByRole("status").length).toBeGreaterThanOrEqual(4);
  });

  it("opens a dialog, then a popover inside it, without closing the dialog", async () => {
    render(<UiShowcase />);
    await userEvent.click(screen.getByRole("button", { name: "Dialog" }));
    await screen.findByRole("dialog", { name: "Edit post" });
    await userEvent.click(screen.getByRole("button", { name: /Pick a date/ }));
    await screen.findByRole("grid");
    expect(screen.queryByRole("dialog", { name: "Edit post" })).not.toBeNull();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("grid")).toBeNull());
    expect(screen.queryByRole("dialog", { name: "Edit post" })).not.toBeNull();
  });

  it("opens the alert dialog and cancels it", async () => {
    render(<UiShowcase />);
    await userEvent.click(screen.getByRole("button", { name: "Alert dialog" }));
    await screen.findByRole("alertdialog", { name: "Delete this post?" });
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("switches the pill range and picks a timezone in the combobox", async () => {
    render(<UiShowcase />);
    await userEvent.click(screen.getByRole("radio", { name: "Week" }));
    expect(screen.getByRole("radio", { name: "Week" }).getAttribute("aria-checked")).toBe("true");

    const combo = screen.getByRole("combobox", { name: "Timezone search" });
    expect(combo.textContent).toContain("Asia/Jakarta");
    await userEvent.click(combo);
    await userEvent.click(await screen.findByRole("option", { name: "Europe/Paris" }));
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Timezone search" }).textContent).toContain("Europe/Paris"));
  });
});
