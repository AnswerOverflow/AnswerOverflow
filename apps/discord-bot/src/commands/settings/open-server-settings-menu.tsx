import { ApplyOptions } from '@sapphire/decorators';
import { Command, type ChatInputCommand } from '@sapphire/framework';
import {
	callAPI,
	callWithAllowedErrors,
	oneTimeStatusHandler,
} from '~discord-bot/utils/trpc';
import {
	SlashCommandBuilder,
	type ChatInputCommandInteraction,
} from 'discord.js';
import React from 'react';
import { ephemeralReply, getCommandIds } from '~discord-bot/utils/utils';
import { getDefaultServerWithFlags } from '@answeroverflow/db';
import { createMemberCtx } from '~discord-bot/utils/context';

import { guildTextChannelOnlyInteraction } from '~discord-bot/utils/conditions';
import { ServerSettingsMenu } from '~discord-bot/components/settings';
import { toAOServer } from '~discord-bot/utils/conversions';
import type { ServerAll } from '@answeroverflow/api';

@ApplyOptions<Command.Options>({
	name: 'server-settings',
	description: "Manage your server's Answer Overflow settings",
	runIn: ['GUILD_ANY'],
	requiredUserPermissions: ['ManageGuild'],
})
export class OpenServerSettingsMenu extends Command {
	public override registerApplicationCommands(
		registry: ChatInputCommand.Registry,
	) {
		const ids = getCommandIds({
			local: '1079583356053897276',
			staging: '1081235686956482650',
			production: '1085766757647646750',
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
						const server = await callWithAllowedErrors({
							call: () => router.servers.byId(guild.id),
							allowedErrors: 'NOT_FOUND',
						});
						return server;
					},
					getCtx: () => createMemberCtx(member),
					Error: (error) => oneTimeStatusHandler(interaction, error.message),
					Ok(server) {
						if (!server) {
							server = getDefaultServerWithFlags(toAOServer(guild));
						}
						const menu = <ServerSettingsMenu server={server as ServerAll} />;
						ephemeralReply(menu, interaction);
					},
				});
			},
		);
	}
}
