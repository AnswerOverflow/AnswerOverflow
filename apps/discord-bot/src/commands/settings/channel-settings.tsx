import { ChatInputCommand, Command } from "@sapphire/framework";
import type { ChatInputCommandInteraction } from "discord.js";
import { ChannelSettingsMenu } from "@reacord/channel-settings";
import React from "react";

export class ChannelSettingsCommand extends Command {
  // Register slash and context menu command
  public override registerApplicationCommands(registry: Command.Registry) {
    // Register slash command
    registry.registerChatInputCommand({
      name: "channel-settings",
      description: "Manage Channel Settings",
    });
  }
  public override chatInputRun(
    interaction: ChatInputCommandInteraction,
    // eslint-disable-next-line no-unused-vars
    context: ChatInputCommand.RunContext
  ) {
    this.container.reacord.reply(interaction, <ChannelSettingsMenu />);
  }
}
