// Mirror of apps/api/src/lib/auth/passwordPolicy.ts (the API is the source of truth).

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_HINT = "8+ characters, 1 number";

/** Returns a user-facing message, or null when the password is acceptable. */
export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  if (!/\d/.test(password)) return "Password must include at least 1 number";
  return null;
}
