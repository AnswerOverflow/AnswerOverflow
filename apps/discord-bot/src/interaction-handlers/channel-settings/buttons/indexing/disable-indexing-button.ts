import { ButtonBase } from "@interaction-handlers/primitives/buttons/button-base";
import type { ChannelSettingsInteractionHandler } from "@utils/interactions/channel-settings/channel-settings-interaction-handler";
import type { MessageButtonStyleResolvable } from "discord.js";
import { DisableIndexingInteractionHandler } from "../../../../utils/interactions/channel-settings/disable-indexing-interaction-handler";
import { ChannelSettingButtonBaseHandler } from "../channel-setting-button-base";

export class DisableIndexingButton extends ButtonBase {
  public id = "disable-indexing";
  public label = "Disable Indexing";
  public style = "DANGER" as MessageButtonStyleResolvable;
}

export class DisableIndexingButtonHandler extends ChannelSettingButtonBaseHandler {
  public interactionHandler: ChannelSettingsInteractionHandler =
    new DisableIndexingInteractionHandler();
  public display: ButtonBase = new DisableIndexingButton();
}
