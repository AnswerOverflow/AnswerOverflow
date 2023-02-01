import { ApplyOptions } from "@sapphire/decorators";
import { ChatInputCommand, Command } from "@sapphire/framework";
import { ApplicationCommandType, ContextMenuCommandInteraction } from "discord.js";
import {
  addSolvedIndicatorToThread,
  checkIfCanMarkSolution,
  makeMarkSolutionResponse,
  MarkSolutionError,
} from "~discord-bot/utils/commands/mark-solution";

@ApplyOptions<Command.Options>({
  runIn: ["GUILD_ANY"],
})
export class MarkSolution extends Command {
  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerContextMenuCommand({
      name: "✅ Mark Solution",
      type: ApplicationCommandType.Message,
      dmPermission: false,
    });
  }
  public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
    if (!interaction.channel) return;
    const target_message = interaction.channel.messages.cache.get(interaction.targetId);
    if (!target_message) return;
    if (!interaction.member) return;
    try {
      const { parent_channel, question, solution, thread, channel_settings, server } =
        await checkIfCanMarkSolution(target_message, interaction.member);
      const { embed, components } = makeMarkSolutionResponse({
        question,
        solution,
        server_name: server.name,
        settings: channel_settings,
      });

      await interaction.reply({
        embeds: [embed],
        components: components ? [components] : undefined,
        ephemeral: false,
        target: solution,
      });
      await addSolvedIndicatorToThread(
        thread,
        parent_channel,
        question,
        channel_settings.solution_tag_id
      );
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
