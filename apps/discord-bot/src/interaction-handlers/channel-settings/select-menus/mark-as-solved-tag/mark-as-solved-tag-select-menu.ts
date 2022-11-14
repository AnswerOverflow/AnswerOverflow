import type { ChannelSettingsWithBitfield } from "@answeroverflow/core";
import { ChannelSettingSelectMenuBase } from "@primitives/interactions/channel-settings/views/channel-settings/channel-setting-select-menu-base";
import { SetSolvedTagInteractionHandler } from "@primitives/interactions/channel-settings/views/channel-settings/implementations/channel-settings/set-solved-tag-interaction-handler";
import type { SettingsInteractionHandler } from "@primitives/interactions/channel-settings/views/settings-menu/settings-interaction-handler";
import { MarkAsSolvedTagSelectMenu } from "@primitives/message-components/select-menu/channel-settings/mark-as-solved-tag-select-menu";
import type { Option } from "@sapphire/framework";
import type { CacheType, MessageComponentInteraction, SelectMenuInteraction } from "discord.js";

export class MarkAsSolvedTagSelectMenuHandler extends ChannelSettingSelectMenuBase {
  public display = new MarkAsSolvedTagSelectMenu([]);
  public async getInteractionHandler(
    interaction: MessageComponentInteraction<CacheType>,
    parsedData: Option.UnwrapSome<Awaited<ReturnType<this["parse"]>>>
  ): Promise<SettingsInteractionHandler<ChannelSettingsWithBitfield>> {
    return new SetSolvedTagInteractionHandler(
      parsedData.root_channel,
      parsedData.converted_channel,
      parsedData.converted_server,
      parsedData.channel_settings,
      parsedData.new_solved_tag_id
    );
  }

  public override async parse(interaction: SelectMenuInteraction) {
    const some = await super.parse(interaction);
    if (some.isNone()) return this.none();
    let new_solved_tag_id = null;
    if (interaction.values.length > 0) {
      new_solved_tag_id = interaction.values[0];
    }
    const data = some.unwrap();
    if (new_solved_tag_id && new_solved_tag_id == data.channel_settings?.solution_tag_id) {
      new_solved_tag_id = null;
    }
    return this.some({ ...data, new_solved_tag_id });
  }
}
