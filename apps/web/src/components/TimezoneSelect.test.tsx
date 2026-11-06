// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimezoneSelect } from "./TimezoneSelect";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

afterEach(cleanup);

function Host({ initial = "Asia/Jakarta", onChange }: { initial?: string; onChange?: (z: string) => void }) {
  const [v, setV] = useState(initial);
  return <TimezoneSelect aria-label="Timezone" value={v} onChange={(z) => { setV(z); onChange?.(z); }} />;
}

describe("TimezoneSelect", () => {
  it("shows the chosen zone in a readable form", () => {
    render(<Host initial="America/New_York" />);
    expect(screen.getByRole("combobox", { name: "Timezone" }).textContent).toContain("America / New York");
  });

  it("opens a searchable list of the browser's timezones", async () => {
    render(<Host />);
    await userEvent.click(screen.getByRole("combobox", { name: "Timezone" }));
    expect(await screen.findByPlaceholderText("Search timezone…")).toBeTruthy();
    expect(screen.getAllByRole("option").length).toBeGreaterThan(300);
  });

  it("typing filters it, by the readable name too", async () => {
    render(<Host />);
    await userEvent.click(screen.getByRole("combobox", { name: "Timezone" }));
    await userEvent.type(await screen.findByPlaceholderText("Search timezone…"), "new york");
    await waitFor(() => expect(screen.getAllByRole("option").length).toBeLessThan(5));
    expect(screen.getByRole("option", { name: /America \/ New York/ })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /Jakarta/ })).toBeNull();
  });

  it("says so when nothing matches", async () => {
    render(<Host />);
    await userEvent.click(screen.getByRole("combobox", { name: "Timezone" }));
    await userEvent.type(await screen.findByPlaceholderText("Search timezone…"), "zzzzqq");
    expect(await screen.findByText("No timezone found")).toBeTruthy();
  });

  it("picking one reports the IANA name and closes the list", async () => {
    const onChange = vi.fn();
    render(<Host onChange={onChange} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Timezone" }));
    await userEvent.type(await screen.findByPlaceholderText("Search timezone…"), "new york");
    await userEvent.click(await screen.findByRole("option", { name: /America \/ New York/ }));
    expect(onChange).toHaveBeenCalledWith("America/New_York");
    await waitFor(() => expect(screen.queryByPlaceholderText("Search timezone…")).toBeNull());
    expect(screen.getByRole("combobox", { name: "Timezone" }).textContent).toContain("America / New York");
  });

  it("the saved zone is in the list and ticked, even one the browser does not list", async () => {
    render(<Host initial="Mars/Olympus_Mons" />);
    expect(screen.getByRole("combobox", { name: "Timezone" }).textContent).toContain("Mars / Olympus Mons");
    await userEvent.click(screen.getByRole("combobox", { name: "Timezone" }));
    expect(await screen.findByRole("option", { name: /Mars \/ Olympus Mons/ })).toBeTruthy();
  });

  it("UTC is always offered", async () => {
    render(<Host initial="UTC" />);
    await userEvent.click(screen.getByRole("combobox", { name: "Timezone" }));
    await userEvent.type(await screen.findByPlaceholderText("Search timezone…"), "utc");
    expect(await screen.findByRole("option", { name: "UTC" })).toBeTruthy();
  });

  it("reports aria-expanded", async () => {
    render(<Host />);
    const box = screen.getByRole("combobox", { name: "Timezone" });
    expect(box.getAttribute("aria-expanded")).toBe("false");
    await userEvent.click(box);
    expect(box.getAttribute("aria-expanded")).toBe("true");
  });

  it("works inside a dialog without closing it", async () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Library</DialogTitle>
          <DialogDescription>Settings</DialogDescription>
          <Host />
        </DialogContent>
      </Dialog>
    );
    await userEvent.click(await screen.findByRole("combobox", { name: "Timezone" }));
    await userEvent.type(await screen.findByPlaceholderText("Search timezone…"), "paris");
    await userEvent.click(await screen.findByRole("option", { name: /Europe \/ Paris/ }));
    expect(screen.getByRole("combobox", { name: "Timezone" }).textContent).toContain("Europe / Paris");
    expect(screen.queryByRole("dialog", { name: "Library" })).not.toBeNull();
  });
});
