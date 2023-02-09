import { ApplyOptions } from "@sapphire/decorators";
import { ChatInputCommand, Command } from "@sapphire/framework";
import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from "discord.js";
import { createMemberCtx } from "~discord-bot/utils/context";
import { toAODiscordAccount } from "~discord-bot/utils/conversions";
import { callAPI, makeEphemeralErrorHandler } from "~discord-bot/utils/trpc";

@ApplyOptions<Command.Options>({
  name: "consent",
  description: "Publicly Display Messages On Answer Overflow",
  runIn: ["GUILD_ANY"],
  requiredUserPermissions: ["ManageGuild"],
})
export class ConsentCommand extends Command {
  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand(
      new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .setDMPermission(false)
    );
  }

  public override messageRun() {}
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await callAPI({
      ApiCall(router) {
        return router.userServerSettings.upsertWithDeps({
          user: toAODiscordAccount(interaction.user),
          serverId: interaction.guildId!,
          flags: {
            canPubliclyDisplayMessages: true,
          },
        });
      },
      getCtx: () => createMemberCtx(interaction.member as GuildMember),
      async Ok() {
        await interaction.reply({
          content: "Provided consent to display messsages publicly on Answer Overflow",
          ephemeral: true,
        });
      },
      ...makeEphemeralErrorHandler(interaction),
    });
  }
}
