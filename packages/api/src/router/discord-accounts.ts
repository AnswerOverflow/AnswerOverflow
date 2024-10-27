import {
	deleteDiscordAccount,
	findDiscordAccountById,
	findManyDiscordAccountsById,
} from '@answeroverflow/core/discord-account';
import {
	deleteIgnoredDiscordAccount,
	findIgnoredDiscordAccountById,
} from '@answeroverflow/core/ignored-discord-account';
import { zDiscordAccountPublic, zUniqueArray } from '@answeroverflow/core/zod';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
	assertIsIgnoredAccount,
	assertIsNotIgnoredAccount,
	assertIsUser,
} from '../utils/permissions';
import {
	protectedFetch,
	protectedFetchManyWithPublicData,
	protectedFetchWithPublicData,
	protectedMutation,
} from '../utils/protected-procedures';
import { router, withDiscordAccountProcedure } from './trpc';

export const COULD_NOT_FIND_ACCOUNT_ERROR_MESSAGE =
	'Could not find discord account';

const accountCrudRouter = router({
	byId: withDiscordAccountProcedure
		.input(z.string())
		.query(({ ctx, input }) => {
			return protectedFetchWithPublicData({
				fetch: () => findDiscordAccountById(input),
				permissions: (data) => assertIsUser(ctx, data.id),
				notFoundMessage: COULD_NOT_FIND_ACCOUNT_ERROR_MESSAGE,
				publicDataFormatter: (data) => zDiscordAccountPublic.parse(data),
			});
		}),
	byIdMany: withDiscordAccountProcedure
		.input(zUniqueArray)
		.query(({ ctx, input }) => {
			return protectedFetchManyWithPublicData({
				fetch: () => findManyDiscordAccountsById(input),
				permissions: (data) => assertIsUser(ctx, data.id),
				publicDataFormatter: (data) => zDiscordAccountPublic.parse(data),
			});
		}),
	delete: withDiscordAccountProcedure
		.input(z.string())
		.mutation(({ ctx, input }) => {
			return protectedMutation({
				permissions: [
					() => assertIsUser(ctx, input),
					() => assertIsNotIgnoredAccount(ctx, input),
				],
				operation: () => deleteDiscordAccount(input),
			});
		}),
	undelete: withDiscordAccountProcedure
		.input(z.string())
		.mutation(({ ctx, input }) => {
			return protectedMutation({
				permissions: [
					() => assertIsUser(ctx, input),
					() => assertIsIgnoredAccount(ctx, input),
				],
				operation: () => deleteIgnoredDiscordAccount(input),
			});
		}),
	checkIfIgnored: withDiscordAccountProcedure
		.input(z.string())
		.query(async ({ ctx, input }) => {
			try {
				await protectedFetch({
					permissions: () => assertIsUser(ctx, input),
					fetch: () => findIgnoredDiscordAccountById(input),
					notFoundMessage: 'Could not find discord account',
				});
				return true;
			} catch (error) {
				if (!(error instanceof TRPCError && error.code === 'NOT_FOUND'))
					throw error;
				return false;
			}
		}),
});

export const discordAccountRouter = accountCrudRouter;
