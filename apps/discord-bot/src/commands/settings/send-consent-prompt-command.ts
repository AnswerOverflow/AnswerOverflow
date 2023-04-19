import { ApplyOptions } from '@sapphire/decorators';
import { ChatInputCommand, Command } from '@sapphire/framework';
import {
	ChannelType,
	ChatInputCommandInteraction,
	GuildTextBasedChannel,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';
import { sendConsentPrompt } from '~discord-bot/domains/manage-account';
import { guildTextChannelOnlyInteraction } from '~discord-bot/utils/conditions';

@ApplyOptions<Command.Options>({
	runIn: ['GUILD_ANY'],
	requiredUserPermissions: ['ManageGuild'],
	name: 'send-consent-prompt',
	description: 'Send a consent prompt to the current channel',
})
export class SendMarkSolutionCommand extends Command {
	public override registerApplicationCommands(
		registry: ChatInputCommand.Registry,
	) {
		// TODO: Add id hints
		registry.registerChatInputCommand(
			new SlashCommandBuilder()
				.setName(this.name)
				.setDescription(this.description)
				.setDMPermission(false)
				.addChannelOption((option) =>
					option
						.setRequired(false)
						.setDescription(
							'Channel to send the consent prompt to. Defaults to the current channel.',
						)
						.setName('channel-to-send-in')
						.addChannelTypes(
							ChannelType.PublicThread,
							ChannelType.PrivateThread,
							ChannelType.GuildAnnouncement,
						),
				)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
		);
	}
	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		await guildTextChannelOnlyInteraction(interaction, async ({ channel }) => {
			const channelArg = interaction.options.getChannel('channel-to-send-in');

			// yes it isn't good to have as here, however, we verify the type in the command creation
			const targetChannel = (channelArg as GuildTextBasedChannel) ?? channel;

			await sendConsentPrompt({
				channel: targetChannel,
				interaction,
			});
		});
	}
}
