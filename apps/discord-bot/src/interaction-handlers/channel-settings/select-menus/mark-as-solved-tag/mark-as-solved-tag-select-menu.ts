import type { ChannelSettingsWithBitfield } from "@answeroverflow/core";
import { SetSolvedTagInteractionHandler } from "@primitives/interactions/settings/channel-settings/implementations/set-solved-tag-interaction-handler";
import type { SettingsInteractionHandler } from "@primitives/interactions/settings/settings-interaction-handler";
import { ChannelSettingSelectMenuHandler } from "@primitives/message-components/handlers/settings/channel-settings/channel-setting-select-menu-handler";

import { MarkAsSolvedTagSelectMenu } from "@primitives/message-components/select-menu/channel-settings/mark-as-solved-tag-select-menu";
import type { Option } from "@sapphire/framework";
import type { CacheType, MessageComponentInteraction, SelectMenuInteraction } from "discord.js";

export class MarkAsSolvedTagSelectMenuHandler extends ChannelSettingSelectMenuHandler {
  public display = new MarkAsSolvedTagSelectMenu([]);
  public async getInteractionHandler(
    interaction: MessageComponentInteraction<CacheType>,
    parsedData: Option.UnwrapSome<Awaited<ReturnType<this["parse"]>>>
  ): Promise<SettingsInteractionHandler<ChannelSettingsWithBitfield>> {
    return new SetSolvedTagInteractionHandler(interaction, parsedData.new_solved_tag_id);
  }

  public override async parse(interaction: SelectMenuInteraction) {
    const some = await super.parse(interaction);
    if (some.isNone()) return this.none();
    let new_solved_tag_id = null;
    if (interaction.values.length > 0) {
      new_solved_tag_id = interaction.values[0];
    }
    const data = some.unwrap();
    return this.some({ ...data, new_solved_tag_id });
  }
}
