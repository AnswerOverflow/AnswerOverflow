import {
	zChannelPublic,
	findChannelById,
	ChannelWithFlags,
	zChannelCreate,
	getDefaultChannelWithFlags,
	upsertChannel,
	upsertServer,
	zServerCreate,
} from '@answeroverflow/db';
import { z } from 'zod';
import {
	router,
	publicProcedure,
	withUserServersProcedure,
} from '~api/router/trpc';
import {
	assertBoolsAreNotEqual,
	assertCanEditServer,
	assertCanEditServerBotOnly,
	assertIsNotValue,
} from '~api/utils/permissions';
import {
	PermissionsChecks,
	protectedFetchWithPublicData,
	protectedMutation,
} from '~api/utils/protected-procedures';
import type { Context } from '../context';

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

const zChannelFlagChange = z.object({
	channel: zChannelWithServerCreate,
	enabled: z.boolean(),
});

export const INDEXING_ALREADY_ENABLED_ERROR_MESSAGE =
	'Indexing already enabled';
export const INDEXING_ALREADY_DISABLED_ERROR_MESSAGE =
	'Indexing already disabled';
export const FORUM_GUIDELINES_CONSENT_ALREADY_ENABLED_ERROR_MESSAGE =
	'Forum post guidelines consent already enabled';
export const FORUM_GUIDELINES_CONSENT_ALREADY_DISABLED_ERROR_MESSAGE =
	'Forum post guidelines consent already disabled';

export const MARK_SOLUTION_ALREADY_ENABLED_ERROR_MESSAGE =
	'Mark solution already enabled';
export const MARK_SOLUTION_ALREADY_DISABLED_ERROR_MESSAGE =
	'Mark solution already disabled';
export const SEND_MARK_SOLUTION_INSTRUCTIONS_IN_NEW_THREADS_ALREADY_ENABLED_ERROR_MESSAGE =
	'Send mark solution in new threads already enabled';
export const SEND_MARK_SOLUTION_INSTRUCTIONS_IN_NEW_THREADS_ALREADY_DISABLED_ERROR_MESSAGE =
	'Send mark solution in new threads already disabled';
export const SOLVED_LABEL_ALREADY_SELECTED_ERROR_MESSAGE =
	'Solved label already selected';
export const SOLVED_LABEL_ALREADY_UNSELECTED_ERROR_MESSAGE =
	'Solved label already unselected';
export const AUTO_THREAD_ALREADY_ENABLED_ERROR_MESSAGE =
	'Auto thread already enabled';
export const AUTO_THREAD_ALREADY_DISABLED_ERROR_MESSAGE =
	'Auto thread already disabled';

