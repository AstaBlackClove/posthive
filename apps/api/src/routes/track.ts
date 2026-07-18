import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { withAuth, getUser } from "../lib/auth/withAuth.js";

const ALLOWED_EVENTS = new Set([
  "checkout_clicked",
  "post_scheduled",
  "account_connected",
  "account_disconnected",
  "compose_opened",
]);

const MAX_PAGES = 50;
const MAX_STR = 500;

const ENABLED = process.env.ENABLE_ANALYTICS === "true";

export async function trackRoutes(app: FastifyInstance): Promise<void> {
  // POST /track/session — upsert anonymous/logged-in session
  app.post<{
    Body: {
      visitorId: string;
      pages: string[];
      entry: string;
      exit?: string;
      referrer?: string;
      duration?: number;
      converted?: boolean;
    };
  }>("/track/session", async (req, reply) => {
    if (!ENABLED) return reply.status(204).send();

    const { visitorId, pages, entry, exit, referrer, duration } = req.body;
    if (!visitorId || !pages?.length) return reply.status(204).send();

    // Sanitise inputs — clamp lengths to prevent DB bloat
    const safeVisitorId = String(visitorId).slice(0, 64);
    const safePages = (Array.isArray(pages) ? pages : [])
      .slice(0, MAX_PAGES)
      .map(p => String(p).slice(0, MAX_STR));
    const safeEntry = String(entry ?? "").slice(0, MAX_STR);
    const safeExit = exit ? String(exit).slice(0, MAX_STR) : undefined;
    const safeReferrer = referrer ? String(referrer).slice(0, MAX_STR) : undefined;
    const safeDuration = typeof duration === "number" && duration >= 0 && duration < 86400
      ? Math.round(duration) : undefined;

    // Try to resolve userId from auth cookie (optional — session can be anonymous)
    let userId: string | undefined;
    try {
      await withAuth(req, reply);
      userId = getUser(req).id;
    } catch { /* anonymous — fine */ }

    await prisma.session.upsert({
      where: { id: safeVisitorId },
      update: {
        pages: safePages,
        exit: safeExit,
        duration: safeDuration,
        userId: userId ?? undefined,
        updatedAt: new Date(),
      },
      create: {
        id: safeVisitorId,
        visitorId: safeVisitorId,
        userId: userId ?? undefined,
        entry: safeEntry,
        exit: safeExit,
        pages: safePages,
        referrer: safeReferrer,
        duration: safeDuration,
        converted: false, // only set server-side via trackConversion()
      },
    });

    return reply.status(204).send();
  });

  // POST /track/event — log a single conversion event (logged-in users only)
  app.post<{
    Body: { event: string; properties?: Record<string, unknown> };
  }>("/track/event", { preHandler: [withAuth] }, async (req, reply) => {
    if (!ENABLED) return reply.status(204).send();

    const u = getUser(req);
    const { event, properties } = req.body;
    if (!event || !ALLOWED_EVENTS.has(event)) return reply.status(204).send();

    await prisma.event.create({
      data: { userId: u.id, event, properties: (properties ?? {}) as object },
    });

    return reply.status(204).send();
  });

  // GET /track/admin — admin-only: sessions + events for dashboard
  app.get("/track/admin", { preHandler: [withAuth] }, async (req, reply) => {
    if (!ENABLED) return reply.status(403).send({ error: "Analytics disabled" });

    const u = getUser(req);
    const adminEmail = process.env.ADMIN_EMAIL ?? "";
    const adminPin = process.env.ADMIN_PIN ?? "";

    const user = await prisma.user.findUnique({ where: { id: u.id }, select: { email: true } });
    if (!user || user.email !== adminEmail) {
      return reply.status(403).send({ error: "Forbidden" });
    }

    // Second factor — PIN validated with timing-safe compare
    const sentPin = (req.headers["x-admin-pin"] as string | undefined) ?? "";
    const pinMatch = adminPin.length > 0 &&
      sentPin.length === adminPin.length &&
      crypto.timingSafeEqual(Buffer.from(sentPin), Buffer.from(adminPin));
    if (!pinMatch) {
      return reply.status(403).send({ error: "Invalid PIN" });
    }

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [sessions, events, totalUsers, newUsersToday] = await Promise.all([
      prisma.session.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          // join user name+email if linked
          user: { select: { name: true, email: true, plan: true, planStatus: true } },
        },
      }),
      prisma.event.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 500,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.user.count(),
      prisma.user.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
    ]);

    // Funnel counts
    const totalSessions = sessions.length;
    const billingViews = sessions.filter(s =>
      (s.pages as string[]).includes("/billing")
    ).length;
    const checkoutClicks = events.filter(e => e.event === "checkout_clicked").length;
    const trialsStarted = sessions.filter(s => s.converted).length;

    return reply.send({
      funnel: { totalSessions, billingViews, checkoutClicks, trialsStarted },
      sessions,
      events,
      stats: { totalUsers, newUsersToday },
    });
  });
}
