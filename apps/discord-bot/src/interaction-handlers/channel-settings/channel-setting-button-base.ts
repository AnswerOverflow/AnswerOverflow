import type { Channel, Server, ChannelSettingsWithBitfield } from "@answeroverflow/core";
import type { Option } from "@sapphire/framework";
import { discordGuildToPrismaServer, discordChannelToPrismaChannel } from "@utils/conversion";
import { makeChannelSettingsResponse } from "../../commands/settings/channel-settings";
import type { ButtonInteraction, CacheType, Interaction } from "discord.js";
import type { GuildTextChannel } from "@utils/types";
import { GuildTextChannelButtonHandler } from "@interaction-handlers/primitives/buttons/guild-text-channel-button";
export class InvalidChannelError extends Error {}
export class ChannelSettingsChangeError extends Error {}

export interface ChannelSettingsInteractionHandler {
  updateSettings(
    // eslint-disable-next-line no-unused-vars
    target_channel: GuildTextChannel,
    // eslint-disable-next-line no-unused-vars
    converted_channel: Channel,
    // eslint-disable-next-line no-unused-vars
    converted_server: Server,
    // eslint-disable-next-line no-unused-vars
    old_settings: ChannelSettingsWithBitfield | null,
    // eslint-disable-next-line no-unused-vars
    interaction: Interaction<CacheType>
  ): Promise<ChannelSettingsWithBitfield>;
}

export abstract class ChannelSettingButtonBaseHandler extends GuildTextChannelButtonHandler {
  public abstract interactionHandler: ChannelSettingsInteractionHandler;
  public async runGuildTextChannelButton(
    // eslint-disable-next-line no-unused-vars
    interaction: ButtonInteraction<CacheType>,
    // eslint-disable-next-line no-unused-vars
    target_channel: GuildTextChannel,
    // eslint-disable-next-line no-unused-vars
    parsedData: Option.UnwrapSome<Awaited<ReturnType<this["parse"]>>>
  ): Promise<void> {
    const old_settings = await this.container.answer_overflow.channel_settings.get({
      where: {
        channel_id: target_channel.id,
      },
    });
    let updated_settings: ChannelSettingsWithBitfield;
    try {
      updated_settings = await this.interactionHandler.updateSettings(
        target_channel,
        discordChannelToPrismaChannel(target_channel),
        discordGuildToPrismaServer(target_channel.guild),
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
