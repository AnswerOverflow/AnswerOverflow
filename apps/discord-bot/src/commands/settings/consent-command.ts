import { ApplyOptions } from "@sapphire/decorators";
import { ChatInputCommand, Command } from "@sapphire/framework";
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { updateUserConsent } from "~discord-bot/domains/consent";
import { guildTextChannelOnlyInteraction } from "~discord-bot/utils/conditions";
import { ephemeralStatusHandler } from "~discord-bot/utils/trpc";

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
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await guildTextChannelOnlyInteraction(interaction, async ({ member, guild }) => {
      await updateUserConsent({
        member,
        canPubliclyDisplayMessages: true,
        consentSource: "slash-command",
        async onConsentStatusChange() {
          await interaction.reply({
            content: `Provided consent to display messsages in ${guild.name}  publicly on Answer Overflow`,
            ephemeral: true,
          });
        },
        onError: (error) => ephemeralStatusHandler(interaction, error.message),
      });
    });
  }
}
