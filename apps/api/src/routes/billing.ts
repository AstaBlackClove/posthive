import type { FastifyInstance } from "fastify";
import DodoPayments from "dodopayments";
import { withAuth, getUser } from "../lib/auth/withAuth.js";
import { prisma } from "../lib/prisma.js";
import { PLANS, getPlan, TRIAL_DAYS, type PlanId } from "../lib/plans.js";
import crypto from "node:crypto";

const dodo = new DodoPayments({ bearerToken: process.env.DODO_API_KEY ?? "" });

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

    return reply.send({
      plan: user.plan,
      planStatus: user.planStatus,
      planName: plan.name,
      maxAccounts: plan.maxAccounts,
      maxSeats: plan.maxSeats,
      trialDaysLeft,
      trialExpired,
      trialEndsAt: user.trialEndsAt,
    });
  });

  // POST /billing/checkout — create Dodo checkout session
  app.post<{ Body: { planId: PlanId } }>(
    "/billing/checkout",
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

      const session = await dodo.payments.createPaymentLink({
        product_cart: [{ product_id: plan.dodoProductId, quantity: 1 }],
        customer: { email: user.email, name: user.name },
        success_url: `${WEB_URL}/billing?success=1`,
        billing_currency: "USD",
        metadata: { userId: user.id, planId },
      } as Parameters<typeof dodo.payments.createPaymentLink>[0]);

      return reply.send({ url: (session as { url?: string; checkout_url?: string }).url ?? (session as { url?: string; checkout_url?: string }).checkout_url });
    }
  );

  // POST /billing/webhook — Dodo sends subscription events here
  app.post(
    "/billing/webhook",
    { config: { rawBody: true } },
    async (req, reply) => {
      // Verify HMAC signature
      const secret = process.env.DODO_WEBHOOK_SECRET ?? "";
      const signature = req.headers["webhook-signature"] as string ?? "";
      const webhookId = req.headers["webhook-id"] as string ?? "";
      const timestamp = req.headers["webhook-timestamp"] as string ?? "";

      if (secret) {
        const body = (req as unknown as { rawBody: Buffer }).rawBody?.toString() ?? JSON.stringify(req.body);
        const toSign = `${webhookId}.${timestamp}.${body}`;
        const expected = crypto
          .createHmac("sha256", Buffer.from(secret, "base64"))
          .update(toSign)
          .digest("base64");
        const sigParts = signature.split(" ").map((s) => s.split(",")[1]);
        if (!sigParts.some((s) => s === expected)) {
          return reply.status(401).send({ error: "Invalid signature" });
        }
      }

      const event = req.body as {
        type: string;
        data: {
          subscription_id?: string;
          customer_id?: string;
          status?: string;
          metadata?: { userId?: string; planId?: string };
        };
      };

      const { type, data } = event;
      const userId = data.metadata?.userId;
      const planId = (data.metadata?.planId ?? "creator") as PlanId;

      if (!userId) return reply.send({ ok: true });

      if (type === "subscription.active") {
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: planId,
            planStatus: "active",
            dodoCustomerId: data.customer_id,
            dodoSubId: data.subscription_id,
            trialEndsAt: null,
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
}
