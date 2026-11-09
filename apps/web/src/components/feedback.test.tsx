// @vitest-environment jsdom
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast as sonner } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { useToast } from "./Toast";
import { InlineAlert } from "./InlineAlert";
import { Spinner } from "./Spinner";
import { EmptyState } from "./EmptyState";
import { ConfirmDialog } from "./ConfirmDialog";
import { Button } from "@/components/ui/button";

afterEach(() => {
  cleanup();
  sonner.dismiss();
});

describe("useToast (sonner adapter)", () => {
  function Buttons() {
    const t = useToast();
    return (
      <>
        <button onClick={() => t.success("Post deleted.")}>ok</button>
        <button onClick={() => t.error("Token expired")}>fail</button>
        <button onClick={() => t.warning("Trial ends soon")}>warn</button>
        <button onClick={() => t.toast("FYI")}>info</button>
        <button onClick={() => t.toast("Custom", "success", 1234)}>custom</button>
      </>
    );
  }

  it("keeps the API pages use: toast, success, error, warning", () => {
    let api!: ReturnType<typeof useToast>;
    function Probe() { api = useToast(); return null; }
    render(<Probe />);
    expect(Object.keys(api).sort()).toEqual(["error", "success", "toast", "warning"]);
  });

  it("returns the same object on every render, so it is safe in an effect's dependency list", () => {
    const seen: unknown[] = [];
    let effectRuns = 0;
    function Probe() {
      const t = useToast();
      seen.push(t);
      useEffect(() => { effectRuns += 1; }, [t]);
      return null;
    }
    const { rerender } = render(<Probe />);
    rerender(<Probe />);
    rerender(<Probe />);
    expect(new Set(seen).size).toBe(1);
    expect(effectRuns).toBe(1);
  });

  it("works without a provider", () => {
    expect(() => render(<Buttons />)).not.toThrow();
  });

  it("shows a success toast with its message and tone", async () => {
    render(<><Toaster /><Buttons /></>);
    await userEvent.click(screen.getByText("ok"));
    const card = await screen.findByText("Post deleted.");
    const box = card.closest("[data-slot=toast]")!;
    expect(box.getAttribute("data-type")).toBe("success");
    expect(box.className).toContain("bg-green-50");
    expect(box.getAttribute("role")).toBe("status");
  });

  it("an error is a red alert, a warning is yellow and also an alert", async () => {
    render(<><Toaster /><Buttons /></>);
    await userEvent.click(screen.getByText("fail"));
    await userEvent.click(screen.getByText("warn"));
    const err = (await screen.findByText("Token expired")).closest("[data-slot=toast]")!;
    const warn = (await screen.findByText("Trial ends soon")).closest("[data-slot=toast]")!;
    expect(err.className).toContain("bg-red-50");
    expect(err.getAttribute("role")).toBe("alert");
    expect(warn.className).toContain("bg-brand-100");
    expect(warn.getAttribute("role")).toBe("alert");
  });

  it("toast(message) defaults to info", async () => {
    render(<><Toaster /><Buttons /></>);
    await userEvent.click(screen.getByText("info"));
    const box = (await screen.findByText("FYI")).closest("[data-slot=toast]")!;
    expect(box.getAttribute("data-type")).toBe("info");
    expect(box.className).toContain("bg-blue-50");
  });

  it("closes with its dismiss button", async () => {
    render(<><Toaster /><Buttons /></>);
    await userEvent.click(screen.getByText("ok"));
    await screen.findByText("Post deleted.");
    await userEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    await waitFor(() => expect(screen.queryByText("Post deleted.")).toBeNull());
  });

  it("uses 4s by default, 6s for an error and the duration it is given", async () => {
    const custom = vi.spyOn(sonner, "custom");
    render(<><Toaster /><Buttons /></>);
    await userEvent.click(screen.getByText("ok"));
    await userEvent.click(screen.getByText("fail"));
    await userEvent.click(screen.getByText("custom"));
    const durations = custom.mock.calls.map((c) => (c[1] as { duration: number }).duration);
    expect(durations).toEqual([4000, 6000, 1234]);
    custom.mockRestore();
  });

  it("stacks several toasts", async () => {
    render(<><Toaster /><Buttons /></>);
    await userEvent.click(screen.getByText("ok"));
    await userEvent.click(screen.getByText("fail"));
    await userEvent.click(screen.getByText("warn"));
    await waitFor(() => expect(document.querySelectorAll("[data-slot=toast]").length).toBe(3));
  });
});

