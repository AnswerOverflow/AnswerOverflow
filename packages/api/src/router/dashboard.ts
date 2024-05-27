import { z } from 'zod';
import {
	getPageViewsForServer,
	getQuestionsAndAnswers,
	getServerInvitesClicked,
	getTopPages,
	getTopQuestionSolversForServer,
} from '@answeroverflow/analytics/src/query';
import { assertCanEditServer } from '../utils/permissions';
import { protectedFetch } from '../utils/protected-procedures';
import { router, withUserServersProcedure } from './trpc';
import { findManyChannelsById, findManyDiscordAccountsById } from 'packages/db';

const input = z.object({
	serverId: z.string(),
	from: z.date(),
	to: z.date(),
});

export const dashboardRouter = router({
	pageViews: withUserServersProcedure
		.input(input)
		.query(async ({ ctx, input }) => {
			const data = await protectedFetch({
				fetch: () => {
					return getPageViewsForServer(input);
				},
				permissions: () => assertCanEditServer(ctx, input.serverId),
				notFoundMessage: 'Server not found',
			});
			return data;
		}),
	serverInvitesClicked: withUserServersProcedure
		.input(input)
		.query(async ({ ctx, input }) => {
			const data = await protectedFetch({
				fetch: () => {
					return getServerInvitesClicked(input);
				},
				permissions: () => assertCanEditServer(ctx, input.serverId),
				notFoundMessage: 'Server not found',
			});
			return data;
		}),
	questionsAndAnswers: withUserServersProcedure
		.input(input)
		.query(async ({ ctx, input }) => {
			const data = await protectedFetch({
				fetch: () => {
					return getQuestionsAndAnswers(input);
				},
				permissions: () => assertCanEditServer(ctx, input.serverId),
				notFoundMessage: 'Server not found',
			});
			return data;
		}),
	topQuestionSolvers: withUserServersProcedure
		.input(input)
		.query(async ({ ctx, input }) => {
			const data = await protectedFetch({
				fetch: async () => {
					const topSolvers = await getTopQuestionSolversForServer(input);
					const topSolverIds = Object.keys(topSolvers);
					const discordAccounts = await findManyDiscordAccountsById(
						topSolverIds,
					);
					const map = new Map(
						discordAccounts.map((account) => [account.id, account]),
					);
					return topSolverIds.map((id) => ({
						...map.get(id)!,
						questionsSolved: topSolvers[id]?.aggregated_value ?? 0,
					}));
				},
				permissions: () => assertCanEditServer(ctx, input.serverId),
				notFoundMessage: 'Server not found',
			});
			return data;
		}),
	topPages: withUserServersProcedure
		.input(input)
		.query(async ({ ctx, input }) => {
			const data = await protectedFetch({
				fetch: async () => {
					const metadata = await getTopPages(input);
					const threadIds = Object.keys(metadata);
					const threads = await findManyChannelsById(threadIds);
					const map = new Map(threads.map((thread) => [thread.id, thread]));
					return threadIds.map((id) => ({
						...map.get(id)!,
						views: metadata[id]?.aggregated_value ?? 0,
					}));
				},
				permissions: () => assertCanEditServer(ctx, input.serverId),
				notFoundMessage: 'Server not found',
			});
			return data;
		}),
});
