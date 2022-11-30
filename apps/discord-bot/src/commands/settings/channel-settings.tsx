import { ChatInputCommand, Command } from "@sapphire/framework";
import type { ChatInputCommandInteraction } from "discord.js";
import { ChannelSettingsMenu } from "@reacord/channel-settings";
import React from "react";
import { makeAPICaller, makeChannelUpsert } from "@trpc/create-caller";

export class ChannelSettingsCommand extends Command {
  // Register slash and context menu command
  public override registerApplicationCommands(registry: Command.Registry) {
    // Register slash command
    registry.registerChatInputCommand({
      name: "channel-settings",
      description: "Manage Channel Settings",
    });
  }
  public override async chatInputRun(
    interaction: ChatInputCommandInteraction,
    // eslint-disable-next-line no-unused-vars
    context: ChatInputCommand.RunContext
  ) {
    if (!interaction.channel) {
      return;
    }
    if (interaction.channel.isDMBased() || interaction.guild == null) {
      await interaction.reply("Does not work in DMs");
      return;
    }
    const api_caller = await makeAPICaller();
    const settings = await api_caller.channel_settings.upsert({
      data: {},
      channel: makeChannelUpsert(interaction.channel, interaction.guild),
    });
    this.container.reacord.ephemeralReply(
      interaction,
      <ChannelSettingsMenu channel={interaction.channel} settings={settings} />
    );
  }
}
