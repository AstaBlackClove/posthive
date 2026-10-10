import { PrismaClient } from "@prisma/client";

// Single shared Prisma instance — pool capped at 5 to reduce memory on Railway.
// Default is 10; at current traffic 5 is more than enough.
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + (process.env.DATABASE_URL?.includes("?") ? "&" : "?") + "connection_limit=5&pool_timeout=10",
    },
  },
});
