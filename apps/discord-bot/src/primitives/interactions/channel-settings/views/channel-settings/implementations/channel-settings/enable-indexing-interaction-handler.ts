import type { ChannelSettingsWithBitfield } from "@answeroverflow/core";
import { container } from "@sapphire/framework";
import type { Interaction, CacheType, Invite } from "discord.js";
import {
  ChannelSettingsInteractionHandler,
  ChannelSettingsChangeError,
} from "../../channel-settings-interaction-handler";

export class EnableIndexingInteractionHandler extends ChannelSettingsInteractionHandler {
  public async updateSettings(
    // eslint-disable-next-line no-unused-vars
    interaction: Interaction<CacheType>
  ): Promise<ChannelSettingsWithBitfield> {
    if (this.old_settings?.bitfield.checkFlag("INDEXING_ENABLED")) {
      throw new ChannelSettingsChangeError("Indexing is already enabled for this channel");
    }
    let created_invite: Invite;
    created_invite = await this.target_channel.createInvite({
      maxAge: 0,
      maxUses: 0,
      unique: false,
      reason: "Allow users to join from Answer Overflow",
    });
    return await container.answer_overflow.channel_settings.enableIndexing(
      this.converted_channel,
      this.converted_server,
      created_invite.code,
      this.old_settings
    );
  }
}
