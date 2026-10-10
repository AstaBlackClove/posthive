import { PrismaClient } from "@prisma/client";

// Single shared Prisma instance.
// connection_limit=5: Prisma client pool capped at 5. With Supabase PgBouncer pooler
// this is the right value — PgBouncer multiplexes the real DB connections.
// Default Prisma pool of 10 wastes memory; 5 is enough at current traffic.
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL env var is required");
const sep = dbUrl.includes("?") ? "&" : "?";

export const prisma = new PrismaClient({
  datasources: {
    db: { url: `${dbUrl}${sep}connection_limit=5&pool_timeout=10` },
  },
});
