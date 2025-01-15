import {
	findChannelById,
	updateChannel,
	upsertChannel,
} from '@answeroverflow/core/channel';
import { upsertServer } from '@answeroverflow/core/server';
import { getDefaultChannelWithFlags } from '@answeroverflow/core/utils/channelUtils';
import {
	ChannelWithFlags,
	zChannelCreate,
	zChannelMutable,
	zServerCreate,
} from '@answeroverflow/core/zod';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { botClient } from '../bot/caller';
import {
	assertCanEditServer,
	assertCanEditServerBotOnly,
} from '../utils/permissions';
import {
	PermissionsChecks,
	protectedFetch,
	protectedMutation,
	protectedMutationFetchFirst,
} from '../utils/protected-procedures';
import { Context } from './context';
import { publicProcedure, router, withUserServersProcedure } from './trpc';

export const CHANNEL_NOT_FOUND_MESSAGES = 'Channel does not exist';

export const zChannelWithServerCreate = zChannelCreate
	.omit({
		serverId: true,
	})
	.merge(
		z.object({
			server: zServerCreate,
		}),
	);

async function mutateChannel({
	canUpdate,
	channel,
	updateData,
	ctx,
}: {
	canUpdate: (input: {
		oldSettings: ChannelWithFlags;
		doSettingsExistAlready: boolean;
	}) => PermissionsChecks;
	channel: z.infer<typeof zChannelWithServerCreate>;
	updateData: Parameters<typeof upsertChannel>[0]['update'];
	ctx: Context;
}) {
	return protectedMutation({
		permissions: () => assertCanEditServerBotOnly(ctx, channel.server.id),
		operation: async () => {
			const channelWithServerId = {
				...channel,
				serverId: channel.server.id,
			};
			let oldSettings = await findChannelById(channel.id);
			let doSettingsExistAlready = true;
			if (!oldSettings) {
				oldSettings = getDefaultChannelWithFlags(channelWithServerId);
				doSettingsExistAlready = false;
			} else {
				doSettingsExistAlready = true;
			}
			// We only want to create the server
			await upsertServer({
				create: channel.server,
				update: {},
			});
			return protectedMutation({
				permissions: canUpdate({ oldSettings, doSettingsExistAlready }),
				operation: async () =>
					upsertChannel({
						create: {
							...channelWithServerId,
							...updateData,
						},
						update: updateData,
					}),
			});
		},
	});
}

export const channelRouter = router({
	byId: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
		return protectedFetch({
			fetch: () => findChannelById(input),
			permissions: (data) => assertCanEditServer(ctx, data.serverId),
			notFoundMessage: CHANNEL_NOT_FOUND_MESSAGES,
		});
	}),
	getTags: withUserServersProcedure
		.input(z.string())
		.query(async ({ ctx, input }) => {
			return protectedFetch({
				fetch: async () => {
					const channel = await findChannelById(input);
					if (!channel) {
						return null;
					}
					return {
						channel: channel,
						tags: await botClient.getTags.query(channel.id),
					};
				},
				permissions: (data) => assertCanEditServer(ctx, data.channel.serverId),
				notFoundMessage: CHANNEL_NOT_FOUND_MESSAGES,
			});
		}),
	update: withUserServersProcedure
		.input(
			z
				.object({
					id: z.string(),
				})
				.merge(zChannelMutable.deepPartial()),
		)
		.mutation(async ({ ctx, input }) => {
			return protectedMutationFetchFirst({
				fetch: async () => {
					return findChannelById(input.id);
				},
				notFoundMessage: 'Channel not found',
				permissions: (data) => assertCanEditServer(ctx, data.serverId),
				operation: async (existing) => {
					if (!existing) {
						throw new TRPCError({
							code: 'NOT_FOUND',
							message: 'Channel not found',
						});
					}
					if (!existing.flags.indexingEnabled && input.flags?.indexingEnabled) {
						const data = await botClient.enableIndexing.mutate(input.id);
						input.inviteCode = data.invite;
					}

					return updateChannel({
						old: existing,
						update: input,
					});
				},
			});
		}),
});
