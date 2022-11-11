import { InvalidChannelError } from "@interaction-handlers/channel-settings/channel-setting-button-base";
import type { InteractionHandler, Option } from "@sapphire/framework";

import type { GuildTextChannel } from "@utils/types";
import type { ButtonInteraction, CacheType } from "discord.js";

import { ButtonBaseHandler } from "./button-base";

function findSettingsTargetChannel(interaction: ButtonInteraction<CacheType>) {
  if (interaction.channel == null) {
    throw new InvalidChannelError("Could not find a channel to update settings for");
  }
  if (!interaction.channel.isText()) {
    throw new InvalidChannelError("Channel is not a text channel, cannot update settings for it");
  }
  if (interaction.channel.type === "DM") {
    throw new InvalidChannelError("Cannot update settings for a DM channel");
  }
  if (interaction.channel.isThread()) {
    if (interaction.channel.parent == null) {
      throw new InvalidChannelError("Could not find a parent channel for this thread");
    }
    return interaction.channel.parent;
  }
  if (interaction.channel.isVoice()) {
    throw new InvalidChannelError("Cannot update settings for a voice channel");
  }
  return interaction.channel;
}

export abstract class GuildTextChannelButtonHandler extends ButtonBaseHandler {
  public abstract runGuildTextChannelButton(
    // eslint-disable-next-line no-unused-vars
    interaction: ButtonInteraction<CacheType>,
    // eslint-disable-next-line no-unused-vars
    target_channel: GuildTextChannel,
    // eslint-disable-next-line no-unused-vars
    parsedData: Option.UnwrapSome<Awaited<ReturnType<this["parse"]>>>
  ): Promise<void>;
  public async run(
    // eslint-disable-next-line no-unused-vars
    interaction: ButtonInteraction,
    // eslint-disable-next-line no-unused-vars
    parsedData: InteractionHandler.ParseResult<this>
  ): Promise<void> {
    let interaction_channel: GuildTextChannel;
    try {
      interaction_channel = findSettingsTargetChannel(interaction);
      this.runGuildTextChannelButton(interaction, interaction_channel, parsedData);
    } catch (error) {
      if (error instanceof InvalidChannelError) {
        await interaction.reply({
          content: `Error: ${error.message}`,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: `An unknown error occured, we're looking into it!`,
        });
      }
      return;
    }
  }
}
