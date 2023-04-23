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
	protectedFetch,
	protectedMutation,
} from '~api/utils/protected-procedures';
import type { Context } from '../context';
import { findOrThrowNotFound } from '~api/utils/operations';

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

const channelSettingsNames = ["Indexing", "Mark Solution" , "Auto Thread" , "Forum Guidelines Consent" , "Send Mark Solution Instruction In New Threads"] as const;

const zChannelFlagChange = z.object({
	channel: zChannelWithServerCreate,
	enabled: z.boolean(),
	settingDesired: z.enum(channelSettingsNames),
	inviteCode: z.string().optional(),
});

type ChannelSettingsUpdateAction = typeof channelSettingsNames[number];


/*
to get done at a later point:
Make Generic Base Function
Get Flag Function
Set Flag Function
*/



function createErrorMessage(type: string, bool: boolean): string// error message fucntion
{
	let errorMessage: string = type + "already ";
	
	if (bool == false)
		errorMessage = errorMessage + "disabled";
	else
		errorMessage = errorMessage + "enabled";

	return errorMessage;
}

function getFlagStatus(settings: ChannelWithFlags, settingDesired: ChannelSettingsUpdateAction): boolean
{
	if (settingDesired === "Auto Thread")
		return settings.flags.autoThreadEnabled;
		else if (settingDesired === "Forum Guidelines Consent")
		return settings.flags.forumGuidelinesConsentEnabled;
		else if (settingDesired === "Indexing")
		return settings.flags.indexingEnabled;
		else if (settingDesired === "Mark Solution")
		return settings.flags.markSolutionEnabled
		else if (settingDesired === "Send Mark Solution Instruction In New Threads")
		return settings.flags.sendMarkSolutionInstructionsInNewThreads;
		else
		{
			//uh oh
			return false;
		}
}

function setFlagStatus(settingDesired: ChannelSettingsUpdateAction, funcInput: z.infer<typeof zChannelFlagChange>): boolean | undefined
{
	if (settingDesired === "Auto Thread")
	return funcInput.enabled;
		else if (settingDesired === "Forum Guidelines Consent")
		return funcInput.enabled;
		else if (settingDesired === "Indexing")
		return funcInput.enabled;
		else if (settingDesired === "Mark Solution")
		return funcInput.enabled;
		else if (settingDesired === "Send Mark Solution Instruction In New Threads")
		return funcInput.enabled;
		else
		{
			return undefined;
		}
}

function updateInviteCode(settingDesired: ChannelSettingsUpdateAction, funcInput: z.infer<typeof zChannelFlagChange>): string | undefined
{
	if (settingDesired === "Indexing")
		return funcInput.inviteCode;
		else
		return undefined;
}

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
		return protectedFetch({
			fetch: () => findChannelById(input),
			permissions: (data) => assertCanEditServer(ctx, data.serverId),
			notFoundMessage: CHANNEL_NOT_FOUND_MESSAGES,
		});
	}),
	byIdPublic: publicProcedure.input(z.string()).query(async ({ input }) => {
		const channel = await findOrThrowNotFound(
			() => findChannelById(input),
			CHANNEL_NOT_FOUND_MESSAGES,
		);
		return zChannelPublic.parse(channel);
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
		setSettingOfName: withUserServersProcedure
		.input(zChannelFlagChange.extend({
			inviteCode: z.string().optional(),
		}))
		.mutation(async ({ ctx, input }) => {
			return mutateChannel({
				canUpdate:
					({ oldSettings }) =>
					() =>
						assertBoolsAreNotEqual({
							messageIfBothFalse: createErrorMessage(input.settingDesired, false),
							messageIfBothTrue: createErrorMessage(input.settingDesired, true),
							newValue: input.enabled,
							oldValue: getFlagStatus(oldSettings, input.settingDesired),
						}),
				channel: input.channel,
				ctx,
				updateData: {
					flags: {
						indexingEnabled: setFlagStatus(input.settingDesired, input),
						autoThreadEnabled: setFlagStatus(input.settingDesired, input),
						markSolutionEnabled: setFlagStatus(input.settingDesired, input),
						forumGuidelinesConsentEnabled: setFlagStatus(input.settingDesired, input),
						sendMarkSolutionInstructionsInNewThreads : setFlagStatus(input.settingDesired, input)
					},
					inviteCode: updateInviteCode(input.settingDesired, input),
				},
			});
		}),
});


//return undefined if not the one to change
