import { EnableIndexingInteractionHandler } from "@primitives/interactions/settings/channel-settings/implementations/enable-indexing-interaction-handler";
import type { ButtonBase } from "@primitives/message-components/buttons/button";
import { EnableIndexingButton } from "@primitives/message-components/buttons/channel-settings/indexing-buttons";
import { ChannelSettingButtonHandler } from "@primitives/message-components/handlers/settings/channel-settings/channel-settings-button-handler";
import type { InteractionHandler } from "@sapphire/framework";
import type { MessageComponentInteraction, CacheType } from "discord.js";

export class EnableIndexingButtonHandler extends ChannelSettingButtonHandler {
  public async getInteractionHandler(
    interaction: MessageComponentInteraction<CacheType>,
    // eslint-disable-next-line no-unused-vars
    parsedData: InteractionHandler.ParseResult<this>
  ) {
    return new EnableIndexingInteractionHandler(interaction);
  }

  public display: ButtonBase = new EnableIndexingButton();
}
