import type { ChannelSettingsInteractionHandler } from "@utils/interactions/channel-settings/channel-settings-interaction-handler";
import { EnableIndexingInteractionHandler } from "@utils/interactions/channel-settings/enable-indexing-interaction-handler";
import { ChannelSettingButtonBase } from "@primitives/interactions/channel-settings/channel-setting-button-base";
import type { ButtonBase } from "@primitives/message-components/buttons/button";
import { EnableIndexingButton } from "@primitives/message-components/buttons/channel-settings/indexing-buttons";

export class EnableIndexingButtonHandler extends ChannelSettingButtonBase {
  public interactionHandler: ChannelSettingsInteractionHandler =
    new EnableIndexingInteractionHandler();
  public display: ButtonBase = new EnableIndexingButton();
}
