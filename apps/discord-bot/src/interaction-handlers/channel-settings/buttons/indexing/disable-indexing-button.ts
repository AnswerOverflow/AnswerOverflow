import { ChannelSettingButtonBase } from "@primitives/interactions/channel-settings/views/channel-settings/channel-setting-button-base";
import { DisableIndexingInteractionHandler } from "@primitives/interactions/channel-settings/views/channel-settings/implementations/channel-settings/disable-indexing-interaction-handler";
import type { ButtonBase } from "@primitives/message-components/buttons/button";
import { DisableIndexingButton } from "@primitives/message-components/buttons/channel-settings/indexing-buttons";
import type { Option } from "@sapphire/framework";
import type { MessageComponentInteraction, CacheType } from "discord.js";

export class DisableIndexingButtonHandler extends ChannelSettingButtonBase {
  public async getInteractionHandler(
    interaction: MessageComponentInteraction<CacheType>,
    parsedData: Option.UnwrapSome<Awaited<ReturnType<this["parse"]>>>
  ) {
    return new DisableIndexingInteractionHandler(
      parsedData.root_channel,
      parsedData.converted_channel,
      parsedData.converted_server,
      parsedData.channel_settings
    );
  }
  public display: ButtonBase = new DisableIndexingButton();
}