export const channelRouter = router({
	byId: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
		return protectedFetchWithPublicData({
			fetch: () => findChannelById(input),
			permissions: (data) => assertCanEditServer(ctx, data.serverId),
			notFoundMessage: CHANNEL_NOT_FOUND_MESSAGES,
			publicDataFormatter: (data) => {
				return zChannelPublic.parse(data);
			},
		});
	}),
	setIndexingEnabled: withUserServersProcedure
		.input(
			zChannelFlagChange.extend({
				inviteCode: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return mutateChannel({
				canUpdate:
					({ oldSettings }) =>
					() =>
						assertBoolsAreNotEqual({
							messageIfBothFalse: INDEXING_ALREADY_DISABLED_ERROR_MESSAGE,
							messageIfBothTrue: INDEXING_ALREADY_ENABLED_ERROR_MESSAGE,
							newValue: input.enabled,
							oldValue: oldSettings.flags.indexingEnabled,
						}),
				channel: input.channel,
				ctx,
				updateData: {
					flags: {
						indexingEnabled: input.enabled,
					},
					inviteCode: input.inviteCode,
				},
			});
		}),
	setForumGuidelinesConsentEnabled: withUserServersProcedure
		.input(zChannelFlagChange)
		.mutation(async ({ ctx, input }) => {
			return mutateChannel({
				canUpdate:
					({ oldSettings }) =>
					() =>
						assertBoolsAreNotEqual({
							messageIfBothFalse:
								FORUM_GUIDELINES_CONSENT_ALREADY_DISABLED_ERROR_MESSAGE,
							messageIfBothTrue:
								FORUM_GUIDELINES_CONSENT_ALREADY_ENABLED_ERROR_MESSAGE,
							newValue: input.enabled,
							oldValue: oldSettings.flags.forumGuidelinesConsentEnabled,
						}),
				channel: input.channel,
				ctx,
				updateData: {
					flags: {
						forumGuidelinesConsentEnabled: input.enabled,
					},
				},
			});
		}),
	setMarkSolutionEnabled: withUserServersProcedure
		.input(zChannelFlagChange)
		.mutation(async ({ ctx, input }) => {
			return mutateChannel({
				canUpdate:
					({ oldSettings }) =>
					() =>
						assertBoolsAreNotEqual({
							messageIfBothFalse: MARK_SOLUTION_ALREADY_DISABLED_ERROR_MESSAGE,
							messageIfBothTrue: MARK_SOLUTION_ALREADY_ENABLED_ERROR_MESSAGE,
							newValue: input.enabled,
							oldValue: oldSettings.flags.markSolutionEnabled,
						}),
				channel: input.channel,
				ctx,
				updateData: {
					flags: {
						markSolutionEnabled: input.enabled,
					},
				},
			});
		}),
	setSendMarkSolutionInstructionsInNewThreadsEnabled: withUserServersProcedure
		.input(zChannelFlagChange)
		.mutation(async ({ ctx, input }) => {
			return mutateChannel({
				canUpdate:
					({ oldSettings }) =>
					() =>
						assertBoolsAreNotEqual({
							messageIfBothFalse:
								SEND_MARK_SOLUTION_INSTRUCTIONS_IN_NEW_THREADS_ALREADY_DISABLED_ERROR_MESSAGE,
							messageIfBothTrue:
								SEND_MARK_SOLUTION_INSTRUCTIONS_IN_NEW_THREADS_ALREADY_ENABLED_ERROR_MESSAGE,
							newValue: input.enabled,
							oldValue:
								oldSettings.flags.sendMarkSolutionInstructionsInNewThreads,
						}),
				channel: input.channel,
				ctx,
				updateData: {
					flags: {
						sendMarkSolutionInstructionsInNewThreads: input.enabled,
					},
				},
			});
		}),
	setSolutionTagId: withUserServersProcedure
		.input(
			z.object({
				channel: zChannelWithServerCreate,
				tagId: z.string().nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return mutateChannel({
				canUpdate:
					({ oldSettings }) =>
					() =>
						assertIsNotValue({
							expectedToNotBeValue: oldSettings.solutionTagId,
							actualValue: input.tagId,
							errorMessage: oldSettings.solutionTagId
								? SOLVED_LABEL_ALREADY_SELECTED_ERROR_MESSAGE
								: SOLVED_LABEL_ALREADY_UNSELECTED_ERROR_MESSAGE,
						}),
				channel: input.channel,
				ctx,
				updateData: {
					solutionTagId: input.tagId,
				},
			});
		}),
	setAutoThreadEnabled: withUserServersProcedure
		.input(zChannelFlagChange)
		.mutation(async ({ ctx, input }) => {
			return mutateChannel({
				canUpdate:
					({ oldSettings }) =>
					() =>
						assertBoolsAreNotEqual({
							messageIfBothFalse: AUTO_THREAD_ALREADY_DISABLED_ERROR_MESSAGE,
							messageIfBothTrue: AUTO_THREAD_ALREADY_ENABLED_ERROR_MESSAGE,
							newValue: input.enabled,
							oldValue: oldSettings.flags.autoThreadEnabled,
						}),
				channel: input.channel,
				ctx,
				updateData: {
					flags: {
						autoThreadEnabled: input.enabled,
					},
				},
			});
		}),
});
