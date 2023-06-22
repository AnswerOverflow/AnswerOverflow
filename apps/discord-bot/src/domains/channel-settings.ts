import { ChannelType, GuildMember } from 'discord.js';
import type { ChannelWithFlags } from '@answeroverflow/db';
import { callAPI, type TRPCStatusHandler } from '~discord-bot/utils/trpc';
import { toAOChannelWithServer } from '~discord-bot/utils/conversions';
import { createMemberCtx } from '~discord-bot/utils/context';
import {
	removeDiscordMarkdown,
	type RootChannel,
} from '~discord-bot/utils/utils';
import {
	FORUM_GUIDELINES_CONSENT_PROMPT,
	FORUM_GUIDELINES_CONSENT_MISSING_ERROR_MESSAGE,
} from '@answeroverflow/constants';

type ChannelSettingsUpdateAPICall = {
	member: GuildMember;
	channel: RootChannel;
	Error: (message: string) => unknown | Promise<unknown>;
} & Omit<TRPCStatusHandler<ChannelWithFlags>, 'Error'>;

export async function updateChannelIndexingEnabled({
	member,
	channel,
	enabled,
	Error,
	...statusHandlers
}: ChannelSettingsUpdateAPICall & { enabled: boolean }) {
	let newInviteCode: string | null = null;
	if (enabled) {
		if (
			!channel.permissionsFor(channel.client.id!)!.has('CreateInstantInvite')
		) {
			if (!channel.guild.vanityURLCode) {
				Error(
					"I don't have permission to create invites in this channel and there is no vanity URL set. Please give me permission to create invites or set a vanity URL.",
				);
				return;
			}
			newInviteCode = channel.guild.vanityURLCode;
		} else {
			const channelInvite = await channel.createInvite({
				maxAge: 0,
				maxUses: 0,
				reason: 'Channel indexing enabled invite',
				unique: false,
				temporary: false,
			});
			newInviteCode = channelInvite.code;
		}
	}
	return callAPI({
		apiCall: (router) =>
			router.channels.setIndexingEnabled({
				channel: toAOChannelWithServer(channel),
				enabled,
				inviteCode: newInviteCode ?? undefined,
			}),
		getCtx: () => createMemberCtx(member),
		Error: (error) => Error(error.message),
		...statusHandlers,
	});
}

export function doesTextHaveConsentPrompt(text: string) {
	const strippedGuidelines = removeDiscordMarkdown(text).replace(
		/[^A-Za-z0-9]/g,
		'',
	);
	return strippedGuidelines.includes(
		FORUM_GUIDELINES_CONSENT_PROMPT.replace(/[^A-Za-z0-9]/g, ''),
	);
}

export async function updateChannelForumGuidelinesConsentEnabled({
	member,
	channel,
	enabled,
	Error,
	...statusHandlers
}: ChannelSettingsUpdateAPICall & { enabled: boolean }) {
	if (channel.type === ChannelType.GuildForum && enabled) {
		if (!channel.topic || !doesTextHaveConsentPrompt(channel.topic))
			return Error(FORUM_GUIDELINES_CONSENT_MISSING_ERROR_MESSAGE);
	}
	return callAPI({
		apiCall: (router) =>
			router.channels.setForumGuidelinesConsentEnabled({
				channel: toAOChannelWithServer(channel),
				enabled,
			}),
		getCtx: () => createMemberCtx(member),
		Error: (error) => Error(error.message),
		...statusHandlers,
	});
}

export function updateMarkAsSolutionEnabled({
	member,
	channel,
	enabled,
	Error,
	...statusHandlers
}: ChannelSettingsUpdateAPICall & { enabled: boolean }) {
	return callAPI({
		apiCall: (router) =>
			router.channels.setMarkSolutionEnabled({
				channel: toAOChannelWithServer(channel),
				enabled,
			}),
		getCtx: () => createMemberCtx(member),
		Error: (error) => Error(error.message),
		...statusHandlers,
	});
}

export function updateSendMarkAsSolutionInstructionsEnabled({
	member,
	channel,
	enabled,
	Error,
	...statusHandlers
}: ChannelSettingsUpdateAPICall & { enabled: boolean }) {
	return callAPI({
		apiCall: (router) =>
			router.channels.setSendMarkSolutionInstructionsInNewThreadsEnabled({
				channel: toAOChannelWithServer(channel),
				enabled,
			}),
		getCtx: () => createMemberCtx(member),
		Error: (error) => Error(error.message),
		...statusHandlers,
	});
}

export function setSolutionTagId({
	member,
	channel,
	tagId,
	Error,
	...statusHandlers
}: ChannelSettingsUpdateAPICall & { tagId: string | null }) {
	return callAPI({
		apiCall: (router) =>
			router.channels.setSolutionTagId({
				channel: toAOChannelWithServer(channel),
				tagId,
			}),
		getCtx: () => createMemberCtx(member),
		Error: (error) => Error(error.message),
		...statusHandlers,
	});
}

export function updateAutoThreadEnabled({
	member,
	channel,
	enabled,
	Error,
	...statusHandlers
}: ChannelSettingsUpdateAPICall & { enabled: boolean }) {
	return callAPI({
		apiCall: (router) =>
			router.channels.setAutoThreadEnabled({
				channel: toAOChannelWithServer(channel),
				enabled,
			}),
		getCtx: () => createMemberCtx(member),
		Error: (error) => Error(error.message),
		...statusHandlers,
	});
}
