import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { appRouter, botRouter } from '../router';
export type BotRouter = typeof botRouter;
export type AppRouter = typeof appRouter;
export type BotRouterCaller = ReturnType<BotRouter['createCaller']>;
export type AppRouterCaller = ReturnType<AppRouter['createCaller']>;
export type BotRouterInput = inferRouterInputs<BotRouter>;
export type BotRouterOutput = inferRouterOutputs<BotRouter>;
export type AppRouterOutput = inferRouterOutputs<AppRouter>;
export type ChannelFindByIdOutput = BotRouterOutput['channels']['byId'];
export type APISearchResult = AppRouterOutput['messages']['search'];
import { BitField, ValueResolvable, enumToObject } from '@sapphire/bitfield';
import { PermissionFlagsBits } from 'discord-api-types/v10';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const PermissionsBitField = new BitField(
	enumToObject(PermissionFlagsBits),
);
export type PermissionResolvable = ValueResolvable<typeof PermissionsBitField>;
