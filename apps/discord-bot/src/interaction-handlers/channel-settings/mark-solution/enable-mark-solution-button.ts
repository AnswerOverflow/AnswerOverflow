import {
  type ChannelSettingsWithBitfield,
  type ChannelSettings,
  PermissionsBitField,
  ChannelSettingsFlags,
  Server,
  Channel,
} from "@answeroverflow/core";
import { ButtonBase } from "@interaction-handlers/primitives/button-base";
import type {
  MessageButtonStyleResolvable,
  NewsChannel,
  TextChannel,
  ButtonInteraction,
  CacheType,
} from "discord.js";
import { ChannelSettingButtonBaseHandler } from "../channel-setting-button-base";

export class EnableMarkSolutionButton extends ButtonBase {
  public id = "enable-mark-solution";
  public label = "Enable Mark Solution";
  public style = "SUCCESS" as MessageButtonStyleResolvable;
}

export class EnableMarkSolutionButtonHandler extends ChannelSettingButtonBaseHandler {
  public display: ButtonBase = new EnableMarkSolutionButton();

  public async updateSettings(
    target_channel: NewsChannel | TextChannel,
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
    updated_permissions_bitfield.setFlag("MARK_SOLUTION_ENABLED");
    new_settings.permissions = updated_permissions_bitfield.value;
    return await this.container.answer_overflow.channel_settings.edit(
      converted_channel,
      converted_server,
      old_settings,
      new_settings
    );
  }
}
