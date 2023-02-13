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
        .addBooleanOption((option) =>
          option.setName("consent").setDescription("Enable or disable consent")
        )
    );
  }
  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const consented = interaction.options.getBoolean("consent") ?? true;
    await guildTextChannelOnlyInteraction(interaction, async ({ member, guild }) => {
      await updateUserConsent({
        member,
        canPubliclyDisplayMessages: consented,
        consentSource: "slash-command",
        async onSettingChange() {
          await interaction.reply({
            content: consented
              ? `Provided consent to display messsages in ${guild.name} publicly on Answer Overflow`
              : `Removed consent to display messsages in ${guild.name} publicly on Answer Overflow`,
            ephemeral: true,
          });
        },
        onError: (error) => ephemeralStatusHandler(interaction, error.message),
      });
    });
  }
}
