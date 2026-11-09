// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FixRecordsDialog, type RowFixes } from "./FixRecordsDialog";
import { buildReviewRows, type ReviewFields, type ServerRow } from "@/lib/importReview";

afterEach(cleanup);

const f = (patch: Partial<ReviewFields> = {}): ReviewFields => ({ title: "Post", postDate: "2099-03-10", platforms: ["linkedin"], category: "Case Study", caption: "c", ...patch });
const server = (n: number, patch: Partial<ServerRow> = {}, fields: Partial<ReviewFields> = {}): ServerRow => ({
  sourceRow: n, status: "valid", fields: f(fields), errors: [], warnings: [], duplicateReason: null, duplicateKind: null, details: {}, ...patch,
});

const rows = buildReviewRows([
  server(1, {}, { title: "Fine" }),
  server(9, { status: "invalid", errors: [{ field: "postDate", message: "x" }], details: { rawPostDate: "31/11/2026" } }, { title: "Client Story", postDate: "", platforms: ["linkedin"] }),
  server(17, { status: "invalid", errors: [{ field: "title", message: "Content title is required." }] }, { title: "" }),
]);

function Harness({ fixing = [9, 17], onSave = vi.fn() }: { fixing?: number[]; onSave?: (fixes: RowFixes, exclude: number[]) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <FixRecordsDialog open={open} onOpenChange={setOpen} rows={rows} fixing={fixing} serverErrors={new Map()} onSave={onSave} />
    </>
  );
}

const dialog = () => screen.getByRole("dialog");

