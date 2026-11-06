// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { PasswordInput } from "./PasswordInput";

afterEach(cleanup);

function field() {
  return screen.getByLabelText("Password", { selector: "input" }) as HTMLInputElement;
}

function Harness({ onSubmit = vi.fn() }: { onSubmit?: () => void }) {
  const [v, setV] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <label htmlFor="pw">Password</label>
      <PasswordInput id="pw" autoComplete="current-password" value={v} onChange={(e) => setV(e.target.value)} />
      <button type="submit">Go</button>
    </form>
  );
}

describe("PasswordInput", () => {
  it("is hidden by default", () => {
    render(<Harness />);
    expect(field().type).toBe("password");
  });

  it("toggles to text and back on click", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(field().type).toBe("text");
    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(field().type).toBe("password");
  });

  it("does not submit the form when toggled", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("toggle is a type=button and reflects state in aria-pressed-free label", () => {
    render(<Harness />);
    const btn = screen.getByRole("button", { name: "Show password" });
    expect(btn.getAttribute("type")).toBe("button");
    expect(btn.getAttribute("aria-controls")).toBe("pw");
  });

  it("works with the keyboard (Tab, Enter, Space)", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(field());
    await user.tab();
    const btn = screen.getByRole("button", { name: "Show password" });
    expect(document.activeElement).toBe(btn);
    await user.keyboard("{Enter}");
    expect(field().type).toBe("text");
    await user.keyboard(" ");
    expect(field().type).toBe("password");
  });

  it("keeps the typed value when toggling", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(field(), "hunter22");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(field().value).toBe("hunter22");
    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(field().value).toBe("hunter22");
  });

  it("keeps focus and caret in the input after a mouse toggle", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(field(), "abcdef");
    field().setSelectionRange(2, 2);
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(document.activeElement).toBe(field());
    expect(field().selectionStart).toBe(2);
  });

  it("passes autocomplete, aria-invalid and className through", () => {
    render(<PasswordInput id="x" autoComplete="new-password" aria-invalid className="border-red-300" aria-label="pw" />);
    const input = screen.getByLabelText("pw") as HTMLInputElement;
    expect(input.getAttribute("autocomplete")).toBe("new-password");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.className).toContain("border-red-300");
    expect(input.className).toContain("field");
  });

  it("disables the toggle together with the input", () => {
    render(<PasswordInput id="x" autoComplete="off" disabled aria-label="pw" />);
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
  });

  it("line variant uses the underline field and a Show/Hide text toggle", async () => {
    const user = userEvent.setup();
    render(<PasswordInput id="l" autoComplete="current-password" variant="line" aria-label="pw" />);
    const input = screen.getByLabelText("pw") as HTMLInputElement;
    expect(input.className).toContain("field-line");
    expect(input.className).not.toMatch(/(^|\s)field(\s|$)/);

    const btn = screen.getByRole("button", { name: "Show password" });
    expect(btn.textContent).toBe("Show");
    await user.click(btn);
    expect(input.type).toBe("text");
    const hide = screen.getByRole("button", { name: "Hide password" });
    expect(hide.textContent).toBe("Hide");
    expect(hide.querySelector("svg")).toBeNull();
  });

  it("box variant stays the default and keeps the eye icon", () => {
    render(<PasswordInput id="b" autoComplete="off" aria-label="pw" />);
    const input = screen.getByLabelText("pw") as HTMLInputElement;
    expect(input.className).toMatch(/(^|\s)field(\s|$)/);
    expect(input.className).not.toContain("field-line");
    expect(screen.getByRole("button").querySelector("svg")).not.toBeNull();
  });

  it("works uncontrolled", async () => {
    const user = userEvent.setup();
    render(<PasswordInput id="u" autoComplete="off" aria-label="pw" />);
    const input = screen.getByLabelText("pw") as HTMLInputElement;
    await user.type(input, "secret");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(input.value).toBe("secret");
    expect(input.type).toBe("text");
  });
});
