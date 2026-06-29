import type { FastifyInstance } from "fastify";
import DodoPayments from "dodopayments";
import { withAuth, getUser } from "../lib/auth/withAuth.js";
import { prisma } from "../lib/prisma.js";
import { PLANS, getPlan, type PlanId } from "../lib/plans.js";
import crypto from "node:crypto";

const dodo = new DodoPayments({
  bearerToken: process.env.DODO_API_KEY ?? "",
  environment: (process.env.DODO_ENV as "test_mode" | "live_mode") ?? "test_mode",
});

const WEB_URL = process.env.WEB_URL ?? "http://localhost:3000";

export async function billingRoutes(app: FastifyInstance): Promise<void> {

  // GET /billing/status — current plan + trial info
  app.get("/billing/status", { preHandler: [withAuth] }, async (req, reply) => {
    const u = getUser(req);
    const user = await prisma.user.findUnique({ where: { id: u.id } });
    if (!user) return reply.status(404).send({ error: "User not found" });

    const plan = getPlan(user.plan);
    const now = new Date();
    const trialDaysLeft = user.trialEndsAt
      ? Math.max(0, Math.ceil((user.trialEndsAt.getTime() - now.getTime()) / 86_400_000))
      : 0;
    const trialExpired = user.planStatus === "trialing" && user.trialEndsAt && user.trialEndsAt < now;

    const [accountsUsed, postsThisMonth] = await Promise.all([
      prisma.account.count({ where: { userId: u.id } }),
      prisma.postJob.count({
        where: {
          userId: u.id,
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
            lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
          },
        },
      }),
    ]);

    return reply.send({
      plan: user.plan,
      planStatus: user.planStatus,
      planName: plan.name,
      maxAccounts: plan.maxAccounts,
      maxSeats: plan.maxSeats,
      maxPostsPerMonth: plan.maxPostsPerMonth,
      allowReels: plan.allowReels,
      allowOverrides: plan.allowOverrides,
      maxImagesPerPost: plan.maxImagesPerPost,
      accountsUsed,
      postsThisMonth,
      trialDaysLeft,
      trialExpired,
      trialEndsAt: user.trialEndsAt,
    });
  });

  // POST /billing/checkout — create Dodo checkout session
  app.post<{ Body: { planId: PlanId; successUrl?: string } }>(
    "/billing/checkout",
    { preHandler: [withAuth] },
    async (req, reply) => {
      const u = getUser(req);
      const { planId, successUrl } = req.body;
      const plan = PLANS[planId];
      if (!plan || !plan.dodoProductId) {
        return reply.status(400).send({ error: "Invalid plan" });
      }

      const user = await prisma.user.findUnique({ where: { id: u.id } });
      if (!user) return reply.status(404).send({ error: "User not found" });

      // Skip trial if user has already used their trial (trialing or any paid status)
      const skipTrial = ["trialing", "active", "on_hold", "cancelling"].includes(user.planStatus);

      // successUrl must be a relative path — we prepend WEB_URL to prevent open redirect
      const resolvedSuccessUrl = successUrl
        ? `${WEB_URL}${successUrl.startsWith("/") ? successUrl : `/${successUrl}`}`
        : `${WEB_URL}/billing?success=1`;

      const session = await dodo.checkoutSessions.create({
        product_cart: [{ product_id: plan.dodoProductId, quantity: 1 }],
        customer: { email: user.email, name: user.name },
        return_url: resolvedSuccessUrl,
        metadata: { userId: user.id, planId },
        ...(skipTrial ? { trial_period_days: 0 } : {}),
      } as Parameters<typeof dodo.checkoutSessions.create>[0]);

      return reply.send({ url: (session as { url?: string; checkout_url?: string }).url ?? (session as { url?: string; checkout_url?: string }).checkout_url });
    }
  );

  // POST /billing/webhook — Dodo sends subscription events here
  app.post(
    "/billing/webhook",
    { config: { rawBody: true } },
    async (req, reply) => {
      // Refuse all requests if webhook secret is not configured
      const secret = process.env.DODO_WEBHOOK_SECRET ?? "";
      if (!secret) {
        console.error("[billing] DODO_WEBHOOK_SECRET is not set — refusing all webhook events");
        return reply.status(500).send({ error: "Webhook secret not configured" });
      }

      const signature = req.headers["webhook-signature"] as string ?? "";
      const webhookId = req.headers["webhook-id"] as string ?? "";
      const timestamp = req.headers["webhook-timestamp"] as string ?? "";

      // rawBody is required for signature verification
      const rawBody = (req as unknown as { rawBody: Buffer }).rawBody;
      if (!rawBody) {
        console.error("[billing] rawBody missing — webhook cannot be verified");
        return reply.status(500).send({ error: "Cannot verify webhook" });
      }
      const body = rawBody.toString();

      const toSign = `${webhookId}.${timestamp}.${body}`;
      // Dodo prefixes the secret with "whsec_" — strip it before base64 decode
      const rawSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
      const expected = crypto
        .createHmac("sha256", Buffer.from(rawSecret, "base64"))
        .update(toSign)
        .digest("base64");
      const sigParts = signature.split(" ").map((s) => s.split(",")[1]);
      if (!sigParts.some((s) => s === expected)) {
        return reply.status(401).send({ error: "Invalid signature" });
      }

      const event = req.body as {
        type: string;
        data: {
          subscription_id?: string;
          customer_id?: string;
          customer?: { customer_id?: string; id?: string };
          status?: string;
          trial_period_days?: number | null;
          next_billing_date?: string | null;
          metadata?: { userId?: string; planId?: string };
        };
      };

      const { type, data } = event;
      const planId = (data.metadata?.planId ?? "creator") as PlanId;

      // Resolve user from DB using subscription/customer IDs, fall back to metadata only for first activation
      const subId = data.subscription_id;
      const customerId = data.customer?.customer_id ?? data.customer?.id ?? data.customer_id;

      let user = subId ? await prisma.user.findFirst({ where: { dodoSubId: subId } }) : null;
      if (!user && customerId) user = await prisma.user.findFirst({ where: { dodoCustomerId: customerId } });
      // Fall back to metadata for subscription.active (first activation where dodoSubId not yet stored)
      if (!user) {
        const metaUserId = data.metadata?.userId;
        if (metaUserId) user = await prisma.user.findUnique({ where: { id: metaUserId } });
      }
      if (!user) return reply.send({ ok: true });

      const userId = user.id;
      const dodoCustomerId = data.customer?.customer_id ?? data.customer?.id ?? data.customer_id ?? null;

      if (type === "subscription.active") {
        const isTrial = (data.trial_period_days ?? 0) > 0;
        const trialEndsAt = isTrial && data.next_billing_date
          ? new Date(data.next_billing_date)
          : null;
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: planId,
            planStatus: isTrial ? "trialing" : "active",
            dodoCustomerId: dodoCustomerId ?? undefined,
            dodoSubId: data.subscription_id,
            trialEndsAt,
          },
        });
      } else if (type === "subscription.renewed") {
        await prisma.user.update({
          where: { id: userId },
          data: { planStatus: "active" },
        });
      } else if (type === "subscription.on_hold") {
        await prisma.user.update({
          where: { id: userId },
          data: { planStatus: "on_hold" },
        });
      } else if (type === "subscription.failed" || type === "subscription.cancelled") {
        await prisma.user.update({
          where: { id: userId },
          data: { plan: "cancelled", planStatus: "cancelled" },
        });
      } else if (type === "subscription.updated") {
        const newPlanId = data.metadata?.planId as PlanId | undefined;
        if (newPlanId && PLANS[newPlanId]) {
          await prisma.user.update({
            where: { id: userId },
            data: { plan: newPlanId },
          });
        }
      }

      return reply.send({ ok: true });
    }
  );

  // POST /billing/change-plan — upgrade/downgrade existing subscription via changePlan
  app.post<{ Body: { planId: PlanId } }>(
    "/billing/change-plan",
    { preHandler: [withAuth] },
    async (req, reply) => {
      const u = getUser(req);
      const { planId } = req.body;
      const plan = PLANS[planId];
      if (!plan || !plan.dodoProductId) {
        return reply.status(400).send({ error: "Invalid plan" });
      }

      const user = await prisma.user.findUnique({ where: { id: u.id } });
      if (!user) return reply.status(404).send({ error: "User not found" });
      if (!user.dodoSubId) return reply.status(400).send({ error: "No active subscription to change" });
      if (user.plan === planId) return reply.status(400).send({ error: "Already on this plan" });

      try {
        await dodo.subscriptions.changePlan(user.dodoSubId, {
          product_id: plan.dodoProductId,
          proration_billing_mode: "prorated_immediately",
          quantity: 1,
          effective_at: "immediately",
          metadata: { userId: user.id, planId },
        });

        // Update DB immediately — webhook will confirm but we don't wait for it
        await prisma.user.update({
          where: { id: u.id },
          data: { plan: planId },
        });

        return reply.send({ ok: true });
      } catch (err) {
        console.error("[billing] change-plan error:", err);
        return reply.status(500).send({ error: "Failed to change plan — please try again" });
      }
    }
  );

  // POST /billing/cancel — cancel subscription at period end
  app.post("/billing/cancel", { preHandler: [withAuth] }, async (req, reply) => {
    const u = getUser(req);
    const user = await prisma.user.findUnique({ where: { id: u.id } });
    if (!user) return reply.status(404).send({ error: "User not found" });
    if (!user.dodoSubId) return reply.status(400).send({ error: "No active subscription found" });

    const { reason, feedback } = (req.body ?? {}) as { reason?: string; feedback?: string };

    try {
      await dodo.subscriptions.update(user.dodoSubId, { cancel_at_next_billing_date: true } as Parameters<typeof dodo.subscriptions.update>[1]);
      await prisma.user.update({ where: { id: u.id }, data: { planStatus: "cancelling" } });
      await prisma.cancellationFeedback.create({
        data: { userId: u.id, plan: user.plan, reason: reason ?? null, feedback: feedback ?? null },
      });
      return reply.send({ ok: true });
    } catch (err) {
      console.error("[billing] cancel error:", err);
      return reply.status(500).send({ error: "Failed to cancel subscription — please try again" });
    }
  });
}
