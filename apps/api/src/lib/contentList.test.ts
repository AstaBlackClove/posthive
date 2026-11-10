import { describe, expect, it } from "vitest";
import { activityOf, channelsOf, importMarker, importSourceOf, safeLink, titleOf, toDetail, toListItem, type DetailRecord, type ListRecord } from "./contentList.js";

const row = (patch: Partial<ListRecord> & { content?: unknown } = {}): ListRecord => {
  const { content, ...rest } = patch;
  return {
    id: "p1",
    status: "draft",
    approvalStatus: null,
    scheduledFor: new Date("2026-03-07T01:00:00Z"),
    content: typeof content === "string" ? content : JSON.stringify(content ?? { title: "When Data Leads", text: "A caption" }),
    targets: [],
    ...rest,
  };
};

describe("safeLink", () => {
  it("keeps an http(s) address", () => {
    expect(safeLink("https://docs.google.com/document/d/abc/edit")).toBe("https://docs.google.com/document/d/abc/edit");
    expect(safeLink("  http://example.com/a  ")).toBe("http://example.com/a");
  });

  it("drops anything a browser could run or that is not an address: javascript:, data:, a sentence, text with spaces", () => {
    for (const bad of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,<b>x</b>", "vbscript:x", "//evil.example/x", "see the doc below", "https://a.com/with space", "/relative/path", "", "  ", 7, null, undefined, {}]) {
      expect(safeLink(bad), String(bad)).toBeNull();
    }
  });

  it("drops an address of more than 500 characters", () => {
    expect(safeLink(`https://a.com/${"x".repeat(600)}`)).toBeNull();
  });
});

describe("toListItem", () => {
  it("is the row of the table: title, date, caption start, channels, source row, category", () => {
    const item = toListItem(
      row({
        content: { title: "T", text: "C", platforms: ["linkedin", "instagram"], sourceRow: 3, designCopy: "https://docs.google.com/x", category: "Case Study" },
      }),
    );
    expect(item).toEqual({
      id: "p1",
      status: "draft",
      approvalStatus: null,
      scheduledFor: "2026-03-07T01:00:00.000Z",
      title: "T",
      caption: "C",
      channels: ["linkedin", "instagram"],
      sourceRow: 3,
      link: "https://docs.google.com/x",
      designCopy: "",
      category: "Case Study",
    });
  });

  it("never sends the content JSON, only the fields above", () => {
    const item = toListItem(row({ content: { title: "T", designCopy: "secret", outputUrl: "https://x.example", importSource: { fileName: "a.xlsx" } } }));
    expect(JSON.stringify(item)).not.toContain("a.xlsx");
    expect(Object.keys(item).sort()).toEqual(["approvalStatus", "caption", "category", "channels", "designCopy", "id", "link", "scheduledFor", "sourceRow", "status", "title"]);
  });

  it("a design copy cell that is text, not an address, is shown as its start and is not a link", () => {
    const item = toListItem(row({ content: { title: "T", designCopy: "Slide 1: the problem\nSlide 2: the fix".repeat(20) } }));
    expect(item.link).toBeNull();
    expect(item.designCopy.length).toBeLessThanOrEqual(160);
  });

  it("a javascript: cell is neither a link nor shown as text that looks like one", () => {
    const item = toListItem(row({ content: { title: "T", designCopy: "javascript:alert(1)" } }));
    expect(item.link).toBeNull();
  });

  it("cuts a title at 200 characters and a caption at 200", () => {
    const item = toListItem(row({ content: { title: "t".repeat(500), text: "c".repeat(900) } }));
    expect(item.title).toHaveLength(200);
    expect(item.caption).toHaveLength(200);
  });

  it("an untitled post is called by its caption; with neither it is Untitled", () => {
    expect(toListItem(row({ content: { text: "  Hello  " } })).title).toBe("Hello");
    expect(toListItem(row({ content: {} })).title).toBe("Untitled");
    expect(titleOf({})).toBe("Untitled");
  });

  it("a post made here has no source row; a bad one (0, -1, 2.5, text) is ignored", () => {
    expect(toListItem(row({ content: { title: "T" } })).sourceRow).toBeNull();
    for (const bad of [0, -1, 2.5, "3", null]) expect(toListItem(row({ content: { title: "T", sourceRow: bad } })).sourceRow).toBeNull();
  });

  it("broken content is an untitled post, not an error", () => {
    expect(toListItem(row({ content: "{not json" })).title).toBe("Untitled");
    expect(toListItem(row({ content: "null" })).title).toBe("Untitled");
    expect(toListItem(row({ content: "[1]" })).title).toBe("Untitled");
  });

  it("a draft with no date has a null date", () => {
    expect(toListItem(row({ scheduledFor: null })).scheduledFor).toBeNull();
  });
});

