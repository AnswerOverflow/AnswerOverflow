import { ApplyOptions } from '@sapphire/decorators';
import { Command, type ChatInputCommand } from '@sapphire/framework';

import {
	SlashCommandBuilder,
	PermissionsBitField,
	type ChatInputCommandInteraction,
	ChannelType,
	type GuildTextBasedChannel,
} from 'discord.js';
import React from 'react';

import { getDefaultChannelWithFlags } from '@answeroverflow/db';
import { ChannelSettingsMenu } from '../../components/settings';
import { guildTextChannelOnlyInteraction } from '../../utils/conditions';
import { createMemberCtx } from '../../utils/context';
import { toAOChannel } from '../../utils/conversions';
import {
	oneTimeStatusHandler,
	callAPI,
	callWithAllowedErrors,
} from '../../utils/trpc';
import {
	getCommandIds,
	getRootChannel,
	RootChannel,
	ephemeralReply,
} from '../../utils/utils';

const allowedTypes = [
	ChannelType.GuildForum,
	ChannelType.GuildText,
	ChannelType.GuildAnnouncement,
] as const;

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
		const ids = getCommandIds({
			local: '1073363499532701806',
			staging: '1081235690089623672',
			production: '1015112483570188348',
		});
		registry.registerChatInputCommand(
			new SlashCommandBuilder()
				.setName(this.name)
				.setDescription(this.description)
				.setDMPermission(false)
				.setDefaultMemberPermissions(PermissionsBitField.resolve('ManageGuild'))
				.addChannelOption((option) =>
					option
						.setRequired(false)
						.setDescription(
							'Channel to change the settings of. Default is the current channel (or parent channel if in a thread)',
						)
						.setName('channel-to-configure')
						.addChannelTypes(
							ChannelType.GuildForum,
							ChannelType.GuildText,
							ChannelType.GuildAnnouncement,
						),
				),
			{
				idHints: ids,
			},
		);
	}

	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		await guildTextChannelOnlyInteraction(
			interaction,
			async ({ channel: interactionChannel, member }) => {
				const channelArg = interaction.options.getChannel(
					'channel-to-configure',
				);

				const targetChannelToConfigure = channelArg
					? this.container.client.channels.cache.get(channelArg.id)
					: getRootChannel(interactionChannel);

				if (!targetChannelToConfigure) {
					await oneTimeStatusHandler(
						interaction,
						'Could not find channel to configure',
					);
					return;
				}
				if (!allowedTypes.includes(targetChannelToConfigure.type)) {
					await oneTimeStatusHandler(
						interaction,
						'Channel to configure is not a valid type',
					);
					return;
				}

				await callAPI({
					async apiCall(router) {
						const [channelSettings, lastIndexedMessage] = await Promise.all([
							callWithAllowedErrors({
								call: () => router.channels.byId(targetChannelToConfigure.id),
								allowedErrors: 'NOT_FOUND',
							}),
							undefined,
						]);
						return { channelSettings, lastIndexedMessage };
					},
					Ok({ channelSettings, lastIndexedMessage }) {
						if (!channelSettings) {
							channelSettings = getDefaultChannelWithFlags(
								toAOChannel(targetChannelToConfigure as GuildTextBasedChannel),
							);
						}
						// TODO: Maybe assert that it matches that spec instead of casting
						const menu = (
							<ChannelSettingsMenu
								channelWithFlags={channelSettings}
								targetChannel={targetChannelToConfigure as RootChannel}
								lastIndexedMessage={lastIndexedMessage ?? null}
							/>
						);
						ephemeralReply(menu, interaction);
					},
					Error: (error) => oneTimeStatusHandler(interaction, error.message),
					getCtx: () => createMemberCtx(member),
				});
			},
		);
	}
}
