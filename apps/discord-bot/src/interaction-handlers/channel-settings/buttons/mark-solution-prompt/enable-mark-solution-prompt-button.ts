import { SetChannelSettingsFlagInteractionHandler } from "@primitives/interactions/settings/channel-settings/implementations/set-channel-settings-flag-interaction-handler";
import type { ButtonBase } from "@primitives/message-components/buttons/button";
import { EnableMarkSolutionPromptButton } from "@primitives/message-components/buttons/channel-settings/mark-solution-prompt-instructions";
import { ChannelSettingButtonHandler } from "@primitives/message-components/handlers/settings/channel-settings/channel-settings-button-handler";
import type { InteractionHandler } from "@sapphire/framework";
import type { MessageComponentInteraction, CacheType } from "discord.js";

export class EnableMarkSolutionPromptButtonHandler extends ChannelSettingButtonHandler {
  public async getInteractionHandler(
    interaction: MessageComponentInteraction<CacheType>,
    // eslint-disable-next-line no-unused-vars
    parsedData: InteractionHandler.ParseResult<this>
  ) {
    return new SetChannelSettingsFlagInteractionHandler(
      interaction,
      true,
      "SEND_MARK_SOLUTION_INSTRUCTIONS_IN_NEW_THREADS"
    );
  }
  public display: ButtonBase = new EnableMarkSolutionPromptButton(false);
}
