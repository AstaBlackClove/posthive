// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({
  refresh: vi.fn(async () => {}),
  replace: vi.fn(),
  search: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: h.replace }),
  useSearchParams: () => h.search,
}));
vi.mock("../../../context/AuthContext", () => ({ useAuth: () => ({ refresh: h.refresh }) }));

import AuthCallbackPage from "./page";

beforeEach(() => {
  h.refresh.mockReset();
  h.refresh.mockResolvedValue(undefined);
  h.replace.mockReset();
  h.search = new URLSearchParams();
});

afterEach(cleanup);

describe("OAuth callback", () => {
  it("lands on the dashboard once the session is refreshed", async () => {
    render(<AuthCallbackPage />);
    await waitFor(() => expect(h.replace).toHaveBeenCalledWith("/dashboard"));
    expect(h.refresh).toHaveBeenCalledTimes(1);
  });

  it("follows a safe returnTo and falls back to the dashboard for an unsafe one", async () => {
    h.search = new URLSearchParams({ returnTo: "/jobs?x=1" });
    const { unmount } = render(<AuthCallbackPage />);
    await waitFor(() => expect(h.replace).toHaveBeenCalledWith("/jobs?x=1"));
    unmount();

    h.replace.mockReset();
    h.search = new URLSearchParams({ returnTo: "//evil.com" });
    render(<AuthCallbackPage />);
    await waitFor(() => expect(h.replace).toHaveBeenCalledWith("/dashboard"));
  });

  it("says so and links back to login when the session cannot be refreshed", async () => {
    h.refresh.mockRejectedValue(new Error("no session"));
    render(<AuthCallbackPage />);
    expect(await screen.findByText("Sign-in failed. Please try again.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to login" }).getAttribute("href")).toBe("/login");
    expect(h.replace).not.toHaveBeenCalled();
  });
});
