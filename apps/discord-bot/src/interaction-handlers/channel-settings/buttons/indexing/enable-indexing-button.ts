import { ChannelSettingButtonBase } from "@primitives/interactions/channel-settings/views/channel-settings/channel-setting-button-base";
import { EnableIndexingInteractionHandler } from "@primitives/interactions/channel-settings/views/channel-settings/implementations/channel-settings/enable-indexing-interaction-handler";
import type { ButtonBase } from "@primitives/message-components/buttons/button";
import { EnableIndexingButton } from "@primitives/message-components/buttons/channel-settings/indexing-buttons";
import type { Option } from "@sapphire/framework";
import type { MessageComponentInteraction, CacheType } from "discord.js";

export class EnableIndexingButtonHandler extends ChannelSettingButtonBase {
  public async getInteractionHandler(
    interaction: MessageComponentInteraction<CacheType>,
    parsedData: Option.UnwrapSome<Awaited<ReturnType<this["parse"]>>>
  ) {
    return new EnableIndexingInteractionHandler(
      parsedData.root_channel,
      parsedData.converted_channel,
      parsedData.converted_server,
      parsedData.channel_settings
    );
  }

  public display: ButtonBase = new EnableIndexingButton();
}
