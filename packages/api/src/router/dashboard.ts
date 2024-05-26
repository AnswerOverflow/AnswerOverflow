import { z } from 'zod';
import {
	getPageViewsForServer,
	getServerInvitesClicked,
} from '@answeroverflow/analytics/src/query';
import { assertCanEditServer } from '../utils/permissions';
import { protectedFetch } from '../utils/protected-procedures';
import { router, withUserServersProcedure } from './trpc';

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
});