describe("channelsOf", () => {
  it("is the accounts' platforms, each once; else the channels the plan file named", () => {
    expect(channelsOf({ platforms: ["linkedin"] }, [{ account: { platform: "instagram" } }, { account: { platform: "instagram" } }])).toEqual(["instagram"]);
    expect(channelsOf({ platforms: ["linkedin", 7, "instagram"] }, [])).toEqual(["linkedin", "instagram"]);
    expect(channelsOf({}, [{ account: null }])).toEqual([]);
  });
});

describe("importSourceOf", () => {
  it("reads the file name and the instant, as an ISO string", () => {
    expect(importSourceOf({ importSource: { fileName: "plan.xlsx", importedAt: "2026-11-13T03:42:00.000Z" } })).toEqual({
      fileName: "plan.xlsx",
      importedAt: "2026-11-13T03:42:00.000Z",
    });
  });

  it("is null without a name, with a date that is not one, or with something that is not an object", () => {
    expect(importSourceOf({})).toBeNull();
    expect(importSourceOf({ importSource: "plan.xlsx" })).toBeNull();
    expect(importSourceOf({ importSource: { fileName: "", importedAt: "2026-11-13T03:42:00.000Z" } })).toBeNull();
    expect(importSourceOf({ importSource: { fileName: "a.xlsx", importedAt: "yesterday" } })).toBeNull();
  });

  it("cuts a long file name", () => {
    expect(importSourceOf({ importSource: { fileName: "n".repeat(500), importedAt: "2026-11-13T03:42:00.000Z" } })?.fileName).toHaveLength(200);
  });

  it("the marker that counts an import's posts is exactly how the commit writes the timestamp", () => {
    const json = JSON.stringify({ importSource: { fileName: "a.xlsx", importedAt: "2026-11-13T03:42:00.000Z", format: "xlsx" } });
    expect(json).toContain(importMarker("2026-11-13T03:42:00.000Z"));
    expect(json).not.toContain(importMarker("2026-11-13T03:42:00.001Z"));
  });
});

const detail = (patch: Partial<DetailRecord> & { content?: unknown } = {}): DetailRecord => {
  const { content, ...rest } = patch;
  return {
    ...row({ content }),
    commentText: null,
    createdAt: new Date("2026-11-13T03:00:00Z"),
    reviewNote: null,
    reviewedAt: null,
    reviewedBy: null,
    user: { name: "Putri Anggraini" },
    targets: [],
    ...rest,
  };
};

