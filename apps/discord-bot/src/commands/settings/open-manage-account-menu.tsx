import { ApplyOptions } from '@sapphire/decorators';
import { Command, type ChatInputCommand } from '@sapphire/framework';
import {
	callAPI,
	callWithAllowedErrors,
	onceTimeStatusHandler,
} from '~discord-bot/utils/trpc';
import {
	SlashCommandBuilder,
	type ChatInputCommandInteraction,
} from 'discord.js';
import React from 'react';
import { ephemeralReply, getCommandIds } from '~discord-bot/utils/utils';
import { getDefaultUserServerSettingsWithFlags } from '@answeroverflow/db';
import { createMemberCtx } from '~discord-bot/utils/context';

import { guildTextChannelOnlyInteraction } from '~discord-bot/utils/conditions';
import { ManageAccountMenu } from '~discord-bot/components/settings';

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
				await callAPI({
					async apiCall(router) {
						const userServerSettingsFetch = callWithAllowedErrors({
							call: () =>
								router.userServerSettings.byId({
									userId: member.id,
									serverId: guild.id,
								}),
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
							userServerSettings,
							isIgnoredAccount,
						};
					},
					Ok({ userServerSettings, isIgnoredAccount }) {
						if (!userServerSettings) {
							userServerSettings = getDefaultUserServerSettingsWithFlags({
								userId: interaction.user.id,
								serverId: guild.id,
							});
						}
						const menu = (
							<ManageAccountMenu
								initialSettings={userServerSettings}
								initialIsGloballyIgnored={isIgnoredAccount}
							/>
						);
						ephemeralReply(menu, interaction);
					},
					Error: (error) => onceTimeStatusHandler(interaction, error.message),
					getCtx: () => createMemberCtx(member),
				});
			},
		);
	}
}
