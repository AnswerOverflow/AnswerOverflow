export type { AppRouter } from "./src/router";
export { app_router as appRouter, bot_router as botRouter } from "./src/router";

export {
  createContext as createContext,
  createBotContext as createBotContext,
} from "~api/router/context";
export type { Context, BotContextCreate } from "~api/router/context";

export * from "./src/utils/types";
export * from "./src/router/message/types";
export * from "./src/router/users/accounts/types";
export * from "./src/router/server/types";
export * from "./src/router/channel/types";
export * from "./src/router/users/user/types";
