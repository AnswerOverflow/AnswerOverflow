import type { ChannelSettingsWithBitfield } from "@answeroverflow/core";
import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import { type InteractionReplyOptions, MessageActionRow } from "discord.js";
import { ToggleIndexingButton } from "@primitives/message-components/buttons/channel-settings/indexing-buttons";
import { ToggleMarkSolutionButton } from "@primitives/message-components/buttons/channel-settings/mark-solution-buttons";
import { MarkAsSolvedTagSelectMenu } from "@primitives/message-components/select-menu/channel-settings/mark-as-solved-tag-select-menu";

export const makeChannelSettingsResponse = (
  channel_settings: ChannelSettingsWithBitfield
): InteractionReplyOptions => {
  const settings_buttons = new MessageActionRow();
  settings_buttons.addComponents([
    new ToggleIndexingButton(channel_settings.bitfield.checkFlag("INDEXING_ENABLED")).makeButton(),
    new ToggleMarkSolutionButton(
      channel_settings.bitfield.checkFlag("MARK_SOLUTION_ENABLED")
    ).makeButton(),
  ]);
  const forum_tag_row = new MessageActionRow().addComponents([
    new MarkAsSolvedTagSelectMenu(
      [
        {
          label: "Solved",
          value: "solved",
        },
        {
          label: "Typescript",
          value: "typescript",
        },
      ],
      "Solved"
    ).makeSelectMenu(),
  ]);

  const content: string[] = [];
  if (channel_settings.bitfield.checkFlag("INDEXING_ENABLED")) {
    content.push("**Disable Indexing** - Disables messages being indexed from this channel");
  } else {
    content.push(
      "**Enable Indexing** - Enables messages from this channel to be indexed and appear on Answer Overflow"
    );
  }
  if (channel_settings.bitfield.checkFlag("MARK_SOLUTION_ENABLED")) {
    content.push("**Disable Mark As Solution** - Turns off mark as solution for this channel");
  } else {
    content.push("**Enable Mark As Solution** - Enables users to mark their questions as solved");
  }
  return {
    content: content.join("\n\n"),
    components: [settings_buttons, forum_tag_row],
    ephemeral: true,
  };
};

@ApplyOptions<Command.Options>({
  name: "channel-settings",
  description:
    "Adjust settings for the current channel. Allows you to enable indexing, mark as solution, etc.",
})
export class UserCommand extends Command {
  // Register slash and context menu command
  public override registerApplicationCommands(registry: Command.Registry) {
    // Register slash command
    registry.registerChatInputCommand({
      name: this.name,
      description: this.description,
    });
  }

  // slash command
  public async chatInputRun(interaction: Command.ChatInputInteraction) {
    const channel_settings = await this.container.answer_overflow.channel_settings.get({
      where: {
        channel_id: interaction.channelId,
      },
    });
    if (channel_settings?.bitfield == null) {
      await interaction.reply({ content: "Channel settings not found", ephemeral: true });
      return;
    }
    const channel_settings_response = makeChannelSettingsResponse(channel_settings);
    await interaction.reply(channel_settings_response);
  }
}
