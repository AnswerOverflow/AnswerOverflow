import { PrismaClient } from "@prisma/client";

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var, no-unused-vars
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: {
        url:
          process.env.NODE_ENV === "test"
            ? process.env.VITE_DATABASE_URL
            : process.env.DATABASE_URL,
      },
    },
  });

export * from "@prisma/client";

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
