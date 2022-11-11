import type {
  ButtonInteraction,
  CacheType,
  MessageButtonStyleResolvable,
  NewsChannel,
  TextChannel,
} from "discord.js";
import { ButtonBase } from "../../primitives/button-base";
import type { Channel, ChannelSettingsWithBitfield, Server } from "@answeroverflow/core";
import {
  ChannelSettingButtonBaseHandler,
  ChannelSettingsChangeError,
} from "../channel-setting-button-base";

export class DisableIndexingButton extends ButtonBase {
  public id = "disable-indexing";
  public label = "Disable Indexing";
  public style = "DANGER" as MessageButtonStyleResolvable;
}

export class DisableIndexingButtonHandler extends ChannelSettingButtonBaseHandler {
  public display: ButtonBase = new DisableIndexingButton();
  public async updateSettings(
    target_channel: NewsChannel | TextChannel,
    converted_channel: Channel,
    converted_server: Server,
    old_settings: ChannelSettingsWithBitfield | null,
    // eslint-disable-next-line no-unused-vars
    interaction: ButtonInteraction<CacheType>
  ): Promise<ChannelSettingsWithBitfield> {
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
