import { ChannelSettingsMenu } from "~discord-bot/components/channel-settings-menu";
import { ApplyOptions } from "@sapphire/decorators";
import { Command, container, type ChatInputCommand } from "@sapphire/framework";
import { callApiWithEphemeralErrorHandler } from "~discord-bot/utils/trpc";
import {
  SlashCommandBuilder,
  PermissionsBitField,
  type ChatInputCommandInteraction,
} from "discord.js";
import React from "react";
import { ephemeralReply } from "~discord-bot/utils/utils";
import { ChannelWithFlags, getDefaultChannelWithFlags } from "@answeroverflow/db";
import { TRPCError } from "@trpc/server";
import { createMemberCtx } from "~discord-bot/utils/context";
import { toAOChannel } from "~discord-bot/utils/conversions";

@ApplyOptions<Command.Options>({
  name: "channel-settings",
  description: "Configure channel settings",
  runIn: ["GUILD_ANY"],
  requiredUserPermissions: ["ManageGuild"],
})
export class ChannelSettingsCommand extends Command {
  public getSlashCommandBuilder(): SlashCommandBuilder {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description)
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionsBitField.resolve("ManageGuild"));
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand(this.getSlashCommandBuilder(), {
      idHints: ["1048055954618454026"],
    });
  }

  public override async chatInputRun(
    interaction: ChatInputCommandInteraction,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: ChatInputCommand.RunContext
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

    const parent_id = channel.isThread() ? channel.parentId : channel.id;
    if (!parent_id) return;

    await callApiWithEphemeralErrorHandler(
      {
        async ApiCall(router) {
          try {
            return router.channels.byId(parent_id);
          } catch (error) {
            if (error instanceof TRPCError && error.code == "NOT_FOUND") {
              return null;
            } else {
              throw error;
            }
          }
        },
        Ok(result) {
          if (!result) {
            result = getDefaultChannelWithFlags(toAOChannel(channel));
          }
          // TODO: Maybe assert that it matches that spec instead of casting
          const menu = (
            <ChannelSettingsMenu channel={channel} settings={result as ChannelWithFlags} />
          );
          ephemeralReply(container.reacord, menu, interaction);
        },
        getCtx: () => createMemberCtx(member),
      },
      interaction
    );
  }
}
