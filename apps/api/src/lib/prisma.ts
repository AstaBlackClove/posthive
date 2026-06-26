import { PrismaClient } from "@prisma/client";

// Single shared Prisma instance for the whole API process.
export const prisma = new PrismaClient();
