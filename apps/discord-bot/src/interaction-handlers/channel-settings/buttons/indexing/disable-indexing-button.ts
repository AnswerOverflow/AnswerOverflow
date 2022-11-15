import { DisableIndexingInteractionHandler } from "@primitives/interactions/settings/channel-settings/implementations/disable-indexing-interaction-handler";
import type { ButtonBase } from "@primitives/message-components/buttons/button";
import { DisableIndexingButton } from "@primitives/message-components/buttons/channel-settings/indexing-buttons";
import { ChannelSettingButtonHandler } from "@primitives/message-components/handlers/settings/channel-settings/channel-settings-button-handler";
import type { InteractionHandler } from "@sapphire/framework";
import type { MessageComponentInteraction, CacheType } from "discord.js";

export class DisableIndexingButtonHandler extends ChannelSettingButtonHandler {
  public async getInteractionHandler(
    interaction: MessageComponentInteraction<CacheType>,
    // eslint-disable-next-line no-unused-vars
    parsedData: InteractionHandler.ParseResult<this>
  ) {
    return new DisableIndexingInteractionHandler(interaction);
  }
  public display: ButtonBase = new DisableIndexingButton();
}
