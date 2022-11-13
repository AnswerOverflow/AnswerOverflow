import { ButtonBase } from "@interaction-handlers/primitives/buttons/button-base";
import type { ChannelSettingsInteractionHandler } from "@utils/interactions/channel-settings/channel-settings-interaction-handler";
import { ToggleMarkSolutionInteractionHandler } from "@utils/interactions/channel-settings/mark-solution-interaction-handler";
import type { MessageButtonStyleResolvable } from "discord.js";
import { ChannelSettingButtonBaseHandler } from "../channel-setting-button-base";

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
