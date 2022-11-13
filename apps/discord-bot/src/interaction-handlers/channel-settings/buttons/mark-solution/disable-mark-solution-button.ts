import type { ChannelSettingsInteractionHandler } from "@utils/interactions/channel-settings/channel-settings-interaction-handler";
import { ToggleMarkSolutionInteractionHandler } from "@utils/interactions/channel-settings/mark-solution-interaction-handler";
import { ChannelSettingButtonBase } from "@primitives/interactions/channel-settings/channel-setting-button-base";
import type { ButtonBase } from "@primitives/message-components/buttons/button";
import { DisableMarkSolutionButton } from "@primitives/message-components/buttons/channel-settings/mark-solution-buttons";

export class DisableMarkSolutionButtonHandler extends ChannelSettingButtonBase {
  public interactionHandler: ChannelSettingsInteractionHandler =
    new ToggleMarkSolutionInteractionHandler(false);
  public display: ButtonBase = new DisableMarkSolutionButton();
}
