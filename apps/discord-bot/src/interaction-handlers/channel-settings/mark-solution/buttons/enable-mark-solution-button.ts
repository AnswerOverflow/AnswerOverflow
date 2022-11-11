import {
  ChannelSettingButtonBaseHandler,
  type ChannelSettingsInteractionHandler,
} from "@interaction-handlers/channel-settings/channel-setting-button-base";
import { ButtonBase } from "@interaction-handlers/primitives/button-base";
import type { MessageButtonStyleResolvable } from "discord.js";
import { ToggleMarkSolutionInteractionHandler } from "../mark-solution-interaction-handler";

export class EnableMarkSolutionButton extends ButtonBase {
  public id = "enable-mark-solution";
  public label = "Enable Mark Solution";
  public style = "SUCCESS" as MessageButtonStyleResolvable;
}

export class EnableMarkSolutionButtonHandler extends ChannelSettingButtonBaseHandler {
  public interactionHandler: ChannelSettingsInteractionHandler =
    new ToggleMarkSolutionInteractionHandler(true);
  public display: ButtonBase = new EnableMarkSolutionButton();
}
