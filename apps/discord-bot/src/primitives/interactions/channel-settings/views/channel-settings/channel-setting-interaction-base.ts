import type { ChannelSettingsWithBitfield } from "@answeroverflow/core";
import { ChannelSettingsMenuView } from "@primitives/views/channel-settings-view";
import type { InteractionHandler } from "@sapphire/framework";
import { discordChannelToPrismaChannel, discordGuildToPrismaServer } from "@utils/conversion";
import type { MessageComponentInteraction } from "discord.js";
import { SettingsInteractionMenuBaseHandler } from "../settings-menu/settings-interaction-menu-handler-base";

export abstract class ChannelSettingsInteractionViewBase extends SettingsInteractionMenuBaseHandler<ChannelSettingsWithBitfield> {
  public override async parse(interaction: MessageComponentInteraction) {
    const some = await super.parse(interaction);
    if (some.isNone()) return some;
    const data = some.unwrap();
    const channel_settings = await this.container.answer_overflow.channel_settings.get({
      where: { channel_id: data.root_channel.id },
    });
    return this.some({
      ...data,
      channel_settings,
      converted_channel: discordChannelToPrismaChannel(data.root_channel),
      converted_server: discordGuildToPrismaServer(data.root_channel.guild),
    });
  }

  public async getReply(
    new_settings: ChannelSettingsWithBitfield,
    data: InteractionHandler.ParseResult<this>
  ) {
    return new ChannelSettingsMenuView(new_settings, data.root_channel);
  }
}
