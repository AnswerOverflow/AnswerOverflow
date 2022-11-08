import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";

@ApplyOptions<Command.Options>({
  description: "Provides consent to have your messages displayed on Answer Overflow",
  name: "Consent",
  runIn: ["GUILD_ANY"],
})
export class ConsentCommnad extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand({
      name: this.name,
      description: this.description,
    });
  }

  public async chatInputRun(interaction: Command.ChatInputInteraction) {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guild) {
      await interaction.reply({
        content: "No guild found to consent to, this command can only be used in a server",
        ephemeral: true,
      });
      return;
    }
    const user_server_settings =
      await this.container.answer_overflow.user_server_settings.getUserServerSettings({
        where: {
          user_id_server_id: {
            user_id: interaction.user.id,
            server_id: interaction.guild.id,
          },
        },
      });
    if (user_server_settings?.bitfield?.checkFlag("ALLOWED_TO_SHOW_MESSAGES")) {
      await interaction.editReply({
        content: "You have already consented to have your messages displayed on Answer Overflow",
      });
      return;
    }
    await this.container.answer_overflow.user_server_settings.grantUserConsent(
      {
        id: interaction.user.id,
        name: interaction.user.username,
        avatar: interaction.user.avatar,
      },
      {
        id: interaction.guild.id,
        name: interaction.guild.name,
        icon: interaction.guild.icon,
      }
    );
    await interaction.editReply({ content: "Thanks for providing consent!" });
  }
}
