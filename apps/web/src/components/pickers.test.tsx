// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DatePicker } from "./DatePicker";
import { DateTimePicker } from "./DateTimePicker";
import { RepeatPicker } from "./RepeatPicker";
import { TimeInput24 } from "./TimeInput24";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

// 2026-11-06 20:00 UTC is already 2026-11-07 03:00 in WIB: the app's "today" is the 7th.
const NOW = new Date("2026-11-06T20:00:00Z");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: NOW });
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

const user = () => userEvent.setup({ advanceTimers: () => {} });

// The trigger label uses the browser's own locale ("20 Nov 2026" or "Nov 20, 2026"), so the
// tests build the expected text the same way instead of hard-coding one.
const dayLabel = (y: number, m: number, d: number) =>
  new RegExp(new Date(y, m - 1, d, 12).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

function Controlled({ initial = "", min, onChange }: { initial?: string; min?: string; onChange?: (v: string) => void }) {
  const [v, setV] = useState(initial);
  return <DatePicker value={v} min={min} onChange={(x) => { setV(x); onChange?.(x); }} />;
}

describe("DatePicker", () => {
  it("shows the placeholder, then the chosen day", async () => {
    render(<Controlled />);
    expect(screen.getByRole("button", { name: /End date \(optional\)/ })).toBeTruthy();
    await user().click(screen.getByRole("button", { name: /End date/ }));
    await user().click(await screen.findByRole("button", { name: /November 20th, 2026/ }));
    expect(screen.getByRole("button", { name: dayLabel(2026, 11, 20) })).toBeTruthy();
  });

  it("picking a day reports it as YYYY-MM-DD and closes the panel", async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    await user().click(screen.getByRole("button", { name: /End date/ }));
    await user().click(await screen.findByRole("button", { name: /November 20th, 2026/ }));
    expect(onChange).toHaveBeenCalledWith("2026-11-20");
    await waitFor(() => expect(screen.queryByRole("grid")).toBeNull());
  });

  it("today is the WIB day, not the browser's", async () => {
    render(<Controlled />);
    await user().click(screen.getByRole("button", { name: /End date/ }));
    const grid = await screen.findByRole("grid");
    const today = grid.querySelector("[data-today=true]")!;
    expect(today.textContent).toBe("7");
  });

  it("min disables the days before it and they cannot be picked", async () => {
    const onChange = vi.fn();
    render(<Controlled min="2026-11-10" onChange={onChange} />);
    await user().click(screen.getByRole("button", { name: /End date/ }));
    const early = await screen.findByRole("button", { name: /November 9th, 2026/ });
    expect((early as HTMLButtonElement).disabled).toBe(true);
    await user().click(early);
    expect(onChange).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: /November 10th, 2026/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("opens on the month of the current value", async () => {
    render(<Controlled initial="2027-02-14" />);
    await user().click(screen.getByRole("button", { name: dayLabel(2027, 2, 14) }));
    expect(await screen.findByText(/February 2027/)).toBeTruthy();
  });

  it("Clear empties the value, and is only there when there is one", async () => {
    const onChange = vi.fn();
    const { unmount } = render(<Controlled onChange={onChange} />);
    await user().click(screen.getByRole("button", { name: /End date/ }));
    await screen.findByRole("grid");
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    unmount();

    render(<Controlled initial="2026-11-20" onChange={onChange} />);
    await user().click(screen.getByRole("button", { name: dayLabel(2026, 11, 20) }));
    await user().click(await screen.findByRole("button", { name: "Clear" }));
    expect(onChange).toHaveBeenCalledWith("");
    expect(screen.getByRole("button", { name: /End date/ })).toBeTruthy();
  });

  it("picking the same day again keeps it (no deselect)", async () => {
    const onChange = vi.fn();
    render(<Controlled initial="2026-11-20" onChange={onChange} />);
    await user().click(screen.getByRole("button", { name: dayLabel(2026, 11, 20) }));
    await user().click(await screen.findByRole("button", { name: /November 20th, 2026/ }));
    expect(onChange).toHaveBeenCalledWith("2026-11-20");
  });

  it("opens inside a dialog, can be clicked, and does not close the dialog", async () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Repeat</DialogTitle>
          <DialogDescription>Until when</DialogDescription>
          <Controlled />
        </DialogContent>
      </Dialog>
    );
    await user().click(await screen.findByRole("button", { name: /End date/ }));
    await user().click(await screen.findByRole("button", { name: /November 20th, 2026/ }));
    expect(screen.getByRole("button", { name: dayLabel(2026, 11, 20) })).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Repeat" })).not.toBeNull();
  });
});

