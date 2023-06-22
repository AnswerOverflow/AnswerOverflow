import { ButtonBuilder } from '@discordjs/builders';
import {
	type APIButtonComponent,
	ActionRowBuilder,
	ButtonStyle,
	ChannelType,
	ComponentType,
	EmbedBuilder,
	GuildMember,
	type GuildTextBasedChannel,
	Message,
	type MessageActionRowComponentBuilder,
} from 'discord.js';
import {
	type ChannelWithFlags,
	findServerById,
	type UserServerSettingsWithFlags,
} from '@answeroverflow/db';
import {
	callAPI,
	oneTimeStatusHandler,
	type TRPCStatusHandler,
} from '~discord-bot/utils/trpc';
import { toAODiscordAccount } from '~discord-bot/utils/conversions';
import { createMemberCtx } from '~discord-bot/utils/context';
import {
	type ConsentSource,
	CONSENT_SOURCES,
	type ManageAccountSource,
} from '@answeroverflow/api';
import { CONSENT_BUTTON_LABEL, WEBSITE_URL } from '@answeroverflow/constants';
import { makeRequestForConsentString } from './mark-solution';
import type { RendererableInteractions } from '@answeroverflow/discordjs-react';
import { isHumanMessage } from '~discord-bot/utils/utils';
import {
	memberToAnalyticsUser,
	trackDiscordEvent,
} from '~discord-bot/utils/analytics';

export const CONSENT_ACTION_PREFIX = 'consent';

const consentButtonInteractionParseErrors = [
	'no-consent-prefix',
	'no-consent-source',
	'invalid-consent-source',
] as const;
export class ConsentButtonInteractionParseError extends Error {
	constructor(reason: (typeof consentButtonInteractionParseErrors)[number]) {
		super(reason);
	}
}

export function parseConsentButtonInteraction(customId: string): ConsentSource {
	const splitInteractionId = customId.split(':');
	const action = splitInteractionId[0];
	const source = splitInteractionId[1];
	if (action !== CONSENT_ACTION_PREFIX) {
		// Legacy consent button ids
		switch (action) {
			case 'consent_button':
				return 'manually-posted-prompt';
			case 'consent_button_mark_solution':
				return 'mark-solution-response';
			case 'manage_account_consent_button':
				return 'manage-account-menu';
		}
		throw new ConsentButtonInteractionParseError('no-consent-prefix');
	}
	if (!source) {
		throw new ConsentButtonInteractionParseError('no-consent-source');
	}
	if (!CONSENT_SOURCES.includes(source as ConsentSource)) {
		throw new ConsentButtonInteractionParseError('invalid-consent-source');
	}
	return source as ConsentSource;
}

export function makeConsentButtonData(source: ConsentSource) {
	return {
		label: CONSENT_BUTTON_LABEL,
		style: ButtonStyle.Success,
		custom_id: `${CONSENT_ACTION_PREFIX}:${source}`,
		type: ComponentType.Button,
	} as APIButtonComponent;
}

export function makeConsentButton(source: ConsentSource) {
	return new ButtonBuilder(makeConsentButtonData(source));
}

// TODO: Find a better return value than `null`
export async function provideConsentOnForumChannelMessage(
	message: Message,
	channelSettings: ChannelWithFlags,
) {
	if (!channelSettings?.flags.forumGuidelinesConsentEnabled) {
		return null;
	}
	const channel = message.channel;
	if (
		!(channel.isThread() && channel.parent?.type === ChannelType.GuildForum)
	) {
		return null;
	}
	if (!isHumanMessage(message) && !message.author.bot) {
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
		Error(error, messageWithCode) {
			statusHandlers.Error?.(error, messageWithCode);
		},
		Ok(result) {
			statusHandlers.Ok?.(result);
			trackDiscordEvent('User Grant Consent', {
				...memberToAnalyticsUser('User', member),
				'Answer Overflow Account Id': member.id,
				'Consent Source': consentSource,
			});
		},
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

export async function sendConsentPrompt(input: {
	channel: GuildTextBasedChannel;
	interaction: RendererableInteractions;
}) {
	const { channel, interaction } = input;
	if (!interaction.memberPermissions?.has('ManageGuild')) {
		await oneTimeStatusHandler(
			interaction,
			'You are missing permissions to send a consent prompt. You need the `Manage Server` permission.',
		);
		return;
	}
	if (
		!interaction.appPermissions?.has('SendMessages') ||
		!interaction.appPermissions?.has('EmbedLinks')
	) {
		await oneTimeStatusHandler(
			interaction,
			'I am missing permissions to send a consent prompt. I need the `Send Messages` and `Embed Links` permissions.',
		);
		return;
	}
	const consentEmbed = new EmbedBuilder();
	consentEmbed.setDescription(makeRequestForConsentString(channel.guild.name));
	consentEmbed.addFields({
		name: 'Learn more',
		value: WEBSITE_URL,
	});
	const components = new ActionRowBuilder<MessageActionRowComponentBuilder>();
	components.addComponents(makeConsentButton('manually-posted-prompt'));
	await channel.send({
		embeds: [consentEmbed],
		components: [components],
	});
	await oneTimeStatusHandler(interaction, 'Consent prompt sent!');
}
