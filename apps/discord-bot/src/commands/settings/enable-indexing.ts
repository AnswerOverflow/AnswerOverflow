import { InteractionExecuteError } from "@primitives/interactions/interaction-executor";
import { DisableIndexingInteractionHandler } from "@primitives/interactions/settings/channel-settings/implementations/disable-indexing-interaction-handler";
import { EnableIndexingInteractionHandler } from "@primitives/interactions/settings/channel-settings/implementations/enable-indexing-interaction-handler";
import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import { findRootChannel } from "@utils/add-to-parse-data";

@ApplyOptions<Command.Options>({
  name: "indexing",
  description: "Enable indexing for this channel",
})
export class EnableIndexingCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    // Register slash command
    registry.registerChatInputCommand((builder) => {
      return builder
        .setName(this.name)
        .setDescription(this.description)
        .addBooleanOption((option) =>
          option
            .setName("indexing")
            .setDescription("Enable indexing for this channel")
            .setRequired(true)
        );
    });
  }

  public async chatInputRun(interaction: Command.ChatInputInteraction) {
    const root_channel = findRootChannel(interaction);
    if (root_channel == null) {
      await interaction.reply({
        content: "Could not find a channel to update settings for",
        ephemeral: true,
      });
    }
    const new_enabled = interaction.options.getBoolean("indexing", true);
    if (new_enabled) {
      try {
        await new EnableIndexingInteractionHandler(interaction).execute();
      } catch (error) {
        if (error instanceof InteractionExecuteError) {
          await interaction.reply({
            content: error.message,
            ephemeral: true,
          });
        }
      }
      await interaction.reply({ content: "Enabled indexing", ephemeral: true });
    } else {
      try {
        await new DisableIndexingInteractionHandler(interaction).execute();
      } catch (error) {
        if (error instanceof InteractionExecuteError) {
          await interaction.reply({
            content: error.message,
            ephemeral: true,
          });
        }
      }
      await interaction.reply({ content: "Disabled Indexing", ephemeral: true });
    }
  }
}
