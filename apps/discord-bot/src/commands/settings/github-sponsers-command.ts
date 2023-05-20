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
import { getCommandIds } from '~discord-bot/utils/utils';
import { createMemberCtx } from '~discord-bot/utils/context';
import { guildTextChannelOnlyInteraction } from '~discord-bot/utils/conditions';

@ApplyOptions<Command.Options>({
	name: 'link-github-sponsors',
	description: 'Link your github sponsors account',
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
				.setDescription(this.description)
				.addStringOption((option) =>
					option
						.setName('github-sponsors-username')
						.setDescription('Your github sponsors username')
						.setRequired(true),
				),
			{
				idHints: ids,
			},
		);
	}

	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		const githubSponsorsUsername = interaction.options.getString(
			'github-sponsors-username',
		);

		await guildTextChannelOnlyInteraction(interaction, async ({ member }) => {
			await callAPI({
				async apiCall(router) {
					const server = await callWithAllowedErrors({
						call: () =>
							router.discordAccounts.linkGithubSponsors({
								avatar: member.user.avatar,
								name: member.user.username,
								id: member.id,
								githubSponsorsUsername: githubSponsorsUsername ?? '',
							}),
					});
					return server;
				},
				Ok: async () => {
					await interaction.reply(
						`Successfully linked to github sponsors username: ${
							githubSponsorsUsername ?? 'N/A'
						}`,
					);
				},
				Error: (error) => oneTimeStatusHandler(interaction, error.message),
				getCtx: () => createMemberCtx(member),
			});
		});
	}
}
