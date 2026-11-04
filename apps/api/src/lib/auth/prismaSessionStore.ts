import { prisma } from "../prisma.js";
import type { SessionStore } from "./sessionService.js";

export const prismaSessionStore: SessionStore = {
  create: (data) => prisma.authSession.create({ data }),
  findById: (id) => prisma.authSession.findUnique({ where: { id } }),
  findByAnyTokenHash: (hash) =>
    prisma.authSession.findFirst({ where: { OR: [{ tokenHash: hash }, { prevTokenHash: hash }] } }),
  update: async (id, patch) => {
    await prisma.authSession.updateMany({ where: { id }, data: patch });
  },
  delete: async (id) => {
    await prisma.authSession.deleteMany({ where: { id } });
  },
  deleteAllForUser: async (userId, exceptId) => {
    await prisma.authSession.deleteMany({
      where: { userId, ...(exceptId ? { id: { not: exceptId } } : {}) },
    });
  },
};
