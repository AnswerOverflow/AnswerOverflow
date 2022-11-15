import type { Channel, ChannelSettingsWithBitfield, Server } from "@answeroverflow/core";
import { InteractionExecuteError } from "@primitives/interactions/interaction-executor";
import { container } from "@sapphire/framework";
import type { GuildRootChannel } from "@utils/types";
import type { Invite } from "discord.js";
import { ChannelSettingsInteractionHandler } from "../channel-settings-interaction-handler";

export class EnableIndexingInteractionHandler extends ChannelSettingsInteractionHandler {
  protected async updateSettings(
    old_settings: ChannelSettingsWithBitfield | null,
    target_channel: GuildRootChannel,
    converted_channel: Channel,
    converted_server: Server
  ): Promise<ChannelSettingsWithBitfield> {
    let created_invite: Invite;
    if (old_settings != null && old_settings.bitfield.checkFlag("INDEXING_ENABLED")) {
      throw new InteractionExecuteError("Indexing is already enabled for this channel");
    }
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
