// Password rules for NEW passwords (register, reset, change). Login never checks these,
// so accounts created before the number rule can still sign in.
// Keep in sync with apps/web/src/lib/passwordRule.ts.

export const PASSWORD_MIN_LENGTH = 8;

/** How long a password reset link stays valid. Used for the DB expiry and the email text. */
export const RESET_LINK_TTL_MIN = 30;

/** Returns a user-facing message, or null when the password is acceptable. */
export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  if (!/\d/.test(password)) return "Password must include at least 1 number";
  return null;
}
