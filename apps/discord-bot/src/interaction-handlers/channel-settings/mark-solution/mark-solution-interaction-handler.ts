import {
  Channel,
  ChannelSettings,
  ChannelSettingsFlags,
  ChannelSettingsWithBitfield,
  PermissionsBitField,
  Server,
} from "@answeroverflow/core";
import { container } from "@sapphire/framework";
import type { TextChannel, NewsChannel, ButtonInteraction, CacheType } from "discord.js";
import type { ChannelSettingsInteractionHandler } from "../channel-setting-button-base";

export class ToggleMarkSolutionInteractionHandler implements ChannelSettingsInteractionHandler {
  // eslint-disable-next-line no-unused-vars
  constructor(public readonly enable: boolean) {}
  public async updateSettings(
    target_channel: TextChannel | NewsChannel,
    converted_channel: Channel,
    converted_server: Server,
    old_settings: ChannelSettingsWithBitfield | null,
    // eslint-disable-next-line no-unused-vars
    interaction: ButtonInteraction<CacheType>
  ): Promise<ChannelSettingsWithBitfield> {
    let new_settings: ChannelSettings;
    if (old_settings) {
      new_settings = old_settings;
    } else {
      new_settings = {
        channel_id: converted_channel.id,
        invite_code: null,
        last_indexed_snowflake: null,
        permissions: 0,
        solution_tag_id: null,
      };
    }
    const updated_permissions_bitfield = new PermissionsBitField(
      ChannelSettingsFlags,
      old_settings?.permissions ?? 0
    );
    if (this.enable) {
      updated_permissions_bitfield.setFlag("MARK_SOLUTION_ENABLED");
    } else {
      updated_permissions_bitfield.clearFlag("MARK_SOLUTION_ENABLED");
    }
    new_settings.permissions = updated_permissions_bitfield.value;
    return await container.answer_overflow.channel_settings.edit(
      converted_channel,
      converted_server,
      old_settings,
      new_settings
    );
  }
}
