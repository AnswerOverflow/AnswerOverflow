import { ApplyOptions } from '@sapphire/decorators';
import { type ChatInputCommand, Command } from '@sapphire/framework';

import { getDefaultUserServerSettingsWithFlags } from '@answeroverflow/core/utils/serverUtils';
import { UserServerSettingsWithFlags } from '@answeroverflow/core/utils/userServerSettingsUtils';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	type ChatInputCommandInteraction,
	ComponentType,
	EmbedBuilder,
	Guild,
	GuildMember,
	InteractionResponse,
	MessageActionRowComponentBuilder,
	SlashCommandBuilder,
} from 'discord.js';
import {
	updateUserConsent,
	updateUserServerIndexingEnabled,
} from '../../domains/manage-account';
import { guildTextChannelOnlyInteraction } from '../../utils/conditions';
import { createMemberCtx } from '../../utils/context';
import {
	callAPI,
	callWithAllowedErrors,
	oneTimeStatusHandler,
} from '../../utils/trpc';
import { getCommandIds } from '../../utils/utils';

export const menuButtonIds = {
	consentButton: 'consent-button',
	revokeConsentButton: 'revoke-consent-button',
	enableMessageIndexingButton: 'enable-message-indexing-button',
	disableMessageIndexingButton: 'disable-message-indexing-button',
	ignoreGloballyButton: 'ignore-globally-button',
	unignoreGloballyButton: 'unignore-globally-button',
} as const;

export function generateManageAccountEmbed(state: {
	userServerSettings: UserServerSettingsWithFlags;
	isIgnoredAccount: boolean;
}): EmbedBuilder {
	const embed = new EmbedBuilder()
		.setTitle('Manage your account settings')
		.setDescription(
			state.isIgnoredAccount
				? 'Your account is currently being ignored globally. You can stop ignoring it by clicking the button below.'
				: 'Here, you can manage how Answer Overflow interacts with your account.',
		);
	return embed;
}

