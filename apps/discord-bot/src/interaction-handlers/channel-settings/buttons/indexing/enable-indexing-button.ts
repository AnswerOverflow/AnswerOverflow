import { ButtonBase } from "@interaction-handlers/primitives/buttons/button-base";
import type { ChannelSettingsInteractionHandler } from "@utils/interactions/channel-settings/channel-settings-interaction-handler";
import { EnableIndexingInteractionHandler } from "@utils/interactions/channel-settings/enable-indexing-interaction-handler";
import type { MessageButtonStyleResolvable } from "discord.js";
import { ChannelSettingButtonBaseHandler } from "../channel-setting-button-base";

export class EnableIndexingButton extends ButtonBase {
  public id = "enable-indexing";
  public label = "Enable Indexing";
  public style = "SUCCESS" as MessageButtonStyleResolvable;
}

export class EnableIndexingButtonHandler extends ChannelSettingButtonBaseHandler {
  public interactionHandler: ChannelSettingsInteractionHandler =
    new EnableIndexingInteractionHandler();
  public display: ButtonBase = new EnableIndexingButton();
}
