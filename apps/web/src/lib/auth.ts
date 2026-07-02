const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  timezone: string;
  emailVerified: boolean;
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

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json() as { user?: AuthUser; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Login failed");
  return data.user!;
}

export async function register(email: string, password: string, name: string): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password, name }),
  });
  const data = await res.json() as { user?: AuthUser; error?: string };
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Registration failed");
  return data.user!;
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
}
