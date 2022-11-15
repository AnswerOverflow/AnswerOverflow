import type { Channel, ChannelSettingsWithBitfield, Server } from "@answeroverflow/core";
import { InteractionExecuteError } from "@primitives/interactions/interaction-executor";
import { container } from "@sapphire/framework";
import type { GuildRootChannel } from "@utils/types";
import { ChannelSettingsInteractionHandler } from "../channel-settings-interaction-handler";

export class DisableIndexingInteractionHandler extends ChannelSettingsInteractionHandler {
  protected async updateSettings(
    old_settings: ChannelSettingsWithBitfield | null,
    target_channel: GuildRootChannel,
    converted_channel: Channel,
    converted_server: Server
  ): Promise<ChannelSettingsWithBitfield> {
    if (old_settings == null || !old_settings.bitfield.checkFlag("INDEXING_ENABLED")) {
      throw new InteractionExecuteError("Indexing is already disabled for this channel");
    }
    return await container.answer_overflow.channel_settings.disableIndexing(
      converted_channel,
      converted_server,
      old_settings
    );
  }
}
