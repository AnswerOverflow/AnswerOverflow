import type { ChannelSettingsWithBitfield } from "@answeroverflow/core";
import { container } from "@sapphire/framework";
import type { Interaction, CacheType } from "discord.js";
import { ChannelSettingsInteractionHandler } from "../../channel-settings-interaction-handler";

export class DisableIndexingInteractionHandler extends ChannelSettingsInteractionHandler {
  public async updateSettings(
    // eslint-disable-next-line no-unused-vars
    interaction: Interaction<CacheType>
  ): Promise<ChannelSettingsWithBitfield> {
    return await container.answer_overflow.channel_settings.disableIndexing(
      this.converted_channel,
      this.converted_server,
      this.old_settings
    );
  }
}
