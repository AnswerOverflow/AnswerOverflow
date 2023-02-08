import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { botRouter } from "../router";

export type BotRouter = typeof botRouter;
export type BotRouterCaller = ReturnType<BotRouter["createCaller"]>;
export type botRouterInput = inferRouterInputs<BotRouter>;
export type botRouterOutput = inferRouterOutputs<BotRouter>;

export type ChannelFindByIdOutput = botRouterOutput["channels"]["byId"];
export type ChannelUpsertInput = botRouterInput["channels"]["upsert"];
export type ChannelUpsertOutput = botRouterOutput["channels"]["upsert"];
export type ChannelCreateWithDepsInput = botRouterInput["channels"]["createWithDeps"];
export type ChannelUpsertWithDepsInput = botRouterInput["channels"]["upsertWithDeps"];

export type ServerUpsertInput = botRouterInput["servers"]["upsert"];
export type UserUpsertInput = botRouterInput["users"]["upsert"];
