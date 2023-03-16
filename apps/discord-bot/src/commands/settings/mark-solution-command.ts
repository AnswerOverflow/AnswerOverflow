import { ApplyOptions } from '@sapphire/decorators';
import { ChatInputCommand, Command } from '@sapphire/framework';
import {
	ApplicationCommandType,
	ContextMenuCommandInteraction,
} from 'discord.js';
import {
	markAsSolved,
	MarkSolutionError,
} from '~discord-bot/domains/mark-solution';
import { getCommandIds } from '~discord-bot/utils/utils';

@ApplyOptions<Command.Options>({
	runIn: ['GUILD_ANY'],
})
export class MarkSolution extends Command {
	public override registerApplicationCommands(
		registry: ChatInputCommand.Registry,
	) {
		const ids = getCommandIds({
			local: '1073363502732955739',
			staging: '1081235688038613072',
			production: '999153895114821692',
		});
		registry.registerContextMenuCommand(
			{
				name: '✅ Mark Solution',
				type: ApplicationCommandType.Message,
				dmPermission: false,
			},
			{
				idHints: ids,
			},
		);
	}
	public override async contextMenuRun(
		interaction: ContextMenuCommandInteraction,
	) {
		if (!interaction.channel) return;
		const targetMessage = await interaction.channel.messages.fetch(
			interaction.targetId,
		);
		if (!targetMessage) return;
		if (!interaction.member) return;
		try {
			const { embed, components } = await markAsSolved(
				targetMessage,
				interaction.user,
			);
			await interaction.reply({
				embeds: [embed],
				components: components ? [components] : undefined,
				ephemeral: false,
			});
		} catch (error) {
			if (error instanceof MarkSolutionError)
				await interaction.reply({ content: error.message, ephemeral: true });
			else throw error;
		}
		// Send the mark solution response
		// Add solved indicator to the question message
		// Track analytics
	}
}
