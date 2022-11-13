import { ButtonBase } from "@interaction-handlers/primitives/buttons/button-base";
import type { ChannelSettingsInteractionHandler } from "@utils/interactions/channel-settings/channel-settings-interaction-handler";
import { ToggleMarkSolutionInteractionHandler } from "@utils/interactions/channel-settings/mark-solution-interaction-handler";
import type { MessageButtonStyleResolvable } from "discord.js";
import { ChannelSettingButtonBaseHandler } from "../channel-setting-button-base";

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
