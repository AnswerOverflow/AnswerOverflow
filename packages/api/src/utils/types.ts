import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { botRouter } from "../router";

export type BotRouter = typeof botRouter;
export type BotRouterCaller = ReturnType<BotRouter["createCaller"]>;
export type botRouterInput = inferRouterInputs<BotRouter>;
export type botRouterOutput = inferRouterOutputs<BotRouter>;

export type ChannelSettingsUpsertInput = botRouterInput["channel_settings"]["upsert"];
export type ChannelSettingsOutput = botRouterOutput["channel_settings"]["upsert"];

export type ChannelUpsertInput = botRouterInput["channels"]["upsert"];
export type ServerUpsertInput = botRouterInput["servers"]["upsert"];
export type UserUpsertInput = botRouterInput["users"]["upsert"];
