/* eslint-disable @typescript-eslint/naming-convention */
export * from "./src/elastic";
export * from "./src/default";
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /* Elastic */
      ELASTICSEARCH_URL: string;
      ELASTICSEARCH_USERNAME: string;
      ELASTICSEARCH_PASSWORD: string;
      ELASTICSEARCH_MESSAGE_INDEX: string;

      // Prod Only
      ELASTICSEARCH_CLOUD_ID: string;

      // common
      readonly NODE_ENV: "development" | "production" | "test";
    }
  }
}
