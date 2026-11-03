import { describe, expect, it } from "vitest";
import { missingForReview } from "./submitReadiness";

const complete = {
  scheduledFor: new Date("2026-12-01T02:00:00.000Z"),
  content: JSON.stringify({
    title: "Slope stability",
    text: "Caption",
    mediaUrls: ["/uploads/a.png"],
    category: "Case Study",
  }),
  targetPlatforms: ["linkedin"],
};

const withContent = (patch: Record<string, unknown>) => ({
  ...complete,
  content: JSON.stringify({ ...JSON.parse(complete.content), ...patch }),
});

describe("missingForReview", () => {
  it("passes when everything is filled", () => {
    expect(missingForReview(complete)).toEqual([]);
  });

  it("flags an empty title (whitespace counts as empty)", () => {
    expect(missingForReview(withContent({ title: "  " }))).toEqual(["title"]);
  });

  it("flags a missing date", () => {
    expect(missingForReview({ ...complete, scheduledFor: null })).toEqual(["date"]);
  });

  it("flags an empty caption", () => {
    expect(missingForReview(withContent({ text: "" }))).toEqual(["caption"]);
  });

  it("does not need a caption when every target is YouTube or Pinterest", () => {
    expect(missingForReview({ ...withContent({ text: "" }), targetPlatforms: ["youtube", "pinterest"] })).toEqual([]);
    expect(missingForReview({ ...withContent({ text: "" }), targetPlatforms: ["youtube", "linkedin"] })).toEqual(["caption"]);
  });

  it("flags a missing or unknown category", () => {
    expect(missingForReview(withContent({ category: null }))).toEqual(["category"]);
    expect(missingForReview(withContent({ category: "Nonsense" }))).toEqual(["category"]);
  });

  it("accepts imported free-text categories in other casing", () => {
    expect(missingForReview(withContent({ category: "  case study " }))).toEqual([]);
  });

  it("does not need a pillar for Ask Me Anything", () => {
    expect(missingForReview(withContent({ category: "Ask Me Anything", pillar: null }))).toEqual([]);
  });

  it("flags no account targets", () => {
    expect(missingForReview({ ...complete, targetPlatforms: [] })).toEqual(["accounts"]);
  });

  it("flags missing media; a YouTube video URL counts as media", () => {
    expect(missingForReview(withContent({ mediaUrls: [] }))).toEqual(["media"]);
    expect(missingForReview(withContent({ mediaUrls: [], youtubeVideoUrl: "https://youtu.be/x" }))).toEqual([]);
  });

  it("lists every missing field, in form order", () => {
    expect(missingForReview({ scheduledFor: null, content: "{}", targetPlatforms: [] }))
      .toEqual(["title", "date", "caption", "category", "accounts", "media"]);
  });

  it("treats broken content JSON as empty", () => {
    expect(missingForReview({ ...complete, content: "not json" }))
      .toEqual(["title", "caption", "category", "media"]);
  });
});

import { missingMessage } from "./submitReadiness";

describe("missingMessage", () => {
  it("is null when complete", () => expect(missingMessage([])).toBeNull());
  it("names one field", () => expect(missingMessage(["media"])).toBe("Add media to send for approval."));
  it("joins several", () =>
    expect(missingMessage(["title", "media", "accounts"])).toBe("Add title, media and an account to send for approval."));
});
