import { ChannelSettingsMenu } from '~discord-bot/components/settings';
import { ApplyOptions } from '@sapphire/decorators';
import { Command, type ChatInputCommand } from '@sapphire/framework';
import {
	callAPI,
	callWithAllowedErrors,
	oneTimeStatusHandler,
} from '~discord-bot/utils/trpc';
import {
	SlashCommandBuilder,
	PermissionsBitField,
	type ChatInputCommandInteraction,
	ChannelType,
	GuildTextBasedChannel,
} from 'discord.js';
import React from 'react';
import {
	ephemeralReply,
	getCommandIds,
	getRootChannel,
	RootChannel,
} from '~discord-bot/utils/utils';
import {
	ChannelWithFlags,
	findLatestMessageInChannelAndThreads,
	getDefaultChannelWithFlags,
} from '@answeroverflow/db';
import { createMemberCtx } from '~discord-bot/utils/context';
import { toAOChannel } from '~discord-bot/utils/conversions';
import { guildTextChannelOnlyInteraction } from '~discord-bot/utils/conditions';

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
							findLatestMessageInChannelAndThreads(targetChannelToConfigure.id),
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
								channelWithFlags={channelSettings as ChannelWithFlags}
								targetChannel={targetChannelToConfigure as RootChannel}
								lastIndexedMessage={lastIndexedMessage}
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
