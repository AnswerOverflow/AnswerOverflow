import { ApplyOptions } from '@sapphire/decorators';
import { type ChatInputCommand, Command } from '@sapphire/framework';
import {
	ActionRowBuilder,
	ChatInputCommandInteraction,
	EmbedBuilder,
	MessageActionRowComponentBuilder,
	SlashCommandBuilder,
} from 'discord.js';
import { getCommandIds } from '~discord-bot/utils/utils';
import { PostHog } from '@typelytics/posthog';
import { events } from '../../events';
import { sharedEnvs } from '@answeroverflow/env/shared';
import { makeDismissButton } from '~discord-bot/domains/dismiss-button';

const posthog = new PostHog({
	events: events,
	apiKey: sharedEnvs.POSTHOG_PERSONAL_API_KEY!,
	projectId: sharedEnvs.POSTHOG_PROJECT_ID!.toString(),
});

const medalMap = new Map<number, string>([
	[0, ':first_place:'],
	[1, ':second_place:'],
	[2, ':third_place:'],
]);

@ApplyOptions<Command.Options>({
	name: 'leaderboard',
	description: 'See who has solved the most questions in the server.',
	runIn: ['GUILD_ANY'],
})
export class LeaderboardCommand extends Command {
	public override registerApplicationCommands(
		registry: ChatInputCommand.Registry,
	) {
		const ids = getCommandIds({
			// local: '1073363500585468084',
			// staging: '982084090251595786',
			// production: '980880200566964264',
		});

		registry.registerChatInputCommand(
			new SlashCommandBuilder()
				.setName(this.name)
				.setDescription(this.description)
				.setDMPermission(false)
				.addBooleanOption((option) =>
					option
						.setName('ephemeral')
						.setDescription('Show the leaderboard only to you.'),
				),
			{
				idHints: ids,
			},
		);
	}
	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		const isEphemeral = interaction.options.getBoolean('ephemeral') ?? false;
		await interaction.deferReply({
			ephemeral: isEphemeral,
		});
		const topUsers = await posthog
			.query()
			.addSeries('Solved Question', {
				sampling: 'total',
			})
			.addFilterGroup({
				match: 'AND',
				filters: {
					compare: 'exact',
					value: interaction.guildId,
					property: 'Server Id',
				},
			})
			.execute({
				type: 'table',
				date_from: 'All time',
				breakdown_hide_other_aggregation: true,
				breakdown: 'Question Solver Id',
			})
			.then((x) => x.results['Solved Question']);

		const keys = Object.keys(topUsers);
		const toDisplay = await Promise.all(
			keys.map((key) => {
				const entry = topUsers[key];
				if (!entry) {
					return null;
				}
				return {
					user: key,
					questionsSolved: entry.aggregated_value,
				};
			}),
		);

		const embedDescription = toDisplay
			.filter((x) => x !== null)
			.slice(0, 10)
			.sort((a, b) => b!.questionsSolved - a!.questionsSolved)
			.map((x, i) => {
				const user = x!.user;
				const questionsSolved = x!.questionsSolved;
				const medal = medalMap.get(i);
				const msg = `<@${user}> - ${questionsSolved} solved`;
				const position = i + 1;
				const spacer = position < 10 ? '\u200B \u200B \u200B' : '\u200B ';
				return medal
					? `${medal}: ${msg}`
					: ` ${spacer} ${position}\u200B: ${msg}`;
			})
			.join('\n');

		const embed = new EmbedBuilder()
			.setTitle('Leaderboard - Questions Solved')
			.setDescription(embedDescription)
			.setColor('#89D3F8')
			.setTimestamp();

		const components = isEphemeral
			? []
			: [
					new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
						makeDismissButton(interaction.user.id),
					),
			  ];
		await interaction.editReply({
			embeds: [embed],
			components,
		});
	}
}
