// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AuthSlider, AUTH_SLIDES } from "./AuthSlider";

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal("matchMedia", () => ({
    matches,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function activeDot() {
  return screen.getAllByRole("button").findIndex((b) => b.getAttribute("aria-current") === "true");
}

function visibleSlide() {
  return AUTH_SLIDES.findIndex((_, i) => {
    const group = screen.getAllByRole("group", { hidden: true })[i];
    return group.getAttribute("aria-hidden") === "false";
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  stubReducedMotion(false);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("AuthSlider", () => {
  it("shows the first slide and one dot per slide", () => {
    render(<AuthSlider />);
    expect(screen.getAllByRole("button")).toHaveLength(AUTH_SLIDES.length);
    expect(activeDot()).toBe(0);
    expect(visibleSlide()).toBe(0);
    expect(screen.getByRole("heading", { level: 2, hidden: false, name: /Good Content Helps/ })).toBeTruthy();
  });

  it("moves to the slide whose dot is clicked", () => {
    render(<AuthSlider />);
    fireEvent.click(screen.getByRole("button", { name: "Show slide 3 of 3" }));
    expect(activeDot()).toBe(2);
    expect(visibleSlide()).toBe(2);
  });

  it("advances on its own and wraps around", () => {
    render(<AuthSlider />);
    act(() => { vi.advanceTimersByTime(6000); });
    expect(activeDot()).toBe(1);
    act(() => { vi.advanceTimersByTime(6000); });
    expect(activeDot()).toBe(2);
    act(() => { vi.advanceTimersByTime(6000); });
    expect(activeDot()).toBe(0);
  });

  it("restarts the timer after a manual pick", () => {
    render(<AuthSlider />);
    act(() => { vi.advanceTimersByTime(5000); });
    fireEvent.click(screen.getByRole("button", { name: "Show slide 2 of 3" }));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(activeDot()).toBe(1); // 5s since the click: not yet
    act(() => { vi.advanceTimersByTime(1000); });
    expect(activeDot()).toBe(2);
  });

  it("pauses while hovered", () => {
    render(<AuthSlider />);
    const region = screen.getByRole("region", { hidden: true });
    fireEvent.mouseEnter(region);
    act(() => { vi.advanceTimersByTime(30000); });
    expect(activeDot()).toBe(0);
    fireEvent.mouseLeave(region);
    act(() => { vi.advanceTimersByTime(6000); });
    expect(activeDot()).toBe(1);
  });

  it("does not auto-advance with reduced motion, but dots still work", () => {
    stubReducedMotion(true);
    render(<AuthSlider />);
    act(() => { vi.advanceTimersByTime(60000); });
    expect(activeDot()).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Show slide 2 of 3" }));
    expect(activeDot()).toBe(1);
  });

  it("hides inactive slides from assistive tech", () => {
    render(<AuthSlider />);
    const groups = screen.getAllByRole("group", { hidden: true });
    expect(groups.map((g) => g.getAttribute("aria-hidden"))).toEqual(["false", "true", "true"]);
  });
});
