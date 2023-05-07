import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { botRouter, appRouter } from '../router';
export type BotRouter = typeof botRouter;
export type AppRouter = typeof appRouter;
export type BotRouterCaller = ReturnType<BotRouter['createCaller']>;
export type BotRouterInput = inferRouterInputs<BotRouter>;
export type BotRouterOutput = inferRouterOutputs<BotRouter>;
export type AppRouterOutput = inferRouterOutputs<AppRouter>;
export type ChannelFindByIdOutput = BotRouterOutput['channels']['byId'];
export type APISearchResult = AppRouterOutput['messages']['search'];
export type {
	MessageWithDiscordAccount as APIMessageWithDiscordAccount,
	MessageFull as APIMessageFull,
} from '@answeroverflow/db';
