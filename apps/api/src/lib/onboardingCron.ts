import cron from "node-cron";
import { prisma } from "./prisma.js";
import { sendDay3NudgeEmail, sendTrialExpiryEmail } from "./mailer.js";

async function runOnboardingNudges(): Promise<void> {
  const now = Date.now();

  // Day 3 window: signed up 3 days ago (±12h), no accounts connected
  const day3Start = new Date(now - (3.5 * 24 * 60 * 60 * 1000));
  const day3End   = new Date(now - (2.5 * 24 * 60 * 60 * 1000));

  // Day 12 window: trial ends in ~2 days (trialEndsAt between 1.5d and 2.5d from now)
  const expiryStart = new Date(now + (1.5 * 24 * 60 * 60 * 1000));
  const expiryEnd   = new Date(now + (2.5 * 24 * 60 * 60 * 1000));

  const [day3Users, expiryUsers] = await Promise.all([
    // Day 3: signed up 3 days ago, still no accounts, still trialing
    prisma.user.findMany({
      where: {
        createdAt: { gte: day3Start, lte: day3End },
        accounts: { none: {} },
        workspaceMembers: {
          some: {
            workspace: { planStatus: "trialing" },
          },
        },
      },
      select: { email: true, name: true },
    }),

    // Day 12: trial ending in ~2 days, still trialing (not yet paid)
    prisma.user.findMany({
      where: {
        workspaceMembers: {
          some: {
            workspace: {
              planStatus: "trialing",
              trialEndsAt: { gte: expiryStart, lte: expiryEnd },
            },
          },
        },
      },
      select: { email: true, name: true },
    }),
  ]);

  console.log(`[onboarding-cron] day3: ${day3Users.length}, expiry: ${expiryUsers.length}`);

  await Promise.allSettled([
    ...day3Users.map((u) =>
      sendDay3NudgeEmail(u.email, u.name ?? "there").catch((e) =>
        console.error(`[onboarding-cron] day3 email error for ${u.email}:`, e)
      )
    ),
    ...expiryUsers.map((u) =>
      sendTrialExpiryEmail(u.email, u.name ?? "there").catch((e) =>
        console.error(`[onboarding-cron] expiry email error for ${u.email}:`, e)
      )
    ),
  ]);
}

export function runOnboardingNudgesNow(): Promise<void> {
  return runOnboardingNudges();
}

export function startOnboardingCron(): void {
  // Run every 12 hours — catches both day3 and day12 windows reliably
  cron.schedule("0 */12 * * *", () => {
    runOnboardingNudges().catch((e) => console.error("[onboarding-cron] error:", e));
  });
  console.log("[onboarding-cron] started — every 12h");
}