describe("FixRecordsDialog", () => {
  it("is a titled dialog that says how many rows and how many issues", () => {
    render(<Harness />);
    expect(within(dialog()).getByRole("heading", { name: "Fix records before import" })).toBeTruthy();
    expect(within(dialog()).getByText("Fix records · 2 of 3 rows")).toBeTruthy();
    expect(within(dialog()).getByText("2 issues")).toBeTruthy();
  });

  it("one card per row, with what is wrong with it", () => {
    render(<Harness />);
    expect(within(dialog()).getByRole("region", { name: "Row 9" })).toBeTruthy();
    expect(within(dialog()).getByText("Row 9 · Invalid date")).toBeTruthy();
    expect(within(dialog()).getByText("Row 17 · Missing required info")).toBeTruthy();
    expect(within(dialog()).queryByRole("region", { name: "Row 1" })).toBeNull();
  });

  it("a date that is not on the calendar comes with the dates it may have meant", () => {
    render(<Harness />);
    const card = within(screen.getByRole("region", { name: "Row 9" }));
    expect(card.getByText(/November has 30 days\. Suggested:/)).toBeTruthy();
    expect(card.getByRole("button", { name: "30 Nov 2026" })).toBeTruthy();
    expect(card.getByRole("button", { name: "01 Dec 2026" })).toBeTruthy();
  });

  it("choosing a suggested date fixes the row on the spot and takes the suggestions away", async () => {
    render(<Harness />);
    const card = within(screen.getByRole("region", { name: "Row 9" }));
    await userEvent.click(card.getByRole("button", { name: "30 Nov 2026" }));
    expect(card.getByText("Row 9 · Looks good now")).toBeTruthy();
    expect(card.queryByText(/Suggested:/)).toBeNull();
    expect(within(dialog()).getByText("1 issue")).toBeTruthy();
  });

  it("an empty title shows its error and is fixed by typing", async () => {
    render(<Harness />);
    const card = within(screen.getByRole("region", { name: "Row 17" }));
    const title = card.getByLabelText("Content title") as HTMLInputElement;
    expect(title.getAttribute("aria-invalid")).toBe("true");
    expect(card.getByRole("alert").textContent).toBe("Content title is required.");
    await userEvent.type(title, "Holiday Gift Guide");
    expect(card.queryByRole("alert")).toBeNull();
    expect(card.getByText("Row 17 · Looks good now")).toBeTruthy();
  });

  it("channels are a set of toggles that can hold more than one, and cannot be left empty without an error", async () => {
    render(<Harness />);
    const card = within(screen.getByRole("region", { name: "Row 9" }));
    const instagram = card.getByRole("button", { name: "Instagram" });
    expect(instagram.getAttribute("aria-pressed")).toBe("false");
    await userEvent.click(instagram);
    expect(instagram.getAttribute("aria-pressed")).toBe("true");
    expect(card.getByRole("button", { name: "LinkedIn" }).getAttribute("aria-pressed")).toBe("true");
    await userEvent.click(card.getByRole("button", { name: "LinkedIn" }));
    await userEvent.click(instagram);
    expect(card.getByText("Channel is required.")).toBeTruthy();
  });

  it("Save fixes hands over only what was changed, and closes", async () => {
    const onSave = vi.fn();
    render(<Harness onSave={onSave} />);
    await userEvent.click(within(screen.getByRole("region", { name: "Row 9" })).getByRole("button", { name: "30 Nov 2026" }));
    await userEvent.type(within(screen.getByRole("region", { name: "Row 17" })).getByLabelText("Content title"), "Holiday");
    await userEvent.click(screen.getByRole("button", { name: "Save fixes" }));
    expect(onSave).toHaveBeenCalledWith({ 9: { postDate: "2026-11-30" }, 17: { title: "Holiday" } }, []);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Cancel throws the edits away: opened again, the rows are as they were", async () => {
    const onSave = vi.fn();
    render(<Harness onSave={onSave} />);
    await userEvent.click(within(screen.getByRole("region", { name: "Row 9" })).getByRole("button", { name: "30 Nov 2026" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onSave).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(within(screen.getByRole("region", { name: "Row 9" })).getByText("Row 9 · Invalid date")).toBeTruthy();
  });

  it("Escape closes it without saving", async () => {
    const onSave = vi.fn();
    render(<Harness onSave={onSave} />);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("Exclude row sets the row aside, can be undone, and is reported on save", async () => {
    const onSave = vi.fn();
    render(<Harness onSave={onSave} />);
    await userEvent.click(within(screen.getByRole("region", { name: "Row 9" })).getByRole("button", { name: "Exclude row" }));
    const excluded = screen.getByRole("region", { name: "Row 9, excluded" });
    expect(within(excluded).getByText("Row 9 · Excluded from this import")).toBeTruthy();
    expect(within(dialog()).getByText("1 issue")).toBeTruthy();
    await userEvent.click(within(excluded).getByRole("button", { name: "Include again" }));
    expect(screen.getByRole("region", { name: "Row 9" })).toBeTruthy();
    await userEvent.click(within(screen.getByRole("region", { name: "Row 9" })).getByRole("button", { name: "Exclude row" }));
    await userEvent.click(screen.getByRole("button", { name: "Save fixes" }));
    expect(onSave).toHaveBeenCalledWith({}, [9]);
  });

  it("when every issue is fixed the badge says so", async () => {
    render(<Harness fixing={[9]} />);
    await userEvent.click(within(screen.getByRole("region", { name: "Row 9" })).getByRole("button", { name: "30 Nov 2026" }));
    expect(within(dialog()).getByText("All fixed")).toBeTruthy();
  });

  it("fixing a single row from the table opens only that row", () => {
    render(<Harness fixing={[17]} />);
    expect(within(dialog()).getByText("Fix records · 1 of 3 rows")).toBeTruthy();
    expect(within(dialog()).queryByRole("region", { name: "Row 9" })).toBeNull();
  });

  it("promises that nothing is removed silently", () => {
    render(<Harness />);
    expect(within(dialog()).getByText(/never silently removed/)).toBeTruthy();
    expect(within(dialog()).getByText("Changes apply to this import only.")).toBeTruthy();
  });
});
