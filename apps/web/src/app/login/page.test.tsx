// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const h = vi.hoisted(() => ({
  login: vi.fn(),
  refresh: vi.fn(async () => {}),
  replace: vi.fn(),
  search: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: h.replace, push: vi.fn() }),
  useSearchParams: () => h.search,
}));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ refresh: h.refresh }) }));
vi.mock("../../lib/auth", async (orig) => ({ ...(await orig<typeof import("../../lib/auth")>()), login: h.login }));

import LoginPage from "./page";

beforeEach(() => {
  h.login.mockReset();
  h.login.mockResolvedValue({});
  h.replace.mockReset();
  h.search = new URLSearchParams();
});

afterEach(cleanup);

async function fill(email = "puteri@example.com", password = "S3cret-pass!") {
  await userEvent.type(screen.getByLabelText("Email"), email);
  await userEvent.type(document.getElementById("password") as HTMLInputElement, password);
}

describe("login page", () => {
  it("the email field is the underline input of the dark panel", () => {
    render(<LoginPage />);
    const email = screen.getByLabelText("Email");
    expect(email.className).toContain("field-line");
    expect(email.getAttribute("type")).toBe("email");
    expect(email.getAttribute("autocomplete")).toBe("email");
    expect((email as HTMLInputElement).required).toBe(true);
  });

  it("'Keep me logged in' starts on", () => {
    render(<LoginPage />);
    expect(screen.getByRole("checkbox", { name: "Keep me logged in" }).getAttribute("aria-checked")).toBe("true");
  });

  it("logs in with remember = true by default and goes to /dashboard", async () => {
    render(<LoginPage />);
    await fill();
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(h.login).toHaveBeenCalledWith("puteri@example.com", "S3cret-pass!", true));
    expect(h.refresh).toHaveBeenCalled();
    expect(h.replace).toHaveBeenCalledWith("/dashboard");
  });

  it("clicking the TEXT of the label turns it off, and the session-only flag reaches login()", async () => {
    render(<LoginPage />);
    await userEvent.click(screen.getByText("Keep me logged in"));
    expect(screen.getByRole("checkbox", { name: "Keep me logged in" }).getAttribute("aria-checked")).toBe("false");
    await fill();
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(h.login).toHaveBeenCalledWith("puteri@example.com", "S3cret-pass!", false));
  });

  it("the checkbox works from the keyboard and toggles back on", async () => {
    render(<LoginPage />);
    const box = screen.getByRole("checkbox", { name: "Keep me logged in" });
    box.focus();
    await userEvent.keyboard(" ");
    expect(box.getAttribute("aria-checked")).toBe("false");
    await userEvent.keyboard(" ");
    expect(box.getAttribute("aria-checked")).toBe("true");
  });

  it("ticking the box does not submit the form", async () => {
    render(<LoginPage />);
    await userEvent.click(screen.getByText("Keep me logged in"));
    expect(h.login).not.toHaveBeenCalled();
  });

  it("follows a safe returnTo and ignores an unsafe one", async () => {
    h.search = new URLSearchParams({ returnTo: "/jobs?x=1" });
    const { unmount } = render(<LoginPage />);
    await fill();
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(h.replace).toHaveBeenCalledWith("/jobs?x=1"));
    unmount();

    h.replace.mockReset();
    h.search = new URLSearchParams({ returnTo: "//evil.com" });
    render(<LoginPage />);
    await fill();
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(h.replace).toHaveBeenCalledWith("/dashboard"));
  });

  it("a failed login shows the message, marks both fields invalid and stays on the page", async () => {
    h.login.mockRejectedValue(new Error("Email or password is incorrect."));
    render(<LoginPage />);
    await fill();
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Email or password is incorrect.");
    expect(screen.getByLabelText("Email").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByLabelText("Email").getAttribute("aria-describedby")).toBe("login-error");
    expect(h.replace).not.toHaveBeenCalled();
  });

  it("while it logs in, the button says so and cannot be pressed again", async () => {
    let finish!: () => void;
    h.login.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    render(<LoginPage />);
    await fill();
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    const busy = await screen.findByRole("button", { name: "Logging in…" });
    expect((busy as HTMLButtonElement).disabled).toBe(true);
    finish();
    await waitFor(() => expect(h.replace).toHaveBeenCalled());
  });

  it("the submit button is the taller auth button", () => {
    render(<LoginPage />);
    const submit = screen.getByRole("button", { name: "Log in" });
    expect(submit.getAttribute("type")).toBe("submit");
    expect(submit.className.split(/\s+/)).toContain("h-12");
  });

  it("shows the message for an OAuth error that came back in the URL", () => {
    h.search = new URLSearchParams({ error: "google_email_unverified" });
    render(<LoginPage />);
    expect(screen.getByRole("alert").textContent).toContain("Google says this email isn't verified");
  });
});
