import type { Channel, ChannelSettingsWithBitfield, Server } from "@answeroverflow/core";
import { container } from "@sapphire/framework";
import type { GuildTextChannel } from "@utils/types";
import type { Interaction, CacheType } from "discord.js";
import {
  type ChannelSettingsInteractionHandler,
  ChannelSettingsChangeError,
} from "../channel-setting-button-base";

export class DisableIndexingInteractionHandler implements ChannelSettingsInteractionHandler {
  public async updateSettings(
    target_channel: GuildTextChannel,
    converted_channel: Channel,
    converted_server: Server,
    old_settings: ChannelSettingsWithBitfield | null,
    // eslint-disable-next-line no-unused-vars
    interaction: Interaction<CacheType>
  ): Promise<ChannelSettingsWithBitfield> {
    if (!old_settings?.bitfield.checkFlag("INDEXING_ENABLED")) {
      throw new ChannelSettingsChangeError("Indexing is already disabled for this channel");
    }
    return await container.answer_overflow.channel_settings.disableIndexing(
      converted_channel,
      converted_server,
      old_settings
    );
  }
}
