import { ApplyOptions } from '@sapphire/decorators';
import { type ChatInputCommand, Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { guildTextChannelOnlyInteraction } from '~discord-bot/utils/conditions';
import { getCommandIds } from '~discord-bot/utils/utils';
import { oneTimeStatusHandler } from '~discord-bot/utils/trpc';
@ApplyOptions<Command.Options>({
    name: 'feedback',
    description: 'command to give feedback',
    runIn: ['GUILD_ANY'],
})
export class ConsentCommand extends Command {
    public override registerApplicationCommands(
        registry: ChatInputCommand.Registry,
    ) {
		// const ids = getCommandIds({
		// 	local: '',
		// 	staging: '',
		// 	production: '',
		// });
        registry.registerChatInputCommand(
            new SlashCommandBuilder()
                .setName(this.name)
                .setDescription(this.description)
				.setDMPermission(false)
                .addStringOption(option =>
                    option
                        .setName('message')
                        .setDescription('Your feedback')
                        .setRequired(true)
                )
                .addBooleanOption(option =>
                    option
                        .setName('follow-up')
                        .setDescription('Can we follow up with you?')
                ),
				// {
                //     idHints: ids,
                // }
        );
    }
    public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		const message = interaction.options.getString('message');
		const followUp = interaction.options.getBoolean('follow-up') ?? true
		await guildTextChannelOnlyInteraction(interaction, async ({ member }) => {
			await oneTimeStatusHandler(
				interaction,
				"the feedback has been recieved")
		})
    }
}
