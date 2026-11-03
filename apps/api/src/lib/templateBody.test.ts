import { describe, expect, it } from "vitest";
import { templateBody } from "./templateBody.js";

const base = {
  pillar: "Promotional",
  category: "Case Study",
  linkUrl: "https://www.figma.com/design/AbC123/Slope-stability",
};

const issue = (input: unknown) => {
  const r = templateBody.safeParse(input);
  return r.success ? null : r.error.issues[0]?.message;
};

describe("templateBody", () => {
  it("accepts a Figma link without a preview", () => {
    const r = templateBody.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.previewUrl).toBeNull();
  });

  it("accepts a Figma link with an image preview", () => {
    expect(templateBody.safeParse({ ...base, previewUrl: "/uploads/a.png" }).success).toBe(true);
  });

  it("rejects a link that is not from figma.com", () => {
    expect(issue({ ...base, linkUrl: "https://example.com/design/abc" })).toMatch(/Figma link/);
  });

  it("rejects a missing link", () => {
    expect(issue({ ...base, linkUrl: undefined })).toBe("Add a Figma link.");
    expect(issue({ ...base, linkUrl: "  " })).toBe("Add a Figma link.");
  });

  it("rejects a preview that is not an image", () => {
    expect(issue({ ...base, previewUrl: "/uploads/a.pdf" })).toBe("The preview must be an image");
  });

  it("rejects a pillar that does not match the category", () => {
    expect(issue({ ...base, pillar: "Educational" })).toMatch(/belongs to/);
  });

  it("ignores file fields: .fig can no longer be set", () => {
    const r = templateBody.safeParse({ ...base, fileUrl: "/uploads/x.fig", fileName: "x.fig", fileSize: 10 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).not.toHaveProperty("fileUrl");
  });
});
