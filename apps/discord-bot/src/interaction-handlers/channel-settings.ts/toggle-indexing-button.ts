import type {
  ButtonInteraction,
  CacheType,
  Invite,
  MessageButtonStyleResolvable,
  NewsChannel,
  TextChannel,
} from "discord.js";
import { ToggleButtonBase, ToggleButtonCombo } from "../primitives/toggle-button-base";
import { ButtonBase } from "../primitives/button-base";
import type { Channel, ChannelSettingsWithBitfield, Server } from "@answeroverflow/core";
import {
  ChannelSettingButtonBaseHandler,
  ChannelSettingsChangeError,
} from "./channel-setting-button-base";

class EnableIndexingButton extends ButtonBase {
  public id = "enable-indexing";
  public label = "Enable Indexing";
  public style = "SUCCESS" as MessageButtonStyleResolvable;
}

class EnableIndexingButtonToggle extends ToggleButtonBase {
  public display = new EnableIndexingButton();
}

class DisableIndexingButton extends ButtonBase {
  public id = "disable-indexing";
  public label = "Disable Indexing";
  public style = "DANGER" as MessageButtonStyleResolvable;
}

class DisableIndexingButtonToggle extends ToggleButtonBase {
  public display = new DisableIndexingButton();
}

export class IndexingButtonToggle extends ToggleButtonCombo {
  public enable_button = new EnableIndexingButtonToggle();
  public disable_button = new DisableIndexingButtonToggle();
}

export class ToggleIndexingButtonHandler extends ChannelSettingButtonBaseHandler {
  public buttons = new IndexingButtonToggle(true);
  public async updateSettings(
    enable: boolean,
    target_channel: NewsChannel | TextChannel,
    converted_channel: Channel,
    converted_server: Server,
    old_settings: ChannelSettingsWithBitfield | null,
    // eslint-disable-next-line no-unused-vars
    interaction: ButtonInteraction<CacheType>
  ): Promise<ChannelSettingsWithBitfield> {
    if (enable) {
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
      return await this.container.answer_overflow.channel_settings.enableIndexing(
        converted_channel,
        converted_server,
        created_invite.code,
        old_settings
      );
    } else {
      if (!old_settings?.bitfield.checkFlag("INDEXING_ENABLED")) {
        throw new ChannelSettingsChangeError("Indexing is already disabled for this channel");
      }
      return await this.container.answer_overflow.channel_settings.disableIndexing(
        converted_channel,
        converted_server,
        old_settings
      );
    }
  }
}
