import { ApplyOptions } from "@sapphire/decorators";
import { ChatInputCommand, Command } from "@sapphire/framework";
import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from "discord.js";
import { createMemberCtx } from "~discord-bot/utils/context";
import { toAODiscordAccount } from "~discord-bot/utils/conversions";
import { callApiWithEphemeralErrorHandler } from "~discord-bot/utils/trpc";

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
  public override async chatInputRun(
    interaction: ChatInputCommandInteraction,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: ChatInputCommand.RunContext
  ) {
    await callApiWithEphemeralErrorHandler(
      {
        ApiCall(router) {
          return router.user_server_settings.upsertWithDeps({
            user: toAODiscordAccount(interaction.user),
            server_id: interaction.guildId!,
            flags: {
              can_publicly_display_messages: true,
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
      },
      interaction
    );
  }
}
