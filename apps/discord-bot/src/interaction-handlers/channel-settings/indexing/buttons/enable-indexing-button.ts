import {
  ChannelSettingButtonBaseHandler,
  type ChannelSettingsInteractionHandler,
} from "@interaction-handlers/channel-settings/channel-setting-button-base";
import { ButtonBase } from "@interaction-handlers/primitives/buttons/button-base";
import type { MessageButtonStyleResolvable } from "discord.js";
import { EnableIndexingInteractionHandler } from "../enable-indexing-interaction-handler";

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
