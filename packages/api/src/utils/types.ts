import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { bot_router } from "../router";

export type BotRouter = typeof bot_router;
export type BotRouterCaller = ReturnType<BotRouter["createCaller"]>;
export type BotRouterInput = inferRouterInputs<BotRouter>;
export type BotRouterOutput = inferRouterOutputs<BotRouter>;

export type ChannelFindByIdOutput = BotRouterOutput["channels"]["byId"];
export type ChannelUpsertInput = BotRouterInput["channels"]["upsert"];
export type ChannelUpsertOutput = BotRouterOutput["channels"]["upsert"];
export type ChannelCreateWithDepsInput = BotRouterInput["channels"]["createWithDeps"];
export type ChannelUpsertWithDepsInput = BotRouterInput["channels"]["upsertWithDeps"];

export type ServerUpsertInput = BotRouterInput["servers"]["upsert"];
export type UserUpsertInput = BotRouterInput["users"]["upsert"];
