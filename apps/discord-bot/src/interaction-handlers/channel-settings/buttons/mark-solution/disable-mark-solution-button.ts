import { ChannelSettingButtonBase } from "@primitives/interactions/channel-settings/views/channel-settings/channel-setting-button-base";
import { SetChannelSettingsFlagInteractionHandler } from "@primitives/interactions/channel-settings/views/channel-settings/implementations/channel-settings/set-channel-settings-flag-interaction-handler";
import type { ButtonBase } from "@primitives/message-components/buttons/button";
import { DisableMarkSolutionButton } from "@primitives/message-components/buttons/channel-settings/mark-solution-buttons";
import type { Option } from "@sapphire/framework";
import type { MessageComponentInteraction, CacheType } from "discord.js";

export class DisableMarkSolutionButtonHandler extends ChannelSettingButtonBase {
  public async getInteractionHandler(
    interaction: MessageComponentInteraction<CacheType>,
    parsedData: Option.UnwrapSome<Awaited<ReturnType<this["parse"]>>>
  ) {
    return new SetChannelSettingsFlagInteractionHandler(
      parsedData.root_channel,
      parsedData.converted_channel,
      parsedData.converted_server,
      parsedData.channel_settings,
      false,
      "MARK_SOLUTION_ENABLED"
    );
  }
  public display: ButtonBase = new DisableMarkSolutionButton();
}
