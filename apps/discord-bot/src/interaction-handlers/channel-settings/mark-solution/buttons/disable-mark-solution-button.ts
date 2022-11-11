import {
  ChannelSettingButtonBaseHandler,
  type ChannelSettingsInteractionHandler,
} from "@interaction-handlers/channel-settings/channel-setting-button-base";
import { ButtonBase } from "@interaction-handlers/primitives/buttons/button-base";
import type { MessageButtonStyleResolvable } from "discord.js";
import { ToggleMarkSolutionInteractionHandler } from "../mark-solution-interaction-handler";

export class DisableMarkSolutionButton extends ButtonBase {
  public id = "disable-mark-solution";
  public label = "Disable Mark Solution";
  public style = "DANGER" as MessageButtonStyleResolvable;
}

export class DisableMarkSolutionButtonHandler extends ChannelSettingButtonBaseHandler {
  public interactionHandler: ChannelSettingsInteractionHandler =
    new ToggleMarkSolutionInteractionHandler(false);
  public display: ButtonBase = new DisableMarkSolutionButton();
}
