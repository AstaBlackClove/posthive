// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportActionBar } from "./ImportActionBar";
import { ImportStat } from "./ImportStat";
import { ImportStepper } from "./ImportStepper";
import { ImportSuccess } from "./ImportSuccess";
import { MappingStep } from "./MappingStep";
import { ReviewStep } from "./ReviewStep";
import { UploadStep, type UploadedFile } from "./UploadStep";
import { classify, summarizeImport } from "@/lib/import-rows";
import { assignField, type ColumnMapping, type FileColumn } from "@/lib/import-mapping";
import { buildReviewRows, type ReviewFields, type ServerRow } from "@/lib/importReview";

afterEach(cleanup);

const classes = (el: Element) => el.className.split(/\s+/);

describe("ImportStepper", () => {
  it("marks the step you are on, and nothing else", () => {
    render(<ImportStepper current="map" />);
    const steps = screen.getAllByRole("listitem");
    expect(steps).toHaveLength(4);
    expect(steps.map((s) => s.getAttribute("aria-current"))).toEqual([null, "step", null, null]);
  });

  it("says in words what is done and what is current, for screen readers", () => {
    render(<ImportStepper current="review" />);
    expect(screen.getAllByText("(done)")).toHaveLength(2);
    expect(screen.getAllByText("(current)")).toHaveLength(1);
  });

  it("the finished steps are olive and the current one yellow", () => {
    render(<ImportStepper current="review" />);
    const circle = (n: number) => screen.getAllByRole("listitem")[n].querySelector("span")!;
    expect(classes(circle(0))).toContain("bg-neutral-600");
    expect(classes(circle(2))).toContain("bg-brand-500");
    expect(classes(circle(3))).toContain("bg-neutral-100");
  });

  it("on the last step all four are done and none is current", () => {
    render(<ImportStepper current="done" />);
    expect(screen.getAllByText("(done)")).toHaveLength(4);
    expect(screen.getAllByRole("listitem").every((s) => s.getAttribute("aria-current") === null)).toBe(true);
    expect(screen.getByText(/Done · Import/)).toBeTruthy();
  });

  it("a phone gets 'Step 2 of 4'", () => {
    render(<ImportStepper current="map" />);
    expect(screen.getByText("Step 2 of 4 · Map columns")).toBeTruthy();
  });
});

describe("ImportActionBar and ImportStat", () => {
  it("reads its status out and holds the buttons", () => {
    render(<ImportActionBar status="No file selected yet"><button>Continue</button></ImportActionBar>);
    expect(screen.getByRole("status").textContent).toBe("No file selected yet");
    expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();
  });

  it("a stat is a number and its label", () => {
    render(<ImportStat value={26} label="Total records" tone="success" />);
    expect(classes(screen.getByText("26"))).toContain("text-green-700");
    expect(screen.getByText("Total records")).toBeTruthy();
  });
});

