import type { Channel, ChannelSettingsWithBitfield, Server } from "@answeroverflow/core";
import type { GuildRootChannel } from "@utils/types";
import type { Interaction, CacheType } from "discord.js";
import type { SettingsInteractionHandler } from "../settings-menu/settings-interaction-handler";

export class InvalidChannelError extends Error {}
export class ChannelSettingsChangeError extends Error {}

export abstract class ChannelSettingsInteractionHandler
  implements SettingsInteractionHandler<ChannelSettingsWithBitfield>
{
  constructor(
    // eslint-disable-next-line no-unused-vars
    public readonly target_channel: GuildRootChannel,
    // eslint-disable-next-line no-unused-vars
    public readonly converted_channel: Channel,
    // eslint-disable-next-line no-unused-vars
    public readonly converted_server: Server,
    // eslint-disable-next-line no-unused-vars
    public readonly old_settings: ChannelSettingsWithBitfield | null
  ) {}
  public abstract updateSettings(
    // eslint-disable-next-line no-unused-vars
    interaction: Interaction<CacheType>
  ): Promise<ChannelSettingsWithBitfield>;
}
