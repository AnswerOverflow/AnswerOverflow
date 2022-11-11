import {
  Channel,
  Server,
  ChannelSettingsWithBitfield,
  PermissionsBitField,
  ChannelSettingsFlags,
  ChannelSettings,
} from "@answeroverflow/core";
import { ButtonBase } from "@interaction-handlers/primitives/button-base";
import {
  ToggleButtonBase,
  ToggleButtonCombo,
} from "@interaction-handlers/primitives/toggle-button-base";
import type {
  NewsChannel,
  TextChannel,
  ButtonInteraction,
  CacheType,
  MessageButtonStyleResolvable,
} from "discord.js";
import { ChannelSettingButtonBaseHandler } from "./channel-setting-button-base";

class EnableMarkSolutionButton extends ButtonBase {
  public id = "enable-mark-solution";
  public label = "Enable Mark Solution";
  public style = "SUCCESS" as MessageButtonStyleResolvable;
}

class EnableMarkSolutionButtonToggle extends ToggleButtonBase {
  public display: ButtonBase = new EnableMarkSolutionButton();
}

class DisableMarkSolutionButton extends ButtonBase {
  public id = "disable-mark-solution";
  public label = "Disable Mark Solution";
  public style = "DANGER" as MessageButtonStyleResolvable;
}

class DisableMarkSolutionButtonToggle extends ToggleButtonBase {
  public display: ButtonBase = new DisableMarkSolutionButton();
}

export class MarkSolutionButtonToggle extends ToggleButtonCombo {
  public enable_button = new EnableMarkSolutionButtonToggle();
  public disable_button = new DisableMarkSolutionButtonToggle();
}

export class ToggleMarkSolutionButtonHandler extends ChannelSettingButtonBaseHandler {
  public buttons: ToggleButtonCombo = new MarkSolutionButtonToggle(true);
  public async updateSettings(
    enable: boolean,
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
    if (enable) {
      updated_permissions_bitfield.setFlag("MARK_SOLUTION_ENABLED");
    } else {
      updated_permissions_bitfield.clearFlag("MARK_SOLUTION_ENABLED");
    }
    new_settings.permissions = updated_permissions_bitfield.value;
    return await this.container.answer_overflow.channel_settings.edit(
      converted_channel,
      converted_server,
      old_settings,
      new_settings
    );
  }
}