describe("toDetail", () => {
  const imported = {
    title: "When Environmental Data Leads to Enforcement",
    text: "Most regional monitoring fails.",
    category: "Geospatial Insight/Expertise",
    platforms: ["linkedin"],
    sourceRow: 1,
    picContent: "Putri A.",
    importSource: { fileName: "plan.xlsx", importedAt: "2026-11-13T03:42:00.000Z" },
    mediaUrls: ["/uploads/a.png", "javascript:x", "/uploads/../x.png", "/uploads/clip.mp4"],
  };

  it("is the post of the drawer", () => {
    const d = toDetail(detail({ content: imported, targets: [{ status: "pending", error: null, account: { platform: "linkedin", displayName: "Braga Geo" } }] }));
    expect(d.title).toBe("When Environmental Data Leads to Enforcement");
    expect(d.pillar).toBe("Educational"); // the category's pillar when the file did not write one
    expect(d.owner).toBe("Putri A.");
    expect(d.accounts).toEqual([{ platform: "linkedin", displayName: "Braga Geo" }]);
    expect(d.caption).toBe("Most regional monitoring fails.");
    expect(d.captionLength).toBe(31);
    expect(d.source).toEqual({ fileName: "plan.xlsx", importedAt: "2026-11-13T03:42:00.000Z" });
  });

  it("only pictures the browser may load reach the media list: no javascript:, no '..', no video", () => {
    expect(toDetail(detail({ content: imported })).media).toEqual(["/uploads/a.png"]);
  });

  it("the owner is the plan's PIC, else the person who made the post", () => {
    expect(toDetail(detail({ content: { title: "T" } })).owner).toBe("Putri Anggraini");
    expect(toDetail(detail({ content: { title: "T" }, user: null })).owner).toBeNull();
  });

  it("a caption is cut at 5,000 characters but its real length is told", () => {
    const d = toDetail(detail({ content: { title: "T", text: "x".repeat(9000) } }));
    expect(d.caption).toHaveLength(5000);
    expect(d.captionLength).toBe(9000);
  });

  it("a pillar the file wrote wins over the category's", () => {
    expect(toDetail(detail({ content: { title: "T", pillar: "Promotional", category: "Blog Post" } })).pillar).toBe("Promotional");
  });
});

describe("activityOf", () => {
  const at = (iso: string) => new Date(iso);

  it("an imported post starts with when and by whom it came in", () => {
    const j = detail({ content: { title: "T", importSource: { fileName: "plan.xlsx", importedAt: "2026-11-13T03:42:00.000Z" } } });
    expect(activityOf(j, { importSource: { fileName: "plan.xlsx", importedAt: "2026-11-13T03:42:00.000Z" } })).toEqual([
      { kind: "imported", by: "Putri Anggraini", at: "2026-11-13T03:42:00.000Z", note: null, channel: null },
    ]);
  });

  it("a post made here starts with its creation", () => {
    expect(activityOf(detail({ content: { title: "T" } }), {})).toEqual([{ kind: "created", by: "Putri Anggraini", at: "2026-11-13T03:00:00.000Z", note: null, channel: null }]);
  });

  it("a review answer is listed with the reviewer, the time and the note", () => {
    const rejected = detail({ approvalStatus: "rejected", reviewedAt: at("2026-11-14T02:00:00Z"), reviewedBy: { name: "Dewi K." }, reviewNote: "Fix the hook" });
    expect(activityOf(rejected, {}).at(-1)).toEqual({ kind: "revision", by: "Dewi K.", at: "2026-11-14T02:00:00.000Z", note: "Fix the hook", channel: null });
    const approved = detail({ approvalStatus: "approved", reviewedAt: at("2026-11-14T02:00:00Z"), reviewedBy: { name: "Dewi K." } });
    expect(activityOf(approved, {}).at(-1)).toMatchObject({ kind: "approved", by: "Dewi K.", note: null });
  });

  it("a review that was never answered adds nothing, whatever the status says", () => {
    expect(activityOf(detail({ approvalStatus: "pending" }), {})).toHaveLength(1);
    expect(activityOf(detail({ approvalStatus: "rejected", reviewedAt: null }), {})).toHaveLength(1);
  });

  it("a failed channel is listed with its reason, cut at 300 characters; a target without an error is not", () => {
    const j = detail({
      targets: [
        { status: "post_failed", error: "e".repeat(900), account: { platform: "instagram", displayName: "@a" } },
        { status: "pending", error: null, account: { platform: "linkedin", displayName: "L" } },
      ],
    });
    const failures = activityOf(j, {}).filter((e) => e.kind === "failed");
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({ channel: "instagram", at: null });
    expect(failures[0].note).toHaveLength(300);
  });
});
