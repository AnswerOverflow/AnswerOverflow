import type { CacheType, Interaction, Invite } from "discord.js";
import type { Channel, ChannelSettingsWithBitfield, Server } from "@answeroverflow/core";
import type { GuildTextChannel } from "@utils/types";
import { container } from "@sapphire/framework";
import type { ChannelSettingsInteractionHandler } from "./channel-settings-interaction-handler";
import { ChannelSettingsChangeError } from "@interaction-handlers/channel-settings/buttons/channel-setting-button-base";

export class EnableIndexingInteractionHandler implements ChannelSettingsInteractionHandler {
  public async updateSettings(
    target_channel: GuildTextChannel,
    converted_channel: Channel,
    converted_server: Server,
    old_settings: ChannelSettingsWithBitfield | null,
    // eslint-disable-next-line no-unused-vars
    interaction: Interaction<CacheType>
  ): Promise<ChannelSettingsWithBitfield> {
    if (old_settings?.bitfield.checkFlag("INDEXING_ENABLED")) {
      throw new ChannelSettingsChangeError("Indexing is already enabled for this channel");
    }
    let created_invite: Invite;
    created_invite = await target_channel.createInvite({
      maxAge: 0,
      maxUses: 0,
      unique: false,
      reason: "Allow users to join from Answer Overflow",
    });
    return await container.answer_overflow.channel_settings.enableIndexing(
      converted_channel,
      converted_server,
      created_invite.code,
      old_settings
    );
  }
}
