import type { ChannelSettingsWithBitfield, Server, Channel } from "@answeroverflow/core";
import { container } from "@sapphire/framework";
import type { GuildRootChannel } from "@utils/types";
import type { Interaction, CacheType } from "discord.js";
import { ChannelSettingsInteractionHandler } from "../../channel-settings-interaction-handler";

export class SetSolvedTagInteractionHandler extends ChannelSettingsInteractionHandler {
  // eslint-disable-next-line no-unused-vars
  public updateSettings(interaction: Interaction<CacheType>): Promise<ChannelSettingsWithBitfield> {
    return container.answer_overflow.channel_settings.setSolvedTagId(
      this.converted_channel,
      this.converted_server,
      this.old_settings,
      this.new_solved_tag
    );
  }
  constructor(
    // eslint-disable-next-line no-unused-vars
    public readonly target_channel: GuildRootChannel,
    // eslint-disable-next-line no-unused-vars
    public readonly converted_channel: Channel,
    // eslint-disable-next-line no-unused-vars
    public readonly converted_server: Server,
    // eslint-disable-next-line no-unused-vars
    public readonly old_settings: ChannelSettingsWithBitfield | null,
    // eslint-disable-next-line no-unused-vars
    public readonly new_solved_tag: string | null
  ) {
    super(target_channel, converted_channel, converted_server, old_settings);
  }
}
