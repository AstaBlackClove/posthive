import { prisma } from "../prisma.js";

/**
 * Use up a password reset link and set the new password in ONE transaction.
 * - Two parallel requests with the same link cannot both win: once the first commits, the
 *   second one's conditional update matches nothing.
 * - If setting the password fails, the link is not burned: the claim is rolled back with it.
 * Returns false when the link was already used or has expired.
 */
export async function claimResetAndSetPassword(
  resetId: string,
  userId: string,
  passwordHash: string,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordReset.updateMany({
      where: { id: resetId, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) return false;
    await tx.user.update({ where: { id: userId }, data: { passwordHash } });
    return true;
  });
}
