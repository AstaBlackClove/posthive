import { afterEach, describe, expect, it, vi } from "vitest";
import { timezoneLabel, timezoneOptions } from "./timezones";

afterEach(() => vi.unstubAllGlobals());

describe("timezoneOptions", () => {
  const all = ["Africa/Cairo", "America/New_York", "Asia/Jakarta"];

  it("puts UTC first, then the browser's zones in order", () => {
    expect(timezoneOptions(undefined, all)).toEqual(["UTC", "Africa/Cairo", "America/New_York", "Asia/Jakarta"]);
  });

  it("does not list UTC twice when the browser already has it", () => {
    expect(timezoneOptions(undefined, ["Africa/Cairo", "UTC"])).toEqual(["UTC", "Africa/Cairo"]);
  });

  it("keeps a saved zone the browser does not list, at the top", () => {
    expect(timezoneOptions("Asia/Calcutta", all)[0]).toBe("Asia/Calcutta");
    expect(timezoneOptions("Asia/Calcutta", all)).toHaveLength(5);
  });

  it("does not repeat a saved zone that is already there", () => {
    expect(timezoneOptions("Asia/Jakarta", all)).toEqual(["UTC", "Africa/Cairo", "America/New_York", "Asia/Jakarta"]);
    expect(timezoneOptions("UTC", all)[0]).toBe("UTC");
  });

  it("ignores an empty saved value", () => {
    expect(timezoneOptions("", all)).toHaveLength(4);
    expect(timezoneOptions(null, all)).toHaveLength(4);
  });

  it("reads the real list from the browser: hundreds of zones, Jakarta among them", () => {
    const list = timezoneOptions();
    expect(list.length).toBeGreaterThan(300);
    expect(list).toContain("Asia/Jakarta");
    expect(new Set(list).size).toBe(list.length);
  });

  it("falls back to a short list when the browser cannot say", () => {
    vi.stubGlobal("Intl", { ...Intl, supportedValuesOf: undefined });
    expect(timezoneOptions()).toEqual(["UTC", "Asia/Jakarta"]);
    vi.stubGlobal("Intl", { ...Intl, supportedValuesOf: () => { throw new RangeError("nope"); } });
    expect(timezoneOptions()).toEqual(["UTC", "Asia/Jakarta"]);
  });
});

describe("timezoneLabel", () => {
  it("makes a name readable", () => {
    expect(timezoneLabel("America/New_York")).toBe("America / New York");
    expect(timezoneLabel("America/Argentina/Buenos_Aires")).toBe("America / Argentina / Buenos Aires");
    expect(timezoneLabel("UTC")).toBe("UTC");
  });
});
