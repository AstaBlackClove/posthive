// 6-digit email verification code. It is mailed next to the one-click link and lives on the
// same EmailVerification row. Pure helpers, no I/O.

import { createHash, randomInt, timingSafeEqual } from "crypto";

export const CODE_LENGTH = 6;
/** Wrong guesses allowed per code. A resend issues a new code with a fresh counter. */
export const MAX_CODE_ATTEMPTS = 5;
/** The code is short-lived; the link in the same email keeps its own 24h expiry. */
export const CODE_TTL_MIN = 15;

export function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

export function isCodeFormat(value: unknown): value is string {
  return typeof value === "string" && new RegExp(`^\\d{${CODE_LENGTH}}$`).test(value);
}

/** sha256 of "token:code". The token is random per row, so equal codes never hash equal. */
export function hashCode(token: string, code: string): string {
  return createHash("sha256").update(`${token}:${code}`).digest("hex");
}

export function codeMatches(token: string, code: string, storedHash: string): boolean {
  const a = Buffer.from(hashCode(token, code), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function codeExpired(createdAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - createdAt.getTime() >= CODE_TTL_MIN * 60 * 1000;
}
