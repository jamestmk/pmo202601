import { PrismaClient } from "@prisma/client";

type PrismaWithMaybeOperationLog = PrismaClient & {
  operationLog?: unknown;
};

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaWithMaybeOperationLog;
};

function createClient() {
  return new PrismaClient() as PrismaWithMaybeOperationLog;
}

const cached = globalForPrisma.prisma;
const needsFreshClient = !cached || typeof cached.operationLog === "undefined";

export const prisma = needsFreshClient ? createClient() : cached;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
