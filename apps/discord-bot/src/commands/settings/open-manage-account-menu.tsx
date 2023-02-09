import { ApplyOptions } from "@sapphire/decorators";
import { Command, container, type ChatInputCommand } from "@sapphire/framework";
import { callAPI, makeEphemeralErrorHandler } from "~discord-bot/utils/trpc";
import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import React from "react";
import { ephemeralReply } from "~discord-bot/utils/utils";
import { getDefaultUserServerSettingsWithFlags } from "@answeroverflow/db";
import { TRPCError } from "@trpc/server";
import { createMemberCtx } from "~discord-bot/utils/context";

import { guildOnlyInteraction } from "~discord-bot/utils/conditions";
import { ManageAccountMenu } from "~discord-bot/components/manage-account-menu";

@ApplyOptions<Command.Options>({
  name: "manage-account",
  description: "Manage how Answer Overflow interacts with your account",
  runIn: ["GUILD_ANY"],
})
export class OpenManageAccountMenuCommand extends Command {
  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand(
      new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .setDMPermission(false)
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await guildOnlyInteraction(interaction, async ({ guild, member }) => {
      await callAPI({
        async ApiCall(router) {
          try {
            return await router.userServerSettings.byId({
              userId: member.id,
              serverId: guild.id,
            });
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
            result = getDefaultUserServerSettingsWithFlags({
              userId: interaction.user.id,
              serverId: guild.id,
            });
          }
          // TODO: Maybe assert that it matches that spec instead of casting
          const menu = <ManageAccountMenu initalSettings={result} />;
          ephemeralReply(container.reacord, menu, interaction);
        },
        ...makeEphemeralErrorHandler(interaction),
        getCtx: () => createMemberCtx(member),
      });
    });
  }
}
