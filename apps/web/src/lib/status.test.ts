import { describe, expect, it } from "vitest";
import { ITEM_STATUS, POST_STATUS, approvalView, planStatusView, roleTone, statusView, usagePercent } from "./status";
import { TONE } from "./tone";
import { platformLabel } from "./platforms";
import { STATUS_GROUPS } from "./postList";

describe("POST_STATUS", () => {
  it("covers every status the API can send, so none renders as raw text", () => {
    const known = [
      "draft", "pending", "running",
      ...STATUS_GROUPS.pending, ...STATUS_GROUPS.done, ...STATUS_GROUPS.failed,
    ];
    for (const s of known) expect(POST_STATUS[s], s).toBeDefined();
  });

  it("keeps the labels and tones the jobs page had", () => {
    expect(POST_STATUS.pending).toMatchObject({ label: "Scheduled", tone: "warning" });
    expect(POST_STATUS.running).toMatchObject({ label: "Posting…", tone: "info", pulse: true });
    expect(POST_STATUS.done).toMatchObject({ label: "Published", tone: "success" });
    expect(POST_STATUS.failed).toMatchObject({ label: "Failed", tone: "danger" });
    expect(POST_STATUS.comment_failed).toMatchObject({ label: "Reply failed", tone: "warning" });
  });

  it("every status has a calendar bar, which the old calendar map lacked for post_done and the rest", () => {
    for (const [name, v] of Object.entries(POST_STATUS)) expect(v.bar, name).toMatch(/^border-l-/);
  });

  it("falls back to a neutral badge with the raw status", () => {
    expect(statusView(POST_STATUS, "paused_by_admin")).toEqual({ label: "paused_by_admin", tone: "neutral", dot: "bg-neutral-500" });
  });

  it("every tone exists in lib/tone.ts", () => {
    for (const table of [POST_STATUS, ITEM_STATUS])
      for (const [name, v] of Object.entries(table)) expect(TONE[v.tone], name).toBeDefined();
  });
});

describe("ITEM_STATUS", () => {
  it("matches the library page", () => {
    expect(ITEM_STATUS.queued.tone).toBe("brand");
    expect(ITEM_STATUS.scheduled.tone).toBe("info");
    expect(ITEM_STATUS.published.tone).toBe("success");
    expect(ITEM_STATUS.skipped.tone).toBe("neutral");
    expect(ITEM_STATUS.failed.tone).toBe("danger");
  });
});

describe("approvalView", () => {
  it("maps the review states and nothing else", () => {
    expect(approvalView("pending")).toMatchObject({ label: "In review", tone: "brand" });
    expect(approvalView("rejected")).toMatchObject({ label: "Rejected", tone: "danger" });
    expect(approvalView("approved")).toMatchObject({ label: "Approved", tone: "success" });
    expect(approvalView(null)).toBeNull();
    expect(approvalView(undefined)).toBeNull();
    expect(approvalView("")).toBeNull();
  });
});

describe("planStatusView", () => {
  const now = new Date("2026-11-06T00:00:00Z");

  it("active is a pulsing green badge", () => {
    expect(planStatusView("active")).toMatchObject({ label: "Active", tone: "success", pulse: true });
  });

  it("a trial with time left is plain, with 3 days or fewer it turns yellow and pulses", () => {
    expect(planStatusView("trialing", { trialDaysLeft: 10, now })).toMatchObject({ label: "10 days left", tone: "plain" });
    expect(planStatusView("trialing", { trialDaysLeft: 3, now })).toMatchObject({ label: "3 days left", tone: "warning", pulse: true });
    expect(planStatusView("trialing", { trialDaysLeft: 1, now })!.label).toBe("1 day left");
    expect(planStatusView("trialing", { trialDaysLeft: 0, now })!.label).toBe("Trial ends today");
  });

  it("a trial past its end date is red, whatever trialDaysLeft says", () => {
    expect(planStatusView("trialing", { trialDaysLeft: 5, trialEndsAt: "2026-11-01T00:00:00Z", now })).toMatchObject({ label: "Trial ended", tone: "danger" });
    expect(planStatusView("trialing", { trialDaysLeft: 5, trialEndsAt: "2026-11-20T00:00:00Z", now })!.tone).toBe("plain");
  });

  it("payment failed, cancelling and cancelled", () => {
    expect(planStatusView("on_hold")).toMatchObject({ label: "Payment failed", tone: "danger" });
    expect(planStatusView("cancelling")).toMatchObject({ label: "Cancels at period end", tone: "warning" });
    expect(planStatusView("cancelling")!.pulse).toBeUndefined();
    expect(planStatusView("cancelled")).toMatchObject({ label: "Cancelled", tone: "neutral", dot: "" });
  });

  it("an unknown status gives no badge", () => {
    expect(planStatusView("mystery")).toBeNull();
  });
});

describe("roleTone", () => {
  it("is the one colour map for team and invite", () => {
    expect(roleTone("owner")).toBe("brand");
    expect(roleTone("admin")).toBe("brand");
    expect(roleTone("designer")).toBe("success");
    expect(roleTone("member")).toBe("neutral");
    expect(roleTone("anything else")).toBe("neutral");
  });
});

describe("usagePercent", () => {
  it("rounds and caps at 100", () => {
    expect(usagePercent(0, 10)).toBe(0);
    expect(usagePercent(1, 3)).toBe(33);
    expect(usagePercent(2, 3)).toBe(67);
    expect(usagePercent(10, 10)).toBe(100);
    expect(usagePercent(25, 10)).toBe(100);
  });

  it("a limit of 0 is full, not a divide by zero", () => {
    expect(usagePercent(0, 0)).toBe(100);
    expect(usagePercent(3, 0)).toBe(100);
  });
});

describe("platformLabel", () => {
  it("uses the official spelling", () => {
    expect(platformLabel("linkedin")).toBe("LinkedIn");
    expect(platformLabel("youtube")).toBe("YouTube");
    expect(platformLabel("twitter")).toBe("X");
    expect(platformLabel("googlebusiness")).toBe("Google Business");
  });

  it("capitalises one it does not know", () => {
    expect(platformLabel("newnet")).toBe("Newnet");
  });
});
