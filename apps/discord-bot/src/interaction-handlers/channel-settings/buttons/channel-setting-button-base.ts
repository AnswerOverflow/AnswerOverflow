import type { ChannelSettingsWithBitfield } from "@answeroverflow/core";
import { makeChannelSettingsResponse } from "../../../commands/settings/channel-settings";
import type { ButtonInteraction, CacheType } from "discord.js";
import { GuildTextChannelButtonHandler } from "@interaction-handlers/primitives/buttons/guild-text-channel-button";
import type { ChannelSettingsInteractionHandler } from "@utils/interactions/channel-settings/channel-settings-interaction-handler";
import { addChannelSettingsParseDataToInteraction } from "@utils/interactions/add-to-parse-data";
import type { InteractionHandler } from "@sapphire/framework";
export class InvalidChannelError extends Error {}
export class ChannelSettingsChangeError extends Error {}

export abstract class ChannelSettingButtonBaseHandler extends GuildTextChannelButtonHandler {
  public abstract interactionHandler: ChannelSettingsInteractionHandler;

  public override async parse(interaction: ButtonInteraction) {
    const some = await super.parse(interaction);
    if (some.isNone()) return this.none();
    const data = some.unwrap();
    const with_channel_data = await addChannelSettingsParseDataToInteraction(
      data.parent_channel,
      data
    );
    return this.some(with_channel_data);
  }

  public override async run(
    interaction: ButtonInteraction<CacheType>,
    parsedData: InteractionHandler.ParseResult<ChannelSettingButtonBaseHandler>
  ) {
    let updated_settings: ChannelSettingsWithBitfield;
    try {
      updated_settings = await this.interactionHandler.updateSettings(
        parsedData.parent_channel,
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
