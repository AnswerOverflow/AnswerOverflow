import type { Channel } from "@prisma/client";
export * from "./src/server_settings";
export * from "@prisma/client";
export * from "./src/elastic";
export { prisma } from "./src/prisma";
export * from "./src/utils";
export * from "./src/default";
export * from "./src/channel-settings";
export * from "./src/utils/bitfield";
export * from "./src/user-server-settings";
export * from "./src/zod-schemas";
export type Thread = Channel & { parent_id: string };

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /* Elastic */
      VITE_ELASTICSEARCH_URL: string;
      VITE_ELASTICSEARCH_USERNAME: string;
      VITE_ELASTICSEARCH_PASSWORD: string;
      VITE_ELASTICSEARCH_MESSAGE_INDEX: string;
      ELASTICSEARCH_URL: string;
      ELASTICSEARCH_USERNAME: string;
      ELASTICSEARCH_PASSWORD: string;
      ELASTICSEARCH_MESSAGE_INDEX: string;

      // Prod Only
      ELASTICSEARCH_CLOUD_ID: string;
      ELASTICSEARCH_API_KEY: string;

      /* Prisma */
      VITE_DATABASE_URL: string;
      DATABASE_URL: string;

      // common
      readonly NODE_ENV: "development" | "production" | "test";
    }
  }
}
