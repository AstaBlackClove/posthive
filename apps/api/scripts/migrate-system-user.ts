/**
 * One-time migration: reassign all accounts and jobs from the
 * system placeholder user to your real registered user.
 *
 * Usage:
 *   npx tsx scripts/migrate-system-user.ts your@email.com
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SYSTEM_USER_ID = "clsystemuser00000000000000";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/migrate-system-user.ts your@email.com");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    console.error("Register first at http://localhost:3000/register");
    process.exit(1);
  }

  const accounts = await prisma.account.updateMany({
    where: { userId: SYSTEM_USER_ID },
    data: { userId: user.id },
  });

  const jobs = await prisma.postJob.updateMany({
    where: { userId: SYSTEM_USER_ID },
    data: { userId: user.id },
  });

  await prisma.user.delete({ where: { id: SYSTEM_USER_ID } }).catch(() => {
    // ignore if already deleted or has remaining relations
  });

  console.log(`✓ Moved ${accounts.count} account(s) and ${jobs.count} job(s) to ${user.name} (${user.email})`);
  console.log("✓ System placeholder user removed");
}

main().catch(console.error).finally(() => prisma.$disconnect());
