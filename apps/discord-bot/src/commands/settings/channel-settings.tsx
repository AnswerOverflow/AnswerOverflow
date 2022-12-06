import { getDefaultChannelSettings } from "@answeroverflow/api";
import { ChannelSettingsMenu } from "~components/channel-settings-menu";
import { ApplyOptions } from "@sapphire/decorators";
import { Command, container, type ChatInputCommand } from "@sapphire/framework";
import { callApiWithEphemeralErrorHandler } from "~utils/trpc";
import {
  SlashCommandBuilder,
  PermissionsBitField,
  type ChatInputCommandInteraction,
} from "discord.js";
import React from "react";

@ApplyOptions<Command.Options>({
  name: "channel-settings",
  description: "Configure channel settings",
})
export class ChannelSettingsCommand extends Command {
  public getSlashCommandBuilder(): SlashCommandBuilder {
    return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand(this.getSlashCommandBuilder(), {
      idHints: ["1048055954618454026"],
    });
  }

  public override async chatInputRun(
    interaction: ChatInputCommandInteraction,
    // eslint-disable-next-line no-unused-vars
    context: ChatInputCommand.RunContext
  ) {
    if (interaction.guild == null) {
      return;
    }
    if (!interaction.channel || interaction.channel.isDMBased()) {
      return;
    }
    if (interaction.channel.isVoiceBased()) {
      return;
    }
    const guild = interaction.guild;
    const channel = interaction.channel;
    const member = await guild.members.fetch(interaction.user.id);

    await callApiWithEphemeralErrorHandler(
      {
        async ApiCall(router) {
          return await router.channel_settings.byId(interaction.channelId);
        },
        Ok(result) {
          if (!result) {
            result = getDefaultChannelSettings(interaction.channelId);
          }
          container.reacord.ephemeralReply(
            interaction,
            <ChannelSettingsMenu channel={channel} settings={result} />
          );
        },
        member,
      },
      interaction
    );
  }
}
