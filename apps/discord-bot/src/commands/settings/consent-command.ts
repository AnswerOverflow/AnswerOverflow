import { ApplyOptions } from '@sapphire/decorators';
import { type ChatInputCommand, Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { updateUserConsent } from '~discord-bot/domains/manage-account';
import { guildTextChannelOnlyInteraction } from '~discord-bot/utils/conditions';
import { oneTimeStatusHandler } from '~discord-bot/utils/trpc';
import { getCommandIds } from '~discord-bot/utils/utils';

@ApplyOptions<Command.Options>({
	name: 'consent',
	description: 'Publicly Display Messages On Answer Overflow',
	runIn: ['GUILD_ANY'],
})
export class ConsentCommand extends Command {
	public override registerApplicationCommands(
		registry: ChatInputCommand.Registry,
	) {
		const ids = getCommandIds({
			local: '1073363500585468084',
			staging: '982084090251595786',
			production: '980880200566964264',
		});

		registry.registerChatInputCommand(
			new SlashCommandBuilder()
				.setName(this.name)
				.setDescription(this.description)
				.setDMPermission(false)
				.addBooleanOption((option) =>
					option
						.setName('consent')
						.setDescription(
							'Enable or disable publicly displaying your messages on Answer Overflow',
						),
				),
			{
				idHints: ids,
			},
		);
	}
	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		const consented = interaction.options.getBoolean('consent') ?? true;
		await guildTextChannelOnlyInteraction(interaction, async ({ member }) =>
			updateUserConsent({
				member,
				consentSource: 'slash-command',
				canPubliclyDisplayMessages: consented,
				async Error(error) {
					await oneTimeStatusHandler(interaction, error.message);
				},
				async Ok(result) {
					// TODO: Better messages
					await oneTimeStatusHandler(
						interaction,
						result.flags.canPubliclyDisplayMessages
							? `You have consented to publicly display your messages from indexed channels in ${member.guild.name} on Answer Overflow.`
							: `You have revoked your consent to publicly display your messages from indexed channels in ${member.guild.name} on Answer Overflow.`,
					);
				},
			}),
		);
	}
}
