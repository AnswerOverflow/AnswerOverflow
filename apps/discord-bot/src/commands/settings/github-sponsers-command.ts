import { ApplyOptions } from '@sapphire/decorators';
import { Command, type ChatInputCommand } from '@sapphire/framework';
import { callAPI } from '~discord-bot/utils/trpc';
import {
	SlashCommandBuilder,
	type ChatInputCommandInteraction,
} from 'discord.js';
import { getCommandIds } from '~discord-bot/utils/utils';

@ApplyOptions<Command.Options>({
	name: 'link-github-sponsers',
	description: 'Link your github sponsers account',
})
export class GithubSponsersCommand extends Command {
	public override registerApplicationCommands(
		registry: ChatInputCommand.Registry,
	) {
		const ids = getCommandIds({
			local: '1106580945609437286',
			staging: 'stagingCommandId',
			production: 'prodCommandId',
		});
		registry.registerChatInputCommand(
			new SlashCommandBuilder()
				.setName(this.name)
				.setDescription(this.description),
			{
				idHints: ids,
			},
		);
	}

	public override async chatInputRun(
		interaction: ChatInputCommandInteraction,
	) {}
}
