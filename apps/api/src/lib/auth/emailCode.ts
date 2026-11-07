import crypto from "crypto";

export const CODE_TTL_MIN = 15;
export const MAX_CODE_ATTEMPTS = 5;

/** 6-digit numeric code, e.g. "042817". */
export function generateCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function isCodeFormat(code: string): boolean {
  return /^[0-9]{6}$/.test(code);
}

/** Hash the code together with the verification record's token so a hash can't be replayed against another record. */
export function hashCode(token: string, code: string): string {
  return crypto.createHash("sha256").update(`${token}:${code}`).digest("hex");
}

export function codeMatches(token: string, code: string, storedHash: string): boolean {
  const expected = Buffer.from(hashCode(token, code));
  const actual = Buffer.from(storedHash);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}
