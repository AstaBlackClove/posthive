// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Text, textClass } from "./Text";

afterEach(cleanup);

describe("textClass", () => {
  it("defaults to body + regular", () => {
    expect(textClass({ size: "m" })).toBe("type-body-r-m");
  });
  it("maps body weights", () => {
    expect(textClass({ variant: "body", size: "xxs", weight: "semibold" })).toBe("type-body-sb-xxs");
    expect(textClass({ size: "xl", weight: "medium" })).toBe("type-body-m-xl");
  });
  it("maps mono, including regular-only xs", () => {
    expect(textClass({ variant: "mono", size: "l", weight: "semibold" })).toBe("type-mono-sb-l");
    expect(textClass({ variant: "mono", size: "xs" })).toBe("type-mono-r-xs");
    expect(textClass({ variant: "mono", size: "xs", weight: "regular" })).toBe("type-mono-r-xs");
  });
});

describe("Text", () => {
  it("renders a span with the type class by default", () => {
    render(<Text size="s" weight="semibold">Hello</Text>);
    const el = screen.getByText("Hello");
    expect(el.tagName).toBe("SPAN");
    expect(el.className).toBe("type-body-sb-s");
  });

  it("renders the `as` element, merges className, passes props through", () => {
    render(<Text as="label" htmlFor="x" size="xs" className="text-muted">Name</Text>);
    const el = screen.getByText("Name");
    expect(el.tagName).toBe("LABEL");
    expect(el.getAttribute("for")).toBe("x");
    expect(el.className).toBe("type-body-r-xs text-muted");
  });
});

// Compile-time checks: `tsc --noEmit` fails if any of these become legal.
export function typeErrors() {
  return (
    <>
      {/* @ts-expect-error mono xs exists only in regular */}
      <Text variant="mono" size="xs" weight="semibold" />
      {/* @ts-expect-error mono xs exists only in regular */}
      <Text variant="mono" size="xs" weight="medium" />
      {/* @ts-expect-error mono has no xl */}
      <Text variant="mono" size="xl" />
      {/* @ts-expect-error mono has no xxs */}
      <Text variant="mono" size="xxs" weight="regular" />
      {/* @ts-expect-error size is required */}
      <Text weight="medium" />
    </>
  );
}
