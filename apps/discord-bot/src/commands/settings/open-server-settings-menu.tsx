import { ApplyOptions } from '@sapphire/decorators';
import { Command, type ChatInputCommand } from '@sapphire/framework';
import {
	SlashCommandBuilder,
	type ChatInputCommandInteraction,
	PermissionsBitField,
} from 'discord.js';
import React from 'react';

import { getDefaultServerWithFlags } from '@answeroverflow/db';
import { ServerSettingsMenu } from '../../components/settings';
import { guildTextChannelOnlyInteraction } from '../../utils/conditions';
import { createMemberCtx } from '../../utils/context';
import { toAOServer } from '../../utils/conversions';
import {
	callAPI,
	callWithAllowedErrors,
	oneTimeStatusHandler,
} from '../../utils/trpc';
import { getCommandIds, ephemeralReply } from '../../utils/utils';

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
				.setDMPermission(false)
				.setDefaultMemberPermissions(
					PermissionsBitField.resolve('ManageGuild'),
				),
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
						const menu = <ServerSettingsMenu server={server} />;
						ephemeralReply(menu, interaction);
					},
				});
			},
		);
	}
}
