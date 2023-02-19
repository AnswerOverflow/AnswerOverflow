import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { botRouter } from "../router";

export type BotRouter = typeof botRouter;
export type BotRouterCaller = ReturnType<BotRouter["createCaller"]>;
export type BotRouterInput = inferRouterInputs<BotRouter>;
export type BotRouterOutput = inferRouterOutputs<BotRouter>;

export type ChannelFindByIdOutput = BotRouterOutput["channels"]["byId"];
export type ChannelUpsertWithDepsInput = BotRouterInput["channels"]["upsertWithDeps"];
