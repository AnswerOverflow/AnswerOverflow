import { ChannelSettingsMenuView } from "@primitives/views/channel-settings-view";
import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import { findRootChannel } from "@utils/add-to-parse-data";

@ApplyOptions<Command.Options>({
  name: "channel-settings",
  description:
    "Adjust settings for the current channel. Allows you to enable indexing, mark as solution, etc.",
})
export class UserCommand extends Command {
  // Register slash and context menu command
  public override registerApplicationCommands(registry: Command.Registry) {
    // Register slash command
    registry.registerChatInputCommand({
      name: this.name,
      description: this.description,
    });
  }

  // slash command
  public async chatInputRun(interaction: Command.ChatInputInteraction) {
    const channel_settings = await this.container.answer_overflow.channel_settings.get({
      where: {
        channel_id: interaction.channelId,
      },
    });
    if (channel_settings?.bitfield == null) {
      await interaction.reply({ content: "Channel settings not found", ephemeral: true });
      return;
    }
    const root_channel = findRootChannel(interaction);
    if (root_channel == null) {
      await interaction.reply({
        content: "Could not find a channel to update settings for",
        ephemeral: true,
      });
      return;
    }
    const channel_settings_view = new ChannelSettingsMenuView(channel_settings, root_channel);
    const components = await channel_settings_view.getView();
    await interaction.reply({ ...components, ephemeral: true });
  }
}
