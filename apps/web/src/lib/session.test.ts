import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loginUrl,
  safeReturnTo,
  setDirty,
  hasUnsavedChanges,
  resetDirtyForTests,
  notifySessionExpired,
  onSessionExpired,
} from "./session";

afterEach(() => resetDirtyForTests());

describe("safeReturnTo", () => {
  it("keeps same-site paths with query and hash", () => {
    expect(safeReturnTo("/compose?x=1#a")).toBe("/compose?x=1#a");
  });
  it("rejects empty / missing", () => {
    expect(safeReturnTo(null)).toBeNull();
    expect(safeReturnTo(undefined)).toBeNull();
    expect(safeReturnTo("")).toBeNull();
  });
  it("rejects absolute and protocol-relative URLs (open redirect)", () => {
    expect(safeReturnTo("https://evil.com")).toBeNull();
    expect(safeReturnTo("//evil.com")).toBeNull();
    expect(safeReturnTo("/\\evil.com")).toBeNull();
    expect(safeReturnTo("javascript:alert(1)")).toBeNull();
  });
  it("rejects paths that bounce back to auth pages", () => {
    expect(safeReturnTo("/login")).toBeNull();
    expect(safeReturnTo("/login?returnTo=/x")).toBeNull();
    expect(safeReturnTo("/register")).toBeNull();
  });
});

describe("loginUrl", () => {
  it("is plain /login with no arguments", () => {
    expect(loginUrl()).toBe("/login");
  });
  it("adds reason and an encoded returnTo", () => {
    expect(loginUrl("/jobs?tab=cal", "expired")).toBe("/login?reason=expired&returnTo=%2Fjobs%3Ftab%3Dcal");
  });
  it("drops an unsafe returnTo", () => {
    expect(loginUrl("//evil.com", "expired")).toBe("/login?reason=expired");
  });
});

describe("unsaved-changes registry", () => {
  it("tracks dirty keys independently", () => {
    expect(hasUnsavedChanges()).toBe(false);
    setDirty("compose", true);
    setDirty("other", true);
    setDirty("compose", false);
    expect(hasUnsavedChanges()).toBe(true);
    setDirty("other", false);
    expect(hasUnsavedChanges()).toBe(false);
  });
});

describe("session expiry events", () => {
  it("notifies listeners with the reason and unsubscribes", () => {
    const fn = vi.fn();
    const off = onSessionExpired(fn);
    notifySessionExpired("idle");
    expect(fn).toHaveBeenCalledWith("idle");
    off();
    notifySessionExpired("expired");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
