import type { Channel, ChannelSettingsWithBitfield, Server } from "@answeroverflow/core";
import { container } from "@sapphire/framework";
import type { GuildRootChannel } from "@utils/types";
import type { Interaction, CacheType } from "discord.js";
import { ChannelSettingsInteractionHandler } from "../channel-settings-interaction-handler";

export class SetSolvedTagInteractionHandler extends ChannelSettingsInteractionHandler {
  protected updateSettings(
    old_settings: ChannelSettingsWithBitfield | null,
    target_channel: GuildRootChannel,
    converted_channel: Channel,
    converted_server: Server
  ): Promise<ChannelSettingsWithBitfield> {
    let new_solved_tag_id = this.new_solved_tag;
    if (new_solved_tag_id && new_solved_tag_id == old_settings?.solution_tag_id) {
      new_solved_tag_id = null;
    }
    return container.answer_overflow.channel_settings.setSolvedTagId(
      converted_channel,
      converted_server,
      old_settings,
      new_solved_tag_id
    );
  }

  // eslint-disable-next-line no-unused-vars
  constructor(interaction: Interaction<CacheType>, public readonly new_solved_tag: string | null) {
    super(interaction);
  }
}
