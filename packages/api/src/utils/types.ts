import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { botRouter } from '../router';
export type { MessageWithDiscordAccount } from '@answeroverflow/db';
export type BotRouter = typeof botRouter;
export type BotRouterCaller = ReturnType<BotRouter['createCaller']>;
export type BotRouterInput = inferRouterInputs<BotRouter>;
export type BotRouterOutput = inferRouterOutputs<BotRouter>;

export type ChannelFindByIdOutput = BotRouterOutput['channels']['byId'];
