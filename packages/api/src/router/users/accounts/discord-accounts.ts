import {
	zUniqueArray,
	zDiscordAccountPublic,
	findDiscordAccountById,
	findManyDiscordAccountsById,
	deleteDiscordAccount,
	deleteIgnoredDiscordAccount,
	findIgnoredDiscordAccountById,
	upsertDiscordAccount,
	zDiscordAccountUpsert,
} from '@answeroverflow/db';
import { z } from 'zod';
import {
	MergeRouters,
	router,
	withDiscordAccountProcedure,
} from '~api/router/trpc';
import {
	protectedFetch,
	protectedFetchManyWithPublicData,
	protectedFetchWithPublicData,
	protectedMutation,
} from '~api/utils/protected-procedures';
import {
	assertIsIgnoredAccount,
	assertIsNotIgnoredAccount,
	assertIsUser,
} from '~api/utils/permissions';
import { TRPCError } from '@trpc/server';

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
	linkGithubSponsors: withDiscordAccountProcedure
		.input(zDiscordAccountUpsert)
		.mutation(({ ctx, input }) => {
			return protectedMutation({
				permissions: [() => assertIsUser(ctx, input.id)],
				operation: () => upsertDiscordAccount(input),
				// ^?
			});
		}),
});

export const discordAccountRouter = MergeRouters(accountCrudRouter);
