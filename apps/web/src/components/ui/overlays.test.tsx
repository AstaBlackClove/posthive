// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "./sheet";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "./command";

afterEach(cleanup);

function TestDialog({ onClose }: { onClose?: () => void }) {
  return (
    <Dialog onOpenChange={(o) => !o && onClose?.()}>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Edit post</DialogTitle>
        <DialogDescription>Change the text</DialogDescription>
        <input aria-label="first" />
        <input aria-label="second" />
      </DialogContent>
    </Dialog>
  );
}

describe("Dialog", () => {
  it("opens as a labelled modal dialog", async () => {
    render(<TestDialog />);
    expect(screen.queryByRole("dialog")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit post" });
    expect(dialog.getAttribute("aria-describedby")).toBeTruthy();
  });

  it("closes on Escape and gives focus back to the trigger", async () => {
    const onClose = vi.fn();
    render(<TestDialog onClose={onClose} />);
    const trigger = screen.getByRole("button", { name: "Open" });
    await userEvent.click(trigger);
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onClose).toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
  });

  it("keeps Tab inside the dialog", async () => {
    render(
      <>
        <button>outside</button>
        <TestDialog />
      </>
    );
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = await screen.findByRole("dialog");
    for (let i = 0; i < 8; i++) {
      await userEvent.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it("closes with its close button", async () => {
    render(<TestDialog />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await userEvent.click(await screen.findByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("sits above the old hand-built dialogs through the --z-overlay variable", async () => {
    render(<TestDialog />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.className).toContain("z-(--z-overlay)");
    expect(dialog.className).toContain("rounded-2xl");
  });
});

function TestConfirm({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button>Delete</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>Delete this post?</AlertDialogTitle>
        <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete post
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

describe("AlertDialog", () => {
  it("is an alertdialog that confirms through the action only", async () => {
    const onConfirm = vi.fn();
    render(<TestConfirm onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await screen.findByRole("alertdialog", { name: "Delete this post?" });
    await userEvent.click(screen.getByRole("button", { name: "Delete post" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("Cancel and Escape do not confirm", async () => {
    const onConfirm = vi.fn();
    render(<TestConfirm onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await screen.findByRole("alertdialog");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await screen.findByRole("alertdialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("the action uses the destructive button look", async () => {
    render(<TestConfirm onConfirm={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    const action = await screen.findByRole("button", { name: "Delete post" });
    expect(action.className).toContain("bg-destructive");
  });

  it("is not closed by a click on the backdrop", async () => {
    render(<TestConfirm onConfirm={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await screen.findByRole("alertdialog");
    const overlay = document.querySelector<HTMLElement>("[data-slot=alert-dialog-overlay]")!;
    await userEvent.click(overlay);
    expect(screen.queryByRole("alertdialog")).not.toBeNull();
  });
});

describe("Sheet", () => {
  it("opens from the left and closes on Escape", async () => {
    render(
      <Sheet>
        <SheetTrigger asChild>
          <Button>Menu</Button>
        </SheetTrigger>
        <SheetContent side="left">
          <SheetTitle>Navigation</SheetTitle>
          <SheetDescription>Pages</SheetDescription>
        </SheetContent>
      </Sheet>
    );
    await userEvent.click(screen.getByRole("button", { name: "Menu" }));
    const sheet = await screen.findByRole("dialog", { name: "Navigation" });
    expect(sheet.className).toContain("left-0");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("Popover", () => {
  it("opens on click, closes on Escape, and is layered above dialogs", async () => {
    render(
      <Popover>
        <PopoverTrigger asChild>
          <Button>Pick</Button>
        </PopoverTrigger>
        <PopoverContent>Calendar here</PopoverContent>
      </Popover>
    );
    const trigger = screen.getByRole("button", { name: "Pick" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    await userEvent.click(trigger);
    const content = await screen.findByText("Calendar here");
    expect(content.className).toContain("z-(--z-popover)");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByText("Calendar here")).toBeNull());
  });

  it("works inside a dialog without closing it", async () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Schedule</DialogTitle>
          <DialogDescription>When to post</DialogDescription>
          <Popover>
            <PopoverTrigger asChild>
              <Button>Date</Button>
            </PopoverTrigger>
            <PopoverContent>Day grid</PopoverContent>
          </Popover>
        </DialogContent>
      </Dialog>
    );
    await userEvent.click(await screen.findByRole("button", { name: "Date" }));
    await screen.findByText("Day grid");
    await userEvent.click(screen.getByText("Day grid"));
    expect(screen.queryByRole("dialog", { name: "Schedule" })).not.toBeNull();
    expect(screen.queryByText("Day grid")).not.toBeNull();
  });
});

describe("Tooltip", () => {
  it("shows on keyboard focus, which title= never does", async () => {
    render(
      <Tooltip>
        <TooltipTrigger asChild>
          <Button aria-label="Delete post" size="icon-sm">x</Button>
        </TooltipTrigger>
        <TooltipContent>Delete post</TooltipContent>
      </Tooltip>
    );
    expect(screen.queryByRole("tooltip")).toBeNull();
    await userEvent.tab();
    expect((await screen.findByRole("tooltip")).textContent).toContain("Delete post");
  });
});

describe("DropdownMenu", () => {
  it("opens with the keyboard and runs the chosen item", async () => {
    const onSelect = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>AI</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onSelect}>Rewrite</DropdownMenuItem>
          <DropdownMenuItem variant="destructive">Clear</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    screen.getByRole("button", { name: "AI" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByRole("menu")).toBeTruthy();
    // opening with the keyboard focuses the first item ("Rewrite"), so Enter picks it
    await waitFor(() => expect(document.activeElement?.textContent).toBe("Rewrite"));
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });

  it("styles items with neutral hover, not the yellow accent", async () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger asChild>
          <Button>Menu</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>One</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    const item = await screen.findByRole("menuitem", { name: "One" });
    expect(item.className).toContain("focus:bg-neutral-100");
    expect(item.className).not.toContain("bg-accent");
  });
});

describe("Select", () => {
  it("shows the placeholder, then the chosen option", async () => {
    const onValueChange = vi.fn();
    render(
      <Select onValueChange={onValueChange}>
        <SelectTrigger aria-label="Channel">
          <SelectValue placeholder="Pick a channel" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="general">general</SelectItem>
          <SelectItem value="news">news</SelectItem>
        </SelectContent>
      </Select>
    );
    const trigger = screen.getByRole("combobox", { name: "Channel" });
    expect(trigger.textContent).toContain("Pick a channel");
    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole("option", { name: "news" }));
    expect(onValueChange).toHaveBeenCalledWith("news");
    expect(screen.getByRole("combobox", { name: "Channel" }).textContent).toContain("news");
  });

  it("the trigger is as wide as a field", () => {
    render(
      <Select>
        <SelectTrigger aria-label="A">
          <SelectValue placeholder="x" />
        </SelectTrigger>
        <SelectContent />
      </Select>
    );
    expect(screen.getByRole("combobox").className).toContain("w-full");
  });
});

describe("Command", () => {
  it("filters as you type and shows the empty message", async () => {
    render(
      <Command>
        <CommandInput placeholder="Search timezone" />
        <CommandList>
          <CommandEmpty>No timezone found</CommandEmpty>
          <CommandItem value="Asia/Jakarta">Asia/Jakarta</CommandItem>
          <CommandItem value="Europe/Paris">Europe/Paris</CommandItem>
        </CommandList>
      </Command>
    );
    await userEvent.type(screen.getByPlaceholderText("Search timezone"), "jak");
    expect(screen.queryByText("Asia/Jakarta")).not.toBeNull();
    expect(screen.queryByText("Europe/Paris")).toBeNull();
    await userEvent.clear(screen.getByPlaceholderText("Search timezone"));
    await userEvent.type(screen.getByPlaceholderText("Search timezone"), "zzz");
    expect(screen.queryByText("No timezone found")).not.toBeNull();
  });
});