describe("InlineAlert", () => {
  it("interrupts for danger and warning, stays polite for success and info", () => {
    render(
      <>
        <InlineAlert tone="danger">d</InlineAlert>
        <InlineAlert tone="warning">w</InlineAlert>
        <InlineAlert tone="success">s</InlineAlert>
        <InlineAlert tone="info">i</InlineAlert>
      </>
    );
    expect(screen.getByText("d").closest("[role]")!.getAttribute("role")).toBe("alert");
    expect(screen.getByText("w").closest("[role]")!.getAttribute("role")).toBe("alert");
    expect(screen.getByText("s").closest("[role]")!.getAttribute("role")).toBe("status");
    expect(screen.getByText("i").closest("[role]")!.getAttribute("role")).toBe("status");
  });

  it("a role can be chosen: a warning that is just on the page is read politely, a success can interrupt", () => {
    render(
      <>
        <InlineAlert tone="warning" role="status">w</InlineAlert>
        <InlineAlert tone="success" role="alert">s</InlineAlert>
      </>
    );
    expect(screen.getByText("w").closest("[role]")!.getAttribute("role")).toBe("status");
    expect(screen.getByText("w").closest("[data-tone]")!.getAttribute("data-tone")).toBe("warning");
    expect(screen.getByText("s").closest("[role]")!.getAttribute("role")).toBe("alert");
  });

  it("defaults to danger with the CLAUDE.md colours", () => {
    render(<InlineAlert>Wrong password</InlineAlert>);
    const box = screen.getByRole("alert");
    expect(box.className).toContain("bg-red-50");
    expect(box.className).toContain("border-red-200");
    expect(box.className).toContain("text-red-600");
  });

  it("uses the dark palette on the auth panel", () => {
    render(<InlineAlert onDark>Wrong password</InlineAlert>);
    const box = screen.getByRole("alert");
    const classes = box.className.split(/\s+/);
    expect(classes).toContain("bg-red-500/15");
    expect(classes).not.toContain("bg-red-50");
  });

  it("shows a title, a custom id, and can drop the icon", () => {
    const { container } = render(<InlineAlert id="err" title="Could not publish" icon={null}>Token expired</InlineAlert>);
    expect(screen.getByText("Could not publish")).toBeTruthy();
    expect(screen.getByRole("alert").id).toBe("err");
    expect(container.querySelector("svg")).toBeNull();
  });

  it("draws an icon by default, hidden from screen readers", () => {
    const { container } = render(<InlineAlert tone="info">Tip</InlineAlert>);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector("[aria-hidden=true] svg")).not.toBeNull();
  });
});

describe("Spinner and EmptyState", () => {
  it("Spinner is a labelled status in the current colour", () => {
    render(<Spinner size="lg" label="Saving" />);
    const el = screen.getByRole("status", { name: "Saving" });
    expect(el.className).toContain("animate-spin");
    expect(el.className).toContain("border-current");
  });

  it("EmptyState shows icon, title, help and action", () => {
    render(
      <EmptyState
        icon={<svg data-testid="icon" />}
        title="No posts scheduled yet"
        description="Schedule your first post."
        action={<Button>Write a post</Button>}
      />
    );
    expect(screen.getByText("No posts scheduled yet")).toBeTruthy();
    expect(screen.getByText("Schedule your first post.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Write a post" })).toBeTruthy();
    expect(screen.getByTestId("icon").parentElement!.className).toContain("bg-brand-100");
  });

  it("EmptyState works with only a title and has a compact size", () => {
    const { container } = render(<EmptyState title="Nothing here" size="compact" />);
    expect(screen.getByText("Nothing here")).toBeTruthy();
    expect((container.firstChild as HTMLElement).className).toContain("py-10");
  });
});

describe("ConfirmDialog", () => {
  function Host({ onConfirm, ...rest }: { onConfirm: () => void | Promise<void> } & Partial<React.ComponentProps<typeof ConfirmDialog>>) {
    return (
      <ConfirmDialog
        open
        onOpenChange={rest.onOpenChange ?? (() => {})}
        title="Delete this post?"
        description="This cannot be undone."
        confirmLabel="Delete post"
        pendingLabel="Deleting…"
        onConfirm={onConfirm}
        {...rest}
      />
    );
  }

  it("is an alertdialog with the title and description", async () => {
    render(<Host onConfirm={() => {}} />);
    const dialog = await screen.findByRole("alertdialog", { name: "Delete this post?" });
    expect(dialog.getAttribute("aria-describedby")).toBeTruthy();
    expect(screen.getByText("This cannot be undone.")).toBeTruthy();
  });

  it("confirm runs the handler, then closes", async () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(<Host onConfirm={onConfirm} onOpenChange={onOpenChange} />);
    await userEvent.click(await screen.findByRole("button", { name: "Delete post" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("Cancel and Escape close without confirming", async () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(<Host onConfirm={onConfirm} onOpenChange={onOpenChange} />);
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    onOpenChange.mockClear();
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("while it works: pending label, both buttons disabled, cannot be closed, then closes", async () => {
    let finish!: () => void;
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const onOpenChange = vi.fn();
    render(<Host onConfirm={onConfirm} onOpenChange={onOpenChange} />);
    await userEvent.click(await screen.findByRole("button", { name: "Delete post" }));

    const confirm = await screen.findByRole("button", { name: "Deleting…" });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement).disabled).toBe(true);

    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).not.toHaveBeenCalled();

    await act(async () => { finish(); });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("if the handler rejects, the dialog stays open and the button comes back", async () => {
    const onConfirm = vi.fn(() => Promise.reject(new Error("network")));
    const onOpenChange = vi.fn();
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    render(<Host onConfirm={onConfirm} onOpenChange={onOpenChange} />);
    await userEvent.click(await screen.findByRole("button", { name: "Delete post" }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Delete post" }) as HTMLButtonElement).disabled).toBe(false));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    process.off("unhandledRejection", unhandled);
  });

  it("danger is red, default is the yellow button, and extra content shows", async () => {
    const { rerender } = render(<Host onConfirm={() => {}}><p>"Launch teaser"</p></Host>);
    expect((await screen.findByRole("button", { name: "Delete post" })).className).toContain("bg-destructive");
    expect(screen.getByText('"Launch teaser"')).toBeTruthy();
    rerender(<Host onConfirm={() => {}} tone="default" confirmLabel="Leave" />);
    expect(screen.getByRole("button", { name: "Leave" }).className).toContain("bg-primary");
  });
});
