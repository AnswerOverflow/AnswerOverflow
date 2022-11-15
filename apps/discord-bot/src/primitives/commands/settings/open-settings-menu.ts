import type { SettingsMenuView } from "@primitives/views/settings-view";
import { Command } from "@sapphire/framework";
import { findRootChannel } from "@utils/add-to-parse-data";
import type { GuildRootChannel, SettingsInteractionHandlerTypes } from "@utils/types";
import type { PermissionString } from "discord.js";
export abstract class OpenSettingsMenuCommand<
  T extends SettingsInteractionHandlerTypes
> extends Command {
  public abstract default_permission: PermissionString;
  // Register slash and context menu command
  public override registerApplicationCommands(registry: Command.Registry) {
    // Register slash command
    registry.registerChatInputCommand({
      name: this.name,
      description: this.description,
      defaultMemberPermissions: this.default_permission,
    });
  }

  // eslint-disable-next-line no-unused-vars
  public abstract getMenu(root_channel: GuildRootChannel): Promise<SettingsMenuView<T>>;

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
    const menu = await this.getMenu(root_channel);
    const view = await menu.getView();
    await interaction.reply({ ...view, ephemeral: true });
  }
}