export function generateManageAccountActionRow(state: {
	userServerSettings: UserServerSettingsWithFlags;
	isIgnoredAccount: boolean;
}): ActionRowBuilder<MessageActionRowComponentBuilder> {
	const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>();

	if (state.isIgnoredAccount) {
		actionRow.addComponents(
			new ButtonBuilder()
				.setCustomId(menuButtonIds.unignoreGloballyButton)
				.setLabel('Stop ignoring globally')
				.setStyle(ButtonStyle.Success),
		);
	} else {
		if (state.userServerSettings.flags.canPubliclyDisplayMessages) {
			actionRow.addComponents(
				new ButtonBuilder()
					.setCustomId(menuButtonIds.revokeConsentButton)
					.setLabel('Disable showing my messages on Answer Overflow')
					.setStyle(ButtonStyle.Danger),
			);
		} else {
			actionRow.addComponents(
				new ButtonBuilder()
					.setCustomId(menuButtonIds.consentButton)
					.setLabel('Publicly display my messages on Answer Overflow')
					.setStyle(ButtonStyle.Success),
			);
		}

		if (state.userServerSettings.flags.messageIndexingDisabled) {
			actionRow.addComponents(
				new ButtonBuilder()
					.setCustomId(menuButtonIds.enableMessageIndexingButton)
					.setLabel('Enable indexing my messages')
					.setStyle(ButtonStyle.Success),
			);
		} else {
			actionRow.addComponents(
				new ButtonBuilder()
					.setCustomId(menuButtonIds.disableMessageIndexingButton)
					.setLabel('Disable indexing my messages')
					.setStyle(ButtonStyle.Danger),
			);
		}

		actionRow.addComponents(
			new ButtonBuilder()
				.setCustomId(menuButtonIds.ignoreGloballyButton)
				.setLabel('Ignore globally')
				.setStyle(ButtonStyle.Danger),
		);
	}

	return actionRow;
}
@ApplyOptions<Command.Options>({
	name: 'manage-account',
	description: 'Manage how Answer Overflow interacts with your account',
	runIn: ['GUILD_ANY'],
})
export class OpenManageAccountMenuCommand extends Command {
	public override registerApplicationCommands(
		registry: ChatInputCommand.Registry,
	) {
		const ids = getCommandIds({
			local: '1073363501659201646',
			staging: '1081235691649904741',
			production: '1013627262068859000',
		});
		registry.registerChatInputCommand(
			new SlashCommandBuilder()
				.setName(this.name)
				.setDescription(this.description)
				.setDMPermission(false),
			{
				idHints: ids,
			},
		);
	}

	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		await guildTextChannelOnlyInteraction(
			interaction,
			async ({ guild, member }) => {
				await this.handleManageAccount(interaction, guild, member);
			},
		);
	}

	private async handleManageAccount(
		interaction: ChatInputCommandInteraction,
		guild: Guild,
		member: GuildMember,
	) {
		await callAPI({
			async apiCall(router) {
				const userServerSettingsFetch = callWithAllowedErrors({
					call: () => router.userServerSettings.byId(guild.id),
					allowedErrors: 'NOT_FOUND',
				});
				const isIgnoredAccountFetch = router.discordAccounts.checkIfIgnored(
					member.id,
				);
				const [userServerSettings, isIgnoredAccount] = await Promise.all([
					userServerSettingsFetch,
					isIgnoredAccountFetch,
				]);
				return {
					userServerSettings:
						userServerSettings ||
						getDefaultUserServerSettingsWithFlags({
							userId: member.id,
							serverId: guild.id,
						}),
					isIgnoredAccount,
				};
			},
			Error: (error) => oneTimeStatusHandler(interaction, error.message),
			getCtx: () => createMemberCtx(member),
			Ok: async (state) => {
				const { embed, actionRow } = this.generateEmbedAndActionRow(state);
				const reply = await interaction.reply({
					embeds: [embed],
					components: [actionRow],
					ephemeral: true,
				});
				this.handleButtonInteractions(reply, interaction, guild, member, state);
			},
		});
	}

	private generateEmbedAndActionRow(state: {
		userServerSettings: UserServerSettingsWithFlags;
		isIgnoredAccount: boolean;
	}) {
		const embed = generateManageAccountEmbed(state);
		const actionRow = generateManageAccountActionRow(state);
		return { embed, actionRow };
	}

	private async handleButtonInteractions(
		reply: InteractionResponse,
		interaction: ChatInputCommandInteraction,
		guild: Guild,
		member: GuildMember,
		state: {
			userServerSettings: UserServerSettingsWithFlags;
			isIgnoredAccount: boolean;
		},
	) {
		const collector = reply.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 5 * 60 * 1000,
			filter: (i) =>
				i.user.id === interaction.user.id &&
				Object.values(menuButtonIds).includes(i.customId),
		});

		collector.on('collect', async (followup) => {
			const customId =
				followup.customId as (typeof menuButtonIds)[keyof typeof menuButtonIds];
			await this.handleButtonPress(customId, member, state);
			const { embed, actionRow } = this.generateEmbedAndActionRow(state);
			await followup.update({ embeds: [embed], components: [actionRow] });
		});
	}

	private async handleButtonPress(
		customId: (typeof menuButtonIds)[keyof typeof menuButtonIds],
		member: GuildMember,
		state: {
			userServerSettings: UserServerSettingsWithFlags;
			isIgnoredAccount: boolean;
		},
	) {
		switch (customId) {
			case menuButtonIds.consentButton:
			case menuButtonIds.revokeConsentButton:
				await updateUserConsent({
					member,
					consentSource: 'manage-account-menu',
					canPubliclyDisplayMessages: customId === menuButtonIds.consentButton,
				});
				state.userServerSettings.flags.canPubliclyDisplayMessages =
					customId === menuButtonIds.consentButton;
				break;
			case menuButtonIds.enableMessageIndexingButton:
			case menuButtonIds.disableMessageIndexingButton:
				await updateUserServerIndexingEnabled({
					member,
					messageIndexingDisabled:
						customId === menuButtonIds.disableMessageIndexingButton,
					source: 'manage-account-menu',
				});
				state.userServerSettings.flags.messageIndexingDisabled =
					customId === menuButtonIds.disableMessageIndexingButton;
				break;
			case menuButtonIds.ignoreGloballyButton:
			case menuButtonIds.unignoreGloballyButton:
				await callAPI({
					apiCall: (router) =>
						customId === menuButtonIds.ignoreGloballyButton
							? router.discordAccounts.delete(member.id)
							: router.discordAccounts.undelete(member.id),
					getCtx: () => createMemberCtx(member),
					Error: (error) => console.error(error.message),
					Ok: () => {},
				});
				state.isIgnoredAccount =
					customId === menuButtonIds.ignoreGloballyButton;
				break;
		}
	}
}
