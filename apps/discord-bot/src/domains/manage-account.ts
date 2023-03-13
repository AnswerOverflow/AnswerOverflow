import { ButtonBuilder } from '@discordjs/builders';
import {
	APIButtonComponent,
	ButtonStyle,
	ChannelType,
	ComponentType,
	GuildMember,
	Message,
} from 'discord.js';
import {
	findChannelById,
	findServerById,
	UserServerSettingsWithFlags,
} from '@answeroverflow/db';
import { callAPI, TRPCStatusHandler } from '~discord-bot/utils/trpc';
import { toAODiscordAccount } from '~discord-bot/utils/conversions';
import { createMemberCtx } from '~discord-bot/utils/context';
import type { ConsentSource, ManageAccountSource } from '@answeroverflow/api';
import { CONSENT_BUTTON_LABEL } from '@answeroverflow/constants';
import { isHumanMessage } from '~discord-bot/utils/utils';

export const CONSENT_ACTION_PREFIX = 'consent';

export function makeConsentButtonData(source: ConsentSource) {
	return {
		label: CONSENT_BUTTON_LABEL,
		style: ButtonStyle.Success,
		custom_id: `${CONSENT_ACTION_PREFIX}-${source}`,
		type: ComponentType.Button,
	} as APIButtonComponent;
}

export function makeConsentButton(source: ConsentSource) {
	return new ButtonBuilder(makeConsentButtonData(source));
}

// TODO: Find a better return value than `null`
export async function provideConsentOnForumChannelMessage(message: Message) {
	const channel = message.channel;
	if (
		!(channel.isThread() && channel.parent?.type === ChannelType.GuildForum)
	) {
		return null;
	}
	if (!isHumanMessage(message)) {
		return null;
	}
	const channelSettings = await findChannelById(channel.parent.id);
	if (!channelSettings?.flags.forumGuidelinesConsentEnabled) {
		return null;
	}
	return updateUserConsent({
		member: message.member!,
		consentSource: 'forum-post-guidelines',
		canPubliclyDisplayMessages: true,
		Error(error) {
			console.log(error.message);
		},
	});
}

export async function provideConsentOnReadTheRules({
	oldMember,
	newMember,
}: {
	oldMember: GuildMember;
	newMember: GuildMember;
}) {
	const hasJustReadTheRules = oldMember.pending && !newMember.pending;
	if (!hasJustReadTheRules) return;

	const serverSettings = await findServerById(newMember.guild.id);

	if (!serverSettings?.flags.readTheRulesConsentEnabled) {
		return;
	}
	return updateUserConsent({
		member: newMember,
		consentSource: 'read-the-rules',
		canPubliclyDisplayMessages: true,
		Error(error) {
			console.log(error.message);
		},
	});
}

export async function updateUserConsent({
	member,
	consentSource,
	canPubliclyDisplayMessages,
	...statusHandlers
}: {
	member: GuildMember;
	consentSource: ConsentSource;
	canPubliclyDisplayMessages: boolean;
} & TRPCStatusHandler<UserServerSettingsWithFlags>) {
	return callAPI({
		apiCall: (router) =>
			router.userServerSettings.setConsentGranted({
				source: consentSource,
				data: {
					user: toAODiscordAccount(member.user),
					serverId: member.guild.id,
					flags: {
						canPubliclyDisplayMessages,
					},
				},
			}),
		getCtx: () => createMemberCtx(member),
		...statusHandlers,
	});
}

export async function updateUserServerIndexingEnabled({
	member,
	messageIndexingDisabled,
	source,
	...statusHandlers
}: {
	member: GuildMember;
	source: ManageAccountSource;
	messageIndexingDisabled: boolean;
} & TRPCStatusHandler<UserServerSettingsWithFlags>) {
	return callAPI({
		apiCall: (router) =>
			router.userServerSettings.setIndexingDisabled({
				data: {
					user: toAODiscordAccount(member.user),
					serverId: member.guild.id,
					flags: {
						messageIndexingDisabled,
					},
				},
				source,
			}),
		getCtx: () => createMemberCtx(member),
		...statusHandlers,
	});
}