describe("UploadStep", () => {
  const file: UploadedFile = { name: "q4-plan.csv", size: 48 * 1024, format: "csv", rows: 26, columns: 9, headerRow: 1, sheetName: null };
  const props = { checking: false, error: null, onFile: vi.fn(), onRemove: vi.fn(), onDismissError: vi.fn() };

  it("without a file: a dropzone, the template twice, the columns we expect, and the note on flexible dates", () => {
    render(<UploadStep {...props} file={null} />);
    expect(screen.getByText("Drag & drop your CSV or XLSX file here")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Download Postly template|Download the Postly template/ })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: /template/ })[0].getAttribute("href")).toBe("/import-plan-template.xlsx");
    const expected = within(screen.getByRole("heading", { name: "Expected columns" }).closest("section")!);
    expect(expected.getByText("Content Title")).toBeTruthy();
    expect(expected.getAllByText("Required")).toHaveLength(3);
    expect(screen.getByText("Dates & channels are flexible")).toBeTruthy();
    // yellow like the design, but a note that is just there is read politely, not announced as an alert
    expect(screen.getByText("Dates & channels are flexible").closest("[data-tone]")!.getAttribute("data-tone")).toBe("warning");
    expect(screen.getByText("Dates & channels are flexible").closest("[role]")!.getAttribute("role")).toBe("status");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("table", { name: "Example plan rows" })).toBeTruthy();
  });

  it("hands the chosen file up, and lets the same file be chosen again", async () => {
    const onFile = vi.fn();
    render(<UploadStep {...props} onFile={onFile} file={null} />);
    const picked = new File(["a,b"], "plan.csv", { type: "text/csv" });
    const input = screen.getByLabelText("Choose a CSV or XLSX file") as HTMLInputElement;
    await userEvent.upload(input, picked);
    expect(onFile).toHaveBeenCalledWith(picked);
    expect(input.value).toBe("");
  });

  it("Browse file opens the picker", async () => {
    render(<UploadStep {...props} file={null} />);
    const input = screen.getByLabelText("Choose a CSV or XLSX file") as HTMLInputElement;
    const click = vi.spyOn(input, "click");
    await userEvent.click(screen.getByRole("button", { name: "Browse file" }));
    expect(click).toHaveBeenCalled();
  });

  it("a dropped file is handed up", () => {
    const onFile = vi.fn();
    render(<UploadStep {...props} onFile={onFile} file={null} />);
    const dropped = new File(["a"], "plan.csv");
    const zone = screen.getByText("Drag & drop your CSV or XLSX file here").closest(".dropzone")!;
    const event = new Event("drop", { bubbles: true, cancelable: true }) as Event & { dataTransfer?: unknown };
    event.dataTransfer = { files: [dropped] };
    zone.dispatchEvent(event);
    expect(onFile).toHaveBeenCalledWith(dropped);
  });

  it("while it checks the file, says so instead of offering the button", () => {
    render(<UploadStep {...props} file={null} checking />);
    expect(screen.getByText("Checking file…")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Browse file" })).toBeNull();
  });

  it("with a file: its name, size, rows, columns and header row, Ready to map, and what was checked", () => {
    render(<UploadStep {...props} file={file} />);
    expect(screen.getByText("q4-plan.csv")).toBeTruthy();
    expect(screen.getByText(/48 KB · 26 rows detected · 9 columns · Header on row 1/)).toBeTruthy();
    expect(screen.getByText("Ready to map")).toBeTruthy();
    const checks = within(screen.getByRole("list", { name: "File checks" })).getAllByRole("listitem").map((li) => li.textContent);
    expect(checks).toEqual(["File type: CSV", "Size under 5 MB", "26 / 1,000 rows", "Encoding UTF-8"]);
    expect(screen.getByRole("progressbar", { name: "Upload progress" })).toBeTruthy();
  });

  it("a workbook shows the sheet instead of the encoding", () => {
    render(<UploadStep {...props} file={{ ...file, name: "plan.xlsx", format: "xlsx", sheetName: "Content Plan" }} />);
    expect(screen.getByText("Sheet: Content Plan")).toBeTruthy();
    expect(screen.queryByText("Encoding UTF-8")).toBeNull();
  });

  it("Replace opens the picker and Remove clears the file", async () => {
    const onRemove = vi.fn();
    render(<UploadStep {...props} onRemove={onRemove} file={file} />);
    const input = screen.getByLabelText("Choose a CSV or XLSX file") as HTMLInputElement;
    const click = vi.spyOn(input, "click");
    await userEvent.click(screen.getByRole("button", { name: "Replace" }));
    expect(click).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onRemove).toHaveBeenCalled();
  });

  it("Replace and Remove wait while the file is checked", () => {
    render(<UploadStep {...props} file={file} checking />);
    expect((screen.getByRole("button", { name: "Replace" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Remove" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows why a file was refused, and can be dismissed", async () => {
    const onDismissError = vi.fn();
    render(<UploadStep {...props} onDismissError={onDismissError} file={null} error="The file must be .csv or .xlsx." />);
    expect(screen.getByRole("alert").textContent).toContain("The file must be .csv or .xlsx.");
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismissError).toHaveBeenCalled();
  });
});

describe("MappingStep", () => {
  const columns: FileColumn[] = [
    { index: 0, label: "Post Title", sample: "5 Habits", field: "title" },
    { index: 1, label: "Platform", sample: "IG", field: "platform" },
    { index: 2, label: "Date", sample: "18/11/2026", field: "postDate" },
    { index: 3, label: "Copy", sample: "Most teams lose hours", field: null },
    { index: 4, label: "Notes", sample: "Use warm photos", field: null },
  ];
  const base = { fileName: "q4.csv", rowCount: 26, rows: [] as ServerRow[], onReplaceFile: vi.fn() };

  it("lists every column with its sample and status", () => {
    render(<MappingStep {...base} columns={columns} overrides={{}} onChange={vi.fn()} />);
    expect(screen.getByText("From q4.csv · 26 rows · 5 columns")).toBeTruthy();
    expect(screen.getByText("Post Title")).toBeTruthy();
    expect(screen.getByText("5 Habits")).toBeTruthy();
    expect(screen.getAllByText("Matched")).toHaveLength(3);
    expect(screen.getAllByText("Needs mapping")).toHaveLength(2);
    expect(screen.getByText("3 matched · 2 need your input · 0 skipped")).toBeTruthy();
    expect(screen.getByText("Required 3/3 mapped")).toBeTruthy();
  });

  it("a column the importer could not place says 'Choose a field'", () => {
    render(<MappingStep {...base} columns={columns} overrides={{}} onChange={vi.fn()} />);
    expect(screen.getByRole("combobox", { name: "Copy" }).textContent).toBe("Choose a field");
    expect(screen.getByRole("combobox", { name: "Post Title" }).textContent).toBe("Content title");
  });

  it("choosing a field for a column reports the whole new mapping", async () => {
    const onChange = vi.fn();
    render(<MappingStep {...base} columns={columns} overrides={{}} onChange={onChange} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Copy" }));
    await userEvent.click(await screen.findByRole("option", { name: "Caption" }));
    expect(onChange).toHaveBeenCalledWith({ 3: "caption" });
  });

  it("choosing 'Don't import' skips the column (no empty select value is used)", async () => {
    const onChange = vi.fn();
    render(<MappingStep {...base} columns={columns} overrides={{}} onChange={onChange} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Notes" }));
    await userEvent.click(await screen.findByRole("option", { name: "Don't import" }));
    expect(onChange).toHaveBeenCalledWith({ 4: null });
  });

  it("choosing a field another column has moves it, so a field is read from one column", async () => {
    const onChange = vi.fn();
    render(<MappingStep {...base} columns={columns} overrides={{}} onChange={onChange} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Copy" }));
    await userEvent.click(await screen.findByRole("option", { name: "Content title" }));
    expect(onChange).toHaveBeenCalledWith(assignField(columns, {}, 3, "title"));
    expect(onChange.mock.calls[0][0]).toEqual({ 3: "title", 0: null });
  });

  it("skipping a column and picking a field again keeps the select controlled: nothing is logged and the label follows", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    function Stateful() {
      const [overrides, setOverrides] = useState<ColumnMapping>({});
      return <MappingStep {...base} columns={columns} overrides={overrides} onChange={setOverrides} />;
    }
    render(<Stateful />);
    const date = () => screen.getByRole("combobox", { name: "Date" });
    expect(date().textContent).toBe("Publish date");
    await userEvent.click(date());
    await userEvent.click(await screen.findByRole("option", { name: "Don't import" }));
    expect(date().textContent).toBe("Don't import");
    expect(screen.getAllByText("Skipped")).toHaveLength(1);
    await userEvent.click(date());
    await userEvent.click(await screen.findByRole("option", { name: "Caption" }));
    expect(date().textContent).toBe("Caption");
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    log.mockRestore();
    warn.mockRestore();
  });

  it("a skipped column is shown as skipped", () => {
    render(<MappingStep {...base} columns={columns} overrides={{ 3: null, 4: null }} onChange={vi.fn()} />);
    expect(screen.getAllByText("Skipped")).toHaveLength(2);
    expect(screen.getByRole("combobox", { name: "Notes" }).textContent).toBe("Don't import");
    expect(screen.getByText("3 matched · 0 need your input · 2 skipped")).toBeTruthy();
  });

  it("the validation list names the column each required field comes from", () => {
    render(<MappingStep {...base} columns={columns} overrides={{}} onChange={vi.fn()} />);
    const list = screen.getByRole("heading", { name: "Mapping validation" }).closest("section")!;
    expect(within(list).getByText("← Post Title")).toBeTruthy();
    expect(within(list).getByText("← Date")).toBeTruthy();
  });

  it("a required field with no column says so, in red, and blocks with an alert", () => {
    render(<MappingStep {...base} columns={columns} overrides={{ 2: null }} onChange={vi.fn()} />);
    expect(screen.getByText("Not mapped")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("Choose a column for Publish date");
    expect(screen.getByText("Required 2/3 mapped")).toBeTruthy();
  });

  it("columns that need input get a warning that says what to do", () => {
    render(<MappingStep {...base} columns={columns} overrides={{}} onChange={vi.fn()} />);
    expect(screen.getByRole("alert").textContent).toContain("2 columns need your input");
  });

  it("data checks: nothing to scan until the required fields are mapped", () => {
    render(<MappingStep {...base} columns={columns} overrides={{ 2: null }} onChange={vi.fn()} />);
    expect(screen.getByText("Map the required fields to scan your rows.")).toBeTruthy();
  });

  it("data checks list what the preview found", () => {
    const rows: ServerRow[] = [{
      sourceRow: 9, status: "invalid", errors: [{ field: "postDate", message: "x" }], warnings: [], duplicateReason: null, duplicateKind: null,
      fields: { title: "T", postDate: "", platforms: ["linkedin"], category: null, caption: "" }, details: { rawPostDate: "31/11/2026" },
    }];
    render(<MappingStep {...base} columns={columns} overrides={{}} rows={rows} onChange={vi.fn()} />);
    expect(screen.getByText("1 invalid date")).toBeTruthy();
    expect(screen.getByText('Row 9 · "31/11/2026" doesn\'t exist')).toBeTruthy();
  });

  it("data checks say when all is well", () => {
    render(<MappingStep {...base} columns={columns} overrides={{}} onChange={vi.fn()} />);
    expect(screen.getByText("No problems found.")).toBeTruthy();
  });

  it("once the mapping changed, the checks are said to be out of date", () => {
    render(<MappingStep {...base} columns={columns} overrides={{ 3: "caption" }} onChange={vi.fn()} />);
    expect(screen.getByText(/These checks update when you continue/)).toBeTruthy();
  });

  it("Replace file asks to start over", async () => {
    const onReplaceFile = vi.fn();
    render(<MappingStep {...base} onReplaceFile={onReplaceFile} columns={columns} overrides={{}} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Replace file" }));
    expect(onReplaceFile).toHaveBeenCalled();
  });
});

describe("ReviewStep", () => {
  const f = (patch: Partial<ReviewFields> = {}): ReviewFields => ({ title: "Post", postDate: "2099-03-10", platforms: ["linkedin"], category: "Case Study", caption: "c", ...patch });
  const server = (n: number, patch: Partial<ServerRow> = {}, fields: Partial<ReviewFields> = {}): ServerRow => ({
    sourceRow: n, status: "valid", fields: f(fields), errors: [], warnings: [], duplicateReason: null, duplicateKind: null, details: {}, ...patch,
  });
  const file = { name: "q4.csv", size: 48 * 1024, rows: 6, mappedColumns: 9, totalColumns: 10 };
  const handlers = () => ({ onEditMapping: vi.fn(), onExclude: vi.fn(), onInclude: vi.fn(), onFix: vi.fn() });

  const many = buildReviewRows([
    server(1, {}, { title: "One" }),
    server(2, {}, { title: "Two", platforms: ["instagram"] }),
    server(9, { status: "invalid", errors: [{ field: "postDate", message: "x" }], details: { rawPostDate: "31/11/2026" } }, { title: "Nine", postDate: "" }),
    server(14, { status: "duplicate", duplicateReason: "Already imported into this workspace.", duplicateKind: "workspace" }, { title: "Fourteen" }),
    server(17, { status: "invalid", errors: [{ field: "title", message: "Content title is required." }] }, { title: "" }),
    server(21, { status: "invalid", errors: [{ field: "platforms", message: "Unsupported channel: Pinterest." }], details: { platformLabel: "Pinterest" } }, { title: "Pin", platforms: [] }),
  ]);

  const show = (rows = many, extra: Partial<Parameters<typeof ReviewStep>[0]> = {}) =>
    render(<ReviewStep file={file} items={classify(rows)} locked={false} fixedCount={0} {...handlers()} {...extra} />);

  it("shows the file and the four counts", () => {
    show();
    expect(screen.getByText("q4.csv")).toBeTruthy();
    expect(screen.getByText(/9 of 10 columns mapped/)).toBeTruthy();
    expect(screen.getByText("Total records").previousElementSibling!.textContent).toBe("6");
    expect(screen.getByText("Valid records").previousElementSibling!.textContent).toBe("2");
    expect(screen.getByText("Records requiring attention").previousElementSibling!.textContent).toBe("3");
    expect(screen.getByText("Excluded records").previousElementSibling!.textContent).toBe("1");
  });

  it("warns that rows need attention, and says nothing is lost", () => {
    show();
    expect(screen.getByRole("alert").textContent).toContain("3 rows need your attention before import");
  });

  it("each tab shows its rows and its count", async () => {
    show();
    const tab = (name: RegExp) => screen.getByRole("tab", { name });
    expect(tab(/All rows/).textContent).toContain("6");
    expect(tab(/Needs attention/).textContent).toContain("3");
    await userEvent.click(tab(/Needs attention/));
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);
    await userEvent.click(tab(/Excluded/));
    expect(within(screen.getByRole("table")).getAllByRole("row").slice(1)).toHaveLength(1);
    expect(screen.getByText("Fourteen")).toBeTruthy();
  });

  it("pins what needs attention to the top, then the excluded, then the valid", () => {
    show();
    const first = within(screen.getByRole("table")).getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[1].textContent);
    expect(first).toEqual(["9", "17", "21", "14", "1", "2"]);
  });

  it("each problem row says what is wrong, and gets the right action", () => {
    show();
    expect(screen.getByText('Date "31/11/2026" doesn\'t exist')).toBeTruthy();
    expect(screen.getByText("Content title is required")).toBeTruthy();
    expect(screen.getByText('"Pinterest" isn\'t a supported channel')).toBeTruthy();
    expect(screen.getByText("Already imported into this workspace")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Fix row 9" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Include row 14" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Exclude row 1" })).toBeTruthy();
    expect(screen.getByText("Invalid date")).toBeTruthy();
    expect(screen.getByText("Unsupported channel")).toBeTruthy();
    expect(screen.getByText("Duplicate · Excluded")).toBeTruthy();
  });

  it("an unreadable date and channel show the text the file had", () => {
    show();
    expect(screen.getByText("31/11/2026")).toBeTruthy();
    expect(screen.getAllByText("Pinterest").length).toBeGreaterThan(0);
  });

  it("a row with no title is called Untitled, and no PIC is Unassigned", () => {
    show();
    expect(screen.getByText("Untitled")).toBeTruthy();
    expect(screen.getAllByText("Unassigned").length).toBeGreaterThan(0);
  });

  it("Fix, Exclude and Include call back with the row", async () => {
    const h = handlers();
    show(many, h);
    await userEvent.click(screen.getByRole("button", { name: "Fix row 9" }));
    await userEvent.click(screen.getByRole("button", { name: "Exclude row 1" }));
    await userEvent.click(screen.getByRole("button", { name: "Include row 14" }));
    expect(h.onFix).toHaveBeenCalledWith(9);
    expect(h.onExclude).toHaveBeenCalledWith(1);
    expect(h.onInclude).toHaveBeenCalledWith(14);
  });

  it("the checkbox includes and excludes a row", async () => {
    const h = handlers();
    show(many, h);
    const box = screen.getByRole("checkbox", { name: "Include row 1" });
    expect(box.getAttribute("aria-checked")).toBe("true");
    await userEvent.click(box);
    expect(h.onExclude).toHaveBeenCalledWith(1);
    await userEvent.click(screen.getByRole("checkbox", { name: "Include row 14" }));
    expect(h.onInclude).toHaveBeenCalledWith(14);
  });

  it("Edit mapping goes back", async () => {
    const h = handlers();
    show(many, h);
    await userEvent.click(screen.getByRole("button", { name: "Edit mapping" }));
    expect(h.onEditMapping).toHaveBeenCalled();
  });

  it("everything waits while the import is saved", () => {
    show(many, { locked: true });
    expect((screen.getByRole("button", { name: "Edit mapping" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Fix row 9" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("when everything is fine, says so and how many will be added", () => {
    const clean = buildReviewRows([server(1, {}, { title: "One" }), server(2, {}, { title: "Two" }), server(3, { status: "duplicate", duplicateReason: "Already imported into this workspace.", duplicateKind: "workspace" }, { title: "Three" })]);
    show(clean, { fixedCount: 2 });
    expect(screen.getByRole("status").textContent).toContain("All records are ready to import");
    expect(screen.getByRole("status").textContent).toContain("You fixed 2 records.");
    expect(screen.getByRole("status").textContent).toContain("2 rows will be added");
    expect(screen.getByRole("status").textContent).toContain("1 excluded row won't be imported");
  });

  it("when every row is excluded, there is nothing to import", () => {
    const none = buildReviewRows([server(1, { status: "duplicate", duplicateReason: "Already imported into this workspace.", duplicateKind: "workspace" })]);
    show(none);
    expect(screen.getByRole("alert").textContent).toContain("Nothing to import yet");
  });

  describe("pages", () => {
    const big = buildReviewRows(Array.from({ length: 26 }, (_, i) => server(i + 1, {}, { title: `Post ${i + 1}` })));

    it("ten to a page, with what is shown", () => {
      show(big);
      expect(within(screen.getByRole("table")).getAllByRole("row").slice(1)).toHaveLength(10);
      expect(screen.getByText("Showing 1–10 of 26 rows")).toBeTruthy();
    });

    it("moves between pages and keeps the arrows inside the range", async () => {
      show(big);
      expect((screen.getByRole("button", { name: "Previous page" }) as HTMLButtonElement).disabled).toBe(true);
      await userEvent.click(screen.getByRole("button", { name: "Next page" }));
      expect(screen.getByText("Showing 11–20 of 26 rows")).toBeTruthy();
      await userEvent.click(screen.getByRole("button", { name: "Page 3" }));
      expect(screen.getByText("Showing 21–26 of 26 rows")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Page 3" }).getAttribute("aria-current")).toBe("page");
      expect((screen.getByRole("button", { name: "Next page" }) as HTMLButtonElement).disabled).toBe(true);
    });

    it("a tab starts again from page 1", async () => {
      show(big);
      await userEvent.click(screen.getByRole("button", { name: "Page 3" }));
      await userEvent.click(screen.getByRole("tab", { name: /Valid/ }));
      expect(screen.getByText("Showing 1–10 of 26 rows")).toBeTruthy();
    });

    it("no pager for one page", () => {
      show(buildReviewRows([server(1)]));
      expect(screen.queryByRole("navigation", { name: "Pages" })).toBeNull();
    });
  });
});

describe("ImportSuccess", () => {
  const f = (patch: Partial<ReviewFields> = {}): ReviewFields => ({ title: "Post", postDate: "2026-11-18", platforms: ["instagram"], category: "Case Study", caption: "c", ...patch });
  const rows = buildReviewRows([
    { sourceRow: 1, status: "valid", fields: f({ title: "A" }), errors: [], warnings: [], duplicateReason: null, duplicateKind: null, details: {} },
    { sourceRow: 2, status: "valid", fields: f({ title: "B", caption: "", platforms: ["linkedin"] }), errors: [], warnings: [], duplicateReason: null, duplicateKind: null, details: {} },
    { sourceRow: 3, status: "valid", fields: f({ title: "C", postDate: "2026-12-02", platforms: ["linkedin", "instagram"], category: null }), errors: [], warnings: [], duplicateReason: null, duplicateKind: null, details: {} },
  ]);
  const summary = summarizeImport(rows, { instagram: 1, linkedin: 1 }, "2026-11-09");

  it("congratulates, names the file and counts the drafts", () => {
    render(<ImportSuccess fileName="q4.csv" summary={summary} />);
    expect(screen.getByRole("heading", { name: "Your marketing plan has been imported" })).toBeTruthy();
    expect(screen.getByText(/q4.csv was added to your content list as drafts/)).toBeTruthy();
    expect(screen.getByText("content items imported").previousElementSibling!.textContent).toBe("3");
    expect(screen.getByText(/channels · LinkedIn & Instagram/).previousElementSibling!.textContent).toBe("2");
    expect(screen.getByText("18 Nov 2026")).toBeTruthy();
  });

  it("lists what was imported per channel and category", () => {
    render(<ImportSuccess fileName="q4.csv" summary={summary} />);
    const list = screen.getByRole("heading", { name: "What was imported" }).closest("section")!;
    const lines = within(list).getAllByRole("listitem").map((li) => li.textContent);
    expect(lines).toEqual(["LinkedIn · Case Study1", "LinkedIn · No category1", "Instagram · Case Study1", "Instagram · No category1"]);
  });

  it("lists what still needs info, with a reason each", () => {
    render(<ImportSuccess fileName="q4.csv" summary={summary} />);
    expect(screen.getByText("2 items need additional info")).toBeTruthy();
    expect(screen.getByText("No caption yet")).toBeTruthy();
    expect(screen.getByText("No category")).toBeTruthy();
    expect(screen.getAllByText("Needs info")).toHaveLength(2);
  });

  it("cuts a long list at four and says how many more", () => {
    const eight = buildReviewRows(Array.from({ length: 8 }, (_, i) => ({
      sourceRow: i + 1, status: "valid" as const, fields: f({ title: `P${i}`, caption: "" }), errors: [], warnings: [], duplicateReason: null, duplicateKind: null, details: {},
    })));
    render(<ImportSuccess fileName="q4.csv" summary={summarizeImport(eight, { instagram: 1 }, "2026-11-09")} />);
    expect(screen.getByText("and 4 more")).toBeTruthy();
  });

  it("says so when nothing is missing", () => {
    const fine = buildReviewRows([{ sourceRow: 1, status: "valid", fields: f(), errors: [], warnings: [], duplicateReason: null, duplicateKind: null, details: {} }]);
    render(<ImportSuccess fileName="q4.csv" summary={summarizeImport(fine, { instagram: 1 }, "2026-11-09")} />);
    expect(screen.getByText("Nothing is missing")).toBeTruthy();
    expect(screen.getByText("a draft", { exact: false })).toBeTruthy();
  });

  it("points to the content list", () => {
    render(<ImportSuccess fileName="q4.csv" summary={summary} />);
    expect(screen.getByRole("link", { name: "Open the content list" }).getAttribute("href")).toBe("/jobs");
  });
});
