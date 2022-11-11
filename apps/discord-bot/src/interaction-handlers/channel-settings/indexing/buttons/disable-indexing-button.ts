import {
  ChannelSettingButtonBaseHandler,
  type ChannelSettingsInteractionHandler,
} from "@interaction-handlers/channel-settings/channel-setting-button-base";
import { ButtonBase } from "@interaction-handlers/primitives/buttons/button-base";
import type { MessageButtonStyleResolvable } from "discord.js";
import { DisableIndexingInteractionHandler } from "../disable-indexing-interaction-handler";

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
