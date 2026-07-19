import type { FastifyInstance } from "fastify";
import DodoPayments from "dodopayments";
import { withAuth, getUser, getWorkspaceId, requireOwnerRole } from "../lib/auth/withAuth.js";
import { prisma } from "../lib/prisma.js";
import { PLANS, getPlan, type PlanId } from "../lib/plans.js";
import crypto from "node:crypto";

const dodo = new DodoPayments({
  bearerToken: process.env.DODO_API_KEY ?? "",
  environment: (process.env.DODO_ENV as "test_mode" | "live_mode") ?? "test_mode",
});

const WEB_URL = process.env.WEB_URL ?? "http://localhost:3000";

export async function billingRoutes(app: FastifyInstance): Promise<void> {

  // GET /billing/status — current plan + trial info for the active workspace
  app.get("/billing/status", { preHandler: [withAuth] }, async (req, reply) => {
    const u = getUser(req);
    const workspaceId = getWorkspaceId(req);

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) return reply.status(404).send({ error: "Workspace not found" });

    const plan = getPlan(workspace.plan);
    const now = new Date();
    const trialDaysLeft = workspace.trialEndsAt
      ? Math.max(0, Math.ceil((workspace.trialEndsAt.getTime() - now.getTime()) / 86_400_000))
      : 0;
    const trialExpired = workspace.planStatus === "trialing" && workspace.trialEndsAt && workspace.trialEndsAt < now;

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [accountsUsed, postsThisMonth, twitterPostsThisMonth] = await Promise.all([
      prisma.account.count({ where: { workspaceId } }),
      prisma.postJob.count({
        where: {
          workspaceId,
          createdAt: { gte: startOfMonth, lt: startOfNextMonth },
        },
      }),
      prisma.postJobTarget.count({
        where: {
          account: { workspaceId, platform: "twitter" },
          status: { in: ["post_done", "comment_done"] },
          createdAt: { gte: startOfMonth, lt: startOfNextMonth },
        },
      }),
    ]);

    return reply.send({
      plan: workspace.plan,
      planStatus: workspace.planStatus,
      planName: plan.name,
      maxAccounts: plan.maxAccounts,
      maxSeats: plan.maxSeats,
      maxPostsPerMonth: plan.maxPostsPerMonth,
      maxTwitterPostsPerMonth: plan.maxTwitterPostsPerMonth,
      allowReels: plan.allowReels,
      allowOverrides: plan.allowOverrides,
      maxImagesPerPost: plan.maxImagesPerPost,
      accountsUsed,
      postsThisMonth,
      twitterPostsThisMonth,
      trialDaysLeft,
      trialExpired,
      trialEndsAt: workspace.trialEndsAt,
      hasDodoSub: !!workspace.dodoSubId,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
    });
  });

  // POST /billing/checkout — create Dodo checkout session for the active workspace
  app.post<{ Body: { planId: PlanId; successUrl?: string } }>(
    "/billing/checkout",
    { preHandler: [withAuth] },
    async (req, reply) => {
      const u = getUser(req);
      const workspaceId = getWorkspaceId(req);
      const roleBlocked = await requireOwnerRole(u.id, workspaceId);
      if (roleBlocked) return reply.status(403).send(roleBlocked);
      const { planId, successUrl } = req.body;
      const plan = PLANS[planId];
      if (!plan || !plan.dodoProductId) {
        return reply.status(400).send({ error: "Invalid plan" });
      }

      const [user, workspace] = await Promise.all([
        prisma.user.findUnique({ where: { id: u.id } }),
        prisma.workspace.findUnique({ where: { id: workspaceId } }),
      ]);
      if (!user || !workspace) return reply.status(404).send({ error: "Not found" });

      // Skip trial if workspace has already used their trial or previously cancelled
      const skipTrial = ["trialing", "active", "on_hold", "cancelling", "cancelled"].includes(workspace.planStatus);

      // successUrl must be a relative path — we prepend WEB_URL to prevent open redirect
      const resolvedSuccessUrl = successUrl
        ? `${WEB_URL}${successUrl.startsWith("/") ? successUrl : `/${successUrl}`}`
        : `${WEB_URL}/billing?success=1`;

      const session = await dodo.checkoutSessions.create({
        product_cart: [{ product_id: plan.dodoProductId, quantity: 1 }],
        customer: { email: user.email, name: user.name },
        return_url: resolvedSuccessUrl,
        metadata: { workspaceId: workspace.id, planId },
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
      const expectedBuf = Buffer.from(expected);
      const sigParts = signature.split(" ").map((s) => s.split(",")[1]);
      if (!sigParts.some((s) => {
        try {
          const b = Buffer.from(s ?? "");
          return b.length === expectedBuf.length && crypto.timingSafeEqual(b, expectedBuf);
        } catch { return false; }
      })) {
        return reply.status(401).send({ error: "Invalid signature" });
      }

      const event = req.body as {
        type: string;
        data: {
          subscription_id?: string;
          customer_id?: string;
          customer?: { customer_id?: string; id?: string };
          status?: string;
          cancel_at_next_billing_date?: boolean;
          trial_period_days?: number | null;
          next_billing_date?: string | null;
          metadata?: { workspaceId?: string; planId?: string };
          product_id?: string;
        };
      };

      const { type, data } = event;

      // Resolve plan from product_id (authoritative — always reflects current subscription)
      // Fall back to metadata.planId only when product_id is absent or unrecognised
      const resolvedPlanId = (() => {
        if (data.product_id) {
          const entry = (Object.entries(PLANS) as [PlanId, typeof PLANS[PlanId]][])
            .find(([, p]) => p.dodoProductId && p.dodoProductId === data.product_id);
          if (entry) return entry[0];
        }
        return (data.metadata?.planId ?? "creator") as PlanId;
      })();

      const planId = resolvedPlanId;

      // Resolve workspace from DB using subscription/customer IDs, fall back to metadata
      const subId = data.subscription_id;
      const customerId = data.customer?.customer_id ?? data.customer?.id ?? data.customer_id;

      let workspace = subId ? await prisma.workspace.findFirst({ where: { dodoSubId: subId } }) : null;
      if (!workspace && customerId) workspace = await prisma.workspace.findFirst({ where: { dodoCustomerId: customerId } });
      // Fall back to metadata for subscription.active (first activation where dodoSubId not yet stored)
      if (!workspace) {
        const metaWorkspaceId = data.metadata?.workspaceId;
        if (metaWorkspaceId) workspace = await prisma.workspace.findUnique({ where: { id: metaWorkspaceId } });
      }
      if (!workspace) return reply.send({ ok: true });

      const workspaceId = workspace.id;
      const dodoCustomerId = data.customer?.customer_id ?? data.customer?.id ?? data.customer_id ?? null;

      if (type === "subscription.active") {
        const isTrial = (data.trial_period_days ?? 0) > 0;
        const trialEndsAt = isTrial && data.next_billing_date
          ? new Date(data.next_billing_date)
          : null;
        await prisma.workspace.update({
          where: { id: workspaceId },
          data: {
            plan: planId,
            planStatus: isTrial ? "trialing" : "active",
            dodoCustomerId: dodoCustomerId ?? undefined,
            dodoSubId: data.subscription_id,
            trialEndsAt,
          },
        });
        // Mark the user's most recent session as converted — server-side only
        if (process.env.ENABLE_ANALYTICS === "true") {
          const owner = await prisma.workspaceMember.findFirst({
            where: { workspaceId, role: "owner" },
            select: { userId: true },
          });
          if (owner) {
            await prisma.session.updateMany({
              where: { userId: owner.userId, converted: false },
              data: { converted: true },
            });
          }
        }
      } else if (type === "subscription.renewed") {
        await prisma.workspace.update({
          where: { id: workspaceId },
          data: { planStatus: "active" },
        });
      } else if (type === "subscription.on_hold") {
        await prisma.workspace.update({
          where: { id: workspaceId },
          data: { planStatus: "on_hold" },
        });
      } else if (type === "subscription.failed" || type === "subscription.cancelled") {
        await prisma.workspace.update({
          where: { id: workspaceId },
          data: { plan: "cancelled", planStatus: "cancelled" },
        });
      } else if (type === "subscription.plan_changed" || type === "subscription.updated") {
        // If subscription is already cancelled, treat same as subscription.cancelled — don't overwrite with plan name
        if (data.status === "cancelled") {
          await prisma.workspace.update({
            where: { id: workspaceId },
            data: { plan: "cancelled", planStatus: "cancelled" },
          });
        } else {
          const updateData: Record<string, unknown> = {};
          if (planId && PLANS[planId] && planId !== "cancelled" && planId !== "trialing") {
            updateData.plan = planId;
          }
          if (data.cancel_at_next_billing_date === true) {
            updateData.planStatus = "cancelling";
          } else if (data.status === "active") {
            updateData.planStatus = "active";
          }
          if (Object.keys(updateData).length > 0) {
            await prisma.workspace.update({ where: { id: workspaceId }, data: updateData });
          }
        }
      }

      return reply.send({ ok: true });
    }
  );

  // POST /billing/change-plan — upgrade/downgrade existing subscription
  app.post<{ Body: { planId: PlanId } }>(
    "/billing/change-plan",
    { preHandler: [withAuth] },
    async (req, reply) => {
      const userId = getUser(req).id;
      const workspaceId = getWorkspaceId(req);
      const roleBlocked = await requireOwnerRole(userId, workspaceId);
      if (roleBlocked) return reply.status(403).send(roleBlocked);
      const { planId } = req.body;
      const plan = PLANS[planId];
      if (!plan || !plan.dodoProductId) {
        return reply.status(400).send({ error: "Invalid plan" });
      }

      const [user, workspace] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.workspace.findUnique({ where: { id: workspaceId } }),
      ]);
      if (!user || !workspace) return reply.status(404).send({ error: "Workspace not found" });
      if (workspace.plan === planId && workspace.planStatus === "active") return reply.status(400).send({ error: "Already on this plan" });

      // Cancelling + same plan = undo cancellation, not a plan change
      if (workspace.planStatus === "cancelling" && workspace.plan === planId && workspace.dodoSubId) {
        try {
          await dodo.subscriptions.update(workspace.dodoSubId, { cancel_at_next_billing_date: false } as Parameters<typeof dodo.subscriptions.update>[1]);
          await prisma.workspace.update({ where: { id: workspaceId }, data: { planStatus: "active" } });
          return reply.send({ ok: true });
        } catch (err) {
          console.error("[billing] undo-cancel error:", err);
          return reply.status(500).send({ error: "Failed to undo cancellation — please try again" });
        }
      }

      // DB-based trial (no Dodo subscription yet) — send to checkout for a new subscription
      if (!workspace.dodoSubId) {
        const session = await dodo.checkoutSessions.create({
          product_cart: [{ product_id: plan.dodoProductId, quantity: 1 }],
          customer: { email: user.email, name: user.name },
          return_url: `${WEB_URL}/billing?success=1`,
          metadata: { workspaceId, planId },
          trial_period_days: 0,
        } as Parameters<typeof dodo.checkoutSessions.create>[0]);
        return reply.send({ url: (session as { url?: string; checkout_url?: string }).url ?? (session as { url?: string; checkout_url?: string }).checkout_url });
      }

      let undidCancellation = false;
      try {
        // Dodo blocks changePlan on a scheduled-cancellation sub — undo it first
        if (workspace.planStatus === "cancelling") {
          await dodo.subscriptions.update(workspace.dodoSubId, { cancel_at_next_billing_date: false } as Parameters<typeof dodo.subscriptions.update>[1]);
          undidCancellation = true;
        }

        await dodo.subscriptions.changePlan(workspace.dodoSubId, {
          product_id: plan.dodoProductId,
          proration_billing_mode: "prorated_immediately",
          quantity: 1,
          effective_at: "immediately",
          metadata: { workspaceId, planId },
        });

        // Update DB immediately — webhook will confirm but we don't wait for it
        await prisma.workspace.update({
          where: { id: workspaceId },
          data: { plan: planId, planStatus: "active" },
        });

        return reply.send({ ok: true });
      } catch (err) {
        const dodoErr = err as { status?: number; error?: { code?: string } };
        if (dodoErr.status === 409 && dodoErr.error?.code === "PREVIOUS_PAYMENT_PENDING") {
          // Undo-cancel already succeeded — reflect that in DB so UI isn't stuck in "cancelling"
          if (undidCancellation) {
            await prisma.workspace.update({ where: { id: workspaceId }, data: { planStatus: "active" } });
          }
          return reply.status(409).send({
            error: "Cancellation removed. Your payment is still processing — try switching plans again in a moment.",
            code: "PREVIOUS_PAYMENT_PENDING",
          });
        }
        console.error("[billing] change-plan error:", err);
        return reply.status(500).send({ error: "Failed to change plan — please try again" });
      }
    }
  );

  // POST /billing/cancel — cancel subscription at period end
  app.post("/billing/cancel", { preHandler: [withAuth] }, async (req, reply) => {
    const u = getUser(req);
    const workspaceId = getWorkspaceId(req);
    const roleBlocked = await requireOwnerRole(u.id, workspaceId);
    if (roleBlocked) return reply.status(403).send(roleBlocked);
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) return reply.status(404).send({ error: "Workspace not found" });
    if (!workspace.dodoSubId) return reply.status(400).send({ error: "No active subscription found" });

    const { reason, feedback } = (req.body ?? {}) as { reason?: string; feedback?: string };

    try {
      await dodo.subscriptions.update(workspace.dodoSubId, { cancel_at_next_billing_date: true } as Parameters<typeof dodo.subscriptions.update>[1]);
      await prisma.workspace.update({ where: { id: workspaceId }, data: { planStatus: "cancelling" } });
      await prisma.cancellationFeedback.create({
        data: { userId: u.id, plan: workspace.plan, reason: reason ?? null, feedback: feedback ?? null },
      });
      return reply.send({ ok: true });
    } catch (err) {
      console.error("[billing] cancel error:", err);
      return reply.status(500).send({ error: "Failed to cancel subscription — please try again" });
    }
  });
}
