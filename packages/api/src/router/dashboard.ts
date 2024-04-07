import { z } from 'zod';
import { router, withUserServersProcedure } from '~api/router/trpc';
import { assertCanEditServer } from '~api/utils/permissions';
import { protectedFetch } from '~api/utils/protected-procedures';
import {
	getPageViewsForServer,
	getServerInvitesClicked,
} from '@answeroverflow/analytics/src/query';

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
