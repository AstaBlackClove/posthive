import { prisma } from "../prisma.js";
import { codeExpired, codeMatches, MAX_CODE_ATTEMPTS } from "./emailCode.js";

/**
 * Mark the user's email verified, but only while it is still the address the code/link was
 * sent to (`sentTo`; null on rows from before that was stored). One conditional write, so a
 * parallel "change email" cannot slip in between a check and this update: whichever commits
 * second sees the other's row and matches nothing.
 */
export async function markEmailVerified(userId: string, sentTo: string | null): Promise<boolean> {
  const res = await prisma.user.updateMany({
    where: { id: userId, ...(sentTo ? { email: sentTo } : {}) },
    data: { emailVerified: true },
  });
  return res.count > 0;
}

/**
 * Check a 6-digit code for a logged-in user. Returns an error message to show, or null when the
 * email is now verified (or already was).
 */
export async function verifyEmailCode(userId: string, code: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } });
  if (!user) return "User not found";
  if (user.emailVerified) return null;

  const record = await prisma.emailVerification.findFirst({
    where: { userId, usedAt: null, codeHash: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (!record?.codeHash || codeExpired(record.createdAt) || record.expiresAt < new Date()) {
    return "This code has expired. Request a new one.";
  }

  // Spend an attempt BEFORE comparing: parallel guesses cannot exceed MAX_CODE_ATTEMPTS.
  const spent = await prisma.emailVerification.updateMany({
    where: { id: record.id, attempts: { lt: MAX_CODE_ATTEMPTS } },
    data: { attempts: { increment: 1 } },
  });
  if (spent.count === 0) return "Too many wrong codes. Request a new one.";

  if (!codeMatches(record.token, code, record.codeHash)) {
    const left = MAX_CODE_ATTEMPTS - (record.attempts + 1);
    return left > 0
      ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.`
      : "Too many wrong codes. Request a new one.";
  }

  if (!(await markEmailVerified(userId, record.email))) {
    return "Your email changed. Enter the code we sent to the new address.";
  }
  await prisma.emailVerification.deleteMany({ where: { userId } });
  return null;
}
