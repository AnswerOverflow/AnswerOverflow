import { SetChannelSettingsFlagInteractionHandler } from "@primitives/interactions/settings/channel-settings/implementations/set-channel-settings-flag-interaction-handler";
import type { ButtonBase } from "@primitives/message-components/buttons/button";
import { DisableMarkSolutionButton } from "@primitives/message-components/buttons/channel-settings/mark-solution-buttons";
import { ChannelSettingButtonHandler } from "@primitives/message-components/handlers/settings/channel-settings/channel-settings-button-handler";
import type { InteractionHandler } from "@sapphire/framework";
import type { MessageComponentInteraction, CacheType } from "discord.js";

export class DisableMarkSolutionButtonHandler extends ChannelSettingButtonHandler {
  public async getInteractionHandler(
    interaction: MessageComponentInteraction<CacheType>,
    // eslint-disable-next-line no-unused-vars
    parsedData: InteractionHandler.ParseResult<this>
  ) {
    return new SetChannelSettingsFlagInteractionHandler(
      interaction,
      false,
      "MARK_SOLUTION_ENABLED"
    );
  }
  public display: ButtonBase = new DisableMarkSolutionButton();
}
