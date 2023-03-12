import { ChannelSettingsMenu } from '~discord-bot/components/settings';
import { ApplyOptions } from '@sapphire/decorators';
import { Command, type ChatInputCommand } from '@sapphire/framework';
import {
	callAPI,
	callWithAllowedErrors,
	ephemeralStatusHandler,
} from '~discord-bot/utils/trpc';
import {
	SlashCommandBuilder,
	PermissionsBitField,
	type ChatInputCommandInteraction,
} from 'discord.js';
import React from 'react';
import { ephemeralReply } from '~discord-bot/utils/utils';
import {
	ChannelWithFlags,
	getDefaultChannelWithFlags,
} from '@answeroverflow/db';
import { createMemberCtx } from '~discord-bot/utils/context';
import { toAOChannel } from '~discord-bot/utils/conversions';
import { guildTextChannelOnlyInteraction } from '~discord-bot/utils/conditions';

@ApplyOptions<Command.Options>({
	name: 'channel-settings',
	description: 'Configure channel settings',
	runIn: ['GUILD_ANY'],
	requiredUserPermissions: ['ManageGuild'],
})
export class ChannelSettingsCommand extends Command {
	public override registerApplicationCommands(
		registry: ChatInputCommand.Registry,
	) {
		registry.registerChatInputCommand(
			new SlashCommandBuilder()
				.setName(this.name)
				.setDescription(this.description)
				.setDMPermission(false)
				.setDefaultMemberPermissions(
					PermissionsBitField.resolve('ManageGuild'),
				),
			{
				idHints: ['1048055954618454026'],
			},
		);
	}

	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		await guildTextChannelOnlyInteraction(
			interaction,
			async ({ channel, member }) => {
				const targetChannelIdToChangeSettingsFor = channel.isThread()
					? channel.parentId
					: channel.id;
				if (!targetChannelIdToChangeSettingsFor) return; // TODO: Send message to user

				await callAPI({
					async apiCall(router) {
						return callWithAllowedErrors({
							call: () =>
								router.channels.byId(targetChannelIdToChangeSettingsFor),
							allowedErrors: 'NOT_FOUND',
						});
					},
					Ok(result) {
						if (!result) {
							result = getDefaultChannelWithFlags(toAOChannel(channel));
						}
						// TODO: Maybe assert that it matches that spec instead of casting
						const menu = (
							<ChannelSettingsMenu
								channelMenuIsIn={channel}
								channelWithFlags={result as ChannelWithFlags}
							/>
						);
						ephemeralReply(menu, interaction);
					},
					Error: (error) => ephemeralStatusHandler(interaction, error.message),
					getCtx: () => createMemberCtx(member),
				});
			},
		);
	}
}
