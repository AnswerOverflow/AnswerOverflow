import type { ChannelSettingsWithBitfield } from "@answeroverflow/core";
import { ChannelSettingsMenuView } from "@primitives/views/channel-settings-view";
import type { InteractionHandler } from "@sapphire/framework";
import type { MessageComponentInteraction } from "discord.js";
import { SettingsMessageComponentHandler } from "../settings-message-component-handler";

export abstract class ChannelSettingsMessageComponentHandler extends SettingsMessageComponentHandler<ChannelSettingsWithBitfield> {
  public override async parse(interaction: MessageComponentInteraction) {
    const some = await super.parse(interaction);
    if (some.isNone()) return some;
    const data = some.unwrap();
    return this.some({
      ...data,
    });
  }

  public async getReply(
    new_settings: ChannelSettingsWithBitfield,
    data: InteractionHandler.ParseResult<this>
  ) {
    return new ChannelSettingsMenuView(new_settings, data.root_channel);
  }
}
