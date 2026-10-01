import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Reuse one client across dev reloads.
export const db: PrismaClient = global.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") global.__prisma = db;
