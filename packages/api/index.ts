export type { AppRouter } from "./src/router";
export { appRouter, botRouter } from "./src/router";

export { createContext, createBotContext } from "./src/context";
export type { CreateBotContextOptions } from "./src/context";
export type { Context } from "./src/context";

import { botRouter } from "./src/router";
import { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

export type botRouterInput = inferRouterInputs<typeof botRouter>;
export type botRouterOutput = inferRouterOutputs<typeof botRouter>;
export type ChannelSettingsUpsertInput = botRouterInput["channel_settings"]["upsert"];
export type ChannelSettingsOutput = botRouterOutput["channel_settings"]["upsert"];
export type ChannelUpsertInput = botRouterInput["channels"]["upsert"];
export type ServerUpsertInput = botRouterInput["servers"]["upsert"];