function Timed({ initial = "2026-11-10T09:30", min, direction, onChange }: { initial?: string; min?: string; direction?: "up" | "down"; onChange?: (v: string) => void }) {
  const [v, setV] = useState(initial);
  return <DateTimePicker value={v} min={min} dropdownDirection={direction} onChange={(x) => { setV(x); onChange?.(x); }} />;
}

describe("DateTimePicker", () => {
  it("the button says the day and the WIB time", () => {
    render(<Timed initial="2026-11-10T09:30" />);
    expect(screen.getByRole("button", { name: /Nov 10 · 09:30 WIB/ })).toBeTruthy();
  });

  it("calls the WIB day today and the next one tomorrow", () => {
    const { unmount } = render(<Timed initial="2026-11-07T10:00" />);
    expect(screen.getByRole("button", { name: /Today · 10:00 WIB/ })).toBeTruthy();
    unmount();
    render(<Timed initial="2026-11-08T10:00" />);
    expect(screen.getByRole("button", { name: /Tomorrow · 10:00 WIB/ })).toBeTruthy();
  });

  it("picking a day keeps the time", async () => {
    const onChange = vi.fn();
    render(<Timed onChange={onChange} />);
    await user().click(screen.getByRole("button", { name: /Nov 10/ }));
    await user().click(await screen.findByRole("button", { name: /November 25th, 2026/ }));
    expect(onChange).toHaveBeenLastCalledWith("2026-11-25T09:30");
  });

  it("picking an hour or a minute keeps the day and the other part", async () => {
    const onChange = vi.fn();
    render(<Timed onChange={onChange} />);
    await user().click(screen.getByRole("button", { name: /Nov 10/ }));
    await user().click(await screen.findByRole("button", { name: "Hour 14" }));
    expect(onChange).toHaveBeenLastCalledWith("2026-11-10T14:30");
    await user().click(screen.getByRole("button", { name: "Min 05" }));
    expect(onChange).toHaveBeenLastCalledWith("2026-11-10T14:05");
  });

  it("marks the chosen hour and minute", async () => {
    render(<Timed initial="2026-11-10T09:30" />);
    await user().click(screen.getByRole("button", { name: /Nov 10/ }));
    expect((await screen.findByRole("button", { name: "Hour 09" })).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Hour 10" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: "Min 30" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("min disables earlier days, based on the WIB day", async () => {
    const onChange = vi.fn();
    render(<Timed initial="2026-11-10T09:30" min="2026-11-07" onChange={onChange} />);
    await user().click(screen.getByRole("button", { name: /Nov 10/ }));
    const yesterday = await screen.findByRole("button", { name: /November 6th, 2026/ });
    expect((yesterday as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /November 7th, 2026/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("the quick picks set the value and close the panel", async () => {
    const onChange = vi.fn();
    render(<Timed onChange={onChange} />);
    await user().click(screen.getByRole("button", { name: /Nov 10/ }));
    await user().click(await screen.findByRole("button", { name: "Tomorrow 09:00" }));
    // today in WIB is the 7th, so tomorrow is the 8th
    expect(onChange).toHaveBeenLastCalledWith("2026-11-08T09:00");
    await waitFor(() => expect(screen.queryByRole("grid")).toBeNull());
  });

  it("'In 1h' is one hour from now, on the hour, in WIB", async () => {
    const onChange = vi.fn();
    render(<Timed onChange={onChange} />);
    await user().click(screen.getByRole("button", { name: /Nov 10/ }));
    await user().click(await screen.findByRole("button", { name: "In 1h" }));
    // 20:00 UTC + 1h = 21:00 UTC = 04:00 WIB on the 7th
    expect(onChange).toHaveBeenLastCalledWith("2026-11-07T04:00");
  });

  it("'Next Mon' is the next Monday after the WIB today (a Saturday)", async () => {
    const onChange = vi.fn();
    render(<Timed onChange={onChange} />);
    await user().click(screen.getByRole("button", { name: /Nov 10/ }));
    await user().click(await screen.findByRole("button", { name: "Next Mon" }));
    // 2026-11-07 is a Saturday, so the next Monday is the 9th
    expect(onChange).toHaveBeenLastCalledWith("2026-11-09T09:00");
  });

  it("opens above by default and below on request", async () => {
    const { unmount } = render(<Timed />);
    await user().click(screen.getByRole("button", { name: /Nov 10/ }));
    await screen.findByRole("grid");
    expect(document.querySelector("[data-slot=popover-content]")!.getAttribute("data-side")).toBe("top");
    unmount();
    render(<Timed direction="down" />);
    await user().click(screen.getByRole("button", { name: /Nov 10/ }));
    await screen.findByRole("grid");
    expect(document.querySelector("[data-slot=popover-content]")!.getAttribute("data-side")).toBe("bottom");
  });

  it("works inside a dialog without closing it (the case the old picker broke)", async () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Edit post</DialogTitle>
          <DialogDescription>Change when it posts</DialogDescription>
          <Timed />
        </DialogContent>
      </Dialog>
    );
    await user().click(await screen.findByRole("button", { name: /Nov 10/ }));
    await user().click(await screen.findByRole("button", { name: "Hour 18" }));
    expect(screen.queryByRole("dialog", { name: "Edit post" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Hour 18" }).getAttribute("aria-pressed")).toBe("true");
  });
});

function Repeat({ initial = "" as "" | "daily" | "weekly" | "monthly", onInterval, onEnds }: { initial?: "" | "daily" | "weekly" | "monthly"; onInterval?: (v: string) => void; onEnds?: (v: string) => void }) {
  const [v, setV] = useState(initial);
  const [ends, setEnds] = useState("2026-12-01");
  return <RepeatPicker value={v} endsAt={ends} onChangeInterval={(x) => { setV(x); onInterval?.(x); }} onChangeEndsAt={(x) => { setEnds(x); onEnds?.(x); }} />;
}

describe("RepeatPicker", () => {
  it("starts as 'Repeat Post…' with no end date", () => {
    render(<Repeat />);
    expect(screen.getByRole("combobox", { name: "Repeat" }).textContent).toContain("Repeat Post…");
    expect(screen.queryByText("until")).toBeNull();
  });

  it("choosing an interval shows it, asks for an end date and clears the old end date", async () => {
    const onInterval = vi.fn();
    const onEnds = vi.fn();
    render(<Repeat onInterval={onInterval} onEnds={onEnds} />);
    await user().click(screen.getByRole("combobox", { name: "Repeat" }));
    await user().click(await screen.findByRole("option", { name: "Every Week" }));
    expect(onInterval).toHaveBeenCalledWith("weekly");
    expect(onEnds).toHaveBeenCalledWith("");
    expect(screen.getByRole("combobox", { name: "Repeat" }).textContent).toContain("Every Week");
    expect(screen.getByText("until")).toBeTruthy();
  });

  it("'Do Not Repeat' sets the interval back to empty and hides the end date", async () => {
    const onInterval = vi.fn();
    render(<Repeat initial="daily" onInterval={onInterval} />);
    expect(screen.getByText("until")).toBeTruthy();
    await user().click(screen.getByRole("combobox", { name: "Repeat" }));
    await user().click(await screen.findByRole("option", { name: "Do Not Repeat" }));
    expect(onInterval).toHaveBeenLastCalledWith("");
    expect(screen.queryByText("until")).toBeNull();
    expect(screen.getByRole("combobox", { name: "Repeat" }).textContent).toContain("Repeat Post…");
  });

  it("the end date picker will not take a day before the first repeat", async () => {
    render(<Repeat initial="weekly" />);
    await user().click(screen.getByRole("button", { name: dayLabel(2026, 12, 1) }));
    // it opens on December (the current end date); go back to November
    await user().click(await screen.findByRole("button", { name: /previous month/i }));
    // weekly: the earliest end is 7 days after the WIB today (Nov 7), so Nov 13 is out and Nov 14 is in
    expect(((await screen.findByRole("button", { name: /November 13th, 2026/ })) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /November 14th, 2026/ }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("TimeInput24", () => {
  it("shows hour and minute as 24-hour selects", () => {
    render(<TimeInput24 value="09:05" onChange={() => {}} />);
    expect((screen.getByLabelText("Hour") as HTMLSelectElement).value).toBe("09");
    expect((screen.getByLabelText("Minute") as HTMLSelectElement).value).toBe("05");
    expect(within(screen.getByLabelText("Hour")).getAllByRole("option").length).toBe(24);
    expect(within(screen.getByLabelText("Minute")).getAllByRole("option").length).toBe(60);
  });

  it("changing the hour keeps the minute, and the other way round", async () => {
    const onChange = vi.fn();
    render(<TimeInput24 value="09:05" onChange={onChange} />);
    await user().selectOptions(screen.getByLabelText("Hour"), "17");
    expect(onChange).toHaveBeenLastCalledWith("17:05");
    await user().selectOptions(screen.getByLabelText("Minute"), "45");
    expect(onChange).toHaveBeenLastCalledWith("09:45");
  });

  it("they are real selects, so a phone shows its own picker", () => {
    render(<TimeInput24 value="09:00" onChange={() => {}} />);
    expect(screen.getByLabelText("Hour").tagName).toBe("SELECT");
  });
});
