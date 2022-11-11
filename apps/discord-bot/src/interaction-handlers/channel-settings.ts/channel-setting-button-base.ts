import type { Channel, Server, ChannelSettingsWithBitfield } from "@answeroverflow/core";
import { ToggleButtonBaseHandler } from "@interaction-handlers/primitives/toggle-button-base";
import type { Option } from "@sapphire/framework";
import { discordGuildToPrismaServer, discordChannelToPrismaChannel } from "@utils/conversion";
import { makeChannelSettingsResponse } from "../../commands/settings/channel-settings";
import type { ButtonInteraction, CacheType, NewsChannel, TextChannel } from "discord.js";
export class InvalidChannelError extends Error {}
export class ChannelSettingsChangeError extends Error {}

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

export abstract class ChannelSettingButtonBaseHandler extends ToggleButtonBaseHandler {
  public abstract updateSettings(
    // eslint-disable-next-line no-unused-vars
    enable: boolean,
    // eslint-disable-next-line no-unused-vars
    target_channel: NewsChannel | TextChannel,
    // eslint-disable-next-line no-unused-vars
    converted_channel: Channel,
    // eslint-disable-next-line no-unused-vars
    converted_server: Server,
    // eslint-disable-next-line no-unused-vars
    old_settings: ChannelSettingsWithBitfield | null,
    // eslint-disable-next-line no-unused-vars
    interaction: ButtonInteraction<CacheType>
  ): Promise<ChannelSettingsWithBitfield>;

  public async run(
    interaction: ButtonInteraction<CacheType>,
    parsedData: Option.UnwrapSome<Awaited<ReturnType<this["parse"]>>>
  ): Promise<void> {
    let interaction_channel: NewsChannel | TextChannel;
    try {
      interaction_channel = findSettingsTargetChannel(interaction);
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
    if (interaction.guild == null) {
      return;
    }
    const old_settings = await this.container.answer_overflow.channel_settings.get({
      where: {
        channel_id: interaction_channel.id,
      },
    });
    let updated_settings: ChannelSettingsWithBitfield;
    try {
      updated_settings = await this.updateSettings(
        parsedData.enable,
        interaction_channel,
        discordChannelToPrismaChannel(interaction_channel),
        discordGuildToPrismaServer(interaction.guild),
        old_settings,
        interaction
      );
    } catch (error) {
      if (error instanceof ChannelSettingsChangeError) {
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
    const response = makeChannelSettingsResponse(updated_settings);
    await interaction.update({
      content: response.content,
      components: response.components,
    });
  }
}
