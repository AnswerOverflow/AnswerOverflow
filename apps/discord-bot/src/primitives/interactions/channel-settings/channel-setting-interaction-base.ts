import type { ChannelSettingsWithBitfield } from "@answeroverflow/core";
import { makeChannelSettingsResponse } from "../../../commands/settings/channel-settings";
import type { CacheType, MessageComponentInteraction } from "discord.js";
import { addChannelSettingsParseDataToInteraction } from "@utils/interactions/add-to-parse-data";
import type { InteractionHandler } from "@sapphire/framework";
import { GuildTextChannelButtonHandler } from "../guild-text-interaction-base";
import {
  ChannelSettingsChangeError,
  ChannelSettingsInteractionHandler,
} from "@utils/interactions/channel-settings/channel-settings-interaction-handler";

export abstract class ChannelSettingInteractionBase extends GuildTextChannelButtonHandler {
  public abstract interactionHandler: ChannelSettingsInteractionHandler;

  public override async parse(interaction: MessageComponentInteraction) {
    const some = await super.parse(interaction);
    if (some.isNone()) return this.none();
    const data = some.unwrap();
    const with_channel_data = await addChannelSettingsParseDataToInteraction(
      data.root_channel,
      data
    );
    return this.some(with_channel_data);
  }

  public override async run(
    interaction: MessageComponentInteraction<CacheType>,
    parsedData: InteractionHandler.ParseResult<ChannelSettingInteractionBase>
  ) {
    let updated_settings: ChannelSettingsWithBitfield;
    try {
      updated_settings = await this.interactionHandler.updateSettings(
        parsedData.root_channel,
        parsedData.converted_channel,
        parsedData.converted_server,
        parsedData.old_settings,
        interaction
      );
    } catch (error) {
      console.log(error);
      if (error instanceof ChannelSettingsChangeError) {
        await interaction.reply({
          content: `Error: ${error.message}`,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: `An unknown error occured, we're looking into it!`,
        });
      }
      return;
    }
    const response = makeChannelSettingsResponse(updated_settings);
    await interaction.update({
      content: response.content,
      components: response.components,
    });
  }
}
