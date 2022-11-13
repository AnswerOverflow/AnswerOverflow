import type { ChannelSettingsInteractionHandler } from "@utils/interactions/channel-settings/channel-settings-interaction-handler";
import { DisableIndexingInteractionHandler } from "@utils/interactions/channel-settings/disable-indexing-interaction-handler";
import { ChannelSettingButtonBase } from "@primitives/interactions/channel-settings/channel-setting-button-base";
import type { ButtonBase } from "@primitives/message-components/buttons/button";
import { DisableIndexingButton } from "@primitives/message-components/buttons/channel-settings/indexing-buttons";

export class DisableIndexingButtonHandler extends ChannelSettingButtonBase {
  public interactionHandler: ChannelSettingsInteractionHandler =
    new DisableIndexingInteractionHandler();
  public display: ButtonBase = new DisableIndexingButton();
}
