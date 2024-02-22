import { ApplyOptions } from '@sapphire/decorators';
import { type ChatInputCommand, Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { getCommandIds } from '~discord-bot/utils/utils';
import { PostHog } from '@typelytics/posthog';
import { events } from '../../events';
import { sharedEnvs } from '@answeroverflow/env/shared';

const posthog = new PostHog({
  events: events,
  apiKey: sharedEnvs.POSTHOG_PERSONAL_API_KEY!,
  projectId: sharedEnvs.POSTHOG_PROJECT_ID!.toString(),
});

@ApplyOptions<Command.Options>({
  name: 'leaderboard',
  description: 'See who has solved the most questions in the server.',
  runIn: ['GUILD_ANY'],
})
export class ConsentCommand extends Command {
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
    await interaction.deferReply({
      ephemeral: interaction.options.getBoolean('ephemeral') ?? false,
    });
    const topUsers = await posthog
      .query()
      .addSeries('Solved Question', {
        sampling: 'total',
      })
      // .addFilterGroup({
      // 	match: 'AND',
      // 	filters: {
      // 		compare: 'exact',
      // 		value: interaction.guildId,
      // 		property: 'Server Id',
      // 	},
      // })
      .execute({
        type: 'table',
        // date_from: 'All time',
        // breakdown_hide_other_aggregation: true,
        // breakdown: 'Question Solver Id',
      });
    console.log(topUsers.results);
    await interaction.editReply('Leaderboard goes here');
  }
}
