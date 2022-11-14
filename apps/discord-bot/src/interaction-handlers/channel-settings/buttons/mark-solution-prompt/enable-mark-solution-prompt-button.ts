import { ChannelSettingButtonBase } from "@primitives/interactions/channel-settings/views/channel-settings/channel-setting-button-base";
import { SetChannelSettingsFlagInteractionHandler } from "@primitives/interactions/channel-settings/views/channel-settings/implementations/channel-settings/set-channel-settings-flag-interaction-handler";
import type { ButtonBase } from "@primitives/message-components/buttons/button";
import { EnableMarkSolutionPromptButton } from "@primitives/message-components/buttons/channel-settings/mark-solution-prompt-instructions";
import type { Option } from "@sapphire/framework";
import type { MessageComponentInteraction, CacheType } from "discord.js";

export class EnableMarkSolutionPromptButtonHandler extends ChannelSettingButtonBase {
  public async getInteractionHandler(
    interaction: MessageComponentInteraction<CacheType>,
    parsedData: Option.UnwrapSome<Awaited<ReturnType<this["parse"]>>>
  ) {
    return new SetChannelSettingsFlagInteractionHandler(
      parsedData.root_channel,
      parsedData.converted_channel,
      parsedData.converted_server,
      parsedData.channel_settings,
      true,
      "SEND_MARK_SOLUTION_INSTRUCTIONS_IN_NEW_THREADS"
    );
  }
  public display: ButtonBase = new EnableMarkSolutionPromptButton(false);
}
