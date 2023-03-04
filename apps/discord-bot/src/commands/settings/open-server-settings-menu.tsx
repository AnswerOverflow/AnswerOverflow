import { ApplyOptions } from "@sapphire/decorators";
import { Command, container, type ChatInputCommand } from "@sapphire/framework";
import { callAPI, callWithAllowedErrors, ephemeralStatusHandler } from "~discord-bot/utils/trpc";
import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import React from "react";
import { ephemeralReply } from "~discord-bot/utils/utils";
import { getDefaultServerWithFlags } from "@answeroverflow/db";
import { createMemberCtx } from "~discord-bot/utils/context";

import { guildTextChannelOnlyInteraction } from "~discord-bot/utils/conditions";
import { ServerSettingsMenu } from "~discord-bot/components/settings";
import { toAOServer } from "~discord-bot/utils/conversions";
import type { ServerAll } from "@answeroverflow/api";

@ApplyOptions<Command.Options>({
  name: "server-settings",
  description: "Manage your server's Answer Overflow settings",
  runIn: ["GUILD_ANY"],
})
export class OpenServerSettingsMenu extends Command {
  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand(
      new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .setDMPermission(false)
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await guildTextChannelOnlyInteraction(interaction, async ({ guild, member }) => {
      await callAPI({
        async apiCall(router) {
          const server = await callWithAllowedErrors({
            call: () => router.servers.byId(guild.id),
            allowedErrors: "NOT_FOUND",
          });
          return server;
        },
        getCtx: () => createMemberCtx(member),
        Error: (error) => ephemeralStatusHandler(interaction, error.message),
        Ok(server) {
          if (!server) {
            server = getDefaultServerWithFlags(toAOServer(guild));
          }
          const menu = <ServerSettingsMenu server={server as ServerAll} />;
          ephemeralReply(container.reacord, menu, interaction);
        },
      });
    });
  }
}
