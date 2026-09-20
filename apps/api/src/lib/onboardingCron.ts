import cron from "node-cron";
import { prisma } from "./prisma.js";
import { sendDay3NudgeEmail, sendDay7NudgeEmail, sendTrialExpiryEmail, sendDay14WinbackEmail } from "./mailer.js";

async function runOnboardingNudges(): Promise<void> {
  const now = Date.now();

  // Day 3: signed up 3 days ago (±12h), no accounts connected
  const day3Start = new Date(now - (3.5 * 24 * 60 * 60 * 1000));
  const day3End   = new Date(now - (2.5 * 24 * 60 * 60 * 1000));

  // Day 7: signed up 7 days ago (±12h), has account but 0 posts
  const day7Start = new Date(now - (7.5 * 24 * 60 * 60 * 1000));
  const day7End   = new Date(now - (6.5 * 24 * 60 * 60 * 1000));

  // Day 12: trial ends in ~2 days (trialEndsAt between 1.4d and 2.6d from now)
  const expiryStart = new Date(now + (1.4 * 24 * 60 * 60 * 1000));
  const expiryEnd   = new Date(now + (2.6 * 24 * 60 * 60 * 1000));

  // Day 14: trial already expired (trialEndsAt < now), still not upgraded
  const winbackCutoff = new Date(now - (1 * 24 * 60 * 60 * 1000)); // expired at least 1 day ago

  const [day3Users, day7Users, expiryUsers, winbackUsers] = await Promise.all([
    // Day 3: signed up 3 days ago, no accounts, still trialing, not yet nudged
    prisma.user.findMany({
      where: {
        createdAt: { gte: day3Start, lte: day3End },
        day3NudgeSentAt: null,
        accounts: { none: {} },
        workspaceMembers: { some: { workspace: { planStatus: "trialing" } } },
      },
      select: { id: true, email: true, name: true },
    }),

    // Day 7: signed up 7 days ago, has account, 0 posts, still trialing, not yet nudged
    prisma.user.findMany({
      where: {
        createdAt: { gte: day7Start, lte: day7End },
        day7NudgeSentAt: null,
        accounts: { some: {} },
        postJobs: { none: {} },
        workspaceMembers: { some: { workspace: { planStatus: "trialing" } } },
      },
      select: { id: true, email: true, name: true },
    }),

    // Day 12: trial ending in ~2 days, still trialing, not yet nudged
    prisma.user.findMany({
      where: {
        expiryNudgeSentAt: null,
        workspaceMembers: {
          some: {
            workspace: {
              planStatus: "trialing",
              trialEndsAt: { gte: expiryStart, lte: expiryEnd },
            },
          },
        },
      },
      select: { id: true, email: true, name: true },
    }),

    // Day 14: trial expired at least 1 day ago, still not upgraded, not yet win-backed
    prisma.user.findMany({
      where: {
        day14WinbackSentAt: null,
        workspaceMembers: {
          some: {
            workspace: {
              planStatus: "trialing",
              trialEndsAt: { lte: winbackCutoff },
            },
          },
        },
      },
      select: { id: true, email: true, name: true },
    }),
  ]);

  // 42/run × 2 runs/day = 84 max, leaving ~16 buffer for welcome/reset emails
  const BATCH_CAP = 42;
  let remaining = BATCH_CAP;

  const day3Batch    = day3Users.slice(0, remaining);    remaining -= day3Batch.length;
  const day7Batch    = day7Users.slice(0, remaining);    remaining -= day7Batch.length;
  const expiryBatch  = expiryUsers.slice(0, remaining);  remaining -= expiryBatch.length;
  const winbackBatch = winbackUsers.slice(0, remaining);

  console.log(
    `[onboarding-cron] ` +
    `day3: ${day3Users.length} (sending ${day3Batch.length}), ` +
    `day7: ${day7Users.length} (sending ${day7Batch.length}), ` +
    `expiry: ${expiryUsers.length} (sending ${expiryBatch.length}), ` +
    `winback: ${winbackUsers.length} (sending ${winbackBatch.length})`
  );

  await Promise.allSettled([
    ...day3Batch.map((u) =>
      sendDay3NudgeEmail(u.email, u.name ?? "there")
        .then(() => prisma.user.update({ where: { id: u.id }, data: { day3NudgeSentAt: new Date() } }))
        .catch((e) => console.error(`[onboarding-cron] day3 error for ${u.email}:`, e))
    ),
    ...day7Batch.map((u) =>
      sendDay7NudgeEmail(u.email, u.name ?? "there")
        .then(() => prisma.user.update({ where: { id: u.id }, data: { day7NudgeSentAt: new Date() } }))
        .catch((e) => console.error(`[onboarding-cron] day7 error for ${u.email}:`, e))
    ),
    ...expiryBatch.map((u) =>
      sendTrialExpiryEmail(u.email, u.name ?? "there")
        .then(() => prisma.user.update({ where: { id: u.id }, data: { expiryNudgeSentAt: new Date() } }))
        .catch((e) => console.error(`[onboarding-cron] expiry error for ${u.email}:`, e))
    ),
    ...winbackBatch.map((u) =>
      sendDay14WinbackEmail(u.email, u.name ?? "there")
        .then(() => prisma.user.update({ where: { id: u.id }, data: { day14WinbackSentAt: new Date() } }))
        .catch((e) => console.error(`[onboarding-cron] winback error for ${u.email}:`, e))
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
