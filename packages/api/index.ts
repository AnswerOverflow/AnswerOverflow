export type { AppRouter } from "./src/router";
export { appRouter, botRouter } from "./src/router";

export { createContext, createBotContext } from "~api/router/context";
export type { Context, BotContextCreate } from "~api/router/context";

export * from "./src/utils/types";

declare global {
  // eslint-disable-next-line no-unused-vars
  namespace NodeJS {
    // eslint-disable-next-line no-unused-vars
    interface ProcessEnv {
      DISCORD_CLIENT_ID: string;
      VITE_DISCORD_CLIENT_ID: string;
    }
  }
}
