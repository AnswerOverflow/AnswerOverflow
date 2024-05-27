import { z } from 'zod';
import {
	getPageViewsForServer,
	getQuestionsAndAnswers,
	getServerInvitesClicked,
	getTopQuestionSolversForServer,
} from '@answeroverflow/analytics/src/query';
import { assertCanEditServer } from '../utils/permissions';
import { protectedFetch } from '../utils/protected-procedures';
import { router, withUserServersProcedure } from './trpc';
import { findManyDiscordAccountsById } from 'packages/db';

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
						...map.get(id),
						questionsSolved: topSolvers[id]?.aggregated_value ?? 0,
					}));
				},
				permissions: () => assertCanEditServer(ctx, input.serverId),
				notFoundMessage: 'Server not found',
			});
			return data;
		}),
});
