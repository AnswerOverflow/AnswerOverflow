import type {
  ButtonInteraction,
  CacheType,
  Invite,
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

export class EnableIndexingButton extends ButtonBase {
  public id = "enable-indexing";
  public label = "Enable Indexing";
  public style = "SUCCESS" as MessageButtonStyleResolvable;
}

export class EnableIndexingButtonHandler extends ChannelSettingButtonBaseHandler {
  public display: ButtonBase = new EnableIndexingButton();
  public async updateSettings(
    target_channel: NewsChannel | TextChannel,
    converted_channel: Channel,
    converted_server: Server,
    old_settings: ChannelSettingsWithBitfield | null,
    // eslint-disable-next-line no-unused-vars
    interaction: ButtonInteraction<CacheType>
  ): Promise<ChannelSettingsWithBitfield> {
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
  }
}
