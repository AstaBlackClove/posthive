const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  hasPassword: boolean;
  avatarUrl: string | null;
  timezone: string;
  emailVerified: boolean;
  role: "owner" | "admin" | "designer" | "member";
}

export async function getSession(): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/session`, { credentials: "include" });
    if (!res.ok) return null;
    const { user } = await res.json() as { user: AuthUser };
    return user;
  } catch {
    return null;
  }
}

/** Message to show for a failed auth request. Never returns an object: it is rendered as-is. */
export function authErrorMessage(status: number, error: unknown, fallback: string): string {
  if (status === 429) return "Too many attempts. Try again in a few minutes.";
  return typeof error === "string" && error ? error : fallback;
}

async function postAuth(path: string, body: unknown, fallback: string): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  // A rate-limit or proxy error may not be JSON.
  const data = await res.json().catch(() => ({})) as { user?: AuthUser; error?: unknown };
  if (!res.ok) throw new Error(authErrorMessage(res.status, data.error, fallback));
  return data.user!;
}

/** `remember: false` = "Keep me logged in" unchecked: cookies end when the browser closes. */
export async function login(email: string, password: string, remember = true): Promise<AuthUser> {
  try {
    return await postAuth("/auth/login", { email, password, remember }, "Login failed");
  } catch (err) {
    // The API says "Invalid email or password"; the design wants this wording.
    if (err instanceof Error && err.message === "Invalid email or password") {
      throw new Error("Email or password is incorrect.");
    }
    throw err;
  }
}

/** The API's message when the email is taken. The sign-up form shows it inline with a login link. */
export const EMAIL_TAKEN = "Email already in use";

export async function register(email: string, password: string, name: string, marketing = false): Promise<AuthUser> {
  return postAuth("/auth/register", { email, password, name, marketing }, "Registration failed");
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
}
