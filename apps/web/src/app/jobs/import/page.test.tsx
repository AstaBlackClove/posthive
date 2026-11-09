// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ServerRow } from "@/lib/importReview";

const h = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock("@/lib/api", () => ({ apiFetch: h.apiFetch }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: { name: "Putri Anggraini", avatarUrl: null } }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

import ImportPlanPage from "./page";

afterEach(cleanup);

const row = (n: number, patch: Partial<ServerRow> = {}, fields: Partial<ServerRow["fields"]> = {}): ServerRow => ({
  sourceRow: n,
  status: "valid",
  fields: { title: `Post ${n}`, postDate: "2099-03-10", platforms: ["linkedin"], category: "Case Study", caption: "c", ...fields },
  errors: [],
  warnings: [],
  duplicateReason: null,
  duplicateKind: null,
  details: {},
  ...patch,
});

const columns = [
  { index: 0, label: "Content Title", sample: "Post 1", field: "title" },
  { index: 1, label: "Post Date", sample: "10-03-2099", field: "postDate" },
  { index: 2, label: "Platform", sample: "LinkedIn", field: "platform" },
  { index: 3, label: "Notes", sample: "warm", field: null },
];

const previewOf = (rows: ServerRow[], extra: Record<string, unknown> = {}) => ({
  file: { name: "plan.csv", format: "csv", sheetName: null, headerRow: 1 },
  columns,
  missingFields: [],
  summary: { totalRows: rows.length },
  rows,
  accountCount: { linkedin: 1, instagram: 1 },
  ...extra,
});

const withProblems = [
  row(2, {}, { title: "Fine post" }),
  row(3, { status: "invalid", errors: [{ field: "postDate", message: "x" }], details: { rawPostDate: "31/11/2026" } }, { title: "Client Story", postDate: "" }),
  row(4, { status: "duplicate", duplicateReason: "Already imported into this workspace.", duplicateKind: "workspace" }, { title: "Old post" }),
];

const csv = () => new File(["Content Title,Post Date,Platform\nA,10-03-2099,LinkedIn"], "plan.csv", { type: "text/csv" });

async function upload(file: File = csv()) {
  await userEvent.upload(screen.getByLabelText("Choose a CSV or XLSX file"), file);
}

const calls = (path: string) => h.apiFetch.mock.calls.filter((c) => c[0] === path);
const bodyOf = (call: unknown[]) => (call[1] as { body: FormData }).body;

beforeEach(() => {
  h.apiFetch.mockReset();
});

describe("import plan: upload", () => {
  it("starts empty: the first step, no file, Continue waits", () => {
    render(<ImportPlanPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Import marketing plan" })).toBeTruthy();
    expect(screen.getByText("No file selected yet")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("link", { name: "Back to dashboard" }).getAttribute("href")).toBe("/dashboard");
    expect(screen.getByRole("navigation", { name: "breadcrumb" }).textContent).toContain("Import quarter plan");
    expect(screen.getByRole("listitem", { current: "step" }).textContent).toContain("Upload file");
  });

  it("sends the file to the preview and shows its card", async () => {
    h.apiFetch.mockResolvedValue(previewOf(withProblems));
    render(<ImportPlanPage />);
    await upload();
    expect(await screen.findByText("Ready to map")).toBeTruthy();
    expect(calls("/jobs/import/preview")).toHaveLength(1);
    expect(bodyOf(calls("/jobs/import/preview")[0]).get("mapping")).toBeNull();
    expect((bodyOf(calls("/jobs/import/preview")[0]).get("file") as File).name).toBe("plan.csv");
    expect(screen.getByText(/3 rows detected · 4 columns · Header on row 1/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("refuses a file of the wrong type without asking the server", async () => {
    render(<ImportPlanPage />);
    await userEvent.upload(screen.getByLabelText("Choose a CSV or XLSX file"), new File(["x"], "plan.txt"), { applyAccept: false });
    expect(await screen.findByText("The file must be .csv or .xlsx.")).toBeTruthy();
    expect(h.apiFetch).not.toHaveBeenCalled();
  });

  it("shows the server's reason when it cannot read the file, and stays on the first step", async () => {
    h.apiFetch.mockRejectedValue(Object.assign(new Error("The CSV file must be UTF-8 encoded."), { status: 400 }));
    render(<ImportPlanPage />);
    await upload();
    expect(await screen.findByText("The CSV file must be UTF-8 encoded.")).toBeTruthy();
    expect(screen.queryByText("Ready to map")).toBeNull();
    expect((screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("Remove puts the page back to the start", async () => {
    h.apiFetch.mockResolvedValue(previewOf(withProblems));
    render(<ImportPlanPage />);
    await upload();
    await userEvent.click(await screen.findByRole("button", { name: "Remove" }));
    expect(screen.getByText("No file selected yet")).toBeTruthy();
  });
});

describe("import plan: map columns", () => {
  async function toMapping(rows = withProblems, extra: Record<string, unknown> = {}) {
    h.apiFetch.mockResolvedValue(previewOf(rows, extra));
    render(<ImportPlanPage />);
    await upload();
    await userEvent.click(await screen.findByRole("button", { name: "Continue" }));
  }

  it("shows the columns of the file and the step heading", async () => {
    await toMapping();
    expect(screen.getByRole("heading", { level: 1, name: "Map your columns" })).toBeTruthy();
    expect(screen.getByRole("listitem", { current: "step" }).textContent).toContain("Map columns");
    expect(screen.getByRole("combobox", { name: "Content Title" })).toBeTruthy();
    expect(screen.getByText("Step 2 of 4 · 3 of 4 columns mapped · 3/3 required fields")).toBeTruthy();
  });

  it("Continue with an untouched mapping goes on without asking the server again", async () => {
    await toMapping();
    await userEvent.click(screen.getByRole("button", { name: /Continue to preview/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "Review & fix your rows" })).toBeTruthy();
    expect(calls("/jobs/import/preview")).toHaveLength(1);
  });

  it("changing the mapping reads the file again with the whole mapping", async () => {
    await toMapping();
    await userEvent.click(screen.getByRole("combobox", { name: "Notes" }));
    await userEvent.click(await screen.findByRole("option", { name: "Caption" }));
    await userEvent.click(screen.getByRole("button", { name: /Continue to preview/ }));
    await screen.findByRole("heading", { level: 1, name: "Review & fix your rows" });
    const second = calls("/jobs/import/preview")[1];
    expect(JSON.parse(bodyOf(second).get("mapping") as string)).toEqual({ 0: "title", 1: "postDate", 2: "platform", 3: "caption" });
  });

  it("will not go on while a required field has no column", async () => {
    await toMapping(withProblems, { columns: columns.map((c) => (c.index === 1 ? { ...c, field: null } : c)), missingFields: ["postDate"], rows: [] });
    expect((screen.getByRole("button", { name: /Continue to preview/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain("Choose a column for Publish date");
  });

  it("a mapping the server refuses is shown, and the user stays on this step", async () => {
    await toMapping();
    h.apiFetch.mockRejectedValueOnce(Object.assign(new Error('"title" is mapped to more than one column.'), { status: 400 }));
    await userEvent.click(screen.getByRole("combobox", { name: "Notes" }));
    await userEvent.click(await screen.findByRole("option", { name: "Caption" }));
    await userEvent.click(screen.getByRole("button", { name: /Continue to preview/ }));
    expect(await screen.findByText('"title" is mapped to more than one column.')).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Map your columns" })).toBeTruthy();
  });

  it("Back returns to the upload step with the file still there", async () => {
    await toMapping();
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { level: 1, name: "Import marketing plan" })).toBeTruthy();
    expect(screen.getByText("Ready to map")).toBeTruthy();
  });
});

describe("import plan: review, fix and confirm", () => {
  async function toReview(rows = withProblems) {
    h.apiFetch.mockResolvedValue(previewOf(rows));
    render(<ImportPlanPage />);
    await upload();
    await userEvent.click(await screen.findByRole("button", { name: "Continue" }));
    await userEvent.click(screen.getByRole("button", { name: /Continue to preview/ }));
    await screen.findByRole("heading", { level: 1, name: "Review & fix your rows" });
  }

  it("counts the rows and offers to fix the one that needs it", async () => {
    await toReview();
    expect(screen.getByText("Valid records").previousElementSibling!.textContent).toBe("1");
    expect(screen.getByText("Records requiring attention").previousElementSibling!.textContent).toBe("1");
    expect(screen.getByText("Excluded records").previousElementSibling!.textContent).toBe("1");
    expect(screen.getByRole("button", { name: "Fix 1 record" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Confirm import/ })).toBeNull();
    expect(screen.getByText(/1 ready · 1 need attention · 1 excluded/)).toBeTruthy();
  });

  it("the Fix button of a row opens the dialog for that row, and a suggested date fixes it", async () => {
    await toReview();
    await userEvent.click(screen.getByRole("button", { name: "Fix row 3" }));
    const dialog = screen.getByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "30 Nov 2026" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save fixes" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText("Valid · Fixed")).toBeTruthy();
    expect(screen.getByText("Valid records").previousElementSibling!.textContent).toBe("2");
    expect(screen.getByText("Records requiring attention").previousElementSibling!.textContent).toBe("0");
    expect(screen.getByText(/All records are ready to import/)).toBeTruthy();
    expect(screen.getByText(/You fixed 1 record\./)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm import (2)" })).toBeTruthy();
  });

  it("the main button fixes every row that needs it", async () => {
    await toReview();
    await userEvent.click(screen.getByRole("button", { name: "Fix 1 record" }));
    expect(within(screen.getByRole("dialog")).getByText("Fix records · 1 of 3 rows")).toBeTruthy();
  });

  it("excluding the row that needs attention is enough to import the rest", async () => {
    await toReview();
    await userEvent.click(screen.getByRole("button", { name: "Fix row 3" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Exclude row" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save fixes" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("button", { name: "Confirm import (1)" })).toBeTruthy();
  });

  it("an excluded row can be included again, and then it needs the same fix as before", async () => {
    await toReview();
    await userEvent.click(screen.getByRole("button", { name: "Include row 4" }));
    expect(screen.getByRole("button", { name: "Fix row 4" })).toBeTruthy();
    expect(screen.getByText("Already imported into this workspace")).toBeTruthy();
  });

  async function fixAndConfirm() {
    await userEvent.click(screen.getByRole("button", { name: "Fix row 3" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "30 Nov 2026" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save fixes" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await userEvent.click(screen.getByRole("button", { name: "Confirm import (2)" }));
  }

  it("confirming sends the rows kept and only what was changed, then shows the result", async () => {
    await toReview();
    h.apiFetch.mockResolvedValueOnce({ summary: { totalRows: 3, created: 2 }, jobs: [] });
    await fixAndConfirm();
    expect(await screen.findByRole("heading", { level: 1, name: "Import complete" })).toBeTruthy();
    const commit = calls("/jobs/import/commit")[0];
    const body = bodyOf(commit);
    expect(JSON.parse(body.get("include") as string)).toEqual([2, 3]);
    expect(JSON.parse(body.get("edits") as string)).toEqual({ 3: { postDate: "2026-11-30" } });
    expect(body.get("mapping")).toBeNull();
    expect(screen.getByRole("heading", { name: "Your marketing plan has been imported" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "View imported content" }).getAttribute("href")).toBe("/jobs");
    expect(screen.getByRole("link", { name: "Go to dashboard" }).getAttribute("href")).toBe("/dashboard");
    expect(screen.getByText(/Imported .* by Putri Anggraini/)).toBeTruthy();
  });

  it("commits with the mapping the rows were read with", async () => {
    await toReview();
    await userEvent.click(screen.getByRole("button", { name: "Edit mapping" }));
    await userEvent.click(screen.getByRole("combobox", { name: "Notes" }));
    await userEvent.click(await screen.findByRole("option", { name: "Caption" }));
    await userEvent.click(screen.getByRole("button", { name: /Continue to preview/ }));
    await screen.findByRole("heading", { level: 1, name: "Review & fix your rows" });
    await userEvent.click(screen.getByRole("button", { name: "Fix row 3" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "30 Nov 2026" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save fixes" }));
    h.apiFetch.mockResolvedValueOnce({ summary: { totalRows: 3, created: 2 }, jobs: [] });
    await userEvent.click(await screen.findByRole("button", { name: "Confirm import (2)" }));
    await screen.findByRole("heading", { level: 1, name: "Import complete" });
    expect(JSON.parse(bodyOf(calls("/jobs/import/commit")[0]).get("mapping") as string)).toEqual({ 0: "title", 1: "postDate", 2: "platform", 3: "caption" });
  });

  it("when the server refuses, nothing is lost: the rows it named are marked and the page stays", async () => {
    await toReview();
    h.apiFetch.mockRejectedValueOnce(
      Object.assign(new Error("Some rows aren't valid yet. Nothing was saved."), {
        status: 422,
        data: { rows: [{ sourceRow: 2, errors: [{ field: "title", message: "Already imported into this workspace." }] }] },
      })
    );
    await fixAndConfirm();
    expect(await screen.findByText(/Some rows aren't valid yet\. Nothing was saved\. Check the 1 row marked below\./)).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Review & fix your rows" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Fix row 2" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Fix 1 record/ })).toBeTruthy();
  });

  it("an error with no rows is shown as it is", async () => {
    await toReview();
    h.apiFetch.mockRejectedValueOnce(new Error("Network down"));
    await fixAndConfirm();
    expect(await screen.findByText("Network down")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm import (2)" })).toBeTruthy();
  });

  it("the import cannot be started twice while it is saving", async () => {
    await toReview();
    let finish: (v: unknown) => void = () => {};
    h.apiFetch.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    await fixAndConfirm();
    expect(await screen.findByText("Importing…")).toBeTruthy();
    expect(calls("/jobs/import/commit")).toHaveLength(1);
    finish({ summary: { totalRows: 3, created: 2 }, jobs: [] });
    await screen.findByRole("heading", { level: 1, name: "Import complete" });
  });

  it("Import another plan starts again from the first step", async () => {
    await toReview();
    h.apiFetch.mockResolvedValueOnce({ summary: { totalRows: 3, created: 2 }, jobs: [] });
    await fixAndConfirm();
    await userEvent.click(await screen.findByRole("button", { name: "Import another plan" }));
    expect(screen.getByRole("heading", { level: 1, name: "Import marketing plan" })).toBeTruthy();
    expect(screen.getByText("No file selected yet")).toBeTruthy();
  });
});
