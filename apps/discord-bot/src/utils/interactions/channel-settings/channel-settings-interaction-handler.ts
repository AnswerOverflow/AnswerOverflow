import type { Channel, ChannelSettingsWithBitfield, Server } from "@answeroverflow/core";
import type { GuildTextChannel } from "@utils/types";
import type { Interaction, CacheType } from "discord.js";

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
