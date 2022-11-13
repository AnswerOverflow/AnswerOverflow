import type { ChannelSettingsInteractionHandler } from "@utils/interactions/channel-settings/channel-settings-interaction-handler";
import { EnableIndexingInteractionHandler } from "@utils/interactions/channel-settings/enable-indexing-interaction-handler";
import { MarkAsSolvedTagSelectMenu } from "@primitives/message-components/select-menu/channel-settings/mark-as-solved-tag-select-menu";
import { ChannelSettingSelectMenuBase } from "@primitives/interactions/channel-settings/channel-setting-select-menu-base";

export class MarkAsSolvedTagSelectMenuHandler extends ChannelSettingSelectMenuBase {
  public display = new MarkAsSolvedTagSelectMenu([{ label: "Solved", value: "solved" }]);
  public interactionHandler: ChannelSettingsInteractionHandler =
    new EnableIndexingInteractionHandler();
}
