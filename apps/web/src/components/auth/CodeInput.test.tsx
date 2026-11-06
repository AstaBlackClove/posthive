// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { CodeInput } from "./CodeInput";

afterEach(cleanup);

function Harness({ onComplete = vi.fn(), initial = "" }: { onComplete?: (v: string) => void; initial?: string }) {
  const [v, setV] = useState(initial);
  return <CodeInput value={v} onChange={setV} onComplete={onComplete} autoFocus />;
}

const boxes = () => screen.getAllByRole("textbox") as HTMLInputElement[];
const values = () => boxes().map((b) => b.value).join("");

describe("CodeInput", () => {
  it("renders six boxes and focuses the first", () => {
    render(<Harness />);
    expect(boxes()).toHaveLength(6);
    expect(document.activeElement).toBe(boxes()[0]);
    expect(boxes()[0].getAttribute("autocomplete")).toBe("one-time-code");
  });

  it("moves forward while typing and fires onComplete on the last digit", async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(<Harness onComplete={onComplete} />);
    await user.keyboard("4821");
    expect(values()).toBe("4821");
    expect(document.activeElement).toBe(boxes()[4]);
    expect(onComplete).not.toHaveBeenCalled();
    await user.keyboard("93");
    expect(onComplete).toHaveBeenCalledWith("482193");
  });

  it("ignores letters and symbols", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.keyboard("4a8-2 ");
    expect(values()).toBe("482");
  });

  it("fills every box from a paste, dropping non-digits", async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(<Harness onComplete={onComplete} />);
    await user.click(boxes()[0]);
    await user.paste("482-913");
    expect(values()).toBe("482913");
    expect(onComplete).toHaveBeenCalledWith("482913");
  });

  it("caps a long paste at six digits", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(boxes()[0]);
    await user.paste("1234567890");
    expect(values()).toBe("123456");
  });

  it("Backspace clears the previous digit and steps back", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.keyboard("482");
    await user.keyboard("{Backspace}");
    expect(values()).toBe("48");
    expect(document.activeElement).toBe(boxes()[2]);
    await user.keyboard("{Backspace}");
    expect(values()).toBe("4");
  });

  it("does not let focus jump past the first empty box", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.keyboard("48");
    await user.click(boxes()[5]);
    expect(document.activeElement).toBe(boxes()[2]);
  });

  it("is read-only, not disabled, while busy", () => {
    render(<CodeInput value="12" onChange={() => {}} busy />);
    for (const b of boxes()) {
      expect(b.readOnly).toBe(true);
      expect(b.disabled).toBe(false);
    }
  });

  it("marks the boxes invalid", () => {
    render(<CodeInput value="" onChange={() => {}} invalid describedBy="err" />);
    for (const b of boxes()) {
      expect(b.getAttribute("aria-invalid")).toBe("true");
      expect(b.getAttribute("aria-describedby")).toBe("err");
    }
  });
});
