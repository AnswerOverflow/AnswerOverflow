export * from "@prisma/client";
export { prisma } from "./src/prisma";

export * from "./src/default";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /* Prisma */
      VITE_DATABASE_URL: string;
      DATABASE_URL: string;

      // common
      readonly NODE_ENV: "development" | "production" | "test";
    }
  }
}
